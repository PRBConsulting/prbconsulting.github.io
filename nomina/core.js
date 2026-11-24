/* Nómina · PRB Consulting — núcleo mínimo de la app independiente.
   Usa el mismo módulo de nómina de X3 DATA (../x3/mod-nomina.js): una sola fuente de cálculo para las dos apps.
   Datos en el navegador del visitante (localStorage). Datos ficticios. */
(function () {
  'use strict';
  const KEY = 'prb-nomina-v1';
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hoy = () => isoDay(new Date());
  const addDays = (iso, k) => { const d = new Date(iso.slice(0, 10) + 'T12:00'); d.setDate(d.getDate() + k); return isoDay(d); };
  const diasEntre = (a, b) => Math.round((new Date(b.slice(0, 10) + 'T12:00') - new Date(a.slice(0, 10) + 'T12:00')) / 864e5);
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  const nf2 = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => { let s = String(v ?? '').trim(); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isFinite(x) ? x : NaN; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fdia = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const usd = (v) => '$' + nf2.format(r2(v));
  const qty = (v) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(v);
  const pct = (v) => (Math.round(v * 1000) / 10).toString().replace('.', ',') + '%';
  function toast(msg, err) { if (window.PRBok) return window.PRBok(msg, err); const t = $('toast'); if (t) t.textContent = msg; }
  const kpi = (n, t, c) => '<div class="card kpi"' + (c ? ' style="--c:' + c + '"' : '') + '><div class="n">' + n + '</div><div class="t">' + t + '</div></div>';
  function dlg(t, c, b, ancho) { const d = $('dlg'); d.style.maxWidth = ancho ? 'min(' + ancho + 'px,calc(100vw - 24px))' : ''; d.innerHTML = '<div class="hd"><b>' + t + '</b><button class="x" aria-label="Cerrar" onclick="X.cerrar()">×</button></div><div class="bd">' + c + '</div><div class="ft">' + (b || '<button class="btn sec" onclick="X.cerrar()">Cerrar</button>') + '</div>'; if (!d.open) d.showModal(); }
  const cerrar = () => $('dlg').open && $('dlg').close();
  function csv(rows) { return '﻿' + rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'); }
  function bajar(n, d, t) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: t })); a.download = n; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  let S;
  const base = (demo) => ({ v: 1, app: 'nomina', demo, empresa: demo ? 'Empresa Demo, C.A.' : 'Mi empresa', rif: demo ? 'J-00000000-0' : '', tasa: 52.45, mods: { nomina: true } });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador', true); } }
  function load() { try { const r = localStorage.getItem(KEY); if (r) { S = JSON.parse(r); if (S && S.app === 'nomina') return; } } catch (e) { /* sin almacenamiento */ } S = base(true); }

  const V = {}, A = {}; const NAV = []; let vista = 'nomina';
  const H = window.X3H = { mods: [], stockHooks: [], facturaBtns: [], EN: false, V, A, NAV, save, dlg, cerrar, toast, kpi, $, esc, usd, qty, pct, num, uid, r2, hoy, addDays, diasEntre, fdia, nf2, csv, bajar, prod: () => null, cli: () => null, cliNom: () => '', vivas: () => [] };
  Object.defineProperty(H, 'S', { get: () => S });
  const MENU = [['nomina', 'Inicio'], ['nliq', 'Liquidación'], ['nvac', 'Vacaciones'], ['nutil', 'Utilidades'], ['npres', 'Prestaciones sociales'], ['nquin', 'Pagar la quincena'], ['nhor', 'Horarios y turnos'], ['nemp', 'Mis trabajadores']];
  const MENU2 = [['tasas', 'Calculadora de tasas'], ['nparam', 'Parámetros de ley'], ['nqa', 'Casos de prueba'], ['config', 'Configuración']];
  H.navMod = () => {}; H.sub = () => {};
  function nav() {
    const b = (x) => '<button' + (x[0] === vista ? ' class="on"' : '') + ' onclick="location.hash=\'' + x[0] + '\'">' + x[1] + '</button>';
    $('nav').innerHTML = '<div class="brand">Nómina<small>LOTTT · Venezuela</small></div><div class="grp">Calcular y pagar</div>' + MENU.map(b).join('') + '<div class="grp">Ajustes</div>' + MENU2.map(b).join('') +
      '<div class="tasa">Tasa del día' + (window.PRBTasa ? PRBTasa.tag(S) : '') + '<b>Bs ' + nf2.format(S.tasa) + ' por $</b><button class="lnk" style="color:#cfe8da;margin-top:4px" onclick="location.hash=\'config\'">Cambiar tasa</button></div>';
  }
  function go(keep) {
    H.mods.forEach((m) => m.ensure && m.ensure(S));
    const k = location.hash.slice(1); vista = V[k] ? k : 'nomina'; nav(); const y = window.scrollY, ym = $('m').scrollTop;
    $('m').innerHTML = V[vista]() + '<div class="foot">Nómina · hecho por <a href="../">PRB Consulting</a>. Demo con datos ficticios: lo que registres se guarda solo en este navegador (no se ve desde otro equipo ni desde el teléfono; para pasarlo usa el respaldo en Configuración). ¿Necesitas también ventas, inventario y producción? Mira <a href="../x3/">X3 DATA</a>.</div>';
    if (A[vista]) A[vista](); window.scrollTo(0, keep ? y : 0); $('m').scrollTop = keep ? ym : 0;
  }
  H.go = go;
  window.addEventListener('hashchange', () => go());

  V.config = () => '<h1>Configuración</h1><p class="sub">Datos de tu empresa para los recibos, la tasa del día y tu respaldo.</p><div class="g2e"><div class="card"><h3>Empresa</h3><div class="form"><label class="f full">Razón social<input class="inp" id="ce" value="' + esc(S.empresa) + '"></label><label class="f">RIF<input class="inp" id="cr" value="' + esc(S.rif) + '"></label><label class="f">Tasa BCV (Bs por $)<input class="inp num" id="ct" inputmode="decimal" value="' + S.tasa + '"></label></div><div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="X.guardarCfg()">Guardar</button></div></div>' +
    '<div class="card"><h3>Respaldo</h3><p class="hint" style="margin-top:0">Tus datos viven solo en este navegador y en este equipo. <b>Si abres la app en tu teléfono o en otra computadora, no vas a ver lo que registraste aquí.</b> Para pasarlos: descarga el respaldo aquí y, en el otro equipo, toca «Cargar respaldo».</p><div class="row"><button class="btn sec" onclick="X.respaldo()">Descargar respaldo (.json)</button><label class="btn sec">Cargar respaldo<input type="file" accept=".json,application/json" hidden onchange="X.restaurar(this.files[0])"></label></div>' +
    '<h3 style="margin-top:16px">Empezar de nuevo</h3><div class="row"><button class="btn sec" onclick="X.reset(true)">Volver a los datos ficticios</button><button class="btn danger" onclick="X.reset(false)">Empezar en blanco</button></div></div></div>';

  window.X = {
    cerrar,
    guardarCfg() { const t = num($('ct').value); if (!(t > 0)) return toast('Tasa inválida', true); S.empresa = $('ce').value.trim() || S.empresa; S.rif = $('cr').value.trim(); if (r2(t) !== S.tasa && window.PRBTasa) PRBTasa.manual(S); S.tasa = r2(t); save(); go(true); toast('Guardado'); },
    respaldo() { bajar('nomina-respaldo-' + hoy() + '.json', JSON.stringify(S, null, 1), 'application/json'); },
    restaurar(f) { if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.app !== 'nomina' || !d.nom) throw 0; S = d; save(); go(); toast('Respaldo cargado'); } catch (e) { toast('Ese archivo no es un respaldo de esta app', true); } }; r.readAsText(f); },
    reset(demo) { dlg(demo ? 'Volver a los datos ficticios' : 'Empezar en blanco', '<p>' + (demo ? 'Se borra lo que registraste y se cargan los datos de ejemplo.' : 'Se borra todo para que cargues tus trabajadores.') + ' Si quieres conservar algo, descarga un respaldo antes.</p>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn danger" onclick="X.okReset(' + demo + ')">Sí, continuar</button>'); },
    okReset(demo) { S = base(demo); save(); cerrar(); location.hash = demo ? 'nomina' : 'nemp'; go(); toast(demo ? 'Datos de ejemplo cargados' : 'Empieza agregando a tus trabajadores'); }
  };
  V.tasas = () => (window.PRBTasa ? PRBTasa.vista(S) : '<h1>Calculadora de tasas</h1>');
  A.tasas = () => window.PRBTasa && PRBTasa.montar(() => S, save, () => go(true));
  document.addEventListener('DOMContentLoaded', () => { load(); go(); save(); if (window.PRBTasa) PRBTasa.auto(() => S, save, () => go(true)); });
})();
