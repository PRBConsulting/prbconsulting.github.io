/* PRB Consulting · Recorridos guiados ("Guíame") para las apps de prueba.
   Ilumina el botón que toca, explica en una línea y avanza cuando el usuario hace la acción de verdad.
   Sin librerías externas. Los recorridos de cada app están al final del archivo. */
(function () {
  'use strict';
  if (window.PRB && PRB.en) return; // por ahora solo en español
  const app = (location.pathname.match(/\/(x3-lite|x3|finanzas|nomina)\//) || [])[1];
  if (!app) return;
  const KEY = 'prb-tour-' + app;
  const css = `
#tr-spot{position:fixed;z-index:2147483000;border-radius:12px;box-shadow:0 0 0 9999px rgba(11,31,58,.55),0 0 0 3px #e0a54a;pointer-events:none;transition:all .25s ease}
#tr-bub{position:fixed;z-index:2147483001;width:min(330px,calc(100vw - 24px));background:#fff;color:#1b2a41;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.28);padding:16px 16px 12px;font:14px/1.45 Inter,system-ui,sans-serif}
#tr-bub b{display:block;font:700 16px 'Space Grotesk',Inter,sans-serif;margin:0 0 4px;color:#0b1f3a}
#tr-bub p{margin:0 0 10px;color:#3a4a63}
#tr-bub .tr-f{display:flex;align-items:center;gap:8px}
#tr-bub .tr-n{font-size:12px;color:#7a8596;margin-right:auto}
#tr-bub button{font:600 13px Inter,sans-serif;border-radius:9px;padding:7px 12px;cursor:pointer;border:1px solid #d9e0ea;background:#fff;color:#0b1f3a}
#tr-bub button.tr-p{background:#2e9e6b;border-color:#2e9e6b;color:#fff}
#tr-bub .tr-w{font-size:12px;color:#2e9e6b;font-weight:600}
#tr-bub .tr-ar{position:absolute;width:14px;height:14px;background:#fff;transform:rotate(45deg);left:calc(50% - 7px)}
#tr-dim{position:fixed;inset:0;z-index:2147483000;background:rgba(11,31,58,.55)}
#tr-go{position:fixed;right:14px;bottom:14px;z-index:2147482000;background:#0b1f3a;color:#fff;border:0;border-radius:99px;padding:10px 16px;font:600 14px Inter,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer}
#tr-go:hover{background:#173528}
#tr-menu{position:fixed;right:14px;bottom:62px;z-index:2147482001;background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);padding:10px;width:min(320px,calc(100vw - 28px));font:14px Inter,sans-serif}
#tr-menu b{display:block;padding:4px 8px 8px;color:#0b1f3a}
#tr-menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:9px 8px;border-radius:9px;cursor:pointer;font:inherit;color:#1b2a41}
#tr-menu button:hover{background:#f4f6f9}
#tr-menu button small{display:block;color:#7a8596}
@media(max-width:860px){#tr-go,#tr-menu{right:auto;left:14px}}
@media print{#tr-go,#tr-menu,#tr-spot,#tr-bub,#tr-dim{display:none!important}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- motor ---------- */
  let T = null; // { def, i, timer, t0, clicked }
  const TOURS = {};
  function el(step) { if (!step.sel) return null; const s = typeof step.sel === 'function' ? step.sel() : step.sel; if (!s) return null; if (s instanceof Element) return s; const all = document.querySelectorAll(s); for (const e of all) { const r = e.getBoundingClientRect(); if (r.width || r.height) return e; } return null; }
  function layer(container) {
    let spot = $('#tr-spot'), bub = $('#tr-bub');
    if (!spot) { spot = document.createElement('div'); spot.id = 'tr-spot'; }
    if (!bub) { bub = document.createElement('div'); bub.id = 'tr-bub'; bub.setAttribute('role', 'dialog'); }
    if (spot.parentNode !== container) container.appendChild(spot);
    if (bub.parentNode !== container) container.appendChild(bub);
    return { spot, bub };
  }
  function limpiar() { ['tr-spot', 'tr-bub', 'tr-dim'].forEach((id) => { const e = document.getElementById(id); if (e) e.remove(); }); }
  function start(id) {
    const def = TOURS[app].find((t) => t.id === id); if (!def) return;
    cerrarMenu(); if (T) fin(false);
    if (def.pre) def.pre();
    T = { def, i: -1 }; try { localStorage.setItem(KEY, 'visto'); } catch (e) { /* */ }
    paso(0);
  }
  function paso(i) {
    if (!T) return; clearInterval(T.timer); T.i = i; T.t0 = Date.now(); T.clicked = false; T.listo = false;
    const s = T.def.steps[i]; if (!s) return fin(true);
    if (s.go != null) {
      const destino = s.go; const dentro = () => { const e = el(s); return e && e.closest('dialog[open]'); };
      if (!dentro()) document.querySelectorAll('dialog[open]').forEach((d) => d.close());
      if (location.hash.slice(1) !== destino) location.hash = destino;
    }
    if (s.before) { try { s.before(); } catch (e) { /* */ } }
    let scrolled = false;
    const tick = () => {
      if (!T) return; const e = el(s);
      if (s.sel && !e) { // aún no aparece: espera hasta 5 s y luego ofrece seguir
        limpiar(); if (Date.now() - T.t0 > 5000) mostrar(s, null, true); return;
      }
      if (e && !scrolled) { scrolled = true; const r = e.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 40) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      mostrar(s, e, false);
      if (typeof s.on === 'function' && !T.listo) { let ok = false; try { ok = s.on(e); } catch (x) { /* */ } if (ok) { T.listo = true; setTimeout(() => T && T.i === i && paso(i + 1), 450); } }
    };
    tick(); T.timer = setInterval(tick, 250);
  }
  function mostrar(s, e, perdido) {
    const cont = (e && e.closest('dialog[open]')) || document.querySelector('dialog[open]') || document.body;
    const { spot, bub } = layer(cont); const n = T.def.steps.length; const ultimo = T.i === n - 1;
    const espera = s.on === 'click' ? '👆 Toca donde está iluminado' : typeof s.on === 'function' ? '✍️ ' + (s.hint || 'Hazlo y seguimos solos') : '';
    const html = (perdido ? '<b>No encuentro este paso</b><p>Puede que la pantalla haya cambiado o que tus datos estén en blanco. Puedes seguir o salir.</p>' : '<b>' + s.t + '</b><p>' + s.d + '</p>') +
      '<div class="tr-f"><span class="tr-n">' + (T.i + 1) + ' de ' + n + '</span>' + (ultimo ? '' : '<button data-a="x">Salir</button>') +
      (perdido || !s.on || s.skip ? '<button class="tr-p" data-a="n">' + (ultimo ? '¡Listo!' : 'Siguiente') + '</button>' : '') + '</div>' + (espera && !perdido ? '<div class="tr-w" style="margin-top:6px">' + espera + '</div>' : '') + '<div class="tr-ar"></div>';
    if (bub.dataset.k !== T.i + '|' + perdido) { bub.innerHTML = html; bub.dataset.k = T.i + '|' + perdido; bub.querySelectorAll('[data-a]').forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); b.dataset.a === 'x' ? fin(false) : paso(T.i + 1); })); }
    let dim = $('#tr-dim');
    if (!e) { spot.style.display = 'none'; if (!dim) { dim = document.createElement('div'); dim.id = 'tr-dim'; } if (dim.parentNode !== cont) cont.insertBefore(dim, bub); bub.style.left = (innerWidth - bub.offsetWidth) / 2 + 'px'; bub.style.top = Math.max(20, (innerHeight - bub.offsetHeight) / 2) + 'px'; bub.querySelector('.tr-ar').style.display = 'none'; return; }
    if (dim) dim.remove();
    const r = e.getBoundingClientRect(); const pad = 6;
    Object.assign(spot.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const bw = bub.offsetWidth, bh = bub.offsetHeight; const ar = bub.querySelector('.tr-ar'); ar.style.display = 'block';
    let top, abajo = r.bottom + 14 + bh < innerHeight || r.top - 14 - bh < 0;
    if (abajo) { top = Math.min(r.bottom + 14, innerHeight - bh - 8); ar.style.top = '-7px'; ar.style.bottom = ''; } else { top = r.top - 14 - bh; ar.style.bottom = '-7px'; ar.style.top = ''; }
    let left = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), innerWidth - bw - 8);
    bub.style.left = left + 'px'; bub.style.top = Math.max(8, top) + 'px';
    ar.style.left = Math.min(Math.max(14, r.left + r.width / 2 - left - 7), bw - 28) + 'px';
  }
  function fin(completo) {
    if (!T) return; clearInterval(T.timer); const def = T.def; T = null; limpiar();
    if (completo && def.done) try { def.done(); } catch (e) { /* */ }
  }
  // avanzar cuando el usuario toca lo iluminado
  document.addEventListener('click', (ev) => {
    if (!T || T.clicked) return; const s = T.def.steps[T.i]; if (!s || s.on !== 'click') return;
    const e = el(s); const sel = typeof s.sel === 'string' ? s.sel : null;
    if ((e && (e === ev.target || e.contains(ev.target))) || (sel && ev.target.closest && ev.target.closest(sel))) { T.clicked = true; const i = T.i; setTimeout(() => T && T.i === i && paso(i + 1), 450); }
  }, true);
  document.addEventListener('keydown', (ev) => { if (T && ev.key === 'Escape') fin(false); });
  addEventListener('resize', () => T && paso(T.i));

  /* ---------- botón "Guíame" y menú ---------- */
  function cerrarMenu() { const m = $('#tr-menu'); if (m) m.remove(); }
  function menu() {
    if ($('#tr-menu')) return cerrarMenu();
    const L = TOURS[app].filter((t) => !t.when || t.when());
    const m = document.createElement('div'); m.id = 'tr-menu';
    m.innerHTML = '<b>¿Qué quieres aprender?</b>' + L.map((t) => '<button data-t="' + t.id + '">' + esc(t.name) + '<small>' + esc(t.desc) + ' · ' + t.steps.length + ' pasos</small></button>').join('');
    m.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => start(b.dataset.t)));
    document.body.appendChild(m);
  }
  function montar() {
    if (!TOURS[app] || $('#tr-go')) return;
    const b = document.createElement('button'); b.id = 'tr-go'; b.type = 'button'; b.textContent = '🎓 Guíame'; b.setAttribute('aria-label', 'Recorrido guiado'); b.onclick = menu; document.body.appendChild(b);
    document.addEventListener('click', (ev) => { if (!ev.target.closest('#tr-menu') && ev.target !== b) cerrarMenu(); });
    let visto = null; try { visto = localStorage.getItem(KEY); } catch (e) { /* */ }
    if (!visto && !/[?&]notour/.test(location.search)) setTimeout(() => { if (T) return; T = { def: { steps: [{ t: '¿Te muestro cómo funciona?', d: 'En un minuto te guío paso a paso con un caso de ejemplo. Puedes salir cuando quieras y repetirlo con el botón "Guíame".' }] }, i: 0, t0: Date.now() }; mostrar(T.def.steps[0], null, false); const bub = $('#tr-bub'); bub.querySelector('.tr-f').innerHTML = '<span class="tr-n"></span><button data-a="no">Ahora no</button><button class="tr-p" data-a="si">Sí, muéstrame</button>'; bub.querySelector('[data-a=no]').onclick = () => { T = null; limpiar(); try { localStorage.setItem(KEY, 'no'); } catch (e) { /* */ } }; bub.querySelector('[data-a=si]').onclick = () => { T = null; limpiar(); TOURS[app].length > 1 ? menu() : start(TOURS[app][0].id); }; }, 1200);
  }
  window.PRBTour = { start, fin, get activo() { return T; }, TOURS, app };

  /* =====================================================================
     RECORRIDOS
     ===================================================================== */
  const H = () => window.X3H;
  const val = (s) => { const e = document.querySelector(s); return e ? e.value : ''; };
  const cerrarDlg = () => document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  const listo = (t, d) => ({ t, d });

  TOURS['x3-lite'] = [{
    id: 'venta', name: 'Haz tu primera venta y cierra la caja', desc: 'Vender, cobrar y cuadrar el efectivo',
    steps: [
      { go: 'vender', sel: '#cat button[data-p]:not([disabled])', on: 'click', t: 'Agrega un producto', d: 'Esta es tu lista de productos con su precio y lo que hay. Toca <b>+</b> para meterlo en la venta.' },
      { sel: '#cart input.num', on: null, t: 'La cantidad', d: 'Aquí cambias cuántos lleva. Si quieres, pon 2 y toca fuera de la casilla.' },
      { sel: '#cart select', on: null, t: '¿Cómo te pagó?', d: 'Elige la forma de pago: efectivo en $ o Bs, pago móvil, punto… Así el cierre de caja sabe qué contar.' },
      { sel: '#cart .row .btn:not(.sec)', on: 'click', t: 'Cobra', d: 'El total sale en $ y en Bs con la tasa del día. Toca <b>Cobrar</b>.' },
      { sel: '#dlg', on: null, t: 'El recibo', d: 'Listo, la venta quedó guardada y el inventario se descontó solo. Puedes imprimir el recibo o seguir.' },
      { go: 'caja', sel: '[id^="ct-"]', on: () => [...document.querySelectorAll('[id^="ct-"]')].some((i) => i.value.trim() !== ''), hint: 'Escribe un monto y seguimos', skip: true, t: 'Cuenta el efectivo', d: 'Al final del día cuentas lo que hay en la gaveta y lo escribes aquí, en cada casilla de efectivo.' },
      { sel: '[id^="df-"]', on: null, t: '¿Cuadra?', d: 'El sistema compara lo que debió entrar con lo que contaste y te dice si cuadra, sobra o falta.' },
      { sel: 'button[onclick="X.cerrarCaja()"]', on: 'click', t: 'Guarda el cierre', d: 'Toca <b>Guardar cierre</b>. Queda en la lista de cierres anteriores para revisarlo cuando quieras.' },
      listo('¡Ya sabes vender y cerrar la caja!', 'Explora también Inventario y Compras: cuando compras mercancía, el costo y la existencia se actualizan solos.')
    ]
  }];

  TOURS.finanzas = [{
    id: 'gasto', name: 'Registra un gasto y mira tu presupuesto', desc: 'Anotar gastos y controlar cuánto te queda',
    steps: [
      { go: 'movimientos', sel: 'button[onclick="F.mov()"]', on: 'click', t: 'Anota un gasto', d: 'Cada vez que gastas o te entra dinero lo anotas aquí. Toca <b>+ Nuevo</b>.' },
      { sel: '#mm', on: () => parseFloat(val('#mm').replace(',', '.')) > 0, hint: 'Escribe el monto y seguimos', skip: true, t: '¿Cuánto fue?', d: 'Escribe el monto. Si la cuenta es en bolívares, te muestra cuánto es en dólares.' },
      { sel: '#mk', on: null, t: '¿En qué?', d: 'Elige la categoría: comida, transporte, servicios… Así sabes en qué se te va el dinero.' },
      { sel: '#mc', on: null, t: '¿De dónde salió?', d: 'Elige la cuenta: efectivo, banco en Bs, cuenta en dólares. El saldo de esa cuenta baja solo.' },
      { sel: '#dlg .ft .btn:not(.sec):not(.danger)', on: 'click', t: 'Guárdalo', d: 'Toca <b>Guardar</b>.' },
      { go: 'presupuesto', sel: 'main .card table', on: null, t: 'Tu presupuesto', d: 'Aquí ves cuánto llevas gastado en cada categoría contra el tope que te pusiste. La barra se pone roja si te pasas.' },
      { sel: 'main .card input.num', on: null, t: 'Ponle un tope', d: 'Escribe cuánto quieres gastar al mes en cada categoría. Se guarda solo.' },
      { go: 'metas', sel: 'main .btn', on: null, t: 'Metas de ahorro', d: 'Y aquí defines para qué ahorras: te dice cuánto guardar cada mes para llegar a tiempo.' },
      listo('¡Listo!', 'Anota tus gastos unos días y vuelve al Resumen: vas a ver a dónde se va tu dinero.')
    ]
  }];

  const nominaTours = () => [{
    id: 'liq', name: 'Calcula una liquidación', desc: 'Renuncia o despido, con el paso a paso de la ley',
    when: () => !H() || !H().S || !H().S.mods || H().S.mods.nomina !== false,
    pre: () => { if (H() && H().S && H().S.nom && window.X && X.cfEmp) { const e = H().S.nom.emp.find((x) => x.activo); if (e) X.cfEmp(e.id); } },
    steps: [
      { go: 'nomina', sel: '.tile[onclick*="nliq"]', on: 'click', t: 'Nómina', d: 'Desde aquí haces todos los cálculos de ley. Toca <b>Calcular una liquidación</b>.' },
      { sel: 'main .card .form select', on: null, t: 'El trabajador', d: 'Elige al trabajador. Su fecha de ingreso y su sueldo se llenan solos desde su ficha.' },
      { sel: () => document.querySelectorAll('main .card .form select')[1], on: () => (document.querySelectorAll('main .card .form select')[1] || {}).value === 'injust', hint: 'Elige "Despido sin causa justificada"', skip: true, t: '¿Cómo termina?', d: 'Prueba con <b>Despido sin causa justificada</b>: verás que aparece la indemnización del artículo 92.' },
      { sel: 'main input[type=date][onchange*="egreso"]', on: null, t: 'Fecha de salida', d: 'El último día de trabajo. Con esto se calcula el tiempo de servicio exacto.' },
      { sel: '#nout .kpis', on: null, t: 'El resultado al instante', d: 'Total a pagar, tiempo de servicio, salario integral y la fecha límite para pagar las prestaciones (5 días).' },
      { sel: '#nout table', on: null, t: 'Concepto por concepto', d: 'Cada línea dice cuántos días, la base diaria y el artículo de la LOTTT de donde sale.' },
      { sel: '#nout details.mas summary', on: 'click', t: 'El paso a paso', d: 'Toca aquí para ver cómo se calcularon las prestaciones: trimestre por trimestre y por qué se paga el monto mayor.' },
      { sel: 'button[onclick^="X.nImprimir"]', on: null, t: 'Imprime y firma', d: 'Con este botón sacas la liquidación para que la firme el trabajador.' },
      listo('¡Así de fácil!', 'Prueba también Vacaciones (te dice el día exacto en que regresa) y Pagar la quincena. Todo cálculo es referencial: que lo revise tu contador.')
    ]
  }, {
    id: 'quin', name: 'Paga la quincena', desc: 'Horas extra, descuentos de ley y recibos',
    when: () => !H() || !H().S || !H().S.mods || H().S.mods.nomina !== false,
    steps: [
      { go: 'nquin', sel: 'input[onchange^="X.qx"][onchange*="\'he\'"]', on: () => { const e = document.querySelector('input[onchange^="X.qx"][onchange*="\'he\'"]'); return e && parseFloat(e.value) > 0; }, hint: 'Escribe las horas y toca fuera', skip: true, t: 'Lo que cambió', d: 'Solo anotas lo distinto de esta quincena. Escribe, por ejemplo, 4 horas extra al primer trabajador.' },
      { sel: () => [...document.querySelectorAll('main .card')].find((c) => /Revisa y paga/.test(c.textContent)), on: null, t: 'Revisa y paga', d: 'Sueldo, extras, cestaticket y los descuentos de ley (Seguro Social, paro forzoso, FAOV) ya calculados.' },
      { sel: 'main .kpis', on: null, t: 'Cuánto te cuesta', d: 'El neto a pagar, lo que se descuenta y los aportes que pagas como patrono.' },
      { sel: 'button[onclick="X.qRecibos()"]', on: null, t: 'Recibos', d: 'Saca los recibos de pago para que cada trabajador firme.' },
      { sel: 'button[onclick="X.qGuardar()"]', on: null, t: 'Guárdala', d: 'Cuando todo esté bien, guarda la quincena para tener el historial.' },
      listo('¡Listo!', 'Si cambia el salario mínimo o un porcentaje, actualízalo en Parámetros de ley y todo se recalcula.')
    ]
  }];
  TOURS.nomina = nominaTours();

  TOURS.x3 = [{
    id: 'credito', name: 'Factura a crédito y regístrale el cobro', desc: 'Facturar con IVA y llevar lo que te deben',
    pre: () => { if (window.X && X.fvaciar) try { X.fvaciar(); } catch (e) { /* */ } },
    steps: [
      { go: 'facturar', sel: '#cart select', on: () => val('#cart select') !== '', hint: 'Elige un cliente de la lista', skip: true, t: 'El cliente', d: 'Elige a quién le vendes. Si ya te debe algo, aquí mismo te avisa.' },
      { sel: () => document.querySelectorAll('#cart select')[1], on: () => (document.querySelectorAll('#cart select')[1] || {}).value === 'credito', hint: 'Elige "Crédito"', skip: true, t: '¿Contado o crédito?', d: 'Elige <b>Crédito</b>: la factura queda por cobrar con su fecha de vencimiento según los días que le das al cliente.' },
      { sel: '#cat button[data-p]:not([disabled])', on: 'click', t: 'Agrega productos', d: 'Toca <b>+</b>. El sistema revisa que haya existencia.' },
      { sel: () => { const t = document.querySelectorAll('#cart table'); return t[t.length - 1]; }, on: null, t: 'El IVA, solo', d: 'Separa lo que paga IVA de lo exento y te da el total en $ y en Bs con la tasa del día.' },
      { sel: 'button[onclick="X.facturarOk()"]', on: 'click', t: 'Emite la factura', d: 'Toca <b>Emitir factura</b>.' },
      { sel: '#dlg .ft .btn:not(.sec):not(.danger)', on: 'click', t: 'Tu factura', d: 'Aquí está, lista para imprimir o en forma libre. Cuando el cliente te pague, toca <b>Registrar cobro</b>.' },
      { sel: '#am', on: null, t: 'Cobra todo o una parte', d: 'El monto ya trae lo que debe. Si te abona solo una parte, cámbialo: el resto sigue por cobrar.' },
      { sel: '#dlg .ft .btn:not(.sec)', on: 'click', t: 'Registra el cobro', d: 'Toca <b>Registrar cobro</b>.' },
      { go: 'cobrar', sel: 'main .kpis', on: null, t: 'Lo que te deben', d: 'Aquí ves todo lo pendiente, lo vencido y quién paga tarde.' },
      listo('¡Listo!', 'Revisa también Costos y equilibrio: te dice cuánto tienes que vender para cubrir tus gastos fijos.')
    ]
  }, {
    id: 'produccion', name: 'Anota la producción y pide etiquetas', desc: 'Para quien fabrica: ingredientes, lotes y vencimientos',
    when: () => H() && H().S && H().S.mods && H().S.mods.prod !== false,
    steps: [
      { go: 'prod', sel: '.tile[onclick*="produccion"]', on: 'click', t: 'Producción', d: 'Todo lo de fabricar está aquí. Toca <b>Anotar lo que hice hoy</b>.' },
      { sel: '#pp', on: null, t: '¿Qué hiciste?', d: 'Elige el producto. Cada uno tiene su receta con los ingredientes y empaques que lleva.' },
      { sel: '#pq', on: () => parseFloat(val('#pq').replace(',', '.')) > 0, hint: 'Escribe la cantidad, por ejemplo 30', skip: true, t: '¿Cuántos?', d: 'Escribe cuántas unidades hiciste. Prueba con 30.' },
      { sel: '#pprev table', on: null, t: 'Lo que se usa', d: 'Mira cuánto de cada ingrediente se descuenta y lo que cuesta cada unidad. Si algo no alcanza, sale en rojo.' },
      { sel: 'button[onclick="X.producir()"]', on: 'click', t: 'Guárdalo', d: 'Toca <b>Guardar</b>. Las unidades van al lote abierto de la semana.' },
      { go: 'lotes', sel: 'button[onclick="X.cerrarLotes()"]', on: 'click', t: 'Pide las etiquetas', d: 'Lo de un lote abierto todavía no se puede vender. Cuando pidas las etiquetas, toca aquí.' },
      { sel: '#lmsg', on: null, t: 'El mensaje del pedido', d: 'Ya viene escrito con cada producto, lote y vencimiento. Lo copias y lo mandas por WhatsApp.' },
      { sel: '#dlg .ft .btn:not(.sec)', on: 'click', t: 'Cierra los lotes', d: 'Toca <b>Cerrar lotes</b>: el producto pasa al inventario y ya se puede vender.' },
      listo('¡Listo!', 'Revisa "¿Qué tengo que comprar?": te arma la lista de ingredientes según lo que quieras producir.')
    ]
  }].concat(nominaTours());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 300)); else setTimeout(montar, 300);
})();
