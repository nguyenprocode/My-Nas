const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (_) {}

const DEF_BRANCH = process.env.GITHUB_BRANCH || 'main';
const DEF_FOLDER = (process.env.GITHUB_FOLDER || 'files').replace(/^\/+|\/+$/g, '');
const PORT = Number(process.env.PORT) || 3000;
const MAX_MB = Number(process.env.MAX_UPLOAD_MB) || 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const LIMIT_GB = Number(process.env.STORAGE_LIMIT_GB) || 4;
const MAX_EDIT = 1024 * 1024; // tệp mở để chỉnh sửa trong trình duyệt: tối đa 1 MB (giới hạn đọc nội dung của GitHub Contents API)

// ======================================================================

// !!! KHÔNG XÓA / KHÔNG SỬA DÒNG NOTICE_URL BÊN DƯỚI !!!
// Đây là link RAW tới file thông báo của tác giả mã nguồn. Trung tâm thông báo
// (biểu tượng chuông) đọc link này để nhận thông báo mới, cập nhật, tin quan trọng.
// Xóa hoặc đổi dòng này thì người dùng sẽ không nhận được thông báo từ tác giả nữa.

const NOTICE_URL = 'https://raw.githubusercontent.com/nguyenprocode/nas-notices/refs/heads/main/notices.json';

// ======================================================================

const TRASH = '.trash';
const META_REL = `${TRASH}/.nasmeta.json`; // lưu ngày xóa của tệp trong thùng rác
const SWEEP_MAX = 20;
const TRASH_DAYS = process.env.TRASH_DAYS !== undefined && process.env.TRASH_DAYS !== '' && Number.isFinite(Number(process.env.TRASH_DAYS)) ? Math.max(0, Number(process.env.TRASH_DAYS)) : 15; // 0 = không tự dọn
const SESSION_DAYS = 1;

function loadAccounts() {
  const E = process.env;
  const token = String(E.GITHUB_TOKEN || '').trim();
  const password = String(E.APP_PASSWORD || '');
  if (!token || !password) {
    console.error('[CONFIG] Thiếu GITHUB_TOKEN hoặc APP_PASSWORD.');
    process.exit(1);
  }
  return [{
    token,
    password,
    repo: String(E.GITHUB_REPO || '').trim(),
    defName: (E.GITHUB_REPO || '').split('/')[1] || 'storage-file',
    branch: DEF_BRANCH,
    root: DEF_FOLDER,
    login: '', ghName: '', treeCache: null,
  }];
}
const accounts = loadAccounts();
const als = new AsyncLocalStorage();
const A = () => als.getStore();

async function resolveAccount(a) {
  if (a.login) return true;
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${a.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'github-nas' },
    });
    if (!res.ok) { a.error = `GitHub trả về lỗi ${res.status}`; return false; }
    const j = await res.json();
    if (accounts.some((o) => o !== a && o.login && o.login.toLowerCase() === j.login.toLowerCase())) {
      a.error = `Trùng tài khoản GitHub ${j.login}`;
      return false;
    }
    a.login = j.login;
    a.ghName = j.name || '';
    if (!a.repo) a.repo = `${j.login}/${a.defName}`;
    a.error = '';
    console.log(`${a.repo} (${a.branch}/${a.root})`);
    return true;
  } catch (e) {
    a.error = e.message;
    return false;
  }
}
const findByLogin = (u) => accounts.find((a) => a.login && a.login.toLowerCase() === String(u || '').trim().toLowerCase());

const keyOf = (a, kind) => crypto.createHash('sha256').update(`${kind}:${a.token}:${a.password}`).digest();
function signData(a, kind, data) {
  const payload = Buffer.from(JSON.stringify({ u: a.login, ...data })).toString('base64url');
  const sig = crypto.createHmac('sha256', keyOf(a, kind)).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyData(token, kind) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  let d;
  try { d = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch (_) { return null; }
  const a = findByLogin(d && d.u);
  if (!a) return null;
  const good = crypto.createHmac('sha256', keyOf(a, kind)).update(payload).digest('base64url');
  const x = Buffer.from(sig), y = Buffer.from(good);
  if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) return null;
  if (typeof d.e !== 'number' || d.e < Date.now() / 1000) return null;
  return { a, d };
}
const safeEqual = (x, y) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(x)).digest(), crypto.createHash('sha256').update(String(y)).digest());

const fails = new Map();
// Chỉ tin X-Forwarded-For khi bật TRUST_PROXY (máy chủ nằm sau đúng một proxy tin cậy).
// Proxy tin cậy sẽ nối IP thật của người dùng vào cuối header, nên lấy phần tử cuối cùng;
// các phần tử phía trước do client tự khai nên không được tin.
const TRUST_PROXY = /^(1|true|yes|on)$/i.test(process.env.TRUST_PROXY || '');
function clientIp(req) {
  if (TRUST_PROXY) {
    const xs = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (xs.length) return xs[xs.length - 1];
  }
  return req.socket.remoteAddress || '';
}
// ---- Header bảo mật + HTTPS ----
// FORCE_HTTPS=true (cần TRUST_PROXY=true): yêu cầu đi qua proxy bằng http sẽ được chuyển sang https.
// Chỉ chuyển khi proxy báo rõ X-Forwarded-Proto: http, nên truy cập trực tiếp (kiểm tra sức khỏe, localhost) không bị ảnh hưởng và không lặp vô hạn.
const FORCE_HTTPS = /^(1|true|yes|on)$/i.test(process.env.FORCE_HTTPS || '');
const forwardedProto = (req) => (TRUST_PROXY ? String(req.headers['x-forwarded-proto'] || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).pop() || '' : '');
const isHttps = (req) => !!req.socket.encrypted || forwardedProto(req) === 'https';
const NOTICE_ORIGIN = (() => { try { return new URL(NOTICE_URL).origin; } catch (_) { return ''; } })();
// Giao diện dùng: script riêng của app, style nội tuyến (thuộc tính style), ảnh blob:/data: (xem trước ảnh),
// iframe blob: (xem trước PDF) và một yêu cầu tới kho thông báo của tác giả.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${NOTICE_ORIGIN ? ' ' + NOTICE_ORIGIN : ''}`,
  "frame-src 'self' blob:",
  "object-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');
