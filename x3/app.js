/* X3 DATA · PRB Consulting
   Facturación con IVA, inventario, cuentas por cobrar y por pagar, costos, punto de equilibrio,
   estado de resultados y simulador. Todo se guarda en el navegador del visitante (localStorage).
   Datos ficticios. */
(function () {
  'use strict';
  const KEY = 'prb-x3-v1' + PRB.sfx; const EN = PRB.en;
  // ganchos para los módulos (producción, distribución, nómina)
  const H = window.X3H = { mods: [], stockHooks: [], facturaBtns: [], precio: (p) => p.precio, vendible: (p) => p.tipo !== 'insumo' };
  const PAGOS = PRB.pagos || ['Efectivo $', 'Efectivo Bs', 'Pago móvil', 'Punto de venta', 'Transferencia', 'Zelle'];
  const TRF = !EN ? 'Transferencia' : PRB.region === 'CA' ? 'E-transfer' : 'Check';
  const esEf = (p) => p === 'Cash' || String(p).startsWith('Efectivo');
  const MOTIVOS = ['Merma o daño', 'Vencido', 'Conteo físico', 'Consumo interno', 'Corrección'];

  /* ---------- utilidades ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const isoTime = (d) => isoDay(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const hoy = () => isoDay(new Date());
  const addDays = (iso, k) => { const d = new Date(iso.slice(0, 10) + 'T12:00'); d.setDate(d.getDate() + k); return isoDay(d); };
  const addMes = (ym, k) => { const d = new Date(ym + '-15T12:00'); d.setMonth(d.getMonth() + k); return isoDay(d).slice(0, 7); };
  const diasEntre = (a, b) => Math.round((new Date(b.slice(0, 10) + 'T12:00') - new Date(a.slice(0, 10) + 'T12:00')) / 864e5);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const nomMes = (ym) => MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
  const fdia = PRB.fecha;
  const fhora = (iso) => iso && iso.length > 10 ? iso.slice(11, 16) : '';
  const nf2 = new Intl.NumberFormat(PRB.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat(PRB.loc, { maximumFractionDigits: 0 });
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  const usd = (v) => (v < 0 ? '−$' : '$') + nf2.format(Math.abs(r2(v)));
  const bs = (v) => (EN ? '' : 'Bs ' + nf2.format(r2(v)));
  const qty = (v) => new Intl.NumberFormat(PRB.loc, { maximumFractionDigits: 2 }).format(v);
  const pct = (v) => (isFinite(v) ? Math.round(v * 1000) / 10 : 0).toString().replace('.', EN ? '.' : ',') + '%';
  const num = PRB.num;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nfac = (n) => String(n).padStart(6, '0');
  function toast(msg, err) { if (window.PRBok) return window.PRBok(msg, err); const t = $('toast'); if (t) t.textContent = msg; }

  /* ---------- datos ---------- */
  let S;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador', true); } }
  function load() { try { const r = localStorage.getItem(KEY); if (r) { S = JSON.parse(r); if (S && S.v === 1) return; } } catch (e) { /* sin almacenamiento */ } S = seed(); save(); }
  function blank() {
    return { v: 1, empresa: 'Mi empresa', rif: '', tasa: 52.4, tasaFecha: hoy(), iva: EN ? PRB.taxRate : 16, varPct: 0, seq: { venta: 1, compra: 1 },
      productos: [], clientes: [], proveedores: [], ventas: [], compras: [], ajustes: [],
      fijos: [{ id: uid(), nombre: 'Alquiler', monto: 0 }, { id: uid(), nombre: 'Sueldos', monto: 0 }, { id: uid(), nombre: 'Servicios', monto: 0 }] };
  }
  function seed() {
    const st = blank();
    st.demo = true;
    st.empresa = EN ? 'Demo Wholesale Inc.' : 'Comercializadora Demo, C.A.'; st.rif = EN ? '' : 'J-00000000-0'; st.varPct = 3;
    let s = 31; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const P = [ // código, nombre, categoría, unidad, costo, precio (sin IVA), mínimo, exento
      ['ALI-01', 'Harina de maíz 1 kg (bulto 20)', 'Alimentos', 'Bulto', 15.2, 18.9, 15, true],
      ['ALI-02', 'Arroz 1 kg (bulto 24)', 'Alimentos', 'Bulto', 21.5, 26.4, 10, true],
      ['ALI-03', 'Pasta larga 1 kg (bulto 20)', 'Alimentos', 'Bulto', 20.0, 25.5, 10, true],
      ['ALI-04', 'Aceite vegetal 1 L (caja 12)', 'Alimentos', 'Caja', 28.0, 35.8, 8, false],
      ['ALI-05', 'Café molido 250 g (caja 24)', 'Alimentos', 'Caja', 52.0, 66.0, 5, false],
      ['ALI-06', 'Azúcar 1 kg (bulto 24)', 'Alimentos', 'Bulto', 20.4, 25.0, 8, true],
      ['ALI-07', 'Sardinas en lata (caja 48)', 'Alimentos', 'Caja', 30.5, 39.0, 6, false],
      ['BEB-01', 'Refresco 2 L (paca 6)', 'Bebidas', 'Paca', 7.6, 10.2, 15, false],
      ['BEB-02', 'Agua mineral 1,5 L (paca 6)', 'Bebidas', 'Paca', 3.0, 4.4, 15, false],
      ['BEB-03', 'Jugo 1 L (caja 12)', 'Bebidas', 'Caja', 14.4, 19.5, 8, false],
      ['LIM-01', 'Detergente 1 kg (caja 12)', 'Limpieza', 'Caja', 23.0, 30.9, 6, false],
      ['LIM-02', 'Cloro 1 L (caja 12)', 'Limpieza', 'Caja', 9.6, 13.8, 8, false],
      ['LIM-03', 'Papel higiénico x4 (paca 12)', 'Limpieza', 'Paca', 17.0, 22.5, 8, false],
      ['CON-01', 'Tequeños congelados x12 (caja 10)', 'Congelados', 'Caja', 40.0, 54.0, 4, false]
    ];
    if (EN) P.splice(0, P.length,
      ['GRO-01', 'Long grain rice 8 kg (case 4)', 'Grocery', 'Case', 26.0, 33.5, 10, true], ['GRO-02', 'Spaghetti 900 g (case 12)', 'Grocery', 'Case', 12.5, 16.9, 10, true],
      ['GRO-03', 'All-purpose flour 10 kg', 'Grocery', 'Bag', 11.8, 15.4, 12, true], ['GRO-04', 'Canola oil 3 L (case 6)', 'Grocery', 'Case', 34.0, 43.5, 8, true],
      ['GRO-05', 'Ground coffee 925 g (case 6)', 'Grocery', 'Case', 58.0, 74.0, 5, true], ['GRO-06', 'Granulated sugar 4 kg (case 4)', 'Grocery', 'Case', 17.5, 22.0, 8, true],
      ['GRO-07', 'Canned tuna 170 g (case 24)', 'Grocery', 'Case', 26.5, 34.9, 6, true], ['BEV-01', 'Cola 355 ml (case 24)', 'Drinks', 'Case', 9.8, 13.5, 15, false],
      ['BEV-02', 'Spring water 500 ml (case 24)', 'Drinks', 'Case', 3.6, 5.2, 15, false], ['BEV-03', 'Orange juice 1.75 L (case 6)', 'Drinks', 'Case', 15.0, 20.4, 8, true],
      ['HOM-01', 'Laundry detergent 4 L (case 4)', 'Household', 'Case', 29.0, 38.9, 6, false], ['HOM-02', 'Bleach 3.5 L (case 6)', 'Household', 'Case', 12.0, 16.8, 8, false],
      ['HOM-03', 'Paper towels 6 rolls (case 4)', 'Household', 'Case', 18.5, 24.5, 8, false], ['FRZ-01', 'Frozen cheese sticks 12 (case 10)', 'Frozen', 'Case', 42.0, 56.0, 4, true]);
    const ini = [60, 40, 40, 30, 16, 30, 20, 60, 60, 25, 18, 25, 25, 12];
    st.productos = P.map((p, i) => ({ id: 'p' + (i + 1), barras: '75900000' + String(1001 + i * 7), cod: p[0], nombre: p[1], cat: p[2], unidad: p[3], costo: p[4], precio: p[5], min: p[6], exento: p[7], inicial: ini[i], activo: true }));
    if (EN) {
      st.clientes = [['Sunrise Convenience', 7], ['Maple Corner Store', 15], ['Main Street Bakery', 15], ['Harbor Deli', 30], ['QuickStop 24', 7], ['Campus Café', 0], ['Lakeview Grill', 15], ['Northside Market', 30]]
        .map((c, i) => ({ id: 'c' + (i + 1), nombre: c[0], rif: '', dias: c[1] }));
      st.proveedores = [['Northern Foods Wholesale', 15], ['Metro Beverages', 7], ['CleanCo Supply', 30], ['Prisma Foods', 7]].map((p, i) => ({ id: 'v' + (i + 1), nombre: p[0], rif: '', dias: p[1] }));
    } else {
    st.clientes = [
      ['Bodega El Sol', 'J-10000001-1', 7], ['Abasto La Fe', 'J-10000002-2', 15], ['Panadería Central', 'J-10000003-3', 15], ['Comercial Rivas', 'J-10000004-4', 30],
      ['Minimarket 24', 'J-10000005-5', 7], ['Cafetín Universitario', 'J-10000006-6', 0], ['Restaurante Don Pepe', 'J-10000007-7', 15], ['Supermercado Los Andes', 'J-10000008-8', 30]
    ].map((c, i) => ({ id: 'c' + (i + 1), nombre: c[0], rif: c[1], dias: c[2] }));
    st.proveedores = [['Distribuidora Andina', 'J-20000001-1', 15], ['Bebidas del Centro', 'J-20000002-2', 7], ['Químicos Unidos', 'J-20000003-3', 30], ['Alimentos Prisma', 'J-20000004-4', 7]]
      .map((p, i) => ({ id: 'v' + (i + 1), nombre: p[0], rif: p[1], dias: p[2] }));
    }
    const PROV = { Alimentos: 'v1', Bebidas: 'v2', Limpieza: 'v3', Congelados: 'v4', Grocery: 'v1', Drinks: 'v2', Household: 'v3', Frozen: 'v4' };
    st.fijos = (EN ? [['Warehouse rent', 900], ['Wages and benefits', 1900], ['Utilities (power, water, internet)', 220], ['Truck lease and upkeep', 250], ['Accounting and licen' + (PRB.region === 'CA' ? 'c' : 's') + 'es', 150], ['Advertising', 100], ['Equipment depreciation', 90]] : [['Alquiler del galpón', 450], ['Sueldos y beneficios', 1850], ['Servicios (luz, agua, internet)', 190], ['Mantenimiento del camión', 160], ['Contador y trámites', 120], ['Publicidad', 100], ['Depreciación de equipos', 85]]).map((f) => ({ id: uid(), nombre: f[0], monto: f[1] }));
    const stock = {}; st.productos.forEach((p) => (stock[p.id] = p.inicial));
    const DIAS = 120, t0 = hoy(); let tasa = 52.4 - DIAS * 0.05;
    const cobrosPend = []; // [fechaPago, ventaRef]
    for (let k = DIAS; k >= 0; k--) {
      const dia = addDays(t0, -k); const dow = new Date(dia + 'T12:00').getDay(); tasa = r2(tasa + 0.05);
      // compras lunes y jueves
      if ((dow === 1 || dow === 4) && k > 2) {
        const porProv = {};
        st.productos.forEach((p) => { if (stock[p.id] < p.min * 1.8) (porProv[PROV[p.cat]] = porProv[PROV[p.cat]] || []).push({ pid: p.id, cant: Math.ceil(p.min * 3 - stock[p.id]), costo: r2(p.costo * (0.98 + rnd() * 0.04)) }); });
        Object.keys(porProv).forEach((pv) => {
          const items = porProv[pv]; items.forEach((x) => (stock[x.pid] += x.cant));
          const prov = st.proveedores.find((x) => x.id === pv); const tot = r2(items.reduce((a, x) => a + x.cant * x.costo, 0));
          const c = { id: uid(), num: st.seq.compra++, fecha: dia + 'T08:00', prov: pv, factura: 'F-' + (5000 + Math.floor(rnd() * 4000)), cond: prov.dias ? 'credito' : 'contado', vence: addDays(dia, prov.dias), items, total: tot, pagos: [], anulada: false };
          const fp = addDays(dia, prov.dias + Math.floor(rnd() * 5) - 1);
          if (fp <= t0 && !(k < 20 && rnd() < 0.5)) c.pagos.push({ id: uid(), fecha: fp > dia ? fp : dia, monto: tot, pago: TRF });
          st.compras.push(c);
        });
      }
      if (dow === 0) continue;
      const nv = 4 + Math.floor(rnd() * 5) + (dow === 5 ? 2 : 0);
      for (let v = 0; v < nv; v++) {
        const cl = st.clientes[Math.floor(Math.pow(rnd(), 1.3) * st.clientes.length)];
        const items = []; const n = 1 + Math.floor(rnd() * 4);
        for (let j = 0; j < n; j++) {
          const p = st.productos[Math.floor(rnd() * st.productos.length)]; if (items.some((x) => x.pid === p.id)) continue;
          const c = 1 + Math.floor(rnd() * 3); if (stock[p.id] < c) continue; stock[p.id] -= c;
          items.push({ pid: p.id, cant: c, precio: p.precio, costo: p.costo, exento: p.exento });
        }
        if (!items.length) continue;
        const credito = cl.dias > 0 && rnd() < 0.75;
        const fecha = dia + 'T' + pad(8 + Math.floor(v / nv * 9)) + ':' + pad(Math.floor(rnd() * 60));
        const vta = armarVenta(st, { fecha, cli: cl.id, cond: credito ? 'credito' : 'contado', dias: cl.dias, tasa, items });
        const pr = rnd(); let pago = pr < 0.35 ? 'Transferencia' : pr < 0.6 ? 'Pago móvil' : pr < 0.8 ? 'Efectivo $' : pr < 0.9 ? 'Zelle' : 'Punto de venta';
        if (EN) pago = pr < 0.45 ? TRF : PAGOS[pr < 0.65 ? 0 : pr < 0.85 ? 1 : 2];
        if (!credito) vta.abonos.push({ id: uid(), fecha: dia, monto: vta.total, pago });
        else {
          const tarde = rnd(); const fp = addDays(dia, cl.dias + (tarde < 0.6 ? -2 : tarde < 0.85 ? 6 : 25));
          if (fp <= t0) { if (rnd() < 0.25) { const m1 = r2(vta.total * 0.5); vta.abonos.push({ id: uid(), fecha: addDays(dia, Math.floor(cl.dias / 2)), monto: m1, pago }); if (fp <= t0 && rnd() < 0.7) vta.abonos.push({ id: uid(), fecha: fp, monto: r2(vta.total - m1), pago }); } else vta.abonos.push({ id: uid(), fecha: fp, monto: vta.total, pago }); }
        }
        st.ventas.push(vta);
      }
    }
    const ahora = isoTime(new Date()); st.ventas = st.ventas.filter((v) => v.fecha <= ahora);
    st.tasa = tasa; st.tasaFecha = t0;
    return st;
  }
  function armarVenta(st, o) {
    const sub = r2(o.items.reduce((a, x) => a + x.cant * x.precio, 0));
    const grav = r2(o.items.filter((x) => !x.exento).reduce((a, x) => a + x.cant * x.precio, 0));
    const iva = r2(grav * st.iva / 100);
    return { id: uid(), num: st.seq.venta++, fecha: o.fecha, cli: o.cli, cond: o.cond, vence: addDays(o.fecha, o.cond === 'credito' ? o.dias : 0), tasa: o.tasa, items: o.items, sub, grav, iva, total: r2(sub + iva), abonos: [], anulada: false };
  }

  /* ---------- cálculos ---------- */
  const prod = (id) => S.productos.find((p) => p.id === id);
  const cli = (id) => S.clientes.find((c) => c.id === id);
  const prov = (id) => S.proveedores.find((c) => c.id === id);
  const cliNom = (id) => (id ? cli(id)?.nombre || '¿?' : 'Cliente de contado');
  const pagado = (d) => r2((d.abonos || d.pagos).reduce((a, x) => a + x.monto, 0));
  const saldo = (d) => r2(d.total - pagado(d));
  const costoV = (v) => v.items.reduce((a, x) => a + x.cant * x.costo, 0);
  const vivas = () => S.ventas.filter((v) => !v.anulada);
  function stockMap() {
    const m = {}; S.productos.forEach((p) => (m[p.id] = +p.inicial || 0));
    S.compras.forEach((c) => { if (!c.anulada) c.items.forEach((x) => (m[x.pid] = (m[x.pid] || 0) + x.cant)); });
    S.ventas.forEach((v) => { if (!v.anulada) v.items.forEach((x) => (m[x.pid] = (m[x.pid] || 0) - x.cant)); });
    S.ajustes.forEach((a) => (m[a.pid] = (m[a.pid] || 0) + a.cant));
    H.stockHooks.forEach((f) => f(m, S));
    Object.keys(m).forEach((k) => (m[k] = r2(m[k]))); return m;
  }
  const fijosMes = () => r2(S.fijos.reduce((a, f) => a + (+f.monto || 0), 0));
  // análisis de costos sobre un período [desde, hasta]
  function analisis(desde, hasta) {
    const L = vivas().filter((v) => { const d = v.fecha.slice(0, 10); return d >= desde && d <= hasta; });
    const porP = {}; let ventas = 0, cv = 0, und = 0;
    L.forEach((v) => v.items.forEach((x) => { const o = porP[x.pid] || (porP[x.pid] = { und: 0, ventas: 0, costo: 0 }); o.und += x.cant; o.ventas += x.cant * x.precio; o.costo += x.cant * x.costo; ventas += x.cant * x.precio; cv += x.cant * x.costo; und += x.cant; }));
    const varOtros = ventas * S.varPct / 100; const cvt = cv + varOtros;
    const dias = diasEntre(desde, hasta) + 1; const cf = fijosMes() * dias / 30.4;
    const mc = ventas - cvt; const mcPct = ventas ? mc / ventas : 0;
    const pe = mcPct > 0 ? cf / mcPct : Infinity; const mcU = und ? mc / und : 0; const peU = mcU > 0 ? cf / mcU : Infinity;
    return { L, porP, ventas, cv, varOtros, cvt, cf, mc, mcPct, pe, peU, und, util: mc - cf, seg: ventas ? (ventas - pe) / ventas : 0, dias };
  }

  /* ---------- navegación ---------- */
  const NAV = [
    ['Ventas', [['panel', 'Panel'], ['caja', 'Caja rápida'], ['facturar', 'Facturar a cliente'], ['facturas', 'Facturas'], ['cobrar', 'Cuentas por cobrar'], ['clientes', 'Clientes']]],
    ['Compras', [['inventario', 'Inventario'], ['compras', 'Compras'], ['pagar', 'Cuentas por pagar'], ['proveedores', 'Proveedores']]],
    ['Costos', [['costos', 'Costos y equilibrio'], ['resultados', 'Estado de resultados'], ['simulador', 'Simulador']]],
    ['Sistema', [['tasas', 'Calculadora de tasas'], ['config', 'Configuración']]]
  ];
  let vista = 'panel';
  function nav() {
    $('nav').innerHTML = '<div class="brand">X3 DATA<small>Gestión comercial y costos</small></div>' +
      NAV.filter((g) => !g[2] || !S.mods || S.mods[g[2]] !== false).map((g) => '<div class="grp">' + g[0] + '</div>' + g[1].filter((x) => !x[2] || !S.mods || S.mods[x[2]] !== false).map((x) => '<button' + (x[0] === vista || (H.padre && H.padre[vista] === x[0]) ? ' class="on"' : '') + ' onclick="location.hash=\'' + x[0] + '\'">' + x[1] + '</button>').join('')).join('') +
      (EN ? '' : '<div class="tasa">Tasa del día' + (window.PRBTasa ? PRBTasa.tag(S) : '') + '<b>' + bs(S.tasa) + ' por $</b><button class="lnk" style="color:#cfe8da;margin-top:4px" onclick="X.tasa()">Cambiar tasa</button></div>');
  }
  function go(keepScroll) {
    H.mods.forEach((m) => m.ensure && m.ensure(S));
    const k = location.hash.slice(1); vista = V[k] ? k : 'panel'; nav();
    const y = window.scrollY, ym = $('m').scrollTop;
    $('m').innerHTML = V[vista]() + '<div class="foot">X3 DATA · hecho por <a href="../">PRB Consulting</a>. Demo con datos ficticios: lo que registres se guarda solo en este navegador (no se ve desde otro equipo ni desde el teléfono; para pasarlo usa el respaldo en Configuración). Puedes volver a los datos ficticios en Configuración.</div>';
    if (A[vista]) A[vista](); window.scrollTo(0, keepScroll ? y : 0); $('m').scrollTop = keepScroll ? ym : 0;
  }
  window.addEventListener('hashchange', () => go());
  function dlg(t, c, b, ancho) { const d = $('dlg'); d.style.maxWidth = ancho ? 'min(' + ancho + 'px,calc(100vw - 24px))' : ''; d.innerHTML = '<div class="hd"><b>' + t + '</b><button class="x" aria-label="Cerrar" onclick="X.cerrar()">×</button></div><div class="bd">' + c + '</div><div class="ft">' + (b || '<button class="btn sec" onclick="X.cerrar()">Cerrar</button>') + '</div>'; if (!d.open) d.showModal(); }
  const cerrar = () => $('dlg').open && $('dlg').close();
  const kpi = (n, t, c) => '<div class="card kpi"' + (c ? ' style="--c:' + c + '"' : '') + '><div class="n">' + n + '</div><div class="t">' + t + '</div></div>';
  const tagSaldo = (d) => { const s = saldo(d); if (d.anulada) return '<span class="tag mut">Anulada</span>'; if (s <= 0.004) return '<span class="tag ok">Pagada</span>'; const dv = diasEntre(d.vence, hoy()); return dv > 0 ? '<span class="tag bad">Vencida · ' + dv + ' d</span>' : '<span class="tag warn">' + (dv === 0 ? 'Vence hoy' : 'Vence en ' + -dv + ' d') + '</span>'; };

  /* ---------- vistas ---------- */
  const V = {}, A = {};

  V.panel = () => {
    const h = hoy(); const ym = h.slice(0, 7); const a = analisis(ym + '-01', h); const sm = stockMap();
    const cxc = vivas().reduce((s, v) => s + saldo(v), 0), cxcV = vivas().filter((v) => saldo(v) > 0 && v.vence < h).reduce((s, v) => s + saldo(v), 0);
    const cxp = S.compras.filter((c) => !c.anulada).reduce((s, c) => s + saldo(c), 0), cxp7 = S.compras.filter((c) => !c.anulada && saldo(c) > 0 && c.vence <= addDays(h, 7)).reduce((s, c) => s + saldo(c), 0);
    const diasMes = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); const cfMes = fijosMes();
    const peMes = a.mcPct > 0 ? cfMes / a.mcPct : Infinity; const avance = isFinite(peMes) ? a.ventas / peMes : 0;
    // día en que se cubrieron los costos fijos del mes
    let acum = 0, diaPE = null; const porDia = {}; a.L.forEach((v) => { const d = v.fecha.slice(0, 10); porDia[d] = (porDia[d] || 0) + (v.sub - costoV(v) - v.sub * S.varPct / 100); });
    Object.keys(porDia).sort().forEach((d) => { acum += porDia[d]; if (!diaPE && acum >= cfMes) diaPE = d; });
    const bajos = S.productos.filter((p) => p.activo && sm[p.id] <= p.min);
    // inicio "¿Qué quieres hacer hoy?": las acciones más comunes y, delante, lo que pide atención (sin notificaciones)
    let hoyB = '';
    if (!EN) {
      const venc = vivas().filter((v) => saldo(v) > 0 && v.vence < h); const nCli = new Set(venc.map((v) => v.cli)).size;
      const hr = new Date().getHours(); const saludo = hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
      const dato = cxcV > 0 ? 'Te deben ' + usd(cxcV) + ' vencido de ' + nCli + ' cliente' + (nCli > 1 ? 's' : '') + '.' : bajos.length ? 'Tienes ' + bajos.length + ' producto' + (bajos.length > 1 ? 's' : '') + ' por reponer.' : 'Todo al día. Vas en ' + Math.round(avance * 100) + '% del punto de equilibrio del mes.';
      const T = [{ k: 'caja', ic: 'cash-register', t: 'Vender', d: 'Caja rápida para el mostrador', cls: 'main' }, { k: 'facturar', ic: 'file-invoice', t: 'Facturar a un cliente', d: 'Con IVA, de contado o a crédito' },
        { k: 'cobrar', ic: 'coins', t: 'Cobrar' + (venc.length ? ' (' + venc.length + ')' : ''), d: venc.length ? venc.length + ' factura' + (venc.length > 1 ? 's' : '') + ' vencida' + (venc.length > 1 ? 's' : '') : 'Nadie tiene facturas vencidas', cls: venc.length ? 'att' : '' },
        { k: 'compras', ic: 'shopping-cart', t: 'Comprar mercancía' + (bajos.length ? ' (' + bajos.length + ')' : ''), d: bajos.length ? bajos.length + ' producto' + (bajos.length > 1 ? 's' : '') + ' bajo el mínimo' : 'Anota lo que compraste', cls: bajos.length && !venc.length ? 'att' : '' }];
      if (V.nquin && S.mods && S.mods.nomina !== false) T.push({ k: 'nquin', ic: 'users', t: 'Pagar la quincena', d: 'Sueldos y descuentos de ley' });
      hoyB = '<div class="hoy"><h1>' + saludo + '. ¿Qué quieres hacer hoy?</h1><p class="sub">' + dato + '</p><div class="tiles">' + T.map((x) => '<button class="tile ' + (x.cls || '') + '" onclick="location.hash=\'' + x.k + '\'"><div class="ic"><i class="ti ti-' + x.ic + '" aria-hidden="true"></i></div><div><b>' + x.t + '</b><span>' + x.d + '</span></div></button>').join('') + '</div></div>';
    }
    return hoyB + (EN ? '<h1>' + esc(S.empresa) + '</h1>' : '<h3 style="margin-top:6px">Cómo va el mes · ' + esc(S.empresa) + '</h3>') + '<p class="sub">' + nomMes(ym) + ' al día ' + +h.slice(8) + (EN ? '' : ' · tasa ' + bs(S.tasa) + ' por $') + '</p>' +
      '<div class="kpis">' + kpi(usd(a.ventas), 'Ventas del mes sin IVA · ' + a.L.length + ' facturas') + kpi(usd(a.mc), 'Margen de contribución · ' + pct(a.mcPct), 'var(--ok)') + kpi(usd(cxc), 'Por cobrar · vencido ' + usd(cxcV), 'var(--warn)') + kpi(usd(cxp), 'Por pagar · ' + usd(cxp7) + ' vence en 7 días', 'var(--bad)') + '</div>' +
      '<div class="g2"><div class="card"><h3>¿Ya cubrimos los costos fijos del mes?</h3>' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Vendido <b>' + usd(a.ventas) + '</b></span><span>Punto de equilibrio del mes <b>' + (isFinite(peMes) ? usd(peMes) : '—') + '</b></span></div>' +
      '<div style="position:relative;height:22px;background:var(--soft);border-radius:8px;overflow:hidden"><i style="position:absolute;inset:0 auto 0 0;width:' + Math.min(100, avance * 100) + '%;background:' + (avance >= 1 ? 'var(--ok)' : 'var(--gold)') + '"></i><span style="position:absolute;left:8px;top:2px;font-weight:600;font-size:13px;color:' + (avance >= 1 ? 'var(--marfil)' : 'var(--tinta)') + '">' + Math.round(avance * 100) + '%</span></div>' +
      '<p style="margin:10px 0 0">' + (diaPE ? 'Los costos fijos de ' + usd(cfMes) + ' se cubrieron el <b>' + fdia(diaPE) + '</b>. Desde ahí, cada venta deja <b>' + pct(a.mcPct) + '</b> de ganancia. Utilidad del mes hasta hoy: <b>' + usd(a.mc - cfMes) + '</b>.' :
        'Faltan <b>' + usd(Math.max(0, peMes - a.ventas)) + '</b> en ventas para cubrir los costos fijos de ' + usd(cfMes) + '. Al ritmo actual se llega ' + (a.ventas > 0 ? 'cerca del día <b>' + Math.min(diasMes, Math.ceil(peMes / (a.ventas / +h.slice(8)))) + '</b>' : '—') + ' del mes.') + '</p>' +
      '<p class="hint" style="margin:6px 0 0">Punto de equilibrio = costos fijos ÷ % de margen de contribución. <button class="lnk" onclick="location.hash=\'costos\'">Ver el análisis completo</button></p></div>' +
      '<div class="card"><h3>Lo que más deja este mes</h3>' + Object.entries(a.porP).map(([k, o]) => [k, o.ventas - o.costo]).sort((x, y) => y[1] - x[1]).slice(0, 6).map((t, i, arr) => '<div class="hb"><span class="l">' + esc(prod(t[0])?.nombre.replace(/ \(.*\)/, '')) + '</span><span class="b"><i style="width:' + t[1] / arr[0][1] * 100 + '%"></i></span><span class="v">' + usd(t[1]) + '</span></div>').join('') + '</div></div>' +
      '<div class="g2e"><div class="card scroll"><h3>Facturas vencidas</h3>' + tablaDocs(vivas().filter((v) => saldo(v) > 0 && v.vence < h).sort((x, y) => x.vence.localeCompare(y.vence)).slice(0, 6), 'v', true) + '</div>' +
      '<div class="card scroll"><h3>Por reponer</h3>' + (bajos.length ? '<table><thead><tr><th>Producto</th><th class="r">Exist.</th><th class="r">Mín.</th></tr></thead><tbody>' + bajos.map((p) => '<tr><td class="wrap">' + esc(p.nombre) + '</td><td class="r">' + qty(sm[p.id]) + '</td><td class="r">' + qty(p.min) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">Todo sobre el mínimo</div>') + '</div></div>';
  };

  function tablaDocs(L, tipo, corta) {
    if (!L.length) return '<div class="empty">' + (tipo === 'v' ? 'No hay facturas' : 'No hay compras') + '</div>';
    const nom = (d) => (tipo === 'v' ? cliNom(d.cli) : prov(d.prov)?.nombre);
    return '<table><thead><tr><th>N°</th>' + (corta ? '' : '<th class="hm">Fecha</th>') + '<th>' + (tipo === 'v' ? 'Cliente' : 'Proveedor') + '</th>' + (corta ? '' : '<th class="hm">Condición</th><th class="r hm">Total $</th><th class="r hm">' + (tipo === 'v' ? 'Cobrado' : 'Pagado') + '</th>') + '<th class="r">Saldo $</th><th>Estado</th>' + (corta ? '' : '<th></th>') + '</tr></thead><tbody>' +
      L.map((d) => '<tr' + (d.anulada ? ' class="off"' : '') + '><td><button class="lnk" onclick="X.' + (tipo === 'v' ? 'verFactura' : 'verCompra') + '(\'' + d.id + '\')">' + (tipo === 'v' ? nfac(d.num) : String(d.num).padStart(4, '0')) + '</button></td>' + (corta ? '' : '<td class="hm">' + fdia(d.fecha) + '</td>') + '<td class="wrap">' + esc(nom(d)) + '</td>' +
        (corta ? '' : '<td class="hm">' + (d.cond === 'credito' ? 'Crédito · vence ' + fdia(d.vence) : 'Contado') + '</td><td class="r hm">' + usd(d.total) + '</td><td class="r hm">' + usd(pagado(d)) + '</td>') + '<td class="r"><b>' + usd(d.anulada ? 0 : saldo(d)) + '</b></td><td class="wrap">' + tagSaldo(d) + '</td>' +
        (corta ? '' : '<td>' + (!d.anulada && saldo(d) > 0 ? '<button class="btn sm" onclick="X.' + (tipo === 'v' ? 'abonar' : 'pagarCompra') + '(\'' + d.id + '\')">' + (tipo === 'v' ? 'Cobrar' : 'Pagar') + '</button>' : '') + '</td>') + '</tr>').join('') + '</tbody></table>';
  }

  /* --- Facturar --- */
  let F = { items: [], cli: '', cond: 'contado', pago: TRF, q: '' };
  V.facturar = () => '<h1>Facturar</h1><p class="sub">Elige el cliente, agrega productos y el sistema revisa la existencia, aplica el IVA a lo gravado y lleva la factura a crédito o contado.</p>' +
    '<div class="g2"><div class="card"><div class="row"><input id="q" class="inp" placeholder="Buscar producto por nombre o código…" value="' + esc(F.q) + '" autocomplete="off"></div><div id="cat" class="scroll"></div></div><div class="card" id="cart"></div></div><button class="fab" id="fab" hidden onclick="document.getElementById(\'cart\').scrollIntoView({behavior:\'smooth\'})"></button>';
  A.facturar = () => { const q = $('q'); q.oninput = () => { F.q = q.value; pintarCat(); }; q.onkeydown = (e) => { if (e.key === 'Enter') { const b = $('cat').querySelector('button[data-p]:not([disabled])'); if (b) b.click(); } }; pintarCat(); pintarCart(); };
  function pintarCat() {
    const sm = stockMap(); const f = F.q.toLowerCase().trim();
    const L = S.productos.filter((p) => p.activo && H.vendible(p) && (!f || (p.nombre + ' ' + p.cod).toLowerCase().includes(f)));
    $('cat').innerHTML = L.length ? '<table><thead><tr><th>Producto</th><th class="r">Precio</th><th class="r">Exist.</th><th></th></tr></thead><tbody>' + L.map((p) => { const st = sm[p.id] - (F.items.find((x) => x.pid === p.id)?.cant || 0);
      return '<tr><td class="wrap"><b>' + esc(p.nombre) + '</b><div class="hint">' + esc(p.cod) + ' · ' + (p.exento ? 'Exento' : 'IVA ' + S.iva + '%') + '</div></td><td class="r"><b>' + usd(p.precio) + '</b>' + (EN ? '' : '<div class="hint">' + bs(p.precio * S.tasa) + '</div>') + '</td><td class="r">' + (st <= 0 ? '<span class="tag bad">0</span>' : qty(st)) + '</td><td><button class="btn" style="min-width:44px" aria-label="Agregar" data-p="' + p.id + '"' + (st <= 0 ? ' disabled' : '') + ' onclick="X.agregar(\'' + p.id + '\')">+</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No hay productos con ese nombre.</div>';
  }
  function totF() { const sub = F.items.reduce((a, x) => a + x.cant * x.precio, 0); const grav = F.items.filter((x) => !prod(x.pid).exento).reduce((a, x) => a + x.cant * x.precio, 0); const iva = grav * S.iva / 100; return { sub, grav, iva, total: sub + iva }; }
  function pintarCart() {
    const t = totF(); const c = cli(F.cli); const fab = $('fab'); if (fab) { fab.hidden = !F.items.length; fab.textContent = 'Ver factura · ' + usd(t.total); }
    const deuda = c ? vivas().filter((v) => v.cli === c.id).reduce((a, v) => a + saldo(v), 0) : 0; const venc = c ? vivas().filter((v) => v.cli === c.id && saldo(v) > 0 && v.vence < hoy()).length : 0;
    $('cart').innerHTML = '<h3>Factura N° ' + nfac(S.seq.venta) + '</h3><div class="form"><label class="f full">Cliente<select class="inp" onchange="X.fset(\'cli\',this.value)"><option value="">Cliente de contado</option>' + S.clientes.map((x) => '<option value="' + x.id + '"' + (x.id === F.cli ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') + '</select></label>' +
      (c && deuda > 0 ? '<div class="full"><span class="tag ' + (venc ? 'bad' : 'warn') + '">Debe ' + usd(deuda) + (venc ? ' · ' + venc + ' factura(s) vencida(s)' : '') + '</span></div>' : '') +
      '<label class="f">Condición<select class="inp" onchange="X.fset(\'cond\',this.value)"><option value="contado"' + (F.cond === 'contado' ? ' selected' : '') + '>Contado</option>' + (c && c.dias > 0 ? '<option value="credito"' + (F.cond === 'credito' ? ' selected' : '') + '>Crédito ' + c.dias + ' días</option>' : '') + '</select></label>' +
      (F.cond === 'contado' ? '<label class="f">Forma de pago<select class="inp" onchange="X.fset(\'pago\',this.value)">' + PAGOS.map((p) => '<option' + (p === F.pago ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></label>' : '<label class="f">Vence<input class="inp" disabled value="' + fdia(addDays(hoy(), c.dias)) + '"></label>') + '</div>' +
      (F.items.length ? '<div class="scroll" style="margin-top:12px"><table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th><th></th></tr></thead><tbody>' + F.items.map((x, i) => '<tr><td class="wrap">' + esc(prod(x.pid).nombre) + '<div class="hint">' + usd(x.precio) + ' c/u' + (prod(x.pid).exento ? ' · exento' : '') + '</div></td><td class="r"><input class="inp num" style="width:64px;text-align:right" inputmode="decimal" value="' + x.cant + '" onchange="X.fcant(' + i + ',this.value)"></td><td class="r">' + usd(x.cant * x.precio) + '</td><td><button class="x" aria-label="Quitar" onclick="X.fquitar(' + i + ')">×</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">Agrega productos desde la lista</div>') +
      '<table style="margin-top:10px"><tr><td>Base imponible</td><td class="r">' + usd(t.grav) + '</td></tr><tr><td>Exento</td><td class="r">' + usd(t.sub - t.grav) + '</td></tr><tr><td>IVA ' + S.iva + '%</td><td class="r">' + usd(t.iva) + '</td></tr><tr class="tot"><td>Total $</td><td class="r">' + usd(t.total) + '</td></tr><tr class="tot bs"><td>Total Bs</td><td class="r">' + bs(t.total * S.tasa) + '</td></tr></table>' +
      '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn sec" onclick="X.fvaciar()"' + (F.items.length ? '' : ' disabled') + '>Vaciar</button><button class="btn" onclick="X.facturarOk()"' + (F.items.length ? '' : ' disabled') + '>Emitir factura</button></div>';
  }

  /* --- Caja rápida (supermercado) --- */
  let K = { items: [], q: '', sel: 0, ult: null, pagando: false, pago: (PRB.pagos || ['Efectivo $'])[0], recibido: '' };
  const KPAG = PRB.pagos || ['Efectivo $', 'Efectivo Bs', 'Pago móvil', 'Punto de venta', 'Zelle', 'Transferencia'];
  function buscarK(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const exacto = S.productos.filter((p) => p.activo && H.vendible(p) && ((p.barras || '') === q || p.cod.toLowerCase() === q));
    if (exacto.length) return exacto;
    return S.productos.filter((p) => p.activo && H.vendible(p) && (p.nombre + ' ' + p.cod).toLowerCase().includes(q)).slice(0, 8);
  }
  // lo que queda de un producto descontando lo que ya está en la venta de la caja
  const quedaK = (pid) => { const sm = stockMap(); return (sm[pid] || 0) - K.items.filter((x) => x.pid === pid).reduce((a, x) => a + x.cant, 0); };
  const quedaTxt = (pid) => { const q = quedaK(pid); const p = prod(pid); return '<span style="color:' + (q <= 0 ? 'var(--bad)' : p && q <= p.min ? 'var(--warn)' : 'var(--mut)') + ';font-weight:600">' + (q <= 0 ? 'Agotado' : 'Quedan ' + qty(q)) + '</span>'; };
  function favoritos() {
    const c = {}; vivas().filter((v) => v.fecha.slice(0, 10) >= addDays(hoy(), -30)).forEach((v) => v.items.forEach((x) => (c[x.pid] = (c[x.pid] || 0) + x.cant)));
    const L = Object.keys(c).sort((a, b) => c[b] - c[a]).map(prod).filter((p) => p && p.activo && H.vendible(p));
    S.productos.forEach((p) => { if (p.activo && H.vendible(p) && !L.includes(p)) L.push(p); });
    return L.slice(0, 12);
  }
  const totK = () => { const sub = K.items.reduce((a, x) => a + x.cant * x.precio, 0); const grav = K.items.filter((x) => !prod(x.pid).exento).reduce((a, x) => a + x.cant * x.precio, 0); const iva = grav * S.iva / 100; return { sub, iva, total: r2(sub + iva) }; };
  V.caja = () => {
    const vh = vivas().filter((v) => v.fecha.slice(0, 10) === hoy() && v.caja);
    return '<div class="row" style="align-items:center;margin-bottom:10px"><h1 style="margin:0">Caja rápida</h1><span class="sp"></span><span class="hint">Hoy en esta caja: <b>' + vh.length + '</b> ventas · <b>' + usd(vh.reduce((a, v) => a + v.total, 0)) + '</b></span></div>' +
      '<div class="caja"><div class="stack"><div class="card"><div style="position:relative"><input id="kq" class="inp" style="font-size:20px;padding:14px 16px" placeholder="Escanea o escribe código / nombre · 3*código para 3 unidades" autocomplete="off" value="' + esc(K.q) + '"><div id="ksug" class="ksug"></div></div>' +
      '<div class="hint" style="margin-top:8px"><b>Enter</b> agrega · <b>3*</b> antes del código pone la cantidad · <b>F2</b> o <b>Espacio</b> con la caja vacía para cobrar · <b>Supr</b> quita el último · <b>Esc</b> cancela</div></div>' +
      '<div class="card"><h3>Más vendidos · un toque</h3><div class="kfav">' + favoritos().map((p) => '<button onclick="X.kadd(\'' + p.id + '\')"><b>' + esc(p.nombre.replace(/ \(.*\)/, '')) + '</b><span>' + usd(p.precio) + '</span><small style="font-size:12px">' + quedaTxt(p.id) + '</small></button>').join('') + '</div></div></div>' +
      '<div class="card kcart" id="kcart"></div></div>';
  };
  A.caja = () => { const q = $('kq'); q.oninput = () => { K.q = q.value; K.sel = 0; sugK(); }; q.onkeydown = teclaK; pintarK(); q.focus(); };
  function sugK() {
    const raw = K.q.replace(/^\s*\d+(?:[.,]\d+)?\s*[*x]\s*/i, ''); const L = raw.trim().length >= 2 ? buscarK(raw) : [];
    $('ksug').innerHTML = L.length && !(L.length === 1 && (L[0].barras === raw.trim() || L[0].cod.toLowerCase() === raw.trim().toLowerCase())) ? L.map((p, i) => '<button class="' + (i === K.sel ? 'on' : '') + '" onmousedown="event.preventDefault();X.kadd(\'' + p.id + '\')"><span>' + esc(p.nombre) + ' <small style="font-size:12px">· ' + quedaTxt(p.id) + '</small></span><b>' + usd(p.precio) + '</b></button>').join('') : '';
    return L;
  }
  function teclaK(e) {
    if (K.pagando) return;
    const L = sugK();
    if (e.key === 'ArrowDown') { K.sel = Math.min(L.length - 1, K.sel + 1); sugK(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { K.sel = Math.max(0, K.sel - 1); sugK(); e.preventDefault(); }
    else if (e.key === 'Enter') {
      e.preventDefault(); const m = K.q.match(/^\s*(\d+(?:[.,]\d+)?)\s*[*x]\s*(.*)$/i); const cant = m ? num(m[1]) : 1; const raw = m ? m[2] : K.q;
      if (!raw.trim()) { if (K.items.length) X.kcobrar(); return; }
      const R = buscarK(raw); const p = R.length === 1 ? R[0] : R[K.sel];
      if (!p) return toast('No encontré "' + raw.trim() + '"', true);
      X.kadd(p.id, cant);
    } else if (e.key === ' ' && !K.q && K.items.length) { e.preventDefault(); X.kcobrar(); }
    else if (e.key === 'Delete' && !K.q) { e.preventDefault(); K.items.pop(); pintarK(); }
  }
  function pintarK() {
    const t = totK(); const c = $('kcart'); if (!c) return;
    if (K.pagando) {
      const rec = num(K.recibido); const enBs = K.pago === 'Efectivo Bs'; const tot = enBs ? t.total * S.tasa : t.total; const vuelto = isFinite(rec) ? rec - tot : NaN; const ef = esEf(K.pago);
      c.innerHTML = '<h3>Cobrar</h3><div class="ktot"><span>Total</span><b>' + usd(t.total) + '</b><small>' + bs(t.total * S.tasa) + '</small></div>' +
        '<div class="kpay">' + KPAG.map((p, i) => '<button class="' + (p === K.pago ? 'on' : '') + '" onclick="X.kpago(\'' + p + '\')"><small>' + (i + 1) + '</small>' + p + '</button>').join('') + '</div>' +
        (ef ? '<label class="f" style="margin-top:12px">Recibido en ' + (enBs ? 'Bs' : '$') + '<input id="krec" class="inp" style="font-size:22px;text-align:right" inputmode="decimal" value="' + esc(K.recibido) + '" placeholder="' + nf2.format(r2(tot)) + '"></label>' +
          '<div class="kvuelto">' + (isFinite(vuelto) ? (vuelto < -0.004 ? '<span style="color:var(--bad)">Faltan ' + (enBs ? bs(-vuelto) : usd(-vuelto)) + '</span>' : 'Vuelto <b>' + (enBs ? bs(vuelto) : usd(vuelto)) + '</b>' + (enBs || EN ? '' : ' <small>(' + bs(vuelto * S.tasa) + ')</small>')) : '&nbsp;') + '</div>' : '<p class="hint" style="margin:14px 0">Confirma que el pago llegó y presiona Enter.</p>') +
        '<div class="row" style="margin:10px 0 0"><button class="btn sec" onclick="X.kvolver()">Volver (Esc)</button><span class="sp"></span><button class="btn" style="font-size:17px;padding:12px 20px" onclick="X.kconfirmar()">Confirmar (Enter)</button></div>';
      const r = $('krec'); if (r) { r.oninput = () => { K.recibido = r.value; const v = c.querySelector('.kvuelto'); const rr = num(r.value); const vv = isFinite(rr) ? rr - tot : NaN; v.innerHTML = isFinite(vv) ? (vv < -0.004 ? '<span style="color:var(--bad)">Faltan ' + (enBs ? bs(-vv) : usd(-vv)) + '</span>' : 'Vuelto <b>' + (enBs ? bs(vv) : usd(vv)) + '</b>' + (enBs || EN ? '' : ' <small>(' + bs(vv * S.tasa) + ')</small>')) : '&nbsp;'; }; r.focus(); }
      return;
    }
    c.innerHTML = '<div class="row" style="margin-bottom:6px"><h3 style="margin:0">Venta en curso</h3><span class="sp"></span>' + (K.items.length ? '<button class="lnk bad" onclick="X.kvaciar()">Cancelar venta</button>' : '') + '</div>' +
      '<div class="klist">' + (K.items.length ? K.items.map((x, i) => '<div class="kl' + (x.pid === K.ult ? ' new' : '') + '"><div><b>' + esc(prod(x.pid).nombre) + '</b><small>' + usd(x.precio) + (prod(x.pid).exento ? ' · E' : '') + ' · ' + quedaTxt(x.pid) + '</small></div><div class="kq"><button onclick="X.kmas(' + i + ',-1)" aria-label="Menos">−</button><span>' + qty(x.cant) + '</span><button onclick="X.kmas(' + i + ',1)" aria-label="Más">+</button></div><b class="num">' + usd(x.cant * x.precio) + '</b></div>').join('') : '<div class="empty">Escanea o toca un producto</div>') + '</div>' +
      '<div class="ktot"><span>Total' + (t.iva ? ' <small>incluye IVA ' + usd(t.iva) + '</small>' : '') + '</span><b>' + usd(t.total) + '</b><small>' + bs(t.total * S.tasa) + '</small></div>' +
      '<button class="btn" style="width:100%;font-size:19px;padding:14px;margin-top:10px" onclick="X.kcobrar()"' + (K.items.length ? '' : ' disabled') + '>Cobrar · F2</button>';
    const l = c.querySelector('.klist'); if (l) l.scrollTop = l.scrollHeight;
  }
  document.addEventListener('keydown', (e) => {
    if (vista !== 'caja' || $('dlg').open) return;
    if (e.key === 'F2') { e.preventDefault(); if (K.pagando) X.kconfirmar(); else X.kcobrar(); }
    else if (e.key === 'Escape') { e.preventDefault(); if (K.pagando) X.kvolver(); else { K.q = ''; const q = $('kq'); if (q) { q.value = ''; sugK(); } } }
    else if (K.pagando && e.key === 'Enter') { e.preventDefault(); X.kconfirmar(); }
    else if (K.pagando && /^[1-6]$/.test(e.key) && KPAG[+e.key - 1] && document.activeElement?.id !== 'krec') { e.preventDefault(); X.kpago(KPAG[+e.key - 1]); }
  });

  /* --- Facturas --- */
  let fD = null, fH = null, fEst = '';
  V.facturas = () => {
    fD = fD || addDays(hoy(), -30); fH = fH || hoy();
    const L = S.ventas.filter((v) => { const d = v.fecha.slice(0, 10); return d >= fD && d <= fH && (!fEst || (fEst === 'pend' ? !v.anulada && saldo(v) > 0 : fEst === 'venc' ? !v.anulada && saldo(v) > 0 && v.vence < hoy() : fEst === 'pag' ? !v.anulada && saldo(v) <= 0 : v.anulada)); }).slice().reverse();
    const ok = L.filter((v) => !v.anulada);
    return '<h1>Facturas</h1><p class="sub">Todas las ventas con su IVA, condición y saldo. Toca el número para ver la factura.</p>' +
      '<div class="row" style="align-items:end"><label class="f">Desde<input type="date" class="inp" value="' + fD + '" onchange="X.ff(\'d\',this.value)"></label><label class="f">Hasta<input type="date" class="inp" value="' + fH + '" onchange="X.ff(\'h\',this.value)"></label>' +
      '<label class="f">Estado<select class="inp" onchange="X.ff(\'e\',this.value)">' + [['', 'Todas'], ['pend', 'Con saldo'], ['venc', 'Vencidas'], ['pag', 'Pagadas'], ['anu', 'Anuladas']].map((o) => '<option value="' + o[0] + '"' + (o[0] === fEst ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label><span class="sp"></span><button class="btn sec" onclick="X.csvFacturas()">Descargar CSV</button><button class="btn" onclick="location.hash=\'facturar\'">+ Facturar</button></div>' +
      '<div class="kpis">' + kpi(ok.length, 'Facturas') + kpi(usd(ok.reduce((a, v) => a + v.sub, 0)), 'Ventas sin IVA', 'var(--brand2)') + kpi(usd(ok.reduce((a, v) => a + v.iva, 0)), 'IVA facturado', 'var(--gold)') + kpi(usd(ok.reduce((a, v) => a + saldo(v), 0)), 'Saldo pendiente', 'var(--warn)') + '</div>' +
      '<div class="card scroll">' + tablaDocs(L, 'v') + '</div>';
  };

  /* --- Cuentas por cobrar --- */
  V.cobrar = () => {
    const h = hoy(); const P = vivas().filter((v) => saldo(v) > 0.004);
    const B = [['Por vencer', (d) => d <= 0], ['1 a 15 días', (d) => d >= 1 && d <= 15], ['16 a 30 días', (d) => d >= 16 && d <= 30], ['Más de 30', (d) => d > 30]];
    const por = {}; P.forEach((v) => { const o = por[v.cli] || (por[v.cli] = { t: 0, b: [0, 0, 0, 0], n: 0 }); const dv = diasEntre(v.vence, h); const i = B.findIndex((b) => b[1](dv)); o.b[i] += saldo(v); o.t += saldo(v); o.n++; });
    const tot = [0, 0, 0, 0]; Object.values(por).forEach((o) => o.b.forEach((x, i) => (tot[i] += x))); const T = tot.reduce((a, b) => a + b, 0);
    const cobradoMes = vivas().reduce((a, v) => a + v.abonos.filter((x) => x.fecha.slice(0, 7) === h.slice(0, 7)).reduce((s, x) => s + x.monto, 0), 0);
    const credMes = vivas().filter((v) => v.cond === 'credito' && v.fecha.slice(0, 7) === h.slice(0, 7)).reduce((a, v) => a + v.total, 0);
    return '<h1>Cuentas por cobrar</h1><p class="sub">Quién te debe, cuánto y desde cuándo. La antigüedad se cuenta desde la fecha de vencimiento de cada factura.</p>' +
      '<div class="kpis">' + kpi(usd(T), 'Total por cobrar · ' + P.length + ' facturas') + kpi(usd(T - tot[0]), 'Vencido · ' + pct(T ? (T - tot[0]) / T : 0) + ' del total', 'var(--bad)') + kpi(usd(cobradoMes), 'Cobrado este mes', 'var(--ok)') + kpi(usd(credMes), 'Vendido a crédito este mes', 'var(--gold)') + '</div>' +
      '<div class="card" style="margin-bottom:12px"><h3>Antigüedad de saldos por cliente</h3><table><thead><tr><th>Cliente</th><th class="r hm">Facturas</th>' + B.map((b) => '<th class="r hm">' + b[0] + '</th>').join('') + '<th class="r sm">Vencido</th><th class="r">Total</th><th class="hm"></th></tr></thead><tbody>' +
      (Object.keys(por).length ? Object.entries(por).sort((a, b) => b[1].t - a[1].t).map(([k, o]) => '<tr><td class="wrap"><button class="lnk" style="text-align:left" onclick="X.estadoCuenta(\'' + k + '\')">' + esc(cliNom(k)) + '</button></td><td class="r hm">' + o.n + '</td>' + o.b.map((x, i) => '<td class="r hm" style="color:' + (x && i > 1 ? 'var(--bad)' : x && i ? 'var(--warn)' : 'inherit') + '">' + (x ? usd(x) : '—') + '</td>').join('') + '<td class="r sm" style="color:var(--bad)">' + (o.t - o.b[0] > 0.004 ? usd(o.t - o.b[0]) : '—') + '</td><td class="r"><b>' + usd(o.t) + '</b></td><td class="hm"><button class="lnk" onclick="X.estadoCuenta(\'' + k + '\')">Estado de cuenta</button></td></tr>').join('') : '<tr><td colspan="8" class="empty">Nadie te debe.</td></tr>') +
      '<tr class="tot"><td>Total</td><td class="r hm">' + P.length + '</td>' + tot.map((x) => '<td class="r hm">' + usd(x) + '</td>').join('') + '<td class="r sm">' + usd(T - tot[0]) + '</td><td class="r">' + usd(T) + '</td><td class="hm"></td></tr></tbody></table></div>' +
      '<div class="card scroll"><h3>Facturas pendientes</h3>' + tablaDocs(P.slice().sort((a, b) => a.vence.localeCompare(b.vence)), 'v') + '</div>';
  };

  V.clientes = () => '<h1>Clientes</h1><p class="sub">Datos del cliente y sus días de crédito. Lo que compra y lo que debe se calcula solo.</p><div class="row"><span class="sp"></span><button class="btn" onclick="X.cliente()">+ Nuevo cliente</button></div>' +
    '<div class="card scroll"><table><thead><tr><th>Cliente</th><th>RIF</th><th class="r">Crédito</th><th class="r">Compras 90 días</th><th class="r">Saldo</th><th class="r">Días promedio de pago</th><th></th></tr></thead><tbody>' +
    (S.clientes.length ? S.clientes.map((c) => { const L = vivas().filter((v) => v.cli === c.id); const c90 = L.filter((v) => v.fecha.slice(0, 10) >= addDays(hoy(), -90)).reduce((a, v) => a + v.total, 0); const sal = L.reduce((a, v) => a + saldo(v), 0);
      const pg = L.filter((v) => v.cond === 'credito' && saldo(v) <= 0 && v.abonos.length); const dp = pg.length ? Math.round(pg.reduce((a, v) => a + diasEntre(v.fecha, v.abonos[v.abonos.length - 1].fecha), 0) / pg.length) : null;
      return '<tr><td><b>' + esc(c.nombre) + '</b></td><td>' + esc(c.rif) + '</td><td class="r">' + (c.dias ? c.dias + ' días' : 'Contado') + '</td><td class="r">' + usd(c90) + '</td><td class="r">' + (sal > 0 ? '<b>' + usd(sal) + '</b>' : '—') + '</td><td class="r">' + (dp == null ? '—' : dp + ' días' + (c.dias && dp > c.dias + 3 ? ' <span class="tag warn">Paga tarde</span>' : '')) + '</td><td><button class="lnk" onclick="X.cliente(\'' + c.id + '\')">Editar</button> · <button class="lnk" onclick="X.estadoCuenta(\'' + c.id + '\')">Estado de cuenta</button></td></tr>'; }).join('') : '<tr><td colspan="7" class="empty">Sin clientes</td></tr>') + '</tbody></table></div>';

  /* --- Inventario --- */
  let iq = '';
  V.inventario = () => {
    const sm = stockMap(); const L = S.productos.filter((p) => !iq || (p.nombre + ' ' + p.cod + ' ' + p.cat + ' ' + (p.barras || '')).toLowerCase().includes(iq.toLowerCase()));
    return '<h1>Inventario</h1><p class="sub">Existencia = inicial + compras − ventas ± ajustes. El costo es promedio ponderado y se actualiza con cada compra.</p>' +
      '<div class="row"><input class="inp" style="max-width:280px" id="iq" placeholder="Buscar…" value="' + esc(iq) + '"><span class="sp"></span><button class="btn sec" onclick="X.csvInv()">Descargar CSV</button><button class="btn" onclick="X.producto()">+ Nuevo producto</button></div>' +
      '<div class="card scroll"><table><thead><tr><th>Producto</th><th class="r">Exist.</th><th class="r">Mín.</th><th class="r">Costo $</th><th class="r">Precio $</th><th class="r">Margen</th><th class="r">Valor a costo</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (L.length ? L.map((p) => '<tr' + (p.activo ? '' : ' class="off"') + '><td class="wrap"><button class="lnk" style="text-align:left" onclick="X.producto(\'' + p.id + '\')"><b>' + esc(p.nombre) + '</b></button><div class="hint">' + esc(p.cod) + (p.barras ? ' · ' + esc(p.barras) : '') + ' · ' + (p.exento ? 'Exento' : 'IVA ' + S.iva + '%') + '</div></td><td class="r">' + qty(sm[p.id]) + '</td><td class="r">' + qty(p.min) + '</td><td class="r">' + nf2.format(p.costo) + '</td><td class="r">' + nf2.format(p.precio) + '</td><td class="r">' + pct((p.precio - p.costo) / p.precio) + '</td><td class="r">' + usd(Math.max(0, sm[p.id]) * p.costo) + '</td><td>' + (sm[p.id] <= 0 ? '<span class="tag bad">Agotado</span>' : sm[p.id] <= p.min ? '<span class="tag warn">Reponer</span>' : '<span class="tag ok">OK</span>') + '</td>' +
        '<td><button class="lnk" onclick="X.ajuste(\'' + p.id + '\')">Ajustar</button> · <button class="lnk" onclick="X.kardex(\'' + p.id + '\')">Movimientos</button></td></tr>').join('') : '<tr><td colspan="9" class="empty">Sin productos</td></tr>') +
      '<tr class="tot"><td colspan="6">' + L.length + ' productos</td><td class="r">' + usd(L.reduce((a, p) => a + Math.max(0, sm[p.id]) * p.costo, 0)) + '</td><td colspan="2"></td></tr></tbody></table></div>';
  };
  A.inventario = () => { const q = $('iq'); q.oninput = () => { iq = q.value; const p = q.selectionStart; go(true); const n = $('iq'); n.focus(); n.setSelectionRange(p, p); }; };

  /* --- Compras --- */
  let B = null;
  V.compras = () => {
    if (!B) B = { prov: '', factura: '', fecha: hoy(), cond: 'credito', items: [{ pid: '', cant: '', costo: '' }] };
    const pv = prov(B.prov); const tot = B.items.reduce((a, x) => a + (num(x.cant) || 0) * (num(x.costo) || 0), 0);
    return '<h1>Compras</h1><p class="sub">Registra la factura del proveedor. La mercancía entra al inventario, el costo promedio se recalcula y, si es a crédito, queda en cuentas por pagar.</p>' +
      '<div class="card" style="margin-bottom:12px"><h3>Nueva compra</h3><div class="form" style="grid-template-columns:repeat(4,minmax(0,1fr))"><label class="f">Proveedor<select class="inp" onchange="X.bc(\'prov\',this.value)"><option value="">Elegir…</option>' + S.proveedores.map((p) => '<option value="' + p.id + '"' + (p.id === B.prov ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select></label>' +
      '<label class="f">N° de factura<input class="inp" value="' + esc(B.factura) + '" oninput="X.bc(\'factura\',this.value,1)"></label><label class="f">Fecha<input type="date" class="inp" value="' + B.fecha + '" onchange="X.bc(\'fecha\',this.value)"></label>' +
      '<label class="f">Condición<select class="inp" onchange="X.bc(\'cond\',this.value)"><option value="credito"' + (B.cond === 'credito' ? ' selected' : '') + '>Crédito' + (pv ? ' ' + pv.dias + ' días' : '') + '</option><option value="contado"' + (B.cond === 'contado' ? ' selected' : '') + '>Contado</option></select></label></div>' +
      '<div class="scroll" style="margin-top:12px"><table><thead><tr><th>Producto</th><th class="r">Cantidad</th><th class="r">Costo unit. $</th><th class="r">Subtotal $</th><th></th></tr></thead><tbody>' +
      B.items.map((x, i) => '<tr><td><select class="inp" style="min-width:220px" onchange="X.bl(' + i + ',\'pid\',this.value)"><option value="">Elegir…</option>' + S.productos.filter((p) => p.activo).map((p) => '<option value="' + p.id + '"' + (p.id === x.pid ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select></td><td class="r"><input class="inp num" style="width:90px;text-align:right" inputmode="decimal" value="' + esc(x.cant) + '" onchange="X.bl(' + i + ',\'cant\',this.value)"></td><td class="r"><input class="inp num" style="width:100px;text-align:right" inputmode="decimal" value="' + esc(x.costo) + '" onchange="X.bl(' + i + ',\'costo\',this.value)"></td><td class="r">' + usd((num(x.cant) || 0) * (num(x.costo) || 0)) + '</td><td><button class="x" aria-label="Quitar" onclick="X.bq(' + i + ')">×</button></td></tr>').join('') +
      '<tr class="tot"><td><button class="lnk" onclick="X.bmas()">+ Agregar línea</button></td><td></td><td class="r">Total</td><td class="r">' + usd(tot) + '</td><td></td></tr></tbody></table></div>' +
      '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn sec" onclick="X.blimpiar()">Limpiar</button><button class="btn" onclick="X.comprar()">Registrar compra</button></div></div>' +
      '<div class="card scroll"><h3>Últimas 15 compras</h3>' + tablaDocs(S.compras.slice().reverse().slice(0, 15), 'c') + '</div>';
  };

  V.pagar = () => {
    const h = hoy(); const P = S.compras.filter((c) => !c.anulada && saldo(c) > 0.004).sort((a, b) => a.vence.localeCompare(b.vence));
    const sem = P.filter((c) => c.vence <= addDays(h, 7)); const venc = P.filter((c) => c.vence < h);
    return '<h1>Cuentas por pagar</h1><p class="sub">Lo que le debes a tus proveedores, ordenado por fecha de vencimiento, para planificar los pagos de la semana.</p>' +
      '<div class="kpis">' + kpi(usd(P.reduce((a, c) => a + saldo(c), 0)), 'Total por pagar · ' + P.length + ' facturas') + kpi(usd(venc.reduce((a, c) => a + saldo(c), 0)), 'Vencido', 'var(--bad)') + kpi(usd(sem.reduce((a, c) => a + saldo(c), 0)), 'Vence en los próximos 7 días', 'var(--warn)') +
      kpi(usd(vivas().filter((v) => saldo(v) > 0 && v.vence <= addDays(h, 7)).reduce((a, v) => a + saldo(v), 0)), 'Por cobrar en 7 días (para cubrirlo)', 'var(--ok)') + '</div>' +
      '<div class="card scroll">' + tablaDocs(P, 'c') + '</div>';
  };
  V.proveedores = () => '<h1>Proveedores</h1><p class="sub">Con quién compras, a cuántos días te dan crédito y cuánto les debes.</p><div class="row"><span class="sp"></span><button class="btn" onclick="X.proveedor()">+ Nuevo proveedor</button></div>' +
    '<div class="card scroll"><table><thead><tr><th>Proveedor</th><th>RIF</th><th class="r">Crédito</th><th class="r">Compras 90 días</th><th class="r">Saldo</th><th></th></tr></thead><tbody>' +
    (S.proveedores.length ? S.proveedores.map((p) => { const L = S.compras.filter((c) => c.prov === p.id && !c.anulada); return '<tr><td><b>' + esc(p.nombre) + '</b></td><td>' + esc(p.rif) + '</td><td class="r">' + (p.dias ? p.dias + ' días' : 'Contado') + '</td><td class="r">' + usd(L.filter((c) => c.fecha.slice(0, 10) >= addDays(hoy(), -90)).reduce((a, c) => a + c.total, 0)) + '</td><td class="r">' + usd(L.reduce((a, c) => a + saldo(c), 0)) + '</td><td><button class="lnk" onclick="X.proveedor(\'' + p.id + '\')">Editar</button></td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">Sin proveedores</td></tr>') + '</tbody></table></div>';

  /* --- Costos y equilibrio --- */
  let per = 30;
  V.costos = () => {
    const h = hoy(); const a = analisis(addDays(h, -(per - 1)), h);
    const cfM = fijosMes();
    const rows = Object.entries(a.porP).map(([k, o]) => { const p = prod(k); const pu = o.ventas / o.und, cu = o.costo / o.und + pu * S.varPct / 100; const mcu = pu - cu; return { p, und: o.und, pu, cu, mcu, mcp: mcu / pu, mc: mcu * o.und, mix: o.ventas / a.ventas }; }).sort((x, y) => y.mc - x.mc);
    // gráfico de equilibrio
    const W = 560, H = 240, padL = 50, padB = 28; const xmax = Math.max(a.pe * 1.8 || 1, a.ventas * 1.25, 1); const ymax = Math.max(xmax, a.cf + xmax * (1 - a.mcPct)) * 1.02;
    const X = (v) => padL + v / xmax * (W - padL - 10), Y = (v) => H - padB - v / ymax * (H - padB - 10);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => xmax * f);
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Gráfico de punto de equilibrio" style="font-size:10px">' +
      ticks.map((t) => '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="10" y2="' + (H - padB) + '" stroke="#eef1f5"/><text x="' + X(t) + '" y="' + (H - 10) + '" text-anchor="middle" fill="#667085">' + (t >= 1000 ? Math.round(t / 1000) + 'k' : Math.round(t)) + '</text>').join('') +
      '<polygon points="' + X(0) + ',' + Y(a.cf) + ' ' + X(xmax) + ',' + Y(a.cf + xmax * (1 - a.mcPct)) + ' ' + X(xmax) + ',' + Y(xmax) + '" fill="rgba(46,158,107,.10)"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(a.cf) + '" x2="' + X(xmax) + '" y2="' + Y(a.cf) + '" stroke="#e0a54a" stroke-dasharray="5 4" stroke-width="2"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(a.cf) + '" x2="' + X(xmax) + '" y2="' + Y(a.cf + xmax * (1 - a.mcPct)) + '" stroke="#d4574a" stroke-width="2.5"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(xmax) + '" y2="' + Y(xmax) + '" stroke="#2e9e6b" stroke-width="2.5"/>' +
      (isFinite(a.pe) ? '<circle cx="' + X(a.pe) + '" cy="' + Y(a.pe) + '" r="5" fill="#0b1f3a"/><text x="' + (X(a.pe) - 6) + '" y="' + (Y(a.pe) - 10) + '" text-anchor="end" font-weight="700" fill="#0b1f3a">Equilibrio ' + usd(a.pe) + '</text>' : '') +
      '<line x1="' + X(a.ventas) + '" x2="' + X(a.ventas) + '" y1="10" y2="' + (H - padB) + '" stroke="#0b1f3a" stroke-width="1.5" stroke-dasharray="2 3"/><text x="' + (X(a.ventas) > W * 0.7 ? X(a.ventas) - 4 : X(a.ventas) + 4) + '" y="22" text-anchor="' + (X(a.ventas) > W * 0.7 ? 'end' : 'start') + '" fill="#0b1f3a" font-weight="700">Tus ventas ' + usd(a.ventas) + '</text>' +
      '<line x1="' + padL + '" x2="' + padL + '" y1="10" y2="' + (H - padB) + '" stroke="#98a2b3"/><line x1="' + padL + '" x2="' + (W - 10) + '" y1="' + (H - padB) + '" y2="' + (H - padB) + '" stroke="#98a2b3"/></svg>' +
      '<div class="hint"><span style="color:#2e9e6b">━</span> Ingresos &nbsp; <span style="color:#d4574a">━</span> Costo total (fijo + variable) &nbsp; <span style="color:#e0a54a">┅</span> Costo fijo · eje: ventas en $</div>';
    return '<div class="row" style="align-items:end"><div><h1>Costos y punto de equilibrio</h1><p class="sub" style="margin:0">Cuánto hay que vender para no perder, qué producto deja más y cuánto margen de seguridad tienes.</p></div><span class="sp"></span><label class="f">Período<select class="inp" onchange="X.per(this.value)">' + [[30, 'Últimos 30 días'], [60, 'Últimos 60 días'], [90, 'Últimos 90 días']].map((o) => '<option value="' + o[0] + '"' + (o[0] === per ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>' +
      '<div class="kpis">' + kpi(usd(a.ventas), 'Ventas sin IVA · ' + qty(a.und) + ' unidades') + kpi(pct(a.mcPct), 'Margen de contribución · ' + usd(a.mc), 'var(--ok)') + kpi(isFinite(a.pe) ? usd(a.pe) : '—', 'Punto de equilibrio del período · ' + (isFinite(a.peU) ? nf0.format(Math.ceil(a.peU)) + ' unidades' : '—'), 'var(--brand)') + kpi(pct(a.seg), 'Margen de seguridad: cuánto pueden caer las ventas antes de perder', a.seg < 0.1 ? 'var(--bad)' : 'var(--gold)') + '</div>' +
      '<div class="g2"><div class="card"><h3>Gráfico de equilibrio</h3>' + svg + '</div>' +
      '<div class="card"><h3>Cómo se calcula</h3><table class="calc"><tbody><tr><td>Ventas (sin IVA)</td><td class="r">' + usd(a.ventas) + '</td></tr><tr><td>− Costo de la mercancía vendida</td><td class="r">' + usd(a.cv) + '</td></tr><tr><td>− Otros costos variables (' + qty(S.varPct) + '% de ventas)</td><td class="r">' + usd(a.varOtros) + '</td></tr>' +
      '<tr class="tot"><td>= Margen de contribución</td><td class="r">' + usd(a.mc) + '</td></tr><tr><td>− Costos fijos del período (' + a.dias + ' días)</td><td class="r">' + usd(a.cf) + '</td></tr><tr class="tot"><td>= Utilidad operativa</td><td class="r" style="color:' + (a.util < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + usd(a.util) + '</td></tr></tbody></table>' +
      '<p class="hint" style="margin-bottom:0">Punto de equilibrio = costos fijos ÷ % de margen de contribución = ' + usd(a.cf) + ' ÷ ' + pct(a.mcPct) + ' = <b>' + (isFinite(a.pe) ? usd(a.pe) : '—') + '</b>. En un mes: ' + (a.mcPct > 0 ? usd(cfM / a.mcPct) : '—') + '.</p></div></div>' +
      '<div class="g2"><div class="card"><h3>Margen de contribución por producto</h3><table class="calc"><thead><tr><th>Producto</th><th class="r">MC %</th><th class="r">Aporte total</th></tr></thead><tbody>' +
      (rows.length ? rows.map((r) => '<tr><td><b>' + esc(r.p?.nombre) + '</b><div class="hint">' + qty(r.und) + ' unid. · precio ' + usd(r.pu) + ' − costo ' + usd(r.cu) + ' = MC ' + usd(r.mcu) + '</div></td><td class="r"><span class="tag ' + (r.mcp < 0.15 ? 'bad' : r.mcp < 0.22 ? 'warn' : 'ok') + '">' + pct(r.mcp) + '</span></td><td class="r"><b>' + usd(r.mc) + '</b><div class="hint">' + pct(r.mix) + ' de ventas</div></td></tr>').join('') : '<tr><td colspan="3" class="empty">Sin ventas en el período</td></tr>') + '</tbody></table><p class="hint">El aporte total es lo que cada producto deja para pagar los costos fijos y la ganancia. Un margen bajo con mucho volumen puede aportar más que uno alto que casi no se vende.</p></div>' +
      '<div class="card"><h3>Costos fijos mensuales</h3><table style="table-layout:fixed"><colgroup><col><col style="width:110px"><col style="width:36px"></colgroup><tbody>' + S.fijos.map((f) => '<tr><td style="padding-left:0"><input class="inp" value="' + esc(f.nombre) + '" onchange="X.fijo(\'' + f.id + '\',\'nombre\',this.value)"></td><td class="r"><input class="inp num" style="width:100%;text-align:right" inputmode="decimal" value="' + f.monto + '" onchange="X.fijo(\'' + f.id + '\',\'monto\',this.value)"></td><td><button class="x" aria-label="Quitar" onclick="X.quitarFijo(\'' + f.id + '\')">×</button></td></tr>').join('') +
      '<tr class="tot"><td>Total al mes</td><td class="r">' + usd(cfM) + '</td><td></td></tr></tbody></table><div class="row" style="margin:10px 0 0"><button class="lnk" onclick="X.nuevoFijo()">+ Agregar costo fijo</button><span class="sp"></span><label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px">Otros variables %<input class="inp num" style="width:64px;text-align:right" inputmode="decimal" value="' + S.varPct + '" onchange="X.varPct(this.value)"></label></div><p class="hint" style="margin-bottom:0">Costos variables "otros": comisiones, empaques, delivery; se calculan como % de las ventas.</p></div></div>';
  };

  /* --- Estado de resultados --- */
  let erMes = null;
  function er(ym) {
    const h = hoy(); const fin = ym === h.slice(0, 7) ? h : addDays(addMes(ym, 1) + '-01', -1);
    const a = analisis(ym + '-01', fin); const diasMes = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
    const prop = ym === h.slice(0, 7) ? +h.slice(8) / diasMes : 1;
    const fijos = S.fijos.map((f) => [f.nombre, (+f.monto || 0) * prop]); const cf = fijos.reduce((s, f) => s + f[1], 0);
    return { ym, a, fijos, cf, bruta: a.ventas - a.cv, op: a.ventas - a.cvt - cf, prop };
  }
  V.resultados = () => {
    erMes = erMes || hoy().slice(0, 7); const m = er(erMes), p = er(addMes(erMes, -1));
    const meses = [...new Set(S.ventas.map((v) => v.fecha.slice(0, 7)))].sort().reverse();
    const fila = (t, x, y, base, b) => '<tr' + (b ? ' class="tot"' : '') + '><td class="wrap">' + t + '</td><td class="r">' + usd(x) + '</td><td class="r hint hm">' + (base.a.ventas ? pct(x / base.a.ventas) : '') + '</td><td class="r hm">' + usd(y) + '</td><td class="r">' + (y ? '<span style="color:' + ((x - y) / Math.abs(y) >= 0 ? 'var(--ok)' : 'var(--bad)') + '">' + ((x - y) >= 0 ? '+' : '') + pct((x - y) / Math.abs(y)) + '</span>' : '') + '</td></tr>';
    return '<div class="row" style="align-items:end"><div><h1>Estado de resultados</h1><p class="sub" style="margin:0">Ventas, costos y utilidad del mes, comparado con el mes anterior.' + (m.prop < 1 ? ' El mes en curso incluye costos fijos proporcionales a los días transcurridos.' : '') + '</p></div><span class="sp"></span><label class="f">Mes<select class="inp" onchange="X.erMes(this.value)">' + meses.map((x) => '<option value="' + x + '"' + (x === erMes ? ' selected' : '') + '>' + nomMes(x) + '</option>').join('') + '</select></label></div>' +
      '<div class="kpis">' + kpi(usd(m.a.ventas), 'Ventas netas') + kpi(usd(m.bruta), 'Utilidad bruta · ' + pct(m.a.ventas ? m.bruta / m.a.ventas : 0), 'var(--brand2)') + kpi(usd(m.op), 'Utilidad operativa · ' + pct(m.a.ventas ? m.op / m.a.ventas : 0), m.op < 0 ? 'var(--bad)' : 'var(--ok)') + kpi(usd(m.a.ventas ? m.a.ventas / Math.max(1, m.a.L.length) : 0), 'Venta promedio por factura', 'var(--gold)') + '</div>' +
      '<div class="card" style="max-width:820px"><table class="calc"><thead><tr><th></th><th class="r">' + nomMes(m.ym) + '</th><th class="r hm">% ventas</th><th class="r hm">' + nomMes(p.ym) + '</th><th class="r">Variación</th></tr></thead><tbody>' +
      fila('Ventas netas (sin IVA)', m.a.ventas, p.a.ventas, m, true) + fila('− Costo de la mercancía vendida', m.a.cv, p.a.cv, m) + fila('= Utilidad bruta', m.bruta, p.bruta, m, true) + fila('− Otros costos variables', m.a.varOtros, p.a.varOtros, m) +
      fila('= Margen de contribución', m.a.mc, p.a.mc, m, true) + m.fijos.map((f, i) => fila('&nbsp;&nbsp;&nbsp;− ' + esc(f[0]), f[1], p.fijos[i][1], m)).join('') + fila('− Total costos fijos', m.cf, p.cf, m) + fila('= Utilidad operativa', m.op, p.op, m, true) + '</tbody></table></div>';
  };

  /* --- Simulador --- */
  let sim = { precio: 0, volumen: 0, costo: 0, fijos: 0 };
  V.simulador = () => '<h1>Simulador</h1><p class="sub">¿Qué pasa si…? Mueve los controles y mira cómo cambian la utilidad y el punto de equilibrio. Base: los últimos 30 días. No cambia tus datos.</p>' +
    '<div class="g2 sim"><div class="card"><h3>Supuestos</h3>' + [['precio', 'Precio de venta'], ['volumen', 'Unidades vendidas'], ['costo', 'Costo de la mercancía'], ['fijos', 'Costos fijos']].map((x) => '<label class="f" style="margin:10px 0">' + x[1] + ' <b id="l-' + x[0] + '"></b><input type="range" min="-30" max="30" step="1" value="' + sim[x[0]] + '" oninput="X.sim(\'' + x[0] + '\',this.value)" style="width:100%;accent-color:var(--acc)"></label>').join('') +
    '<div class="row" style="margin:6px 0 0"><button class="btn sm sec" onclick="X.simReset()">Volver a cero</button><button class="btn sm sec" onclick="X.simPreset(1)">Subo precio 5% y vendo 3% menos</button><button class="btn sm sec" onclick="X.simPreset(2)">Proveedor sube 8%</button></div></div><div class="card" id="simres"></div></div>';
  A.simulador = () => pintarSim();
  function pintarSim() {
    const h = hoy(); const a = analisis(addDays(h, -29), h);
    const k = { p: 1 + sim.precio / 100, v: 1 + sim.volumen / 100, c: 1 + sim.costo / 100, f: 1 + sim.fijos / 100 };
    const ventas = a.ventas * k.p * k.v, cv = a.cv * k.c * k.v, otros = ventas * S.varPct / 100, cf = a.cf * k.f, mc = ventas - cv - otros, mcp = ventas ? mc / ventas : 0, pe = mcp > 0 ? cf / mcp : Infinity, util = mc - cf;
    ['precio', 'volumen', 'costo', 'fijos'].forEach((x) => ($('l-' + x).textContent = (sim[x] > 0 ? '+' : '') + sim[x] + '%'));
    const d = (x, y, inv) => { const df = x - y; if (Math.abs(df) < 0.005) return ''; const bueno = inv ? df < 0 : df > 0; return '<div style="color:' + (bueno ? 'var(--ok)' : 'var(--bad)') + ';font-size:11px">' + (df > 0 ? '+' : '') + usd(df) + '</div>'; };
    $('simres').innerHTML = '<h3>Resultado (30 días)</h3><div><table class="calc"><thead><tr><th></th><th class="r">Hoy</th><th class="r">Con los cambios</th></tr></thead><tbody>' +
      '<tr><td>Ventas</td><td class="r">' + usd(a.ventas) + '</td><td class="r">' + usd(ventas) + d(ventas, a.ventas) + '</td></tr><tr><td>Costos variables</td><td class="r">' + usd(a.cvt) + '</td><td class="r">' + usd(cv + otros) + d(cv + otros, a.cvt, 1) + '</td></tr>' +
      '<tr><td>Margen de contribución</td><td class="r">' + pct(a.mcPct) + '</td><td class="r">' + pct(mcp) + '</td></tr><tr><td>Costos fijos</td><td class="r">' + usd(a.cf) + '</td><td class="r">' + usd(cf) + d(cf, a.cf, 1) + '</td></tr>' +
      '<tr><td>Punto de equilibrio</td><td class="r">' + (isFinite(a.pe) ? usd(a.pe) : '—') + '</td><td class="r">' + (isFinite(pe) ? usd(pe) + d(pe, a.pe, 1) : '—') + '</td></tr><tr class="tot"><td>Utilidad operativa</td><td class="r">' + usd(a.util) + '</td><td class="r" style="color:' + (util < 0 ? 'var(--bad)' : 'inherit') + '">' + usd(util) + d(util, a.util) + '</td></tr></tbody></table></div>' +
      '<p style="margin:12px 0 0">' + (Math.abs(util - a.util) < 0.5 ? 'Mueve un control para ver el efecto.' : util > a.util ? 'Con estos cambios ganarías <b>' + usd(util - a.util) + '</b> más cada 30 días.' : 'Con estos cambios ganarías <b>' + usd(a.util - util) + '</b> menos cada 30 días.') + (sim.precio > 0 && a.mcPct > 0 ? ' Con un ' + sim.precio + '% más de precio podrías vender hasta <b>' + pct(1 - a.mcPct / (a.mcPct + sim.precio / 100 * (1))) + '</b> menos de unidades y ganar lo mismo.' : '') + '</p>';
  }

  V.config = () => '<h1>Configuración</h1><p class="sub">Datos de la empresa, impuestos, tasa y respaldo.</p><div class="g2e"><div class="card"><h3>Empresa</h3><div class="form"><label class="f full">Razón social<input class="inp" id="ce" value="' + esc(S.empresa) + '"></label><label class="f">RIF<input class="inp" id="cr" value="' + esc(S.rif) + '"></label><label class="f">IVA %<input class="inp num" id="ci" inputmode="decimal" value="' + S.iva + '"></label><label class="f bs">Tasa (Bs por $)<input class="inp num" id="ct" inputmode="decimal" value="' + S.tasa + '"></label></div><div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="X.guardarCfg()">Guardar</button></div></div>' +
    '<div class="card"><h3>Respaldo</h3><p class="hint" style="margin-top:0">Tus datos viven solo en este navegador y en este equipo. <b>Si abres la app en tu teléfono o en otra computadora, no vas a ver lo que registraste aquí.</b> Para pasarlos: descarga el respaldo aquí y, en el otro equipo, toca «Cargar respaldo».</p><div class="row"><button class="btn sec" onclick="X.respaldo()">Descargar respaldo (.json)</button><label class="btn sec">Cargar respaldo<input type="file" accept=".json,application/json" hidden onchange="X.restaurar(this.files[0])"></label></div>' +
    '<h3 style="margin-top:16px">Empezar de nuevo</h3><div class="row"><button class="btn sec" onclick="X.reset(\'demo\')">Volver a los datos ficticios</button><button class="btn danger" onclick="X.reset(\'vacio\')">Empezar en blanco</button></div></div></div>';

  /* ---------- acciones ---------- */
  const X = window.X = {
    cerrar,
    tasa() { dlg('Tasa del día', '<label class="f">Bolívares por 1 $<input class="inp num" id="nt" inputmode="decimal" value="' + S.tasa + '"></label><p class="hint">Las facturas nuevas usan esta tasa. Las ya emitidas guardan la suya.</p>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.setTasa()">Guardar</button>'); },
    setTasa() { const t = num($('nt').value); if (!(t > 0)) return toast('Tasa inválida', true); if (r2(t) !== S.tasa && window.PRBTasa) PRBTasa.manual(S); S.tasa = r2(t); S.tasaFecha = hoy(); save(); cerrar(); go(true); toast('Tasa actualizada'); },
    kadd(pid, cant) {
      cant = cant > 0 ? r2(cant) : 1; const sm = stockMap(); const p = prod(pid); const x = K.items.find((i) => i.pid === pid);
      if ((x ? x.cant : 0) + cant > sm[pid]) return toast('Solo hay ' + qty(sm[pid]) + ' de ' + p.nombre, true);
      if (x) { x.cant = r2(x.cant + cant); K.items.splice(K.items.indexOf(x), 1); K.items.push(x); } else K.items.push({ pid, cant, precio: H.precio(p, '') });
      K.ult = pid; K.q = ''; K.sel = 0; const q = $('kq'); if (q) { q.value = ''; $('ksug').innerHTML = ''; q.focus(); } pintarK();
    },
    kmas(i, d) { const x = K.items[i]; const sm = stockMap(); const n = r2(x.cant + d); if (n <= 0) K.items.splice(i, 1); else if (n > sm[x.pid]) return toast('No hay más existencia', true); else x.cant = n; K.ult = null; pintarK(); $('kq')?.focus(); },
    kvaciar() { K.items = []; K.pagando = false; pintarK(); $('kq')?.focus(); },
    kcobrar() { if (!K.items.length) return; K.pagando = true; K.recibido = ''; pintarK(); },
    kvolver() { K.pagando = false; pintarK(); $('kq')?.focus(); },
    kpago(p) { K.pago = p; K.recibido = ''; pintarK(); },
    kconfirmar() {
      const t = totK(); const enBs = K.pago === 'Efectivo Bs'; const rec = num(K.recibido); const tot = enBs ? t.total * S.tasa : t.total;
      if (esEf(K.pago) && isFinite(rec) && rec < tot - 0.004) return toast('El monto recibido no alcanza', true);
      const sm = stockMap(); for (const x of K.items) if (x.cant > sm[x.pid]) return toast('Existencia insuficiente: ' + prod(x.pid).nombre, true);
      const v = armarVenta(S, { fecha: isoTime(new Date()), cli: '', cond: 'contado', dias: 0, tasa: S.tasa, items: K.items.map((x) => ({ pid: x.pid, cant: x.cant, precio: x.precio, costo: prod(x.pid).costo, exento: !!prod(x.pid).exento })) });
      v.caja = true; v.abonos.push({ id: uid(), fecha: hoy(), monto: v.total, pago: K.pago }); S.ventas.push(v); save();
      const vuelto = isFinite(rec) && esEf(K.pago) ? rec - tot : 0;
      K = { items: [], q: '', sel: 0, ult: null, pagando: false, pago: K.pago, recibido: '' }; go(true);
      toast('Venta ' + nfac(v.num) + ' lista' + (vuelto > 0.004 ? ' · vuelto ' + (enBs ? bs(vuelto) : usd(vuelto)) : ''));
    },
    // facturar
    agregar(pid) { const sm = stockMap(); const x = F.items.find((i) => i.pid === pid); const p = prod(pid); if ((x ? x.cant : 0) + 1 > sm[pid]) return toast('No hay más existencia de ' + p.nombre, true); if (x) x.cant++; else F.items.push({ pid, cant: 1, precio: H.precio(p, F.cli) }); pintarCart(); pintarCat(); },
    fcant(i, v) { const n = num(v); const x = F.items[i]; const sm = stockMap(); if (!(n > 0)) F.items.splice(i, 1); else if (n > sm[x.pid]) { x.cant = sm[x.pid]; toast('Solo hay ' + qty(sm[x.pid]), true); } else x.cant = r2(n); pintarCart(); pintarCat(); },
    fquitar(i) { F.items.splice(i, 1); pintarCart(); pintarCat(); },
    fvaciar() { F.items = []; pintarCart(); pintarCat(); },
    fset(k, v) { F[k] = v; if (k === 'cli') { const c = cli(v); F.cond = c && c.dias > 0 ? 'credito' : 'contado'; } pintarCart(); },
    facturarOk() {
      if (!F.items.length) return; const sm = stockMap();
      for (const x of F.items) if (x.cant > sm[x.pid]) return toast('Existencia insuficiente: ' + prod(x.pid).nombre, true);
      const c = cli(F.cli); const cond = c && c.dias > 0 ? F.cond : 'contado';
      const v = armarVenta(S, { fecha: isoTime(new Date()), cli: F.cli, cond, dias: c ? c.dias : 0, tasa: S.tasa, items: F.items.map((x) => ({ pid: x.pid, cant: x.cant, precio: x.precio, costo: prod(x.pid).costo, exento: !!prod(x.pid).exento })) });
      if (cond === 'contado') v.abonos.push({ id: uid(), fecha: hoy(), monto: v.total, pago: F.pago });
      S.ventas.push(v); save(); F = { items: [], cli: '', cond: 'contado', pago: F.pago, q: '' }; go(); X.verFactura(v.id); toast('Factura ' + nfac(v.num) + ' emitida');
    },
    verFactura(id) {
      const v = S.ventas.find((x) => x.id === id); const c = cli(v.cli);
      dlg('Factura N° ' + nfac(v.num), '<div id="doc"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px"><div><b>' + esc(S.empresa) + '</b><div class="hint">RIF ' + esc(S.rif) + '</div></div><div style="text-align:right"><b>Factura ' + nfac(v.num) + '</b><div class="hint">' + fdia(v.fecha) + ' ' + fhora(v.fecha) + '</div></div></div>' +
        '<p style="margin:0 0 8px">Cliente: <b>' + esc(cliNom(v.cli)) + '</b>' + (c ? ' · RIF ' + esc(c.rif) : '') + '<br>Condición: ' + (v.cond === 'credito' ? 'Crédito, vence ' + fdia(v.vence) : 'Contado') + '</p>' +
        '<table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">Total</th></tr></thead><tbody>' + v.items.map((x) => '<tr><td class="wrap">' + esc(prod(x.pid)?.nombre) + (x.exento ? ' (E)' : '') + '</td><td class="r">' + qty(x.cant) + '</td><td class="r">' + usd(x.precio) + '</td><td class="r">' + usd(x.cant * x.precio) + '</td></tr>').join('') +
        '<tr><td colspan="3">Base imponible</td><td class="r">' + usd(v.grav) + '</td></tr><tr><td colspan="3">Exento</td><td class="r">' + usd(v.sub - v.grav) + '</td></tr><tr><td colspan="3">IVA ' + S.iva + '%</td><td class="r">' + usd(v.iva) + '</td></tr><tr class="tot"><td colspan="3">Total $</td><td class="r">' + usd(v.total) + '</td></tr><tr class="tot bs"><td colspan="3">Total Bs (tasa ' + nf2.format(v.tasa) + ')</td><td class="r">' + bs(v.total * v.tasa) + '</td></tr></tbody></table>' +
        (v.abonos.length ? '<h3 style="margin-top:14px">Pagos</h3><table><tbody>' + v.abonos.map((a) => '<tr><td>' + fdia(a.fecha) + '</td><td>' + esc(a.pago) + '</td><td class="r">' + usd(a.monto) + '</td></tr>').join('') + '<tr class="tot"><td colspan="2">Saldo</td><td class="r">' + usd(saldo(v)) + '</td></tr></tbody></table>' : '') + (v.anulada ? '<p><b style="color:var(--bad)">FACTURA ANULADA</b></p>' : '') + '</div>',
        (!v.anulada && !v.abonos.length ? '<button class="btn danger" style="margin-right:auto" onclick="X.anular(\'' + id + '\')">Anular</button>' : '') + H.facturaBtns.map((f) => f(v)).join('') + '<button class="btn sec" onclick="X.imprimir()">Imprimir</button>' + (!v.anulada && saldo(v) > 0 ? '<button class="btn" onclick="X.abonar(\'' + id + '\')">Registrar cobro</button>' : '<button class="btn" onclick="X.cerrar()">Listo</button>'), 620);
    },
    imprimir() { const w = window.open('', '_blank', 'width=720,height=800'); if (!w) return toast('Permite ventanas emergentes para imprimir', true); w.document.write('<title>Documento</title><link rel="stylesheet" href="' + new URL('../assets/prb.css', location.href) + '"><body style="background:#fff;padding:24px">' + $('doc').innerHTML + '<script>setTimeout(()=>print(),400)<\/script>'); w.document.close(); },
    anular(id) { dlg('Anular factura', '<p>La mercancía vuelve al inventario y la factura deja de contar en ventas y cuentas por cobrar.</p>', '<button class="btn sec" onclick="X.cerrar()">No</button><button class="btn danger" onclick="X.okAnular(\'' + id + '\')">Sí, anular</button>'); },
    okAnular(id) { S.ventas.find((x) => x.id === id).anulada = true; save(); cerrar(); go(true); toast('Factura anulada'); },
    abonar(id) {
      const v = S.ventas.find((x) => x.id === id);
      dlg('Cobrar factura ' + nfac(v.num), '<p class="hint" style="margin-top:0">' + esc(cliNom(v.cli)) + ' · total ' + usd(v.total) + ' · saldo <b>' + usd(saldo(v)) + '</b></p><div class="form"><label class="f">Monto $<input class="inp num" id="am" inputmode="decimal" value="' + saldo(v) + '"></label><label class="f">Forma de pago<select class="inp" id="ap">' + PAGOS.map((p) => '<option>' + p + '</option>').join('') + '</select></label><label class="f">Fecha<input type="date" class="inp" id="af" value="' + hoy() + '"></label></div>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okAbono(\'' + id + '\')">Registrar cobro</button>');
    },
    okAbono(id) { const v = S.ventas.find((x) => x.id === id); const m = num($('am').value); if (!(m > 0)) return toast('Monto inválido', true); if (m > saldo(v) + 0.005) return toast('El monto es mayor que el saldo (' + usd(saldo(v)) + ')', true); v.abonos.push({ id: uid(), fecha: $('af').value || hoy(), monto: r2(m), pago: $('ap').value }); save(); cerrar(); go(true); toast(saldo(v) <= 0 ? 'Factura pagada completa' : 'Abono registrado · queda ' + usd(saldo(v))); },
    estadoCuenta(cid) {
      const c = cli(cid); const L = vivas().filter((v) => v.cli === cid); const M = [];
      L.forEach((v) => { M.push([v.fecha.slice(0, 10), 'Factura ' + nfac(v.num) + (v.cond === 'credito' ? ' · vence ' + fdia(v.vence) : ''), v.total, 0]); v.abonos.forEach((a) => M.push([a.fecha, 'Pago ' + a.pago + ' · fact. ' + nfac(v.num), 0, a.monto])); });
      M.sort((a, b) => a[0].localeCompare(b[0]) || b[2] - a[2]); let s = 0; const R = M.map((m) => { s = r2(s + m[2] - m[3]); return m.concat(s); });
      dlg('Estado de cuenta · ' + esc(c ? c.nombre : cliNom(cid)), '<div id="doc"><p style="margin-top:0"><b>' + esc(S.empresa) + '</b> · estado de cuenta de <b>' + esc(c ? c.nombre : '') + '</b> ' + (EN ? 'as of ' : 'al ') + fdia(hoy()) + '</p><div class="scroll"><table><thead><tr><th>Fecha</th><th>Concepto</th><th class="r">Cargo</th><th class="r">Abono</th><th class="r">Saldo</th></tr></thead><tbody>' +
        R.slice(-40).map((r) => '<tr><td>' + fdia(r[0]) + '</td><td class="wrap">' + esc(r[1]) + '</td><td class="r">' + (r[2] ? usd(r[2]) : '') + '</td><td class="r">' + (r[3] ? usd(r[3]) : '') + '</td><td class="r">' + usd(r[4]) + '</td></tr>').join('') + '<tr class="tot"><td colspan="4">Saldo actual</td><td class="r">' + usd(s) + '</td></tr></tbody></table></div>' + (R.length > 40 ? '<p class="hint">Últimos 40 movimientos.</p>' : '') + '</div>',
        '<button class="btn sec" onclick="X.imprimir()">Imprimir</button><button class="btn" onclick="X.cerrar()">Listo</button>', 680);
    },
    cliente(id) {
      const c = id ? cli(id) : { nombre: '', rif: '', dias: 0 };
      dlg(id ? 'Editar cliente' : 'Nuevo cliente', '<div class="form"><label class="f full">Nombre o razón social<input class="inp" id="kn" value="' + esc(c.nombre) + '"></label><label class="f">RIF / C.I.<input class="inp" id="kr" value="' + esc(c.rif) + '"></label><label class="f">Días de crédito (0 = contado)<input class="inp num" id="kd" inputmode="numeric" value="' + c.dias + '"></label></div>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.guardarCli(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardarCli(id) { const n = $('kn').value.trim(); if (!n) return toast('Falta el nombre', true); const d = { nombre: n, rif: $('kr').value.trim(), dias: Math.max(0, Math.round(num($('kd').value) || 0)) }; if (id) Object.assign(cli(id), d); else S.clientes.push(Object.assign({ id: uid() }, d)); save(); cerrar(); go(true); toast('Cliente guardado'); },
    proveedor(id) {
      const c = id ? prov(id) : { nombre: '', rif: '', dias: 0 };
      dlg(id ? 'Editar proveedor' : 'Nuevo proveedor', '<div class="form"><label class="f full">Nombre o razón social<input class="inp" id="kn" value="' + esc(c.nombre) + '"></label><label class="f">RIF<input class="inp" id="kr" value="' + esc(c.rif) + '"></label><label class="f">Días de crédito<input class="inp num" id="kd" inputmode="numeric" value="' + c.dias + '"></label></div>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.guardarProv(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardarProv(id) { const n = $('kn').value.trim(); if (!n) return toast('Falta el nombre', true); const d = { nombre: n, rif: $('kr').value.trim(), dias: Math.max(0, Math.round(num($('kd').value) || 0)) }; if (id) Object.assign(prov(id), d); else S.proveedores.push(Object.assign({ id: uid() }, d)); save(); cerrar(); go(true); toast('Proveedor guardado'); },
    ff(k, v) { if (k === 'd') fD = v; if (k === 'h') fH = v; if (k === 'e') fEst = v; go(true); },
    csvFacturas() {
      const rows = [['Factura', 'Fecha', 'Cliente', 'Condicion', 'Vence', 'Base imponible', 'Exento', 'IVA', 'Total $', 'Tasa', 'Total Bs', 'Cobrado', 'Saldo', 'Anulada']];
      S.ventas.filter((v) => { const d = v.fecha.slice(0, 10); return d >= fD && d <= fH; }).forEach((v) => rows.push([nfac(v.num), v.fecha.slice(0, 10), cliNom(v.cli), v.cond, v.vence, v.grav, r2(v.sub - v.grav), v.iva, v.total, v.tasa, r2(v.total * v.tasa), pagado(v), saldo(v), v.anulada ? 'Sí' : 'No']));
      bajar('facturas-' + fD + '-a-' + fH + '.csv', csv(rows), 'text/csv');
    },
    csvInv() { const sm = stockMap(); const rows = [['Codigo', 'Producto', 'Categoria', 'IVA', 'Existencia', 'Minimo', 'Costo $', 'Precio $', 'Valor a costo $']]; S.productos.forEach((p) => rows.push([p.cod, p.nombre, p.cat, p.exento ? 'Exento' : S.iva + '%', sm[p.id], p.min, p.costo, p.precio, r2(Math.max(0, sm[p.id]) * p.costo)])); bajar('inventario-' + hoy() + '.csv', csv(rows), 'text/csv'); },
    // inventario
    producto(id) {
      const p = id ? prod(id) : { cod: '', nombre: '', cat: '', unidad: 'Unidad', costo: '', precio: '', min: 5, exento: false, activo: true };
      dlg(id ? 'Editar producto' : 'Nuevo producto', '<div class="form"><label class="f">Código<input class="inp" id="pc" value="' + esc(p.cod) + '"></label><label class="f">Categoría<input class="inp" id="pk" value="' + esc(p.cat) + '"></label><label class="f full">Nombre<input class="inp" id="pn" value="' + esc(p.nombre) + '"></label>' +
        '<label class="f">Costo $<input class="inp num" id="pco" inputmode="decimal" value="' + p.costo + '"></label><label class="f">Precio sin IVA $<input class="inp num" id="ppr" inputmode="decimal" value="' + p.precio + '"></label><label class="f">Existencia mínima<input class="inp num" id="pm" inputmode="decimal" value="' + p.min + '"></label>' +
        (id ? '<label class="f">Estado<select class="inp" id="pa"><option value="1"' + (p.activo ? ' selected' : '') + '>Activo</option><option value="0"' + (p.activo ? '' : ' selected') + '>Inactivo</option></select></label>' : '<label class="f">Existencia inicial<input class="inp num" id="pi" inputmode="decimal" value="0"></label>') +
        '<label class="f full" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="pe"' + (p.exento ? ' checked' : '') + '> Exento de IVA</label><div class="full hint" id="pmg"></div></div>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.guardarProd(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
      const mg = () => { const c = num($('pco').value), pr = num($('ppr').value); $('pmg').textContent = c > 0 && pr > 0 ? 'Margen ' + pct((pr - c) / pr) + ' · margen de contribución por unidad ' + usd(pr - c - pr * S.varPct / 100) : ''; }; $('pco').oninput = mg; $('ppr').oninput = mg; mg();
    },
    guardarProd(id) {
      const d = { cod: $('pc').value.trim(), barras: $('pb').value.trim(), nombre: $('pn').value.trim(), cat: $('pk').value.trim() || 'General', min: num($('pm').value), costo: num($('pco').value), precio: num($('ppr').value), exento: $('pe').checked };
      if (!d.nombre) return toast('Falta el nombre', true); if (!(d.precio > 0) || !(d.costo >= 0)) return toast('Revisa el costo y el precio', true); if (!(d.min >= 0)) d.min = 0;
      if (!d.cod) d.cod = d.cat.slice(0, 3).toUpperCase() + '-' + String(S.productos.length + 1).padStart(2, '0');
      if (S.productos.some((p) => p.cod.toLowerCase() === d.cod.toLowerCase() && p.id !== id)) return toast('Ya existe ese código', true);
      d.costo = r2(d.costo); d.precio = r2(d.precio);
      if (id) Object.assign(prod(id), d, { activo: $('pa').value === '1' }); else { const i = num($('pi').value); S.productos.push(Object.assign({ id: uid(), unidad: 'Unidad', inicial: i > 0 ? i : 0, activo: true }, d)); }
      save(); cerrar(); go(true); toast('Producto guardado');
    },
    ajuste(id) {
      const p = prod(id); const st = stockMap()[id];
      dlg('Ajustar · ' + esc(p.nombre), '<p class="hint" style="margin-top:0">Existencia en sistema: <b>' + qty(st) + '</b></p><div class="form"><label class="f">Motivo<select class="inp" id="am">' + MOTIVOS.map((m) => '<option>' + m + '</option>').join('') + '</select></label><label class="f" id="al">Cantidad a sacar<input class="inp num" id="ac" inputmode="decimal"></label><label class="f full">Nota<input class="inp" id="an"></label><div class="full hint" id="ar"></div></div>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okAjuste(\'' + id + '\')">Registrar ajuste</button>');
      const upd = () => { const m = $('am').value; $('al').firstChild.textContent = m === 'Conteo físico' ? 'Cantidad contada' : m === 'Corrección' ? 'Cantidad (+ suma, − resta)' : 'Cantidad a sacar'; const d = calcAj(m, num($('ac').value), st); $('ar').textContent = isFinite(d) ? 'Movimiento ' + (d > 0 ? '+' : '') + qty(d) + ' → nueva existencia ' + qty(st + d) + ' · impacto ' + usd(d * p.costo) : ''; };
      $('am').onchange = upd; $('ac').oninput = upd;
    },
    okAjuste(id) { const st = stockMap()[id]; const m = $('am').value; const d = r2(calcAj(m, num($('ac').value), st)); if (!isFinite(d) || d === 0) return toast('Escribe una cantidad', true); if (st + d < 0) return toast('La existencia no puede quedar negativa', true); S.ajustes.push({ id: uid(), fecha: isoTime(new Date()), pid: id, cant: d, motivo: m, nota: $('an').value.trim() }); save(); cerrar(); go(true); toast('Ajuste registrado'); },
    kardex(id) {
      const p = prod(id); const M = [];
      S.compras.forEach((c) => !c.anulada && c.items.forEach((x) => x.pid === id && M.push([c.fecha, 'Compra ' + String(c.num).padStart(4, '0') + ' · ' + (prov(c.prov)?.nombre || ''), x.cant])));
      S.ventas.forEach((v) => !v.anulada && v.items.forEach((x) => x.pid === id && M.push([v.fecha, 'Factura ' + nfac(v.num) + ' · ' + cliNom(v.cli), -x.cant])));
      S.ajustes.forEach((a) => a.pid === id && M.push([a.fecha, 'Ajuste · ' + a.motivo, a.cant]));
      M.sort((a, b) => a[0].localeCompare(b[0])); let s = +p.inicial || 0; const R = M.map((m) => { s = r2(s + m[2]); return m.concat(s); });
      dlg('Movimientos · ' + esc(p.nombre), '<div class="scroll"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th class="r">Cant.</th><th class="r">Saldo</th></tr></thead><tbody>' + R.slice(-50).reverse().map((r) => '<tr><td>' + fdia(r[0]) + '</td><td class="wrap">' + esc(r[1]) + '</td><td class="r" style="color:' + (r[2] < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (r[2] > 0 ? '+' : '') + qty(r[2]) + '</td><td class="r">' + qty(r[3]) + '</td></tr>').join('') + '<tr><td></td><td>Existencia inicial</td><td></td><td class="r">' + qty(p.inicial || 0) + '</td></tr></tbody></table></div>', null, 620);
    },
    // compras
    bc(k, v, sinRender) { B[k] = v; if (k === 'prov') { const p = prov(v); B.cond = p && p.dias > 0 ? 'credito' : 'contado'; } if (!sinRender) go(true); },
    bl(i, k, v) { const x = B.items[i]; x[k] = v; if (k === 'pid' && v && !x.costo) x.costo = prod(v).costo; if (i === B.items.length - 1 && x.pid) B.items.push({ pid: '', cant: '', costo: '' }); go(true); },
    bq(i) { B.items.splice(i, 1); if (!B.items.length) B.items.push({ pid: '', cant: '', costo: '' }); go(true); },
    bmas() { B.items.push({ pid: '', cant: '', costo: '' }); go(true); },
    blimpiar() { B = null; go(true); },
    comprar() {
      const L = B.items.filter((x) => x.pid || x.cant); if (!B.prov) return toast('Elige el proveedor', true); if (!L.length) return toast('Agrega al menos un producto', true);
      for (const x of L) { if (!x.pid) return toast('Hay una línea sin producto', true); if (!(num(x.cant) > 0)) return toast('Cantidad inválida', true); if (!(num(x.costo) >= 0)) return toast('Costo inválido', true); }
      const sm = stockMap(); const items = L.map((x) => ({ pid: x.pid, cant: r2(num(x.cant)), costo: r2(num(x.costo)) }));
      items.forEach((x) => { const p = prod(x.pid); const st = Math.max(0, sm[x.pid]); p.costo = r2((st * p.costo + x.cant * x.costo) / (st + x.cant)); sm[x.pid] = st + x.cant; });
      const pv = prov(B.prov); const tot = r2(items.reduce((a, x) => a + x.cant * x.costo, 0));
      const c = { id: uid(), num: S.seq.compra++, fecha: B.fecha + 'T' + isoTime(new Date()).slice(11), prov: B.prov, factura: B.factura.trim(), cond: B.cond, vence: addDays(B.fecha, B.cond === 'credito' ? pv.dias : 0), items, total: tot, pagos: [], anulada: false };
      if (B.cond === 'contado') c.pagos.push({ id: uid(), fecha: B.fecha, monto: tot, pago: TRF });
      S.compras.push(c); save(); B = null; go(true); toast('Compra registrada: ' + usd(tot) + (c.cond === 'credito' ? ' · vence ' + fdia(c.vence) : ''));
    },
    verCompra(id) {
      const c = S.compras.find((x) => x.id === id);
      dlg('Compra ' + String(c.num).padStart(4, '0'), '<div id="doc"><p style="margin-top:0">' + esc(prov(c.prov)?.nombre) + ' · factura ' + esc(c.factura || '—') + ' · ' + fdia(c.fecha) + '<br>' + (c.cond === 'credito' ? 'Crédito, vence ' + fdia(c.vence) : 'Contado') + (c.anulada ? ' · <b style="color:var(--bad)">ANULADA</b>' : '') + '</p><table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Costo</th><th class="r">Subtotal</th></tr></thead><tbody>' +
        c.items.map((x) => '<tr><td class="wrap">' + esc(prod(x.pid)?.nombre) + '</td><td class="r">' + qty(x.cant) + '</td><td class="r">' + usd(x.costo) + '</td><td class="r">' + usd(x.cant * x.costo) + '</td></tr>').join('') + '<tr class="tot"><td colspan="3">Total</td><td class="r">' + usd(c.total) + '</td></tr>' +
        c.pagos.map((p) => '<tr><td colspan="3">Pago ' + fdia(p.fecha) + ' · ' + esc(p.pago) + '</td><td class="r">−' + usd(p.monto) + '</td></tr>').join('') + '<tr class="tot"><td colspan="3">Saldo</td><td class="r">' + usd(saldo(c)) + '</td></tr></tbody></table></div>',
        (!c.anulada && !c.pagos.length ? '<button class="btn danger" style="margin-right:auto" onclick="X.anularCompra(\'' + id + '\')">Anular</button>' : '') + (!c.anulada && saldo(c) > 0 ? '<button class="btn" onclick="X.pagarCompra(\'' + id + '\')">Registrar pago</button>' : '<button class="btn" onclick="X.cerrar()">Listo</button>'), 600);
    },
    anularCompra(id) { const c = S.compras.find((x) => x.id === id); const sm = stockMap(); const f = c.items.find((x) => sm[x.pid] - x.cant < 0); if (f) return toast('No se puede anular: ya se vendió parte de ' + prod(f.pid).nombre, true); c.anulada = true; save(); cerrar(); go(true); toast('Compra anulada'); },
    pagarCompra(id) {
      const c = S.compras.find((x) => x.id === id);
      dlg('Pagar compra ' + String(c.num).padStart(4, '0'), '<p class="hint" style="margin-top:0">' + esc(prov(c.prov)?.nombre) + ' · saldo <b>' + usd(saldo(c)) + '</b> · vence ' + fdia(c.vence) + '</p><div class="form"><label class="f">Monto $<input class="inp num" id="am" inputmode="decimal" value="' + saldo(c) + '"></label><label class="f">Forma de pago<select class="inp" id="ap">' + PAGOS.map((p) => '<option' + (p === TRF ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></label><label class="f">Fecha<input type="date" class="inp" id="af" value="' + hoy() + '"></label></div>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okPago(\'' + id + '\')">Registrar pago</button>');
    },
    okPago(id) { const c = S.compras.find((x) => x.id === id); const m = num($('am').value); if (!(m > 0)) return toast('Monto inválido', true); if (m > saldo(c) + 0.005) return toast('Mayor que el saldo', true); c.pagos.push({ id: uid(), fecha: $('af').value || hoy(), monto: r2(m), pago: $('ap').value }); save(); cerrar(); go(true); toast('Pago registrado'); },
    // costos
    per(v) { per = +v; go(true); },
    fijo(id, k, v) { const f = S.fijos.find((x) => x.id === id); if (k === 'monto') { const n = num(v); if (!(n >= 0)) return toast('Monto inválido', true); f.monto = r2(n); } else f.nombre = v.trim() || f.nombre; save(); go(true); },
    quitarFijo(id) { S.fijos = S.fijos.filter((x) => x.id !== id); save(); go(true); },
    nuevoFijo() { S.fijos.push({ id: uid(), nombre: 'Nuevo costo fijo', monto: 0 }); save(); go(true); },
    varPct(v) { const n = num(v); if (!(n >= 0 && n < 100)) return toast('Porcentaje inválido', true); S.varPct = r2(n); save(); go(true); },
    erMes(v) { erMes = v; go(true); },
    sim(k, v) { sim[k] = +v; pintarSim(); },
    simReset() { sim = { precio: 0, volumen: 0, costo: 0, fijos: 0 }; go(true); },
    simPreset(n) { sim = n === 1 ? { precio: 5, volumen: -3, costo: 0, fijos: 0 } : { precio: 0, volumen: 0, costo: 8, fijos: 0 }; go(true); },
    // config
    guardarCfg() { const t = num($('ct').value), i = num($('ci').value); if (!(t > 0)) return toast('Tasa inválida', true); if (!(i >= 0 && i < 100)) return toast('IVA inválido', true); S.empresa = $('ce').value.trim() || S.empresa; S.rif = $('cr').value.trim(); S.iva = r2(i); if (r2(t) !== S.tasa) { if (window.PRBTasa) PRBTasa.manual(S); S.tasa = r2(t); S.tasaFecha = hoy(); } save(); go(true); toast('Guardado'); },
    respaldo() { bajar('x3-data-respaldo-' + hoy() + '.json', JSON.stringify(S, null, 1), 'application/json'); },
    restaurar(f) { if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.v !== 1 || !Array.isArray(d.productos) || !Array.isArray(d.clientes) || !Array.isArray(d.fijos)) throw 0; S = d; save(); go(); toast('Respaldo cargado'); } catch (e) { toast('Ese archivo no es un respaldo de X3 DATA', true); } }; r.readAsText(f); },
    reset(modo) { dlg(modo === 'demo' ? 'Volver a los datos ficticios' : 'Empezar en blanco', '<p>' + (modo === 'demo' ? 'Se borra lo que registraste y se cargan los datos ficticios.' : 'Se borra todo y queda el sistema vacío para cargar tu empresa: productos, clientes, proveedores y costos fijos.') + ' Si quieres conservar algo, descarga un respaldo antes.</p>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn danger" onclick="X.okReset(\'' + modo + '\')">Sí, continuar</button>'); },
    okReset(modo) { S = modo === 'demo' ? seed() : blank(); save(); F = { items: [], cli: '', cond: 'contado', pago: TRF, q: '' }; B = null; cerrar(); location.hash = modo === 'demo' ? 'panel' : 'inventario'; go(); toast(modo === 'demo' ? 'Datos ficticios cargados' : 'Sistema vacío. Empieza por tus productos y costos fijos'); }
  };
  function calcAj(m, n, st) { if (!isFinite(n)) return NaN; if (m === 'Conteo físico') return n - st; if (m === 'Corrección') return n; return -Math.abs(n); }
  function csv(rows) { return '﻿' + rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'); }
  function bajar(n, d, t) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: t })); a.download = n; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  window.$ = $;

  Object.defineProperty(H, 'S', { get: () => S }); Object.assign(H, { save, go, V, A, NAV, dlg, cerrar, toast, kpi, $, esc, usd, bs, qty, pct, num, uid, r2, hoy, addDays, diasEntre, fdia, nfac, nf2, prod, cli, cliNom, saldo, pagado, stockMap, vivas, csv, bajar, armarVenta, nomMes, isoTime, EN });
  V.tasas = () => (window.PRBTasa ? PRBTasa.vista(S) : '<h1>Calculadora de tasas</h1>');
  A.tasas = () => window.PRBTasa && PRBTasa.montar(() => S, save, () => go(true));
  document.addEventListener('DOMContentLoaded', () => { load(); go(); if (window.PRBTasa) PRBTasa.auto(() => S, save, () => go(true)); });
})();
