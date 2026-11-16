/* X3 DATA Lite · PRB Consulting
   Compras, ventas, inventario y cierre de caja para negocios pequeños.
   Todo se guarda en el navegador del visitante (localStorage). Datos de prueba inventados. */
(function () {
  'use strict';
  const KEY = 'prb-x3lite-v1';
  const PAGOS = ['Efectivo $', 'Efectivo Bs', 'Pago móvil', 'Punto de venta', 'Transferencia', 'Zelle'];
  const EFECTIVO = ['Efectivo $', 'Efectivo Bs'];
  const MOTIVOS = ['Merma o daño', 'Vencido', 'Conteo físico', 'Consumo interno', 'Corrección'];

  /* ---------- utilidades ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const isoTime = (d) => isoDay(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const hoy = () => isoDay(new Date());
  const addDays = (iso, k) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + k); return isoDay(d); };
  const fdia = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
  const fhora = (iso) => iso && iso.length > 10 ? iso.slice(11, 16) : '';
  const nf2 = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });
  const usd = (v) => '$' + nf2.format(r2(v));
  const bs = (v) => 'Bs ' + nf2.format(r2(v));
  const qty = (v) => nf0.format(v);
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  const num = (v) => { const x = parseFloat(String(v ?? '').trim().replace(/\./g, (m, i, s) => (s.indexOf(',') > -1 ? '' : m)).replace(',', '.')); return isFinite(x) ? x : NaN; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(msg, err) {
    const t = $('toast'); t.textContent = msg; t.className = 'on' + (err ? ' err' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = ''), 2600);
  }

  /* ---------- datos ---------- */
  let S;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador', true); } }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); if (S && S.v === 1) return; } } catch (e) { /* sin almacenamiento */ }
    S = seed(); save();
  }
  function blank() {
    return { v: 1, negocio: 'Mi negocio', tasa: 52.4, tasaFecha: hoy(), seq: { venta: 1, compra: 1 }, productos: [], compras: [], ventas: [], ajustes: [], cierres: [] };
  }
  function seed() {
    const st = blank();
    st.negocio = 'Bodega La Esquina (demo)';
    let s = 17; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const P = [
      ['ALI-01', 'Harina de maíz 1 kg', 'Alimentos', 'Paquete', 0.82, 1.15, 20],
      ['ALI-02', 'Arroz 1 kg', 'Alimentos', 'Paquete', 0.95, 1.30, 15],
      ['ALI-03', 'Pasta larga 1 kg', 'Alimentos', 'Paquete', 1.10, 1.55, 12],
      ['ALI-04', 'Azúcar 1 kg', 'Alimentos', 'Paquete', 0.90, 1.25, 12],
      ['ALI-05', 'Café molido 250 g', 'Alimentos', 'Bolsa', 2.40, 3.20, 8],
      ['ALI-06', 'Aceite vegetal 1 L', 'Alimentos', 'Botella', 2.55, 3.40, 8],
      ['ALI-07', 'Caraotas negras 500 g', 'Alimentos', 'Paquete', 0.95, 1.35, 10],
      ['ALI-08', 'Sardinas en lata', 'Alimentos', 'Lata', 0.70, 1.05, 12],
      ['LAC-01', 'Leche en polvo 400 g', 'Lácteos', 'Bolsa', 3.60, 4.80, 6],
      ['LAC-02', 'Queso blanco 1 kg', 'Lácteos', 'Kg', 4.20, 5.60, 5],
      ['LAC-03', 'Huevos cartón 30', 'Lácteos', 'Cartón', 4.10, 5.50, 4],
      ['BEB-01', 'Refresco 2 L', 'Bebidas', 'Botella', 1.40, 2.00, 12],
      ['BEB-02', 'Agua mineral 1,5 L', 'Bebidas', 'Botella', 0.55, 0.90, 15],
      ['BEB-03', 'Jugo de naranja 1 L', 'Bebidas', 'Caja', 1.30, 1.85, 8],
      ['LIM-01', 'Jabón de baño', 'Limpieza', 'Unidad', 0.60, 0.90, 12],
      ['LIM-02', 'Detergente 1 kg', 'Limpieza', 'Bolsa', 2.10, 2.95, 6],
      ['LIM-03', 'Cloro 1 L', 'Limpieza', 'Botella', 0.85, 1.30, 8],
      ['LIM-04', 'Papel higiénico x4', 'Limpieza', 'Paquete', 1.60, 2.30, 8],
      ['CON-01', 'Tequeños congelados x12', 'Congelados', 'Bandeja', 4.30, 6.50, 4]
    ];
    const ini = [40, 30, 25, 25, 14, 14, 20, 30, 10, 8, 6, 24, 30, 12, 30, 10, 14, 16, 6];
    st.productos = P.map((p, i) => ({ id: 'p' + (i + 1), cod: p[0], nombre: p[1], cat: p[2], unidad: p[3], costo: p[4], precio: p[5], min: p[6], inicial: ini[i], activo: true }));
    const stock = {}; st.productos.forEach((p) => (stock[p.id] = p.inicial));
    const PROV = { 'Alimentos': 'Distribuidora Andina', 'Lácteos': 'Lácteos del Valle', 'Bebidas': 'Bebidas del Centro', 'Limpieza': 'Químicos Unidos', 'Congelados': 'Alimentos Prisma' };
    const CLI = ['', '', '', '', 'Sra. Carmen', 'Sr. Luis', 'Panadería vecina', 'Sr. José', 'Sra. Ana'];
    const DIAS = 45; const t0 = hoy();
    let tasa = 52.4 - DIAS * 0.06;
    for (let k = DIAS; k >= 0; k--) {
      const dia = addDays(t0, -k); const dow = new Date(dia + 'T12:00').getDay();
      tasa = r2(tasa + 0.06 + (rnd() - 0.5) * 0.05);
      // compras: lunes y jueves se repone lo que está bajo
      if ((dow === 1 || dow === 4) && k > 3) {
        const porProv = {};
        st.productos.forEach((p) => { if (stock[p.id] < p.min * 1.6) { const c = Math.ceil(p.min * 2.5 - stock[p.id]); (porProv[PROV[p.cat]] = porProv[PROV[p.cat]] || []).push({ pid: p.id, cant: c, costo: r2(p.costo * (0.97 + rnd() * 0.06)) }); } });
        Object.keys(porProv).forEach((prov) => {
          const items = porProv[prov];
          items.forEach((it) => (stock[it.pid] += it.cant));
          st.compras.push({ id: uid(), num: st.seq.compra++, fecha: dia + 'T07:' + pad(10 + Math.floor(rnd() * 40)), proveedor: prov, factura: 'F-' + (3000 + Math.floor(rnd() * 900)), items, total: r2(items.reduce((a, x) => a + x.cant * x.costo, 0)), anulada: false });
        });
      }
      if (dow === 0 && rnd() < 0.5) continue;
      const nv = (dow === 6 ? 12 : 7) + Math.floor(rnd() * 7);
      for (let v = 0; v < nv; v++) {
        const items = []; const n = 1 + Math.floor(rnd() * 3.2);
        for (let j = 0; j < n; j++) {
          const p = st.productos[Math.floor(Math.pow(rnd(), 1.35) * st.productos.length)];
          if (items.some((x) => x.pid === p.id)) continue;
          const c = 1 + Math.floor(rnd() * (p.unidad === 'Kg' ? 2 : 3));
          if (stock[p.id] < c) continue;
          stock[p.id] -= c; items.push({ pid: p.id, cant: c, precio: p.precio, costo: p.costo });
        }
        if (!items.length) continue;
        const h = 7 + Math.floor((v / nv) * 12); const min = Math.floor(rnd() * 60);
        const pr = rnd(); const pago = pr < 0.28 ? 'Pago móvil' : pr < 0.5 ? 'Efectivo $' : pr < 0.66 ? 'Punto de venta' : pr < 0.8 ? 'Efectivo Bs' : pr < 0.92 ? 'Transferencia' : 'Zelle';
        const total = r2(items.reduce((a, x) => a + x.cant * x.precio, 0));
        st.ventas.push({ id: uid(), num: st.seq.venta++, fecha: dia + 'T' + pad(h) + ':' + pad(min), cliente: CLI[Math.floor(rnd() * CLI.length)], pago, tasa, items, total, anulada: false });
      }
      // un ajuste de vez en cuando
      if (k % 11 === 3) { const p = st.productos[Math.floor(rnd() * st.productos.length)]; if (stock[p.id] > 0) { stock[p.id] -= 1; st.ajustes.push({ id: uid(), fecha: dia + 'T20:00', pid: p.id, cant: -1, motivo: 'Merma o daño', nota: 'Empaque roto' }); } }
    }
    // dejar la venta de hoy incompleta: quitar ventas de hoy después de la hora actual
    const ahora = isoTime(new Date());
    st.ventas = st.ventas.filter((v) => v.fecha <= ahora);
    st.tasa = tasa; st.tasaFecha = t0;
    // cierres de los días anteriores
    for (let k = 7; k >= 1; k--) {
      const dia = addDays(t0, -k); const c = cajaDia(st, dia);
      if (!c.n) continue;
      const contado = {}; EFECTIVO.forEach((p) => (contado[p] = r2(c.por[p].usd + (k === 3 && p === 'Efectivo $' ? -2 : 0))));
      st.cierres.push({ id: uid(), dia, hecho: dia + 'T19:30', total: c.total, por: c.por, contado, nota: k === 3 ? 'Faltaron $2, se revisó el vuelto' : '' });
    }
    return st;
  }

  /* ---------- cálculos ---------- */
  const prod = (id) => S.productos.find((p) => p.id === id);
  function stockMap(st = S) {
    const m = {}; st.productos.forEach((p) => (m[p.id] = +p.inicial || 0));
    st.compras.forEach((c) => { if (!c.anulada) c.items.forEach((x) => (m[x.pid] = (m[x.pid] || 0) + x.cant)); });
    st.ventas.forEach((v) => { if (!v.anulada) v.items.forEach((x) => (m[x.pid] = (m[x.pid] || 0) - x.cant)); });
    st.ajustes.forEach((a) => (m[a.pid] = (m[a.pid] || 0) + a.cant));
    Object.keys(m).forEach((k) => (m[k] = r2(m[k])));
    return m;
  }
  const ventaCosto = (v) => v.items.reduce((a, x) => a + x.cant * x.costo, 0);
  const vivas = () => S.ventas.filter((v) => !v.anulada);
  function cajaDia(st, dia) {
    const por = {}; PAGOS.forEach((p) => (por[p] = { n: 0, usd: 0, bs: 0 }));
    let n = 0, total = 0;
    st.ventas.forEach((v) => { if (v.anulada || v.fecha.slice(0, 10) !== dia) return; n++; total += v.total; const x = por[v.pago] || (por[v.pago] = { n: 0, usd: 0, bs: 0 }); x.n++; x.usd += v.total; x.bs += v.total * v.tasa; });
    Object.values(por).forEach((x) => { x.usd = r2(x.usd); x.bs = r2(x.bs); });
    return { n, total: r2(total), por };
  }
  function estado(p, st) {
    if (st <= 0) return '<span class="tag bad">Agotado</span>';
    if (st <= p.min) return '<span class="tag warn">Reponer</span>';
    return '<span class="tag ok">OK</span>';
  }

  /* ---------- navegación ---------- */
  const NAV = [
    ['Día a día', [['panel', 'Panel'], ['vender', 'Vender'], ['ventas', 'Ventas'], ['caja', 'Cierre de caja']]],
    ['Mercancía', [['inventario', 'Inventario'], ['compras', 'Compras']]],
    ['Sistema', [['config', 'Configuración']]]
  ];
  let vista = 'panel';
  function nav() {
    $('nav').innerHTML = '<div class="brand">X3 DATA Lite<small>Compras, ventas e inventario</small></div>' +
      NAV.map((g) => '<div class="grp">' + g[0] + '</div>' + g[1].map((x) => '<button data-k="' + x[0] + '"' + (x[0] === vista ? ' class="on"' : '') + ' onclick="location.hash=\'' + x[0] + '\'">' + x[1] + '</button>').join('')).join('') +
      '<div class="tasa">Tasa del día<b>' + bs(S.tasa) + ' por $</b><button class="lnk" style="color:#cfe8da;margin-top:4px" onclick="X.tasa()">Cambiar tasa</button></div>';
  }
  function go() {
    const k = location.hash.slice(1);
    vista = V[k] ? k : 'panel';
    nav();
    $('m').innerHTML = V[vista]() + '<div class="foot">X3 DATA Lite · hecho por <a href="../">PRB Consulting</a>. Demo con datos inventados: lo que registres se guarda solo en este navegador. Puedes volver a los datos de ejemplo en Configuración.</div>';
    if (A[vista]) A[vista]();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', go);

  /* ---------- diálogo ---------- */
  function dlg(titulo, cuerpo, botones) {
    const d = $('dlg');
    d.innerHTML = '<div class="hd"><b>' + titulo + '</b><button class="x" aria-label="Cerrar" onclick="X.cerrar()">×</button></div><div class="bd">' + cuerpo + '</div><div class="ft">' + (botones || '<button class="btn sec" onclick="X.cerrar()">Cerrar</button>') + '</div>';
    if (!d.open) d.showModal();
    const f = d.querySelector('input,select'); if (f) f.focus();
  }
  const cerrar = () => $('dlg').open && $('dlg').close();

  /* ---------- vistas ---------- */
  const V = {}, A = {};

  V.panel = () => {
    const h = hoy(); const vs = vivas(); const sm = stockMap();
    const dHoy = vs.filter((v) => v.fecha.slice(0, 10) === h);
    const vHoy = dHoy.reduce((a, v) => a + v.total, 0), uHoy = dHoy.reduce((a, v) => a + v.total - ventaCosto(v), 0);
    const mes = h.slice(0, 7); const dMes = vs.filter((v) => v.fecha.slice(0, 7) === mes);
    const vMes = dMes.reduce((a, v) => a + v.total, 0), uMes = dMes.reduce((a, v) => a + v.total - ventaCosto(v), 0);
    const valInv = S.productos.reduce((a, p) => a + Math.max(0, sm[p.id]) * p.costo, 0);
    const bajos = S.productos.filter((p) => p.activo && sm[p.id] <= p.min);
    const dias = []; for (let k = 13; k >= 0; k--) { const d = addDays(h, -k); dias.push([d, vs.filter((v) => v.fecha.slice(0, 10) === d).reduce((a, v) => a + v.total, 0)]); }
    const mx = Math.max(1, ...dias.map((x) => x[1]));
    const top = {}; dMes.forEach((v) => v.items.forEach((x) => (top[x.pid] = (top[x.pid] || 0) + x.cant * x.precio)));
    const tops = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const W = 560, bw = W / 14;
    return '<h1>' + esc(S.negocio) + '</h1><p class="sub">Hoy ' + fdia(h) + ' · tasa ' + bs(S.tasa) + ' por $</p>' +
      '<div class="kpis"><div class="card kpi"><div class="n">' + usd(vHoy) + '</div><div class="t">Ventas de hoy · ' + dHoy.length + ' ventas · ' + bs(vHoy * S.tasa) + '</div></div>' +
      '<div class="card kpi" style="--c:var(--ok)"><div class="n">' + usd(uHoy) + '</div><div class="t">Ganancia de hoy</div></div>' +
      '<div class="card kpi" style="--c:var(--brand2)"><div class="n">' + usd(vMes) + '</div><div class="t">Ventas del mes · ganancia ' + usd(uMes) + (vMes ? ' (' + Math.round(uMes / vMes * 100) + '%)' : '') + '</div></div>' +
      '<div class="card kpi" style="--c:var(--warn)"><div class="n">' + usd(valInv) + '</div><div class="t">Inventario a costo · ' + bajos.length + ' por reponer</div></div></div>' +
      '<div class="g2"><div class="card"><h3>Ventas de los últimos 14 días ($)</h3><svg viewBox="0 0 ' + W + ' 190" width="100%" role="img" aria-label="Ventas por día">' +
      dias.map((d, i) => { const hh = d[1] / mx * 140; const x = i * bw + 4; return '<rect x="' + x + '" y="' + (160 - hh) + '" width="' + (bw - 8) + '" height="' + hh + '" rx="3" fill="' + (i === 13 ? 'var(--acc)' : '#9fb3a9') + '"><title>' + fdia(d[0]) + ': ' + usd(d[1]) + '</title></rect><text x="' + (x + (bw - 8) / 2) + '" y="178" font-size="10" text-anchor="middle" fill="#667085">' + d[0].slice(8) + '</text>' + (d[1] ? '<text x="' + (x + (bw - 8) / 2) + '" y="' + (154 - hh) + '" font-size="9.5" text-anchor="middle" fill="#1b2430">' + Math.round(d[1]) + '</text>' : ''); }).join('') +
      '</svg></div><div class="card"><h3>Lo más vendido este mes</h3>' + (tops.length ? tops.map((t) => '<div class="hb"><span class="l">' + esc(prod(t[0])?.nombre) + '</span><span class="b"><i style="width:' + (t[1] / tops[0][1] * 100) + '%"></i></span><span class="v">' + usd(t[1]) + '</span></div>').join('') : '<div class="empty">Sin ventas este mes</div>') + '</div></div>' +
      '<div class="g2e"><div class="card scroll"><h3>Por reponer</h3>' + (bajos.length ? '<table><thead><tr><th>Producto</th><th class="r">Existencia</th><th class="r">Mínimo</th><th></th></tr></thead><tbody>' + bajos.map((p) => '<tr><td>' + esc(p.nombre) + '</td><td class="r">' + qty(sm[p.id]) + '</td><td class="r">' + qty(p.min) + '</td><td>' + estado(p, sm[p.id]) + '</td></tr>').join('') + '</tbody></table><div class="row" style="margin:10px 0 0"><button class="btn sm" onclick="X.compraDesdeBajos()">Armar compra con estos productos</button></div>' : '<div class="empty">Todo el inventario está sobre el mínimo</div>') + '</div>' +
      '<div class="card scroll"><h3>Últimas ventas</h3>' + tablaVentas(vs.slice(-6).reverse(), true) + '</div></div>';
  };

  function tablaVentas(L, corta) {
    if (!L.length) return '<div class="empty">No hay ventas</div>';
    return '<table><thead><tr><th>N°</th><th>' + (corta ? 'Hora' : 'Fecha') + '</th>' + (corta ? '' : '<th>Cliente</th>') + '<th>Pago</th><th class="r">Total $</th>' + (corta ? '' : '<th class="r">Total Bs</th><th class="r">Ganancia</th><th></th>') + '</tr></thead><tbody>' +
      L.map((v) => '<tr' + (v.anulada ? ' class="off"' : '') + '><td><button class="lnk" onclick="X.recibo(\'' + v.id + '\')">' + String(v.num).padStart(5, '0') + '</button></td><td>' + (corta ? fhora(v.fecha) : fdia(v.fecha) + ' ' + fhora(v.fecha)) + '</td>' + (corta ? '' : '<td>' + esc(v.cliente || '—') + '</td>') + '<td>' + esc(v.pago) + '</td><td class="r">' + usd(v.total) + '</td>' +
        (corta ? '' : '<td class="r">' + bs(v.total * v.tasa) + '</td><td class="r">' + usd(v.total - ventaCosto(v)) + '</td><td>' + (v.anulada ? '<span class="tag mut">Anulada</span>' : '<button class="lnk bad" onclick="X.anularVenta(\'' + v.id + '\')">Anular</button>') + '</td>') + '</tr>').join('') + '</tbody></table>';
  }

  /* --- Vender (punto de venta) --- */
  let carrito = []; let cliente = ''; let pago = 'Pago móvil'; let filtro = '';
  V.vender = () => '<h1>Vender</h1><p class="sub">Busca o toca un producto para agregarlo. El sistema revisa la existencia y calcula el total en $ y en bolívares con la tasa del día.</p>' +
    '<div class="g2"><div class="card"><div class="row"><input id="q" class="inp" placeholder="Buscar por nombre o código…" value="' + esc(filtro) + '" autocomplete="off"></div><div id="cat" class="scroll"></div></div>' +
    '<div class="card" id="cart"></div></div><button class="fab" id="fab" hidden onclick="document.getElementById(\'cart\').scrollIntoView({behavior:\'smooth\'})"></button>';
  A.vender = () => {
    const q = $('q'); q.oninput = () => { filtro = q.value; pintarCatalogo(); };
    q.onkeydown = (e) => { if (e.key === 'Enter') { const f = $('cat').querySelector('button[data-p]'); if (f) f.click(); } };
    pintarCatalogo(); pintarCarrito(); q.focus();
  };
  function pintarCatalogo() {
    const sm = stockMap(); const f = filtro.toLowerCase().trim();
    const L = S.productos.filter((p) => p.activo && (!f || p.nombre.toLowerCase().includes(f) || p.cod.toLowerCase().includes(f)));
    $('cat').innerHTML = L.length ? '<table><thead><tr><th>Producto</th><th class="r">Precio</th><th class="r">Exist.</th><th></th></tr></thead><tbody>' +
      L.map((p) => { const st = sm[p.id] - (carrito.find((c) => c.pid === p.id)?.cant || 0); return '<tr><td class="wrap"><b>' + esc(p.nombre) + '</b><div class="hint">' + esc(p.cod) + '</div></td><td class="r"><b>' + usd(p.precio) + '</b><div class="hint">' + bs(p.precio * S.tasa) + '</div></td><td class="r">' + (st <= 0 ? '<span class="tag bad">0</span>' : qty(st)) + '</td><td><button class="btn" style="min-width:44px" aria-label="Agregar" data-p="' + p.id + '" ' + (st <= 0 ? 'disabled' : '') + ' onclick="X.agregar(\'' + p.id + '\')">+</button></td></tr>'; }).join('') + '</tbody></table>'
      : '<div class="empty">No hay productos con ese nombre. Puedes crearlo en Inventario.</div>';
  }
  function pintarCarrito() {
    const tot = carrito.reduce((a, c) => a + c.cant * c.precio, 0);
    const fab = $('fab'); if (fab) { fab.hidden = !carrito.length; fab.textContent = 'Ver venta · ' + carrito.reduce((a, c) => a + c.cant, 0) + ' art. · ' + usd(tot); }
    $('cart').innerHTML = '<h3>Venta actual</h3>' + (carrito.length ? '<div class="scroll"><table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th><th></th></tr></thead><tbody>' +
      carrito.map((c, i) => '<tr><td class="wrap">' + esc(prod(c.pid).nombre) + '<div class="hint">' + usd(c.precio) + ' c/u</div></td><td class="r"><input class="inp num" style="width:64px;text-align:right" inputmode="decimal" value="' + c.cant + '" onchange="X.cant(' + i + ',this.value)"></td><td class="r">' + usd(c.cant * c.precio) + '</td><td><button class="x" aria-label="Quitar" onclick="X.quitar(' + i + ')">×</button></td></tr>').join('') + '</tbody></table></div>'
      : '<div class="empty">Agrega productos desde la lista</div>') +
      '<div class="form" style="margin-top:12px"><label class="f">Cliente (opcional)<input class="inp" id="cli" value="' + esc(cliente) + '" oninput="X.setCli(this.value)"></label>' +
      '<label class="f">Forma de pago<select class="inp" onchange="X.setPago(this.value)">' + PAGOS.map((p) => '<option' + (p === pago ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></label></div>' +
      '<table style="margin-top:12px"><tr class="tot"><td>Total $</td><td class="r">' + usd(tot) + '</td></tr><tr class="tot"><td>Total Bs</td><td class="r">' + bs(tot * S.tasa) + '</td></tr></table>' +
      '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn sec" onclick="X.vaciar()" ' + (carrito.length ? '' : 'disabled') + '>Vaciar</button><button class="btn" onclick="X.cobrar()" ' + (carrito.length ? '' : 'disabled') + '>Cobrar ' + usd(tot) + '</button></div>';
  }

  /* --- Ventas --- */
  let vDesde = null, vHasta = null, vPago = '';
  V.ventas = () => {
    vDesde = vDesde || addDays(hoy(), -6); vHasta = vHasta || hoy();
    const L = S.ventas.filter((v) => { const d = v.fecha.slice(0, 10); return d >= vDesde && d <= vHasta && (!vPago || v.pago === vPago); }).slice().reverse();
    const ok = L.filter((v) => !v.anulada); const t = ok.reduce((a, v) => a + v.total, 0), g = ok.reduce((a, v) => a + v.total - ventaCosto(v), 0);
    return '<h1>Ventas</h1><p class="sub">Todas las ventas registradas. Toca el número para ver el recibo. Anular una venta devuelve la mercancía al inventario.</p>' +
      '<div class="row"><label class="f">Desde<input type="date" class="inp" value="' + vDesde + '" onchange="X.fv(\'d\',this.value)"></label><label class="f">Hasta<input type="date" class="inp" value="' + vHasta + '" onchange="X.fv(\'h\',this.value)"></label>' +
      '<label class="f">Pago<select class="inp" onchange="X.fv(\'p\',this.value)"><option value="">Todos</option>' + PAGOS.map((p) => '<option' + (p === vPago ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></label><span class="sp"></span><button class="btn sec" onclick="X.csvVentas()">Descargar CSV</button></div>' +
      '<div class="kpis"><div class="card kpi"><div class="n">' + ok.length + '</div><div class="t">Ventas</div></div><div class="card kpi" style="--c:var(--brand2)"><div class="n">' + usd(t) + '</div><div class="t">Vendido</div></div><div class="card kpi" style="--c:var(--ok)"><div class="n">' + usd(g) + '</div><div class="t">Ganancia · ' + (t ? Math.round(g / t * 100) : 0) + '%</div></div><div class="card kpi" style="--c:var(--warn)"><div class="n">' + usd(ok.length ? t / ok.length : 0) + '</div><div class="t">Ticket promedio</div></div></div>' +
      '<div class="card scroll">' + tablaVentas(L, false) + '</div>';
  };

  /* --- Cierre de caja --- */
  let cDia = null;
  V.caja = () => {
    cDia = cDia || hoy(); const c = cajaDia(S, cDia); const hecho = S.cierres.find((x) => x.dia === cDia);
    return '<h1>Cierre de caja</h1><p class="sub">Lo que debió entrar por cada forma de pago. Cuenta el efectivo, escribe lo que hay y el sistema te dice la diferencia.</p>' +
      '<div class="row"><label class="f">Día<input type="date" class="inp" value="' + cDia + '" onchange="X.cdia(this.value)"></label>' + (hecho ? '<span class="tag ok" style="align-self:end;margin-bottom:8px">Cerrado ' + fdia(hecho.hecho) + ' ' + fhora(hecho.hecho) + '</span>' : '') + '</div>' +
      '<div class="g2"><div class="card scroll"><h3>' + c.n + ' ventas · ' + usd(c.total) + '</h3><table><thead><tr><th>Forma de pago</th><th class="r">Ventas</th><th class="r">Monto $</th><th class="r">Monto Bs</th><th class="r">Contado</th><th class="r">Diferencia</th></tr></thead><tbody>' +
      Object.keys(c.por).map((p) => { const x = c.por[p]; const ef = EFECTIVO.includes(p); const enBs = p === 'Efectivo Bs'; const cont = hecho?.contado?.[p];
        return '<tr><td>' + esc(p) + '</td><td class="r">' + x.n + '</td><td class="r">' + usd(x.usd) + '</td><td class="r">' + bs(x.bs) + '</td><td class="r">' + (ef ? '<input class="inp num" style="width:110px;text-align:right" inputmode="decimal" id="ct-' + PAGOS.indexOf(p) + '" placeholder="' + (enBs ? 'Bs' : '$') + '" value="' + (cont != null ? (enBs ? r2(cont * 1) : cont) : '') + '" oninput="X.dif()">' : '<span class="hint">por banco</span>') + '</td><td class="r" id="df-' + PAGOS.indexOf(p) + '"></td></tr>'; }).join('') +
      '<tr class="tot"><td>Total</td><td class="r">' + c.n + '</td><td class="r">' + usd(c.total) + '</td><td class="r">' + bs(Object.values(c.por).reduce((a, x) => a + x.bs, 0)) + '</td><td></td><td></td></tr></tbody></table>' +
      '<label class="f" style="margin-top:12px">Nota del cierre<input class="inp" id="cnota" value="' + esc(hecho?.nota || '') + '" placeholder="Ej.: se dio vuelto en Bs"></label>' +
      '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="X.cerrarCaja()" ' + (c.n ? '' : 'disabled') + '>' + (hecho ? 'Actualizar cierre' : 'Guardar cierre') + '</button></div></div>' +
      '<div class="card scroll"><h3>Cierres anteriores</h3>' + (S.cierres.length ? '<table><thead><tr><th>Día</th><th class="r">Total</th><th>Efectivo</th></tr></thead><tbody>' + S.cierres.slice().sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 12).map((x) => { const d = difEf(x); return '<tr><td><button class="lnk" onclick="X.cdia(\'' + x.dia + '\')">' + fdia(x.dia) + '</button></td><td class="r">' + usd(x.total) + '</td><td>' + (Math.abs(d) < 0.01 ? '<span class="tag ok">Cuadra</span>' : '<span class="tag ' + (d < 0 ? 'bad' : 'warn') + '">' + (d < 0 ? 'Falta ' : 'Sobra ') + usd(Math.abs(d)) + '</span>') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">Aún no hay cierres</div>') + '</div></div>';
  };
  A.caja = () => X.dif();
  // diferencia de efectivo de un cierre, en $ (el efectivo en Bs se pasa a $ con la tasa promedio del día)
  function difEf(x) {
    let d = 0;
    EFECTIVO.forEach((p) => { const esp = x.por[p] || { usd: 0, bs: 0 }; const cont = x.contado?.[p]; if (cont == null || cont === '') return; if (p === 'Efectivo Bs') { const t = esp.usd ? esp.bs / esp.usd : S.tasa; d += (cont - esp.bs) / t; } else d += cont - esp.usd; });
    return r2(d);
  }

  /* --- Inventario --- */
  let iq = '', icat = '';
  V.inventario = () => {
    const sm = stockMap(); const cats = [...new Set(S.productos.map((p) => p.cat))].sort();
    const L = S.productos.filter((p) => (!icat || p.cat === icat) && (!iq || (p.nombre + ' ' + p.cod).toLowerCase().includes(iq.toLowerCase())));
    const val = L.reduce((a, p) => a + Math.max(0, sm[p.id]) * p.costo, 0), valV = L.reduce((a, p) => a + Math.max(0, sm[p.id]) * p.precio, 0);
    return '<h1>Inventario</h1><p class="sub">La existencia se calcula sola: inicial + compras − ventas ± ajustes. El costo es promedio ponderado y se actualiza con cada compra.</p>' +
      '<div class="row"><input class="inp" style="max-width:260px" id="iq" placeholder="Buscar…" value="' + esc(iq) + '"><select class="inp" style="max-width:180px" onchange="X.icat(this.value)"><option value="">Todas las categorías</option>' + cats.map((c) => '<option' + (c === icat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select><span class="sp"></span><button class="btn sec" onclick="X.csvInv()">Descargar CSV</button><button class="btn" onclick="X.producto()">+ Nuevo producto</button></div>' +
      '<div class="card scroll"><table><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th class="r">Exist.</th><th class="r">Mín.</th><th class="r">Costo $</th><th class="r">Precio $</th><th class="r">Precio Bs</th><th class="r">Margen</th><th class="r">Valor a costo</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (L.length ? L.map((p) => '<tr' + (p.activo ? '' : ' class="off"') + '><td>' + esc(p.cod) + '</td><td>' + esc(p.nombre) + '</td><td>' + esc(p.cat) + '</td><td class="r">' + qty(sm[p.id]) + '</td><td class="r">' + qty(p.min) + '</td><td class="r">' + nf2.format(p.costo) + '</td><td class="r">' + nf2.format(p.precio) + '</td><td class="r">' + nf2.format(r2(p.precio * S.tasa)) + '</td><td class="r">' + (p.precio ? Math.round((p.precio - p.costo) / p.precio * 100) + '%' : '—') + '</td><td class="r">' + usd(Math.max(0, sm[p.id]) * p.costo) + '</td><td>' + (p.activo ? estado(p, sm[p.id]) : '<span class="tag mut">Inactivo</span>') + '</td>' +
        '<td><button class="lnk" onclick="X.producto(\'' + p.id + '\')">Editar</button> · <button class="lnk" onclick="X.ajuste(\'' + p.id + '\')">Ajustar</button> · <button class="lnk" onclick="X.kardex(\'' + p.id + '\')">Movimientos</button></td></tr>').join('') : '<tr><td colspan="12" class="empty">Sin productos</td></tr>') +
      '<tr class="tot"><td colspan="9">' + L.length + ' productos · valor a precio de venta ' + usd(valV) + '</td><td class="r">' + usd(val) + '</td><td colspan="2"></td></tr></tbody></table></div>';
  };
  A.inventario = () => { const q = $('iq'); q.oninput = () => { iq = q.value; const pos = q.selectionStart; go(); const n = $('iq'); n.focus(); n.setSelectionRange(pos, pos); }; };

  /* --- Compras --- */
  let borrador = null;
  V.compras = () => {
    if (!borrador) borrador = { proveedor: '', factura: '', fecha: hoy(), items: [{ pid: '', cant: '', costo: '' }] };
    const provs = [...new Set(S.compras.map((c) => c.proveedor))];
    const tot = borrador.items.reduce((a, x) => a + (num(x.cant) || 0) * (num(x.costo) || 0), 0);
    return '<h1>Compras</h1><p class="sub">Registra la factura del proveedor: la mercancía entra al inventario y el costo promedio se recalcula.</p>' +
      '<div class="card" style="margin-bottom:12px"><h3>Nueva compra</h3><div class="form" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label class="f">Proveedor<input class="inp" list="provs" value="' + esc(borrador.proveedor) + '" oninput="X.bc(\'proveedor\',this.value)"><datalist id="provs">' + provs.map((p) => '<option value="' + esc(p) + '">').join('') + '</datalist></label>' +
      '<label class="f">N° de factura<input class="inp" value="' + esc(borrador.factura) + '" oninput="X.bc(\'factura\',this.value)"></label><label class="f">Fecha<input type="date" class="inp" value="' + borrador.fecha + '" onchange="X.bc(\'fecha\',this.value)"></label></div>' +
      '<div class="scroll" style="margin-top:12px"><table><thead><tr><th>Producto</th><th class="r">Cantidad</th><th class="r">Costo unit. $</th><th class="r">Subtotal $</th><th></th></tr></thead><tbody>' +
      borrador.items.map((x, i) => '<tr><td><select class="inp" style="min-width:200px" onchange="X.bl(' + i + ',\'pid\',this.value)"><option value="">Elegir…</option>' + S.productos.filter((p) => p.activo).map((p) => '<option value="' + p.id + '"' + (p.id === x.pid ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select></td>' +
        '<td class="r"><input class="inp num" style="width:90px;text-align:right" inputmode="decimal" value="' + esc(x.cant) + '" onchange="X.bl(' + i + ',\'cant\',this.value)"></td><td class="r"><input class="inp num" style="width:100px;text-align:right" inputmode="decimal" value="' + esc(x.costo) + '" onchange="X.bl(' + i + ',\'costo\',this.value)"></td><td class="r">' + usd((num(x.cant) || 0) * (num(x.costo) || 0)) + '</td><td><button class="x" aria-label="Quitar" onclick="X.bq(' + i + ')">×</button></td></tr>').join('') +
      '<tr class="tot"><td><button class="lnk" onclick="X.bmas()">+ Agregar línea</button></td><td></td><td class="r">Total</td><td class="r">' + usd(tot) + '</td><td></td></tr></tbody></table></div>' +
      '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn sec" onclick="X.blimpiar()">Limpiar</button><button class="btn" onclick="X.comprar()">Registrar compra</button></div></div>' +
      '<div class="card scroll"><h3>Últimas 15 compras</h3>' + (S.compras.length ? '<table><thead><tr><th>N°</th><th>Fecha</th><th>Proveedor</th><th>Factura</th><th class="r">Productos</th><th class="r">Total $</th><th></th></tr></thead><tbody>' +
        S.compras.slice().reverse().slice(0, 15).map((c) => '<tr' + (c.anulada ? ' class="off"' : '') + '><td><button class="lnk" onclick="X.verCompra(\'' + c.id + '\')">' + String(c.num).padStart(4, '0') + '</button></td><td>' + fdia(c.fecha) + '</td><td>' + esc(c.proveedor) + '</td><td>' + esc(c.factura) + '</td><td class="r">' + c.items.length + '</td><td class="r">' + usd(c.total) + '</td><td>' + (c.anulada ? '<span class="tag mut">Anulada</span>' : '<button class="lnk bad" onclick="X.anularCompra(\'' + c.id + '\')">Anular</button>') + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">Aún no hay compras</div>') + '</div>';
  };

  /* --- Configuración --- */
  V.config = () => '<h1>Configuración</h1><p class="sub">Datos del negocio, tasa del día y respaldo.</p>' +
    '<div class="g2e"><div class="card"><h3>Negocio</h3><div class="form"><label class="f full">Nombre del negocio<input class="inp" id="neg" value="' + esc(S.negocio) + '"></label>' +
    '<label class="f">Tasa del día (Bs por $)<input class="inp num" id="tas" inputmode="decimal" value="' + S.tasa + '"></label><label class="f">Fecha de la tasa<input class="inp" disabled value="' + fdia(S.tasaFecha) + '"></label></div>' +
    '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="X.guardarCfg()">Guardar</button></div></div>' +
    '<div class="card"><h3>Respaldo</h3><p class="hint" style="margin-top:0">Tus datos viven solo en este navegador. Descarga un respaldo para pasarlos a otro equipo o guardarlos.</p>' +
    '<div class="row"><button class="btn sec" onclick="X.respaldo()">Descargar respaldo (.json)</button><label class="btn sec" style="display:inline-block">Cargar respaldo<input type="file" accept=".json,application/json" hidden onchange="X.restaurar(this.files[0])"></label></div>' +
    '<h3 style="margin-top:16px">Empezar de nuevo</h3><div class="row"><button class="btn sec" onclick="X.reset(\'demo\')">Volver a los datos de ejemplo</button><button class="btn danger" onclick="X.reset(\'vacio\')">Empezar en blanco</button></div></div></div>' +
    '<div class="card"><h3>Qué hace este sistema</h3><ul style="margin:0;padding-left:18px;line-height:1.8"><li>Punto de venta con búsqueda, control de existencia y total en $ y Bs.</li><li>Compras que suben el inventario y recalculan el costo promedio.</li><li>Ajustes de inventario (merma, conteo físico) y movimientos por producto.</li><li>Cierre de caja por forma de pago con diferencia del efectivo contado.</li><li>Ganancia por venta y por período, alertas de reposición y exportes a CSV.</li></ul></div>';

  /* ---------- acciones ---------- */
  const X = window.X = {
    cerrar,
    tasa() {
      dlg('Tasa del día', '<label class="f">Bolívares por 1 $<input class="inp num" id="nt" inputmode="decimal" value="' + S.tasa + '"></label><p class="hint">Las ventas nuevas usan esta tasa. Las ventas ya hechas guardan la tasa del momento.</p>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.setTasa($(\'nt\').value)">Guardar</button>');
      $('nt').onkeydown = (e) => { if (e.key === 'Enter') X.setTasa(e.target.value); };
    },
    setTasa(v) { const t = num(v); if (!(t > 0)) return toast('Escribe una tasa válida', true); S.tasa = r2(t); S.tasaFecha = hoy(); save(); cerrar(); go(); toast('Tasa actualizada: ' + bs(S.tasa)); },
    agregar(pid) {
      const sm = stockMap(); const c = carrito.find((x) => x.pid === pid); const p = prod(pid);
      if ((c ? c.cant : 0) + 1 > sm[pid]) return toast('No hay más existencia de ' + p.nombre, true);
      if (c) c.cant++; else carrito.push({ pid, cant: 1, precio: p.precio });
      pintarCarrito(); pintarCatalogo();
    },
    cant(i, v) {
      const n = num(v); const c = carrito[i]; const sm = stockMap();
      if (!(n > 0)) { carrito.splice(i, 1); } else if (n > sm[c.pid]) { c.cant = sm[c.pid]; toast('Solo hay ' + qty(sm[c.pid]) + ' en existencia', true); } else c.cant = r2(n);
      pintarCarrito(); pintarCatalogo();
    },
    quitar(i) { carrito.splice(i, 1); pintarCarrito(); pintarCatalogo(); },
    vaciar() { carrito = []; cliente = ''; pintarCarrito(); pintarCatalogo(); },
    setCli(v) { cliente = v; },
    setPago(v) { pago = v; },
    cobrar() {
      if (!carrito.length) return;
      const sm = stockMap();
      for (const c of carrito) if (c.cant > sm[c.pid]) return toast('Existencia insuficiente: ' + prod(c.pid).nombre, true);
      const v = { id: uid(), num: S.seq.venta++, fecha: isoTime(new Date()), cliente: cliente.trim(), pago, tasa: S.tasa, items: carrito.map((c) => ({ pid: c.pid, cant: c.cant, precio: c.precio, costo: prod(c.pid).costo })), anulada: false };
      v.total = r2(v.items.reduce((a, x) => a + x.cant * x.precio, 0));
      S.ventas.push(v); save(); carrito = []; cliente = ''; filtro = '';
      go(); X.recibo(v.id); toast('Venta ' + String(v.num).padStart(5, '0') + ' registrada');
    },
    recibo(id) {
      const v = S.ventas.find((x) => x.id === id);
      dlg('Recibo N° ' + String(v.num).padStart(5, '0'), '<div id="rc"><div style="text-align:center;margin-bottom:8px"><b>' + esc(S.negocio) + '</b><div class="hint">' + fdia(v.fecha) + ' ' + fhora(v.fecha) + (v.cliente ? ' · ' + esc(v.cliente) : '') + '</div></div>' +
        '<table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">Total</th></tr></thead><tbody>' + v.items.map((x) => '<tr><td class="wrap">' + esc(prod(x.pid)?.nombre || '¿?') + '</td><td class="r">' + qty(x.cant) + '</td><td class="r">' + usd(x.precio) + '</td><td class="r">' + usd(x.cant * x.precio) + '</td></tr>').join('') +
        '<tr class="tot"><td colspan="3">Total $</td><td class="r">' + usd(v.total) + '</td></tr><tr class="tot"><td colspan="3">Total Bs (tasa ' + nf2.format(v.tasa) + ')</td><td class="r">' + bs(v.total * v.tasa) + '</td></tr></tbody></table><p class="hint">Pago: ' + esc(v.pago) + (v.anulada ? ' · <b style="color:var(--bad)">ANULADA</b>' : '') + '</p></div>',
        '<button class="btn sec" onclick="X.imprimir()">Imprimir</button><button class="btn" onclick="X.cerrar()">Listo</button>');
    },
    imprimir() {
      const w = window.open('', '_blank', 'width=420,height=600'); if (!w) return toast('Permite ventanas emergentes para imprimir', true);
      w.document.write('<title>Recibo</title><link rel="stylesheet" href="' + new URL('../assets/prb.css', location.href) + '"><body style="background:#fff;padding:16px">' + $('rc').innerHTML + '<script>setTimeout(()=>print(),400)<\/script>'); w.document.close();
    },
    anularVenta(id) {
      const v = S.ventas.find((x) => x.id === id);
      dlg('Anular venta ' + String(v.num).padStart(5, '0'), '<p>Se anula la venta de <b>' + usd(v.total) + '</b> del ' + fdia(v.fecha) + '. La mercancía vuelve al inventario y deja de contar en caja.</p>',
        '<button class="btn sec" onclick="X.cerrar()">No</button><button class="btn danger" onclick="X.okAnular(\'' + id + '\')">Sí, anular</button>');
    },
    okAnular(id) { S.ventas.find((x) => x.id === id).anulada = true; save(); cerrar(); go(); toast('Venta anulada'); },
    fv(k, v) { if (k === 'd') vDesde = v; if (k === 'h') vHasta = v; if (k === 'p') vPago = v; go(); },
    csvVentas() {
      const rows = [['Numero', 'Fecha', 'Hora', 'Cliente', 'Pago', 'Producto', 'Cantidad', 'Precio $', 'Total $', 'Tasa', 'Total Bs', 'Costo $', 'Anulada']];
      S.ventas.filter((v) => { const d = v.fecha.slice(0, 10); return d >= vDesde && d <= vHasta && (!vPago || v.pago === vPago); })
        .forEach((v) => v.items.forEach((x) => rows.push([v.num, v.fecha.slice(0, 10), fhora(v.fecha), v.cliente, v.pago, prod(x.pid)?.nombre, x.cant, x.precio, r2(x.cant * x.precio), v.tasa, r2(x.cant * x.precio * v.tasa), r2(x.cant * x.costo), v.anulada ? 'Sí' : 'No'])));
      bajar('ventas-' + vDesde + '-a-' + vHasta + '.csv', csv(rows), 'text/csv');
    },
    csvInv() {
      const sm = stockMap(); const rows = [['Codigo', 'Producto', 'Categoria', 'Unidad', 'Existencia', 'Minimo', 'Costo $', 'Precio $', 'Valor a costo $']];
      S.productos.forEach((p) => rows.push([p.cod, p.nombre, p.cat, p.unidad, sm[p.id], p.min, p.costo, p.precio, r2(Math.max(0, sm[p.id]) * p.costo)]));
      bajar('inventario-' + hoy() + '.csv', csv(rows), 'text/csv');
    },
    cdia(v) { cDia = v; go(); },
    dif() {
      const c = cajaDia(S, cDia);
      EFECTIVO.forEach((p) => {
        const i = PAGOS.indexOf(p); const inp = $('ct-' + i); const out = $('df-' + i); if (!inp || !out) return;
        const n = num(inp.value); if (!isFinite(n)) { out.innerHTML = ''; return; }
        const esp = p === 'Efectivo Bs' ? c.por[p].bs : c.por[p].usd; const d = r2(n - esp); const f = p === 'Efectivo Bs' ? bs : usd;
        out.innerHTML = Math.abs(d) < 0.01 ? '<span class="tag ok">Cuadra</span>' : '<span class="tag ' + (d < 0 ? 'bad' : 'warn') + '">' + (d < 0 ? 'Falta ' : 'Sobra ') + f(Math.abs(d)) + '</span>';
      });
    },
    cerrarCaja() {
      const c = cajaDia(S, cDia); const contado = {};
      EFECTIVO.forEach((p) => { const n = num($('ct-' + PAGOS.indexOf(p))?.value); contado[p] = isFinite(n) ? r2(n) : null; });
      if (EFECTIVO.some((p) => c.por[p].n && contado[p] == null)) return toast('Escribe el efectivo contado', true);
      const prev = S.cierres.findIndex((x) => x.dia === cDia);
      const reg = { id: uid(), dia: cDia, hecho: isoTime(new Date()), total: c.total, por: c.por, contado, nota: $('cnota').value.trim() };
      if (prev > -1) S.cierres[prev] = reg; else S.cierres.push(reg);
      save(); go(); toast('Cierre del ' + fdia(cDia) + ' guardado');
    },
    icat(v) { icat = v; go(); },
    producto(id) {
      const p = id ? prod(id) : { cod: '', nombre: '', cat: '', unidad: 'Unidad', costo: '', precio: '', min: 5, inicial: 0, activo: true };
      const cats = [...new Set(S.productos.map((x) => x.cat))];
      dlg(id ? 'Editar producto' : 'Nuevo producto', '<div class="form"><label class="f">Código<input class="inp" id="pc" value="' + esc(p.cod) + '"></label><label class="f">Categoría<input class="inp" id="pk" list="cats" value="' + esc(p.cat) + '"><datalist id="cats">' + cats.map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist></label>' +
        '<label class="f full">Nombre<input class="inp" id="pn" value="' + esc(p.nombre) + '"></label><label class="f">Unidad<input class="inp" id="pu" value="' + esc(p.unidad) + '"></label><label class="f">Existencia mínima<input class="inp num" id="pm" inputmode="decimal" value="' + p.min + '"></label>' +
        '<label class="f">Costo $<input class="inp num" id="pco" inputmode="decimal" value="' + p.costo + '"></label><label class="f">Precio de venta $<input class="inp num" id="ppr" inputmode="decimal" value="' + p.precio + '"></label>' +
        (id ? '<label class="f full" style="flex-direction:row;display:flex;gap:8px;align-items:center"><input type="checkbox" id="pa" ' + (p.activo ? 'checked' : '') + '> Activo (se puede vender y comprar)</label>' : '<label class="f">Existencia inicial<input class="inp num" id="pi" inputmode="decimal" value="0"></label>') +
        '<div class="full hint" id="pmg"></div></div>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.guardarProd(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
      const mg = () => { const c = num($('pco').value), pr = num($('ppr').value); $('pmg').textContent = c > 0 && pr > 0 ? 'Margen ' + Math.round((pr - c) / pr * 100) + '% · ganas ' + usd(pr - c) + ' por unidad · precio en Bs ' + bs(pr * S.tasa) : ''; };
      $('pco').oninput = mg; $('ppr').oninput = mg; mg();
    },
    guardarProd(id) {
      const d = { cod: $('pc').value.trim(), nombre: $('pn').value.trim(), cat: $('pk').value.trim() || 'General', unidad: $('pu').value.trim() || 'Unidad', min: num($('pm').value), costo: num($('pco').value), precio: num($('ppr').value) };
      if (!d.nombre) return toast('Falta el nombre', true);
      if (!(d.precio > 0) || !(d.costo >= 0)) return toast('Revisa el costo y el precio', true);
      if (!(d.min >= 0)) d.min = 0;
      if (!d.cod) d.cod = d.cat.slice(0, 3).toUpperCase() + '-' + String(S.productos.length + 1).padStart(2, '0');
      if (S.productos.some((p) => p.cod.toLowerCase() === d.cod.toLowerCase() && p.id !== id)) return toast('Ya existe un producto con ese código', true);
      if (d.precio < d.costo) toast('Ojo: el precio está por debajo del costo', true);
      d.costo = r2(d.costo); d.precio = r2(d.precio);
      if (id) Object.assign(prod(id), d, { activo: $('pa').checked });
      else { const ini = num($('pi').value); S.productos.push(Object.assign({ id: uid(), inicial: ini > 0 ? ini : 0, activo: true }, d)); }
      save(); cerrar(); go(); toast('Producto guardado');
    },
    ajuste(id) {
      const p = prod(id); const st = stockMap()[id];
      dlg('Ajustar · ' + esc(p.nombre), '<p class="hint" style="margin-top:0">Existencia en sistema: <b>' + qty(st) + '</b> ' + esc(p.unidad) + '</p><div class="form"><label class="f">Motivo<select class="inp" id="am">' + MOTIVOS.map((m) => '<option>' + m + '</option>').join('') + '</select></label>' +
        '<label class="f" id="al">Cantidad a sacar<input class="inp num" id="ac" inputmode="decimal"></label><label class="f full">Nota<input class="inp" id="an" placeholder="Opcional"></label><div class="full hint" id="ar"></div></div>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okAjuste(\'' + id + '\')">Registrar ajuste</button>');
      const upd = () => { const m = $('am').value; const n = num($('ac').value); $('al').firstChild.textContent = m === 'Conteo físico' ? 'Cantidad contada' : m === 'Corrección' ? 'Cantidad (+ suma, − resta)' : 'Cantidad a sacar';
        const d = calcAj(m, n, st); $('ar').textContent = isFinite(d) ? 'Movimiento: ' + (d > 0 ? '+' : '') + qty(d) + ' → nueva existencia ' + qty(st + d) : ''; };
      $('am').onchange = upd; $('ac').oninput = upd;
    },
    okAjuste(id) {
      const st = stockMap()[id]; const m = $('am').value; const d = r2(calcAj(m, num($('ac').value), st));
      if (!isFinite(d) || d === 0) return toast(m === 'Conteo físico' ? 'El conteo coincide, no hay ajuste' : 'Escribe una cantidad', true);
      if (st + d < 0) return toast('La existencia no puede quedar negativa', true);
      S.ajustes.push({ id: uid(), fecha: isoTime(new Date()), pid: id, cant: d, motivo: m, nota: $('an').value.trim() }); save(); cerrar(); go(); toast('Ajuste registrado');
    },
    kardex(id) {
      const p = prod(id); const M = [];
      S.compras.forEach((c) => !c.anulada && c.items.forEach((x) => x.pid === id && M.push([c.fecha, 'Compra ' + String(c.num).padStart(4, '0') + ' · ' + c.proveedor, x.cant])));
      S.ventas.forEach((v) => !v.anulada && v.items.forEach((x) => x.pid === id && M.push([v.fecha, 'Venta ' + String(v.num).padStart(5, '0'), -x.cant])));
      S.ajustes.forEach((a) => a.pid === id && M.push([a.fecha, 'Ajuste · ' + a.motivo + (a.nota ? ' (' + a.nota + ')' : ''), a.cant]));
      M.sort((a, b) => a[0].localeCompare(b[0]));
      let s = +p.inicial || 0; const rows = M.map((m) => { s = r2(s + m[2]); return [m[0], m[1], m[2], s]; });
      dlg('Movimientos · ' + esc(p.nombre), '<div class="scroll"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th class="r">Cant.</th><th class="r">Saldo</th></tr></thead><tbody><tr><td></td><td>Existencia inicial</td><td></td><td class="r">' + qty(p.inicial || 0) + '</td></tr>' +
        rows.slice(-60).reverse().map((r) => '<tr><td>' + fdia(r[0]) + ' ' + fhora(r[0]) + '</td><td class="wrap">' + esc(r[1]) + '</td><td class="r" style="color:' + (r[2] < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (r[2] > 0 ? '+' : '') + qty(r[2]) + '</td><td class="r">' + qty(r[3]) + '</td></tr>').join('') + '</tbody></table></div>' + (rows.length > 60 ? '<p class="hint">Se muestran los 60 movimientos más recientes de ' + rows.length + '.</p>' : ''));
    },
    bc(k, v) { borrador[k] = v; },
    bl(i, k, v) {
      const x = borrador.items[i]; x[k] = v;
      if (k === 'pid' && v && !x.costo) x.costo = prod(v).costo;
      if (i === borrador.items.length - 1 && x.pid) borrador.items.push({ pid: '', cant: '', costo: '' });
      go();
    },
    bq(i) { borrador.items.splice(i, 1); if (!borrador.items.length) borrador.items.push({ pid: '', cant: '', costo: '' }); go(); },
    bmas() { borrador.items.push({ pid: '', cant: '', costo: '' }); go(); },
    blimpiar() { borrador = null; go(); },
    compraDesdeBajos() {
      const sm = stockMap();
      borrador = { proveedor: '', factura: '', fecha: hoy(), items: S.productos.filter((p) => p.activo && sm[p.id] <= p.min).map((p) => ({ pid: p.id, cant: String(Math.max(1, Math.ceil(p.min * 2.5 - sm[p.id]))), costo: p.costo })) };
      borrador.items.push({ pid: '', cant: '', costo: '' }); location.hash = 'compras';
    },
    comprar() {
      const L = borrador.items.filter((x) => x.pid || x.cant);
      if (!borrador.proveedor.trim()) return toast('Falta el proveedor', true);
      if (!L.length) return toast('Agrega al menos un producto', true);
      for (const x of L) { if (!x.pid) return toast('Hay una línea sin producto', true); if (!(num(x.cant) > 0)) return toast('Cantidad inválida en ' + prod(x.pid).nombre, true); if (!(num(x.costo) >= 0)) return toast('Costo inválido en ' + prod(x.pid).nombre, true); }
      const sm = stockMap(); const items = L.map((x) => ({ pid: x.pid, cant: r2(num(x.cant)), costo: r2(num(x.costo)) }));
      // costo promedio ponderado
      items.forEach((x) => { const p = prod(x.pid); const st = Math.max(0, sm[x.pid]); p.costo = r2((st * p.costo + x.cant * x.costo) / (st + x.cant)); sm[x.pid] = st + x.cant; });
      const c = { id: uid(), num: S.seq.compra++, fecha: borrador.fecha + 'T' + isoTime(new Date()).slice(11), proveedor: borrador.proveedor.trim(), factura: borrador.factura.trim(), items, total: r2(items.reduce((a, x) => a + x.cant * x.costo, 0)), anulada: false };
      S.compras.push(c); save(); borrador = null; go(); toast('Compra registrada: ' + usd(c.total));
    },
    verCompra(id) {
      const c = S.compras.find((x) => x.id === id);
      dlg('Compra ' + String(c.num).padStart(4, '0'), '<p class="hint" style="margin-top:0">' + esc(c.proveedor) + ' · factura ' + esc(c.factura || '—') + ' · ' + fdia(c.fecha) + (c.anulada ? ' · <b style="color:var(--bad)">ANULADA</b>' : '') + '</p><table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Costo</th><th class="r">Subtotal</th></tr></thead><tbody>' +
        c.items.map((x) => '<tr><td class="wrap">' + esc(prod(x.pid)?.nombre) + '</td><td class="r">' + qty(x.cant) + '</td><td class="r">' + usd(x.costo) + '</td><td class="r">' + usd(x.cant * x.costo) + '</td></tr>').join('') + '<tr class="tot"><td colspan="3">Total</td><td class="r">' + usd(c.total) + '</td></tr></tbody></table>');
    },
    anularCompra(id) {
      const c = S.compras.find((x) => x.id === id); const sm = stockMap();
      const falta = c.items.filter((x) => sm[x.pid] - x.cant < 0);
      if (falta.length) return toast('No se puede anular: ya se vendió parte de ' + prod(falta[0].pid).nombre, true);
      dlg('Anular compra ' + String(c.num).padStart(4, '0'), '<p>La mercancía de esta compra (' + usd(c.total) + ') sale del inventario. El costo promedio actual no cambia.</p>',
        '<button class="btn sec" onclick="X.cerrar()">No</button><button class="btn danger" onclick="X.okAnularCompra(\'' + id + '\')">Sí, anular</button>');
    },
    okAnularCompra(id) { S.compras.find((x) => x.id === id).anulada = true; save(); cerrar(); go(); toast('Compra anulada'); },
    guardarCfg() {
      const n = $('neg').value.trim(); const t = num($('tas').value);
      if (!n) return toast('Falta el nombre', true); if (!(t > 0)) return toast('Tasa inválida', true);
      S.negocio = n; if (r2(t) !== S.tasa) { S.tasa = r2(t); S.tasaFecha = hoy(); } save(); go(); toast('Guardado');
    },
    respaldo() { bajar('x3-lite-respaldo-' + hoy() + '.json', JSON.stringify(S, null, 1), 'application/json'); },
    restaurar(f) {
      if (!f) return; const r = new FileReader();
      r.onload = () => { try { const d = JSON.parse(r.result); if (d.v !== 1 || !Array.isArray(d.productos) || !Array.isArray(d.ventas)) throw 0; S = d; save(); go(); toast('Respaldo cargado'); } catch (e) { toast('Ese archivo no es un respaldo de X3 DATA Lite', true); } };
      r.readAsText(f);
    },
    reset(modo) {
      dlg(modo === 'demo' ? 'Volver a los datos de ejemplo' : 'Empezar en blanco', '<p>' + (modo === 'demo' ? 'Se borra lo que registraste y se cargan los datos de ejemplo.' : 'Se borra todo: productos, ventas, compras y cierres. Quedas con el sistema vacío para cargar tu negocio.') + ' Si quieres conservar algo, descarga un respaldo antes.</p>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn danger" onclick="X.okReset(\'' + modo + '\')">Sí, continuar</button>');
    },
    okReset(modo) { S = modo === 'demo' ? seed() : blank(); save(); carrito = []; borrador = null; cerrar(); location.hash = modo === 'demo' ? 'panel' : 'inventario'; go(); toast(modo === 'demo' ? 'Datos de ejemplo cargados' : 'Sistema vacío. Empieza creando tus productos'); }
  };
  function calcAj(m, n, st) { if (!isFinite(n)) return NaN; if (m === 'Conteo físico') return n - st; if (m === 'Corrección') return n; return -Math.abs(n); }
  function csv(rows) { return '﻿' + rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'); }
  function bajar(nombre, data, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: tipo })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  window.$ = $;

  load(); go();
})();