function securityHeaders(req, res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

function pruneFails() {
  const now = Date.now();
  for (const [ip, f] of fails) if (f.until < now) fails.delete(ip);
}
setInterval(pruneFails, 600000).unref();
function tooMany(ip) {
  const f = fails.get(ip);
  if (f && f.until < Date.now()) { fails.delete(ip); return false; }
  return !!f && f.n >= 8;
}
function noteFail(ip) {
  const f = fails.get(ip);
  if (f && f.until >= Date.now()) f.n++;
  else {
    if (fails.size > 5000) pruneFails();
    fails.set(ip, { n: 1, until: Date.now() + 600000 });
  }
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function cleanPath(p) {
  const parts = String(p || '').split('/').filter(Boolean);
  if (parts.some((s) => s === '..' || s === '.' || s.includes('\\') || s.includes('\0')) || parts[0] === TRASH) {
    throw Object.assign(new Error('Đường dẫn không hợp lệ'), { status: 400 });
  }
  return parts.join('/');
}
const full = (rel) => (rel ? `${A().root}/${rel}` : A().root);
const baseName = (p) => p.split('/').pop();

function ghHeaders(accept, withBody) {
  return {
    Authorization: `Bearer ${A().token}`,
    Accept: accept || 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-nas',
    ...(withBody ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function gh(method, repoPath, { body, accept } = {}) {
  const url =
    `https://api.github.com/repos/${A().repo}/contents/` +
    repoPath.split('/').map(encodeURIComponent).join('/') +
    (method === 'GET' ? `?ref=${encodeURIComponent(A().branch)}` : '');
  return fetch(url, { method, headers: ghHeaders(accept, !!body), body: body ? JSON.stringify(body) : undefined });
}

const ghApi = (apiPath) => fetch(`https://api.github.com/repos/${A().repo}/${apiPath}`, { headers: ghHeaders() });

async function ghError(res) {
  let msg = `GitHub trả về lỗi ${res.status}`;
  try {
    const j = await res.json();
    if (j.message) msg += `: ${j.message}`;
  } catch (_) {}
  return Object.assign(new Error(msg), { status: res.status === 404 ? 404 : 502, gh: res.status });
}

async function walkTree() {
  let sha = encodeURIComponent(A().branch);
  for (const seg of A().root.split('/').filter(Boolean)) {
    const j = await ghJson('GET', `git/trees/${sha}`);
    const e = j.tree.find((t) => t.type === 'tree' && t.path === seg);
    if (!e) return [];
    sha = e.sha;
  }
  const out = [];
  async function walk(treeSha, prefix) {
    const j = await ghJson('GET', `git/trees/${treeSha}`);
    const subs = [];
    for (const t of j.tree) {
      if (t.type === 'blob') out.push({ rel: prefix + t.path, sha: t.sha, size: t.size || 0 });
      else if (t.type === 'tree') subs.push(t);
    }
    for (let i = 0; i < subs.length; i += 6) await Promise.all(subs.slice(i, i + 6).map((t) => walk(t.sha, `${prefix}${t.path}/`)));
  }
  await walk(sha, '');
  return out;
}

async function getTree(fresh) {
  if (!fresh && A().treeCache && Date.now() - A().treeCache.at < 30000) return A().treeCache.data;
  const gen = A().treeGen || 0;
  const res = await ghApi(`git/trees/${encodeURIComponent(A().branch)}?recursive=1`);
  let files = [];
  if (res.status !== 404 && res.status !== 409) {
    if (!res.ok) throw await ghError(res);
    const j = await res.json();
    const prefix = `${A().root}/`;
    // Kho quá lớn thì GitHub cắt bớt kết quả (truncated) -> duyệt từng thư mục để lấy đủ
    if (j.truncated) files = await walkTree();
    else {
      files = j.tree
        .filter((t) => t.type === 'blob' && t.path.startsWith(prefix))
        .map((t) => ({ rel: t.path.slice(prefix.length), sha: t.sha, size: t.size || 0 }));
    }
  }
  files = files.filter((f) => f.rel !== META_REL);
  if ((A().treeGen || 0) === gen) A().treeCache = { at: Date.now(), data: files };
  return files;
}
// treeGen tăng mỗi lần dữ liệu đổi: một lần tải cây bắt đầu TRƯỚC thay đổi sẽ không được ghi đè vào bộ nhớ đệm (tránh danh sách cũ hiện lại)
const invalidate = () => { A().treeCache = null; A().treeGen = (A().treeGen || 0) + 1; };
const inTrash = (rel) => rel.startsWith(`${TRASH}/`);
const isKeep = (rel) => baseName(rel) === '.gitkeep';

async function getSha(repoPath) {
  const res = await gh('GET', repoPath);
  if (res.status === 404) return null;
  if (!res.ok) throw await ghError(res);
  const j = await res.json();
  return Array.isArray(j) ? null : j.sha;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error(`Tệp quá lớn (tối đa ${Math.round(limit / 1048576)} MB)`), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function putFile(repoPath, buf, message, overwrite = false) {
  const sha = await getSha(repoPath);
  if (sha && !overwrite) throw Object.assign(new Error('Tệp đã tồn tại'), { status: 409, exists: true });
  const res = await gh('PUT', repoPath, {
    body: { message, content: buf.toString('base64'), branch: A().branch, ...(sha ? { sha } : {}) },
  });
  if (!res.ok) throw await ghError(res);
}

async function listDir(repoPath) {
  const res = await gh('GET', repoPath);
  if (res.status === 404) return [];
  if (!res.ok) throw await ghError(res);
  const j = await res.json();
  if (!Array.isArray(j)) throw Object.assign(new Error('Đây không phải thư mục'), { status: 400 });
  return j;
}

async function rawGet(repoPath) {
  const g = await gh('GET', repoPath, { accept: 'application/vnd.github.raw+json' });
  if (!g.ok) throw await ghError(g);
  return Buffer.from(await g.arrayBuffer());
}

async function ghJson(method, apiPath, body) {
  const res = await fetch(`https://api.github.com/repos/${A().repo}/${apiPath}`, {
    method,
    headers: ghHeaders(null, !!body),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await ghError(res);
  return res.json();
}

// Áp dụng nhiều thay đổi (thêm/đổi đường dẫn/xóa) trong MỘT commit duy nhất qua Git Data API.
// changes: [{ path, sha }]; sha = mã blob để đặt vào path, hoặc null để xóa path đó.
async function commitChangesOnce(changes, message) {
  const refPath = `heads/${A().branch.split('/').map(encodeURIComponent).join('/')}`;
  const head = await ghJson('GET', `git/ref/${refPath}`);
  const headSha = head.object.sha;
  const commit = await ghJson('GET', `git/commits/${headSha}`);
  // Mỗi đường dẫn chỉ được xuất hiện một lần trong cây; mục đặt (có sha) thắng mục xóa của cùng đường dẫn.
  const byPath = new Map();
  for (const c of changes) {
    const prev = byPath.get(c.path);
    if (!prev || (prev.sha === null && c.sha)) byPath.set(c.path, c);
  }
  const tree = await ghJson('POST', 'git/trees', {
    base_tree: commit.tree.sha,
    tree: [...byPath.values()].map((c) => ({ path: c.path, mode: '100644', type: 'blob', sha: c.sha })),
  });
  const next = await ghJson('POST', 'git/commits', { message, tree: tree.sha, parents: [headSha] });
  await ghJson('PATCH', `git/refs/${refPath}`, { sha: next.sha });
}

// Dự phòng khi commit gộp bị GitHub từ chối (ví dụ 404/422): áp dụng từng thay đổi qua Contents API.
// Thêm/đổi đường dẫn trước, xóa sau để lỡ lỗi giữa chừng cũng không mất dữ liệu.
async function applySequential(changes, message) {
  const byPath = new Map();
  for (const c of changes) {
    const prev = byPath.get(c.path);
    if (!prev || (prev.sha === null && c.sha)) byPath.set(c.path, c);
  }
  const list = [...byPath.values()];
  for (const c of list.filter((x) => x.sha)) {
    const b = await ghJson('GET', `git/blobs/${c.sha}`);
    const cur = await getSha(c.path);
    const r = await gh('PUT', c.path, { body: { message, content: String(b.content || '').replace(/\s/g, ''), branch: A().branch, ...(cur ? { sha: cur } : {}) } });
    if (!r.ok) throw await ghError(r);
  }
  for (const c of list.filter((x) => !x.sha)) {
    const cur = await getSha(c.path);
    if (!cur) continue;
    const r = await gh('DELETE', c.path, { body: { message, sha: cur, branch: A().branch } });
    if (!r.ok && r.status !== 404) throw await ghError(r);
  }
}

// Nếu nhánh vừa bị commit khác chen vào (GitHub báo 422 "not a fast forward") thì thử lại với head mới.
// Nếu vẫn bị từ chối thì chuyển sang áp dụng từng thay đổi (applySequential).
async function commitChanges(changes, message) {
  if (!changes.length) return;
  for (let i = 0; ; i++) {
    try { return await commitChangesOnce(changes, message); }
    catch (e) {
      if (i < 3 && (e.gh === 422 || e.gh === 409)) { await new Promise((r) => setTimeout(r, 300 * (i + 1))); continue; }
      if (e.gh === 404 || e.gh === 422 || e.gh === 409) return await applySequential(changes, message);
      throw e;
    }
  }
}

// ---- Siêu dữ liệu: ngày xóa của từng tệp trong thùng rác ----
async function loadMeta(fresh) {
  const c = A().metaCache;
  if (!fresh && c && Date.now() - c.at < 30000) return c.data;
  let data = { trash: {} };
  const res = await gh('GET', full(META_REL));
  if (res.ok) {
    const j = await res.json();
    try {
      const p = JSON.parse(Buffer.from(j.content || '', 'base64').toString() || '{}');
      data = { trash: p.trash || {} };
    } catch (_) {}
  } else if (res.status !== 404) throw await ghError(res);
  A().metaCache = { at: Date.now(), data };
  return data;
}
function pruneMeta(m, existing) {
  const now = Date.now() / 1000;
  if (existing) for (const k of Object.keys(m.trash)) if (!existing.has(k)) delete m.trash[k];
}
// Tạo bản siêu dữ liệu mới thành một blob để đưa vào cùng commit với thao tác chính.
async function metaChange(mutator) {
  const m = JSON.parse(JSON.stringify(await loadMeta(true)));
  mutator(m);
  pruneMeta(m);
  const blob = await ghJson('POST', 'git/blobs', { content: Buffer.from(JSON.stringify(m)).toString('base64'), encoding: 'base64' });
  return { change: { path: full(META_REL), sha: blob.sha }, done: () => { A().metaCache = { at: Date.now(), data: m }; } };
}
async function saveMeta(mutator, existing) {
  const m = JSON.parse(JSON.stringify(await loadMeta(true)));
  mutator(m);
  pruneMeta(m, existing);
  await putFile(full(META_REL), Buffer.from(JSON.stringify(m)), 'Update metadata', true);
  A().metaCache = { at: Date.now(), data: m };
}
async function sweepTrash() {
  const files = (await getTree(true)).filter((f) => inTrash(f.rel)).map((f) => ({ ...f, p: f.rel.slice(TRASH.length + 1) }));
  const meta = await loadMeta(true);
  const now = Date.now();
  const limit = TRASH_DAYS * 86400000;
  // Mỗi lượt chỉ xóa tối đa SWEEP_MAX tệp để không giữ hàng chờ ghi quá lâu; startSweep sẽ lặp lượt mới cho tới khi hết tệp quá hạn
  const expired = TRASH_DAYS > 0 ? files.filter((f) => meta.trash[f.p] && now - meta.trash[f.p] > limit) : [];
  const old = expired.slice(0, SWEEP_MAX);
  const stamps = files.filter((f) => !meta.trash[f.p]);
  const stale = Object.keys(meta.trash).some((k) => !files.some((f) => f.p === k));
  if (!old.length && !stamps.length && !stale) return false;
  try {
    await purgeFiles(old);
  } finally {
    invalidate();
  }
  const gone = new Set(old.map((f) => f.p));
  const existing = new Set(files.filter((f) => !gone.has(f.p)).map((f) => f.p));
  await saveMeta((m) => {
    for (const f of stamps) if (existing.has(f.p)) m.trash[f.p] = now;
    for (const p of gone) delete m.trash[p];
  }, existing);
  return expired.length > old.length; // còn tệp quá hạn chưa xóa
}

// Có tệp quá hạn / chưa có ngày xóa / siêu dữ liệu thừa cần xử lý không (kiểm tra nhanh, không khóa ghi)
async function needsSweep() {
  const files = (await getTree()).filter((f) => inTrash(f.rel)).map((f) => f.rel.slice(TRASH.length + 1));
  const meta = await loadMeta();
  const now = Date.now();
  const limit = TRASH_DAYS * 86400000;
  return files.some((p) => !meta.trash[p] || (TRASH_DAYS > 0 && now - meta.trash[p] > limit)) || Object.keys(meta.trash).some((k) => !files.includes(k));
}

// Dọn nền: lặp từng lượt (mỗi lượt một lần giữ khóa ghi) tới khi hết tệp quá hạn, các thao tác khác của người dùng xen vào được giữa các lượt.
function startSweep() {
  const acc = A();
  if (acc.sweeping) return;
  acc.sweeping = true;
  (async () => {
    try { while (await withWriteLock(sweepTrash)); }
    catch (e) { console.error('[TRASH] Tự dọn thùng rác thất bại:', e.message); }
    finally { acc.sweeping = false; }
  })();
}

// Mọi thao tác ghi lên cùng một kho/nhánh phải chạy lần lượt, nếu không các commit song song sẽ đụng nhau.
const writeQueues = new Map();
function withWriteLock(fn) {
  const key = `${A().repo}#${A().branch}`;
  const prev = writeQueues.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  writeQueues.set(key, tail);
  tail.then(() => { if (writeQueues.get(key) === tail) writeQueues.delete(key); });
  return run;
}

// Nếu đường dẫn đã có trong tập taken thì thêm hậu tố " (n)" trước phần mở rộng.
function uniqueRel(rel, taken) {
  if (!taken.has(rel)) return rel;
  const slash = rel.lastIndexOf('/');
  const dir = slash >= 0 ? rel.slice(0, slash + 1) : '';
  const base = rel.slice(slash + 1);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  for (let n = 1; ; n++) {
    const cand = `${dir}${stem} (${n})${ext}`;
    if (!taken.has(cand)) return cand;
  }
}

async function cpuFallback() {
  const cores = (os.availableParallelism ? os.availableParallelism() : 0) || 1;
  const t0 = process.cpuUsage(), h0 = process.hrtime.bigint();
  await new Promise((r) => setTimeout(r, 200));
  const u = process.cpuUsage(t0), dt = Number(process.hrtime.bigint() - h0) / 1000;
  return Math.max(0, Math.min(100, Math.round(((u.user + u.system) / (dt * cores)) * 100)));
}

async function cpuPercent() {
  try {
    const a = os.cpus();
    if (!a.length) return await cpuFallback();
    await new Promise((r) => setTimeout(r, 200));
    const b = os.cpus();
    const sum = (t) => t.user + t.nice + t.sys + t.idle + t.irq;
    let idle = 0, total = 0;
    for (let i = 0; i < a.length; i++) {
      if (!b[i]) continue;
      total += sum(b[i].times) - sum(a[i].times);
      idle += b[i].times.idle - a[i].times.idle;
    }
    return total > 0 ? Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100))) : await cpuFallback();
  } catch (_) {
    return null;
  }
}

async function systemStatus() {
  const total = os.totalmem();
  return {
    cpu: await cpuPercent(),
    ram: total ? Math.round((1 - os.freemem() / total) * 100) : null,
    uptime: Math.round(process.uptime()),
  };
}

async function overview() {
  const [files, commitsRes] = await Promise.all([
    getTree(),
    ghApi(`commits?sha=${encodeURIComponent(A().branch)}&path=${encodeURIComponent(A().root)}&per_page=40`).catch(() => null),
  ]);
  const live = files.filter((f) => !inTrash(f.rel));
  const used = files.reduce((s, f) => s + f.size, 0);

  const dirs = new Map();
  for (const f of live) {
    const i = f.rel.indexOf('/');
    if (i > 0) {
      const name = f.rel.slice(0, i);
      dirs.set(name, (dirs.get(name) || 0) + f.size);
    }
  }
  const folders = [...dirs].map(([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));

  const present = new Map(live.filter((f) => !isKeep(f.rel)).map((f) => [f.rel, f.size]));
  const recent = [];
  if (commitsRes && commitsRes.ok) {
    const commits = await commitsRes.json();
    const seen = new Set();
    for (const c of commits) {
      const msg = String((c.commit && c.commit.message) || '').split('\n')[0];
      const prefix = ['Upload ', 'Tải lên '].find((p) => msg.startsWith(p));
      if (!prefix) continue;
      const rel = msg.slice(prefix.length);
      if (seen.has(rel) || !present.has(rel)) continue;
      seen.add(rel);
      recent.push({ path: rel, name: baseName(rel), size: present.get(rel), date: c.commit.committer && c.commit.committer.date });
      if (recent.length >= 6) break;
    }
  }
  return { used, limit: LIMIT_GB * 1024 ** 3, folders, recent, trashCount: files.filter((f) => inTrash(f.rel) && !isKeep(f.rel)).length };
}

async function sendDownload(res, rel) {
  const buf = await rawGet(full(rel));
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(baseName(rel))}`,
  });
  res.end(buf);
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
// Mỗi mục là một trang HTML riêng
const PAGE_ROUTES = { '/': '/index.html', '/login': '/login.html', '/files': '/files.html', '/trash': '/trash.html', '/settings': '/settings.html', '/edit': '/edit.html' };
async function staticFile(pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (_) { return null; }
  if (PAGE_ROUTES[rel]) rel = PAGE_ROUTES[rel];
  const abs = path.join(PUBLIC_DIR, rel);
  const type = MIME[path.extname(abs).toLowerCase()];
  if (!type || !abs.startsWith(PUBLIC_DIR + path.sep) || abs.split(path.sep).some((p) => p.startsWith('.'))) return null;
  try { return { type, data: await fs.promises.readFile(abs) }; } catch (_) { return null; }
}

const server = http.createServer(async (req, res) => {
  securityHeaders(req, res);
  if (FORCE_HTTPS && TRUST_PROXY && forwardedProto(req) === 'http') {
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (!/^[a-z0-9.-]+$/i.test(host) || !String(req.url).startsWith('/')) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Yêu cầu không hợp lệ');
    }
    res.writeHead(308, { Location: `https://${host}${req.url}`, 'Cache-Control': 'no-store' });
    return res.end();
  }
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      const file = await staticFile(url.pathname);
      if (file) {
        res.writeHead(200, { 'Content-Type': file.type, 'Cache-Control': 'no-cache' });
        return res.end(file.data);
      }
    }

    if (!url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Không tìm thấy' });

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const ip = clientIp(req);
      if (tooMany(ip)) return json(res, 429, { error: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau vài phút' });
      let body = {};
      try { body = JSON.parse((await readBody(req, 10240)).toString() || '{}'); } catch (_) {}
      await Promise.all(accounts.map(resolveAccount));
      const acc = findByLogin(body.username);
      const ok = acc && typeof body.password === 'string' && safeEqual(body.password, acc.password);
      if (!ok) {
        noteFail(ip);
        return json(res, 401, { error: 'Sai tên đăng nhập hoặc mật khẩu' });
      }
      fails.delete(ip);
      const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
      return json(res, 200, { session: signData(acc, 'session', { e: exp }), owner: acc.login });
    }

    const sess = verifyData((req.headers['authorization'] || '').replace(/^Bearer\s+/i, ''), 'session');
    if (!sess) return json(res, 401, { error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    const isWrite = req.method !== 'GET' && !(req.method === 'PUT' && (url.pathname === '/api/upload' || url.pathname === '/api/save'));
    return await als.run(sess.a, () => (isWrite ? withWriteLock(() => apiRoutes(req, res, url)) : apiRoutes(req, res, url)));
  } catch (err) {
    if (res.headersSent) return res.destroy();
    json(res, err.status || 500, { error: err.message || 'Lỗi máy chủ', ...(err.exists ? { exists: true } : {}) });
  }
});

async function apiRoutes(req, res, url) {
    const rel = cleanPath(url.searchParams.get('path'));

    if (req.method === 'GET' && url.pathname === '/api/ping') {
      // Trang nào của web cũng gọi /api/ping khi mở: nhân dịp này quét thùng rác xem có tệp quá hạn không (tối đa 1 phút một lần)
      if (Date.now() - (A().lastSweepCheck || 0) > 60000) {
        A().lastSweepCheck = Date.now();
        needsSweep().then((n) => { if (n) startSweep(); }).catch(() => {});
      }
      return json(res, 200, { ok: true, repo: A().repo, owner: A().login, ghName: A().ghName, author: process.env.AUTHOR_NAME || A().ghName || A().login, branch: A().branch, folder: A().root, maxMb: MAX_MB, limitGb: LIMIT_GB, noticeUrl: NOTICE_URL.includes('TEN_GITHUB') ? '' : NOTICE_URL });
    }

    if (req.method === 'GET' && url.pathname === '/api/overview') {
      return json(res, 200, await overview());
    }
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, await systemStatus());

    if (req.method === 'GET' && url.pathname === '/api/search') {
      const needle = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (!needle) return json(res, 200, { items: [] });
      const live = (await getTree()).filter((f) => !inTrash(f.rel));
      const out = [];
      const dirSeen = new Set();
      for (const f of live) {
        const parts = f.rel.split('/');
        for (let i = 1; i < parts.length; i++) {
          const dp = parts.slice(0, i).join('/');
          if (!dirSeen.has(dp)) {
            dirSeen.add(dp);
            if (parts[i - 1].toLowerCase().includes(needle)) out.push({ name: parts[i - 1], path: dp, type: 'dir' });
          }
        }
        if (!isKeep(f.rel) && baseName(f.rel).toLowerCase().includes(needle)) out.push({ name: baseName(f.rel), path: f.rel, type: 'file', size: f.size });
      }
      out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
      return json(res, 200, { items: out.slice(0, 30) });
    }

    if (req.method === 'GET' && url.pathname === '/api/files') {
      let entries;
      const tc = A().treeCache;
      if (tc && Date.now() - tc.at < 30000) {
        // Có sẵn cây tệp trong bộ nhớ -> dựng danh sách ngay, không cần gọi GitHub thêm lần nữa
        const prefix = rel ? `${rel}/` : '';
        const seen = new Map();
        for (const f of tc.data) {
          if (!f.rel.startsWith(prefix)) continue;
          const rest = f.rel.slice(prefix.length), i = rest.indexOf('/');
          if (i < 0) seen.set(rest, { name: rest, type: 'file', size: f.size });
          else if (!seen.has(rest.slice(0, i))) seen.set(rest.slice(0, i), { name: rest.slice(0, i), type: 'dir', size: 0 });
        }
        entries = [...seen.values()];
      } else entries = await listDir(full(rel));
      const items = entries
        .filter((i) => i.name !== '.gitkeep' && !(rel === '' && i.name === TRASH))
        .map((i) => ({ name: i.name, type: i.type === 'dir' ? 'dir' : 'file', size: i.size }))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
      return json(res, 200, { path: rel, items });
    }

    if (req.method === 'PUT' && url.pathname === '/api/upload') {
      if (!rel) throw Object.assign(new Error('Thiếu tên tệp'), { status: 400 });
      const overwrite = url.searchParams.get('overwrite') === '1';
      const buf = await readBody(req, MAX_BYTES);
      const tree = await getTree();
      const used = tree.reduce((s, f) => s + f.size, 0);
      const old = overwrite ? (tree.find((f) => f.rel === rel) || { size: 0 }).size : 0;
      if (used - old + buf.length > LIMIT_GB * 1024 ** 3) {
        throw Object.assign(new Error(`Vượt hạn mức dung lượng ${LIMIT_GB} GB của kho`), { status: 413 });
      }
      await withWriteLock(() => putFile(full(rel), buf, `Upload ${rel}`, overwrite));
      invalidate();
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/read') {
      if (!rel) throw Object.assign(new Error('Thiếu đường dẫn'), { status: 400 });
      const g = await gh('GET', full(rel));
      if (!g.ok) throw await ghError(g);
      const j = await g.json();
      if (Array.isArray(j)) throw Object.assign(new Error('Đây là thư mục, không phải tệp'), { status: 400 });
      if (j.size > MAX_EDIT) throw Object.assign(new Error(`Tệp quá lớn để chỉnh sửa (tối đa ${MAX_EDIT / 1048576} MB)`), { status: 413 });
      const buf = Buffer.from(j.content || '', 'base64');
      let text;
      try {
        if (buf.includes(0)) throw new Error('binary');
        text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
      } catch (_) {
        throw Object.assign(new Error('Đây không phải tệp văn bản nên không thể chỉnh sửa'), { status: 415 });
      }
      return json(res, 200, { text, sha: j.sha, size: j.size });
    }

    if (req.method === 'PUT' && url.pathname === '/api/save') {
      if (!rel) throw Object.assign(new Error('Thiếu tên tệp'), { status: 400 });
      const buf = await readBody(req, MAX_EDIT);
      const base = String(url.searchParams.get('base') || '');
      const tree = await getTree();
      const used = tree.reduce((s, f) => s + f.size, 0);
      const old = (tree.find((f) => f.rel === rel) || { size: 0 }).size;
      if (used - old + buf.length > LIMIT_GB * 1024 ** 3) {
        throw Object.assign(new Error(`Vượt hạn mức dung lượng ${LIMIT_GB} GB của kho`), { status: 413 });
      }
      await withWriteLock(async () => {
        const sha = await getSha(full(rel));
        if (!sha) throw Object.assign(new Error('Tệp không còn tồn tại (có thể đã bị xóa hoặc di chuyển)'), { status: 404 });
        // base = mã phiên bản lúc người dùng mở tệp; lệch nghĩa là tệp đã bị sửa ở nơi khác
        if (base && base !== sha) throw Object.assign(new Error('Tệp đã bị thay đổi ở nơi khác kể từ khi bạn mở'), { status: 409 });
        const r = await gh('PUT', full(rel), { body: { message: `Edit ${rel}`, content: buf.toString('base64'), branch: A().branch, sha } });
        if (!r.ok) throw await ghError(r);
      });
      invalidate();
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/download') {
      if (!rel) throw Object.assign(new Error('Thiếu đường dẫn'), { status: 400 });
      return await sendDownload(res, rel);
    }

    if (req.method === 'POST' && url.pathname === '/api/mkdir') {
      if (!rel) throw Object.assign(new Error('Thiếu tên thư mục'), { status: 400 });
      await putFile(`${full(rel)}/.gitkeep`, Buffer.from(''), `Create folder ${rel}`, true);
      invalidate();
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/trash') {
      if (!rel) throw Object.assign(new Error('Thiếu đường dẫn'), { status: 400 });
      const all = await getTree(true);
      const hits = all.filter((f) => !inTrash(f.rel) && (f.rel === rel || f.rel.startsWith(`${rel}/`)));
      if (!hits.length) throw Object.assign(new Error('Không tìm thấy'), { status: 404 });
      const takenTrash = new Set(all.filter((f) => inTrash(f.rel)).map((f) => f.rel.slice(TRASH.length + 1)));
      const changes = [];
      for (const f of hits) {
        changes.push({ path: full(f.rel), sha: null });
        // .gitkeep giữ nguyên tên để thư mục (kể cả thư mục rỗng) vẫn hiện trong thùng rác và khôi phục được
        const dest = isKeep(f.rel) ? f.rel : uniqueRel(f.rel, takenTrash);
        takenTrash.add(dest);
        changes.push({ path: full(`${TRASH}/${dest}`), sha: f.sha });
      }
      const stamp = Date.now();
      const dests = changes.filter((c) => c.sha).map((c) => c.path.slice(full(TRASH).length + 1));
      const mc = await metaChange((m) => { for (const d of dests) m.trash[d] = stamp; });
      try {
        await commitChanges([...changes, mc.change], `Trash ${rel}`);
        mc.done();
      } finally {
        invalidate();
      }
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/move') {
      if (!rel) throw Object.assign(new Error('Thiếu đường dẫn'), { status: 400 });
      const to = cleanPath(url.searchParams.get('to'));
      if (to === rel || to.startsWith(`${rel}/`)) throw Object.assign(new Error('Không thể di chuyển một thư mục vào chính nó'), { status: 400 });
      const name = baseName(rel);
      const newRel = to ? `${to}/${name}` : name;
      if (newRel === rel) throw Object.assign(new Error('Mục này đã nằm trong thư mục đó'), { status: 400 });
      const all = await getTree(true);
      const hits = all.filter((f) => !inTrash(f.rel) && (f.rel === rel || f.rel.startsWith(`${rel}/`)));
      if (!hits.length) throw Object.assign(new Error('Không tìm thấy'), { status: 404 });
      if (to && !all.some((f) => !inTrash(f.rel) && f.rel.startsWith(`${to}/`))) {
        throw Object.assign(new Error('Thư mục đích không tồn tại'), { status: 404 });
      }
      const existing = new Map(all.filter((f) => !inTrash(f.rel)).map((f) => [f.rel, f.sha]));
      const changes = [];
      let moved = 0;
      for (const f of hits) {
        const dest = newRel + f.rel.slice(rel.length);
        if (!isKeep(f.rel) && existing.has(dest)) {
          throw Object.assign(new Error(`Đã có tệp trùng tên ở thư mục đích: ${dest}`), { status: 409 });
        }
        changes.push({ path: full(f.rel), sha: null }, { path: full(dest), sha: f.sha });
        if (!isKeep(f.rel)) moved++;
      }
      try {
        await commitChanges(changes, `Move ${rel} to ${to || '/'}`);
      } finally {
        invalidate();
      }
      return json(res, 200, { ok: true, moved, path: newRel });
    }

    if (req.method === 'POST' && url.pathname === '/api/rename') {
      if (!rel) throw Object.assign(new Error('Thiếu đường dẫn'), { status: 400 });
      const name = String(url.searchParams.get('name') || '').trim();
      if (!name) throw Object.assign(new Error('Tên không được để trống'), { status: 400 });
      if (name.length > 200) throw Object.assign(new Error('Tên quá dài (tối đa 200 ký tự)'), { status: 400 });
      if (/[\/\\\0]/.test(name) || name === '.' || name === '..' || name === '.gitkeep') {
        throw Object.assign(new Error('Tên không hợp lệ (không được chứa / hoặc \\)'), { status: 400 });
      }
      const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
      if (!parent && name === TRASH) throw Object.assign(new Error('Tên không hợp lệ'), { status: 400 });
      if (name === baseName(rel)) throw Object.assign(new Error('Tên không thay đổi'), { status: 400 });
      const newRel = parent ? `${parent}/${name}` : name;
      const all = await getTree(true);
      const hits = all.filter((f) => !inTrash(f.rel) && (f.rel === rel || f.rel.startsWith(`${rel}/`)));
      if (!hits.length) throw Object.assign(new Error('Không tìm thấy'), { status: 404 });
      if (all.some((f) => !inTrash(f.rel) && !isKeep(f.rel) && (f.rel === newRel || f.rel.startsWith(`${newRel}/`)))) {
        throw Object.assign(new Error(`Đã có tệp hoặc thư mục tên "${name}" ở đây`), { status: 409 });
      }
      const changes = [];
      for (const f of hits) {
        changes.push({ path: full(f.rel), sha: null }, { path: full(newRel + f.rel.slice(rel.length)), sha: f.sha });
      }
      try {
        await commitChanges(changes, `Rename ${rel} to ${name}`);
      } finally {
        invalidate();
      }
      return json(res, 200, { ok: true, path: newRel });
    }

    if (req.method === 'GET' && url.pathname === '/api/trash') {
      // Tự dọn chạy nền, không chặn việc hiển thị danh sách: tệp ở trong thùng rác quá TRASH_DAYS ngày sẽ bị xóa hết
      try { if (await needsSweep()) startSweep(); } catch (e) { console.error('[TRASH]', e.message); }
      const meta = await loadMeta();
      const tf = (await getTree()).filter((f) => inTrash(f.rel)).map((f) => ({ ...f, p: f.rel.slice(TRASH.length + 1) }));
      // Thư mục = nơi có .gitkeep; chỉ hiện thư mục ngoài cùng, các mục bên trong gộp vào nó
      const dirs = new Set(tf.filter((f) => isKeep(f.p)).map((f) => f.p.slice(0, -'.gitkeep'.length).replace(/\/$/, '')).filter(Boolean));
      const top = [...dirs].filter((d) => ![...dirs].some((o) => o !== d && d.startsWith(`${o}/`)));
      const items = top.map((d) => {
        const all = tf.filter((f) => f.p.startsWith(`${d}/`));
        const inside = all.filter((f) => !isKeep(f.p));
        return { path: d, name: baseName(d), type: 'dir', size: inside.reduce((n, f) => n + f.size, 0), count: inside.length, deleted: Math.max(0, ...all.map((f) => meta.trash[f.p] || 0)) || null };
      });
      for (const f of tf) {
        if (isKeep(f.p) || top.some((d) => f.p.startsWith(`${d}/`))) continue;
        items.push({ path: f.p, name: baseName(f.p), type: 'file', size: f.size, deleted: meta.trash[f.p] || null });
      }
      items.sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1));
      return json(res, 200, { items, days: TRASH_DAYS });
    }

    if (req.method === 'POST' && url.pathname === '/api/restore') {
      if (!rel) throw Object.assign(new Error('Thiếu đường dẫn'), { status: 400 });
      const files = await getTree(true);
      const from = `${TRASH}/${rel}`;
      const hits = files.filter((f) => f.rel === from || f.rel.startsWith(`${from}/`));
      if (!hits.length) throw Object.assign(new Error('Không tìm thấy trong thùng rác'), { status: 404 });
      const taken = new Set(files.filter((f) => !inTrash(f.rel)).map((f) => f.rel));
      // conflict: (không có) = báo 409 nếu trùng tên | overwrite = ghi đè tệp hiện có | rename = đổi tên bản khôi phục
      const mode = url.searchParams.get('conflict');
      const clashes = hits.filter((f) => !isKeep(f.rel) && taken.has(f.rel.slice(TRASH.length + 1)));
      if (clashes.length && mode !== 'overwrite' && mode !== 'rename') {
        const first = clashes[0].rel.slice(TRASH.length + 1);
        throw Object.assign(new Error(clashes.length === 1 ? `Đã có tệp trùng tên: ${first}` : `Đã có ${clashes.length} tệp trùng tên (ví dụ: ${first})`), { status: 409 });
      }
      const asCopy = mode === 'rename';
      const changes = [];
      for (const f of hits) {
        const orig = f.rel.slice(TRASH.length + 1);
        // Chế độ bản sao: tệp trùng tên được lưu thành "ten (1).ext"; .gitkeep giữ nguyên
        const dest = asCopy && !isKeep(f.rel) ? uniqueRel(orig, taken) : orig;
        taken.add(dest);
        changes.push({ path: full(f.rel), sha: null }, { path: full(dest), sha: f.sha });
      }
      const mc = await metaChange((m) => { for (const f of hits) delete m.trash[f.rel.slice(TRASH.length + 1)]; });
      try {
        await commitChanges([...changes, mc.change], `Restore ${rel}`);
        mc.done();
      } finally {
        invalidate();
      }
      return json(res, 200, { ok: true });
    }

    if (req.method === 'DELETE' && url.pathname === '/api/trash') {
      const from = rel ? `${TRASH}/${rel}` : TRASH;
      const hits = (await getTree(true)).filter((f) => f.rel === from || f.rel.startsWith(`${from}/`));
      try {
        // Xóa vĩnh viễn: xóa từng tệp bằng Contents API (không dùng commit gộp)
        await purgeFiles(hits);
      } finally {
        invalidate();
      }
      if (hits.length) {
        const gone = new Set(hits.map((f) => f.rel.slice(TRASH.length + 1)));
        await saveMeta((m) => { for (const p of gone) delete m.trash[p]; });
      }
      return json(res, 200, { ok: true, deleted: hits.filter((f) => !isKeep(f.rel)).length || hits.length });
    }

    json(res, 404, { error: 'Không tìm thấy' });
}

function osName() {
  const names = { win32: 'Windows', darwin: 'macOS', android: 'Android', linux: 'Linux', freebsd: 'FreeBSD' };
  let name = names[process.platform] || os.type();
  if (process.platform === 'win32' && parseInt(os.release().split('.')[2], 10) >= 22000) name = 'Windows 11';
  return `${name} (${os.arch()})`;
}

(async () => {
  await Promise.all(accounts.map(resolveAccount));
  for (const a of accounts) if (!a.login) console.error(`[GITHUB] Không thể xác thực tài khoản: ${a.error}. Hệ thống sẽ tự thử lại khi có yêu cầu đăng nhập.`);
  server.listen(PORT, () => {
    const acc = accounts[0];
    const lines = [];
    if (acc.login) lines.push('My NAS đã sẵn sàng', `Tài khoản:    @${acc.login}`);
    lines.push(`Hệ điều hành: ${osName()}`);
    lines.push(`Giới hạn:     ${LIMIT_GB} GB, tối đa ${MAX_MB} MB/tệp`);
    lines.push(`Địa chỉ:      http://localhost:${PORT}`);
    console.log(lines.join('\n'));
    if (FORCE_HTTPS && !TRUST_PROXY) console.warn('[CẢNH BÁO] FORCE_HTTPS chỉ có tác dụng khi đặt thêm TRUST_PROXY=true (chạy sau proxy HTTPS), hiện đang bị bỏ qua.');
  });
})();
