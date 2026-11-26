(function (w) {
'use strict';
const P = (d, extra) => '<path d="' + d + '"' + (extra ? ' ' + extra : '') + '/>';

const ICONS = {

  home: ['f', P('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z')],
  folder: ['f', P('M2.5 18V6.5a2 2 0 0 1 2-2h4.2l2 2H18a2 2 0 0 1 2 2v1.4H7a2.2 2.2 0 0 0-2.1 1.6z', 'opacity=".55"') +
                P('M3 19.5 5.6 11.2a1.6 1.6 0 0 1 1.5-1.1h14.2a1 1 0 0 1 1 1.3l-2.3 7.3a1.6 1.6 0 0 1-1.5 1.1z')],
  trash: ['s', P('M4 7h16') + P('M9 7V4h6v3') + P('M6 7l1 13h10l1-13') + P('M10 11v6M14 11v6')],
  settings: ['f', P('M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z')],
  info: ['f', P('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z')],
  help: ['f', P('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z')],
  logout: ['f', P('M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z')],
  chevron: ['s', P('M6 9l6 6 6-6')],

  bell: ['f', P('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1z')],
  sun: ['s', '<circle cx="12" cy="12" r="4"/>' + P('M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8')],
  moon: ['f', P('M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z')],
  menu: ['s', P('M4 7h16M4 12h16M4 17h16')],

  database: ['f', '<ellipse cx="12" cy="6" rx="8" ry="3"/>' +
                  P('M4 8.6c0 1.66 3.58 3 8 3s8-1.34 8-3V12c0 1.66-3.58 3-8 3s-8-1.34-8-3z') +
                  P('M4 14.6c0 1.66 3.58 3 8 3s8-1.34 8-3V18c0 1.66-3.58 3-8 3s-8-1.34-8-3z')],
  zap: ['f', P('M7 2v11h3v9l7-12h-4l4-8z')],
  pulse: ['s', P('M3 12h4l3-8 4 16 3-8h4')],
  folderY: ['c', P('M2 6.5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z', 'fill="#f0a020"') +
                 P('M2 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z', 'fill="#ffc247"')],
  recent: ['c', '<circle cx="12" cy="12" r="9.5" fill="#e3ebfb"/>' + P('M12 12V2.5A9.5 9.5 0 0 1 21.5 12z', 'fill="#2f6bff"') + P('M12 12 5.3 18.7A9.5 9.5 0 0 1 2.5 12z', 'fill="#8fb4ff"')],

  qaFolder: ['c', P('M3 8a3 3 0 0 1 3-3h6.5l3 3H26a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'fill="#2f7bff"') +
                  P('M3 13a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'fill="#55b6ff"'), '0 0 32 32'],
  qaPlus: ['c', '<rect x="3" y="3" width="26" height="26" rx="6.5" fill="#7a5cff"/>' + P('M16 9.5v13M9.5 16h13', 'stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"'), '0 0 32 32'],
  qaTrash: ['c', P('M12 4.5h8V8h-8z', 'fill="#f59e0b"') + '<rect x="5" y="7.5" width="22" height="3.6" rx="1.6" fill="#ffb02e"/>' +
                 P('M8 12.5h16l-1.2 14.4a2 2 0 0 1-2 1.8H11.2a2 2 0 0 1-2-1.8z', 'fill="#f59e0b"') +
                 P('M13 16v9M16 16v9M19 16v9', 'stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" fill="none"'), '0 0 32 32'],

  cpu: ['s', '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" fill="currentColor"/>' + P('M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3')],
  ram: ['s', '<rect x="3" y="8" width="18" height="8" rx="1.5"/>' + P('M7 16v3M12 16v3M17 16v3M7 11v2M12 11v2M17 11v2')],
  clock: ['s', '<circle cx="12" cy="12" r="9"/>' + P('M12 7v5l3 2')],
  cloudup: ['s', P('M7 18a4.5 4.5 0 0 1-.6-8.97A6 6 0 0 1 18 10a4 4 0 0 1 0 8z') + P('M12 16v-6M9.5 12.5 12 10l2.5 2.5')],

  plus: ['s', P('M12 5v14M5 12h14')],
  kebab: ['s', '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>'],
  download: ['s', P('M12 4v11M7 11l5 5 5-5M5 20h14')],
  restore: ['s', P('M4 12a8 8 0 1 0 3-6.2') + P('M4 4v4h4')],
  upload: ['s', P('M12 16V4M7 9l5-5 5 5M5 20h14')],
  x: ['s', P('M6 6l12 12M18 6 6 18')],
};

function I(name, cls) {
  const [type, body, vb] = ICONS[name];
  const attrs = type === 's' ? ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
              : type === 'f' ? ' fill="currentColor"' : '';
  return '<svg class="ic ic-' + name + (cls ? ' ' + cls : '') + '" width="' + (cls === 'big' ? 48 : 24) + '" height="' + (cls === 'big' ? 48 : 24) + '" viewBox="' + (vb || '0 0 24 24') + '"' + attrs + ' aria-hidden="true">' + body + '</svg>';
}

const FOLDER = '<svg viewBox="0 0 64 50" aria-hidden="true">' +
  P('M4 8a4 4 0 0 1 4-4h14l6 6h28a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z', 'fill="#e0902a"') +
  P('M4 18a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z', 'fill="url(#gFolder)"') + '</svg>';

const PAGE = (fill) => P('M9 3h15l9 9v22a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z', 'fill="' + fill + '"') +
                       P('M9 3.5h14.8l8.7 8.7V34a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 34V6A2.5 2.5 0 0 1 9 3.5z', 'fill="none" stroke="#fff" stroke-opacity=".28"') +
                       P('M24 3v6a3 3 0 0 0 3 3h6z', 'fill="#fff" fill-opacity=".45"');
const LINE = 'stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const THIN = 'stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const FILE = {
  pdf:   ['url(#gRed)',    '#b91c1c', P('M12 15.500h15M12 20h15M12 24.500h8', LINE)],
  doc:   ['url(#gBlue)',   '#1d4ed8', P('M12 15.500h15M12 20h15M12 24.500h8', LINE)],
  text:  ['url(#gGray)',   '#475569', P('M12 16h15M12 20.500h10M12 25h13', LINE)],
  ppt:   ['url(#gOrange)', '#c2410c', '<circle cx="19.500" cy="19.500" r="5.500" ' + THIN + '/>' + P('M19.500 19.500V14a5.500 5.500 0 0 1 5.500 5.500z', 'fill="#fff"')],
  sheet: ['url(#gGreen)',  '#15803d', '<rect x="12" y="14" width="15" height="11" rx="2" ' + THIN + '/>' + P('M12 19.500h15M19.500 14v11', THIN)],
  image: ['url(#gRose)',   '#be123c', '<circle cx="24.500" cy="17" r="2.100" fill="#fff"/>' + P('M10.500 25l5.500-7.500 4 5 2.500-3 5.500 5.500z', 'fill="#fff"')],
  video: ['url(#gViolet)', '#4338ca', '<rect x="11" y="14.500" width="11.500" height="10" rx="2.500" fill="#fff"/>' + P('M24.500 17.800l4.500-2.600v9.600l-4.500-2.600z', 'fill="#fff"')],
  audio: ['url(#gTeal)',   '#0f766e', P('M17.500 23V15.500l8-1.800V21.500', LINE) + '<circle cx="15" cy="23.500" r="2.500" fill="#fff"/><circle cx="23" cy="22" r="2.500" fill="#fff"/>'],
  zip:   ['url(#gAmber)',  '#b45309', '<g fill="#fff"><rect x="18" y="13.500" width="3.200" height="2.200" rx=".6"/><rect x="18" y="16.800" width="3.200" height="2.200" rx=".6"/><rect x="18" y="20.100" width="3.200" height="2.200" rx=".6"/></g><rect x="17" y="23" width="5.200" height="3" rx="1.300" ' + THIN + '/>'],
  code:  ['url(#gSlate)',  '#1e293b', P('M16.500 16l-4.500 4.200 4.500 4.200M23 16l4.500 4.200-4.500 4.200', LINE)],
  file:  ['url(#gGray)',   '#374151', P('M12 16h15M12 20.500h15', LINE)],
};
function fileIcon(kind, ext) {
  const f = FILE[kind] || FILE.file;
  let tag = '';
  const label = (ext || '').toUpperCase().slice(0, 4);
  if (label) {
    const w = Math.max(14, label.length * 4.800 + 6), x = 2.500;
    tag = '<rect x="' + x + '" y="27" width="' + w + '" height="9.500" rx="2.800" fill="' + f[1] + '" style="stroke:var(--panel,#111a30);stroke-width:1.2"/>' +
          '<text x="' + (x + w / 2) + '" y="33.800" text-anchor="middle" font-size="6" font-weight="800" fill="#fff" letter-spacing=".3" ' +
          'font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif">' + label.replace(/[<>&"]/g, '') + '</text>';
  }
  return '<svg viewBox="0 0 40 40" aria-hidden="true">' + PAGE(f[0]) + f[2] + tag + '</svg>';
}

w.NAS = { I, FOLDER, fileIcon };
})(window);
