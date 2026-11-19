/* X3 DATA · piezas de interfaz para los módulos: menú de botones grandes y botón de volver */
(function () {
  'use strict';
  const H = window.X3H; if (!H) return;
  H.padre = {};
  // tiles: [{k: vista destino, ic: emoji, t: título, d: una línea, bd: insignia, bc: 'w'|'b'}]
  H.hub = (titulo, sub, tiles, extra) => '<h1>' + titulo + '</h1><p class="sub">' + sub + '</p><div class="tiles">' +
    tiles.map((x) => '<button class="tile" onclick="location.hash=\'' + x.k + '\'"><div class="ic">' + x.ic + '</div><div><b>' + x.t + '</b><span>' + x.d + '</span>' + (x.bd ? '<div><span class="bd ' + (x.bc || '') + '">' + x.bd + '</span></div>' : '') + '</div></button>').join('') + '</div>' + (extra || '');
  H.back = (k, label) => '<button class="back" onclick="location.hash=\'' + k + '\'">← ' + label + '</button>';
  H.sub = (padre, hijos) => hijos.forEach((h) => (H.padre[h] = padre));
  // una sola entrada por módulo en el menú, dentro del grupo "Módulos"
  H.navMod = (k, label, mod) => { let g = H.NAV.find((x) => x[0] === 'Módulos'); if (!g) { g = ['Módulos', []]; H.NAV.splice(H.NAV.findIndex((x) => x[0] === 'Costos'), 0, g); } g[1].push([k, label, mod]); };
})();
