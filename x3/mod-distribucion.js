/* X3 DATA · Módulo de distribución
   Canales de venta con lista de precios (detal, mayorista, supermercado, restaurante), zonas y rutas,
   despachos con nota de entrega y hoja de ruta, entregas y devoluciones, y cobranza por zona con antigüedad. */
(function () {
  'use strict';
  const H = window.X3H; if (!H || H.EN) return;
  const { esc, usd, qty, num, uid, r2, hoy, addDays, diasEntre, fdia, toast, kpi, nfac } = H;
  const S = () => H.S; const D = () => S().dist;
  const on = () => S().mods && S().mods.dist !== false;
  const prod = (id) => H.prod(id);
  const CAN = ['Detal', 'Mayorista', 'Supermercado', 'Restaurante'];

  function ensure(st) {
    if (st.dist) return;
    st.dist = { canales: CAN.slice(), recargo: { Detal: 15, Mayorista: 0, Supermercado: 5, Restaurante: 3 }, precios: {}, zonas: ['Centro', 'Norte', 'Sur', 'Este'], cli: {}, choferes: ['Chofer 1'], despachos: [], seq: 1 };
    if (st.demo || /Demo/.test(st.empresa || '')) {
      const Z = st.dist.zonas; const Cn = ['Mayorista', 'Supermercado', 'Detal', 'Restaurante'];
      st.clientes.forEach((c, i) => (st.dist.cli[c.id] = { canal: Cn[i % 4], zona: Z[i % 4], dir: 'Av. Principal, local ' + (i + 1) + ', Sector ' + Z[i % 4], tel: '0414-000' + String(1000 + i * 37).slice(-4) }));
      st.dist.choferes = ['Chofer 1 (camioneta)', 'Chofer 2 (moto)'];
      // un despacho entregado y uno en ruta con facturas recientes a crédito
      const vs = st.ventas.filter((v) => !v.anulada && v.cli && v.cond === 'credito').slice(-8);
      if (vs.length >= 4) {
        const a = vs.slice(0, 4), b = vs.slice(4);
        st.dist.despachos.push({ id: uid(), num: st.dist.seq++, fecha: a[a.length - 1].fecha.slice(0, 10), zona: 'Todas', chofer: st.dist.choferes[0], facturas: a.map((v) => v.id), estado: 'entregado', ent: Object.fromEntries(a.map((v) => [v.id, { ok: true, nota: '' }])) });
        if (b.length) st.dist.despachos.push({ id: uid(), num: st.dist.seq++, fecha: hoy(), zona: 'Todas', chofer: st.dist.choferes[1], facturas: b.map((v) => v.id), estado: 'ruta', ent: {} });
      }
    }
  }
  const dc = (cid) => (cid && D().cli[cid]) || {};
  const canalDe = (cid) => dc(cid).canal || (cid ? 'Mayorista' : 'Detal');
  // precio según el canal del cliente: precio propio del canal o precio base + recargo del canal
  function precioCanal(p, cid) {
    if (!on() || !S().dist) return p.precio;
    const c = canalDe(cid); const pp = D().precios[p.id] && D().precios[p.id][c];
    return pp > 0 ? pp : r2(p.precio * (1 + (D().recargo[c] || 0) / 100));
  }
  H.precio = precioCanal;
  H.cliExtra = dc;
  const despachada = (vid) => D().despachos.some((d) => d.facturas.includes(vid));

  const { V, A } = H;
  const off = () => '<h1>Módulo apagado</h1><p class="sub">Actívalo en <button class="lnk" onclick="location.hash=\'modulos\'">Módulos</button>.</p>';

  V.dist = () => {
    if (!on()) return off();
    const pend = H.vivas().filter((v) => v.cli && v.fecha.slice(0, 10) >= addDays(hoy(), -7) && !despachada(v.id)).length;
    const venc = H.vivas().filter((v) => H.saldo(v) > 0.004 && v.vence < hoy()).length;
    return H.hub('Distribución', '¿Qué quieres hacer?', [
      { k: 'despachos', ic: '🚚', t: 'Despachar pedidos', d: 'Juntas las facturas por zona, imprimes la ruta y las notas de entrega.', bd: pend ? pend + ' por despachar' : '', bc: 'w' },
      { k: 'cobranza', ic: '💵', t: 'Cobrar', d: 'Quién te debe, desde cuándo, y el mensaje listo para WhatsApp.', bd: venc ? venc + ' facturas vencidas' : '', bc: 'b' },
      { k: 'precios', ic: '🏪', t: 'Precios por tipo de cliente', d: 'Un precio para supermercados, otro para detal, otro para restaurantes.' }
    ]);
  };
  V.precios = () => {
    if (!on()) return off();
    const L = S().productos.filter((p) => p.activo && p.tipo !== 'insumo');
    return H.back('dist', 'Distribución') + '<h1>Precios por tipo de cliente</h1><p class="sub">Cada cliente pertenece a un canal. Al facturarle, el sistema usa el precio de su canal: el precio propio que fijes aquí o, si lo dejas vacío, el precio base más el recargo del canal.</p>' +
      '<div class="card"><h3>Recargo por canal sobre el precio base</h3><div class="row">' + D().canales.map((c) => '<label class="f" style="max-width:160px">' + esc(c) + ' %<input class="inp num" inputmode="decimal" value="' + (D().recargo[c] || 0) + '" onchange="X.recargo(\'' + c + '\',this.value)"></label>').join('') + '</div></div>' +
      '<div class="card scroll"><h3>Lista de precios (sin IVA)</h3><table><thead><tr><th>Producto</th><th class="r">Costo</th><th class="r">Base</th>' + D().canales.map((c) => '<th class="r">' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      L.map((p) => '<tr><td class="wrap">' + esc(p.nombre) + '</td><td class="r">' + usd(p.costo) + '</td><td class="r">' + usd(p.precio) + '</td>' + D().canales.map((c) => { const pp = D().precios[p.id] && D().precios[p.id][c]; const ef = pp > 0 ? pp : r2(p.precio * (1 + (D().recargo[c] || 0) / 100)); return '<td class="r"><input class="inp num" style="width:90px' + (ef < p.costo ? ';color:var(--bad)' : '') + '" inputmode="decimal" placeholder="' + usd(ef).replace('$', '') + '" value="' + (pp > 0 ? pp : '') + '" onchange="X.precioCanal(\'' + p.id + '\',\'' + c + '\',this.value)"></td>'; }).join('') + '</tr>').join('') +
      '</tbody></table><p class="hint">En gris, el precio calculado con el recargo. En rojo, precios por debajo del costo.</p></div>' +
      '<div class="card scroll"><h3>Clientes: canal, zona y datos de entrega</h3><table><thead><tr><th>Cliente</th><th>Canal</th><th>Zona</th><th>Dirección</th><th>Teléfono</th></tr></thead><tbody>' +
      S().clientes.map((c) => { const x = dc(c.id); return '<tr><td class="wrap"><b>' + esc(c.nombre) + '</b></td><td><select class="inp" onchange="X.cliD(\'' + c.id + '\',\'canal\',this.value)">' + D().canales.map((k) => '<option' + (k === canalDe(c.id) ? ' selected' : '') + '>' + k + '</option>').join('') + '</select></td><td><select class="inp" onchange="X.cliD(\'' + c.id + '\',\'zona\',this.value)"><option value="">—</option>' + D().zonas.map((k) => '<option' + (k === x.zona ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select></td><td><input class="inp" style="min-width:200px" value="' + esc(x.dir || '') + '" onchange="X.cliD(\'' + c.id + '\',\'dir\',this.value)"></td><td><input class="inp" style="width:130px" value="' + esc(x.tel || '') + '" onchange="X.cliD(\'' + c.id + '\',\'tel\',this.value)"></td></tr>'; }).join('') +
      '</tbody></table><div class="row" style="margin-top:8px"><button class="btn sm sec" onclick="X.zonas()">Editar zonas y choferes</button></div></div>';
  };

  let DZ = '';
  V.despachos = () => {
    if (!on()) return off();
    const h = hoy(); const desde = addDays(h, -7);
    const pend = H.vivas().filter((v) => v.cli && v.fecha.slice(0, 10) >= desde && !despachada(v.id) && (!DZ || dc(v.cli).zona === DZ)).sort((a, b) => (dc(a.cli).zona || '').localeCompare(dc(b.cli).zona || '') || a.fecha.localeCompare(b.fecha));
    const L = D().despachos.slice().reverse();
    const est = (d) => d.estado === 'entregado' ? '<span class="tag ok">Entregado</span>' : d.estado === 'ruta' ? '<span class="tag warn">En ruta</span>' : '<span class="tag mut">Preparando</span>';
    return H.back('dist', 'Distribución') + '<h1>Despachar pedidos</h1><p class="sub">Agrupa las facturas por zona en un despacho, imprime la hoja de ruta y las notas de entrega, y al volver el chofer marca qué se entregó y qué volvió.</p>' +
      '<div class="kpis">' + kpi(pend.length, 'Facturas por despachar (últimos 7 días)', pend.length ? 'var(--warn)' : 'var(--ok)') + kpi(L.filter((d) => d.estado !== 'entregado').length, 'Despachos en ruta') + kpi(usd(pend.reduce((a, v) => a + v.total, 0)), 'Valor por despachar') + '</div>' +
      '<div class="card scroll"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Facturas por despachar</h3><div class="row"><select class="inp" onchange="X.dz(this.value)"><option value="">Todas las zonas</option>' + D().zonas.map((z) => '<option' + (z === DZ ? ' selected' : '') + '>' + esc(z) + '</option>').join('') + '</select><button class="btn sm" onclick="X.nuevoDespacho()"' + (pend.length ? '' : ' disabled') + '>Armar despacho con las marcadas</button></div></div>' +
      (pend.length ? '<table><thead><tr><th><input type="checkbox" checked onchange="document.querySelectorAll(\'.dsel\').forEach(c=>c.checked=this.checked)"></th><th>Factura</th><th>Fecha</th><th>Cliente</th><th>Zona</th><th class="r">Bultos</th><th class="r">Total</th></tr></thead><tbody>' + pend.map((v) => '<tr><td><input type="checkbox" class="dsel" value="' + v.id + '" checked></td><td><button class="lnk" onclick="X.verFactura(\'' + v.id + '\')">' + nfac(v.num) + '</button></td><td>' + fdia(v.fecha) + '</td><td class="wrap">' + esc(H.cliNom(v.cli)) + '</td><td>' + esc(dc(v.cli).zona || '—') + '</td><td class="r">' + qty(v.items.reduce((a, x) => a + x.cant, 0)) + '</td><td class="r">' + usd(v.total) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">Todo despachado</div>') + '</div>' +
      '<div class="card scroll"><h3>Despachos</h3>' + (L.length ? '<table><thead><tr><th>N°</th><th>Fecha</th><th>Zona</th><th>Chofer</th><th class="r">Facturas</th><th class="r">Valor</th><th>Estado</th><th></th></tr></thead><tbody>' + L.map((d) => { const vs = d.facturas.map((id) => S().ventas.find((v) => v.id === id)).filter(Boolean); return '<tr><td>' + String(d.num).padStart(4, '0') + '</td><td>' + fdia(d.fecha) + '</td><td>' + esc(d.zona) + '</td><td class="wrap">' + esc(d.chofer) + '</td><td class="r">' + vs.length + '</td><td class="r">' + usd(vs.reduce((a, v) => a + v.total, 0)) + '</td><td>' + est(d) + '</td><td class="row" style="flex-wrap:nowrap"><button class="btn sm sec" onclick="X.hojaRuta(\'' + d.id + '\')">Hoja de ruta</button><button class="btn sm sec" onclick="X.notas(\'' + d.id + '\')">Notas</button>' + (d.estado !== 'entregado' ? '<button class="btn sm" onclick="X.entregas(\'' + d.id + '\')">Entregas</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No hay despachos</div>') + '</div>';
  };

  V.cobranza = () => {
    if (!on()) return off();
    const h = hoy(); const B = [['Al día', -1e9, 0], ['1–7 días', 1, 7], ['8–15 días', 8, 15], ['16–30 días', 16, 30], ['+30 días', 31, 1e9]];
    const pend = H.vivas().filter((v) => H.saldo(v) > 0.004);
    const porZ = {}; pend.forEach((v) => { const z = dc(v.cli).zona || 'Sin zona'; const dv = diasEntre(v.vence, h); const o = porZ[z] || (porZ[z] = { t: 0, b: B.map(() => 0), cli: {} }); const s = H.saldo(v); o.t += s; o.b[B.findIndex((b) => dv >= b[1] && dv <= b[2])] += s; (o.cli[v.cli || ''] = o.cli[v.cli || ''] || []).push(v); });
    const Z = Object.keys(porZ).sort();
    return H.back('dist', 'Distribución') + '<h1>Cobrar</h1><p class="sub">Lo que se debe, por zona y por antigüedad desde el vencimiento. Desde aquí sale el recordatorio para cada cliente, listo para mandar por WhatsApp.</p>' +
      '<div class="card scroll"><table><thead><tr><th>Zona</th>' + B.map((b) => '<th class="r">' + b[0] + '</th>').join('') + '<th class="r">Total</th></tr></thead><tbody>' + Z.map((z) => '<tr><td><b>' + esc(z) + '</b></td>' + porZ[z].b.map((x, i) => '<td class="r"' + (i >= 3 && x ? ' style="color:var(--bad);font-weight:700"' : '') + '>' + (x ? usd(x) : '—') + '</td>').join('') + '<td class="r"><b>' + usd(porZ[z].t) + '</b></td></tr>').join('') + '</tbody></table></div>' +
      Z.map((z) => '<div class="card scroll"><h3>' + esc(z) + '</h3><table><thead><tr><th>Cliente</th><th class="r">Facturas</th><th class="r">Más vieja</th><th class="r">Saldo</th><th></th></tr></thead><tbody>' + Object.entries(porZ[z].cli).map(([cid, vs]) => { const s = vs.reduce((a, v) => a + H.saldo(v), 0); const mv = Math.max(...vs.map((v) => diasEntre(v.vence, h))); return '<tr><td class="wrap"><b>' + esc(H.cliNom(cid)) + '</b><div class="hint">' + esc(dc(cid).tel || '') + '</div></td><td class="r">' + vs.length + '</td><td class="r">' + (mv > 0 ? '<span class="tag ' + (mv > 15 ? 'bad' : 'warn') + '">' + mv + ' d vencida</span>' : 'Al día') + '</td><td class="r"><b>' + usd(s) + '</b></td><td><button class="btn sm sec" onclick="X.recordatorio(\'' + cid + '\')">Recordatorio</button></td></tr>'; }).join('') + '</tbody></table></div>').join('');
  };

  function abrir(html, titulo) { const w = window.open('', '_blank', 'width=820,height=900'); if (!w) return toast('Permite ventanas emergentes para imprimir', true); w.document.write('<title>' + titulo + '</title><link rel="stylesheet" href="' + new URL('../assets/prb.css', location.href) + '"><style>body{background:#fff;padding:24px;font-family:Inter,system-ui,sans-serif}.pg{page-break-after:always;margin-bottom:28px}.pg:last-child{page-break-after:auto}table{width:100%}.firma{display:flex;gap:30px;margin-top:40px}.firma div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:12px;text-align:center}</style><body>' + html + '<script>setTimeout(()=>print(),400)<\/script>'); w.document.close(); }

  Object.assign(window.X, {
    recargo(c, v) { const n = num(v); if (!(n > -100)) return toast('Porcentaje inválido', true); D().recargo[c] = r2(n); H.save(); H.go(true); },
    precioCanal(pid, c, v) { const n = num(v); D().precios[pid] = D().precios[pid] || {}; if (n > 0) D().precios[pid][c] = r2(n); else delete D().precios[pid][c]; H.save(); H.go(true); },
    cliD(cid, k, v) { (D().cli[cid] = D().cli[cid] || {})[k] = v.trim(); H.save(); },
    zonas() { H.dlg('Zonas y choferes', '<div class="form"><label class="f full">Zonas (una por línea)<textarea class="inp" id="zz" rows="5">' + esc(D().zonas.join('\n')) + '</textarea></label><label class="f full">Choferes o vehículos (uno por línea)<textarea class="inp" id="zc" rows="4">' + esc(D().choferes.join('\n')) + '</textarea></label></div>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okZonas()">Guardar</button>'); },
    okZonas() { const z = H.$('zz').value.split('\n').map((x) => x.trim()).filter(Boolean), c = H.$('zc').value.split('\n').map((x) => x.trim()).filter(Boolean); if (!z.length || !c.length) return toast('Deja al menos una zona y un chofer', true); D().zonas = z; D().choferes = c; H.save(); H.cerrar(); H.go(true); },
    dz(v) { DZ = v; H.go(true); },
    nuevoDespacho() {
      const ids = [...document.querySelectorAll('.dsel:checked')].map((c) => c.value); if (!ids.length) return toast('Marca al menos una factura', true);
      H.dlg('Nuevo despacho · ' + ids.length + ' facturas', '<div class="form"><label class="f">Fecha<input class="inp" type="date" id="df" value="' + hoy() + '"></label><label class="f">Chofer / vehículo<select class="inp" id="dch">' + D().choferes.map((c) => '<option>' + esc(c) + '</option>').join('') + '</select></label></div>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okDespacho(\'' + ids.join(',') + '\')">Crear despacho</button>');
    },
    okDespacho(ids) { const L = ids.split(','); const zs = [...new Set(L.map((id) => dc(S().ventas.find((v) => v.id === id).cli).zona || 'Sin zona'))]; D().despachos.push({ id: uid(), num: D().seq++, fecha: H.$('df').value || hoy(), zona: zs.length === 1 ? zs[0] : zs.join(', '), chofer: H.$('dch').value, facturas: L, estado: 'ruta', ent: {} }); H.save(); H.cerrar(); H.go(true); toast('Despacho creado'); },
    hojaRuta(id) {
      const d = D().despachos.find((x) => x.id === id); const vs = d.facturas.map((f) => S().ventas.find((v) => v.id === f)).filter(Boolean).sort((a, b) => (dc(a.cli).zona || '').localeCompare(dc(b.cli).zona || ''));
      const tot = {}; vs.forEach((v) => v.items.forEach((x) => (tot[x.pid] = (tot[x.pid] || 0) + x.cant)));
      abrir('<h2>Hoja de ruta N° ' + String(d.num).padStart(4, '0') + '</h2><p>' + esc(S().empresa) + ' · ' + fdia(d.fecha) + ' · ' + esc(d.chofer) + ' · Zona: ' + esc(d.zona) + '</p>' +
        '<h3>Carga</h3><table><thead><tr><th>Producto</th><th class="r">Cantidad</th></tr></thead><tbody>' + Object.entries(tot).map(([k, n]) => '<tr><td>' + esc(prod(k)?.nombre) + '</td><td class="r">' + qty(n) + '</td></tr>').join('') + '</tbody></table>' +
        '<h3 style="margin-top:16px">Paradas</h3><table><thead><tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Factura</th><th class="r">Cobrar</th><th>Recibido por</th></tr></thead><tbody>' + vs.map((v, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(H.cliNom(v.cli)) + '<br><small>' + esc(dc(v.cli).tel || '') + '</small></td><td>' + esc(dc(v.cli).dir || '') + '</td><td>' + nfac(v.num) + '</td><td class="r">' + (v.cond === 'credito' ? 'Crédito' : usd(H.saldo(v))) + '</td><td style="width:140px"></td></tr>').join('') + '</tbody></table><div class="firma"><div>Despachado por</div><div>Chofer</div><div>Recibido en almacén (retorno)</div></div>', 'Hoja de ruta');
    },
    notas(id) {
      const d = D().despachos.find((x) => x.id === id); const vs = d.facturas.map((f) => S().ventas.find((v) => v.id === f)).filter(Boolean);
      abrir(vs.map((v) => '<div class="pg"><div style="display:flex;justify-content:space-between"><div><b>' + esc(S().empresa) + '</b><br><small>RIF ' + esc(S().rif) + '</small></div><div style="text-align:right"><b>NOTA DE ENTREGA</b><br>Factura ' + nfac(v.num) + '<br>' + fdia(d.fecha) + '</div></div><p>Cliente: <b>' + esc(H.cliNom(v.cli)) + '</b> · ' + esc(H.cli(v.cli)?.rif || '') + '<br>' + esc(dc(v.cli).dir || '') + '</p><table><thead><tr><th>Código</th><th>Producto</th><th class="r">Cantidad</th></tr></thead><tbody>' + v.items.map((x) => '<tr><td>' + esc(prod(x.pid)?.cod) + '</td><td>' + esc(prod(x.pid)?.nombre) + '</td><td class="r">' + qty(x.cant) + '</td></tr>').join('') + '</tbody></table><p><small>Condición: ' + (v.cond === 'credito' ? 'crédito, vence ' + fdia(v.vence) : 'contado') + '. Revise la mercancía al recibirla.</small></p><div class="firma"><div>Entregado por</div><div>Recibido conforme (nombre, C.I. y sello)</div></div></div>').join(''), 'Notas de entrega');
    },
    entregas(id) {
      const d = D().despachos.find((x) => x.id === id); const vs = d.facturas.map((f) => S().ventas.find((v) => v.id === f)).filter(Boolean);
      H.dlg('Entregas del despacho ' + String(d.num).padStart(4, '0'), '<table><thead><tr><th>Factura</th><th>Cliente</th><th>¿Entregada?</th><th>Nota</th></tr></thead><tbody>' + vs.map((v) => { const e = d.ent[v.id] || { ok: true, nota: '' }; return '<tr><td>' + nfac(v.num) + '</td><td class="wrap">' + esc(H.cliNom(v.cli)) + '</td><td><select class="inp ent" data-v="' + v.id + '"><option value="1"' + (e.ok ? ' selected' : '') + '>Sí</option><option value="0"' + (e.ok ? '' : ' selected') + '>No, volvió</option></select></td><td><input class="inp entn" data-v="' + v.id + '" value="' + esc(e.nota) + '" placeholder="Opcional"></td></tr>'; }).join('') + '</tbody></table><p class="hint">Las facturas que vuelven quedan libres para el próximo despacho. Si el cliente no la quiere, anúlala desde la factura: la mercancía regresa al inventario.</p>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okEntregas(\'' + id + '\')">Cerrar despacho</button>', 640);
    },
    okEntregas(id) {
      const d = D().despachos.find((x) => x.id === id); const notas = {}; document.querySelectorAll('.entn').forEach((i) => (notas[i.dataset.v] = i.value.trim()));
      document.querySelectorAll('.ent').forEach((s) => { d.ent[s.dataset.v] = { ok: s.value === '1', nota: notas[s.dataset.v] || '' }; });
      d.facturas = d.facturas.filter((f) => d.ent[f].ok); d.devueltas = Object.keys(d.ent).filter((f) => !d.ent[f].ok); d.estado = 'entregado'; H.save(); H.cerrar(); H.go(true); toast('Despacho cerrado');
    },
    recordatorio(cid) {
      const vs = H.vivas().filter((v) => (v.cli || '') === cid && H.saldo(v) > 0.004); const tot = vs.reduce((a, v) => a + H.saldo(v), 0);
      const msg = 'Buen día, le saluda ' + S().empresa + '. Le recordamos el saldo pendiente de ' + usd(tot) + ':\n' + vs.map((v) => '• Factura ' + nfac(v.num) + ' del ' + fdia(v.fecha) + ', vence ' + fdia(v.vence) + ': ' + usd(H.saldo(v))).join('\n') + '\nQuedamos atentos a su pago. ¡Gracias!';
      const tel = (dc(cid).tel || '').replace(/\D/g, '').replace(/^0/, '58');
      H.dlg('Recordatorio · ' + esc(H.cliNom(cid)), '<textarea class="inp" rows="9" style="width:100%;font-family:inherit" id="rmsg">' + esc(msg) + '</textarea>', '<button class="btn sec" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById(\'rmsg\').value);X.toastOk()">Copiar</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + tel + '?text=' + encodeURIComponent(msg) + '">Abrir WhatsApp</a>', 560);
    }
  });
  window.X.toastOk = window.X.toastOk || (() => toast('Copiado'));

  H.mods.push({ id: 'dist', ensure });
  H.navMod('dist', 'Distribución', 'dist'); H.sub('dist', ['despachos', 'cobranza', 'precios']);
})();
