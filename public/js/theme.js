try {
  var t = JSON.parse(localStorage.getItem('theme'));
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
} catch (_) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
