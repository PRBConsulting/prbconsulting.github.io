/* X3 DATA · Impresión de facturas en forma libre
   Plantilla por formato (posición de cada dato en milímetros), editor visual con la forma escaneada de fondo,
   ajuste fino por impresora, hoja de prueba, control del número de control preimpreso y hojas anuladas.
   Nota: desde 2026 (Providencia SNAT/2026/00084) no se exige homologar el software, pero la factura debe
   cumplir los requisitos formales vigentes. Valida tu plantilla con tu contador. */
(function () {
  'use strict';
  const H = window.X3H; if (!H || H.EN) return;
  const { esc, usd, qty, num, uid, r2, hoy, fdia, toast, kpi, nfac, nf2 } = H;
  const S = () => H.S; const FL = () => S().forma;
  const on = () => S().mods && S().mods.forma !== false;
  const BGK = 'prb-x3-forma-bg-';
  const k = 3; // píxeles por milímetro en el editor

  const CAMPOS = [ // clave, nombre, ejemplo, x, y, ancho, tamaño (pt), alineación, activo
    ['fecha', 'Fecha de emisión', '19/11/2026', 150, 46, 45, 10, 'l', true],
    ['numero', 'N° de factura', '000123', 165, 38, 30, 10, 'l', true],
    ['control', 'N° de control', '00-000123', 165, 30, 30, 9, 'l', false],
    ['cliente', 'Nombre o razón social', 'Cliente Ejemplo, C.A.', 40, 58, 110, 10, 'l', true],
    ['rif', 'RIF / C.I. del cliente', 'J-12345678-9', 160, 58, 40, 10, 'l', true],
    ['dir', 'Domicilio fiscal', 'Av. Principal, Local 1, Mérida', 40, 65, 160, 9, 'l', true],
    ['tel', 'Teléfono', '0414-0000000', 40, 72, 50, 9, 'l', true],
    ['cond', 'Condición de pago', 'Crédito 7 días', 120, 72, 60, 9, 'l', true],
    ['base', 'Base imponible', '1.000,00', 165, 222, 35, 10, 'r', true],
    ['exento', 'Monto exento', '200,00', 165, 229, 35, 10, 'r', true],
    ['ivaPct', 'Alícuota de IVA', '16%', 140, 236, 20, 10, 'r', true],
    ['iva', 'Monto del IVA', '160,00', 165, 236, 35, 10, 'r', true],
    ['total', 'Total a pagar', '1.360,00', 165, 245, 35, 11, 'r', true],
    ['tasa', 'Tasa de cambio', 'Tasa BCV: 52,40 Bs/$', 20, 245, 80, 8, 'l', true],
    ['usd', 'Equivalente en $', 'Equivalente: $25,95', 20, 251, 80, 8, 'l', false],
    ['letras', 'Monto en letras', 'SON: UN MIL TRESCIENTOS SESENTA BOLÍVARES CON 00/100', 20, 258, 180, 8, 'l', true]
  ];
  const COLS = [['cod', 'Código', 20, 18, 'l'], ['desc', 'Descripción', 40, 90, 'l'], ['cant', 'Cant.', 132, 15, 'r'], ['precio', 'Precio unit.', 150, 22, 'r'], ['tot', 'Total', 175, 25, 'r']];

  function plantillaBase(nombre) {
    const c = {}; CAMPOS.forEach((x) => (c[x[0]] = { x: x[3], y: x[4], w: x[5], s: x[6], a: x[7], on: x[8] }));
    const cols = {}; COLS.forEach((x) => (cols[x[0]] = { x: x[2], w: x[3], a: x[4], on: true }));
    return { id: uid(), nombre, ancho: 216, alto: 279, c, filas: { y0: 88, alto: 6, max: 20, s: 9 }, cols, moneda: 'bs' };
  }
  function ensure(st) {
    if (st.forma) return;
    const p = plantillaBase('Forma libre carta (ejemplo)');
    st.forma = { plantillas: [p], activa: p.id, ajuste: { dx: 0, dy: 0 }, ctrl: { serie: '00-', sig: 1 }, imp: {}, anuladas: [] };
  }
  const pl = () => FL().plantillas.find((x) => x.id === FL().activa) || FL().plantillas[0];

  /* ---------- datos de una factura para la forma ---------- */
  function datos(v, p) {
    const bsM = p.moneda === 'bs'; const f = bsM ? v.tasa : 1; const m = (x) => nf2.format(r2(x * f));
    const c = H.cli(v.cli); const ex = (H.cliExtra && H.cliExtra(v.cli)) || {};
    return {
      fecha: fdia(v.fecha), numero: nfac(v.num), control: (FL().imp[v.id] || {}).ctrl || '', cliente: H.cliNom(v.cli), rif: c ? c.rif : '', dir: ex.dir || '', tel: ex.tel || '',
      cond: v.cond === 'credito' ? 'Crédito · vence ' + fdia(v.vence) : 'Contado', base: m(v.grav), exento: m(v.sub - v.grav), ivaPct: S().iva + '%', iva: m(v.iva), total: m(v.total),
      tasa: 'Tasa BCV: ' + nf2.format(v.tasa) + ' Bs/$', usd: 'Equivalente: ' + usd(v.total), letras: H.letras(v.total * f, bsM ? 'BOLÍVARES' : 'DÓLARES'),
      filas: v.items.map((x) => { const pr = H.prod(x.pid) || {}; return { cod: pr.cod || '', desc: (pr.nombre || '') + (x.exento ? ' (E)' : ''), cant: qty(x.cant), precio: m(x.precio), tot: m(x.cant * x.precio) }; })
    };
  }
  function ejemplo(p) {
    const d = {}; CAMPOS.forEach((x) => (d[x[0]] = x[2]));
    d.filas = [{ cod: 'ALI-01', desc: 'Producto de ejemplo uno', cant: '10', precio: '50,00', tot: '500,00' }, { cod: 'ALI-02', desc: 'Producto de ejemplo dos (E)', cant: '4', precio: '50,00', tot: '200,00' }, { cod: 'BEB-01', desc: 'Producto de ejemplo tres', cant: '5', precio: '100,00', tot: '500,00' }];
    return d;
  }

  /* ---------- impresión ---------- */
  function htmlForma(p, d, modo) {
    const A = FL().ajuste; const dx = +A.dx || 0, dy = +A.dy || 0;
    const box = (x, y, w, s, a, txt, etiqueta) => '<div style="position:absolute;left:' + (x + dx) + 'mm;top:' + (y + dy) + 'mm;width:' + w + 'mm;font-size:' + s + 'pt;text-align:' + (a === 'r' ? 'right' : a === 'c' ? 'center' : 'left') + ';white-space:nowrap;overflow:hidden' + (modo === 'prueba' ? ';outline:0.2mm dashed #2e9e6b' : '') + '">' + (modo === 'prueba' && etiqueta ? '<small style="position:absolute;top:-2.6mm;left:0;font-size:5pt;color:#2e9e6b">' + etiqueta + '</small>' : '') + esc(txt) + '</div>';
    let h = '';
    CAMPOS.forEach((x) => { const c = p.c[x[0]]; if (c && c.on) h += box(c.x, c.y, c.w, c.s, c.a, d[x[0]], x[1]); });
    d.filas.slice(0, p.filas.max).forEach((f, i) => COLS.forEach((x) => { const c = p.cols[x[0]]; if (c.on) h += box(c.x, p.filas.y0 + i * p.filas.alto, c.w, p.filas.s, c.a, f[x[0]], i === 0 ? x[1] : ''); }));
    let grid = '';
    if (modo === 'prueba') for (let y = 0; y <= p.alto; y += 10) grid += '<div style="position:absolute;left:0;top:' + y + 'mm;width:' + p.ancho + 'mm;border-top:0.1mm solid #ddd"><span style="font-size:5pt;color:#999">' + y + '</span></div>';
    if (modo === 'prueba') for (let x = 0; x <= p.ancho; x += 10) grid += '<div style="position:absolute;top:0;left:' + x + 'mm;height:' + p.alto + 'mm;border-left:0.1mm solid #ddd"><span style="font-size:5pt;color:#999">' + x + '</span></div>';
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + (modo === 'prueba' ? 'Hoja de prueba' : 'Factura ' + d.numero) + '</title><style>@page{size:' + p.ancho + 'mm ' + p.alto + 'mm;margin:0}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#000}.hoja{position:relative;width:' + p.ancho + 'mm;height:' + p.alto + 'mm;overflow:hidden}@media screen{body{background:#888}.hoja{background:#fff;margin:10px auto;box-shadow:0 2px 12px #0005}.nota{font:13px Arial;color:#fff;text-align:center;padding:8px}}@media print{.nota{display:none}}</style></head><body><div class="nota">Al imprimir: tamaño de papel ' + p.ancho + ' × ' + p.alto + ' mm, márgenes "Ninguno", escala 100% y sin encabezados ni pies de página.</div><div class="hoja">' + grid + h + '</div><script>setTimeout(()=>print(),500)<\/script></body></html>';
  }
  function abrir(html) { const w = window.open('', '_blank', 'width=900,height=1000'); if (!w) return toast('Permite ventanas emergentes para imprimir', true); w.document.write(html); w.document.close(); }

  /* ---------- vistas ---------- */
  const { V, A } = H;
  const off = () => '<h1>Módulo apagado</h1><p class="sub">Actívalo en <button class="lnk" onclick="location.hash=\'modulos\'">Módulos</button>.</p>';
  V.forma = () => {
    if (!on()) return off();
    const sinImp = H.vivas().filter((v) => !FL().imp[v.id] && v.fecha.slice(0, 10) >= H.addDays(hoy(), -7)).length;
    const ajustada = !!localStorage.getItem(BGK + pl().id) || FL().ajustada;
    return H.hub('Forma libre', 'Imprime tus facturas en las formas que te entregó la imprenta.', [
      { k: 'flimprimir', ic: '🖨️', t: 'Imprimir facturas', d: 'Eliges la factura y sale impresa en su sitio dentro de la forma.', bd: sinImp ? sinImp + ' sin imprimir esta semana' : '', bc: 'w' },
      { k: 'fleditor', ic: '📐', t: 'Ajustar mi forma', d: 'Se hace una sola vez: le dices al sistema dónde va cada dato.', bd: ajustada ? '' : 'Hazlo primero', bc: 'b' },
      { k: 'flcontrol', ic: '🔢', t: 'Números de control', d: 'Qué hoja se usó en cada factura y cuáles se dañaron.' }
    ], '<div class="card"><h3>Cómo funciona</h3><div class="paso"><i>1</i><div>Escanea o fotografía una forma en blanco y súbela en <b>Ajustar mi forma</b>.</div></div><div class="paso"><i>2</i><div>Arrastra cada dato (fecha, cliente, total…) hasta su casilla.</div></div><div class="paso"><i>3</i><div>Imprime la hoja de prueba en papel normal, ponla sobre la forma contra la luz y corrige con los botones de ajuste.</div></div><div class="paso"><i>4</i><div>Listo: cada factura sale en su sitio. El sistema anota qué número de control se usó.</div></div><p class="hint">Desde 2026 el SENIAT no exige homologar el sistema, pero la factura debe llevar todos los datos que pide la norma. Revisa tu plantilla con tu contador.</p></div>');
  };

  let FQ = '';
  V.flimprimir = () => {
    if (!on()) return off();
    const L = H.vivas().slice().reverse().filter((v) => !FQ || (nfac(v.num) + ' ' + H.cliNom(v.cli)).toLowerCase().includes(FQ.toLowerCase())).slice(0, 40);
    return H.back('forma', 'Forma libre') + '<h1>Imprimir facturas</h1><p class="sub">Toca <b>Imprimir</b> en la factura. Antes te preguntamos el número de control de la hoja que vas a usar.</p>' +
      '<div class="card scroll"><div class="row"><input class="inp" placeholder="Buscar por número o cliente…" value="' + esc(FQ) + '" onchange="X.flq(this.value)"></div><table><thead><tr><th>Factura</th><th>Fecha</th><th>Cliente</th><th class="r">Total</th><th>N° de control</th><th></th></tr></thead><tbody>' +
      L.map((v) => { const im = FL().imp[v.id]; return '<tr><td>' + nfac(v.num) + '</td><td>' + fdia(v.fecha) + '</td><td class="wrap">' + esc(H.cliNom(v.cli)) + '</td><td class="r">' + usd(v.total) + '</td><td>' + (im ? '<span class="tag ok">' + esc(im.ctrl) + '</span>' : '<span class="tag mut">Sin imprimir</span>') + '</td><td><button class="btn sm' + (im ? ' sec' : '') + '" onclick="X.flImprimir(\'' + v.id + '\')">' + (im ? 'Reimprimir' : 'Imprimir') + '</button></td></tr>'; }).join('') + '</tbody></table></div>';
  };

  let ED = null, SEL = 'cliente';
  V.fleditor = () => {
    if (!on()) return off();
    const p = pl(); if (!ED || ED.id !== p.id) ED = JSON.parse(JSON.stringify(p));
    const bg = localStorage.getItem(BGK + p.id) || '';
    const lista = CAMPOS.map((x) => '<label style="display:flex;gap:6px;align-items:center;padding:3px 0;font-size:13px' + (SEL === x[0] ? ';font-weight:700' : '') + '"><input type="checkbox"' + (ED.c[x[0]].on ? ' checked' : '') + ' onchange="X.flOn(\'' + x[0] + '\',this.checked)"><span style="cursor:pointer" onclick="X.flSel(\'' + x[0] + '\')">' + x[1] + '</span></label>').join('');
    const c = SEL === 'filas' ? null : ED.c[SEL];
    return H.back('forma', 'Forma libre') + '<h1>Ajustar mi forma</h1><p class="sub">Arrastra cada dato hasta su casilla. Si quieres, sube primero una foto o escaneo de tu forma en blanco para verla de fondo.</p>' +
      '<div class="card"><div class="row"><label class="btn sec">📷 Subir foto de la forma<input type="file" accept="image/*" hidden onchange="X.flBg(this.files[0])"></label>' + (bg ? '<button class="btn sec" onclick="X.flBgQuitar()">Quitar foto</button>' : '') + '<span class="sp"></span><button class="btn sec" onclick="X.flPrueba()">🖨️ Imprimir hoja de prueba</button><button class="btn" onclick="X.flGuardar()">Guardar</button></div></div>' +
      '<div class="g2" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start"><div class="card" style="overflow:auto;padding:10px"><div id="flc" style="position:relative;width:' + ED.ancho * k + 'px;height:' + ED.alto * k + 'px;background:#fff ' + (bg ? 'url(' + bg + ') center/100% 100% no-repeat' : '') + ';border:1px solid var(--line);touch-action:none">' + canvasItems() + '</div></div>' +
      '<div><div class="card"><h3>Dato seleccionado</h3>' + (c ? '<p style="margin:0 0 8px"><b>' + CAMPOS.find((x) => x[0] === SEL)[1] + '</b></p><div class="form"><label class="f">Izquierda (mm)<input class="inp num" value="' + c.x + '" onchange="X.flSet(\'x\',this.value)"></label><label class="f">Arriba (mm)<input class="inp num" value="' + c.y + '" onchange="X.flSet(\'y\',this.value)"></label><label class="f">Ancho (mm)<input class="inp num" value="' + c.w + '" onchange="X.flSet(\'w\',this.value)"></label><label class="f">Letra (pt)<input class="inp num" value="' + c.s + '" onchange="X.flSet(\'s\',this.value)"></label></div>' :
        '<p style="margin:0 0 8px"><b>Renglones de productos</b></p><div class="form"><label class="f">Primer renglón (mm)<input class="inp num" value="' + ED.filas.y0 + '" onchange="X.flFila(\'y0\',this.value)"></label><label class="f">Alto del renglón (mm)<input class="inp num" value="' + ED.filas.alto + '" onchange="X.flFila(\'alto\',this.value)"></label><label class="f">Máx. renglones<input class="inp num" value="' + ED.filas.max + '" onchange="X.flFila(\'max\',this.value)"></label><label class="f">Letra (pt)<input class="inp num" value="' + ED.filas.s + '" onchange="X.flFila(\'s\',this.value)"></label></div><p class="hint">Mueve las columnas arrastrando el primer renglón.</p>') +
      '<button class="lnk" onclick="X.flSel(\'filas\')">Renglones de productos</button></div>' +
      '<div class="card"><h3>Datos que se imprimen</h3>' + lista + '</div>' +
      '<details class="mas card"><summary>Papel, moneda y ajuste de impresora</summary><div class="form" style="margin-top:8px"><label class="f full">Nombre de la plantilla<input class="inp" value="' + esc(ED.nombre) + '" onchange="X.flPap(\'nombre\',this.value)"></label><label class="f">Ancho papel (mm)<input class="inp num" value="' + ED.ancho + '" onchange="X.flPap(\'ancho\',this.value)"></label><label class="f">Alto papel (mm)<input class="inp num" value="' + ED.alto + '" onchange="X.flPap(\'alto\',this.value)"></label><label class="f full">Montos en<select class="inp" onchange="X.flPap(\'moneda\',this.value)"><option value="bs"' + (ED.moneda === 'bs' ? ' selected' : '') + '>Bolívares (a la tasa de la factura)</option><option value="usd"' + (ED.moneda === 'usd' ? ' selected' : '') + '>Dólares</option></select></label></div>' +
      '<p class="hint" style="margin-top:10px">Si todo sale corrido, mueve todo junto:</p><div class="row"><button class="btn sm sec" onclick="X.flAj(0,-1)">↑ 1 mm</button><button class="btn sm sec" onclick="X.flAj(0,1)">↓ 1 mm</button><button class="btn sm sec" onclick="X.flAj(-1,0)">← 1 mm</button><button class="btn sm sec" onclick="X.flAj(1,0)">→ 1 mm</button></div><p class="hint">Ajuste actual: ' + FL().ajuste.dx + ' mm horizontal, ' + FL().ajuste.dy + ' mm vertical.</p></details></div></div>';
  };
  function canvasItems() {
    const d = ejemplo(ED); let h = '';
    const it = (key, x, y, w, s, a, txt) => '<div class="fli" data-k="' + key + '" style="position:absolute;left:' + x * k + 'px;top:' + y * k + 'px;width:' + w * k + 'px;font-size:' + s * k * 0.3528 + 'px;line-height:1.15;text-align:' + (a === 'r' ? 'right' : 'left') + ';white-space:nowrap;overflow:hidden;cursor:move;color:#0b1f3a;background:' + (SEL === key || (SEL === 'filas' && key.startsWith('col:')) ? 'rgba(46,158,107,.28)' : 'rgba(46,158,107,.10)') + ';outline:1px dashed #2e9e6b;user-select:none">' + esc(txt) + '</div>';
    CAMPOS.forEach((x) => { const c = ED.c[x[0]]; if (c.on) h += it(x[0], c.x, c.y, c.w, c.s, c.a, d[x[0]]); });
    COLS.forEach((x) => { const c = ED.cols[x[0]]; h += it('col:' + x[0], c.x, ED.filas.y0, c.w, ED.filas.s, c.a, d.filas[0][x[0]]); for (let i = 1; i < Math.min(3, ED.filas.max); i++) h += '<div style="position:absolute;left:' + c.x * k + 'px;top:' + (ED.filas.y0 + i * ED.filas.alto) * k + 'px;width:' + c.w * k + 'px;height:' + ED.filas.alto * k * 0.8 + 'px;outline:1px dotted #2e9e6b88"></div>'; });
    return h;
  }
  A.fleditor = () => {
    const cv = H.$('flc'); if (!cv) return; let drag = null;
    cv.onpointerdown = (e) => { const t = e.target.closest('.fli'); if (!t) return; const key = t.dataset.k; drag = { key, sx: e.clientX, sy: e.clientY, ox: parseFloat(t.style.left), oy: parseFloat(t.style.top), t }; SEL = key.startsWith('col:') ? 'filas' : key; cv.setPointerCapture(e.pointerId); e.preventDefault(); };
    cv.onpointermove = (e) => { if (!drag) return; drag.t.style.left = drag.ox + e.clientX - drag.sx + 'px'; drag.t.style.top = drag.oy + e.clientY - drag.sy + 'px'; };
    cv.onpointerup = () => {
      if (!drag) return; const x = Math.max(0, Math.round(parseFloat(drag.t.style.left) / k * 2) / 2), y = Math.max(0, Math.round(parseFloat(drag.t.style.top) / k * 2) / 2);
      if (drag.key.startsWith('col:')) { ED.cols[drag.key.slice(4)].x = x; ED.filas.y0 = y; } else { ED.c[drag.key].x = x; ED.c[drag.key].y = y; }
      drag = null; H.go(true);
    };
  };

  V.flcontrol = () => {
    if (!on()) return off();
    const imp = Object.entries(FL().imp).map(([vid, o]) => ({ v: S().ventas.find((x) => x.id === vid), ...o })).filter((o) => o.v).sort((a, b) => b.ctrl.localeCompare(a.ctrl));
    return H.back('forma', 'Forma libre') + '<h1>Números de control</h1><p class="sub">Cada hoja de forma libre trae un número de control impreso por la imprenta. Aquí queda qué hoja se usó en cada factura y qué hojas se dañaron o anularon, para que no se pierda ninguna.</p>' +
      '<div class="kpis">' + kpi(esc(FL().ctrl.serie + String(FL().ctrl.sig).padStart(6, '0')), 'Próxima hoja a usar') + kpi(imp.length, 'Facturas impresas') + kpi(FL().anuladas.length, 'Hojas anuladas o dañadas', FL().anuladas.length ? 'var(--warn)' : 'var(--ok)') + '</div>' +
      '<div class="card"><div class="row"><button class="btn sec" onclick="X.flSig()">Cambiar próxima hoja</button><button class="btn sec" onclick="X.flAnular()">Anular una hoja dañada</button><button class="btn sec" onclick="X.flCsv()">Descargar registro (CSV)</button></div></div>' +
      '<div class="g2"><div class="card scroll"><h3>Hojas usadas</h3>' + (imp.length ? '<table><thead><tr><th>N° control</th><th>Factura</th><th>Impresa</th><th class="r">Total</th></tr></thead><tbody>' + imp.map((o) => '<tr><td><b>' + esc(o.ctrl) + '</b></td><td>' + nfac(o.v.num) + (o.v.anulada ? ' <span class="tag bad">Anulada</span>' : '') + '</td><td>' + fdia(o.fecha) + '</td><td class="r">' + usd(o.v.total) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">Aún no se ha impreso ninguna factura</div>') + '</div>' +
      '<div class="card scroll"><h3>Hojas anuladas</h3>' + (FL().anuladas.length ? '<table><thead><tr><th>N° control</th><th>Fecha</th><th>Motivo</th></tr></thead><tbody>' + FL().anuladas.slice().reverse().map((a) => '<tr><td><b>' + esc(a.ctrl) + '</b></td><td>' + fdia(a.fecha) + '</td><td class="wrap">' + esc(a.motivo) + '</td></tr>').join('') + '</tbody></table><p class="hint">Guarda las hojas anuladas físicamente: el original y sus copias.</p>' : '<div class="empty">Ninguna</div>') + '</div></div>';
  };

  const sigCtrl = () => FL().ctrl.serie + String(FL().ctrl.sig).padStart(6, '0');
  Object.assign(window.X, {
    flq(v) { FQ = v; H.go(true); },
    flImprimir(vid) {
      const v = S().ventas.find((x) => x.id === vid); const p = pl(); const im = FL().imp[vid];
      if (v.items.length > p.filas.max) return toast('La factura tiene ' + v.items.length + ' renglones y la forma admite ' + p.filas.max + '. Divídela en dos facturas.', true);
      H.dlg('Imprimir factura ' + nfac(v.num) + ' en forma libre', (im ? '<p style="color:var(--warn)"><b>Esta factura ya se imprimió en la hoja ' + esc(im.ctrl) + '.</b> Si la vuelves a imprimir, esa hoja se anota como dañada.</p>' : '') +
        '<div class="form"><label class="f full">Número de control de la hoja que vas a poner en la impresora<input class="inp" id="flct" value="' + esc(sigCtrl()) + '"></label></div><p class="hint">Revisa que coincida con el número impreso en la hoja. Plantilla: ' + esc(p.nombre) + '.</p>',
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okFlImprimir(\'' + vid + '\')">Imprimir</button>');
    },
    okFlImprimir(vid) {
      const ct = H.$('flct').value.trim(); if (!ct) return toast('Escribe el número de control', true);
      const usado = Object.entries(FL().imp).find(([k2, o]) => o.ctrl === ct && k2 !== vid) || FL().anuladas.find((a) => a.ctrl === ct); if (usado) return toast('Esa hoja ya está registrada', true);
      const prev = FL().imp[vid]; if (prev && prev.ctrl !== ct) FL().anuladas.push({ ctrl: prev.ctrl, fecha: hoy(), motivo: 'Reimpresión de la factura ' + nfac(S().ventas.find((x) => x.id === vid).num) });
      FL().imp[vid] = { ctrl: ct, fecha: hoy(), pl: pl().id };
      const m = ct.match(/^(.*?)(\d+)$/); if (m && ct === sigCtrl()) FL().ctrl.sig++; else if (m) { FL().ctrl.serie = m[1]; FL().ctrl.sig = +m[2] + 1; }
      H.save(); H.cerrar(); H.go(true);
      const v = S().ventas.find((x) => x.id === vid); abrir(htmlForma(pl(), datos(v, pl()), 'factura'));
    },
    flSel(key) { SEL = key; H.go(true); },
    flOn(key, b) { ED.c[key].on = b; SEL = key; H.go(true); },
    flSet(prop, val) { const n = num(val); if (!(n >= 0)) return toast('Valor inválido', true); ED.c[SEL][prop] = r2(n); H.go(true); },
    flFila(prop, val) { const n = num(val); if (!(n > 0)) return toast('Valor inválido', true); ED.filas[prop] = prop === 'max' ? Math.round(n) : r2(n); H.go(true); },
    flPap(prop, val) { if (prop === 'nombre' || prop === 'moneda') ED[prop] = val; else { const n = num(val); if (!(n > 50 && n < 600)) return toast('Medida inválida', true); ED[prop] = r2(n); } H.go(true); },
    flAj(x, y) { FL().ajuste.dx = r2((+FL().ajuste.dx || 0) + x); FL().ajuste.dy = r2((+FL().ajuste.dy || 0) + y); H.save(); H.go(true); toast('Ajuste: ' + FL().ajuste.dx + ' mm, ' + FL().ajuste.dy + ' mm'); },
    flGuardar() { const i = FL().plantillas.findIndex((x) => x.id === ED.id); FL().plantillas[i] = JSON.parse(JSON.stringify(ED)); FL().ajustada = true; H.save(); toast('Plantilla guardada'); },
    flPrueba() { abrir(htmlForma(ED, ejemplo(ED), 'prueba')); },
    flBg(f) {
      if (!f) return; const r = new FileReader();
      r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const w = Math.min(1100, img.width); c.width = w; c.height = Math.round(img.height * w / img.width); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); try { localStorage.setItem(BGK + ED.id, c.toDataURL('image/jpeg', 0.6)); FL().ajustada = true; H.save(); H.go(true); toast('Foto cargada. Ahora arrastra los datos a su casilla'); } catch (e) { toast('La foto es muy pesada para guardarla en este navegador', true); } }; img.src = r.result; };
      r.readAsDataURL(f);
    },
    flBgQuitar() { localStorage.removeItem(BGK + ED.id); H.go(true); },
    flSig() { H.dlg('Próxima hoja', '<div class="form"><label class="f">Serie o prefijo<input class="inp" id="fls" value="' + esc(FL().ctrl.serie) + '"></label><label class="f">Próximo número<input class="inp num" id="fln" value="' + FL().ctrl.sig + '"></label></div><p class="hint">Copia el número de control de la primera hoja en blanco de tu talonario.</p>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okFlSig()">Guardar</button>'); },
    okFlSig() { const n = Math.round(num(H.$('fln').value)); if (!(n > 0)) return toast('Número inválido', true); FL().ctrl = { serie: H.$('fls').value, sig: n }; H.save(); H.cerrar(); H.go(true); },
    flAnular() { H.dlg('Anular una hoja', '<div class="form"><label class="f">Número de control<input class="inp" id="fla" value="' + esc(sigCtrl()) + '"></label><label class="f full">Motivo<input class="inp" id="flm" value="Hoja dañada en la impresora"></label></div>', '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn danger" onclick="X.okFlAnular()">Anular hoja</button>'); },
    okFlAnular() { const ct = H.$('fla').value.trim(); if (!ct) return; if (Object.values(FL().imp).some((o) => o.ctrl === ct)) return toast('Esa hoja tiene una factura impresa: reimprime la factura y se anula sola', true); FL().anuladas.push({ ctrl: ct, fecha: hoy(), motivo: H.$('flm').value.trim() || 'Anulada' }); if (ct === sigCtrl()) FL().ctrl.sig++; H.save(); H.cerrar(); H.go(true); toast('Hoja anulada'); },
    flCsv() { const rows = [['N control', 'Estado', 'Factura', 'Fecha', 'Total $', 'Motivo']]; Object.entries(FL().imp).forEach(([vid, o]) => { const v = S().ventas.find((x) => x.id === vid); if (v) rows.push([o.ctrl, v.anulada ? 'Factura anulada' : 'Usada', nfac(v.num), o.fecha, v.total, '']); }); FL().anuladas.forEach((a) => rows.push([a.ctrl, 'Hoja anulada', '', a.fecha, '', a.motivo])); H.bajar('control-formas-' + hoy() + '.csv', H.csv(rows), 'text/csv'); }
  });

  H.facturaBtns.push((v) => (on() && !v.anulada ? '<button class="btn sec" onclick="X.flImprimir(\'' + v.id + '\')">Forma libre</button>' : ''));
  H.mods.push({ id: 'forma', ensure });
  H.navMod('forma', 'Forma libre', 'forma'); H.sub('forma', ['flimprimir', 'fleditor', 'flcontrol']);
  H.X3forma = { letras: H.letras };
})();
