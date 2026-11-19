/* X3 DATA · Módulo de producción y lotes
   Insumos (materia prima y empaque), recetas con costo automático, registro de producción,
   lotes (varios días = un lote; se cierra al pedir etiquetas; solo se vende lo de lotes cerrados),
   vencimientos, salida del lote más viejo y plan de compras de materia prima. Datos ficticios. */
(function () {
  'use strict';
  const H = window.X3H; if (!H || H.EN) return;
  const { esc, usd, qty, pct, num, uid, r2, hoy, addDays, diasEntre, fdia, toast, kpi } = H;
  const S = () => H.S;
  const P = () => S().prod;
  const on = () => S().mods && S().mods.prod !== false;
  const prod = (id) => H.prod(id);
  const addMeses = (iso, k) => { const d = new Date(iso + 'T12:00'); d.setMonth(d.getMonth() + k); return d.toISOString().slice(0, 10); };

  /* ---------- datos ---------- */
  function ensure(st) {
    st.mods = st.mods || { prod: true, dist: true, forma: true, nomina: true };
    if (st.prod) return;
    st.prod = { recetas: {}, ordenes: [], lotes: [], seq: { orden: 1, lote: 1 } };
    if (st.demo || /Demo/.test(st.empresa || '')) demo(st);
  }
  function demo(st) {
    const I = [ // código, nombre, categoría, unidad, costo $, mínimo, existencia inicial
      ['MP-01', 'Harina de trigo', 'Materia prima', 'kg', 1.10, 40, 180], ['MP-02', 'Avena en hojuelas', 'Materia prima', 'kg', 2.40, 20, 140],
      ['MP-03', 'Azúcar', 'Materia prima', 'kg', 1.05, 20, 90], ['MP-04', 'Mantequilla', 'Materia prima', 'kg', 5.80, 10, 70],
      ['MP-05', 'Huevos', 'Materia prima', 'Unidad', 0.16, 120, 1400], ['MP-06', 'Tomate', 'Materia prima', 'kg', 0.90, 30, 330],
      ['MP-07', 'Cebolla', 'Materia prima', 'kg', 0.85, 10, 45], ['MP-08', 'Sal y especias', 'Materia prima', 'kg', 3.20, 3, 10],
      ['EM-01', 'Bolsa sellable 12 galletas', 'Empaque', 'Unidad', 0.06, 300, 1500], ['EM-02', 'Frasco de vidrio 500 g con tapa', 'Empaque', 'Unidad', 0.42, 150, 700],
      ['EM-03', 'Etiqueta adhesiva', 'Empaque', 'Unidad', 0.03, 400, 2500]
    ];
    const id = {};
    I.forEach((x) => { const o = { id: uid(), cod: x[0], barras: '', nombre: x[1], cat: x[2], unidad: x[3], costo: x[4], precio: 0, min: x[5], exento: true, activo: true, inicial: x[6], tipo: 'insumo' }; st.productos.push(o); id[x[0]] = o.id; });
    const F = [['FAB-01', 'Galletas de avena x12 (fabricación propia)', 'Fabricación propia', 'Paquete', 3.40, 40], ['FAB-02', 'Salsa de tomate casera 500 g', 'Fabricación propia', 'Frasco', 3.10, 30]];
    F.forEach((x) => { const o = { id: uid(), cod: x[0], barras: '', nombre: x[1], cat: x[2], unidad: x[3], costo: 0, precio: x[4], min: x[5], exento: false, activo: true, inicial: 0, tipo: 'fabricado' }; st.productos.push(o); id[x[0]] = o.id; });
    st.prod.recetas[id['FAB-01']] = { rinde: 1, vida: 6, lote: true, items: [[id['MP-01'], 0.12], [id['MP-02'], 0.10], [id['MP-03'], 0.06], [id['MP-04'], 0.05], [id['MP-05'], 1], [id['EM-01'], 1], [id['EM-03'], 1]].map((r) => ({ pid: r[0], cant: r[1] })) };
    st.prod.recetas[id['FAB-02']] = { rinde: 1, vida: 12, lote: true, items: [[id['MP-06'], 0.75], [id['MP-07'], 0.08], [id['MP-03'], 0.02], [id['MP-08'], 0.01], [id['EM-02'], 1], [id['EM-03'], 1]].map((r) => ({ pid: r[0], cant: r[1] })) };
    // producción de las últimas 4 semanas: lotes semanales, el de esta semana sigue abierto
    const h = hoy(); const plan = [[-26, 'FAB-01', 120], [-25, 'FAB-02', 60], [-24, 'FAB-01', 100], [-19, 'FAB-01', 140], [-18, 'FAB-02', 80], [-12, 'FAB-01', 120], [-11, 'FAB-02', 70], [-10, 'FAB-01', 90], [-3, 'FAB-01', 110], [-2, 'FAB-02', 50]];
    const stHook = (pid) => st.productos.find((p) => p.id === pid);
    plan.forEach((x) => {
      const pid = id[x[1]]; const f = addDays(h, x[0]);
      const r = st.prod.recetas[pid]; let lote = st.prod.lotes.find((l) => l.pid === pid && l.abierto);
      if (!lote) { lote = { id: uid(), num: st.prod.seq.lote++, pid, abierto: true, apertura: f }; st.prod.lotes.push(lote); }
      const cons = r.items.map((i) => ({ pid: i.pid, cant: r2(i.cant * x[2] / r.rinde), costo: stHook(i.pid).costo }));
      const ct = cons.reduce((a, c) => a + c.cant * c.costo, 0);
      st.prod.ordenes.push({ id: uid(), num: st.prod.seq.orden++, fecha: f, pid, cant: x[2], cons, costoU: r2(ct / x[2] * 10000) / 10000, lote: lote.id });
      // cierre semanal (los viernes de cada semana pasada)
      if ([-24, -18, -10, -11].includes(x[0])) cerrarLote(st, lote, addDays(f, 1));
    });
    st.prod.lotes.filter((l) => l.abierto && l.apertura < addDays(h, -9)).forEach((l) => cerrarLote(st, l, addDays(l.apertura, 3)));
    // algunas ventas de lo fabricado (salen del lote más viejo)
    const c0 = st.clientes[0] ? st.clientes[0].id : ''; const c1 = st.clientes[1] ? st.clientes[1].id : c0;
    [[-15, c0, [['FAB-01', 80], ['FAB-02', 30]]], [-8, c1, [['FAB-01', 120], ['FAB-02', 40]]], [-4, c0, [['FAB-01', 60]]]].forEach((v) => {
      const items = v[2].map((i) => { const p = stHook(id[i[0]]); return { pid: p.id, cant: i[1], precio: p.precio, costo: p.costo, exento: p.exento }; });
      st.ventas.push(H.armarVenta(st, { fecha: addDays(h, v[0]) + 'T10:30', cli: v[1], cond: 'credito', dias: 7, tasa: st.tasa, items }));
    });
    st.ventas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  function cerrarLote(st, lote, fechaEtiqueta) {
    const r = st.prod.recetas[lote.pid] || { vida: 24 };
    const ords = st.prod.ordenes.filter((o) => o.lote === lote.id && !o.anulada);
    const und = ords.reduce((a, o) => a + o.cant, 0); const costo = ords.reduce((a, o) => a + o.cant * o.costoU, 0);
    // costo promedio ponderado del producto terminado al entrar al inventario vendible
    const p = st.productos.find((x) => x.id === lote.pid); const disp = Math.max(0, stockSin(st, lote.pid));
    if (und > 0) p.costo = r2((disp * (p.costo || 0) + costo) / (disp + und) * 100) / 100;
    lote.abierto = false; lote.cierre = fechaEtiqueta; lote.etiqueta = fechaEtiqueta; lote.vence = addMeses(fechaEtiqueta, r.vida || 24);
  }
  // existencia vendible de un producto antes de sumar un lote nuevo
  function stockSin(st, pid) { const keep = H.S; return (keep === st ? H.stockMap()[pid] : 0) || 0; }

  // movimientos de inventario por producción
  H.stockHooks.push((m, st) => {
    if (!st.prod) return;
    const cerrado = {}; st.prod.lotes.forEach((l) => (cerrado[l.id] = !l.abierto));
    st.prod.ordenes.forEach((o) => {
      if (o.anulada) return;
      o.cons.forEach((c) => (m[c.pid] = (m[c.pid] || 0) - c.cant));
      if (!o.lote || cerrado[o.lote]) m[o.pid] = (m[o.pid] || 0) + o.cant;
    });
  });

  /* ---------- cálculos ---------- */
  const insumos = () => S().productos.filter((p) => p.tipo === 'insumo');
  const fabricados = () => S().productos.filter((p) => p.tipo === 'fabricado');
  const receta = (pid) => P().recetas[pid];
  const costoReceta = (pid) => { const r = receta(pid); if (!r) return 0; return r.items.reduce((a, i) => a + i.cant * (prod(i.pid)?.costo || 0), 0) / (r.rinde || 1); };
  const enProceso = (pid) => P().ordenes.filter((o) => !o.anulada && o.pid === pid && P().lotes.find((l) => l.id === o.lote && l.abierto)).reduce((a, o) => a + o.cant, 0);
  const undLote = (l) => P().ordenes.filter((o) => !o.anulada && o.lote === l.id).reduce((a, o) => a + o.cant, 0);
  // salida del lote más viejo (FIFO por fecha de etiqueta): asigna lo vendido a los lotes cerrados
  function fifo(pid) {
    const lotes = P().lotes.filter((l) => l.pid === pid && !l.abierto).sort((a, b) => (a.etiqueta + a.num).localeCompare(b.etiqueta + b.num)).map((l) => ({ l, und: undLote(l), sale: 0 }));
    let vendido = 0; H.vivas().forEach((v) => v.items.forEach((x) => { if (x.pid === pid) vendido += x.cant; }));
    S().ajustes.forEach((a) => { if (a.pid === pid && a.cant < 0) vendido -= a.cant; });
    const ini = +(prod(pid)?.inicial) || 0; vendido = Math.max(0, vendido - ini);
    lotes.forEach((o) => { const t = Math.min(o.und, vendido); o.sale = t; vendido -= t; });
    return lotes;
  }

  /* ---------- vistas ---------- */
  const { V, A } = H;
  let PF = { pid: '', cant: '', fecha: '' };
  V.prod = () => {
    if (!on()) return off();
    const sm = H.stockMap(); const ab = P().lotes.filter((l) => l.abierto); const bajos = insumos().filter((p) => p.activo && sm[p.id] <= p.min).length;
    const hoyN = P().ordenes.filter((o) => !o.anulada && o.fecha === hoy()).reduce((a, o) => a + o.cant, 0);
    return H.hub('Producción', '¿Qué quieres hacer?', [
      { k: 'produccion', ic: '🥣', t: 'Anotar lo que hice hoy', d: 'Dices qué produjiste y cuánto. Los ingredientes se descuentan solos.', bd: hoyN ? qty(hoyN) + ' und hoy' : '' },
      { k: 'lotes', ic: '🏷️', t: 'Pedir etiquetas', d: 'Cierra los lotes para poder vender lo producido.', bd: ab.length ? ab.length + ' por etiquetar' : '', bc: 'w' },
      { k: 'plan', ic: '🛒', t: '¿Qué tengo que comprar?', d: 'Dices cuánto quieres hacer y te sale la lista de compras.', bd: bajos ? bajos + ' insumos bajos' : '', bc: 'b' },
      { k: 'recetas', ic: '📒', t: 'Mis recetas e ingredientes', d: 'Qué lleva cada producto y cuánto te cuesta hacerlo.' }
    ]);
  };
  V.produccion = () => {
    if (!on()) return off();
    const h = hoy(); const ym = h.slice(0, 7); const sm = H.stockMap();
    const mes = P().ordenes.filter((o) => !o.anulada && o.fecha.slice(0, 7) === ym);
    const abiertos = P().lotes.filter((l) => l.abierto); const porEt = abiertos.reduce((a, l) => a + undLote(l), 0);
    const bajos = insumos().filter((p) => p.activo && sm[p.id] <= p.min);
    const F = fabricados().filter((p) => p.activo && receta(p.id));
    if (!PF.pid && F[0]) PF.pid = F[0].id; if (!PF.fecha) PF.fecha = h;
    return H.back('prod', 'Producción') + '<h1>Anotar lo que hice hoy</h1><p class="sub">Elige el producto y la cantidad. Abajo ves qué ingredientes se van a usar y si te alcanzan.</p>' +
      '<div class="kpis">' + kpi(qty(mes.reduce((a, o) => a + o.cant, 0)) + ' und', 'Producido en el mes · ' + mes.length + ' registros') + kpi(usd(mes.reduce((a, o) => a + o.cant * o.costoU, 0)), 'Costo de lo producido en el mes', 'var(--ok)') + kpi(qty(porEt) + ' und', abiertos.length + ' lotes abiertos por etiquetar', 'var(--warn)') + kpi(bajos.length, 'Insumos bajo el mínimo', bajos.length ? 'var(--bad)' : 'var(--ok)') + '</div>' +
      '<div class="g2"><div class="card"><h3>Registrar producción</h3>' + (F.length ? '<div class="form"><label class="f full">Producto<select class="inp" id="pp" onchange="X.pfSet(\'pid\',this.value)">' + F.map((p) => '<option value="' + p.id + '"' + (p.id === PF.pid ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select></label>' +
        '<label class="f">Cantidad producida<input class="inp num" id="pq" inputmode="decimal" value="' + esc(PF.cant) + '" oninput="X.pfSet(\'cant\',this.value)"></label><label class="f">Fecha<input class="inp" type="date" id="pf" value="' + PF.fecha + '" onchange="X.pfSet(\'fecha\',this.value)"></label></div><div id="pprev" style="margin-top:10px"></div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" onclick="X.producir()">Guardar</button></div>' : '<div class="empty">Primero crea tu producto y su receta en <button class="lnk" onclick="location.hash=\'recetas\'">Mis recetas</button>.</div>') + '</div>' +
      '<div class="card scroll"><h3>Insumos bajo el mínimo</h3>' + (bajos.length ? '<table><thead><tr><th>Insumo</th><th class="r">Exist.</th><th class="r">Mín.</th></tr></thead><tbody>' + bajos.map((p) => '<tr><td class="wrap">' + esc(p.nombre) + '</td><td class="r">' + qty(sm[p.id]) + ' ' + esc(p.unidad) + '</td><td class="r">' + qty(p.min) + '</td></tr>').join('') + '</tbody></table><p class="hint">Revisa el <button class="lnk" onclick="location.hash=\'plan\'">plan de compras</button>.</p>' : '<div class="empty">Todos los insumos están sobre el mínimo</div>') + '</div></div>' +
      '<div class="card scroll"><h3>Últimos registros</h3>' + tablaOrdenes(P().ordenes.slice().reverse().slice(0, 40)) + '</div>';
  };
  A.produccion = () => preview();
  function preview() {
    const el = H.$('pprev'); if (!el) return; const r = receta(PF.pid); const n = num(PF.cant); if (!r) return (el.innerHTML = '');
    const sm = H.stockMap(); const c = n > 0 ? n : 1;
    let falta = false;
    el.innerHTML = '<table><thead><tr><th>Insumo</th><th class="r">Usa</th><th class="r">Hay</th><th class="r">Costo</th></tr></thead><tbody>' + r.items.map((i) => { const p = prod(i.pid); const u = r2(i.cant * c / (r.rinde || 1)); const ok = sm[i.pid] >= u; if (!ok) falta = true; return '<tr><td class="wrap">' + esc(p?.nombre) + '</td><td class="r">' + qty(u) + ' ' + esc(p?.unidad) + '</td><td class="r"' + (ok ? '' : ' style="color:var(--bad);font-weight:700"') + '>' + qty(sm[i.pid]) + '</td><td class="r">' + usd(u * p.costo) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td colspan="3">Costo ' + (n > 0 ? 'total' : 'por unidad') + ' · ' + usd(costoReceta(PF.pid)) + ' c/u</td><td class="r">' + usd(costoReceta(PF.pid) * c) + '</td></tr></tbody></table>' + (falta ? '<p class="hint" style="color:var(--bad)">No alcanza algún insumo para esa cantidad.</p>' : '');
  }
  function tablaOrdenes(L) {
    if (!L.length) return '<div class="empty">No hay producción registrada</div>';
    return '<table><thead><tr><th>N°</th><th>Fecha</th><th>Producto</th><th class="r">Cant.</th><th class="r hm">Costo c/u</th><th>Lote</th><th></th></tr></thead><tbody>' + L.map((o) => { const l = P().lotes.find((x) => x.id === o.lote); return '<tr' + (o.anulada ? ' class="off"' : '') + '><td>' + String(o.num).padStart(4, '0') + '</td><td>' + fdia(o.fecha) + '</td><td class="wrap">' + esc(prod(o.pid)?.nombre) + '</td><td class="r">' + qty(o.cant) + '</td><td class="r hm">' + usd(o.costoU) + '</td><td>' + (l ? codLote(l) + (l.abierto ? ' <span class="tag warn">Abierto</span>' : '') : '—') + '</td><td>' + (!o.anulada && (!l || l.abierto) ? '<button class="btn sm sec" onclick="X.anularOrden(\'' + o.id + '\')">Anular</button>' : o.anulada ? '<span class="tag mut">Anulada</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  const codLote = (l) => (prod(l.pid)?.cod || 'L') + '-' + String(l.num).padStart(4, '0');

  V.recetas = () => {
    if (!on()) return off();
    const F = fabricados(); const I = insumos(); const sm = H.stockMap();
    return H.back('prod', 'Producción') + '<h1>Recetas e ingredientes</h1><p class="sub">Lo que lleva cada producto. El costo por unidad se calcula solo con lo que te costaron los ingredientes.</p>' +
      '<div class="card scroll"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Productos de fabricación propia</h3><button class="btn sm" onclick="X.nuevoFab()">+ Producto fabricado</button></div>' +
      (F.length ? '<table><thead><tr><th>Producto</th><th class="r">Costo receta</th><th class="r">Precio</th><th class="r">Margen</th><th class="r hm">Vida útil</th><th class="r hm">En proceso</th><th class="r">Vendible</th><th></th></tr></thead><tbody>' + F.map((p) => { const c = costoReceta(p.id); const r = receta(p.id); return '<tr' + (p.activo ? '' : ' class="off"') + '><td class="wrap"><b>' + esc(p.nombre) + '</b><div class="hint">' + esc(p.cod) + (r ? ' · ' + r.items.length + ' insumos' + (r.lote ? ' · maneja lote' : '') : ' · <span style="color:var(--bad)">sin receta</span>') + '</div></td><td class="r">' + usd(c) + '</td><td class="r">' + usd(p.precio) + '</td><td class="r">' + (p.precio ? pct((p.precio - c) / p.precio) : '—') + '</td><td class="r hm">' + (r ? r.vida + ' meses' : '—') + '</td><td class="r hm">' + qty(enProceso(p.id)) + '</td><td class="r">' + qty(sm[p.id] || 0) + '</td><td><button class="btn sm sec" onclick="X.receta(\'' + p.id + '\')">Receta</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No hay productos de fabricación propia</div>') + '</div>' +
      '<div class="card scroll"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Insumos (materia prima y empaque)</h3><button class="btn sm" onclick="X.insumo()">+ Insumo</button></div>' +
      (I.length ? '<table><thead><tr><th>Insumo</th><th class="hm">Categoría</th><th class="r">Existencia</th><th class="r">Mínimo</th><th class="r">Costo prom.</th><th class="r hm">Valor</th><th></th></tr></thead><tbody>' + I.map((p) => '<tr' + (p.activo ? '' : ' class="off"') + '><td class="wrap"><b>' + esc(p.nombre) + '</b><div class="hint">' + esc(p.cod) + '</div></td><td class="hm">' + esc(p.cat) + '</td><td class="r"' + (sm[p.id] <= p.min ? ' style="color:var(--bad);font-weight:700"' : '') + '>' + qty(sm[p.id]) + ' ' + esc(p.unidad) + '</td><td class="r">' + qty(p.min) + '</td><td class="r">' + usd(p.costo) + '</td><td class="r hm">' + usd(Math.max(0, sm[p.id]) * p.costo) + '</td><td><button class="btn sm sec" onclick="X.insumo(\'' + p.id + '\')">Editar</button></td></tr>').join('') + '</tbody></table><p class="hint">Las compras de insumos se registran en <button class="lnk" onclick="location.hash=\'compras\'">Compras</button>, como cualquier otra mercancía: eso actualiza su costo promedio. Los insumos no aparecen en caja ni en facturación.</p>' : '<div class="empty">No hay insumos</div>') + '</div>';
  };

  V.lotes = () => {
    if (!on()) return off();
    const h = hoy(); const abiertos = P().lotes.filter((l) => l.abierto); const F = fabricados();
    const cerr = []; F.forEach((p) => fifo(p.id).forEach((o) => cerr.push(o))); cerr.sort((a, b) => (b.l.etiqueta || '').localeCompare(a.l.etiqueta || ''));
    const est = (o) => { const d = o.und - o.sale; if (d <= 0) return '<span class="tag mut">Agotado</span>'; const dv = diasEntre(h, o.l.vence); return dv < 0 ? '<span class="tag bad">Vencido</span>' : dv <= 60 ? '<span class="tag warn">Vence en ' + dv + ' d</span>' : '<span class="tag ok">Disponible</span>'; };
    return H.back('prod', 'Producción') + '<h1>Pedir etiquetas</h1><p class="sub">Lo que produces en la semana se junta en un lote. Cuando pidas las etiquetas, cierra el lote: desde ahí ya se puede vender y queda con su fecha de vencimiento.</p>' +
      '<div class="card scroll"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Lotes abiertos (por etiquetar)</h3>' + (abiertos.length ? '<button class="btn sm" onclick="X.cerrarLotes()">Pedir etiquetas y cerrar lotes</button>' : '') + '</div>' +
      (abiertos.length ? '<table><thead><tr><th>Lote</th><th>Producto</th><th>Desde</th><th class="r">Días</th><th class="r">Unidades</th><th class="r hm">Costo</th><th></th></tr></thead><tbody>' + abiertos.map((l) => { const ords = P().ordenes.filter((o) => !o.anulada && o.lote === l.id); return '<tr><td><b>' + codLote(l) + '</b></td><td class="wrap">' + esc(prod(l.pid)?.nombre) + '</td><td>' + fdia(l.apertura) + '</td><td class="r">' + (diasEntre(l.apertura, h) + 1) + '</td><td class="r">' + qty(undLote(l)) + '</td><td class="r hm">' + usd(ords.reduce((a, o) => a + o.cant * o.costoU, 0)) + '</td><td><button class="btn sm sec" onclick="X.cerrarLotes(\'' + l.id + '\')">Cerrar</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No hay lotes abiertos. Al registrar producción se abre uno.</div>') + '</div>' +
      '<div class="card scroll"><h3>Lotes cerrados y vendibles</h3>' + (cerr.length ? '<table><thead><tr><th>Lote</th><th>Producto</th><th class="hm">Etiqueta</th><th>Vence</th><th class="r">Producido</th><th class="r">Vendido</th><th class="r">Queda</th><th>Estado</th></tr></thead><tbody>' + cerr.map((o) => '<tr><td><b>' + codLote(o.l) + '</b></td><td class="wrap">' + esc(prod(o.l.pid)?.nombre) + '</td><td class="hm">' + fdia(o.l.etiqueta) + '</td><td>' + fdia(o.l.vence) + '</td><td class="r">' + qty(o.und) + '</td><td class="r">' + qty(o.sale) + '</td><td class="r"><b>' + qty(o.und - o.sale) + '</b></td><td>' + est(o) + '</td></tr>').join('') + '</tbody></table><p class="hint">Vendido = asignado por salida del lote más viejo primero (las ventas y mermas del producto, en orden).</p>' : '<div class="empty">Aún no hay lotes cerrados</div>') + '</div>';
  };

  let plan = null;
  V.plan = () => {
    if (!on()) return off();
    const F = fabricados().filter((p) => p.activo && receta(p.id)); const sm = H.stockMap();
    if (!plan) { plan = {}; F.forEach((p) => (plan[p.id] = Math.max(Math.ceil(p.min * 2), Math.ceil(p.min * 4 - (sm[p.id] || 0) - enProceso(p.id))))); }
    const req = {}; F.forEach((p) => { const n = +plan[p.id] || 0; const r = receta(p.id); r.items.forEach((i) => (req[i.pid] = (req[i.pid] || 0) + i.cant * n / (r.rinde || 1))); });
    const filas = Object.keys(req).map((k) => { const p = prod(k); const nec = r2(req[k]); const hay = Math.max(0, sm[k] || 0); const falta = Math.max(0, r2(nec - hay)); const sug = falta > 0 ? r2(falta + (p.min || 0)) : 0; return { p, nec, hay, falta, sug }; }).sort((a, b) => b.falta * b.p.costo - a.falta * a.p.costo);
    const tot = filas.reduce((a, f) => a + f.sug * f.p.costo, 0);
    return H.back('prod', 'Producción') + '<h1>¿Qué tengo que comprar?</h1><p class="sub">Escribe cuánto quieres producir. Te decimos qué ingredientes y empaques faltan y cuánto cuesta comprarlos.</p>' +
      '<div class="g2"><div class="card"><h3>Quiero producir</h3>' + (F.length ? '<table><tbody>' + F.map((p) => '<tr><td class="wrap">' + esc(p.nombre) + '<div class="hint">Vendible ' + qty(sm[p.id] || 0) + ' · en proceso ' + qty(enProceso(p.id)) + '</div></td><td class="r" style="width:120px"><input class="inp num" inputmode="decimal" value="' + (plan[p.id] || 0) + '" onchange="X.planSet(\'' + p.id + '\',this.value)"></td></tr>').join('') + '</tbody></table><div class="row" style="justify-content:flex-end"><button class="btn sm sec" onclick="X.planReset()">Sugerir según mínimos</button></div>' : '<div class="empty">No hay productos con receta</div>') + '</div>' +
      '<div class="card">' + kpi(usd(tot), 'Compra sugerida · ' + filas.filter((f) => f.falta > 0).length + ' insumos por comprar', tot ? 'var(--warn)' : 'var(--ok)') + '<p class="hint">Calculado con el costo promedio actual de cada insumo.</p><div class="row"><button class="btn sec" onclick="X.planCsv()">Descargar CSV</button></div></div></div>' +
      '<div class="card scroll"><h3>Necesidades de insumos</h3>' + (filas.length ? '<table><thead><tr><th>Insumo</th><th class="r">Necesita</th><th class="r">Hay</th><th class="r">Falta</th><th class="r">Comprar</th><th class="r">Costo</th></tr></thead><tbody>' + filas.map((f) => '<tr><td class="wrap">' + esc(f.p.nombre) + '</td><td class="r">' + qty(f.nec) + ' ' + esc(f.p.unidad) + '</td><td class="r">' + qty(f.hay) + '</td><td class="r"' + (f.falta ? ' style="color:var(--bad);font-weight:700"' : '') + '>' + qty(f.falta) + '</td><td class="r"><b>' + qty(f.sug) + '</b></td><td class="r">' + usd(f.sug * f.p.costo) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">Nada que calcular</div>') + '</div>';
  };

  const off = () => '<h1>Módulo apagado</h1><p class="sub">Actívalo en <button class="lnk" onclick="location.hash=\'modulos\'">Módulos</button>.</p>';

  /* ---------- acciones ---------- */
  Object.assign(window.X, {
    pfSet(k, v) { PF[k] = v; if (k === 'pid') H.go(true); else preview(); },
    producir() {
      const st = S(); const r = receta(PF.pid); const n = r2(num(PF.cant)); const f = PF.fecha || hoy();
      if (!r) return toast('Ese producto no tiene receta', true); if (!(n > 0)) return toast('Escribe la cantidad producida', true); if (f > hoy()) return toast('La fecha no puede ser futura', true);
      const sm = H.stockMap(); const cons = r.items.map((i) => ({ pid: i.pid, cant: r2(i.cant * n / (r.rinde || 1)), costo: prod(i.pid).costo }));
      const f1 = cons.find((c) => c.cant > (sm[c.pid] || 0) + 1e-9); if (f1) return toast('No alcanza: ' + prod(f1.pid).nombre + ' (hay ' + qty(sm[f1.pid]) + ')', true);
      let lote = null;
      if (r.lote) { lote = st.prod.lotes.find((l) => l.pid === PF.pid && l.abierto); if (!lote) { lote = { id: uid(), num: st.prod.seq.lote++, pid: PF.pid, abierto: true, apertura: f }; st.prod.lotes.push(lote); } }
      const ct = cons.reduce((a, c) => a + c.cant * c.costo, 0);
      if (!lote) { const p = prod(PF.pid); const d = Math.max(0, sm[p.id] || 0); p.costo = r2((d * p.costo + ct) / (d + n) * 100) / 100; }
      st.prod.ordenes.push({ id: uid(), num: st.prod.seq.orden++, fecha: f, pid: PF.pid, cant: n, cons, costoU: Math.round(ct / n * 10000) / 10000, lote: lote ? lote.id : '' });
      H.save(); PF.cant = ''; H.go(true); toast('Producción registrada' + (lote ? ' en el lote ' + codLote(lote) : ''));
    },
    anularOrden(id) { H.dlg('Anular producción', '<p>Los insumos vuelven al inventario y las unidades salen del lote abierto.</p>', '<button class="btn sec" onclick="X.cerrar()">No</button><button class="btn danger" onclick="X.okAnularOrden(\'' + id + '\')">Sí, anular</button>'); },
    okAnularOrden(id) { const o = P().ordenes.find((x) => x.id === id); o.anulada = true; const l = P().lotes.find((x) => x.id === o.lote); if (l && l.abierto && !undLote(l)) P().lotes = P().lotes.filter((x) => x !== l); H.save(); H.cerrar(); H.go(true); toast('Producción anulada'); },
    cerrarLotes(id) {
      const L = P().lotes.filter((l) => l.abierto && (!id || l.id === id)); if (!L.length) return;
      H.dlg('Pedir etiquetas y cerrar ' + (L.length > 1 ? L.length + ' lotes' : 'el lote ' + codLote(L[0])), '<p>Las etiquetas se piden con una sola fecha para todo el pedido. Al cerrar, las unidades pasan al inventario vendible con su vencimiento.</p><div class="form"><label class="f">Fecha de la etiqueta<input class="inp" type="date" id="lfe" value="' + hoy() + '"></label></div>' +
        '<table style="margin-top:10px"><thead><tr><th>Lote</th><th>Producto</th><th class="r">Und.</th><th>Vence</th></tr></thead><tbody>' + L.map((l) => '<tr><td>' + codLote(l) + '</td><td class="wrap">' + esc(prod(l.pid)?.nombre) + '</td><td class="r">' + qty(undLote(l)) + '</td><td>' + (receta(l.pid)?.vida || 24) + ' meses</td></tr>').join('') + '</tbody></table>' +
        '<h3 style="margin-top:14px">Mensaje para el pedido de etiquetas</h3><textarea class="inp" id="lmsg" rows="6" readonly style="width:100%;font-family:inherit"></textarea>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn sec" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById(\'lmsg\').value);X.toastOk()">Copiar mensaje</button><button class="btn" onclick="X.okCerrarLotes(\'' + (id || '') + '\')">Cerrar ' + (L.length > 1 ? 'lotes' : 'lote') + '</button>', 620);
      const msg = () => { const f = H.$('lfe').value || hoy(); H.$('lmsg').value = 'Pedido de etiquetas · ' + S().empresa + '\nFecha de elaboración: ' + fdia(f) + '\n\n' + L.map((l) => '• ' + prod(l.pid)?.nombre + ' (' + prod(l.pid)?.cod + ') · lote ' + codLote(l) + ': ' + undLote(l) + ' etiquetas · vence ' + fdia(addMeses(f, receta(l.pid)?.vida || 24))).join('\n'); };
      H.$('lfe').onchange = msg; msg();
    },
    toastOk() { toast('Mensaje copiado'); },
    okCerrarLotes(id) { const f = H.$('lfe').value || hoy(); const st = S(); st.prod.lotes.filter((l) => l.abierto && (!id || l.id === id)).forEach((l) => cerrarLote(st, l, f)); H.save(); H.cerrar(); H.go(true); toast('Lote cerrado: ya se puede vender'); },
    insumo(id) {
      const p = id ? prod(id) : { cod: '', nombre: '', cat: 'Materia prima', unidad: 'kg', costo: '', min: 0, activo: true };
      H.dlg(id ? 'Editar insumo' : 'Nuevo insumo', '<div class="form"><label class="f">Código<input class="inp" id="ic" value="' + esc(p.cod) + '"></label><label class="f">Categoría<select class="inp" id="ik">' + ['Materia prima', 'Empaque', 'Otro insumo'].map((c) => '<option' + (c === p.cat ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label><label class="f full">Nombre<input class="inp" id="in" value="' + esc(p.nombre) + '"></label>' +
        '<label class="f">Unidad<input class="inp" id="iu" value="' + esc(p.unidad) + '" placeholder="kg, L, Unidad…"></label><label class="f">Costo por unidad $<input class="inp num" id="ico" inputmode="decimal" value="' + p.costo + '"></label><label class="f">Existencia mínima<input class="inp num" id="im" inputmode="decimal" value="' + p.min + '"></label>' + (id ? '<label class="f">Estado<select class="inp" id="ia"><option value="1"' + (p.activo ? ' selected' : '') + '>Activo</option><option value="0"' + (p.activo ? '' : ' selected') + '>Inactivo</option></select></label>' : '<label class="f">Existencia inicial<input class="inp num" id="ii" inputmode="decimal" value="0"></label>') + '</div>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.guardarInsumo(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardarInsumo(id) {
      const d = { cod: H.$('ic').value.trim(), cat: H.$('ik').value, nombre: H.$('in').value.trim(), unidad: H.$('iu').value.trim() || 'Unidad', costo: num(H.$('ico').value), min: num(H.$('im').value) };
      if (!d.nombre) return toast('Falta el nombre', true); if (!(d.costo >= 0)) return toast('Revisa el costo', true); if (!(d.min >= 0)) d.min = 0;
      if (!d.cod) d.cod = (d.cat === 'Empaque' ? 'EM-' : 'MP-') + String(insumos().length + 1).padStart(2, '0');
      if (id) { Object.assign(prod(id), d, { activo: H.$('ia').value === '1' }); } else { const ini = num(H.$('ii').value); S().productos.push(Object.assign({ id: uid(), barras: '', precio: 0, exento: true, activo: true, inicial: ini > 0 ? ini : 0, tipo: 'insumo' }, d)); }
      H.save(); H.cerrar(); H.go(true); toast('Insumo guardado');
    },
    nuevoFab() {
      H.dlg('Nuevo producto de fabricación propia', '<div class="form"><label class="f">Código<input class="inp" id="fc"></label><label class="f">Unidad de venta<input class="inp" id="fu" value="Unidad"></label><label class="f full">Nombre<input class="inp" id="fn"></label><label class="f">Precio sin IVA $<input class="inp num" id="fp" inputmode="decimal"></label><label class="f">Existencia mínima<input class="inp num" id="fm" inputmode="decimal" value="10"></label><label class="f full" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="fe"> Exento de IVA</label></div><p class="hint">Después de guardar armas la receta.</p>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okFab()">Guardar y armar receta</button>');
    },
    okFab() {
      const n = H.$('fn').value.trim(), pr = num(H.$('fp').value); if (!n) return toast('Falta el nombre', true); if (!(pr > 0)) return toast('Revisa el precio', true);
      const p = { id: uid(), cod: H.$('fc').value.trim() || 'FAB-' + String(fabricados().length + 1).padStart(2, '0'), barras: '', nombre: n, cat: 'Fabricación propia', unidad: H.$('fu').value.trim() || 'Unidad', costo: 0, precio: r2(pr), min: num(H.$('fm').value) || 0, exento: H.$('fe').checked, activo: true, inicial: 0, tipo: 'fabricado' };
      S().productos.push(p); P().recetas[p.id] = { rinde: 1, vida: 24, lote: true, items: [] }; H.save(); H.cerrar(); X.receta(p.id);
    },
    receta(pid) {
      const p = prod(pid); const r = receta(pid) || (P().recetas[pid] = { rinde: 1, vida: 24, lote: true, items: [] });
      RD = { pid, rinde: r.rinde, vida: r.vida, lote: r.lote, items: r.items.map((i) => ({ ...i })) }; pintarReceta(p);
    },
    rdSet(k, v) { if (k === 'lote') RD.lote = v; else RD[k] = num(v); pintarReceta(prod(RD.pid)); },
    rdItem(i, k, v) { if (k === 'pid') RD.items[i].pid = v; else RD.items[i].cant = num(v); pintarReceta(prod(RD.pid)); },
    rdMas() { RD.items.push({ pid: '', cant: 0 }); pintarReceta(prod(RD.pid)); },
    rdQuitar(i) { RD.items.splice(i, 1); pintarReceta(prod(RD.pid)); },
    okReceta() {
      const items = RD.items.filter((i) => i.pid && i.cant > 0).map((i) => ({ pid: i.pid, cant: r2(i.cant * 10000) / 10000 }));
      if (!items.length) return toast('Agrega al menos un insumo con cantidad', true); if (!(RD.rinde > 0)) return toast('El rendimiento debe ser mayor a cero', true);
      P().recetas[RD.pid] = { rinde: RD.rinde, vida: RD.vida > 0 ? RD.vida : 24, lote: !!RD.lote, items }; H.save(); H.cerrar(); H.go(true); toast('Receta guardada');
    },
    planSet(pid, v) { plan[pid] = Math.max(0, num(v) || 0); H.go(true); },
    planReset() { plan = null; H.go(true); },
    planCsv() {
      const F = fabricados().filter((p) => receta(p.id)); const sm = H.stockMap(); const req = {};
      F.forEach((p) => { const n = +plan[p.id] || 0; const r = receta(p.id); r.items.forEach((i) => (req[i.pid] = (req[i.pid] || 0) + i.cant * n / (r.rinde || 1))); });
      const rows = [['Codigo', 'Insumo', 'Unidad', 'Necesita', 'Hay', 'Falta', 'Costo $']];
      Object.keys(req).forEach((k) => { const p = prod(k); const f = Math.max(0, r2(req[k] - Math.max(0, sm[k] || 0))); rows.push([p.cod, p.nombre, p.unidad, r2(req[k]), sm[k], f, r2(f * p.costo)]); });
      H.bajar('plan-de-compras-' + hoy() + '.csv', H.csv(rows), 'text/csv');
    }
  });
  let RD = null;
  function pintarReceta(p) {
    const I = insumos().filter((x) => x.activo); let ct = 0;
    const filas = RD.items.map((i, k) => { const q = prod(i.pid); const c = q ? i.cant * q.costo : 0; ct += c; return '<tr><td><select class="inp" style="min-width:200px" onchange="X.rdItem(' + k + ',\'pid\',this.value)"><option value="">Elegir insumo…</option>' + I.map((x) => '<option value="' + x.id + '"' + (x.id === i.pid ? ' selected' : '') + '>' + esc(x.nombre) + ' (' + esc(x.unidad) + ')</option>').join('') + '</select></td><td class="r" style="width:110px"><input class="inp num" inputmode="decimal" value="' + (i.cant || '') + '" onchange="X.rdItem(' + k + ',\'cant\',this.value)"></td><td class="r">' + usd(c) + '</td><td><button class="x" onclick="X.rdQuitar(' + k + ')" aria-label="Quitar">×</button></td></tr>'; }).join('');
    const cu = RD.rinde > 0 ? ct / RD.rinde : 0;
    H.dlg('Receta · ' + esc(p.nombre), '<div class="form"><label class="f">Rinde (unidades por tanda)<input class="inp num" inputmode="decimal" value="' + RD.rinde + '" onchange="X.rdSet(\'rinde\',this.value)"></label><label class="f">Vida útil (meses)<input class="inp num" inputmode="decimal" value="' + RD.vida + '" onchange="X.rdSet(\'vida\',this.value)"></label><label class="f full" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="checkbox"' + (RD.lote ? ' checked' : '') + ' onchange="X.rdSet(\'lote\',this.checked)"> Maneja lote (solo se vende lo de lotes cerrados, con vencimiento)</label></div>' +
      '<table style="margin-top:10px"><thead><tr><th>Insumo</th><th class="r">Cantidad por tanda</th><th class="r">Costo</th><th></th></tr></thead><tbody>' + filas + '<tr><td colspan="4"><button class="btn sm sec" onclick="X.rdMas()">+ Insumo</button></td></tr><tr class="tot"><td>Costo por unidad</td><td></td><td class="r">' + usd(cu) + '</td><td></td></tr></tbody></table>' +
      '<p class="hint">Precio ' + usd(p.precio) + (p.precio ? ' · margen ' + pct((p.precio - cu) / p.precio) : '') + '. Si la receta es por unidad, deja "Rinde" en 1.</p>',
      '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okReceta()">Guardar receta</button>', 680);
  }

  /* ---------- registro ---------- */
  H.mods.push({ id: 'prod', ensure });
  H.navMod('prod', 'Producción', 'prod'); H.sub('prod', ['produccion', 'lotes', 'recetas', 'plan']);
  H.X3prod = { fifo, costoReceta };
})();
