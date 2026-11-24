/* X3 DATA · piezas de interfaz para los módulos: menú de botones grandes y botón de volver */
(function () {
  'use strict';
  const H = window.X3H; if (!H) return;
  H.padre = {};
  /* ---------- monto en letras ---------- */
  const U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function m999(n) { if (n === 100) return 'CIEN'; const c = Math.floor(n / 100), r = n % 100; let t = C[c]; if (r) { const s = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : ''); t = (t ? t + ' ' : '') + s; } return t; }
  function letras(n) {
    n = Math.floor(n); if (n === 0) return 'CERO'; let out = [];
    const mm = Math.floor(n / 1e6), mil = Math.floor((n % 1e6) / 1000), r = n % 1000;
    if (mm) out.push(mm === 1 ? 'UN MILLÓN' : m999(mm) + ' MILLONES'); if (mil) out.push(mil === 1 ? 'UN MIL' : m999(mil) + ' MIL'); if (r) out.push(m999(r));
    return out.join(' ');
  }
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  H.letras = (v, moneda) => { const e = Math.floor(r2(v) + 1e-9), c = Math.round((r2(v) - e) * 100); return 'SON: ' + letras(e) + ' ' + (moneda || 'BOLÍVARES') + ' CON ' + String(c).padStart(2, '0') + '/100'; };


  // tiles: [{k: vista destino, ic: emoji, t: título, d: una línea, bd: insignia, bc: 'w'|'b'}]
  // íconos de línea (Tabler, manual de marca): los módulos siguen pasando un emoji y aquí se traduce
  const ICO = {'🧮':'calculator','🏖️':'beach','🎁':'gift','💼':'briefcase','🧾':'receipt','👥':'users','⚙️':'settings','🥣':'tools-kitchen-2','🚚':'truck','🖨️':'printer','🏪':'building-store','💵':'cash','📐':'ruler-2','📷':'camera','🔢':'numbers','🏷️':'tag','📒':'notebook','🛒':'shopping-cart','✅':'circle-check'};
  H.ico = (e) => (ICO[e] ? '<i class="ti ti-' + ICO[e] + '" aria-hidden="true"></i>' : (/^[a-z0-9-]+$/.test(e || '') ? '<i class="ti ti-' + e + '" aria-hidden="true"></i>' : ''));
  H.hub = (titulo, sub, tiles, extra) => '<h1>' + titulo + '</h1><p class="sub">' + sub + '</p><div class="tiles">' +
    tiles.map((x) => '<button class="tile' + (x.cls ? ' ' + x.cls : '') + '" onclick="location.hash=\'' + x.k + '\'"><div class="ic">' + H.ico(x.ic) + '</div><div><b>' + x.t + '</b><span>' + x.d + '</span>' + (x.bd ? '<div><span class="bd ' + (x.bc || '') + '">' + x.bd + '</span></div>' : '') + '</div></button>').join('') + '</div>' + (extra || '');
  H.back = (k, label) => '<button class="back" onclick="location.hash=\'' + k + '\'">← ' + label + '</button>';
  H.sub = (padre, hijos) => hijos.forEach((h) => (H.padre[h] = padre));
  // una sola entrada por módulo en el menú, dentro del grupo "Módulos"
  H.navMod = (k, label, mod) => { let g = H.NAV.find((x) => x[0] === 'Módulos'); if (!g) { g = ['Módulos', []]; H.NAV.splice(H.NAV.findIndex((x) => x[0] === 'Costos'), 0, g); } g[1].push([k, label, mod]); };
})();
