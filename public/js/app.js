(() => {
'use strict';
const $ = (id) => document.getElementById(id);

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
};

const { I, FOLDER, fileIcon } = window.NAS;

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

const PAGE = document.body.dataset.page || 'home';
const PAGES = { home: '/', files: '/files', trash: '/trash', settings: '/settings', edit: '/edit' };
const urlFor = (v, p) => PAGES[v] + ((v === 'files' || v === 'edit') && p ? '?path=' + encodeURIComponent(p) : '');
const EDIT_SHELL = `<div class="app edit-app" id="app" hidden><main class="main"><section id="v-edit"></section></main></div>
<input id="q" hidden><div id="results" hidden></div>
<div class="uppanel" id="uppanel"></div><div class="veil" id="veil" hidden></div><div class="toasts" id="toast"></div><input type="file" id="file" multiple hidden>`;
document.body.insertAdjacentHTML('afterbegin', PAGE === 'edit' ? EDIT_SHELL : `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="gFolder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#f5a524"/></linearGradient>
    <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c93ff"/><stop offset="1" stop-color="#2563eb"/></linearGradient>
    <linearGradient id="gViolet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#4f46e5"/></linearGradient>
    <linearGradient id="gTeal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient>
    <linearGradient id="gGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#15803d"/></linearGradient>
    <linearGradient id="gSlate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7384a6"/><stop offset="1" stop-color="#334155"/></linearGradient>
    <linearGradient id="gGray" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b99b8"/><stop offset="1" stop-color="#4b5876"/></linearGradient>
    <linearGradient id="gRose" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7aa8"/><stop offset="1" stop-color="#e11d63"/></linearGradient>
    <linearGradient id="gRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7b72"/><stop offset="1" stop-color="#dc2626"/></linearGradient>
    <linearGradient id="gOrange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffab5e"/><stop offset="1" stop-color="#ea580c"/></linearGradient>
    <linearGradient id="gAmber" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#d97706"/></linearGradient>
  </defs>
</svg>
<div class="app" id="app" hidden>
  <aside class="side" id="side"></aside>
  <div class="backdrop" id="backdrop"></div>
  <main class="main">
    <div class="topbar">
      <button class="menubtn" id="menubtn" title="Menu"></button>
      <div class="search">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="M15.500 15.500 20 20"/></svg>
        <input id="q" type="search" placeholder="Tìm tệp... (Ctrl + K)" autocomplete="off">
        <div class="results" id="results" hidden></div>
      </div>
      <button class="iconbtn" id="bell" title="Thông báo"></button>
      <div class="themebtn" id="themebtn"></div>
    </div>
    <section id="v-${PAGE}"></section>
  </main>
</div>
<div class="uppanel" id="uppanel"></div>
<div class="veil" id="veil" hidden>Thả tệp vào đây để tải lên</div>
<div class="toasts" id="toast"></div>
<input type="file" id="file" multiple hidden>`);

const EXT = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'rtf', 'odt', 'pages'],
  text: ['txt', 'md', 'log'],
  ppt: ['ppt', 'pptx', 'odp', 'key'],
  sheet: ['xls', 'xlsx', 'csv', 'ods', 'numbers'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'avif', 'ico'],
  video: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv'],
  audio: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'],
  zip: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'java', 'c', 'cpp', 'go', 'rs', 'sh', 'yml', 'yaml', 'php', 'rb', 'kt', 'swift', 'xml', 'sql', 'vue'],
};
function tile(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  let k = 'file';
  for (const [key, list] of Object.entries(EXT)) if (list.includes(ext)) k = key;
  return h('div', { class: 'ft', html: fileIcon(k, ext) });
}
const folderTile = () => h('div', { class: 'ft', html: FOLDER });

const MAX_EDIT = 1048576;
const BIN = new Set([...EXT.pdf, ...EXT.doc, ...EXT.ppt, ...EXT.sheet.filter((e) => e !== 'csv'), ...EXT.image.filter((e) => e !== 'svg'),
  ...EXT.video, ...EXT.audio, ...EXT.zip, 'exe', 'dll', 'bin', 'iso', 'apk', 'dmg', 'so', 'class', 'jar', 'woff', 'woff2', 'ttf', 'otf']);
const canEdit = (name) => { const dot = name.lastIndexOf('.'); return !BIN.has(dot > 0 ? name.slice(dot + 1).toLowerCase() : ''); };

function fmtSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}
function fmtAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return Math.floor(s / 60) + ' phút trước';
  if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
  if (s < 2592000) return Math.floor(s / 86400) + ' ngày trước';
  return new Date(iso).toLocaleDateString('vi-VN');
}
function fmtUptime(sec) {
  const d = Math.floor(sec / 86400), hr = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} ngày ${hr} giờ`;
  if (hr > 0) return `${hr} giờ ${m} phút`;
  return `${m} phút`;
}
const q = (p) => '?path=' + encodeURIComponent(p);
const join = (a, b) => (a ? a + '/' + b : b);
const parentOf = (p) => p.split('/').slice(0, -1).join('/');

const TOAST_ICONS = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.500"/></svg>',
  err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 7v6.500M12 17.200v.1"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 7v6.500M12 17.200v.1"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 11v6M12 7.200v.1"/></svg>',
  load: '<span class="spin"></span>'
};
const TOAST_MAX = 2, TOAST_MIN = 1400, TOAST_FADE = 180;
let toastShown = [], toastQ = [];
function toastKind(m) {
  if (/^Đang/.test(m)) return 'load';
  if (/lỗi|thất bại|Hãy tải lại|không thể/i.test(m)) return 'err';
  if (/^Đã bỏ qua|lớn hơn|^Vui lòng|không được/.test(m)) return 'warn';
  if (/^Đã|^Thùng rác/.test(m)) return 'ok';
  return 'info';
}
const toastBox = () => { const b = $('toast'); b.hidden = false; return b; };
function placeToasts() {
  const box = toastBox();
  box.style.bottom = '';
  const up = $('uppanel');
  if (!up || !up.offsetHeight || !box.children.length) return;
  const a = box.getBoundingClientRect(), b = up.getBoundingClientRect();
  if (a.right > b.left && a.left < b.right && a.bottom > b.top)
    box.style.bottom = (window.innerHeight - b.top + 12) + 'px';
}
function dropToast(it) {
  if (it.gone) return;
  it.gone = true; clearTimeout(it.timer);
  toastShown = toastShown.filter((x) => x !== it);
  it.el.classList.remove('show');
  setTimeout(() => { it.el.remove(); placeToasts(); pumpToast(); }, TOAST_FADE);
}
function armToast(it) {
  clearTimeout(it.timer);
  let wait = it.ms;
  if (toastQ.length && it.ms < 60000) wait = Math.max(TOAST_MIN - (Date.now() - it.at), 0) + 400;
  it.timer = setTimeout(() => dropToast(it), wait);
}
function showToast(it) {
  const el = h('div', { class: 'toast ' + it.kind, role: 'status', onclick: () => dropToast(it) },
    h('i', { class: 'ti', html: TOAST_ICONS[it.kind] }), h('span', { class: 'tm' }, it.msg));
  it.el = el; it.at = Date.now();
  toastBox().append(el);
  toastShown.push(it);
  placeToasts();
  requestAnimationFrame(() => el.classList.add('show'));
  armToast(it);
}
function pumpToast() {
  const box = toastBox();
  while (toastQ.length && box.children.length < TOAST_MAX) showToast(toastQ.shift());
  if (toastQ.length) toastShown.forEach(armToast);
}
function clearToast() { toastQ = []; toastShown.slice().forEach(dropToast); }
function toast(msg, ms, kind) {
  msg = String(msg); kind = kind || toastKind(msg); ms = ms || 3500;
  const dup = toastShown.find((x) => x.msg === msg);
  if (dup) { dup.ms = ms; dup.at = Date.now(); return armToast(dup); }
  if (toastQ.some((x) => x.msg === msg)) return;
  if (kind !== 'load') {
    toastQ = toastQ.filter((x) => x.kind !== 'load');
    toastShown.filter((x) => x.kind === 'load').forEach(dropToast);
  }
  toastQ.push({ msg, kind, ms });
  if (toastQ.length > 4) toastQ.splice(0, toastQ.length - 4);
  pumpToast();
}

const NKEY = 'notifs';
const notifs = () => LS.get(NKEY, []);
function notify(msg, kind, key) {
  const list = notifs();
  if (key && list.some((n) => n.key === key)) return;
  const top = list[0];
  if (top && top.msg === msg && Date.now() - top.t < 60000) return;
  list.unshift({ id: Date.now() + Math.random(), t: Date.now(), kind: kind || 'info', msg, read: false, key: key || null });
  LS.set(NKEY, list.slice(0, 200));
  updateBadge();
  if (notifEl) renderNotif(false);
}
function fail(msg) { toast(msg, 5000, 'err'); notify(msg, 'err'); }
function updateBadge() {
  const b = $('bellbadge'); if (!b) return;
  const n = notifs().filter((x) => !x.read).length;
  b.textContent = n > 9 ? '9+' : String(n);
  b.hidden = n === 0;
}
const fmtNotifTime = (t) => new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
let notifEl = null;
const ROOT_NAME = 'home';
const addr = (p) => ROOT_NAME + '/' + (p || '');
let notifScrim = null;
function closeNotif() {
  if (notifEl) { notifEl.remove(); notifEl = null; }
  if (notifScrim) { notifScrim.remove(); notifScrim = null; }
}
function renderNotif(markRead) {
  const list = notifs();
  const body = list.length
    ? list.map((n) => h('div', { class: 'ni ' + n.kind + (n.read ? '' : ' unread') },
        h('i', { class: 'nd' }),
        h('div', { class: 'nt' }, h('span', {}, n.msg), h('small', {}, fmtNotifTime(n.t)))))
    : [h('div', { class: 'empty' }, 'Chưa có thông báo mới')];
  notifEl.replaceChildren(
    h('div', { class: 'nh' }, h('b', {}, 'Thông báo'), h('span', { class: 'sp' }),
      h('button', { class: 'btn ghost sm', onclick: () => { LS.set(NKEY, notifs().map((n) => ({ ...n, read: true }))); updateBadge(); renderNotif(false); } }, 'Đánh dấu đã đọc'),
      h('button', { class: 'btn ghost sm', onclick: () => { LS.set(NKEY, []); updateBadge(); renderNotif(false); } }, 'Xóa tất cả')),
    h('div', { class: 'nl' }, body));
  if (markRead) { LS.set(NKEY, list.map((n) => ({ ...n, read: true }))); updateBadge(); }
}
function toggleNotif(e) {
  e.stopPropagation();
  if (notifEl) return closeNotif();
  closeMenu(); closeSearch(); clearToast();
  notifScrim = h('div', { class: 'notif-scrim' });
  const eat = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
  notifScrim.addEventListener('click', (ev) => { eat(ev); closeNotif(); });
  notifScrim.addEventListener('contextmenu', eat);
  notifEl = h('div', { class: 'notif' });
  document.body.append(notifScrim, notifEl);
  renderNotif(true);
  fetchNotices();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && notifEl) closeNotif(); });

const SEENKEY = 'notice_seen';
let noticeTimer = null, noticeBusy = false, noticeLast = LS.get('notice_last', 0);
async function fetchNotices(force) {
  const url = info && info.noticeUrl;
  if (!url || noticeBusy || (!force && Date.now() - noticeLast < 60000)) return;
  noticeBusy = true; noticeLast = Date.now(); LS.set('notice_last', noticeLast);
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const arr = Array.isArray(data) ? data : data && data.notices;
    if (!Array.isArray(arr)) return;
    const seen = LS.get(SEENKEY, []);
    const now = Date.now();
    const valid = arr
      .filter((n) => n && n.id != null && typeof n.msg === 'string' && n.msg.trim() && !seen.includes(String(n.id)))
      .map((n) => ({ id: String(n.id), msg: n.msg.trim().slice(0, 500), kind: ['info', 'ok', 'warn', 'err'].includes(n.kind) ? n.kind : 'info', t: Date.parse(n.t) || now }));
    const fresh = valid.filter((n) => n.t <= now).sort((a, b) => a.t - b.t);
    const upcoming = valid.filter((n) => n.t > now).map((n) => n.t);
    clearTimeout(noticeTimer);
    if (upcoming.length) noticeTimer = setTimeout(() => fetchNotices(true), Math.min(Math.min(...upcoming) - now + 1000, 2147000000));
    if (!fresh.length) return;
    const list = notifs();
    for (const n of fresh) list.unshift({ id: 'remote-' + n.id, t: n.t, kind: n.kind, msg: n.msg, read: false, key: 'remote-' + n.id, remote: true });
    list.sort((a, b) => b.t - a.t);
    LS.set(NKEY, list.slice(0, 200));
    LS.set(SEENKEY, seen.concat(fresh.map((n) => n.id)).slice(-500));
    updateBadge();
    if (notifEl) renderNotif(false);
    toast('Có thông báo mới từ tác giả');
  } catch (_) {   }
  finally { noticeBusy = false; }
}

function checkStorage(o) {
  if (!o || !o.limit) return;
  const pct = (o.used / o.limit) * 100, day = new Date().toISOString().slice(0, 10);
  if (pct >= 90) notify(`Dung lượng đã dùng ${Math.round(pct)}%, gần đầy. Hãy dọn thùng rác hoặc xóa bớt tệp.`, 'err', 'storage90-' + day);
  else if (pct >= 80) notify(`Dung lượng đã dùng ${Math.round(pct)}%. Nên dọn dẹp bớt tệp sớm.`, 'warn', 'storage80-' + day);
}
let pw = sessionStorage.getItem('session') || '';
let info = {};
function toLogin() { sessionStorage.removeItem('session'); sessionStorage.removeItem('info'); location.replace('/login.html'); }
async function api(method, url, body) {
  let res;
  try { res = await fetch(url, { method, headers: { Authorization: 'Bearer ' + pw }, body }); }
  catch (_) { throw new Error('Không thể kết nối tới máy chủ'); }
  if (res.status === 401) toLogin();
  if (!res.ok) {
    let msg = 'Lỗi ' + res.status;
    try { msg = (await res.json()).error || msg; } catch (_) {}
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return res;
}
const apiJson = async (m, u, b) => (await api(m, u, b)).json();

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  LS.set('theme', t);
  document.querySelectorAll('[data-theme-btn]').forEach((b) => b.classList.toggle('on', b.dataset.themeBtn === t));
}

const NAV = [['home', 'Trang chủ', 'home'], ['files', 'Storage', 'folder'], ['trash', 'Thùng rác', 'trash'], ['settings', 'Cài đặt', 'settings']];
const current = PAGE;
const pathFromUrl = () => (new URLSearchParams(location.search).get('path') || '').split('/').filter(Boolean).join('/');
let cwd = current === 'files' ? pathFromUrl() : '';
let poll = null;
const displayName = () => info.owner || 'bạn';

function setSide(open) {
  document.body.classList.toggle('side-open', open);
  document.documentElement.classList.toggle('side-lock', open);
}

function openDir(p) {
  if (current !== 'files') { location.href = urlFor('files', p); return; }
  closeMenu(); closeSearch();
  if (p !== cwd) history.pushState(null, '', urlFor('files', p));
  loadFiles(p);
}
window.addEventListener('popstate', () => { if (current === 'files') loadFiles(pathFromUrl()); });

function refresh() {
  listCache.clear();
  if (current === 'files') return loadFiles(cwd, true);
  if (current === 'home') return loadHome();
  if (current === 'trash') return loadTrash();
  return Promise.resolve();
}
let opsInFlight = 0;
async function endOp() {
  if (--opsInFlight > 0) return;
  const t = [...pendingTrash], g = [...pendingPurge], all = pendingAllPurge;
  await refresh();
  if (all) pendingAllPurge = false;
  t.forEach((p) => pendingTrash.delete(p));
  g.forEach((p) => pendingPurge.delete(p));
}

let booted = false;
function boot() {
  if (booted) return;
  booted = true;

  if (current === 'edit') setTheme(LS.get('theme', 'dark'));
  else {
  const side = $('side');
  side.append(
    h('div', { class: 'brand', html: '<img src="/img/logo.svg" alt="My NAS"><div><b class="wm"><span class="m">My</span><span class="n">NAS</span></b><small>Đám mây cá nhân</small></div>' }),
    h('nav', { class: 'nav' },
      NAV.map(([id, label, ic]) => h('a', { href: urlFor(id), class: id === (current === 'edit' ? 'files' : current) ? 'on' : null, 'data-v': id, html: I(ic) + '<span>' + label + '</span>' })),
      h('div', { class: 'sep' }),
      h('div', { class: 'lbl' }, 'Thông tin'),
      h('button', { html: I('info') + '<span>Giới thiệu</span>', onclick: showAbout }),
      h('button', { html: I('help') + '<span>Trợ giúp</span>', onclick: showHelp })),
    h('div', { class: 'grow' }),
    h('button', { class: 'usercard', onclick: (e) => { e.stopPropagation(); openUserMenu(e.currentTarget); } },
      h('div', { class: 'avatar', id: 'avatar' }),
      h('div', {}, h('b', { id: 'uname' }), h('small', {}, 'Chủ sở hữu')),
      h('span', { html: I('chevron') })),
    h('button', { class: 'logout', html: I('logout') + '<span>Đăng xuất</span>', onclick: logout }));
  refreshUser();

  if (matchMedia('(max-width:900px)').matches) $('q').placeholder = 'Tìm tệp...';
  $('menubtn').innerHTML = I('menu');
  $('bell').innerHTML = I('bell');
  $('bell').append(h('span', { id: 'bellbadge', class: 'badge', hidden: '' }));
  $('bell').onclick = toggleNotif;
  try { localStorage.removeItem('shares'); } catch (_) {}
  updateBadge();
  fetchNotices(); setInterval(fetchNotices, 600000);
  $('menubtn').onclick = () => setSide(!document.body.classList.contains('side-open'));
  $('backdrop').onclick = () => setSide(false);
  document.addEventListener('touchmove', (e) => {
    if (document.body.classList.contains('side-open') && !e.target.closest('.side')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('wheel', (e) => {
    if (document.body.classList.contains('side-open') && !e.target.closest('.side')) e.preventDefault();
  }, { passive: false });
  window.addEventListener('resize', () => { if (innerWidth > 900) setSide(false); });
  $('themebtn').append(
    h('button', { 'data-theme-btn': 'dark', title: 'Giao diện tối', html: I('moon'), onclick: () => setTheme('dark') }),
    h('button', { 'data-theme-btn': 'light', title: 'Giao diện sáng', html: I('sun'), onclick: () => setTheme('light') }));
  setTheme(LS.get('theme', 'dark'));
  }

  if (current === 'home') { buildHome(); loadHome(); }
  else if (current === 'files') loadFiles(cwd);
  else if (current === 'trash') loadTrash();
  else if (current === 'edit') loadEditor();
  else renderSettings();
  resumeSaves();
}
function openUserMenu(btn) {
  if (menuEl && menuEl.dataset.user) return closeMenu();
  const dark = document.documentElement.dataset.theme !== 'light';
  const entries = [
    { label: 'Cài đặt tài khoản', run: () => { location.href = urlFor('settings'); } },
    { label: 'Thùng rác', run: () => { location.href = urlFor('trash'); } },
    { label: dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối', run: () => setTheme(dark ? 'light' : 'dark') },
    { label: 'Mở kho trên GitHub', run: () => { window.open('https://github.com/' + info.repo, '_blank', 'noopener'); } },
  ];
  openMenu(btn, entries);
  menuEl.dataset.user = '1';
  menuEl.style.minWidth = btn.offsetWidth + 'px';
  const r = btn.getBoundingClientRect();
  menuEl.style.left = Math.max(8, r.left) + 'px';
  menuEl.style.top = Math.max(8, r.top - menuEl.offsetHeight - 6) + 'px';
}
function refreshUser() {
  if (!$('uname')) return;
  const n = displayName();
  $('uname').textContent = n;
  $('avatar').textContent = n.charAt(0).toUpperCase();
}

async function start() {
  if (!pw) return toLogin();
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem('info')); } catch (_) {}
  if (cached && cached.owner) { info = cached; $('app').hidden = false; boot(); }
  try {
    info = await apiJson('GET', '/api/ping');
    try { sessionStorage.setItem('info', JSON.stringify(info)); } catch (_) {}
    if (booted) refreshUser(); else { $('app').hidden = false; boot(); }
  } catch (e) {
    if (e.status === 401) return toLogin();
    if (!booted) toast(e.message + '. Hãy tải lại trang để thử lại.', 600000);
  }
}
function logout() { toLogin(); }

function buildHome() {
  $('v-home').innerHTML = `
  <div class="banner">
    <div class="txt"><h2 id="h-greet"></h2><p>Chào mừng đến với NAS của bạn</p></div>
  </div>
  <div class="grid2">
    <div class="card">
      <h3>${I('database')}Dung lượng<span class="pill" id="h-pct">–</span></h3>
      <div class="stor">
        <div class="big"><b id="h-usedv">–</b><small id="h-limit"></small></div>
        <div class="segbar" id="h-seg"></div>
        <div class="free"><span class="dot" id="h-dot"></span><span id="h-free">&nbsp;</span></div>
      </div>
      <p class="note" style="margin:12px 0 0" id="h-limitnote"></p>
    </div>
    <div class="card fill">
      <h3>${I('zap')}Thao tác nhanh</h3>
      <div class="quick">
        <button class="qa b" data-q="upload">${I('qaFolder')}<span>Tải lên<br>tệp</span></button>
        <button class="qa p" data-q="mkdir">${I('qaPlus')}<span>Thư mục mới</span></button>
        <button class="qa o" data-q="trash">${I('qaTrash')}<span>Dọn thùng rác</span></button>
      </div>
    </div>
  </div>
  <div class="cols">
    <div class="stack">
      <div class="card">
        <h3>${I('folderY')}Thư mục của tôi <a id="h-allfolders">Xem tất cả →</a></h3>
        <div class="fgrid" id="h-folders"></div>
      </div>
      <div class="card">
        <h3>${I('recent')}Tệp gần đây <a id="h-allfiles">Xem tất cả →</a></h3>
        <div class="rows" id="h-recent"></div>
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <h3>${I('pulse')}Trạng thái hệ thống</h3>
        <div class="stat g"><span>${I('cpu')}</span><span>CPU</span><div class="bar"><i id="s-cpu-bar"></i></div><em id="s-cpu">–</em></div>
        <div class="stat"><span>${I('ram')}</span><span>RAM</span><div class="bar"><i id="s-ram-bar"></i></div><em id="s-ram">–</em></div>
        <div class="uptime">${I('clock')}<span style="margin-left:0;font-weight:400">Thời gian hoạt động</span><span id="s-up">–</span></div>
        <div class="okpill"><span><i class="dot"></i>Hệ thống hoạt động ổn định!</span></div>
      </div>
      <div class="card promo">
        <span class="spark s1">✦</span><span class="spark s2">✦</span><span class="spark s3">✦</span>
        <img class="promo-ic" src="/img/cloudup.png?v=2" width="48" height="48" alt="">
        <h4>Lưu trữ mọi thứ</h4>
        <p>Tệp của bạn nằm trong kho GitHub riêng tư của chính bạn, có lịch sử phiên bản và truy cập được từ mọi thiết bị.</p>
        <button class="btn pill" id="h-learn">Tìm hiểu thêm →</button>
      </div>
    </div>
  </div>`;
  $('v-home').querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => quick(b.dataset.q)));
  $('h-allfolders').onclick = () => openDir('');
  $('h-allfiles').onclick = () => openDir('');
  $('h-learn').onclick = showAbout;
}

function quick(a) {
  if (a === 'upload') $('file').click();
  else if (a === 'mkdir') mkdir();
  else if (a === 'trash') purgeAll();
}

async function loadHome() {
  $('h-greet').textContent = `Xin chào, ${displayName()}!`;
  clearInterval(poll);
  loadStatus();
  poll = setInterval(loadStatus, 5000);
  try {
    const o = await apiJson('GET', '/api/overview');
    if (current === 'home') renderOverview(o);
  } catch (e) { fail(e.message); }
}

async function loadStatus() {
  try {
    const s = await apiJson('GET', '/api/status');
    if (current !== 'home') return;
    const set = (id, v) => {
      $('s-' + id).textContent = v == null ? '—' : v + '%';
      $('s-' + id + '-bar').style.width = (v || 0) + '%';
    };
    set('cpu', s.cpu); set('ram', s.ram);
    $('s-up').textContent = fmtUptime(s.uptime);
  } catch (_) {}
}

const SEG_N = 40;
const SEG_STOPS = [[0, [34, 197, 94]], [0.5, [234, 179, 8]], [0.75, [249, 115, 22]], [1, [239, 68, 68]]];
function segColor(t) {
  for (let i = 1; i < SEG_STOPS.length; i++) {
    const [t1, c1] = SEG_STOPS[i];
    if (t <= t1) {
      const [t0, c0] = SEG_STOPS[i - 1];
      const k = (t - t0) / (t1 - t0);
      return 'rgb(' + c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',') + ')';
    }
  }
  return 'rgb(' + SEG_STOPS[SEG_STOPS.length - 1][1].join(',') + ')';
}
function renderSegBar(pct) {
  const box = $('h-seg');
  if (!box.children.length) for (let i = 0; i < SEG_N; i++) box.append(document.createElement('i'));
  const filled = pct <= 0 ? 0 : Math.max(1, Math.round(pct / 100 * SEG_N));
  [...box.children].forEach((el, i) => {
    const on = i < filled;
    el.style.background = on ? segColor(i / (SEG_N - 1)) : '';
    el.classList.toggle('on', on);
  });
  const last = Math.max(0, filled - 1);
  $('h-dot').style.background = filled ? segColor(last / (SEG_N - 1)) : '';
}

function renderOverview(o) {
  checkStorage(o);
  const pct = Math.min(100, (o.used / o.limit) * 100);
  $('h-pct').textContent = (pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '%';
  $('h-usedv').textContent = fmtSize(o.used);
  $('h-limit').textContent = ' / ' + fmtSize(o.limit);
  renderSegBar(pct);
  $('h-free').textContent = 'Còn trống: ' + fmtSize(Math.max(0, o.limit - o.used));
  $('h-limitnote').textContent = 'Hạn mức ' + fmtSize(o.limit) + ': tải lên sẽ bị chặn khi vượt mức này.';

  const fg = $('h-folders'); fg.replaceChildren();
  if (!o.folders.length) fg.append(h('div', { class: 'empty', style: 'grid-column:1/-1' }, 'Chưa có thư mục nào.'));
  for (const f of o.folders.slice(0, 8)) {
    fg.append(h('button', { class: 'fold', onclick: () => openDir(f.name) },
      h('span', { html: FOLDER }), h('b', {}, f.name), h('small', {}, fmtSize(f.size))));
  }

  const rc = $('h-recent'); rc.replaceChildren();
  if (!o.recent.length) rc.append(h('div', { class: 'empty' }, 'Chưa có tệp nào được tải lên từ giao diện này.'));
  for (const r of o.recent) {
    const dir = parentOf(r.path);
    rc.append(itemRow({ name: r.name, type: 'file', path: r.path, size: r.size, sub: 'Tải lên ' + fmtAgo(r.date) + (dir ? ' · ' + dir : '') }));
  }
}

function actionsFor(it) {
  const trash = { label: 'Chuyển vào thùng rác', danger: true, run: () => trashIt(it.path) };
  const rename = { label: 'Đổi tên', run: () => renameItem(it) };
  if (it.type === 'dir') return [{ label: 'Mở', run: () => openDir(it.path) }, rename, trash];
  return [
    ...(previewKind(it.name) ? [{ label: 'Xem trước', run: () => openPreview(it, current === 'files' ? previewSiblings() : null) }] : []),
    ...(canEdit(it.name) ? [{ label: 'Mở / Chỉnh sửa', run: () => openFile(it) }] : []),
    { label: 'Tải xuống', run: () => download(it.path, it.name) },
    rename,
    trash,
  ];
}
let dragPath = null;
const canDrop = (src, dest) => src != null && dest !== src && !dest.startsWith(src + '/') && parentOf(src) !== dest;
function dropTarget(el, dest) {
  el.addEventListener('dragover', (e) => {
    if (!canDrop(dragPath, dest)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('dropok');
  });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('dropok'); });
  el.addEventListener('drop', (e) => {
    if (dragPath == null) return;
    e.preventDefault(); el.classList.remove('dropok');
    const src = dragPath; dragPath = null;
    if (canDrop(src, dest)) moveItem(src, dest);
  });
  return el;
}
async function moveItem(src, dest) {
  const name = src.split('/').pop();
  toast('Đang di chuyển...', 120000);
  try {
    await api('POST', '/api/move' + q(src) + '&to=' + encodeURIComponent(dest));
    const m = `Đã di chuyển "${name}" vào ${addr(dest)}`;
    toast(m); notify(m, 'ok');
  } catch (e) { fail(e.message); }
  refresh();
}
function itemRow(it, opts) {
  const open = (e) => {
    if (it.type === 'dir') return openDir(it.path);
    e.stopPropagation();
    if (previewKind(it.name)) return openPreview(it, current === 'files' ? previewSiblings() : null);
    openMenu(row.querySelector('.icon-btn'), actionsFor(it));
  };
  const row = h('div', { class: 'row', 'data-path': it.path },
    it.type === 'dir' ? folderTile() : tile(it.name),
    h('div', { class: 'nm', onclick: open, onpointerenter: it.type === 'dir' ? () => prefetchList(it.path) : null, ontouchstart: it.type === 'dir' ? () => prefetchList(it.path) : null }, h('b', {}, it.name), it.sub ? h('small', {}, it.sub) : null),
    h('div', { class: 'sz' }, it.type === 'dir' ? '' : fmtSize(it.size)),
    h('button', { class: 'icon-btn', title: 'Tùy chọn', html: I('kebab'), onclick: (e) => { e.stopPropagation(); openMenu(e.currentTarget, actionsFor(it)); } }));
  if (opts && opts.dnd) {
    row.draggable = true;
    row.addEventListener('dragstart', (e) => {
      dragPath = it.path;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-nas-path', it.path);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => { dragPath = null; row.classList.remove('dragging'); });
    if (it.type === 'dir') dropTarget(row, it.path);
  }
  return row;
}

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function openMenu(btn, entries) {
  closeMenu();
  menuEl = h('div', { class: 'menu' }, entries.map((e) => h('button', { class: e.danger ? 'danger' : '', onclick: () => { closeMenu(); e.run(); } }, e.label)));
  document.body.append(menuEl);
  const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth, ht = menuEl.offsetHeight;
  menuEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
  menuEl.style.top = (r.bottom + 4 + ht > innerHeight - 8 ? Math.max(8, r.top - ht - 4) : r.bottom + 4) + 'px';
}
document.addEventListener('click', (e) => {
  if (menuEl && !menuEl.contains(e.target)) closeMenu();
  if (!e.target.closest('.search')) closeSearch();
});
window.addEventListener('resize', () => { closeMenu(); closeNotif(); });
window.addEventListener('scroll', closeMenu, true);

const listCache = new Map(), listBusy = new Map();
let navSeq = 0;
function fetchList(p) {
  if (listBusy.has(p)) return listBusy.get(p);
  const job = apiJson('GET', '/api/files' + q(p))
    .then((d) => { listCache.set(p, d.items); return d.items; })
    .finally(() => listBusy.delete(p));
  listBusy.set(p, job);
  return job;
}
function prefetchList(p) { if (!listCache.has(p) && !listBusy.has(p)) fetchList(p).catch(() => {}); }
async function loadFiles(p, fresh) {
  cwd = p;
  const my = ++navSeq;
  if (fresh) listCache.delete(p);
  const cached = listCache.get(p);
  if (current === 'files' && !fresh) renderFiles(cached || [], !cached);
  try {
    const items = await fetchList(p);
    if (my !== navSeq || current !== 'files') return;
    if (!cached || fresh || JSON.stringify(cached) !== JSON.stringify(items)) renderFiles(items);
  } catch (e) {
    if (my !== navSeq) return;
    if (!cached && current === 'files') renderFiles([], false, true);
    fail(e.message);
  }
}
function renderFiles(items, loading, failed) {
  if (items) items = items.filter((it) => !pendingTrash.has(it.path));
  const crumbs = h('div', { class: 'crumbs' }, dropTarget(h('a', { onclick: () => openDir(''), onpointerdown: () => prefetchList('') }, ROOT_NAME), ''));
  let acc = '';
  for (const seg of cwd.split('/').filter(Boolean)) {
    acc = join(acc, seg);
    const t = acc;
    crumbs.append('/', dropTarget(h('a', { onclick: () => openDir(t), onpointerdown: () => prefetchList(t) }, seg), t));
  }
  const list = loading
    ? h('div', { class: 'rows' }, [0, 1, 2, 3].map(() => h('div', { class: 'row sk' }, h('i', { class: 'sk-t' }), h('div', { class: 'sk-l' }))))
    : failed ? h('div', { class: 'empty' }, 'Không tải được thư mục này. Hãy thử lại.')
    : items.length
    ? h('div', { class: 'rows' }, items.map((it) => itemRow({ name: it.name, type: it.type, size: it.size, path: join(cwd, it.name) }, { dnd: true })))
    : h('div', { class: 'empty' }, 'Thư mục này trống. Kéo thả tệp hoặc thư mục vào trang để tải lên.');
  $('v-files').replaceChildren(
    h('div', { class: 'vh' },
      h('h2', {}, 'Storage'), h('div', { class: 'sp' }),
      h('div', { class: 'vact' },
        h('button', { class: 'btn ghost', html: I('plus') + '<span>Thư mục</span>', onclick: mkdir }),
        h('button', { class: 'btn ghost', html: I('plus') + '<span>Tệp</span>', onclick: newFile }),
        h('button', { class: 'btn', html: I('upload') + '<span>Tải lên</span>', onclick: uploadMenu }))),
    h('div', { class: 'card' }, crumbs, list));
}

const PV_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif', pdf: 'application/pdf' };
const pvExt = (n) => { const d = n.lastIndexOf('.'); return d > 0 ? n.slice(d + 1).toLowerCase() : ''; };
const previewKind = (name) => { const e = pvExt(name); return e === 'pdf' ? 'pdf' : PV_MIME[e] ? 'image' : null; };
function previewSiblings() {
  return (listCache.get(cwd) || []).filter((i) => i.type === 'file' && previewKind(i.name)).map((i) => ({ name: i.name, type: 'file', size: i.size, path: join(cwd, i.name) }));
}
let pvUrl = null, pvToken = 0, pvNav = null;
function pvClean() { pvToken++; pvNav = null; if (pvUrl) { URL.revokeObjectURL(pvUrl); pvUrl = null; } }
function openPreview(it, siblings) {
  const list = siblings && siblings.some((x) => x.path === it.path) ? siblings : [it];
  let idx = list.findIndex((x) => x.path === it.path);
  const stage = h('div', { class: 'pvstage' });
  const counter = h('small', {});
  const prev = h('button', { class: 'btn ghost sm', onclick: () => step(-1) }, '‹ Trước');
  const next = h('button', { class: 'btn ghost sm', onclick: () => step(1) }, 'Sau ›');
  const dl = h('button', { class: 'btn sm', onclick: () => download(list[idx].path, list[idx].name) }, 'Tải xuống');
  const hint = h('small', { class: 'pvhint' }, '');
  const bar = h('div', { class: 'pvbar' }, ...(list.length > 1 ? [prev, next, counter] : []), h('div', { class: 'sp' }), hint, dl);
  openModal(it.name, h('div', { class: 'mb pvbody' }, stage, bar), 'preview');
  const wrap = modalEl;
  const step = (d) => { const n = idx + d; if (n >= 0 && n < list.length) show(n); };
  async function show(i) {
    idx = i;
    const cur = list[i], my = ++pvToken, kind = previewKind(cur.name);
    if (pvUrl) { URL.revokeObjectURL(pvUrl); pvUrl = null; }
    wrap.querySelector('.mh h3').textContent = cur.name;
    prev.disabled = i === 0; next.disabled = i === list.length - 1;
    counter.textContent = `${i + 1}/${list.length}`;
    hint.textContent = kind === 'pdf' ? 'Không thấy nội dung? Hãy bấm Tải xuống.' : '';
    stage.replaceChildren(h('div', { class: 'pvload' }, 'Đang tải...'));
    try {
      const blob = await (await api('GET', '/api/download' + q(cur.path))).blob();
      if (my !== pvToken || modalEl !== wrap) return;
      pvUrl = URL.createObjectURL(new Blob([blob], { type: PV_MIME[pvExt(cur.name)] }));
      stage.replaceChildren(kind === 'pdf' ? h('iframe', { src: pvUrl, title: cur.name }) : h('img', { src: pvUrl, alt: cur.name }));
    } catch (e) { if (my === pvToken) stage.replaceChildren(h('div', { class: 'pvload' }, e.message)); }
  }
  pvNav = step;
  show(idx);
}
document.addEventListener('keydown', (e) => {
  if (!pvNav || !modalEl) return;
  if (e.key === 'ArrowLeft') pvNav(-1); else if (e.key === 'ArrowRight') pvNav(1);
});

function mkdir() {
  const inp = h('input', { class: 'inp', type: 'text', placeholder: 'thu-muc-moi', maxlength: '200', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', 'aria-label': 'Tên thư mục' });
  const err = h('div', { class: 'errt', hidden: '' });
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };
  let busy = false;
  const submit = async () => {
    if (busy) return;
    const name = inp.value.trim();
    if (!name) return showErr('Tên thư mục không được để trống');
    if (/[\/\\]/.test(name) || name === '.' || name === '..') return showErr('Tên không được chứa / hoặc \\');
    busy = true;
    closeModal();
    toast('Đang tạo thư mục ' + name + '...', 120000);
    try {
      await api('POST', '/api/mkdir' + q(join(cwd, name)));
      listCache.clear();
      toast('Đã tạo thư mục ' + name);
      notify('Đã tạo thư mục "' + name + '"', 'ok');
      if (current !== 'files') { location.href = urlFor('files', cwd); return; }
    } catch (e) { fail(e.status === 409 || e.status === 422 ? 'Đã có thư mục "' + name + '" trùng tên' : e.message); }
    refresh();
  };
  const create = h('button', { class: 'btn', onclick: submit }, 'Tạo');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') closeModal(); });
  inp.addEventListener('input', () => showErr(''));
  openModal('Thư mục mới', h('div', { class: 'mb' },
    h('label', { class: 'lab' }, 'Tên thư mục'), inp, err,
    h('div', { class: 'mact' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Hủy'), create)));
  setTimeout(() => inp.focus(), 30);
}

function newFile() {
  const inp = h('input', { class: 'inp', type: 'text', placeholder: 'ghi-chu.txt', maxlength: '200', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', 'aria-label': 'Tên tệp' });
  const err = h('div', { class: 'errt', hidden: '' });
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };
  let busy = false;
  const submit = async () => {
    if (busy) return;
    const name = inp.value.trim();
    if (!name) return showErr('Tên tệp không được để trống');
    if (/[\/\\]/.test(name) || name === '.' || name === '..') return showErr('Tên không được chứa / hoặc \\');
    if (!canEdit(name)) return showErr('Đuôi tệp này không phải văn bản nên không soạn thảo được');
    busy = true;
    const path = join(cwd, name);
    closeModal();
    toast('Đang tạo tệp ' + name + '...', 120000);
    try {
      await api('PUT', '/api/upload' + q(path), '');
      listCache.clear();
      toast('Đã tạo tệp ' + name);
      notify('Đã tạo tệp "' + name + '"', 'ok');
    } catch (e) { fail(e.status === 409 || e.status === 422 ? 'Đã có tệp "' + name + '" trùng tên' : e.message); }
    refresh();
  };
  const create = h('button', { class: 'btn', onclick: submit }, 'Tạo');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') closeModal(); });
  openModal('Tệp mới', h('div', { class: 'mb' },
    h('label', { class: 'lab' }, 'Tên tệp (kèm đuôi, ví dụ ghi-chu.txt)'), inp, err,
    h('div', { class: 'mact' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Hủy'), create)));
  setTimeout(() => inp.focus(), 30);
}

async function download(p, name) {
  try {
    toast('Đang tải xuống ' + name + '...', 60000);
    const blob = await (await api('GET', '/api/download' + q(p))).blob();
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast('Đã tải xuống ' + name);
  } catch (e) { fail(e.message); }
}

const pendingTrash = new Set();
async function trashIt(p) {
  opsInFlight++;
  pendingTrash.add(p);
  document.querySelectorAll('.row[data-path]').forEach((r) => { if (r.dataset.path === p) r.remove(); });
  toast('Đang chuyển vào thùng rác...', 120000);
  try { await api('POST', '/api/trash' + q(p)); toast('Đã chuyển vào thùng rác'); notify('Đã chuyển \"' + p.split('/').pop() + '\" vào thùng rác', 'ok'); }
  catch (e) { fail(e.message); }
  await endOp();
}

function uploadOne(file, target, overwrite) {
  return new Promise((resolve) => {
    if (info.maxMb && file.size > info.maxMb * 1048576) {
      toast(`${file.name} lớn hơn ${info.maxMb} MB nên đã bị bỏ qua`);
      notify(`${file.name} lớn hơn ${info.maxMb} MB nên đã bị bỏ qua`, 'warn');
      return resolve(false);
    }
    const label = h('span', {}, file.nasShown || file.name);
    const bar = h('div');
    const box = h('div', { class: 'up' }, label, h('div', { class: 'prog' }, bar));
    $('uppanel').append(box);
    const done = (ok, text) => { if (!ok) notify(`Tải lên "${file.name}" thất bại: ${text}`, 'err'); label.textContent = (ok ? '✓ ' : '✗ ') + file.name + (text ? ' - ' + text : ''); setTimeout(() => box.remove(), ok ? 3000 : 8000); resolve(ok); };
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', '/api/upload' + q(join(target, file.name)) + (overwrite ? '&overwrite=1' : ''));
    xhr.setRequestHeader('Authorization', 'Bearer ' + pw);
    xhr.upload.onprogress = (e) => e.lengthComputable && (bar.style.width = (e.loaded / e.total) * 90 + '%');
    xhr.onload = () => {
      if (xhr.status === 200) { bar.style.width = '100%'; done(true); }
      else {
        let m = 'lỗi ' + xhr.status, exists = false;
        try { const j = JSON.parse(xhr.responseText); m = j.error; exists = !!j.exists; } catch (_) {}
        if (xhr.status === 409 && exists) {
          label.textContent = '… ' + file.name + ' - đã có tệp trùng tên';
          askConfirm('Tệp đã tồn tại', `"${file.name}" đã có trong ${addr(target)}.`, 'Ghi đè', { danger: true, note: 'Ghi đè sẽ thay tệp cũ bằng tệp bạn vừa chọn.' }).then((yes) => {
            if (yes) { box.remove(); return resolve(uploadOne(file, target, true)); }
            label.textContent = '– ' + file.name + ' - đã bỏ qua (trùng tên)';
            notify(`Đã bỏ qua "${file.name}" vì trùng tên`, 'warn');
            setTimeout(() => box.remove(), 4000);
            resolve(false);
          });
          return;
        }
        done(false, m);
      }
    };
    xhr.onerror = () => done(false, 'lỗi mạng');
    xhr.send(file);
  });
}
async function uploadMany(items, target0) {
  const target = target0 != null ? target0 : cwd;
  let ok = 0;
  for (const it of items) {
    const f = it instanceof File ? it : it.file, dir = it instanceof File ? '' : it.dir;
    if (dir) f.nasShown = join(dir, f.name);
    if (await uploadOne(f, dir ? join(target, dir) : target)) ok++;
  }
  if (ok) { const m = `Đã tải lên ${ok} tệp vào ${addr(target)}`; toast(m); notify(m, 'ok'); }
  refresh();
}
const SKIP_DIRS = new Set(['.git', 'node_modules', '.trash']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
const readAllEntries = async (dirEntry) => {
  const r = dirEntry.createReader(), all = [];
  for (;;) {
    const batch = await new Promise((res, rej) => r.readEntries(res, rej));
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
};
async function walkEntry(entry, dir, out) {
  if (entry.isFile) {
    if (SKIP_FILES.has(entry.name)) return;
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.files.push({ file, dir });
  } else if (entry.isDirectory) {
    if (SKIP_DIRS.has(entry.name)) { out.skipped.add(entry.name); return; }
    const sub = join(dir, entry.name), kids = await readAllEntries(entry);
    if (!kids.length) out.empty.push(sub);
    for (const k of kids) await walkEntry(k, sub, out);
  }
}
async function startFolderUpload(out, target) {
  if (out.skipped.size) { const m = 'Đã bỏ qua thư mục: ' + [...out.skipped].join(', '); toast(m); notify(m, 'warn'); }
  if (!out.files.length && !out.empty.length) return toast('Không có tệp nào để tải lên');
  if (out.files.length > 100 && !(await askConfirm('Tải lên nhiều tệp?', `Sẽ tải lên ${out.files.length} tệp. Mỗi tệp là một commit nên có thể mất khá lâu.`, 'Tiếp tục'))) return;
  for (const d of out.empty) { try { await api('POST', '/api/mkdir' + q(join(target, d))); } catch (e) { fail(e.message); } }
  if (out.files.length) await uploadMany(out.files, target); else refresh();
}
async function handleDropEntries(entries, target) {
  toast('Đang đọc thư mục...', 60000);
  const out = { files: [], empty: [], skipped: new Set() };
  try { for (const en of entries) await walkEntry(en, '', out); }
  catch (e) { return fail('Không đọc được thư mục: ' + (e && e.message || e)); }
  await startFolderUpload(out, target);
}
const dirInput = h('input', { type: 'file', multiple: '', webkitdirectory: '', directory: '', hidden: '' });
document.body.append(dirInput);
dirInput.onchange = () => {
  const fl = [...dirInput.files]; dirInput.value = '';
  if (!fl.length) return;
  const out = { files: [], empty: [], skipped: new Set() };
  for (const f of fl) {
    const segs = (f.webkitRelativePath || f.name).split('/'), name = segs.pop();
    const bad = segs.find((x) => SKIP_DIRS.has(x));
    if (bad) { out.skipped.add(bad); continue; }
    if (SKIP_FILES.has(name)) continue;
    out.files.push({ file: f, dir: segs.join('/') });
  }
  startFolderUpload(out, cwd);
};
const uploadMenu = (e) => {
  e.stopPropagation();
  openMenu(e.currentTarget, [
    { label: 'Tải tệp lên', run: () => $('file').click() },
    { label: 'Tải thư mục lên', run: () => dirInput.click() },
  ]);
};
$('file').onchange = (e) => { const fl = [...e.target.files]; e.target.value = ''; if (fl.length) uploadMany(fl); };

let dragDepth = 0;
const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
window.addEventListener('dragenter', (e) => { if (!hasFiles(e) || $('app').hidden || current === 'edit') return; e.preventDefault(); dragDepth++; $('veil').hidden = false; });
window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('veil').hidden = true; });
window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; $('veil').hidden = true;
  if ($('app').hidden || current === 'edit') return;
  const entries = [...(e.dataTransfer.items || [])]
    .filter((i) => i.kind === 'file')
    .map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null))
    .filter(Boolean);
  if (entries.length) return handleDropEntries(entries, cwd);
  const all = [...e.dataTransfer.files];
  const fl = all.filter((f) => f.type || f.size);
  const skipped = all.length - fl.length;
  if (skipped) { const m = `Đã bỏ qua ${skipped} mục (trình duyệt này không hỗ trợ kéo thả thư mục)`; toast(m); notify(m, 'warn'); }
  if (fl.length) uploadMany(fl);
});

let searchTimer = null;
function closeSearch() { $('results').hidden = true; }
$('q').addEventListener('input', () => {
  clearTimeout(searchTimer);
  const v = $('q').value.trim();
  if (!v) return closeSearch();
  searchTimer = setTimeout(async () => {
    try {
      const d = await apiJson('GET', '/api/search?q=' + encodeURIComponent(v));
      if ($('q').value.trim() === v) renderResults(d.items);
    } catch (e) { fail(e.message); }
  }, 250);
});
$('q').addEventListener('focus', () => { if ($('results').children.length && $('q').value.trim()) $('results').hidden = false; });
function renderResults(items) {
  const box = $('results'); box.replaceChildren();
  if (!items.length) box.append(h('div', { class: 'none' }, 'Không tìm thấy kết quả'));
  for (const it of items) {
    box.append(h('button', { onclick: () => { $('q').value = ''; openDir(it.type === 'dir' ? it.path : parentOf(it.path)); } },
      it.type === 'dir' ? folderTile() : tile(it.name),
      h('div', { class: 't' }, h('b', {}, it.name), h('small', {}, it.path))));
  }
  box.hidden = false;
}
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !$('app').hidden && current !== 'edit') { e.preventDefault(); $('q').focus(); }
  if (e.key === 'Escape') { closeMenu(); closeSearch(); closeModal(); closeNotif(); }
});

let modalEl = null;
function closeModal() { pvClean(); if (modalEl) { modalEl.remove(); modalEl = null; } }
function openModal(title, body, cls) {
  closeModal();
  setSide(false);
  modalEl = h('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === modalEl) closeModal(); } },
    h('div', { class: 'modal' + (cls ? ' ' + cls : '') },
      h('div', { class: 'mh' }, h('h3', {}, title), h('button', { class: 'icon-btn', title: 'Đóng', html: I('x'), onclick: closeModal })),
      body));
  document.body.append(modalEl);
}
const SS = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } },
};
const SKEY = 'nas_saves', DKEY = 'nas_drafts';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runningSaves = new Set();
let unloading = false;
window.addEventListener('pagehide', () => { unloading = true; });
window.addEventListener('pageshow', (e) => { if (e.persisted) unloading = false; });
const pendingSave = (p) => SS.get(SKEY, []).some((j) => j.path === p);
function enqueueSave(job) {
  const list = SS.get(SKEY, []).filter((j) => j.path !== job.path);
  list.push({ ...job, id: Date.now() + '-' + Math.random().toString(36).slice(2) });
  return SS.set(SKEY, list);
}
const dropJob = (id) => SS.set(SKEY, SS.get(SKEY, []).filter((j) => j.id !== id));
const setDraft = (p, d) => { const m = LS.get(DKEY, {}); if (d) m[p] = d; else delete m[p]; LS.set(DKEY, m); };
function resumeSaves() { for (const j of SS.get(SKEY, [])) runSave(j); }
async function runSave(j) {
  if (runningSaves.has(j.id)) return;
  runningSaves.add(j.id);
  toast('Đang lưu ' + j.name + '...', 120000);
  try {
    try { await api('PUT', '/api/save' + q(j.path) + '&base=' + encodeURIComponent(j.sha || ''), j.text); }
    catch (e) {
      if (e.status !== 409) throw e;
      let same = false;
      try { same = (await apiJson('GET', '/api/read' + q(j.path))).text === j.text; } catch (_) {}
      if (!same) throw e;
    }
    dropJob(j.id); setDraft(j.path, null);
    const m = `Đã lưu "${j.name}"`;
    toast(m); notify(m, 'ok'); refresh();
  } catch (e) {
    if (unloading) return;
    dropJob(j.id);
    const conflict = e.status === 409;
    setDraft(j.path, { text: j.text, sha: conflict ? '' : j.sha, error: conflict
      ? 'Tệp đã bị thay đổi ở nơi khác. Nhấn Lưu để ghi đè bằng nội dung này, hoặc Hủy để bỏ.'
      : `Chưa lưu được (${e.message}). Nội dung của bạn vẫn được giữ lại, hãy thử lưu lại.` });
    fail(`Lưu "${j.name}" thất bại: ${e.message}`);
    askConfirm('Lưu thất bại', `Lưu "${j.name}" thất bại: ${e.message}\n\nMở lại trình soạn thảo để thử lại?`, 'Mở lại').then((yes) => { if (yes) location.href = urlFor('edit', j.path); });
  } finally { runningSaves.delete(j.id); }
}

function openFile(it) {
  if (it.size > MAX_EDIT) return toast(`Không thể mở: tệp lớn hơn ${MAX_EDIT / 1048576} MB`);
  location.href = urlFor('edit', it.path);
}

let editDirty = null, leaving = false;
async function loadEditor() {
  const root = $('v-edit');
  const path = pathFromUrl();
  const name = path.split('/').pop() || 'Tệp';
  const back = urlFor('files', parentOf(path));
  const head = (extra) => h('div', { class: 'edhead' },
    h('a', { class: 'edback', href: back, title: 'Quay lại', 'aria-label': 'Quay lại', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' }),
    tile(name),
    h('div', { class: 'edtitle' }, h('b', {}, name), h('small', {}, addr(path))),
    extra);
  document.title = name + ' - My NAS';
  if (!path) { root.replaceChildren(head(), h('div', { class: 'card edcard' }, h('div', { class: 'empty' }, 'Thiếu đường dẫn tệp.'))); return; }
  root.replaceChildren(head(), h('div', { class: 'card edcard' }, h('div', { class: 'empty' }, 'Đang mở tệp...')));
  for (let i = 0; i < 120 && pendingSave(path); i++) await sleep(500);
  let d;
  try { d = await apiJson('GET', '/api/read' + q(path)); }
  catch (e) {
    fail(e.message);
    root.replaceChildren(head(), h('div', { class: 'card edcard' }, h('div', { class: 'empty' }, e.message)));
    return;
  }
  const dr = LS.get(DKEY, {})[path];
  if (dr) setDraft(path, null);
  renderEditor({ path, name, back, head, orig: d.text, text: dr ? dr.text : d.text, sha: dr ? dr.sha : d.sha, error: dr ? dr.error : '' });
}
function renderEditor(f) {
  const root = $('v-edit');
  const ta = h('textarea', { class: 'ed', spellcheck: 'false', autocapitalize: 'none', autocomplete: 'off', wrap: 'off', 'aria-label': 'Nội dung tệp' });
  ta.value = f.text;
  const err = h('div', { class: 'errt' });
  const showErr = (m) => { err.textContent = m || ''; err.hidden = !m; };
  showErr(f.error);
  const pos = h('span', { class: 'edpos' }), mark = h('span', { class: 'dirty' });
  const isDirty = () => ta.value !== f.orig;
  const upd = () => {
    const v = ta.value;
    const d = isDirty(); mark.classList.toggle('ok', !d);
    mark.innerHTML = d ? '<i class="dot"></i>Not saved' : '<i class="dot"></i>Saved';
    updPos();
  };
  const updPos = () => {
    const i = ta.selectionStart, before = ta.value.slice(0, i), ln = before.split('\n').length;
    pos.textContent = `Ln ${ln}, Col ${i - before.lastIndexOf('\n')}`;
  };
  const leave = () => {
    leaving = true;
    let done = false; const go = () => { if (!done) { done = true; location.replace(f.back); } };
    if (history.state && history.state.ed) { addEventListener('popstate', go, { once: true }); history.back(); setTimeout(go, 300); }
    else go();
  };
  const submit = () => {
    const text = ta.value;
    if (!isDirty()) return leave();
    if (new Blob([text]).size > MAX_EDIT) return showErr(`Nội dung lớn hơn ${MAX_EDIT / 1048576} MB nên không lưu được`);
    if (!enqueueSave({ path: f.path, name: f.name, text, sha: f.sha })) return showErr('Không thể lưu nền vì bộ nhớ trình duyệt đã đầy. Hãy thu nhỏ nội dung rồi thử lại.');
    leave();
  };
  const gutIn = h('div', { class: 'edgut-in' }), gut = h('div', { class: 'edgut', 'aria-hidden': 'true' }, gutIn);
  const hl = h('div', { class: 'edhl', 'aria-hidden': 'true' });
  const mirror = h('div', { class: 'ed edmirror', 'aria-hidden': 'true' });
  let heights = [], tops = [], curLine = -1, gutNums = [];
  const lineH = () => parseFloat(getComputedStyle(ta).lineHeight) || 24;
  const padTop = () => parseFloat(getComputedStyle(ta).paddingTop) || 0;
  const lineOf = () => { let n = 0; const v = ta.value, e = ta.selectionStart; for (let i = v.indexOf('\n'); i !== -1 && i < e; i = v.indexOf('\n', i + 1)) n++; return n; };
  const markCur = () => {
    const n = lineOf();
    if (gutNums[curLine]) gutNums[curLine].classList.remove('cur');
    curLine = n;
    if (gutNums[n]) gutNums[n].classList.add('cur');
    hl.style.top = (tops[n] || 0) + 'px';
    hl.style.height = (heights[n] || lineH()) + 'px';
    hl.hidden = ta.selectionStart !== ta.selectionEnd;
  };
  let layoutQ = 0;
  const layout = () => {
    layoutQ = 0;
    const lines = ta.value.split('\n'), lh = lineH(), pt = padTop();
    heights = new Array(lines.length).fill(lh);
    if (wrapOn) {
      mirror.style.width = ta.clientWidth + 'px';
      mirror.replaceChildren(...lines.map((t) => h('div', {}, t || '​')));
      for (let i = 0; i < lines.length; i++) heights[i] = mirror.children[i].offsetHeight || lh;
      mirror.replaceChildren();
    }
    tops = new Array(lines.length); let y = pt;
    for (let i = 0; i < lines.length; i++) { tops[i] = y; y += heights[i]; }
    gut.style.setProperty('--gw', String(lines.length).length + 'ch');
    gutIn.innerHTML = heights.map((hh, i) => `<div style="height:${hh}px">${i + 1}</div>`).join('');
    gutIn.style.paddingTop = pt + 'px';
    gutNums = [...gutIn.children]; curLine = -1;
    markCur(); sync();
  };
  const sync = () => { const t = 'translateY(' + (-ta.scrollTop) + 'px)'; gutIn.style.transform = t; hl.style.transform = t; selIn.style.transform = 'translate(' + (-ta.scrollLeft) + 'px,' + (-ta.scrollTop) + 'px)'; queueSel(); };
  const queueLayout = () => { if (!layoutQ) layoutQ = requestAnimationFrame(layout); queueSel(); };
  ta.addEventListener('scroll', sync, { passive: true });
  new ResizeObserver(queueLayout).observe(ta);

  const selTxt = h('div', { class: 'ed edseltxt' }), selRects = h('div', { class: 'edselrects' });
  const selIn = h('div', { class: 'edselin' }, selTxt, selRects), selBox = h('div', { class: 'edselbox', 'aria-hidden': 'true' }, selIn);
  let selVal = null, selQ = 0;
  const coarse = matchMedia('(pointer:coarse)').matches;
  const selRange = () => {
    const a = ta.selectionStart, b = ta.selectionEnd, node = selTxt.firstChild;
    if (a === b || !node) return null;
    const r = document.createRange(); r.setStart(node, a); r.setEnd(node, b); return r;
  };
  const drawSel = () => {
    selQ = 0;
    selTxt.classList.toggle('wrap', wrapOn);
    selTxt.style.width = wrapOn ? ta.clientWidth + 'px' : 'max-content';
    if (selVal !== ta.value) { selVal = ta.value; selTxt.textContent = selVal + '​'; }
    selRects.replaceChildren();
    const r = selRange(); if (!r) return;
    const base = selIn.getBoundingClientRect(), lh = lineH(), st = ta.scrollTop, vh = ta.clientHeight, out = [];
    for (const q of r.getClientRects()) {
      const y = q.top - base.top - (lh - q.height) / 2;
      if (y + lh < st || y > st + vh) continue;
      out.push(h('i', { class: 'edselr', style: `left:${q.left - base.left}px;top:${y}px;width:${Math.max(q.width, 6)}px;height:${lh}px` }));
    }
    selRects.replaceChildren(...out);
  };
  const queueSel = () => { if (!selQ) selQ = requestAnimationFrame(drawSel); };

  const btn = (label, fn) => h('button', { type: 'button', class: 'edtbb', onpointerdown: (e) => e.preventDefault(), onclick: fn }, label);
  const bCut = btn('Cắt', () => doCut()), bCopy = btn('Sao chép', () => doCopy()), bPaste = btn('Dán', () => doPaste()), bAll = btn('Chọn tất cả', () => doAll());
  const tb = h('div', { class: 'edtb', hidden: '', role: 'toolbar', 'aria-label': 'Công cụ soạn thảo' }, bCut, bCopy, bPaste, bAll);
  document.body.append(tb);
  const hideTb = () => { clearTimeout(tbT); tb.hidden = true; };
  let tbT = 0, tbAt = 0, pointerDown = false, lastTap = { pos: -1, t: 0 };
  const showTb = (pt) => {
    const has = ta.selectionStart !== ta.selectionEnd;
    bCut.hidden = bCopy.hidden = !has;
    tb.hidden = false; tbAt = Date.now();
    const tw = tb.offsetWidth, th = tb.offsetHeight, box = ta.getBoundingClientRect();
    let x, y;
    const r = selRange();
    if (r && !pt) {
      const rs = [...r.getClientRects()].filter((q) => q.height > 0), a = rs[0], z = rs[rs.length - 1];
      x = a.left;
      y = coarse ? z.bottom + 30 : a.top - th - 8;
      if (y < box.top + 4) y = Math.min(z.bottom + 10, box.bottom - th - 8);
    } else { x = pt.x; y = pt.y + 8; }
    x = Math.max(8, Math.min(x, innerWidth - tw - 8));
    y = Math.max(box.top + 4, Math.min(y, innerHeight - th - 8));
    tb.style.left = x + 'px'; tb.style.top = y + 'px';
  };
  const selText = () => ta.value.slice(ta.selectionStart, ta.selectionEnd);
  const writeClip = async (t) => {
    try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
    try { ta.focus(); return document.execCommand('copy'); } catch (_) { return false; }
  };
  const insert = (t) => {
    ta.focus();
    if (!document.execCommand('insertText', false, t)) { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
  };
  const doCopy = async () => { const t = selText(); hideTb(); if (!t) return; toast(await writeClip(t) ? 'Đã sao chép' : 'Không sao chép được'); };
  const doCut = async () => { const t = selText(); hideTb(); if (!t) return; if (await writeClip(t)) insert(''); else toast('Không cắt được'); };
  const doPaste = async () => {
    hideTb();
    try { insert(await navigator.clipboard.readText()); }
    catch (_) { fail('Không đọc được bộ nhớ tạm. Hãy cho phép trang này truy cập khi trình duyệt hỏi.'); }
  };
  const doAll = () => { ta.focus(); ta.select(); showTb(); };

  document.addEventListener('selectionchange', () => {
    if (document.activeElement !== ta) return;
    markCur(); queueSel(); clearTimeout(tbT);
    if (ta.selectionStart === ta.selectionEnd) { if (!tb.hidden && !pointerDown && Date.now() - tbAt > 600) hideTb(); return; }
    tbT = setTimeout(() => { if (!pointerDown && document.activeElement === ta) showTb(); }, 280);
  });
  ta.addEventListener('pointerdown', () => { pointerDown = true; hideTb(); });
  window.addEventListener('pointerup', (e) => {
    if (!pointerDown) return; pointerDown = false;
    setTimeout(() => {
      if (document.activeElement !== ta) return;
      if (ta.selectionStart !== ta.selectionEnd) return showTb();
      if (e.pointerType === 'touch') {
        const now = Date.now();
        if (lastTap.pos === ta.selectionStart && now - lastTap.t < 1500) { showTb({ x: e.clientX, y: e.clientY + 20 }); lastTap = { pos: -1, t: 0 }; }
        else lastTap = { pos: ta.selectionStart, t: now };
      }
    }, 0);
  });
  ta.addEventListener('contextmenu', (e) => { e.preventDefault(); showTb(ta.selectionStart !== ta.selectionEnd ? null : { x: e.clientX, y: e.clientY }); });
  ta.addEventListener('input', hideTb);
  ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta) hideTb(); }, 0));
  ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTb(); else if (!e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) hideTb(); });
  ta.addEventListener('scroll', () => { if (!tb.hidden) { hideTb(); tbT = setTimeout(() => { if (ta.selectionStart !== ta.selectionEnd) showTb(); }, 250); } }, { passive: true });
  ta.addEventListener('input', () => { upd(); queueLayout(); });
  for (const ev of ['keyup', 'click', 'select', 'focus']) ta.addEventListener(ev, updPos);
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); }
    else if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (!document.execCommand('insertText', false, '  ')) ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
      upd();
    }
  });
  let wrapOn = LS.get('edwrap', matchMedia('(max-width:700px)').matches);
  const wbtn = h('button', { class: 'edwrap', type: 'button', title: 'Tự xuống dòng', 'aria-label': 'Tự xuống dòng',
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><path d="M16 16l-2 2 2 2"/><path d="M3 18h7"/></svg>' });
  const applyWrap = () => {
    ta.classList.toggle('wrap', wrapOn); mirror.classList.toggle('wrap', wrapOn); ta.setAttribute('wrap', wrapOn ? 'soft' : 'off');
    wbtn.classList.toggle('on', wrapOn); wbtn.setAttribute('aria-pressed', wrapOn ? 'true' : 'false');
    queueLayout();
  };
  wbtn.onclick = () => { wrapOn = !wrapOn; LS.set('edwrap', wrapOn); applyWrap(); };
  applyWrap();
  let dlg = null;
  const closeDlg = () => { if (dlg) { dlg.remove(); dlg = null; ta.focus({ preventScroll: true }); } };
  const askLeave = (go) => {
    if (dlg) return;
    const pick = (fn) => () => { if (dlg) { dlg.remove(); dlg = null; } fn(); };
    dlg = h('div', { class: 'eddlg-wrap', onpointerdown: (e) => { if (e.target === dlg) closeDlg(); } },
      h('div', { class: 'eddlg', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'eddlg-t' },
        h('div', { class: 'eddlg-ic', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>' }),
        h('h3', { id: 'eddlg-t' }, 'Thoát mà chưa lưu?'),
        h('p', {}, `Bạn đã chỉnh sửa "${f.name}" nhưng chưa lưu. Nếu thoát bây giờ, các thay đổi sẽ bị mất.`),
        h('div', { class: 'eddlg-act' },
          h('button', { class: 'edbtn primary', type: 'button', onclick: closeDlg }, 'Tiếp tục chỉnh sửa'),
          h('button', { class: 'edbtn danger', type: 'button', onclick: pick(go) }, 'Thoát không lưu'))));
    document.body.append(dlg);
    dlg.querySelector('.primary').focus({ preventScroll: true });
  };
  const guard = (go) => { if (isDirty()) askLeave(go); else go(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dlg) { e.preventDefault(); closeDlg(); } });
  history.pushState({ ed: 1 }, '');
  window.addEventListener('popstate', () => {
    if (leaving) return;
    if (isDirty()) { history.pushState({ ed: 1 }, ''); askLeave(leave); }
    else { leaving = true; history.back(); }
  });
  editDirty = isDirty;
  root.replaceChildren(
    f.head(h('div', { class: 'edact' },
      h('button', { class: 'edbtn ghost', onclick: () => guard(leave) }, 'Hủy'),
      h('button', { class: 'edbtn primary', onclick: submit, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg><span>Lưu</span>' }))),
    h('div', { class: 'card edcard' }, h('div', { class: 'edbody' }, gut, h('div', { class: 'edscroll' }, hl, selBox, ta), mirror), err,
      h('div', { class: 'edfoot' }, h('div', { class: 'edmeta' }, pos, mark), wbtn)));
  root.querySelector('.edback').addEventListener('click', (e) => { if (isDirty()) { e.preventDefault(); askLeave(leave); } else leaving = true; });
  upd();
  if (matchMedia('(hover:hover)').matches) { ta.focus(); ta.setSelectionRange(0, 0); }
}

function applyRename(it, name) {
  const parent = parentOf(it.path), old = it.name;
  const items = listCache.get(parent);
  if (items) {
    const next = items.map((x) => (x.name === old ? { ...x, name } : x))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    listCache.set(parent, next);
    if (current === 'files' && cwd === parent) renderFiles(next);
    return () => { listCache.set(parent, items); if (current === 'files' && cwd === parent) renderFiles(items); };
  }
  const row = [...document.querySelectorAll('.row[data-path]')].find((r) => r.dataset.path === it.path);
  const b = row && row.querySelector('.nm b');
  if (b) b.textContent = name;
  return () => { if (b) b.textContent = old; };
}
function renameItem(it) {
  const inp = h('input', { class: 'inp', type: 'text', value: it.name, maxlength: '200', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', 'aria-label': 'Tên mới' });
  const err = h('div', { class: 'errt', hidden: '' });
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };
  const submit = () => {
    const name = inp.value.trim();
    if (!name) return showErr('Tên không được để trống');
    if (/[\/\\]/.test(name) || name === '.' || name === '..') return showErr('Tên không được chứa / hoặc \\');
    if (name === it.name) return closeModal();
    closeModal();
    const undo = applyRename(it, name);
    toast('Đang lưu...', 120000);
    api('POST', '/api/rename' + q(it.path) + '&name=' + encodeURIComponent(name))
      .then(() => {
        const m = `Đã đổi tên "${it.name}" thành "${name}"`;
        toast(m); notify(m, 'ok');
        refresh();
      })
      .catch((e) => { undo(); fail(e.message); });
  };
  const save = h('button', { class: 'btn', onclick: submit }, 'Lưu');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') closeModal(); });
  openModal(it.type === 'dir' ? 'Đổi tên thư mục' : 'Đổi tên tệp', h('div', { class: 'mb' },
    h('label', { class: 'lab' }, 'Tên mới'), inp, err,
    h('div', { class: 'mact' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Hủy'), save)));
  setTimeout(() => {
    inp.focus();
    const dot = it.type === 'dir' ? -1 : it.name.lastIndexOf('.');
    inp.setSelectionRange(0, dot > 0 ? dot : it.name.length);
  }, 30);
}
function showAbout() {
  openModal('Giới thiệu', h('div', { class: 'mb' },
    h('p', {}, `My NAS lưu tệp của bạn trong kho GitHub ${info.repo} (nhánh ${info.branch}, thư mục ${info.folder}/). Mỗi lần tải lên, di chuyển, xóa hoặc khôi phục đều là một commit, nên GitHub lưu đầy đủ lịch sử thay đổi.`),
    h('p', {}, 'Phù hợp cho tài liệu, ảnh và bản sao lưu nhỏ. Không phù hợp với video hoặc dữ liệu nhiều GB.'),
    h('p', {}, 'Được tạo bởi ', h('b', {}, info.author || info.owner), '.')));
}
function showHelp() {
  openModal('Trợ giúp', h('div', { class: 'mb' }, h('ul', {},
    h('li', {}, `Kéo tệp từ máy tính thả vào bất kỳ đâu trên trang để tải lên (tối đa ${info.maxMb} MB mỗi tệp). Kéo thả cả thư mục cũng được: giữ nguyên cấu trúc, bỏ qua .git và node_modules (mỗi tệp là một commit nên thư mục nhiều tệp sẽ tải lâu).`),
    h('li', {}, 'Nút Thư mục và Tệp ở trang Storage để tạo mới. Tệp mới được mở ngay trong trình soạn thảo.'),
    h('li', {}, 'Bấm vào ảnh hoặc PDF để xem trước ngay trong trang. Dùng phím ← → để chuyển giữa các ảnh trong thư mục.'),
    h('li', {}, 'Để di chuyển, kéo một tệp hoặc thư mục trong danh sách rồi thả lên một thư mục (hoặc lên thanh đường dẫn phía trên danh sách).'),
    h('li', {}, 'Nhấn Ctrl + K để tìm theo tên trong toàn bộ kho lưu trữ.'),
    h('li', {}, 'Nút ⋮ cạnh mỗi tệp: mở / chỉnh sửa, tải xuống, đổi tên, chuyển vào thùng rác.'),
    h('li', {}, 'Chỉnh sửa tệp văn bản (tối đa 1 MB): bấm Lưu hoặc Ctrl + S, hộp soạn thảo đóng ngay và việc lưu lên GitHub chạy nền. Nếu lưu lỗi, nội dung của bạn được mở lại để thử lại.'),
    h('li', {}, 'Các mục trong thùng rác có thể khôi phục. "Xóa vĩnh viễn" chỉ gỡ tệp khỏi nhánh; bản cũ vẫn nằm trong lịch sử Git nên dung lượng kho không giảm.'))));
}

async function loadTrash() {
  try {
    const d = await apiJson('GET', '/api/trash');
    if (current === 'trash') renderTrash(d.items, d.days);
  } catch (e) { fail(e.message); }
}
function renderTrash(items, days) {
  trashDays = days;
  items = pendingAllPurge ? [] : items.filter((it) => !pendingPurge.has(it.path));
  const rows = items.map((it) => {
    const dir = parentOf(it.path);
    const isDir = it.type === 'dir';
    let when = '';
    if (it.deleted) {
      when = 'Xóa ' + new Date(it.deleted).toLocaleDateString('vi-VN');
      if (days > 0) { const left = Math.max(0, Math.ceil((it.deleted + days * 86400000 - Date.now()) / 86400000)); when += ' · còn ' + left + ' ngày'; }
    }
    const sub = [isDir ? (it.count ? it.count + ' tệp' : 'Thư mục trống') : '', dir, when].filter(Boolean).join(' · ');
    return h('div', { class: 'row' }, isDir ? folderTile() : tile(it.name),
      h('div', { class: 'nm' }, h('b', {}, it.name), sub ? h('small', {}, sub) : null),
      h('div', { class: 'sz' }, isDir && !it.size ? '' : fmtSize(it.size)),
      h('button', { class: 'btn ghost sm', html: I('restore') + ' Khôi phục', onclick: (e) => restoreOne(it.path, e.currentTarget.closest('.row')) }),
      h('button', { class: 'icon-btn red', title: 'Xóa vĩnh viễn', html: I('trash'), onclick: (e) => purgeOne(it, e.currentTarget.closest('.row')) }));
  });
  $('v-trash').replaceChildren(
    h('div', { class: 'vh' }, h('h2', {}, 'Thùng rác'), h('div', { class: 'sp' }),
      h('button', { class: 'btn danger', disabled: items.length ? null : '', onclick: purgeAll }, 'Dọn thùng rác')),
    h('p', { class: 'note' }, 'Tệp trong thùng rác vẫn chiếm dung lượng kho' + (days > 0 ? ', và sẽ tự xóa vĩnh viễn sau ' + days + ' ngày' : '') + '. Xóa vĩnh viễn chỉ gỡ chúng khỏi nhánh; bản cũ vẫn nằm trong lịch sử Git.'),
    h('div', { class: 'card' }, rows.length ? h('div', { class: 'rows' }, rows) : h('div', { class: 'empty' }, 'Thùng rác trống')));
}
function askConflict(msg) {
  return new Promise((resolve) => {
    let done = false;
    const pick = (v) => { done = true; closeModal(); resolve(v); };
    openModal('Tệp đã tồn tại', h('div', { class: 'mb' },
      h('p', {}, msg),
      h('p', { style: 'font-size:13px' }, h('b', {}, 'Ghi đè'), ': thay tệp hiện có bằng bản trong thùng rác. ', h('b', {}, 'Đổi tên'), ': giữ cả hai, bản khôi phục thành \"file (1).ext\".'),
      h('div', { class: 'mact' },
        h('button', { class: 'btn ghost', onclick: () => pick(null) }, 'Hủy'),
        h('button', { class: 'btn ghost', onclick: () => pick('rename') }, 'Đổi tên'),
        h('button', { class: 'btn', style: 'background:#d33;color:#fff', onclick: () => pick('overwrite') }, 'Ghi đè'))));
    const t = setInterval(() => { if (!modalEl) { clearInterval(t); if (!done) resolve(null); } }, 200);
  });
}
async function restoreOne(p, row) {
  opsInFlight++;
  pendingPurge.add(p);
  if (row) row.style.display = 'none';
  toast('Đang khôi phục...', 120000);
  try {
    let mode = '';
    try {
      await api('POST', '/api/restore' + q(p));
    } catch (e) {
      if (e.status !== 409) throw e;
      if (row) row.style.display = '';
      pendingPurge.delete(p);
      toast('Đã có tệp trùng tên', 1500);
      mode = await askConflict(e.message);
      if (!mode) { toast('Đã hủy khôi phục'); return await endOp(); }
      pendingPurge.add(p);
      if (row) row.style.display = 'none';
      toast(mode === 'overwrite' ? 'Đang ghi đè...' : 'Đang khôi phục bản sao...', 120000);
      await api('POST', '/api/restore' + q(p) + '&conflict=' + mode);
    }
    toast('Đã khôi phục ' + p); notify('Đã khôi phục \"' + p.split('/').pop() + '\"' + (mode === 'overwrite' ? ' (ghi đè)' : mode === 'rename' ? ' (đổi tên)' : ''), 'ok');
  } catch (e) { fail(e.message); }
  await endOp();
}
function askConfirm(title, msg, okText, opt) {
  opt = opt || {};
  return new Promise((resolve) => {
    let done = false;
    const pick = (v) => { done = true; closeModal(); resolve(v); };
    const cancel = h('button', { class: 'btn ghost', onclick: () => pick(false) }, opt.cancelText || 'Hủy');
    cancel.addEventListener('keydown', (e) => { if (e.key === 'Escape') pick(false); });
    const ok = h('button', { class: 'btn', onclick: () => pick(true) }, okText || 'Đồng ý');
    if (opt.danger) ok.style.cssText = 'background:#d33;color:#fff';
    openModal(title, h('div', { class: 'mb' },
      h('p', { style: 'white-space:pre-line' }, msg),
      opt.note ? h('p', { style: 'font-size:13px' }, opt.note) : null,
      h('div', { class: 'mact' }, cancel, ok)));
    setTimeout(() => cancel.focus(), 30);
    const t = setInterval(() => { if (!modalEl) { clearInterval(t); if (!done) resolve(false); } }, 200);
  });
}
const askPurge = (title, msg) => askConfirm(title, msg, 'Xóa vĩnh viễn', { danger: true, note: 'Tệp sẽ bị gỡ khỏi thùng rác và không thể khôi phục từ giao diện này.' });
const pendingPurge = new Set();
async function purgeOne(it, row) {
  if (!(await askPurge(it.type === 'dir' ? 'Xóa vĩnh viễn thư mục?' : 'Xóa vĩnh viễn tệp?', 'Xóa vĩnh viễn "' + it.path + '"' + (it.type === 'dir' && it.count ? ' cùng ' + it.count + ' tệp bên trong' : '') + '?'))) return;
  opsInFlight++;
  pendingPurge.add(it.path);
  if (row) row.remove();
  toast('Đang xóa vĩnh viễn...', 120000);
  try { await api('DELETE', '/api/trash' + q(it.path)); toast('Đã xóa vĩnh viễn'); notify('Đã xóa vĩnh viễn "' + it.name + '"', 'ok'); } catch (e) { fail(e.message); }
  await endOp();
}
let pendingAllPurge = false, trashDays = 0;
async function purgeAll() {
  if (!(await askPurge('Dọn sạch thùng rác?', 'Xóa vĩnh viễn toàn bộ tệp và thư mục trong thùng rác?'))) return;
  opsInFlight++;
  pendingAllPurge = true;
  renderTrash([], trashDays);
  toast('Đang dọn thùng rác...', 120000);
  try { const d = await apiJson('DELETE', '/api/trash' + q('')); toast(d.deleted ? 'Đã dọn thùng rác' : 'Thùng rác đã trống'); if (d.deleted) notify('Đã dọn thùng rác', 'ok'); } catch (e) { fail(e.message); }
  await endOp();
}

function renderSettings() {
  const themeBtn = (t, label, ic) => h('button', { class: 'btn ghost', 'data-theme-btn': t, html: I(ic) + ' ' + label, onclick: () => setTheme(t) });
  $('v-settings').replaceChildren(
    h('div', { class: 'vh' }, h('h2', {}, 'Cài đặt')),
    h('div', { class: 'stackv' },
      h('div', { class: 'card' }, h('h3', {}, 'Giao diện'), h('div', { class: 'setrow' }, themeBtn('dark', 'Tối', 'moon'), themeBtn('light', 'Sáng', 'sun'))),
      h('div', { class: 'card' }, h('h3', {}, 'Lưu trữ'),
        h('dl', { class: 'kv' },
          h('dt', {}, 'Tài khoản GitHub'), h('dd', {}, info.owner),
          h('dt', {}, 'Kho (repo)'), h('dd', {}, info.repo),
          h('dt', {}, 'Nhánh'), h('dd', {}, info.branch),
          h('dt', {}, 'Thư mục gốc'), h('dd', {}, info.folder + '/'),
          h('dt', {}, 'Tải lên tối đa'), h('dd', {}, info.maxMb + ' MB mỗi tệp'),
          h('dt', {}, 'Ngưỡng dung lượng'), h('dd', {}, info.limitGb + ' GB (chặn tải lên khi vượt)')),
        h('p', { class: 'note', style: 'margin:12px 0 0' }, 'Tên người dùng lấy từ tên GitHub của token. Các giá trị này được đặt trong file .env trên máy chủ.')),
      h('div', { class: 'card' }, h('h3', {}, 'Phiên đăng nhập'),
        h('button', { class: 'btn danger', html: I('logout') + ' Đăng xuất', onclick: logout }))));
  setTheme(LS.get('theme', 'dark'));
}

setTheme(LS.get('theme', 'dark'));
start();
})();
