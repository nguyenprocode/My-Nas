(() => {
'use strict';
const $ = (id) => document.getElementById(id);

async function readError(res) {
  let msg = 'Lỗi ' + res.status;
  try { msg = (await res.json()).error || msg; } catch (_) {}
  return new Error(msg);
}

async function login(username, password) {
  let res;
  try {
    res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  } catch (_) { throw new Error('Không thể kết nối tới máy chủ'); }
  if (!res.ok) throw await readError(res);
  return (await res.json()).session;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('loginBtn');
  $('lerr').textContent = '';
  btn.disabled = true;
  try {
    const session = await login($('user').value.trim(), $('pw').value);
    sessionStorage.setItem('session', session);
    location.replace('/');
  } catch (err) {
    $('lerr').textContent = err.message;
    btn.disabled = false;
    $('pw').select();
  }
});

const eye = $('eye'), pw = $('pw');
if (eye && pw) {
  eye.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    eye.classList.toggle('on', show);
    eye.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    pw.focus();
  });
}

const saved = sessionStorage.getItem('session');
if (saved) {
  fetch('/api/ping', { headers: { Authorization: 'Bearer ' + saved } })
    .then((r) => { if (r.ok) location.replace('/'); else sessionStorage.removeItem('session'); })
    .catch(() => {});
}
})();
