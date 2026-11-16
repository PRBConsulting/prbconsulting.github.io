/* Finanzas personales · PRB Consulting
   Ingresos, gastos, cuentas en $ y Bs, presupuesto por categoría y metas de ahorro.
   Todo se guarda en el navegador del visitante (localStorage). Datos de ejemplo inventados. */
(function () {
  'use strict';
  const KEY = 'prb-finanzas-v1';

  /* ---------- utilidades ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hoy = () => isoDay(new Date());
  const addDays = (iso, k) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + k); return isoDay(d); };
  const addMes = (ym, k) => { const d = new Date(ym + '-15T12:00'); d.setMonth(d.getMonth() + k); return isoDay(d).slice(0, 7); };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const nomMes = (ym) => MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
  const corto = (ym) => MESES[+ym.slice(5, 7) - 1].slice(0, 3);
  const fdia = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
  const nf2 = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  const usd = (v) => (v < 0 ? '−$' : '$') + nf2.format(Math.abs(r2(v)));
  const bs = (v) => (v < 0 ? '−Bs ' : 'Bs ') + nf2.format(Math.abs(r2(v)));
  const mon = (v, m) => (m === 'VES' ? bs(v) : usd(v));
  const num = (v) => { let s = String(v ?? '').trim(); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isFinite(x) ? x : NaN; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PAL = ['#4f6bd8', '#e0a54a', '#2e9e6b', '#c2410c', '#7c3aed', '#0e7490', '#be185d', '#65a30d', '#64748b', '#a16207', '#0f766e', '#9333ea'];

  function toast(msg, err) { const t = $('toast'); t.textContent = msg; t.className = 'on' + (err ? ' err' : ''); clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = ''), 2600); }

  /* ---------- datos ---------- */
  let S;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador', true); } }
  function load() { try { const r = localStorage.getItem(KEY); if (r) { S = JSON.parse(r); if (S && S.v === 1) return; } } catch (e) { /* sin almacenamiento */ } S = seed(); save(); }
  function blank() {
    return { v: 1, nombre: 'Mis finanzas', tasa: 52.4,
      cuentas: [{ id: 'c1', nombre: 'Efectivo $', moneda: 'USD', inicial: 0 }, { id: 'c2', nombre: 'Banco en Bs', moneda: 'VES', inicial: 0 }],
      cats: { gasto: ['Comida', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Educación', 'Entretenimiento', 'Ropa', 'Familia', 'Otros gastos'], ingreso: ['Sueldo', 'Trabajos extra', 'Ventas', 'Otros ingresos'] },
      movs: [], presup: {}, metas: [] };
  }
  function seed() {
    const st = blank(); st.nombre = 'Finanzas de ejemplo';
    st.cuentas = [{ id: 'c1', nombre: 'Efectivo $', moneda: 'USD', inicial: 60 }, { id: 'c2', nombre: 'Banco en Bs', moneda: 'VES', inicial: 2400 }, { id: 'c3', nombre: 'Cuenta en $ (digital)', moneda: 'USD', inicial: 320 }];
    st.presup = { 'Comida': 280, 'Transporte': 70, 'Vivienda': 250, 'Servicios': 60, 'Salud': 40, 'Educación': 40, 'Entretenimiento': 60, 'Ropa': 35, 'Familia': 100, 'Otros gastos': 40 };
    let s = 23; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const t0 = hoy(); const ini = addDays(t0, -190); let tasa = 52.4 - 190 * 0.05;
    const G = [ // categoría, cuenta preferida, rango, probabilidad diaria, notas
      ['Comida', 'c2', [6, 28], 0.55, ['Mercado', 'Panadería', 'Carnicería', 'Frutas y verduras', 'Almuerzo']],
      ['Transporte', 'c1', [2, 9], 0.35, ['Gasolina', 'Pasaje', 'Taxi']],
      ['Entretenimiento', 'c1', [6, 22], 0.07, ['Cine', 'Salida a comer', 'Helados']],
      ['Salud', 'c2', [5, 30], 0.04, ['Farmacia', 'Consulta']],
      ['Ropa', 'c3', [12, 35], 0.03, ['Zapatos', 'Ropa']],
      ['Familia', 'c3', [15, 40], 0.05, ['Ayuda a mamá', 'Regalo de cumpleaños']],
      ['Otros gastos', 'c1', [2, 12], 0.06, ['Varios', 'Peluquería']]
    ];
    for (let k = 190; k >= 0; k--) {
      const d = addDays(t0, -k); tasa = r2(tasa + 0.05); const dd = +d.slice(8);
      const push = (m) => st.movs.push(Object.assign({ id: uid(), fecha: d, tasa }, m));
      if (dd === 1) { push({ tipo: 'ingreso', cuenta: 'c3', monto: 1150, cat: 'Sueldo', nota: 'Sueldo del mes' }); push({ tipo: 'gasto', cuenta: 'c3', monto: 250, cat: 'Vivienda', nota: 'Alquiler' }); }
      if (dd === 3) { const m = 300; push({ tipo: 'transf', cuenta: 'c3', cuentaDest: 'c2', monto: m, montoDest: r2(m * tasa), nota: 'Cambio a bolívares' }); }
      if (dd === 4) push({ tipo: 'transf', cuenta: 'c3', cuentaDest: 'c1', monto: 120, montoDest: 120, nota: 'Retiro en efectivo' });
      if (dd === 5) { push({ tipo: 'gasto', cuenta: 'c2', monto: r2((38 + rnd() * 10) * tasa), cat: 'Servicios', nota: 'Luz, agua e internet' }); push({ tipo: 'gasto', cuenta: 'c3', monto: 39, cat: 'Educación', nota: 'Curso en línea' }); }
      if (dd === 10) push({ tipo: 'gasto', cuenta: 'c3', monto: 12, cat: 'Servicios', nota: 'Plan de teléfono' });
      if (dd === 18 && rnd() < 0.7) push({ tipo: 'ingreso', cuenta: 'c3', monto: r2(80 + rnd() * 160), cat: 'Trabajos extra', nota: 'Proyecto independiente' });
      if (dd === 22 && rnd() < 0.5) push({ tipo: 'ingreso', cuenta: 'c1', monto: r2(20 + rnd() * 40), cat: 'Ventas', nota: 'Venta de artículos usados' });
      if (dd === 25) push({ tipo: 'transf', cuenta: 'c3', cuentaDest: 'c2', monto: 150, montoDest: r2(150 * tasa), nota: 'Cambio a bolívares' });
      G.forEach((g) => { if (rnd() < g[3]) { const u = g[2][0] + rnd() * (g[2][1] - g[2][0]); const c = st.cuentas.find((x) => x.id === g[1]); push({ tipo: 'gasto', cuenta: g[1], monto: r2(c.moneda === 'VES' ? u * tasa : u), cat: g[0], nota: g[4][Math.floor(rnd() * g[4].length)] }); } });
    }
    st.tasa = tasa;
    st.metas = [
      { id: uid(), nombre: 'Fondo de emergencia (3 meses)', objetivo: 3000, limite: addDays(t0, 300), aportes: [[addDays(t0, -120), 400], [addDays(t0, -90), 250], [addDays(t0, -60), 250], [addDays(t0, -30), 250]] },
      { id: uid(), nombre: 'Certificación profesional', objetivo: 450, limite: addDays(t0, 75), aportes: [[addDays(t0, -70), 150], [addDays(t0, -40), 100]] },
      { id: uid(), nombre: 'Viaje de vacaciones', objetivo: 1200, limite: addDays(t0, 240), aportes: [[addDays(t0, -20), 180]] }
    ];
    return st;
  }

  /* ---------- cálculos ---------- */
  const cuenta = (id) => S.cuentas.find((c) => c.id === id);
  const enUsd = (m, monto) => (cuenta(m)?.moneda === 'VES' ? monto / (S._t || S.tasa) : monto);
  const usdMov = (m) => (cuenta(m.cuenta)?.moneda === 'VES' ? m.monto / m.tasa : m.monto);
  function saldos() {
    const sal = {}; S.cuentas.forEach((c) => (sal[c.id] = +c.inicial || 0));
    S.movs.forEach((m) => { if (m.tipo === 'ingreso') sal[m.cuenta] += m.monto; else if (m.tipo === 'gasto') sal[m.cuenta] -= m.monto; else { sal[m.cuenta] -= m.monto; sal[m.cuentaDest] += m.montoDest; } });
    Object.keys(sal).forEach((k) => (sal[k] = r2(sal[k]))); return sal;
  }
  function resMes(ym) {
    const L = S.movs.filter((m) => m.fecha.slice(0, 7) === ym);
    let ing = 0, gas = 0; const porCat = {};
    L.forEach((m) => { const u = usdMov(m); if (m.tipo === 'ingreso') ing += u; if (m.tipo === 'gasto') { gas += u; porCat[m.cat] = (porCat[m.cat] || 0) + u; } });
    return { ing: r2(ing), gas: r2(gas), aho: r2(ing - gas), porCat, n: L.length };
  }
  const totMeta = (m) => r2(m.aportes.reduce((a, x) => a + x[1], 0));

  /* ---------- navegación ---------- */
  const NAV = [['Mi dinero', [['resumen', 'Resumen'], ['movimientos', 'Movimientos'], ['cuentas', 'Cuentas']]], ['Planificar', [['presupuesto', 'Presupuesto'], ['metas', 'Metas de ahorro']]], ['Sistema', [['config', 'Configuración']]]];
  let vista = 'resumen'; let mes = hoy().slice(0, 7);
  function nav() {
    $('nav').innerHTML = '<div class="brand">Finanzas<small>Ingresos, gastos y ahorro</small></div>' +
      NAV.map((g) => '<div class="grp">' + g[0] + '</div>' + g[1].map((x) => '<button' + (x[0] === vista ? ' class="on"' : '') + ' onclick="location.hash=\'' + x[0] + '\'">' + x[1] + '</button>').join('')).join('') +
      '<div class="tasa">Tasa para convertir<b>' + bs(S.tasa) + ' por $</b><button class="lnk" style="color:#d6defa;margin-top:4px" onclick="F.tasa()">Cambiar tasa</button></div>';
  }
  function go() {
    const k = location.hash.slice(1); vista = V[k] ? k : 'resumen'; nav();
    $('m').innerHTML = V[vista]() + '<div class="foot">Finanzas personales · hecho por <a href="../">PRB Consulting</a>. Demo con datos inventados: lo que registres se guarda solo en este navegador. Puedes volver a los datos de ejemplo en Configuración.</div><button class="fab" onclick="F.mov()">+ Movimiento</button>';
    if (A[vista]) A[vista](); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', go);
  const selMes = () => { const ms = [...new Set(S.movs.map((m) => m.fecha.slice(0, 7)).concat([hoy().slice(0, 7)]))].sort().reverse();
    return '<label class="f">Mes<select class="inp" style="min-width:170px" onchange="F.mes(this.value)">' + ms.map((m) => '<option value="' + m + '"' + (m === mes ? ' selected' : '') + '>' + nomMes(m) + '</option>').join('') + '</select></label>'; };

  function dlg(t, c, b) { const d = $('dlg'); d.innerHTML = '<div class="hd"><b>' + t + '</b><button class="x" aria-label="Cerrar" onclick="F.cerrar()">×</button></div><div class="bd">' + c + '</div><div class="ft">' + (b || '<button class="btn sec" onclick="F.cerrar()">Cerrar</button>') + '</div>'; if (!d.open) d.showModal(); }
  const cerrar = () => $('dlg').open && $('dlg').close();

  /* ---------- vistas ---------- */
  const V = {}, A = {};
  V.resumen = () => {
    const r = resMes(mes); const sal = saldos();
    const total = S.cuentas.reduce((a, c) => a + (c.moneda === 'VES' ? sal[c.id] / S.tasa : sal[c.id]), 0);
    const cats = Object.entries(r.porCat).sort((a, b) => b[1] - a[1]);
    const meses = []; for (let k = 5; k >= 0; k--) { const ym = addMes(mes, -k); meses.push([ym, resMes(ym)]); }
    const mx = Math.max(1, ...meses.map((x) => Math.max(x[1].ing, x[1].gas)));
    const pres = Object.entries(S.presup).filter((x) => x[1] > 0); const pasados = pres.filter((x) => (r.porCat[x[0]] || 0) > x[1]);
    // dona
    let ang = 0; const tot = r.gas || 1; const R = 70, C = 2 * Math.PI * R;
    const dona = cats.map((c, i) => { const f = c[1] / tot; const seg = '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="' + PAL[i % PAL.length] + '" stroke-width="26" stroke-dasharray="' + (f * C) + ' ' + C + '" stroke-dashoffset="' + (-ang * C) + '" transform="rotate(-90 90 90)"><title>' + esc(c[0]) + ': ' + usd(c[1]) + '</title></circle>'; ang += f; return seg; }).join('');
    return '<div class="row" style="align-items:end"><div><h1>Resumen de ' + nomMes(mes) + '</h1><p class="sub" style="margin:0">Todo convertido a dólares. Los movimientos en Bs usan la tasa del día en que se hicieron.</p></div><span class="sp"></span>' + selMes() + '<button class="btn" onclick="F.mov()">+ Movimiento</button></div>' +
      '<div class="kpis"><div class="card kpi" style="--c:var(--ok)"><div class="n">' + usd(r.ing) + '</div><div class="t">Ingresos del mes</div></div><div class="card kpi" style="--c:var(--bad)"><div class="n">' + usd(r.gas) + '</div><div class="t">Gastos del mes</div></div>' +
      '<div class="card kpi"><div class="n" style="color:' + (r.aho < 0 ? 'var(--bad)' : 'inherit') + '">' + usd(r.aho) + '</div><div class="t">' + (r.aho < 0 ? 'Gastaste más de lo que entró' : 'Ahorro del mes · ' + (r.ing ? Math.round(r.aho / r.ing * 100) : 0) + '% de lo que entró') + '</div></div>' +
      '<div class="card kpi" style="--c:var(--gold)"><div class="n">' + usd(total) + '</div><div class="t">Dinero total hoy en ' + S.cuentas.length + ' cuentas</div></div></div>' +
      '<div class="g2"><div class="card"><h3>Ingresos y gastos, últimos 6 meses</h3><svg viewBox="0 0 540 200" width="100%" role="img" aria-label="Ingresos y gastos por mes">' +
      meses.map((m, i) => { const x = 20 + i * 88; const hi = m[1].ing / mx * 150, hg = m[1].gas / mx * 150; return '<rect x="' + x + '" y="' + (170 - hi) + '" width="30" height="' + hi + '" rx="3" fill="#2e9e6b"><title>Ingresos ' + nomMes(m[0]) + ': ' + usd(m[1].ing) + '</title></rect><rect x="' + (x + 33) + '" y="' + (170 - hg) + '" width="30" height="' + hg + '" rx="3" fill="#d4574a"><title>Gastos ' + nomMes(m[0]) + ': ' + usd(m[1].gas) + '</title></rect><text x="' + (x + 31) + '" y="190" font-size="12" text-anchor="middle" fill="' + (m[0] === mes ? '#1b2430' : '#667085') + '" font-weight="' + (m[0] === mes ? 700 : 400) + '">' + corto(m[0]) + '</text>'; }).join('') +
      '</svg><div class="hint"><span style="color:#2e9e6b">■</span> Ingresos &nbsp; <span style="color:#d4574a">■</span> Gastos</div></div>' +
      '<div class="card"><h3>¿En qué se fue el dinero?</h3>' + (cats.length ? '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 180 180" width="150" height="150">' + dona + '<text x="90" y="86" text-anchor="middle" font-size="12" fill="#667085">Gastos</text><text x="90" y="104" text-anchor="middle" font-size="15" font-weight="800" fill="#1b2430">' + usd(r.gas) + '</text></svg><div style="flex:1;min-width:150px">' +
        cats.slice(0, 7).map((c, i) => '<div style="display:flex;gap:8px;align-items:center;margin:4px 0;font-size:13px"><i style="width:10px;height:10px;border-radius:3px;background:' + PAL[i % PAL.length] + '"></i><span style="flex:1">' + esc(c[0]) + '</span><b class="num">' + Math.round(c[1] / tot * 100) + '%</b></div>').join('') + '</div></div>' : '<div class="empty">Sin gastos este mes</div>') + '</div></div>' +
      '<div class="g2e"><div class="card scroll"><h3>Saldo por cuenta</h3><table><tbody>' + S.cuentas.map((c) => '<tr><td>' + esc(c.nombre) + '</td><td class="r"><b>' + mon(sal[c.id], c.moneda) + '</b>' + (c.moneda === 'VES' ? '<div class="hint">≈ ' + usd(sal[c.id] / S.tasa) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="card"><h3>Presupuesto del mes</h3>' + (pres.length ? (pasados.length ? '<p style="margin:0 0 8px">Te pasaste en <b>' + pasados.map((x) => esc(x[0])).join(', ') + '</b>.</p>' : '<p style="margin:0 0 8px">Vas dentro del presupuesto en todas las categorías.</p>') +
        pres.slice().sort((a, b) => (r.porCat[b[0]] || 0) / b[1] - (r.porCat[a[0]] || 0) / a[1]).slice(0, 5).map((x) => barra(x[0], r.porCat[x[0]] || 0, x[1])).join('') + '<button class="lnk" onclick="location.hash=\'presupuesto\'">Ver todo el presupuesto</button>' : '<div class="empty">Aún no tienes presupuesto. <button class="lnk" onclick="location.hash=\'presupuesto\'">Créalo aquí</button></div>') + '</div></div>';
  };
  function barra(cat, gasto, tope) {
    const p = tope ? gasto / tope : 0; const col = p > 1 ? 'var(--bad)' : p > 0.85 ? '#d39a2c' : 'var(--ok)';
    return '<div style="margin:8px 0"><div style="display:flex;font-size:13px"><span style="flex:1">' + esc(cat) + '</span><span class="num"><b>' + usd(gasto) + '</b> de ' + usd(tope) + '</span></div><div class="hb" style="margin:3px 0"><span class="b"><i style="width:' + Math.min(100, p * 100) + '%;background:' + col + '"></i></span></div></div>';
  }

  let fTipo = '', fCta = '', fCat = '', fq = '';
  V.movimientos = () => {
    const cats = [...S.cats.gasto, ...S.cats.ingreso];
    const L = S.movs.filter((m) => m.fecha.slice(0, 7) === mes && (!fTipo || m.tipo === fTipo) && (!fCta || m.cuenta === fCta || m.cuentaDest === fCta) && (!fCat || m.cat === fCat) && (!fq || (m.nota || '').toLowerCase().includes(fq.toLowerCase())))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const r = { i: 0, g: 0 }; L.forEach((m) => { if (m.tipo === 'ingreso') r.i += usdMov(m); if (m.tipo === 'gasto') r.g += usdMov(m); });
    return '<h1>Movimientos</h1><p class="sub">Cada ingreso, gasto o cambio entre cuentas. Toca uno para editarlo.</p>' +
      '<div class="row" style="align-items:end">' + selMes() + '<label class="f">Tipo<select class="inp" onchange="F.f(\'t\',this.value)"><option value="">Todos</option><option value="gasto"' + (fTipo === 'gasto' ? ' selected' : '') + '>Gastos</option><option value="ingreso"' + (fTipo === 'ingreso' ? ' selected' : '') + '>Ingresos</option><option value="transf"' + (fTipo === 'transf' ? ' selected' : '') + '>Entre cuentas</option></select></label>' +
      '<label class="f">Cuenta<select class="inp" onchange="F.f(\'c\',this.value)"><option value="">Todas</option>' + S.cuentas.map((c) => '<option value="' + c.id + '"' + (c.id === fCta ? ' selected' : '') + '>' + esc(c.nombre) + '</option>').join('') + '</select></label>' +
      '<label class="f">Categoría<select class="inp" onchange="F.f(\'k\',this.value)"><option value="">Todas</option>' + cats.map((c) => '<option' + (c === fCat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
      '<label class="f">Buscar<input class="inp" id="fq" value="' + esc(fq) + '" placeholder="Nota…"></label><span class="sp"></span><button class="btn sec" onclick="F.csv()">Descargar CSV</button><button class="btn" onclick="F.mov()">+ Nuevo</button></div>' +
      '<div class="card scroll"><table><thead><tr><th>Fecha</th><th>Detalle</th><th>Categoría</th><th>Cuenta</th><th class="r">Monto</th><th class="r">En $</th></tr></thead><tbody>' +
      (L.length ? L.map((m) => { const c = cuenta(m.cuenta); const sg = m.tipo === 'ingreso' ? 1 : m.tipo === 'gasto' ? -1 : 0; const col = sg > 0 ? 'var(--ok)' : sg < 0 ? 'inherit' : 'var(--mut)';
        return '<tr style="cursor:pointer" onclick="F.mov(\'' + m.id + '\')"><td>' + fdia(m.fecha) + '</td><td class="wrap">' + esc(m.nota || (m.tipo === 'transf' ? 'Entre cuentas' : m.cat)) + '</td><td>' + (m.tipo === 'transf' ? '<span class="tag mut">Entre cuentas</span>' : esc(m.cat)) + '</td><td>' + esc(c?.nombre) + (m.tipo === 'transf' ? ' → ' + esc(cuenta(m.cuentaDest)?.nombre) : '') + '</td>' +
          '<td class="r" style="color:' + col + '">' + (sg > 0 ? '+' : sg < 0 ? '−' : '') + mon(m.monto, c?.moneda).replace('−', '') + '</td><td class="r" style="color:' + col + '">' + (sg ? (sg > 0 ? '+' : '−') + usd(usdMov(m)).replace('−', '') : '') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">No hay movimientos con esos filtros</td></tr>') +
      '<tr class="tot"><td colspan="4">' + L.length + ' movimientos · ingresos ' + usd(r.i) + ' · gastos ' + usd(r.g) + '</td><td></td><td class="r">' + usd(r.i - r.g) + '</td></tr></tbody></table></div>';
  };
  A.movimientos = () => { const q = $('fq'); q.oninput = () => { fq = q.value; const p = q.selectionStart; go(); const n = $('fq'); n.focus(); n.setSelectionRange(p, p); }; };

  V.cuentas = () => {
    const sal = saldos(); const tot = S.cuentas.reduce((a, c) => a + (c.moneda === 'VES' ? sal[c.id] / S.tasa : sal[c.id]), 0);
    return '<h1>Cuentas</h1><p class="sub">Dónde está tu dinero. El saldo se calcula solo: saldo inicial + ingresos − gastos ± cambios entre cuentas.</p>' +
      '<div class="row"><span class="sp"></span><button class="btn sec" onclick="F.transf()">Pasar dinero entre cuentas</button><button class="btn" onclick="F.cuenta()">+ Nueva cuenta</button></div>' +
      '<div class="card scroll"><table><thead><tr><th>Cuenta</th><th>Moneda</th><th class="r">Saldo inicial</th><th class="r">Saldo hoy</th><th class="r">En $</th><th class="r">Movimientos</th><th></th></tr></thead><tbody>' +
      S.cuentas.map((c) => '<tr><td><b>' + esc(c.nombre) + '</b></td><td>' + (c.moneda === 'VES' ? 'Bolívares' : 'Dólares') + '</td><td class="r">' + mon(c.inicial, c.moneda) + '</td><td class="r"><b style="color:' + (sal[c.id] < 0 ? 'var(--bad)' : 'inherit') + '">' + mon(sal[c.id], c.moneda) + '</b></td><td class="r">' + usd(c.moneda === 'VES' ? sal[c.id] / S.tasa : sal[c.id]) + '</td><td class="r">' + S.movs.filter((m) => m.cuenta === c.id || m.cuentaDest === c.id).length + '</td><td><button class="lnk" onclick="F.cuenta(\'' + c.id + '\')">Editar</button></td></tr>').join('') +
      '<tr class="tot"><td colspan="4">Total (Bs convertidos a la tasa de hoy)</td><td class="r">' + usd(tot) + '</td><td colspan="2"></td></tr></tbody></table></div>';
  };

  V.presupuesto = () => {
    const r = resMes(mes); const P = S.cats.gasto.map((c) => [c, S.presup[c] || 0, r.porCat[c] || 0]);
    const tp = P.reduce((a, x) => a + x[1], 0), tg = P.reduce((a, x) => a + x[2], 0);
    const hoyYm = hoy().slice(0, 7); const dMes = new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate(); const dia = mes === hoyYm ? +hoy().slice(8) : dMes;
    return '<div class="row" style="align-items:end"><div><h1>Presupuesto</h1><p class="sub" style="margin:0">Cuánto quieres gastar por categoría cada mes, y cómo vas. Escribe el tope y se guarda solo.</p></div><span class="sp"></span>' + selMes() + '</div>' +
      '<div class="kpis"><div class="card kpi"><div class="n">' + usd(tp) + '</div><div class="t">Presupuesto del mes</div></div><div class="card kpi" style="--c:var(--bad)"><div class="n">' + usd(tg) + '</div><div class="t">Gastado · ' + (tp ? Math.round(tg / tp * 100) : 0) + '%</div></div>' +
      '<div class="card kpi" style="--c:var(--ok)"><div class="n">' + usd(tp - tg) + '</div><div class="t">' + (tp - tg >= 0 ? 'Te queda' : 'Te pasaste') + '</div></div><div class="card kpi" style="--c:var(--gold)"><div class="n">' + Math.round(dia / dMes * 100) + '%</div><div class="t">Del mes transcurrido (día ' + dia + ' de ' + dMes + ')</div></div></div>' +
      '<div class="card scroll"><table><thead><tr><th>Categoría</th><th class="r">Tope mensual $</th><th class="r">Gastado</th><th style="min-width:180px">Avance</th><th class="r">Disponible</th><th></th></tr></thead><tbody>' +
      P.map((x) => { const p = x[1] ? x[2] / x[1] : 0; const col = p > 1 ? 'var(--bad)' : p > dia / dMes + 0.1 ? '#d39a2c' : 'var(--ok)';
        return '<tr><td>' + esc(x[0]) + '</td><td class="r"><input class="inp num" style="width:100px;text-align:right" inputmode="decimal" value="' + (x[1] || '') + '" placeholder="0" onchange="F.presup(\'' + esc(x[0]).replace(/'/g, "\\'") + '\',this.value)"></td><td class="r">' + usd(x[2]) + '</td><td><div class="hb" style="margin:0"><span class="b"><i style="width:' + Math.min(100, p * 100) + '%;background:' + col + '"></i></span><span class="v" style="width:44px">' + (x[1] ? Math.round(p * 100) + '%' : '') + '</span></div></td><td class="r" style="color:' + (x[1] - x[2] < 0 ? 'var(--bad)' : 'inherit') + '">' + (x[1] ? usd(x[1] - x[2]) : '—') + '</td><td>' + (!x[1] ? '' : p > 1 ? '<span class="tag bad">Pasado</span>' : p > dia / dMes + 0.1 ? '<span class="tag warn">Va rápido</span>' : '<span class="tag ok">Bien</span>') + '</td></tr>'; }).join('') +
      '</tbody></table><p class="hint">"Va rápido" significa que gastaste más de lo que corresponde a los días que van del mes.</p></div>';
  };

  V.metas = () => '<h1>Metas de ahorro</h1><p class="sub">Para qué estás ahorrando, cuánto llevas y cuánto tienes que guardar cada mes para llegar a tiempo.</p>' +
    '<div class="row"><span class="sp"></span><button class="btn" onclick="F.meta()">+ Nueva meta</button></div>' +
    (S.metas.length ? '<div class="g2e" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + S.metas.map((m) => { const t = totMeta(m); const p = Math.min(1, t / m.objetivo); const falta = Math.max(0, m.objetivo - t);
      const meses = m.limite ? Math.max(1, Math.round((new Date(m.limite) - new Date(hoy())) / (30.4 * 864e5))) : 0;
      return '<div class="card"><div style="display:flex;align-items:start;gap:8px"><b style="flex:1;font:700 16px var(--disp)">' + esc(m.nombre) + '</b><button class="lnk" onclick="F.meta(\'' + m.id + '\')">Editar</button></div>' +
        '<div style="font-size:24px;font-weight:800;margin:8px 0 2px" class="num">' + usd(t) + ' <span style="font-size:14px;color:var(--mut);font-weight:500">de ' + usd(m.objetivo) + '</span></div>' +
        '<div class="hb"><span class="b" style="height:12px"><i style="width:' + p * 100 + '%;background:' + (p >= 1 ? 'var(--ok)' : 'var(--acc)') + '"></i></span><span class="v" style="width:44px">' + Math.round(p * 100) + '%</span></div>' +
        '<p class="hint" style="margin:6px 0 12px">' + (p >= 1 ? '¡Meta cumplida!' : 'Faltan ' + usd(falta) + (m.limite ? ' para el ' + fdia(m.limite) + ': guarda <b>' + usd(falta / meses) + '</b> al mes (' + meses + ' meses).' : '.')) + '</p>' +
        '<div class="row" style="margin:0"><button class="btn sm" onclick="F.aporte(\'' + m.id + '\')">+ Aportar</button><button class="btn sm sec" onclick="F.verAportes(\'' + m.id + '\')">Ver aportes (' + m.aportes.length + ')</button></div></div>'; }).join('') + '</div>' : '<div class="card empty">Aún no tienes metas. Crea la primera: un fondo de emergencia de 3 meses de gastos es un buen comienzo.</div>');

  V.config = () => '<h1>Configuración</h1><p class="sub">Categorías, tasa y respaldo.</p><div class="g2e"><div class="card"><h3>General</h3><div class="form"><label class="f full">Nombre<input class="inp" id="cn" value="' + esc(S.nombre) + '"></label><label class="f">Tasa (Bs por $)<input class="inp num" id="ct" inputmode="decimal" value="' + S.tasa + '"></label></div>' +
    '<label class="f" style="margin-top:10px">Categorías de gasto (una por línea)<textarea class="inp" id="cg" rows="6">' + esc(S.cats.gasto.join('\n')) + '</textarea></label><label class="f" style="margin-top:10px">Categorías de ingreso<textarea class="inp" id="ci" rows="4">' + esc(S.cats.ingreso.join('\n')) + '</textarea></label>' +
    '<div class="row" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="F.guardarCfg()">Guardar</button></div></div>' +
    '<div class="card"><h3>Respaldo</h3><p class="hint" style="margin-top:0">Tus datos viven solo en este navegador. Descarga un respaldo para pasarlos a otro equipo.</p><div class="row"><button class="btn sec" onclick="F.respaldo()">Descargar respaldo (.json)</button><label class="btn sec">Cargar respaldo<input type="file" accept=".json,application/json" hidden onchange="F.restaurar(this.files[0])"></label></div>' +
    '<h3 style="margin-top:16px">Empezar de nuevo</h3><div class="row"><button class="btn sec" onclick="F.reset(\'demo\')">Volver a los datos de ejemplo</button><button class="btn danger" onclick="F.reset(\'vacio\')">Empezar en blanco</button></div></div></div>';

  /* ---------- acciones ---------- */
  const F = window.F = {
    cerrar,
    mes(v) { mes = v; go(); },
    f(k, v) { if (k === 't') fTipo = v; if (k === 'c') fCta = v; if (k === 'k') fCat = v; go(); },
    tasa() { dlg('Tasa para convertir', '<label class="f">Bolívares por 1 $<input class="inp num" id="nt" inputmode="decimal" value="' + S.tasa + '"></label><p class="hint">Se usa para movimientos nuevos y para mostrar tus saldos en Bs convertidos a $.</p>', '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn" onclick="F.setTasa()">Guardar</button>'); },
    setTasa() { const t = num($('nt').value); if (!(t > 0)) return toast('Tasa inválida', true); S.tasa = r2(t); save(); cerrar(); go(); toast('Tasa actualizada'); },
    mov(id, tipo0) {
      const m = id ? S.movs.find((x) => x.id === id) : { tipo: tipo0 || 'gasto', fecha: hoy(), cuenta: S.cuentas[0]?.id, monto: '', cat: '', nota: '', tasa: S.tasa };
      if (!S.cuentas.length) return toast('Primero crea una cuenta', true);
      if (m.tipo === 'transf') return F.transf(id);
      const opt = (t) => S.cats[t].map((c) => '<option' + (c === m.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('');
      dlg(id ? 'Editar movimiento' : 'Nuevo movimiento',
        '<div class="row" style="margin-bottom:12px" id="tp">' + ['gasto', 'ingreso'].map((t) => '<button class="btn ' + (m.tipo === t ? '' : 'sec') + '" data-t="' + t + '">' + (t === 'gasto' ? 'Gasto' : 'Ingreso') + '</button>').join('') + '<button class="btn sec" onclick="F.cerrar();F.transf()">Entre cuentas</button></div>' +
        '<div class="form"><label class="f">Monto<input class="inp num" id="mm" inputmode="decimal" value="' + (m.monto || '') + '" placeholder="0,00"></label><label class="f">Cuenta<select class="inp" id="mc">' + S.cuentas.map((c) => '<option value="' + c.id + '"' + (c.id === m.cuenta ? ' selected' : '') + '>' + esc(c.nombre) + ' (' + (c.moneda === 'VES' ? 'Bs' : '$') + ')</option>').join('') + '</select></label>' +
        '<label class="f">Categoría<select class="inp" id="mk">' + opt(m.tipo) + '</select></label><label class="f">Fecha<input type="date" class="inp" id="mf" value="' + m.fecha + '"></label><label class="f full">Nota<input class="inp" id="mn" value="' + esc(m.nota) + '" placeholder="Ej.: mercado del sábado"></label><div class="full hint" id="mx"></div></div>',
        (id ? '<button class="btn danger" onclick="F.borrar(\'' + id + '\')" style="margin-right:auto">Borrar</button>' : '') + '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn" onclick="F.guardarMov(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
      let tipo = m.tipo;
      $('tp').querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tipo = b.dataset.t; $('tp').querySelectorAll('[data-t]').forEach((x) => (x.className = 'btn ' + (x.dataset.t === tipo ? '' : 'sec'))); $('mk').innerHTML = opt(tipo); F._tipo = tipo; }));
      F._tipo = tipo;
      const conv = () => { const c = cuenta($('mc').value); const v = num($('mm').value); $('mx').textContent = c?.moneda === 'VES' && v > 0 ? '≈ ' + usd(v / (id ? m.tasa : S.tasa)) + ' a ' + bs(id ? m.tasa : S.tasa) + ' por $' : ''; };
      $('mm').oninput = conv; $('mc').onchange = conv; conv(); $('mm').focus();
      $('mm').onkeydown = (e) => { if (e.key === 'Enter') F.guardarMov(id); };
    },
    guardarMov(id) {
      const v = num($('mm').value); if (!(v > 0)) return toast('Escribe un monto mayor que cero', true);
      const d = { tipo: F._tipo, monto: r2(v), cuenta: $('mc').value, cat: $('mk').value, fecha: $('mf').value || hoy(), nota: $('mn').value.trim() };
      if (id) Object.assign(S.movs.find((x) => x.id === id), d); else S.movs.push(Object.assign({ id: uid(), tasa: S.tasa }, d));
      mes = d.fecha.slice(0, 7); save(); cerrar(); go(); toast((d.tipo === 'gasto' ? 'Gasto' : 'Ingreso') + ' guardado');
    },
    borrar(id) { S.movs = S.movs.filter((x) => x.id !== id); save(); cerrar(); go(); toast('Movimiento borrado'); },
    transf(id) {
      const m = id ? S.movs.find((x) => x.id === id) : { fecha: hoy(), cuenta: S.cuentas[0]?.id, cuentaDest: S.cuentas[1]?.id, monto: '', montoDest: '', nota: '' };
      if (S.cuentas.length < 2) return toast('Necesitas al menos dos cuentas', true);
      const sel = (idS, val) => '<select class="inp" id="' + idS + '">' + S.cuentas.map((c) => '<option value="' + c.id + '"' + (c.id === val ? ' selected' : '') + '>' + esc(c.nombre) + ' (' + (c.moneda === 'VES' ? 'Bs' : '$') + ')</option>').join('') + '</select>';
      dlg(id ? 'Editar cambio entre cuentas' : 'Pasar dinero entre cuentas', '<div class="form"><label class="f">Sale de' + sel('to', m.cuenta) + '</label><label class="f">Entra a' + sel('td', m.cuentaDest) + '</label>' +
        '<label class="f">Monto que sale<input class="inp num" id="tm" inputmode="decimal" value="' + (m.monto || '') + '"></label><label class="f">Monto que entra<input class="inp num" id="tn" inputmode="decimal" value="' + (m.montoDest || '') + '"></label>' +
        '<label class="f">Fecha<input type="date" class="inp" id="tf" value="' + m.fecha + '"></label><label class="f">Nota<input class="inp" id="tx" value="' + esc(m.nota) + '" placeholder="Ej.: cambio a bolívares"></label><div class="full hint">Si las monedas son distintas, el monto que entra se calcula con la tasa del día; puedes corregirlo si te cambiaron a otra tasa.</div></div>',
        (id ? '<button class="btn danger" onclick="F.borrar(\'' + id + '\')" style="margin-right:auto">Borrar</button>' : '') + '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn" onclick="F.guardarTransf(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
      const calc = () => { const a = cuenta($('to').value), b = cuenta($('td').value); const v = num($('tm').value); if (!(v > 0)) return; $('tn').value = String(r2(a.moneda === b.moneda ? v : a.moneda === 'USD' ? v * S.tasa : v / S.tasa)).replace('.', ','); };
      $('tm').oninput = calc; $('to').onchange = calc; $('td').onchange = calc;
    },
    guardarTransf(id) {
      const a = $('to').value, b = $('td').value, v = num($('tm').value), w = num($('tn').value);
      if (a === b) return toast('Elige dos cuentas distintas', true); if (!(v > 0) || !(w > 0)) return toast('Revisa los montos', true);
      const d = { tipo: 'transf', cuenta: a, cuentaDest: b, monto: r2(v), montoDest: r2(w), fecha: $('tf').value || hoy(), nota: $('tx').value.trim() };
      if (id) Object.assign(S.movs.find((x) => x.id === id), d); else S.movs.push(Object.assign({ id: uid(), tasa: S.tasa }, d));
      save(); cerrar(); go(); toast('Cambio entre cuentas guardado');
    },
    cuenta(id) {
      const c = id ? cuenta(id) : { nombre: '', moneda: 'USD', inicial: 0 }; const usada = id && S.movs.some((m) => m.cuenta === id || m.cuentaDest === id);
      dlg(id ? 'Editar cuenta' : 'Nueva cuenta', '<div class="form"><label class="f full">Nombre<input class="inp" id="kn" value="' + esc(c.nombre) + '" placeholder="Ej.: Banco, efectivo, billetera"></label><label class="f">Moneda<select class="inp" id="km"' + (usada ? ' disabled' : '') + '><option value="USD"' + (c.moneda === 'USD' ? ' selected' : '') + '>Dólares</option><option value="VES"' + (c.moneda === 'VES' ? ' selected' : '') + '>Bolívares</option></select></label><label class="f">Saldo inicial<input class="inp num" id="ki" inputmode="decimal" value="' + c.inicial + '"></label></div>' + (usada ? '<p class="hint">La moneda no se puede cambiar porque la cuenta ya tiene movimientos.</p>' : ''),
        (id && !usada ? '<button class="btn danger" style="margin-right:auto" onclick="F.borrarCuenta(\'' + id + '\')">Borrar</button>' : '') + '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn" onclick="F.guardarCuenta(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardarCuenta(id) {
      const n = $('kn').value.trim(); const i = num($('ki').value); if (!n) return toast('Falta el nombre', true);
      const d = { nombre: n, moneda: $('km').value, inicial: isFinite(i) ? r2(i) : 0 };
      if (id) Object.assign(cuenta(id), d); else S.cuentas.push(Object.assign({ id: uid() }, d)); save(); cerrar(); go(); toast('Cuenta guardada');
    },
    borrarCuenta(id) { S.cuentas = S.cuentas.filter((c) => c.id !== id); save(); cerrar(); go(); toast('Cuenta borrada'); },
    presup(cat, v) { const n = num(v); if (v.trim() === '' || n === 0) delete S.presup[cat]; else if (n > 0) S.presup[cat] = r2(n); else return toast('Monto inválido', true); save(); go(); },
    meta(id) {
      const m = id ? S.metas.find((x) => x.id === id) : { nombre: '', objetivo: '', limite: '' };
      dlg(id ? 'Editar meta' : 'Nueva meta', '<div class="form"><label class="f full">¿Para qué ahorras?<input class="inp" id="en" value="' + esc(m.nombre) + '" placeholder="Ej.: fondo de emergencia"></label><label class="f">Monto objetivo $<input class="inp num" id="eo" inputmode="decimal" value="' + (m.objetivo || '') + '"></label><label class="f">Fecha límite (opcional)<input type="date" class="inp" id="el" value="' + (m.limite || '') + '"></label></div>',
        (id ? '<button class="btn danger" style="margin-right:auto" onclick="F.borrarMeta(\'' + id + '\')">Borrar</button>' : '') + '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn" onclick="F.guardarMeta(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardarMeta(id) {
      const n = $('en').value.trim(), o = num($('eo').value); if (!n) return toast('Falta el nombre', true); if (!(o > 0)) return toast('Escribe el monto objetivo', true);
      const d = { nombre: n, objetivo: r2(o), limite: $('el').value }; if (id) Object.assign(S.metas.find((x) => x.id === id), d); else S.metas.push(Object.assign({ id: uid(), aportes: [] }, d)); save(); cerrar(); go(); toast('Meta guardada');
    },
    borrarMeta(id) { S.metas = S.metas.filter((x) => x.id !== id); save(); cerrar(); go(); },
    aporte(id) {
      const m = S.metas.find((x) => x.id === id);
      dlg('Aportar a ' + esc(m.nombre), '<div class="form"><label class="f">Monto $ (negativo si sacaste)<input class="inp num" id="am" inputmode="decimal"></label><label class="f">Fecha<input type="date" class="inp" id="af" value="' + hoy() + '"></label></div>', '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn" onclick="F.okAporte(\'' + id + '\')">Guardar</button>');
      $('am').focus();
    },
    okAporte(id) { const v = num($('am').value); if (!v) return toast('Escribe un monto', true); S.metas.find((x) => x.id === id).aportes.push([$('af').value || hoy(), r2(v)]); save(); cerrar(); go(); toast('Aporte guardado'); },
    verAportes(id) { const m = S.metas.find((x) => x.id === id); dlg('Aportes · ' + esc(m.nombre), m.aportes.length ? '<table><tbody>' + m.aportes.slice().sort((a, b) => b[0].localeCompare(a[0])).map((a) => '<tr><td>' + fdia(a[0]) + '</td><td class="r">' + usd(a[1]) + '</td></tr>').join('') + '<tr class="tot"><td>Total</td><td class="r">' + usd(totMeta(m)) + '</td></tr></tbody></table>' : '<div class="empty">Sin aportes</div>'); },
    csv() {
      const rows = [['Fecha', 'Tipo', 'Categoria', 'Cuenta', 'Cuenta destino', 'Monto', 'Moneda', 'Tasa', 'Monto en $', 'Nota']];
      S.movs.filter((m) => m.fecha.slice(0, 7) === mes).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((m) => { const c = cuenta(m.cuenta); rows.push([m.fecha, m.tipo === 'transf' ? 'Entre cuentas' : m.tipo, m.cat || '', c?.nombre, m.tipo === 'transf' ? cuenta(m.cuentaDest)?.nombre : '', m.monto, c?.moneda, m.tasa, r2(usdMov(m)), m.nota]); });
      bajar('movimientos-' + mes + '.csv', '﻿' + rows.map((r) => r.map((x) => { const s = String(x ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'), 'text/csv');
    },
    guardarCfg() {
      const t = num($('ct').value); if (!(t > 0)) return toast('Tasa inválida', true);
      const g = $('cg').value.split('\n').map((x) => x.trim()).filter(Boolean), i = $('ci').value.split('\n').map((x) => x.trim()).filter(Boolean);
      if (!g.length || !i.length) return toast('Debe haber al menos una categoría de cada tipo', true);
      S.nombre = $('cn').value.trim() || S.nombre; S.tasa = r2(t); S.cats = { gasto: [...new Set(g)], ingreso: [...new Set(i)] }; save(); go(); toast('Guardado');
    },
    respaldo() { bajar('finanzas-respaldo-' + hoy() + '.json', JSON.stringify(S, null, 1), 'application/json'); },
    restaurar(f) { if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.v !== 1 || !Array.isArray(d.movs) || !Array.isArray(d.cuentas)) throw 0; S = d; save(); go(); toast('Respaldo cargado'); } catch (e) { toast('Ese archivo no es un respaldo de Finanzas', true); } }; r.readAsText(f); },
    reset(modo) { dlg(modo === 'demo' ? 'Volver a los datos de ejemplo' : 'Empezar en blanco', '<p>' + (modo === 'demo' ? 'Se borra lo que registraste y se cargan los datos de ejemplo.' : 'Se borra todo y quedas con dos cuentas vacías para empezar.') + ' Si quieres conservar algo, descarga un respaldo antes.</p>', '<button class="btn sec" onclick="F.cerrar()">Cancelar</button><button class="btn danger" onclick="F.okReset(\'' + modo + '\')">Sí, continuar</button>'); },
    okReset(modo) { S = modo === 'demo' ? seed() : blank(); save(); mes = hoy().slice(0, 7); cerrar(); location.hash = modo === 'demo' ? 'resumen' : 'cuentas'; go(); toast(modo === 'demo' ? 'Datos de ejemplo cargados' : 'Listo. Ajusta tus cuentas y su saldo inicial'); }
  };
  function bajar(n, d, t) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: t })); a.download = n; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  load(); go();
})();
