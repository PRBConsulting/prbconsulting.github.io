/* Alquileres · PRB Consulting
   Propiedades con plano 2D (terrenos, locales, galpones, oficinas), inquilinos, contratos, cobros del mes,
   morosos, gastos y rentabilidad. Condominio: gastos comunes repartidos por alícuota o partes iguales,
   cobrados aparte del canon (cargos tipo 'condo'). Una sola persona administra. Datos en el navegador (localStorage). Datos ficticios. */
(function () {
  'use strict';
  const KEY = 'prb-alquileres-v1';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hoy = () => isoDay(new Date());
  const addDays = (iso, k) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + k); return isoDay(d); };
  const addMes = (ym, k) => { const d = new Date(ym.slice(0, 7) + '-15T12:00'); d.setMonth(d.getMonth() + k); return isoDay(d).slice(0, 7); };
  const finMes = (ym) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0); return isoDay(d); };
  const mesesEntre = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
  const dias = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const nomMes = (ym) => MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
  const fdia = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const nf = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  const num = (v) => { let s = String(v ?? '').trim(); if (!s) return NaN; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isFinite(x) ? x : NaN; };
  const usd = (v) => (v < 0 ? '−$' : '$') + nf.format(Math.abs(r2(v)));
  const bs = (v) => (v < 0 ? '−Bs ' : 'Bs ') + nf.format(Math.abs(r2(v)));
  const mon = (v, m) => (m === 'VES' ? bs(v) : usd(v));
  const ico = (n) => '<i class="ti ti-' + n + '" aria-hidden="true"></i>';
  const toast = (msg, err) => (window.PRBok ? window.PRBok(msg, err) : null);
  const TIPOS = ['Local', 'Galpón', 'Oficina', 'Terreno', 'Depósito', 'Apartamento', 'Casa', 'Puesto de estacionamiento', 'Área común'];
  const CATG = ['Mantenimiento', 'Reparaciones', 'Vigilancia', 'Limpieza', 'Servicios (luz, agua, aseo)', 'Impuestos municipales', 'Seguros', 'Honorarios (abogado, contador)', 'Comisiones', 'Otros'];
  const METODOS = ['Transferencia', 'Pago móvil', 'Efectivo $', 'Efectivo Bs', 'Zelle', 'Depósito', 'Otro'];
  const CATC = ['Vigilancia', 'Limpieza', 'Agua', 'Luz de áreas comunes', 'Mantenimiento', 'Ascensor', 'Aseo urbano', 'Jardinería', 'Reparaciones de áreas comunes', 'Otros'];
  const r4 = (v) => Math.round((+v + Number.EPSILON) * 10000) / 10000;
  const nf4 = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  /* ---------- datos ---------- */
  let S;
  const condoBase = () => ({ activo: false, modo: 'alicuota', reserva: 0, honor: 0 });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador', true); } }
  // v1 → v2: cada cargo tiene tipo (canon | condo); condominio por propiedad
  function migrar(d) {
    if (d.v === 1) { d.v = 2; (d.cargos || []).forEach((g) => { if (!g.tipo) g.tipo = 'canon'; }); }
    (d.props || []).forEach((p) => { if (!p.condo) p.condo = condoBase(); });
    if (!d.condoGastos) d.condoGastos = []; if (!d.condoEmit) d.condoEmit = [];
    return d;
  }
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) { const d = JSON.parse(r); if (d && (d.v === 1 || d.v === 2) && !(d.v === 1 && d.nombre === 'Inversiones Ejemplo')) { S = migrar(d); generarCargos(); save(); return; } } } catch (e) { /* */ }
    S = seed(); save(); // datos de ejemplo viejos (v1) se reemplazan por los nuevos, que traen condominio
  }
  function blank() { return { v: 2, nombre: 'Mis alquileres', tasa: 52.4, tasaModo: 'oficial', aviso: 60, props: [], unidades: [], inq: [], contratos: [], cargos: [], gastos: [], condoGastos: [], condoEmit: [], propSel: null }; }
  function seed() {
    const st = blank(); st.nombre = 'Inversiones Ejemplo';
    const t0 = hoy(); const m0 = t0.slice(0, 7);
    const p1 = { id: uid(), nombre: 'Centro Comercial La Ceiba', dir: 'Av. Principal, sector industrial', tipo: 'Terreno con locales', w: 120, h: 70, condo: { activo: true, modo: 'alicuota', reserva: 10, honor: 0 } };
    const p2 = { id: uid(), nombre: 'Terreno Los Samanes', dir: 'Vía al aeropuerto, km 4', tipo: 'Terreno', w: 60, h: 40, condo: condoBase() };
    const p3 = { id: uid(), nombre: 'Edificio Torre Norte (piso 2)', dir: 'Calle 5 con carrera 3', tipo: 'Edificio', w: 30, h: 20, condo: { activo: true, modo: 'iguales', reserva: 0, honor: 0 } };
    st.props = [p1, p2, p3]; st.propSel = p1.id;
    const U = (p, nombre, tipo, x, y, w, h, ref) => { const u = { id: uid(), prop: p.id, nombre, tipo, x, y, w, h, m2: tipo === 'Área común' ? 0 : w * h, ref: ref || 0, notas: '' }; st.unidades.push(u); return u; };
    const g1 = U(p1, 'Galpón A', 'Galpón', 4, 4, 40, 26, 2800), g2 = U(p1, 'Galpón B', 'Galpón', 48, 4, 40, 26, 2600);
    const dep = U(p1, 'Depósito 1', 'Depósito', 92, 4, 24, 14, 650), dep2 = U(p1, 'Depósito 2', 'Depósito', 92, 18, 24, 12, 600);
    U(p1, 'Estacionamiento', 'Área común', 4, 34, 112, 12);
    const L = []; for (let i = 0; i < 8; i++) L.push(U(p1, 'Local ' + (i + 1), 'Local', 4 + i * 14, 50, 13, 16, 450 + (i % 3) * 50));
    const t1 = U(p2, 'Patio de carga', 'Terreno', 3, 3, 54, 34, 1200);
    const ofs = [U(p3, 'Oficina 2-A', 'Oficina', 1, 1, 9, 8, 380), U(p3, 'Oficina 2-B', 'Oficina', 10.5, 1, 9, 8, 380), U(p3, 'Oficina 2-C', 'Oficina', 20, 1, 9, 8, 400), U(p3, 'Oficina 2-D', 'Oficina', 1, 11, 13, 8, 520), U(p3, 'Pasillo y baños', 'Área común', 15, 11, 14, 8)];
    const I = (nombre, doc, act, tel) => { const x = { id: uid(), nombre, doc, act, tel, email: '' }; st.inq.push(x); return x; };
    const inq = [I('Distribuidora El Llano, C.A.', 'J-40123456-7', 'Distribución de alimentos', '0414-0000001'), I('Logística Andina, C.A.', 'J-50234567-8', 'Almacenaje', '0424-0000002'), I('Ferretería Don Pepe', 'J-30345678-9', 'Ferretería', '0412-0000003'),
      I('Farmacia Salud Total', 'J-41456789-0', 'Farmacia', '0414-0000004'), I('Panadería La Espiga', 'J-29567890-1', 'Panadería', '0416-0000005'), I('Óptica Visión Clara', 'V-12345678', 'Óptica', '0424-0000006'), I('Barbería Estilo', 'V-23456789', 'Barbería', '0412-0000007'),
      I('Transporte Rápido 2020', 'J-50678901-2', 'Transporte de carga', '0414-0000008'), I('Contadores Asociados', 'J-31789012-3', 'Contabilidad', '0424-0000009'), I('Estudio Legal Pérez', 'V-34567890', 'Abogados', '0412-0000010'), I('Repuestos Moto Max', 'J-40890123-4', 'Repuestos', '0416-0000011')];
    const C = (u, i, mesesAtras, plazo, canon, moneda, dia, aum, deposito) => { const ini = addMes(m0, -mesesAtras) + '-01'; const c = { id: uid(), unidad: u.id, inq: i.id, inicio: ini, fin: addDays(addMes(ini, plazo) + '-01', -1), canon, moneda: moneda || 'USD', dia: dia || 5, deposito: deposito ?? canon, aumPct: aum ? aum[0] : 0, aumCada: aum ? aum[1] : 12, estado: 'activo', notas: '' }; st.contratos.push(c); return c; };
    const cs = [C(g1, inq[0], 14, 24, 2800, 'USD', 5, [5, 12]), C(g2, inq[1], 8, 12, 2600, 'USD', 5), C(dep, inq[7], 10, 12, 650), C(L[0], inq[2], 20, 36, 500, 'USD', 5, [8, 12]), C(L[1], inq[3], 6, 24, 550), C(L[2], inq[4], 11, 12, 450, 'USD', 10),
      C(L[3], inq[5], 4, 12, 480), C(L[5], inq[6], 9, 12, 420), C(L[6], inq[10], 3, 12, 460), C(t1, inq[7], 7, 12, 1200, 'USD', 1), C(ofs[0], inq[8], 12, 24, 380), C(ofs[1], inq[9], 5, 12, 14000, 'VES', 5), C(ofs[3], inq[8], 2, 12, 520)];
    st.cargos = []; S = st; generarCargos();
    // pagos: casi todos al día; dos morosos y uno con pago parcial
    let s = 5; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const morosos = { [cs[5].id]: 2, [cs[7].id]: 1 };
    st.cargos.forEach((cg) => {
      const c = st.contratos.find((x) => x.id === cg.contrato); const atras = mesesEntre(cg.periodo, m0);
      if (morosos[c.id] && atras < morosos[c.id] + (cg.vence <= t0 ? 0 : 1)) return;
      if (cg.vence > t0) return; // aún no vence
      if (c.id === cs[4].id && atras === 0) { cg.pagos.push({ id: uid(), fecha: addDays(cg.vence, -2), monto: 300, metodo: 'Transferencia', ref: '00123', tasa: st.tasa }); return; }
      const dd = Math.floor(rnd() * 9) - 4; cg.pagos.push({ id: uid(), fecha: addDays(cg.vence, dd) > t0 ? t0 : addDays(cg.vence, dd), monto: cg.monto, metodo: METODOS[Math.floor(rnd() * 5)], ref: String(Math.floor(rnd() * 90000) + 10000), tasa: st.tasa });
    });
    // condominio: gastos comunes de los últimos 7 meses (el mes en curso, a medias y sin emitir)
    for (let k = 6; k >= 0; k--) {
      const ym = addMes(m0, -k); const CG = (p, cat, monto, nota) => st.condoGastos.push({ id: uid(), prop: p.id, periodo: ym, cat, monto, moneda: 'USD', nota });
      CG(p1, 'Vigilancia', 600, 'Vigilancia nocturna'); CG(p1, 'Limpieza', 180, 'Limpieza de áreas comunes');
      if (k > 0) { CG(p1, 'Agua', 85 + (k % 3) * 10, 'Agua de áreas comunes'); CG(p1, 'Luz de áreas comunes', 120 + (k % 4) * 8, 'Alumbrado del estacionamiento'); if (k % 2 === 0) CG(p1, 'Mantenimiento', 150, 'Portón eléctrico y cercado'); }
      CG(p3, 'Limpieza', 90, 'Pasillo y baños'); if (k > 0) CG(p3, 'Ascensor', k % 4 === 1 ? 210 : 60, k % 4 === 1 ? 'Mantenimiento y repuesto del ascensor' : 'Mantenimiento del ascensor');
    }
    for (let k = 6; k >= 1; k--) { const ym = addMes(m0, -k); emitirCondo(p1.id, ym, finMes(ym)); emitirCondo(p3.id, ym, finMes(ym)); }
    // pagos de condominio: casi todos junto con el canon (mismo recibo); la Óptica debe solo el condominio
    const morC = { [cs[5].id]: 2, [cs[7].id]: 1, [cs[6].id]: 1 };
    st.cargos.filter((g) => g.tipo === 'condo' && g.vence <= t0).forEach((cg) => {
      const atras = mesesEntre(cg.periodo, m0); if (morC[cg.contrato] && atras <= morC[cg.contrato]) return;
      const can = st.cargos.find((g) => g.tipo === 'canon' && g.contrato === cg.contrato && g.periodo === cg.vence.slice(0, 7));
      const p0 = can && can.pagos.length === 1 ? can.pagos[0] : null;
      if (p0) { p0.grupo = p0.grupo || uid(); cg.pagos.push({ id: uid(), fecha: p0.fecha, monto: cg.monto, metodo: p0.metodo, ref: p0.ref, tasa: p0.tasa, grupo: p0.grupo }); }
      else cg.pagos.push({ id: uid(), fecha: cg.vence, monto: cg.monto, metodo: 'Transferencia', ref: String(Math.floor(rnd() * 90000) + 10000), tasa: st.tasa });
    });
    // gastos propios del dueño (los comunes van en Condominio)
    for (let k = 11; k >= 0; k--) {
      const ym = addMes(m0, -k);
      if (k > 6) { st.gastos.push({ id: uid(), prop: p1.id, unidad: '', fecha: ym + '-03', cat: 'Vigilancia', monto: 600, moneda: 'USD', nota: 'Vigilancia nocturna (antes del condominio)' }); st.gastos.push({ id: uid(), prop: p1.id, unidad: '', fecha: ym + '-08', cat: 'Limpieza', monto: 180, moneda: 'USD', nota: 'Limpieza (antes del condominio)' }); }
      if (k % 3 === 0) st.gastos.push({ id: uid(), prop: p1.id, unidad: '', fecha: ym + '-15', cat: 'Impuestos municipales', monto: 420, moneda: 'USD', nota: 'Inmuebles urbanos (trimestre)' });
      if (k === 2) st.gastos.push({ id: uid(), prop: p1.id, unidad: g2.id, fecha: ym + '-20', cat: 'Reparaciones', monto: 1350, moneda: 'USD', nota: 'Impermeabilización del techo, Galpón B' });
      if (k === 5) st.gastos.push({ id: uid(), prop: p2.id, unidad: t1.id, fecha: ym + '-10', cat: 'Mantenimiento', monto: 300, moneda: 'USD', nota: 'Desmalezado y cerca' });
    }
    return st;
  }

  /* ---------- cargos mensuales ---------- */
  const canonEn = (c, ym) => { const k = Math.max(0, mesesEntre(c.inicio, ym)); const veces = c.aumPct > 0 ? Math.floor(k / (c.aumCada || 12)) : 0; return r2(c.canon * Math.pow(1 + (c.aumPct || 0) / 100, veces)); };
  function generarCargos() {
    const lim = addMes(hoy().slice(0, 7), 1); // se genera hasta el mes que viene para cobrar adelantado
    S.contratos.forEach((c) => {
      const fin = (c.estado === 'terminado' ? c.finReal || c.fin : c.fin).slice(0, 7);
      for (let ym = c.inicio.slice(0, 7); ym <= lim && ym <= fin; ym = addMes(ym, 1)) {
        if (S.cargos.some((g) => g.contrato === c.id && g.periodo === ym && tipoDe(g) === 'canon')) continue;
        const dia = Math.min(c.dia || 5, +finMes(ym).slice(8));
        S.cargos.push({ id: uid(), contrato: c.id, periodo: ym, tipo: 'canon', monto: canonEn(c, ym), moneda: c.moneda, vence: ym + '-' + pad(dia), pagos: [] });
      }
    });
    ordenar();
  }
  const ordenar = () => S.cargos.sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : tipoDe(a) === 'canon' ? -1 : 1));
  const tipoDe = (g) => g.tipo || 'canon';
  const concepto = (g, corto) => (tipoDe(g) === 'condo' ? (corto ? 'Cond. ' : 'Condominio ') : (corto ? 'Canon ' : 'Canon ')) + (corto ? MESES[+g.periodo.slice(5, 7) - 1].slice(0, 3) : nomMes(g.periodo));

  /* ---------- condominio ---------- */
  // contrato vigente de un espacio en un mes (para saber si ese mes estaba alquilado)
  const activoEn = (uId, ym) => S.contratos.filter((c) => c.unidad === uId && c.inicio.slice(0, 7) <= ym && (c.estado === 'terminado' ? c.finReal || c.fin : c.fin).slice(0, 7) >= ym).pop();
  function sugAlic(pId) { const us = rentables().filter((u) => u.prop === pId); const t = us.reduce((a, u) => a + (+u.m2 || 0), 0); const o = {}; us.forEach((u) => { o[u.id] = t ? r4((+u.m2 || 0) / t * 100) : r4(100 / us.length); }); return o; }
  function repartoCondo(pId, ym) {
    const p = prop(pId); const cf = p.condo || condoBase(); const G = S.condoGastos.filter((g) => g.prop === pId && g.periodo === ym);
    const gastos = r2(G.reduce((a, g) => a + aUsd(g.monto, g.moneda), 0)); const reserva = r2(gastos * (cf.reserva || 0) / 100), honor = r2(gastos * (cf.honor || 0) / 100); const total = r2(gastos + reserva + honor);
    const us = rentables().filter((u) => u.prop === pId); const sug = sugAlic(pId);
    const alic = us.map((u) => (cf.modo === 'iguales' ? r4(100 / us.length) : u.alic != null ? +u.alic : sug[u.id])); const suma = r4(alic.reduce((a, b) => a + b, 0));
    const filas = us.map((u, k) => ({ u, alic: alic[k], auto: cf.modo !== 'iguales' && u.alic == null, pct: suma ? alic[k] / suma * 100 : 0, c: activoEn(u.id, ym) }));
    filas.forEach((f) => { f.cuota = r2(total * f.pct / 100); });
    const dif = r2(total - filas.reduce((a, f) => a + f.cuota, 0)); if (filas.length && Math.abs(dif) > 0.001) { const f = filas.reduce((a, b) => (b.cuota > a.cuota ? b : a)); f.cuota = r2(f.cuota + dif); }
    const cobrar = r2(filas.filter((f) => f.c).reduce((a, f) => a + f.cuota, 0));
    return { p, cf, G, gastos, reserva, honor, total, filas, suma, cobrar, dueno: r2(total - cobrar) };
  }
  // crea o actualiza las cuotas del mes; las que ya tienen pagos no se tocan. Se cobran con el canon del mes siguiente.
  function emitirCondo(pId, ym, fecha) {
    const R = repartoCondo(pId, ym); let n = 0, fijos = 0; const sig = addMes(ym, 1);
    R.filas.forEach((f) => {
      if (!f.c) return; const monto = f.c.moneda === 'VES' ? r2(f.cuota * S.tasa) : f.cuota; const vence = sig + '-' + pad(Math.min(f.c.dia || 5, +finMes(sig).slice(8)));
      const ex = S.cargos.find((g) => g.tipo === 'condo' && g.contrato === f.c.id && g.periodo === ym);
      if (ex) { if (ex.pagos.length) { if (Math.abs(ex.monto - monto) > 0.005) fijos++; return; } ex.monto = monto; ex.vence = vence; n++; return; }
      if (monto > 0) { S.cargos.push({ id: uid(), contrato: f.c.id, periodo: ym, tipo: 'condo', monto, moneda: f.c.moneda, vence, pagos: [] }); n++; }
    });
    S.cargos = S.cargos.filter((g) => !(g.tipo === 'condo' && g.periodo === ym && !g.pagos.length && unidad(contrato(g.contrato).unidad).prop === pId && !R.filas.some((f) => f.c && f.c.id === g.contrato && f.cuota > 0)));
    const rec = { prop: pId, periodo: ym, fecha: fecha || hoy(), total: R.total }; const e = S.condoEmit.find((x) => x.prop === pId && x.periodo === ym); if (e) Object.assign(e, rec); else S.condoEmit.push(rec);
    ordenar(); return { n, fijos };
  }
  const pagado = (g) => r2(g.pagos.reduce((a, p) => a + p.monto, 0));
  const saldo = (g) => r2(g.monto - pagado(g));
  const est = (g) => { const s = saldo(g); if (s <= 0.005) return 'pagado'; if (g.vence < hoy()) return 'vencido'; return pagado(g) > 0 ? 'parcial' : 'pendiente'; };
  const ESTT = { pagado: '<span class="tag ok">Pagado</span>', vencido: '<span class="tag bad">Vencido</span>', parcial: '<span class="tag warn">Abonado</span>', pendiente: '<span class="tag mut">Por cobrar</span>' };
  const aUsd = (v, m, tasa) => (m === 'VES' ? v / (tasa || S.tasa) : v);
  const contrato = (id) => S.contratos.find((c) => c.id === id);
  const unidad = (id) => S.unidades.find((u) => u.id === id);
  const inq = (id) => S.inq.find((x) => x.id === id);
  const prop = (id) => S.props.find((p) => p.id === id);
  const activoDe = (uId) => S.contratos.find((c) => c.unidad === uId && c.estado === 'activo');
  const deudaContrato = (c, t) => S.cargos.filter((g) => g.contrato === c.id && g.vence < hoy() && (!t || tipoDe(g) === t)).reduce((a, g) => a + Math.max(0, saldo(g)), 0);
  const tieneCondo = (c) => S.cargos.some((g) => g.contrato === c.id && g.tipo === 'condo');
  function estadoU(u) {
    if (u.tipo === 'Área común') return 'comun';
    const c = activoDe(u.id); if (!c) return 'libre';
    if (deudaContrato(c) > 0.005) return 'debe';
    if (dias(hoy(), c.fin) <= (S.aviso || 60)) return 'vence';
    return 'aldia';
  }
  const COLOR = { aldia: '#E4E8DC', debe: '#FBE6E3', vence: '#E9DCB8', libre: '#FFFFFF', comun: '#F2EFE7' };
  const BORDE = { aldia: '#33402A', debe: '#A8322A', vence: '#7A5F1F', libre: '#9C9480', comun: '#DDD7C8' };
  const ETIQ = { aldia: 'Al día', debe: 'Debe', vence: 'Contrato por vencer', libre: 'Libre', comun: 'Área común' };
  const TAGU = { aldia: 'ok', debe: 'bad', vence: 'warn', libre: 'mut', comun: 'mut' };
  const rentables = () => S.unidades.filter((u) => u.tipo !== 'Área común');
  const mensualUsd = (c) => aUsd(canonEn(c, hoy().slice(0, 7)), c.moneda);
  function resumen(pId) {
    const us = rentables().filter((u) => !pId || u.prop === pId); const act = us.map((u) => activoDe(u.id)).filter(Boolean);
    const m = hoy().slice(0, 7);
    const cs = S.contratos.filter((c) => !pId || unidad(c.unidad).prop === pId);
    const dCanon = cs.reduce((a, c) => a + aUsd(deudaContrato(c, 'canon'), c.moneda), 0), dCondo = cs.reduce((a, c) => a + aUsd(deudaContrato(c, 'condo'), c.moneda), 0);
    const cob = (t) => S.cargos.filter((g) => tipoDe(g) === t && (!pId || unidad(contrato(g.contrato).unidad).prop === pId)).reduce((a, g) => a + g.pagos.filter((p) => p.fecha.slice(0, 7) === m).reduce((b, p) => b + aUsd(p.monto, g.moneda, p.tasa), 0), 0);
    const cobCanon = cob('canon'), cobCondo = cob('condo');
    return { n: us.length, ocup: act.length, pct: us.length ? Math.round(act.length / us.length * 100) : 0, esperado: act.reduce((a, c) => a + mensualUsd(c), 0), deuda: dCanon + dCondo, dCanon, dCondo, cobrado: cobCanon + cobCondo, cobCanon, cobCondo, m2: us.reduce((a, u) => a + (+u.m2 || 0), 0), m2oc: us.filter((u) => activoDe(u.id)).reduce((a, u) => a + (+u.m2 || 0), 0) };
  }

  /* ---------- navegación ---------- */
  const NAV = [['Día a día', [['inicio', 'Inicio', 'home'], ['plano', 'Plano', 'layout-board'], ['cobros', 'Cobros', 'cash'], ['condominio', 'Condominio', 'building-community'], ['contratos', 'Contratos', 'file-text']]], ['Registro', [['inquilinos', 'Inquilinos', 'users'], ['inmuebles', 'Inmuebles', 'building'], ['gastos', 'Gastos', 'receipt']]], ['Análisis', [['reportes', 'Reportes', 'chart-bar']]], ['Sistema', [['tasas', 'Calculadora de tasas', 'arrows-exchange'], ['config', 'Configuración', 'settings']]]];
  let vista = 'inicio';
  function nav() {
    $('nav').innerHTML = '<div class="brand">Alquileres<small>' + esc(S.nombre) + '</small></div>' + NAV.map((g) => '<div class="grp">' + g[0] + '</div>' + g[1].map((x) => '<button' + (x[0] === vista ? ' class="on"' : '') + ' onclick="location.hash=\'' + x[0] + '\'">' + ico(x[2]) + x[1] + '</button>').join('')).join('') +
      '<div class="tasa">Tasa para convertir' + (window.PRBTasa ? PRBTasa.tag(S) : '') + '<b>' + bs(S.tasa) + ' por $</b><button class="lnk" style="margin-top:4px" onclick="location.hash=\'tasas\'">Cambiar tasa</button></div>';
  }
  function go() {
    const k = location.hash.slice(1).split('/')[0]; vista = V[k] ? k : 'inicio'; nav();
    $('m').innerHTML = V[vista]() + '<div class="foot">Alquileres · hecho por <a href="../">PRB Consulting</a>. Demo con datos ficticios: lo que registres se guarda solo en este navegador (no se ve desde otro equipo ni desde el teléfono; para pasarlo usa el respaldo en Configuración).</div>' + (vista === 'inicio' || vista === 'cobros' ? '<button class="fab" onclick="AQ.pago()">' + ico('cash') + ' Registrar pago</button>' : '');
    if (A[vista]) A[vista]();
  }
  function rerender() { const y = $('m').scrollTop, w = window.scrollY; go(); $('m').scrollTop = y; window.scrollTo(0, w); }
  window.addEventListener('hashchange', () => { go(); $('m').scrollTop = 0; window.scrollTo(0, 0); });
  function dlg(t, c, b) { const d = $('dlg'); d.innerHTML = '<div class="hd"><b>' + t + '</b><button class="x" aria-label="Cerrar" onclick="AQ.cerrar()">×</button></div><div class="bd">' + c + '</div><div class="ft">' + (b || '<button class="btn sec" onclick="AQ.cerrar()">Cerrar</button>') + '</div>'; if (!d.open) d.showModal(); }
  const cerrar = () => { if ($('dlg').open) $('dlg').close(); document.body.classList.remove('print-recibo'); };
  const V = {}, A = {};
  const sel = (id, ops, v, extra) => '<select class="inp" id="' + id + '"' + (extra || '') + '>' + ops.map((o) => (Array.isArray(o) ? o : [o, o])).map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';

  /* ---------- inicio ---------- */
  V.inicio = () => {
    const r = resumen(); const m = hoy().slice(0, 7);
    const porCobrar = S.cargos.filter((g) => g.vence.slice(0, 7) === m && est(g) !== 'pagado');
    const mAnt = addMes(m, -1); const sinEmitir = S.props.filter((p) => p.condo && p.condo.activo && !S.condoEmit.some((e) => e.prop === p.id && e.periodo === mAnt));
    const mor = morosos(); const venc = porVencer(); const libres = rentables().filter((u) => !activoDe(u.id));
    return '<h1>¿Qué quieres hacer hoy?</h1><p class="sub">' + esc(S.nombre) + ' · ' + r.ocup + ' de ' + r.n + ' espacios alquilados.</p><div class="hoy"><div class="tiles">' +
      '<button class="tile main" id="t-pago" onclick="AQ.pago()"><div class="ic">' + ico('cash') + '</div><div><b>Registrar un pago</b><span>Un inquilino te pagó: anótalo y sale el recibo.</span></div></button>' +
      '<button class="tile' + (mor.length ? ' att' : '') + '" onclick="location.hash=\'cobros\'"><div class="ic">' + ico('alert-circle') + '</div><div><b>Morosos</b><span>' + (mor.length ? mor.length + ' inquilinos deben ' + usd(mor.reduce((a, x) => a + x.usd, 0)) : 'Nadie debe. Todo al día.') + '</span>' + (mor.length ? '<span class="bd b">' + mor.length + '</span>' : '') + '</div></button>' +
      '<button class="tile" onclick="location.hash=\'cobros\'"><div class="ic">' + ico('calendar-dollar') + '</div><div><b>Cobrar ' + MESES[+m.slice(5) - 1] + '</b><span>' + (porCobrar.length ? porCobrar.length + ' cobros pendientes este mes (canon y condominio)' : 'Ya cobraste todo el mes') + '</span></div></button>' +
      (S.props.some((p) => p.condo && p.condo.activo) ? '<button class="tile' + (sinEmitir.length ? ' att' : '') + '" id="t-condo" onclick="location.hash=\'condominio\'"><div class="ic">' + ico('building-community') + '</div><div><b>Condominio</b><span>' + (sinEmitir.length ? 'Falta emitir las cuotas de ' + MESES[+mAnt.slice(5) - 1] + ' en ' + sinEmitir.length + (sinEmitir.length > 1 ? ' propiedades' : ' propiedad') : 'Gastos comunes y cuotas de cada local') + '</span></div></button>' : '') +
      '<button class="tile' + (venc.length ? ' att' : '') + '" onclick="location.hash=\'contratos\'"><div class="ic">' + ico('calendar-time') + '</div><div><b>Contratos por vencer</b><span>' + (venc.length ? venc.length + ' vencen en los próximos ' + (S.aviso || 60) + ' días' : 'Ninguno vence pronto') + '</span></div></button>' +
      '<button class="tile" onclick="location.hash=\'plano\'"><div class="ic">' + ico('layout-board') + '</div><div><b>Ver el plano</b><span>' + (libres.length ? libres.length + ' espacios libres para alquilar' : 'Todo alquilado') + '</span></div></button></div></div>' +
      '<div class="kpis"><div class="card kpi" style="--c:var(--oliva)"><div class="n">' + usd(r.esperado) + '</div><div class="t">Alquiler mensual (contratos activos)</div></div><div class="card kpi" style="--c:var(--ok)"><div class="n">' + usd(r.cobrado) + '</div><div class="t">Cobrado en ' + MESES[+m.slice(5) - 1] + (r.cobCondo > 0.005 ? '<br><span class="hint">canon ' + usd(r.cobCanon) + ' · condominio ' + usd(r.cobCondo) + '</span>' : '') + '</div></div><div class="card kpi" style="--c:var(--bad)"><div class="n">' + usd(r.deuda) + '</div><div class="t">Deuda vencida' + (r.dCondo > 0.005 ? '<br><span class="hint">canon ' + usd(r.dCanon) + ' · condominio ' + usd(r.dCondo) + '</span>' : '') + '</div></div><div class="card kpi"><div class="n">' + r.pct + '%</div><div class="t">Ocupación (' + nf0.format(r.m2oc) + ' de ' + nf0.format(r.m2) + ' m²)</div></div></div>' +
      '<div class="card"><h3>Por propiedad</h3><table><thead><tr><th>Propiedad</th><th class="r">Ocupación</th><th class="r">Mensual</th><th class="r">Deuda</th><th></th></tr></thead><tbody>' + S.props.map((p) => { const x = resumen(p.id); return '<tr><td><b>' + esc(p.nombre) + '</b></td><td class="r">' + x.ocup + '/' + x.n + '</td><td class="r">' + usd(x.esperado) + '</td><td class="r">' + (x.deuda > 0.005 ? '<span style="color:var(--bad);font-weight:600">' + usd(x.deuda) + '</span>' : '—') + '</td><td class="r"><button class="lnk" onclick="AQ.verPlano(\'' + p.id + '\')">Plano</button></td></tr>'; }).join('') + '</tbody></table></div>';
  };
  function morosos() {
    const L = []; S.contratos.filter((c) => c.estado === 'activo' || deudaContrato(c) > 0).forEach((c) => { const d = deudaContrato(c); if (d > 0.005) { const vs = S.cargos.filter((g) => g.contrato === c.id && g.vence < hoy() && saldo(g) > 0.005); L.push({ c, d, dCanon: deudaContrato(c, 'canon'), dCondo: deudaContrato(c, 'condo'), usd: aUsd(d, c.moneda), n: new Set(vs.map((g) => g.vence.slice(0, 7))).size, desde: vs[0].vence }); } });
    return L.sort((a, b) => b.usd - a.usd);
  }
  const porVencer = () => S.contratos.filter((c) => c.estado === 'activo' && dias(hoy(), c.fin) <= (S.aviso || 60)).sort((a, b) => (a.fin < b.fin ? -1 : 1));

  /* ---------- plano 2D ---------- */
  let editar = false, uSel = null;
  V.plano = () => {
    if (!S.props.length) return '<h1>Plano</h1><div class="card empty">Primero crea una propiedad en <a href="#inmuebles">Inmuebles</a>.</div>';
    const p = prop(S.propSel) || S.props[0]; S.propSel = p.id; const r = resumen(p.id);
    return '<h1>Plano</h1><p class="sub">Toca un espacio para ver quién lo tiene, cuánto paga y si debe.</p><div class="props">' + S.props.map((x) => '<button class="' + (x.id === p.id ? 'on' : '') + '" onclick="AQ.verPlano(\'' + x.id + '\')">' + esc(x.nombre) + '</button>').join('') + '</div>' +
      '<div class="mini"><div><b>' + r.ocup + '/' + r.n + '</b><span>Alquilados (' + r.pct + '%)</span></div><div><b>' + usd(r.esperado) + '</b><span>Alquiler mensual</span></div><div><b style="color:' + (r.deuda > 0.005 ? 'var(--bad)' : 'inherit') + '">' + usd(r.deuda) + '</b><span>Deuda vencida</span></div><div><b>' + nf0.format(p.w * p.h) + ' m²</b><span>Terreno (' + p.w + ' × ' + p.h + ' m)</span></div></div>' +
      '<div class="plano-w"><div class="plano"><div class="tool"><div class="seg"><button class="' + (!editar ? 'on' : '') + '" onclick="AQ.modo(false)">' + ico('eye') + ' Ver</button><button id="b-editar" class="' + (editar ? 'on' : '') + '" onclick="AQ.modo(true)">' + ico('pencil') + ' Editar plano</button></div>' +
      (editar ? '<button class="btn sm" id="b-addu" onclick="AQ.nuevaU()">' + ico('plus') + ' Agregar espacio</button><button class="btn sec sm" onclick="AQ.propDlg(\'' + p.id + '\')">Medidas del terreno</button><span class="hint">Arrastra para mover; la esquina oscura cambia el tamaño.</span>' : '') + '</div>' +
      svgPlano(p) + '<div class="ley">' + ['aldia', 'debe', 'vence', 'libre', 'comun'].map((k) => '<span><i style="background:' + COLOR[k] + ';border-color:' + BORDE[k] + '"></i>' + ETIQ[k] + '</span>').join('') + '</div></div><div class="ficha card" id="ficha">' + ficha(p) + '</div></div>';
  };
  function svgPlano(p) {
    const us = S.unidades.filter((u) => u.prop === p.id); const g = []; const paso = p.w > 80 ? 10 : 5;
    for (let x = 0; x <= p.w; x += paso) g.push('<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + p.h + '"/>');
    for (let y = 0; y <= p.h; y += paso) g.push('<line x1="0" y1="' + y + '" x2="' + p.w + '" y2="' + y + '"/>');
    const fs0 = Math.max(1.2, Math.min(2.4, p.w / 45));
    const cel = us.map((u) => {
      const e = estadoU(u); const c = activoDe(u.id); const fs = Math.min(fs0, u.w / 6.5, u.h / 3.2); const cx = u.x + u.w / 2, cy = u.y + u.h / 2;
      const t2 = c ? (inq(c.inq) || {}).nombre || '' : e === 'comun' ? '' : 'Libre'; const corto = t2.length > u.w / (fs * 0.55) ? t2.slice(0, Math.max(3, Math.floor(u.w / (fs * 0.55)) - 1)) + '…' : t2;
      return '<g class="u' + (u.id === uSel ? ' sel' : '') + '" data-u="' + u.id + '"><rect class="b" x="' + u.x + '" y="' + u.y + '" width="' + u.w + '" height="' + u.h + '" rx=".6" fill="' + COLOR[e] + '" stroke="' + BORDE[e] + '"' + (e === 'libre' ? ' stroke-dasharray="1.2 .8"' : '') + '/>' +
        '<text x="' + cx + '" y="' + (cy - (t2 && u.h > fs * 3 ? fs * 0.35 : -fs * 0.35)) + '" font-size="' + fs + '" font-weight="600" text-anchor="middle" fill="#1E2618">' + esc(u.nombre) + '</text>' +
        (t2 && u.h > fs * 3 ? '<text x="' + cx + '" y="' + (cy + fs * 1.05) + '" font-size="' + fs * 0.8 + '" text-anchor="middle" fill="' + (e === 'debe' ? '#A8322A' : '#5C6352') + '">' + esc(corto) + '</text>' : '') +
        (editar ? '<rect class="hd" data-h="' + u.id + '" x="' + (u.x + u.w - 1.6) + '" y="' + (u.y + u.h - 1.6) + '" width="1.6" height="1.6" rx=".3"/>' : '') + '</g>';
    }).join('');
    return '<svg id="svg" class="' + (editar ? 'edit' : '') + '" viewBox="-1 -1 ' + (p.w + 2) + ' ' + (p.h + 2) + '" role="img" aria-label="Plano de ' + esc(p.nombre) + '"><rect x="0" y="0" width="' + p.w + '" height="' + p.h + '" fill="#FAF8F3" stroke="#5C6352" stroke-width=".3" stroke-dasharray="1.5 1"/><g stroke="#DDD7C8" stroke-width=".08">' + g.join('') + '</g>' + cel + '</svg>';
  }
  function ficha(p) {
    const u = uSel && unidad(uSel); const r = resumen(p.id);
    if (!u || u.prop !== p.id) {
      const lib = rentables().filter((x) => x.prop === p.id && !activoDe(x.id));
      return '<p class="tit">' + esc(p.nombre) + '</p><p class="hint" style="margin:0">' + esc(p.dir || '') + '</p><dl><dt>Espacios</dt><dd>' + r.n + '</dd><dt>Alquilados</dt><dd>' + r.ocup + '</dd><dt>Área alquilable</dt><dd>' + nf0.format(r.m2) + ' m²</dd><dt>Área alquilada</dt><dd>' + nf0.format(r.m2oc) + ' m²</dd></dl>' +
        (lib.length ? '<h3>Libres para alquilar</h3>' + lib.map((x) => '<p style="margin:6px 0"><button class="lnk" onclick="AQ.selU(\'' + x.id + '\')">' + esc(x.nombre) + '</button> <span class="hint">· ' + esc(x.tipo) + ' · ' + nf0.format(x.m2) + ' m²' + (x.ref ? ' · ref. ' + usd(x.ref) : '') + '</span></p>').join('') : '<p class="hint">Todo está alquilado.</p>') + '<p class="hint">Toca un espacio en el plano para ver su ficha.</p>';
    }
    const e = estadoU(u); const c = activoDe(u.id); let h = '<div class="row" style="margin:0"><span class="tag ' + TAGU[e] + '">' + ETIQ[e] + '</span><span class="sp"></span><button class="x" aria-label="Cerrar ficha" onclick="AQ.selU(null)">×</button></div><p class="tit" style="margin-top:6px">' + esc(u.nombre) + '</p><p class="hint" style="margin:0">' + esc(u.tipo) + (u.m2 ? ' · ' + nf0.format(u.m2) + ' m²' : '') + ' · ' + u.w + ' × ' + u.h + ' m</p>';
    if (c) {
      const i = inq(c.inq) || {}; const d = deudaContrato(c); const m = hoy().slice(0, 7); const gm = S.cargos.find((g) => g.contrato === c.id && g.periodo === m && tipoDe(g) === 'canon'); const gc = S.cargos.filter((g) => g.contrato === c.id && g.tipo === 'condo').pop(); const dCa = deudaContrato(c, 'canon'), dCo = deudaContrato(c, 'condo');
      h += '<dl><dt>Inquilino</dt><dd>' + esc(i.nombre) + '</dd><dt>Alquiler</dt><dd>' + mon(canonEn(c, m), c.moneda) + '</dd>' + (u.m2 ? '<dt>Por m²</dt><dd>' + mon(canonEn(c, m) / u.m2, c.moneda) + '</dd>' : '') + (gc ? '<dt>Condominio (' + MESES[+gc.periodo.slice(5) - 1].slice(0, 3) + ')</dt><dd>' + mon(gc.monto, gc.moneda) + '</dd>' : '') + '<dt>Paga el día</dt><dd>' + c.dia + '</dd><dt>Canon este mes</dt><dd>' + (gm ? ESTT[est(gm)] : '—') + '</dd>' + (gc ? '<dt>Debe canon</dt><dd style="color:' + (dCa > 0.005 ? 'var(--bad)' : 'inherit') + '">' + mon(dCa, c.moneda) + '</dd><dt>Debe condominio</dt><dd style="color:' + (dCo > 0.005 ? 'var(--bad)' : 'inherit') + '">' + mon(dCo, c.moneda) + '</dd>' : '<dt>Debe</dt><dd style="color:' + (d > 0.005 ? 'var(--bad)' : 'inherit') + '">' + mon(d, c.moneda) + '</dd>') + '<dt>Contrato vence</dt><dd>' + fdia(c.fin) + '</dd><dt>Teléfono</dt><dd>' + esc(i.tel || '—') + '</dd></dl>' +
        '<div class="row"><button class="btn" onclick="AQ.pago(\'' + c.id + '\')">' + ico('cash') + ' Registrar pago</button><button class="btn sec" onclick="AQ.cuenta(\'' + c.id + '\')">Estado de cuenta</button></div><div class="row"><button class="lnk" onclick="AQ.contratoDlg(\'' + c.id + '\')">Ver contrato</button>' + (d > 0.005 && i.tel ? '<button class="lnk" onclick="AQ.recordar(\'' + c.id + '\')">Recordarle por WhatsApp</button>' : '') + '</div>';
    } else if (e === 'libre') h += '<p>Este espacio está libre.' + (u.ref ? ' Precio de referencia: <b>' + usd(u.ref) + '</b> al mes.' : '') + '</p><button class="btn" onclick="AQ.contratoDlg(null,\'' + u.id + '\')">' + ico('file-plus') + ' Alquilarlo (nuevo contrato)</button>';
    h += '<details class="mas"' + (editar ? ' open' : '') + '><summary>Datos del espacio</summary><div class="form" style="margin-top:12px"><label class="f full">Nombre<input class="inp" id="u-n" value="' + esc(u.nombre) + '"></label><label class="f">Tipo' + sel('u-t', TIPOS, u.tipo) + '</label><label class="f">m²<input class="inp num" id="u-m2" inputmode="decimal" value="' + (u.m2 || '') + '"></label><label class="f">Ancho (m)<input class="inp num" id="u-w" inputmode="decimal" value="' + u.w + '"></label><label class="f">Largo (m)<input class="inp num" id="u-h" inputmode="decimal" value="' + u.h + '"></label><label class="f full">Precio de referencia ($/mes)<input class="inp num" id="u-ref" inputmode="decimal" value="' + (u.ref || '') + '"></label><label class="f full">Notas<textarea class="inp" id="u-no" rows="2">' + esc(u.notas || '') + '</textarea></label></div><div class="row" style="margin-top:12px"><button class="btn sec" onclick="AQ.guardaU(\'' + u.id + '\')">Guardar</button>' + (c ? '' : '<button class="btn danger" onclick="AQ.borraU(\'' + u.id + '\')">Quitar del plano</button>') + '</div></details>';
    return h;
  }
  A.plano = () => {
    const svg = $('svg'); if (!svg) return; let drag = null;
    const pt = (ev) => { const m = svg.getScreenCTM().inverse(); const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m); return { x: q.x, y: q.y }; };
    const snap = (v) => Math.round(v * 2) / 2;
    svg.addEventListener('pointerdown', (ev) => {
      const h = ev.target.closest('[data-h]'), g = ev.target.closest('[data-u]'); if (!g && !h) return;
      const u = unidad((h || g).dataset.h || g.dataset.u);
      if (!editar) { AQ.selU(u.id); return; }
      ev.preventDefault(); svg.setPointerCapture(ev.pointerId); const p0 = pt(ev);
      drag = { u, h: !!h, p0, x: u.x, y: u.y, w: u.w, hh: u.h, mov: false, el: g };
    });
    svg.addEventListener('pointermove', (ev) => {
      if (!drag) return; const p = prop(drag.u.prop); const q = pt(ev); const dx = q.x - drag.p0.x, dy = q.y - drag.p0.y; if (Math.abs(dx) + Math.abs(dy) > 0.3) drag.mov = true;
      const u = drag.u;
      if (drag.h) { u.w = Math.max(2, Math.min(p.w - u.x, snap(drag.w + dx))); u.h = Math.max(2, Math.min(p.h - u.y, snap(drag.hh + dy))); }
      else { u.x = Math.max(0, Math.min(p.w - u.w, snap(drag.x + dx))); u.y = Math.max(0, Math.min(p.h - u.h, snap(drag.y + dy))); }
      const rc = drag.el.querySelector('rect.b'); rc.setAttribute('x', u.x); rc.setAttribute('y', u.y); rc.setAttribute('width', u.w); rc.setAttribute('height', u.h);
      const hd = drag.el.querySelector('.hd'); if (hd) { hd.setAttribute('x', u.x + u.w - 1.6); hd.setAttribute('y', u.y + u.h - 1.6); }
      drag.el.querySelectorAll('text').forEach((t) => t.setAttribute('visibility', 'hidden'));
    });
    const up = () => { if (!drag) return; const d = drag; drag = null; if (d.h && d.u.tipo !== 'Área común' && (d.w !== d.u.w || d.hh !== d.u.h)) d.u.m2 = r2(d.u.w * d.u.h); uSel = d.u.id; save(); rerender(); };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  };

  /* ---------- cobros ---------- */
  let mesC = hoy().slice(0, 7);
  V.cobros = () => {
    const ms = [...new Set(S.cargos.map((g) => g.vence.slice(0, 7)))].sort().reverse(); if (!ms.includes(mesC)) mesC = hoy().slice(0, 7);
    const L = S.cargos.filter((g) => g.vence.slice(0, 7) === mesC); const mor = morosos(); const hayC = L.some((g) => g.tipo === 'condo') || mor.some((x) => x.dCondo > 0.005);
    const cobT = (t) => L.filter((g) => tipoDe(g) === t).reduce((a, g) => a + aUsd(pagado(g), g.moneda), 0), totT = (t) => L.filter((g) => tipoDe(g) === t).reduce((a, g) => a + aUsd(g.monto, g.moneda), 0);
    const tot = L.reduce((a, g) => a + aUsd(g.monto, g.moneda), 0), cob = L.reduce((a, g) => a + aUsd(pagado(g), g.moneda), 0);
    let h = '<h1>Cobros</h1><p class="sub">Lo que toca cobrar cada mes y quién debe.</p>';
    if (mor.length) h += '<div class="card" style="margin-bottom:12px;border-color:#EAB8B2"><h3>' + ico('alert-circle') + ' Morosos · ' + usd(mor.reduce((a, x) => a + x.usd, 0)) + '</h3><div class="scroll"><table><thead><tr><th>Inquilino</th><th>Espacio</th><th class="r">Meses</th>' + (hayC ? '<th class="r">Canon</th><th class="r">Condominio</th>' : '') + '<th class="r">Debe</th><th class="r">Atraso</th><th></th></tr></thead><tbody>' +
      mor.map((x) => '<tr><td>' + esc((inq(x.c.inq) || {}).nombre) + '</td><td>' + esc(unidad(x.c.unidad).nombre) + '</td><td class="r">' + x.n + '</td>' + (hayC ? '<td class="r">' + (x.dCanon > 0.005 ? mon(x.dCanon, x.c.moneda) : '—') + '</td><td class="r">' + (x.dCondo > 0.005 ? mon(x.dCondo, x.c.moneda) : '—') + '</td>' : '') + '<td class="r"><b style="color:var(--bad)">' + mon(x.d, x.c.moneda) + '</b></td><td class="r">' + dias(x.desde, hoy()) + ' días</td><td class="r"><button class="btn sm" onclick="AQ.pago(\'' + x.c.id + '\')">Cobrar</button> <button class="lnk" onclick="AQ.recordar(\'' + x.c.id + '\')">WhatsApp</button></td></tr>').join('') + '</tbody></table></div></div>';
    h += '<div class="card"><div class="row"><h3 style="margin:0">' + nomMes(mesC) + '</h3><span class="sp"></span><label class="f" style="grid-template-columns:auto auto;align-items:center">Mes ' + sel('c-mes', ms.map((m) => [m, nomMes(m)]), mesC, ' onchange="AQ.mes(this.value)" style="width:auto"') + '</label></div>' +
      '<div class="hb" style="margin-bottom:12px"><span class="l">Cobrado</span><span class="b"><i style="width:' + (tot ? Math.min(100, cob / tot * 100) : 0) + '%"></i></span><span class="v">' + (tot ? Math.round(cob / tot * 100) : 0) + '%</span></div><p class="hint" style="margin-top:0">' + usd(cob) + ' cobrado de ' + usd(tot) + (hayC ? ': canon ' + usd(cobT('canon')) + ' de ' + usd(totT('canon')) + ' · condominio ' + usd(cobT('condo')) + ' de ' + usd(totT('condo')) : '') + ' (montos en Bs convertidos a la tasa).</p>' +
      '<div class="scroll"><table><thead><tr><th>Espacio</th><th>Inquilino</th><th>Concepto</th><th class="r">Vence</th><th class="r">Monto</th><th class="r">Pagado</th><th class="r">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (L.length ? L.map((g) => { const c = contrato(g.contrato); const s = saldo(g); return '<tr><td>' + esc(unidad(c.unidad).nombre) + '<br><span class="hint">' + esc(prop(unidad(c.unidad).prop).nombre) + '</span></td><td class="wrap">' + esc((inq(c.inq) || {}).nombre) + '</td><td>' + concepto(g) + '</td><td class="r">' + fdia(g.vence) + '</td><td class="r">' + mon(g.monto, g.moneda) + '</td><td class="r">' + mon(pagado(g), g.moneda) + '</td><td class="r">' + (s > 0.005 ? '<b>' + mon(s, g.moneda) + '</b>' : '—') + '</td><td>' + ESTT[est(g)] + '</td><td class="r">' + (s > 0.005 ? '<button class="btn sm" onclick="AQ.pago(\'' + c.id + '\',\'' + g.id + '\')">Cobrar</button>' : g.pagos.length ? '<button class="lnk" onclick="AQ.recibo(\'' + g.id + '\',\'' + g.pagos[g.pagos.length - 1].id + '\')">Recibo</button>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="9" class="empty">No hay cobros este mes.</td></tr>') + '</tbody></table></div></div>';
    return h;
  };

  /* ---------- contratos ---------- */
  let verTerm = false;
  V.contratos = () => {
    const venc = porVencer(); const L = S.contratos.filter((c) => verTerm ? c.estado === 'terminado' : c.estado === 'activo').sort((a, b) => (a.fin < b.fin ? -1 : 1));
    return '<h1>Contratos</h1><p class="sub">Quién alquila qué, por cuánto y hasta cuándo.</p><div class="row"><button class="btn" id="b-nuevoc" onclick="AQ.contratoDlg()">' + ico('file-plus') + ' Nuevo contrato</button><span class="sp"></span><div class="seg"><button class="' + (!verTerm ? 'on' : '') + '" onclick="AQ.term(false)">Activos</button><button class="' + (verTerm ? 'on' : '') + '" onclick="AQ.term(true)">Terminados</button></div></div>' +
      (venc.length && !verTerm ? '<div class="card" style="margin-bottom:12px;background:var(--dorado-suave);border-color:var(--dorado-suave)"><b>' + venc.length + ' contrato' + (venc.length > 1 ? 's vencen' : ' vence') + ' en los próximos ' + (S.aviso || 60) + ' días:</b> ' + venc.map((c) => esc(unidad(c.unidad).nombre) + ' (' + fdia(c.fin) + ')').join(', ') + '. Renueva o avisa al inquilino a tiempo.</div>' : '') +
      '<div class="card scroll" style="padding:0"><table><thead><tr><th>Espacio</th><th>Inquilino</th><th class="r">Alquiler</th><th class="r">Desde</th><th class="r">Hasta</th><th>Aumento</th><th></th></tr></thead><tbody>' +
      (L.length ? L.map((c) => { const dd = dias(hoy(), c.fin); return '<tr><td>' + esc(unidad(c.unidad).nombre) + '<br><span class="hint">' + esc(prop(unidad(c.unidad).prop).nombre) + '</span></td><td class="wrap">' + esc((inq(c.inq) || {}).nombre) + '</td><td class="r">' + mon(canonEn(c, hoy().slice(0, 7)), c.moneda) + '</td><td class="r">' + fdia(c.inicio) + '</td><td class="r">' + fdia(c.estado === 'terminado' ? c.finReal || c.fin : c.fin) + (c.estado === 'activo' && dd <= (S.aviso || 60) ? '<br><span class="tag ' + (dd < 0 ? 'bad' : 'warn') + '">' + (dd < 0 ? 'Venció hace ' + -dd + ' d' : 'Faltan ' + dd + ' d') + '</span>' : '') + '</td><td>' + (c.aumPct ? c.aumPct + '% cada ' + c.aumCada + ' meses' : '—') + '</td><td class="r"><button class="lnk" onclick="AQ.contratoDlg(\'' + c.id + '\')">Abrir</button></td></tr>'; }).join('') : '<tr><td colspan="7" class="empty">No hay contratos ' + (verTerm ? 'terminados' : 'activos') + '.</td></tr>') + '</tbody></table></div>';
  };

  /* ---------- inquilinos ---------- */
  V.inquilinos = () => '<h1>Inquilinos</h1><p class="sub">Tus inquilinos, qué alquilan y si están al día.</p><div class="row"><button class="btn" onclick="AQ.inqDlg()">' + ico('user-plus') + ' Nuevo inquilino</button></div><div class="card scroll" style="padding:0"><table><thead><tr><th>Nombre</th><th>RIF / C.I.</th><th>Teléfono</th><th>Alquila</th><th class="r">Debe</th><th></th></tr></thead><tbody>' +
    S.inq.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((i) => { const cs = S.contratos.filter((c) => c.inq === i.id && c.estado === 'activo'); const d = S.contratos.filter((c) => c.inq === i.id).reduce((a, c) => a + aUsd(deudaContrato(c), c.moneda), 0); return '<tr><td class="wrap"><b>' + esc(i.nombre) + '</b><br><span class="hint">' + esc(i.act || '') + '</span></td><td>' + esc(i.doc || '') + '</td><td>' + esc(i.tel || '') + '</td><td class="wrap">' + (cs.map((c) => esc(unidad(c.unidad).nombre)).join(', ') || '<span class="hint">Nada ahora</span>') + '</td><td class="r">' + (d > 0.005 ? '<b style="color:var(--bad)">' + usd(d) + '</b>' : '—') + '</td><td class="r"><button class="lnk" onclick="AQ.inqDlg(\'' + i.id + '\')">Editar</button>' + (cs[0] ? ' · <button class="lnk" onclick="AQ.cuenta(\'' + cs[0].id + '\')">Cuenta</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';

  /* ---------- inmuebles ---------- */
  V.inmuebles = () => '<h1>Inmuebles</h1><p class="sub">Tus propiedades y los espacios que alquilas en cada una.</p><div class="row"><button class="btn" onclick="AQ.propDlg()">' + ico('building-plus') + ' Nueva propiedad</button></div>' +
    S.props.map((p) => { const us = S.unidades.filter((u) => u.prop === p.id); return '<div class="card" style="margin-bottom:12px"><div class="row"><div><h3 style="margin:0">' + esc(p.nombre) + '</h3><span class="hint">' + esc(p.tipo || '') + ' · ' + esc(p.dir || '') + ' · ' + p.w + ' × ' + p.h + ' m</span></div><span class="sp"></span><button class="btn sec sm" onclick="AQ.verPlano(\'' + p.id + '\')">' + ico('layout-board') + ' Plano</button><button class="btn sec sm" onclick="AQ.propDlg(\'' + p.id + '\')">Editar</button></div><div class="scroll"><table><thead><tr><th>Espacio</th><th>Tipo</th><th class="r">m²</th><th>Estado</th><th>Inquilino</th><th class="r">Alquiler</th></tr></thead><tbody>' +
      (us.length ? us.map((u) => { const e = estadoU(u); const c = activoDe(u.id); return '<tr style="cursor:pointer" onclick="AQ.verPlano(\'' + p.id + '\',\'' + u.id + '\')"><td>' + esc(u.nombre) + '</td><td>' + esc(u.tipo) + '</td><td class="r">' + (u.m2 ? nf0.format(u.m2) : '—') + '</td><td><span class="tag ' + TAGU[e] + '">' + ETIQ[e] + '</span></td><td class="wrap">' + (c ? esc((inq(c.inq) || {}).nombre) : '—') + '</td><td class="r">' + (c ? mon(canonEn(c, hoy().slice(0, 7)), c.moneda) : u.ref ? '<span class="hint">ref. ' + usd(u.ref) + '</span>' : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">Sin espacios. Ábrelo en el plano y toca «Agregar espacio».</td></tr>') + '</tbody></table></div></div>'; }).join('');

  /* ---------- gastos ---------- */
  V.gastos = () => {
    const L = S.gastos.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); const m = hoy().slice(0, 7);
    const mes = L.filter((g) => g.fecha.slice(0, 7) === m).reduce((a, g) => a + aUsd(g.monto, g.moneda), 0);
    return '<h1>Gastos</h1><p class="sub">Lo que gastas en las propiedades: así sabes cuánto te deja cada una.</p><div class="row"><button class="btn" id="b-gasto" onclick="AQ.gastoDlg()">' + ico('plus') + ' Anotar gasto</button><span class="sp"></span><span class="hint">Este mes: <b>' + usd(mes) + '</b></span></div><div class="card scroll" style="padding:0"><table><thead><tr><th>Fecha</th><th>Propiedad</th><th>Categoría</th><th>Detalle</th><th class="r">Monto</th><th></th></tr></thead><tbody>' +
      (L.length ? L.slice(0, 200).map((g) => '<tr><td>' + fdia(g.fecha) + '</td><td>' + esc((prop(g.prop) || {}).nombre || '') + (g.unidad && unidad(g.unidad) ? '<br><span class="hint">' + esc(unidad(g.unidad).nombre) + '</span>' : '') + '</td><td>' + esc(g.cat) + '</td><td class="wrap">' + esc(g.nota || '') + '</td><td class="r">' + mon(g.monto, g.moneda) + '</td><td class="r"><button class="lnk" onclick="AQ.gastoDlg(\'' + g.id + '\')">Editar</button></td></tr>').join('') : '<tr><td colspan="6" class="empty">Sin gastos.</td></tr>') + '</tbody></table></div>';
  };

  /* ---------- reportes ---------- */
  V.reportes = () => {
    const m0 = hoy().slice(0, 7); const meses = Array.from({ length: 12 }, (_, i) => addMes(m0, i - 11));
    const enP = (g, pId) => !pId || unidad(contrato(g.contrato).unidad).prop === pId;
    const ingMes = (ym, pId, t) => S.cargos.reduce((a, g) => { if (tipoDe(g) !== (t || 'canon') || !enP(g, pId)) return a; return a + g.pagos.filter((p) => p.fecha.slice(0, 7) === ym).reduce((b, p) => b + aUsd(p.monto, g.moneda, p.tasa), 0); }, 0);
    const gasMes = (ym, pId) => S.gastos.filter((g) => g.fecha.slice(0, 7) === ym && (!pId || g.prop === pId)).reduce((a, g) => a + aUsd(g.monto, g.moneda), 0);
    const emit = (pId) => S.condoEmit.filter((e) => e.prop === pId && meses.includes(e.periodo)).map((e) => repartoCondo(pId, e.periodo));
    const asumido = (pId) => emit(pId).reduce((a, x) => a + x.dueno, 0);
    const filas = S.props.map((p) => { const i = meses.reduce((a, m) => a + ingMes(m, p.id), 0), g = meses.reduce((a, m) => a + gasMes(m, p.id), 0), as = asumido(p.id); const r = resumen(p.id); return { p, i, g, as, n: i - g - as, r }; });
    const mx = Math.max(1, ...meses.map((m) => ingMes(m)));
    const aging = [[0, 0], [0, 0], [0, 0], [0, 0]]; S.cargos.forEach((g) => { const s = saldo(g); if (s <= 0.005 || g.vence >= hoy()) return; const d = dias(g.vence, hoy()); aging[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3][tipoDe(g) === 'condo' ? 1 : 0] += aUsd(s, g.moneda); });
    const ti = filas.reduce((a, x) => a + x.i, 0), tg = filas.reduce((a, x) => a + x.g + x.as, 0); const hayAs = filas.some((x) => x.as > 0.005);
    const pc = S.props.filter((p) => p.condo && p.condo.activo || S.condoEmit.some((e) => e.prop === p.id));
    const cRows = pc.map((p) => { const E = emit(p.id); const fact = S.cargos.filter((g) => g.tipo === 'condo' && enP(g, p.id) && meses.includes(g.periodo)); return { p, gastos: E.reduce((a, x) => a + x.gastos, 0), reserva: E.reduce((a, x) => a + x.reserva, 0), fact: fact.reduce((a, g) => a + aUsd(g.monto, g.moneda), 0), cob: meses.reduce((a, m) => a + ingMes(m, p.id, 'condo'), 0), pend: fact.reduce((a, g) => a + aUsd(Math.max(0, saldo(g)), g.moneda), 0), as: E.reduce((a, x) => a + x.dueno, 0) }; });
    const sumC = (k) => cRows.reduce((a, x) => a + x[k], 0);
    return '<h1>Reportes</h1><p class="sub">Últimos 12 meses, en dólares (lo cobrado en Bs se convierte a la tasa del día del pago). El condominio va aparte: no es ganancia del canon.</p>' +
      '<div class="kpis"><div class="card kpi" style="--c:var(--ok)"><div class="n">' + usd(ti) + '</div><div class="t">Canon cobrado en 12 meses</div></div><div class="card kpi" style="--c:var(--bad)"><div class="n">' + usd(tg) + '</div><div class="t">Gastos' + (hayAs ? ' (incluye condominio de locales vacíos)' : '') + '</div></div><div class="card kpi" style="--c:var(--oliva)"><div class="n">' + usd(ti - tg) + '</div><div class="t">Te quedó</div></div><div class="card kpi"><div class="n">' + (ti ? Math.round((ti - tg) / ti * 100) : 0) + '%</div><div class="t">Margen</div></div></div>' +
      '<div class="card" style="margin-bottom:12px"><h3>¿Cuánto te deja cada propiedad?</h3><div class="scroll"><table><thead><tr><th>Propiedad</th><th class="r">Canon cobrado</th><th class="r">Gastos</th>' + (hayAs ? '<th class="r">Condominio de vacíos</th>' : '') + '<th class="r">Te quedó</th><th class="r">Ocupación</th><th class="r">$ por m² al mes</th></tr></thead><tbody>' +
      filas.map((x) => '<tr><td>' + esc(x.p.nombre) + '</td><td class="r">' + usd(x.i) + '</td><td class="r">' + usd(x.g) + '</td>' + (hayAs ? '<td class="r">' + (x.as > 0.005 ? usd(x.as) : '—') + '</td>' : '') + '<td class="r"><b>' + usd(x.n) + '</b></td><td class="r">' + x.r.pct + '%</td><td class="r">' + (x.r.m2oc ? usd(x.r.esperado / x.r.m2oc) : '—') + '</td></tr>').join('') + '<tr class="tot"><td>Total</td><td class="r">' + usd(ti) + '</td><td class="r">' + usd(filas.reduce((a, x) => a + x.g, 0)) + '</td>' + (hayAs ? '<td class="r">' + usd(filas.reduce((a, x) => a + x.as, 0)) + '</td>' : '') + '<td class="r">' + usd(ti - tg) + '</td><td class="r">' + resumen().pct + '%</td><td></td></tr></tbody></table></div></div>' +
      (cRows.length ? '<div class="card" style="margin-bottom:12px"><h3>' + ico('building-community') + ' Condominio</h3><div class="scroll"><table><thead><tr><th>Propiedad</th><th class="r">Gastos comunes</th><th class="r">Fondo de reserva</th><th class="r">Facturado a inquilinos</th><th class="r">Cobrado</th><th class="r">Por cobrar</th><th class="r">Asume el dueño (vacíos)</th></tr></thead><tbody>' +
        cRows.map((x) => '<tr><td>' + esc(x.p.nombre) + '</td><td class="r">' + usd(x.gastos) + '</td><td class="r">' + (x.reserva > 0.005 ? usd(x.reserva) : '—') + '</td><td class="r">' + usd(x.fact) + '</td><td class="r">' + usd(x.cob) + '</td><td class="r">' + (x.pend > 0.005 ? '<b style="color:var(--bad)">' + usd(x.pend) + '</b>' : '—') + '</td><td class="r">' + (x.as > 0.005 ? usd(x.as) : '—') + '</td></tr>').join('') +
        '<tr class="tot"><td>Total</td><td class="r">' + usd(sumC('gastos')) + '</td><td class="r">' + usd(sumC('reserva')) + '</td><td class="r">' + usd(sumC('fact')) + '</td><td class="r">' + usd(sumC('cob')) + '</td><td class="r">' + usd(sumC('pend')) + '</td><td class="r">' + usd(sumC('as')) + '</td></tr></tbody></table></div><p class="hint">Por cobrar incluye cuotas que aún no vencen. El fondo de reserva queda guardado para reparaciones de áreas comunes.</p></div>' : '') +
      '<div class="g2"><div class="card"><h3>Canon cobrado por mes</h3>' + meses.map((m) => { const v = ingMes(m); return '<div class="hb"><span class="l">' + MESES[+m.slice(5) - 1].slice(0, 3) + ' ' + m.slice(2, 4) + '</span><span class="b"><i style="width:' + (v / mx * 100) + '%"></i></span><span class="v">' + usd(v) + '</span></div>'; }).join('') + '</div>' +
      '<div class="card"><h3>Deuda por antigüedad</h3><table><thead><tr><th>Atraso</th><th class="r">Canon</th><th class="r">Condominio</th><th class="r">Total</th></tr></thead><tbody>' + ['1 a 30 días', '31 a 60 días', '61 a 90 días', 'Más de 90 días'].map((t, k) => '<tr><td>' + t + '</td><td class="r">' + (aging[k][0] > 0.005 ? usd(aging[k][0]) : '—') + '</td><td class="r">' + (aging[k][1] > 0.005 ? usd(aging[k][1]) : '—') + '</td><td class="r"><b>' + (aging[k][0] + aging[k][1] > 0.005 ? usd(aging[k][0] + aging[k][1]) : '—') + '</b></td></tr>').join('') + '</tbody></table><p class="hint">Mientras más vieja la deuda, más difícil cobrarla.</p></div></div>';
  };

  /* ---------- condominio ---------- */
  let mesK = hoy().slice(0, 7);
  V.condominio = () => {
    if (!S.props.length) return '<h1>Condominio</h1><div class="card empty">Primero crea una propiedad en <a href="#inmuebles">Inmuebles</a>.</div>';
    const p = prop(S.propSel) || S.props[0]; S.propSel = p.id; const cf = p.condo || (p.condo = condoBase());
    const ms = Array.from({ length: 13 }, (_, i) => addMes(hoy().slice(0, 7), -i)); if (!ms.includes(mesK)) mesK = ms[0];
    let h = '<h1>Condominio</h1><p class="sub">Los gastos comunes (vigilancia, limpieza, agua, luz de áreas comunes…) se reparten entre los espacios y se cobran aparte del canon.</p><div class="props">' + S.props.map((x) => '<button class="' + (x.id === p.id ? 'on' : '') + '" onclick="AQ.condoProp(\'' + x.id + '\')">' + esc(x.nombre) + (x.condo && x.condo.activo ? '' : ' <span class="hint">(sin condominio)</span>') + '</button>').join('') + '</div>';
    h += '<div class="card" style="margin-bottom:12px"><div class="row"><h3 style="margin:0">Cómo se reparte</h3><span class="sp"></span><label class="row" style="margin:0;gap:6px;cursor:pointer"><input type="checkbox" id="k-act"' + (cf.activo ? ' checked' : '') + ' onchange="AQ.condoCfg()"> Cobrar condominio en esta propiedad</label></div>' +
      (cf.activo ? '<div class="form" style="margin-top:12px"><label class="f">Reparto' + sel('k-modo', [['alicuota', 'Por alícuota (%)'], ['iguales', 'Partes iguales']], cf.modo, ' onchange="AQ.condoCfg()"') + '</label><label class="f">Fondo de reserva (%)<input class="inp num" id="k-res" inputmode="decimal" value="' + nf4.format(cf.reserva || 0) + '" onchange="AQ.condoCfg()"></label><label class="f">Honorarios de administración (%)<input class="inp num" id="k-hon" inputmode="decimal" value="' + nf4.format(cf.honor || 0) + '" onchange="AQ.condoCfg()"></label></div><p class="hint">Los espacios vacíos no pagan: su parte la asume el dueño. El fondo y los honorarios se suman sobre los gastos del mes.</p>'
        : '<p class="hint">Actívalo si en esta propiedad cobras vigilancia, limpieza o servicios de áreas comunes aparte del canon.</p>') + '</div>';
    if (!cf.activo) return h;
    const R = repartoCondo(p.id, mesK); const em = S.condoEmit.find((x) => x.prop === p.id && x.periodo === mesK); const desact = em && Math.abs(em.total - R.total) > 0.005; const sig = addMes(mesK, 1);
    h += '<div class="card" style="margin-bottom:12px"><div class="row"><h3 style="margin:0">Gastos comunes</h3><span class="sp"></span><label class="f" style="grid-template-columns:auto auto;align-items:center">Mes ' + sel('k-mes', ms.map((m) => [m, nomMes(m)]), mesK, ' onchange="AQ.condoMes(this.value)" style="width:auto"') + '</label></div>' +
      '<div class="row"><button class="btn" id="b-cg" onclick="AQ.cgDlg()">' + ico('plus') + ' Anotar gasto común</button>' + (R.G.length ? '' : '<button class="btn sec" onclick="AQ.copiarCG()">Copiar los del mes anterior</button>') + '</div>' +
      '<div class="scroll"><table><thead><tr><th>Categoría</th><th>Detalle</th><th class="r">Monto</th><th></th></tr></thead><tbody>' +
      (R.G.length ? R.G.map((g) => '<tr><td>' + esc(g.cat) + '</td><td class="wrap">' + esc(g.nota || '') + '</td><td class="r">' + mon(g.monto, g.moneda) + '</td><td class="r"><button class="lnk" onclick="AQ.cgDlg(\'' + g.id + '\')">Editar</button></td></tr>').join('') +
        '<tr><td colspan="2">Gastos del mes</td><td class="r">' + usd(R.gastos) + '</td><td></td></tr>' + (R.reserva ? '<tr><td colspan="2">Fondo de reserva (' + nf4.format(cf.reserva) + '%)</td><td class="r">' + usd(R.reserva) + '</td><td></td></tr>' : '') + (R.honor ? '<tr><td colspan="2">Honorarios de administración (' + nf4.format(cf.honor) + '%)</td><td class="r">' + usd(R.honor) + '</td><td></td></tr>' : '') +
        '<tr class="tot"><td colspan="2">Total a repartir</td><td class="r">' + usd(R.total) + '</td><td></td></tr>' : '<tr><td colspan="4" class="empty">Sin gastos comunes en ' + nomMes(mesK) + '.</td></tr>') + '</tbody></table></div>' + (R.G.some((g) => g.moneda === 'VES') ? '<p class="hint">Los gastos en Bs se convierten a ' + bs(S.tasa) + ' por $.</p>' : '') + '</div>';
    const libres = R.filas.filter((f) => !f.c);
    h += '<div class="card" id="reparto"><div class="row"><h3 style="margin:0">Reparto de ' + nomMes(mesK) + '</h3><span class="sp"></span>' + (em ? (desact ? '<span class="tag warn">Los gastos cambiaron: actualiza las cuotas</span>' : '<span class="tag ok">Cuotas emitidas el ' + fdia(em.fecha) + '</span>') : '<span class="tag mut">Sin emitir</span>') + '</div>' +
      '<div class="mini"><div><b>' + usd(R.total) + '</b><span>Total a repartir</span></div><div><b>' + usd(R.cobrar) + '</b><span>Se cobra a inquilinos</span></div><div><b>' + usd(R.dueno) + '</b><span>Asume el dueño (' + libres.length + (libres.length === 1 ? ' vacío' : ' vacíos') + ')</span></div><div><b>' + (cf.modo === 'iguales' ? R.filas.length + ' partes' : nf.format(R.suma) + '%') + '</b><span>' + (cf.modo === 'iguales' ? 'Partes iguales' : 'Suma de alícuotas') + '</span></div></div>' +
      (cf.modo === 'alicuota' && Math.abs(R.suma - 100) > 0.01 ? '<p class="prb-line err" style="margin-top:0">Las alícuotas suman ' + nf4.format(R.suma) + '% y no 100%. La app reparte en proporción, pero revisa el documento de condominio.</p>' : '') +
      '<div class="scroll"><table><thead><tr><th>Espacio</th><th class="r">m²</th><th class="r">' + (cf.modo === 'iguales' ? 'Parte' : 'Alícuota %') + '</th><th>Quién paga</th><th class="r">Cuota</th><th>Cobro</th></tr></thead><tbody>' +
      R.filas.map((f) => { const g = f.c && S.cargos.find((x) => x.tipo === 'condo' && x.contrato === f.c.id && x.periodo === mesK); return '<tr><td>' + esc(f.u.nombre) + '</td><td class="r">' + (f.u.m2 ? nf0.format(f.u.m2) : '—') + '</td><td class="r">' + (cf.modo === 'iguales' ? nf.format(f.pct) + '%' : '<input class="inp num al" data-u="' + f.u.id + '" inputmode="decimal" style="width:96px;text-align:right" value="' + nf4.format(f.alic) + '"' + (f.auto ? ' title="Calculada por m²"' : '') + '>') + '</td><td class="wrap">' + (f.c ? esc((inq(f.c.inq) || {}).nombre) : '<span class="hint">Vacío · lo asume el dueño</span>') + '</td><td class="r">' + usd(f.cuota) + (f.c && f.c.moneda === 'VES' ? '<br><span class="hint">' + bs(f.cuota * S.tasa) + '</span>' : '') + '</td><td>' + (f.c ? (g ? ESTT[est(g)] : '<span class="tag mut">Sin emitir</span>') : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="row" style="margin-top:12px">' + (cf.modo === 'alicuota' ? '<button class="btn sec" onclick="AQ.guardaAlic()">Guardar alícuotas</button><button class="btn sec" onclick="AQ.alicM2()">Calcular por m²</button>' : '') + '<span class="sp"></span><button class="btn" id="b-emit" onclick="AQ.emitir()">' + ico('send') + ' ' + (em ? 'Actualizar cuotas' : 'Emitir cuotas del mes') + '</button></div>' +
      '<p class="hint">Las cuotas de ' + nomMes(mesK) + ' se cobran junto con el canon de ' + nomMes(sig) + ', el mismo día de pago de cada contrato. Quedan en el estado de cuenta aparte del canon. Si una cuota ya tiene pagos, no se cambia.</p></div>';
    return h;
  };

  /* ---------- tasas y configuración ---------- */
  V.tasas = () => (window.PRBTasa ? PRBTasa.vista(S) : '<h1>Calculadora de tasas</h1>');
  A.tasas = () => window.PRBTasa && PRBTasa.montar(() => S, save, go);
  V.config = () => '<h1>Configuración</h1><p class="sub">Datos generales, avisos y respaldo.</p><div class="g2e"><div class="card"><h3>General</h3><div class="form"><label class="f full">Nombre (tuyo o de la empresa)<input class="inp" id="cf-n" value="' + esc(S.nombre) + '"></label><label class="f">Avisar contratos que vencen en<input class="inp num" id="cf-av" inputmode="numeric" value="' + (S.aviso || 60) + '"></label><label class="f">Tasa (Bs por $)<input class="inp num" id="cf-t" inputmode="decimal" value="' + nf.format(S.tasa) + '"></label></div><div class="row" style="margin-top:12px"><button class="btn" onclick="AQ.guardaCfg()">Guardar</button></div><p class="hint">Los días de aviso sirven para marcar en el plano los contratos por vencer.</p></div>' +
    '<div class="card"><h3>Respaldo</h3><p class="hint" style="margin-top:0">Tus datos viven solo en este navegador y en este equipo. <b>Si abres la app en tu teléfono o en otra computadora, no vas a ver lo que registraste aquí.</b> Para pasarlos: descarga el respaldo aquí y, en el otro equipo, toca «Cargar respaldo».</p><div class="row"><button class="btn" onclick="AQ.respaldo()">' + ico('download') + ' Descargar respaldo</button><label class="btn sec">' + ico('upload') + ' Cargar respaldo<input type="file" accept=".json" hidden onchange="AQ.restaurar(this.files[0])"></label></div><h3 style="margin-top:18px">Empezar de nuevo</h3><div class="row"><button class="btn sec" onclick="AQ.reset(\'demo\')">Volver a los datos de ejemplo</button><button class="btn danger" onclick="AQ.reset(\'blanco\')">Empezar en blanco</button></div></div></div>';

  /* ---------- acciones ---------- */
  const AQ = window.AQ = {
    cerrar,
    verPlano(pId, uId) { S.propSel = pId; uSel = uId || null; save(); if (location.hash !== '#plano') location.hash = 'plano'; else rerender(); },
    selU(id) { uSel = id; const p = prop(S.propSel); $('ficha').innerHTML = ficha(p); document.querySelectorAll('#svg .u').forEach((g) => g.classList.toggle('sel', g.dataset.u === id)); if (id && innerWidth <= 1100) $('ficha').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    modo(e) { editar = e; rerender(); },
    nuevaU() {
      const p = prop(S.propSel); const us = S.unidades.filter((u) => u.prop === p.id); const w = Math.min(10, p.w), h = Math.min(8, p.h);
      let pos = null; for (let y = 0; y + h <= p.h && !pos; y += 1) for (let x = 0; x + w <= p.w && !pos; x += 1) if (!us.some((u) => x < u.x + u.w && x + w > u.x && y < u.y + u.h && y + h > u.y)) pos = { x, y };
      pos = pos || { x: 0, y: 0 };
      const n = us.filter((u) => u.tipo === 'Local').length + 1; const u = { id: uid(), prop: p.id, nombre: 'Local ' + n, tipo: 'Local', x: pos.x, y: pos.y, w, h, m2: w * h, ref: 0, notas: '' };
      S.unidades.push(u); uSel = u.id; save(); rerender(); toast('Espacio agregado: muévelo y ponle nombre');
    },
    guardaU(id) { const u = unidad(id); const p = prop(u.prop); u.nombre = $('u-n').value.trim() || u.nombre; u.tipo = $('u-t').value; const w = num($('u-w').value), h = num($('u-h').value); if (w > 0) u.w = Math.min(w, p.w - u.x); if (h > 0) u.h = Math.min(h, p.h - u.y); const m2 = num($('u-m2').value); u.m2 = u.tipo === 'Área común' ? 0 : m2 > 0 ? m2 : r2(u.w * u.h); u.ref = num($('u-ref').value) || 0; u.notas = $('u-no').value; save(); rerender(); toast('Guardado'); },
    borraU(id) { if (S.contratos.some((c) => c.unidad === id)) return toast('Tiene contratos: no se puede quitar', true); S.unidades = S.unidades.filter((u) => u.id !== id); uSel = null; save(); rerender(); toast('Quitado'); },
    propDlg(id) {
      const p = id ? prop(id) : { nombre: '', dir: '', tipo: 'Terreno con locales', w: 60, h: 40 };
      dlg(id ? 'Editar propiedad' : 'Nueva propiedad', '<div class="form"><label class="f full">Nombre<input class="inp" id="p-n" value="' + esc(p.nombre) + '" placeholder="Ej.: Terreno de la avenida"></label><label class="f full">Dirección<input class="inp" id="p-d" value="' + esc(p.dir || '') + '"></label><label class="f full">Tipo' + sel('p-t', ['Terreno con locales', 'Terreno', 'Edificio', 'Centro comercial', 'Galpón', 'Casa', 'Otro'], p.tipo) + '</label><label class="f">Ancho del terreno (m)<input class="inp num" id="p-w" inputmode="decimal" value="' + p.w + '"></label><label class="f">Largo del terreno (m)<input class="inp num" id="p-h" inputmode="decimal" value="' + p.h + '"></label></div><p class="hint">Las medidas son para dibujar el plano; pueden ser aproximadas.</p>',
        '<button class="btn sec" onclick="AQ.cerrar()">Cancelar</button>' + (id && !S.unidades.some((u) => u.prop === id) ? '<button class="btn danger" onclick="AQ.borraP(\'' + id + '\')">Borrar</button>' : '') + '<button class="btn" onclick="AQ.guardaP(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardaP(id) {
      const n = $('p-n').value.trim(); if (!n) return toast('Ponle un nombre', true); const w = num($('p-w').value), h = num($('p-h').value); if (!(w > 0 && h > 0)) return toast('Escribe las medidas del terreno', true);
      let p = id && prop(id); if (!p) { p = { id: uid(), condo: condoBase() }; S.props.push(p); S.propSel = p.id; }
      const us = S.unidades.filter((u) => u.prop === p.id); const minW = Math.max(0, ...us.map((u) => u.x + u.w)), minH = Math.max(0, ...us.map((u) => u.y + u.h));
      Object.assign(p, { nombre: n, dir: $('p-d').value.trim(), tipo: $('p-t').value, w: Math.max(w, minW), h: Math.max(h, minH) });
      save(); cerrar(); if (!id) { editar = true; location.hash = 'plano'; } rerender(); toast(id ? 'Guardado' : 'Propiedad creada: agrega sus espacios');
    },
    borraP(id) { S.props = S.props.filter((p) => p.id !== id); S.propSel = S.props[0] ? S.props[0].id : null; save(); cerrar(); rerender(); },
    inqDlg(id, alGuardar) {
      const i = id ? inq(id) : { nombre: '', doc: '', act: '', tel: '', email: '' };
      dlg(id ? 'Editar inquilino' : 'Nuevo inquilino', '<div class="form"><label class="f full">Nombre o razón social<input class="inp" id="i-n" value="' + esc(i.nombre) + '"></label><label class="f">RIF / C.I.<input class="inp" id="i-d" value="' + esc(i.doc || '') + '"></label><label class="f">Teléfono (WhatsApp)<input class="inp" id="i-t" inputmode="tel" value="' + esc(i.tel || '') + '"></label><label class="f full">Actividad<input class="inp" id="i-a" value="' + esc(i.act || '') + '" placeholder="Ej.: Ferretería"></label><label class="f full">Correo<input class="inp" id="i-e" type="email" value="' + esc(i.email || '') + '"></label></div>',
        '<button class="btn sec" onclick="AQ.cerrar()">Cancelar</button><button class="btn" onclick="AQ.guardaI(' + (id ? '\'' + id + '\'' : 'null') + ',' + (alGuardar ? '\'' + alGuardar + '\'' : 'null') + ')">Guardar</button>');
    },
    guardaI(id, alGuardar) {
      const n = $('i-n').value.trim(); if (!n) return toast('Escribe el nombre', true);
      let i = id && inq(id); if (!i) { i = { id: uid() }; S.inq.push(i); }
      Object.assign(i, { nombre: n, doc: $('i-d').value.trim(), tel: $('i-t').value.trim(), act: $('i-a').value.trim(), email: $('i-e').value.trim() }); save();
      if (alGuardar) { const [u, c] = alGuardar.split('|'); AQ.contratoDlg(c === 'x' ? null : c, u === 'x' ? null : u, i.id); return; }
      cerrar(); rerender(); toast('Guardado');
    },
    contratoDlg(id, uId, iId) {
      const c = id ? contrato(id) : null; const libres = rentables().filter((u) => !activoDe(u.id) || (c && u.id === c.unidad));
      if (!c && !libres.length) return toast('No hay espacios libres. Agrega uno en el plano o termina un contrato.', true);
      const u0 = c ? c.unidad : uId || libres[0].id; const ini = c ? c.inicio : hoy().slice(0, 7) + '-01'; const meses = c ? Math.max(1, mesesEntre(c.inicio, addDays(c.fin, 1))) : 12;
      const uu = unidad(u0);
      const body = (c && c.estado === 'terminado' ? '<p class="prb-line err" style="margin-top:0">Contrato terminado el ' + fdia(c.finReal || c.fin) + '.</p>' : '') + '<div class="form"><label class="f full">Espacio' + sel('k-u', libres.map((u) => [u.id, prop(u.prop).nombre + ' · ' + u.nombre]), u0, c ? ' disabled' : '') + '</label>' +
        '<label class="f full">Inquilino<div class="row" style="margin:0;flex-wrap:nowrap">' + sel('k-i', S.inq.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((i) => [i.id, i.nombre]), iId || (c && c.inq) || '', ' style="flex:1"') + (c ? '' : '<button class="btn sec sm" type="button" onclick="AQ.inqDlg(null,\'' + (uId || 'x') + '|x\')">Nuevo</button>') + '</div></label>' +
        '<label class="f">Desde<input class="inp" type="date" id="k-ini" value="' + ini + '"></label><label class="f">Duración (meses)<input class="inp num" id="k-m" inputmode="numeric" value="' + meses + '"></label>' +
        '<label class="f">Alquiler mensual<input class="inp num" id="k-c" inputmode="decimal" value="' + (c ? c.canon : uu && uu.ref ? uu.ref : '') + '"></label><label class="f">Moneda' + sel('k-mo', [['USD', 'Dólares ($)'], ['VES', 'Bolívares (Bs)']], c ? c.moneda : 'USD') + '</label>' +
        '<label class="f">Paga el día<input class="inp num" id="k-d" inputmode="numeric" value="' + (c ? c.dia : 5) + '"></label><label class="f">Depósito en garantía<input class="inp num" id="k-dep" inputmode="decimal" value="' + (c ? c.deposito : '') + '"></label>' +
        '<label class="f">Aumento (%)<input class="inp num" id="k-ap" inputmode="decimal" value="' + (c ? c.aumPct || '' : '') + '" placeholder="0"></label><label class="f">Cada (meses)<input class="inp num" id="k-ac" inputmode="numeric" value="' + (c ? c.aumCada || 12 : 12) + '"></label>' +
        '<label class="f full">Notas<textarea class="inp" id="k-no" rows="2" placeholder="Ej.: incluye 2 puestos de estacionamiento">' + esc(c ? c.notas || '' : '') + '</textarea></label></div><p class="hint">La app arma sola el cobro de cada mes con el aumento ya aplicado. Cambiar el monto aquí aplica a los meses que no se han pagado.</p>';
      const btns = '<button class="btn sec" onclick="AQ.cerrar()">Cerrar</button>' + (c && c.estado === 'activo' ? '<button class="btn danger" onclick="AQ.terminarC(\'' + c.id + '\')">Terminar contrato</button><button class="btn sec" onclick="AQ.renovar(\'' + c.id + '\')">Renovar</button>' : '') + (c && c.estado === 'terminado' ? '' : '<button class="btn" onclick="AQ.guardaC(' + (c ? '\'' + c.id + '\'' : '') + ')">' + (c ? 'Guardar' : 'Crear contrato') + '</button>');
      dlg(c ? 'Contrato · ' + esc(uu.nombre) : 'Nuevo contrato', body, btns);
    },
    guardaC(id) {
      const c0 = id ? contrato(id) : null; const uId = c0 ? c0.unidad : $('k-u').value; const iId = $('k-i').value; if (!iId) return toast('Elige o crea el inquilino', true);
      const ini = $('k-ini').value; const m = parseInt($('k-m').value, 10); const canon = num($('k-c').value); const dia = parseInt($('k-d').value, 10) || 5;
      if (!ini) return toast('Pon la fecha de inicio', true); if (!(m > 0)) return toast('Escribe cuántos meses dura', true); if (!(canon > 0)) return toast('Escribe el alquiler mensual', true);
      if (!c0 && activoDe(uId)) return toast('Ese espacio ya tiene un contrato activo', true);
      const c = c0 || { id: uid(), estado: 'activo' }; if (!c0) S.contratos.push(c);
      Object.assign(c, { unidad: uId, inq: iId, inicio: ini, fin: addDays(addMes(ini, m) + ini.slice(7), -1), canon, moneda: $('k-mo').value, dia: Math.min(28, Math.max(1, dia)), deposito: num($('k-dep').value) || 0, aumPct: num($('k-ap').value) || 0, aumCada: parseInt($('k-ac').value, 10) || 12, notas: $('k-no').value });
      // los meses sin pagos se recalculan; los que ya tienen pagos se respetan
      S.cargos = S.cargos.filter((g) => g.contrato !== c.id || g.pagos.length || tipoDe(g) !== 'canon');
      generarCargos(); save(); cerrar(); rerender(); toast(c0 ? 'Contrato guardado' : 'Contrato creado');
    },
    terminarC(id) { const c = contrato(id); dlg('Terminar contrato', '<p>El espacio <b>' + esc(unidad(c.unidad).nombre) + '</b> queda libre. Lo que se deba hasta esa fecha sigue en la cuenta del inquilino.</p><label class="f">Fecha de entrega<input class="inp" type="date" id="t-f" value="' + hoy() + '"></label>', '<button class="btn sec" onclick="AQ.contratoDlg(\'' + id + '\')">Volver</button><button class="btn danger" onclick="AQ.terminarOk(\'' + id + '\')">Terminar</button>'); },
    terminarOk(id) { const c = contrato(id); c.estado = 'terminado'; c.finReal = $('t-f').value || hoy(); S.cargos = S.cargos.filter((g) => !(g.contrato === id && g.periodo > c.finReal.slice(0, 7) && !g.pagos.length)); save(); cerrar(); rerender(); toast('Contrato terminado'); },
    renovar(id) { const c = contrato(id); const m = Math.max(1, mesesEntre(c.inicio, addDays(c.fin, 1))); const nuevoIni = addDays(c.fin, 1); const canon = canonEn(c, c.fin.slice(0, 7));
      dlg('Renovar contrato', '<p>Se crea un contrato nuevo desde el <b>' + fdia(nuevoIni) + '</b> con el mismo inquilino. Ajusta el monto si cambia.</p><div class="form"><label class="f">Duración (meses)<input class="inp num" id="rn-m" value="' + m + '"></label><label class="f">Nuevo alquiler (' + (c.moneda === 'VES' ? 'Bs' : '$') + ')<input class="inp num" id="rn-c" value="' + canon + '"></label></div>', '<button class="btn sec" onclick="AQ.contratoDlg(\'' + id + '\')">Volver</button><button class="btn" onclick="AQ.renovarOk(\'' + id + '\')">Renovar</button>'); },
    renovarOk(id) { const c = contrato(id); const m = parseInt($('rn-m').value, 10) || 12; const canon = num($('rn-c').value) || c.canon; const ini = addDays(c.fin, 1);
      c.estado = 'terminado'; c.finReal = c.fin; const n = Object.assign({}, c, { id: uid(), estado: 'activo', inicio: ini, fin: addDays(addMes(ini, m) + ini.slice(7), -1), canon, finReal: undefined, renovacion: c.id });
      S.cargos.filter((g) => g.contrato === c.id && g.periodo >= ini.slice(0, 7)).forEach((g) => { g.contrato = n.id; if (tipoDe(g) === 'canon' && !g.pagos.length) g.monto = canonEn(n, g.periodo); }); S.contratos.push(n); generarCargos(); save(); cerrar(); rerender(); toast('Contrato renovado'); },
    term(v) { verTerm = v; rerender(); },
    mes(v) { mesC = v; rerender(); },
    pago(cId, gId, ap) {
      const act = S.contratos.filter((c) => S.cargos.some((g) => g.contrato === c.id && saldo(g) > 0.005)).sort((a, b) => unidad(a.unidad).nombre.localeCompare(unidad(b.unidad).nombre, 'es', { numeric: true }));
      if (!act.length) return toast('No hay nada pendiente por cobrar', true);
      const c = (cId && act.find((x) => x.id === cId)) || (cId ? null : act[0]);
      if (!c) return toast('Está al día: no tiene nada pendiente', true);
      const g0 = gId ? S.cargos.find((g) => g.id === gId) : null;
      const todo = S.cargos.filter((g) => g.contrato === c.id && saldo(g) > 0.005); const conCondo = todo.some((g) => g.tipo === 'condo');
      if (!conCondo) ap = 'todo'; else if (!ap) ap = g0 ? tipoDe(g0) : 'todo';
      const pend = todo.filter((g) => ap === 'todo' || tipoDe(g) === ap); const debe = pend.reduce((a, g) => a + saldo(g), 0);
      const sug = g0 ? saldo(g0) : (pend.filter((g) => g.vence <= addDays(hoy(), 10)).reduce((a, g) => a + saldo(g), 0) || (pend[0] ? saldo(pend[0]) : 0));
      const sym = c.moneda === 'VES' ? 'Bs' : '$';
      const dT = (t) => todo.filter((g) => tipoDe(g) === t).reduce((a, g) => a + saldo(g), 0);
      dlg('Registrar pago', '<div class="form"><label class="f full">¿Quién pagó?' + sel('pg-c', act.map((x) => [x.id, unidad(x.unidad).nombre + ' · ' + (inq(x.inq) || {}).nombre]), c.id, ' onchange="AQ.pago(this.value)"') + '</label>' +
        (conCondo ? '<label class="f full">¿A qué va el pago?' + sel('pg-a', [['todo', 'Canon y condominio (primero lo más viejo)'], ['canon', 'Solo canon'], ['condo', 'Solo condominio']], ap, ' onchange="AQ.pago(\'' + c.id + '\',null,this.value)"') + '</label>' : '') + '</div>' +
        (conCondo ? '<p class="hint">Pendiente: canon <b>' + mon(dT('canon'), c.moneda) + '</b> · condominio <b>' + mon(dT('condo'), c.moneda) + '</b>.</p>' : '') +
        '<p class="hint">' + (ap === 'todo' ? 'Debe en total' : ap === 'canon' ? 'Debe de canon' : 'Debe de condominio') + ' <b>' + mon(debe, c.moneda) + '</b> (' + pend.map((g) => concepto(g, true) + ' ' + mon(saldo(g), c.moneda)).join(', ') + '). El pago se aplica primero a lo más viejo.</p>' +
        '<div class="form"><label class="f">Monto (' + sym + ')<input class="inp num" id="pg-m" inputmode="decimal" value="' + nf.format(sug) + '"></label><label class="f">Fecha<input class="inp" type="date" id="pg-f" value="' + hoy() + '"></label><label class="f">Forma de pago' + sel('pg-me', METODOS, 'Transferencia') + '</label><label class="f">Referencia<input class="inp" id="pg-r" placeholder="Opcional"></label>' +
        (c.moneda === 'USD' ? '<label class="f full">¿Te pagó en bolívares? Escribe los Bs y se convierte a la tasa<div class="row" style="margin:0;flex-wrap:nowrap"><input class="inp num" id="pg-bs" inputmode="decimal" placeholder="Bs" oninput="AQ.conv()"><span class="hint" style="white-space:nowrap">a ' + bs(S.tasa) + '</span></div></label>' : '') + '</div>',
        '<button class="btn sec" onclick="AQ.cerrar()">Cancelar</button><button class="btn" id="pg-ok" onclick="AQ.pagoOk(\'' + c.id + '\')">' + ico('check') + ' Registrar</button>');
    },
    conv() { const v = num($('pg-bs').value); if (v > 0) $('pg-m').value = nf.format(r2(v / S.tasa)); },
    pagoOk(cId) {
      const c = contrato(cId); let m = r2(num($('pg-m').value)); if (!(m > 0)) return toast('Escribe el monto', true);
      const f = $('pg-f').value || hoy(); const me = $('pg-me').value, ref = $('pg-r').value.trim(); const bsv = $('pg-bs') ? num($('pg-bs').value) : NaN; const ap = $('pg-a') ? $('pg-a').value : 'todo';
      const pend = S.cargos.filter((g) => g.contrato === c.id && saldo(g) > 0.005 && (ap === 'todo' || tipoDe(g) === ap)); const total = m; const grupo = uid(); let primero = null;
      for (const g of pend) { if (m <= 0.005) break; const x = Math.min(m, saldo(g)); const p = { id: uid(), fecha: f, monto: r2(x), metodo: me, ref, tasa: S.tasa, grupo }; if (bsv > 0) p.bs = r2(x * S.tasa); g.pagos.push(p); m = r2(m - x); if (!primero) primero = [g.id, p.id]; }
      if (m > 0.005) { const g = pend[pend.length - 1] || S.cargos.filter((x) => x.contrato === c.id && (ap === 'todo' || tipoDe(x) === ap)).pop(); if (g) { const p = { id: uid(), fecha: f, monto: m, metodo: me, ref, tasa: S.tasa, grupo, adelanto: true }; g.pagos.push(p); if (!primero) primero = [g.id, p.id]; } }
      if (!primero) return toast('No hay a qué aplicar el pago', true);
      save(); rerender(); AQ.recibo(primero[0], primero[1], total);
    },
    recibo(gId, pId, total) {
      const g = S.cargos.find((x) => x.id === gId); const p = g.pagos.find((x) => x.id === pId); const c = contrato(g.contrato); const i = inq(c.inq) || {}; const u = unidad(c.unidad);
      const parte = p.grupo ? S.cargos.flatMap((x) => x.pagos.filter((y) => y.grupo === p.grupo).map((y) => [x, y])) : [[g, p]];
      const tot = total || parte.reduce((a, x) => a + x[1].monto, 0); const dCa = deudaContrato(c, 'canon'), dCo = deudaContrato(c, 'condo');
      const sub = (t) => parte.filter(([x]) => tipoDe(x) === t).reduce((a, x) => a + x[1].monto, 0); const sCa = sub('canon'), sCo = sub('condo');
      const por = sCa > 0 && sCo > 0 ? 'el canon de arrendamiento y el condominio' : sCo > 0 ? 'la cuota de condominio' : 'el canon de arrendamiento';
      const nro = 'R-' + p.fecha.replace(/-/g, '').slice(2) + '-' + p.id.slice(-4).toUpperCase();
      const filas = (t, tit) => { const L = parte.filter(([x]) => tipoDe(x) === t); if (!L.length) return ''; return '<tr><td colspan="3" style="font-weight:600;background:#F2EFE7">' + tit + '</td></tr>' + L.map(([x, y]) => '<tr><td>' + nomMes(x.periodo) + (y.adelanto ? ' (adelanto)' : '') + '</td><td class="r">' + mon(y.monto, c.moneda) + '</td><td class="r">' + (saldo(x) > 0.005 ? mon(saldo(x), c.moneda) : 'Pagado') + '</td></tr>').join('') + (sCa > 0 && sCo > 0 ? '<tr><td class="hint">Subtotal ' + tit.toLowerCase() + '</td><td class="r"><b>' + mon(sub(t), c.moneda) + '</b></td><td></td></tr>' : ''); };
      dlg('Recibo de pago', '<div class="recibo" id="recibo"><div class="row" style="align-items:flex-start"><div><h2>' + esc(S.nombre) + '</h2><span class="hint">Recibo de ' + (sCo > 0 && !sCa ? 'condominio' : sCo > 0 ? 'alquiler y condominio' : 'alquiler') + '</span></div><span class="sp"></span><div style="text-align:right"><b>N.º ' + nro + '</b><br><span class="hint">' + fdia(p.fecha) + '</span></div></div>' +
        '<p>Recibimos de <b>' + esc(i.nombre) + '</b>' + (i.doc ? ' (' + esc(i.doc) + ')' : '') + ' la cantidad de <b>' + mon(tot, c.moneda) + '</b>' + (p.bs ? ' (pagado en bolívares a ' + bs(p.tasa) + ' por $)' : '') + ' por ' + por + ' de <b>' + esc(u.nombre) + '</b>, ' + esc(prop(u.prop).nombre) + '.</p>' +
        '<table><thead><tr><th>Concepto</th><th class="r">Abonado</th><th class="r">Queda</th></tr></thead><tbody>' + filas('canon', 'Canon de arrendamiento') + filas('condo', 'Condominio') + '</tbody></table>' +
        '<p class="hint">Forma de pago: ' + esc(p.metodo) + (p.ref ? ' · Ref. ' + esc(p.ref) : '') + '. ' + (dCa + dCo > 0.005 ? 'Saldo vencido pendiente: ' + [dCa > 0.005 ? 'canon ' + mon(dCa, c.moneda) : '', dCo > 0.005 ? 'condominio ' + mon(dCo, c.moneda) : ''].filter(Boolean).join(' · ') + '.' : 'Queda al día.') + '</p><p style="margin-top:36px;border-top:1px solid var(--tinta);width:220px;padding-top:6px;font-size:13px">Recibí conforme</p></div>',
        '<button class="btn sec" onclick="AQ.cerrar()">Cerrar</button>' + (i.tel ? '<button class="btn sec" onclick="AQ.reciboWa(\'' + gId + '\',\'' + pId + '\')">' + ico('brand-whatsapp') + ' Enviar por WhatsApp</button>' : '') + '<button class="btn" onclick="AQ.imprimir()">' + ico('printer') + ' Imprimir</button>');
    },
    imprimir() { document.body.classList.add('print-recibo'); print(); setTimeout(() => document.body.classList.remove('print-recibo'), 500); },
    reciboWa(gId, pId) { const el = $('recibo'); const g = S.cargos.find((x) => x.id === gId); const c = contrato(g.contrato); const i = inq(c.inq); const txt = el.innerText.replace(/\n{2,}/g, '\n').replace(/Recibí conforme/, '').trim(); window.open('https://wa.me/' + tel(i.tel) + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'); },
    recordar(cId) { const c = contrato(cId); const i = inq(c.inq); const dCa = deudaContrato(c, 'canon'), dCo = deudaContrato(c, 'condo'); const det = [dCa > 0.005 ? 'canon ' + mon(dCa, c.moneda) : '', dCo > 0.005 ? 'condominio ' + mon(dCo, c.moneda) : ''].filter(Boolean).join(' y '); const txt = 'Buen día, ' + i.nombre + '. Le escribimos de ' + S.nombre + ' por ' + unidad(c.unidad).nombre + ': hay un saldo pendiente de ' + mon(dCa + dCo, c.moneda) + (dCo > 0.005 ? ' (' + det + ')' : '') + '. Cuando pueda, nos confirma el pago. ¡Gracias!'; window.open('https://wa.me/' + tel(i.tel) + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'); },
    cuenta(cId) {
      const c = contrato(cId); const i = inq(c.inq) || {}; const L = S.cargos.filter((g) => g.contrato === c.id).slice().reverse(); const dCa = deudaContrato(c, 'canon'), dCo = deudaContrato(c, 'condo'); const hayC = tieneCondo(c);
      dlg('Estado de cuenta', '<p style="margin-top:0"><b>' + esc(i.nombre) + '</b> · ' + esc(unidad(c.unidad).nombre) + '<br><span class="hint">Contrato del ' + fdia(c.inicio) + ' al ' + fdia(c.fin) + ' · depósito ' + mon(c.deposito || 0, c.moneda) + '</span></p>' +
        (hayC ? '<div class="mini" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><b style="color:' + (dCa > 0.005 ? 'var(--bad)' : 'inherit') + '">' + mon(dCa, c.moneda) + '</b><span>Debe de canon</span></div><div><b style="color:' + (dCo > 0.005 ? 'var(--bad)' : 'inherit') + '">' + mon(dCo, c.moneda) + '</b><span>Debe de condominio</span></div><div><b>' + mon(dCa + dCo, c.moneda) + '</b><span>Total vencido</span></div></div>' : '') +
        '<div class="scroll"><table><thead><tr><th>Concepto</th><th class="r">Vence</th><th class="r">Monto</th><th class="r">Pagado</th><th>Estado</th><th></th></tr></thead><tbody>' +
        L.map((g) => '<tr><td>' + concepto(g) + '</td><td class="r">' + fdia(g.vence) + '</td><td class="r">' + mon(g.monto, g.moneda) + '</td><td class="r">' + mon(pagado(g), g.moneda) + '</td><td>' + ESTT[est(g)] + '</td><td class="r">' + g.pagos.map((p) => '<button class="lnk" onclick="AQ.recibo(\'' + g.id + '\',\'' + p.id + '\')">' + fdia(p.fecha).slice(0, 5) + '</button>').join(' ') + '</td></tr>').join('') + '</tbody></table></div>' + (hayC ? '' : '<p><b>Deuda vencida: ' + mon(dCa, c.moneda) + '</b></p>'));
    },
    condoProp(id) { S.propSel = id; save(); rerender(); },
    condoMes(v) { mesK = v; rerender(); },
    condoCfg() { const cf = prop(S.propSel).condo; cf.activo = $('k-act').checked; if ($('k-modo')) { cf.modo = $('k-modo').value; cf.reserva = Math.max(0, num($('k-res').value) || 0); cf.honor = Math.max(0, num($('k-hon').value) || 0); } save(); rerender(); },
    cgDlg(id) {
      const g = id ? S.condoGastos.find((x) => x.id === id) : { cat: 'Vigilancia', monto: '', moneda: 'USD', nota: '' };
      dlg((id ? 'Editar gasto común' : 'Anotar gasto común') + ' · ' + nomMes(id ? g.periodo : mesK), '<div class="form"><label class="f">Categoría' + sel('cg-c', CATC, g.cat) + '</label><label class="f">Monto<input class="inp num" id="cg-m" inputmode="decimal" value="' + (g.monto === '' ? '' : nf.format(g.monto)) + '"></label><label class="f">Moneda' + sel('cg-mo', [['USD', 'Dólares ($)'], ['VES', 'Bolívares (Bs)']], g.moneda) + '</label><label class="f full">Detalle<input class="inp" id="cg-n" value="' + esc(g.nota) + '" placeholder="Ej.: Vigilancia nocturna"></label></div><p class="hint">Se reparte entre los espacios de ' + esc(prop(S.propSel).nombre) + '.</p>',
        '<button class="btn sec" onclick="AQ.cerrar()">Cancelar</button>' + (id ? '<button class="btn danger" onclick="AQ.borraCG(\'' + id + '\')">Borrar</button>' : '') + '<button class="btn" id="cg-ok" onclick="AQ.guardaCG(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    guardaCG(id) { const m = num($('cg-m').value); if (!(m > 0)) return toast('Escribe el monto', true); let g = id && S.condoGastos.find((x) => x.id === id); if (!g) { g = { id: uid(), prop: S.propSel, periodo: mesK }; S.condoGastos.push(g); } Object.assign(g, { cat: $('cg-c').value, monto: r2(m), moneda: $('cg-mo').value, nota: $('cg-n').value.trim() }); save(); cerrar(); rerender(); toast('Gasto común guardado'); },
    borraCG(id) { S.condoGastos = S.condoGastos.filter((x) => x.id !== id); save(); cerrar(); rerender(); toast('Borrado'); },
    copiarCG() { const ant = addMes(mesK, -1); const L = S.condoGastos.filter((g) => g.prop === S.propSel && g.periodo === ant); if (!L.length) return toast('El mes anterior no tiene gastos comunes', true); L.forEach((g) => S.condoGastos.push(Object.assign({}, g, { id: uid(), periodo: mesK }))); save(); rerender(); toast(L.length + ' gastos copiados: ajusta los montos que cambiaron'); },
    guardaAlic() { let bad = 0; document.querySelectorAll('input.al').forEach((el) => { const v = num(el.value); const u = unidad(el.dataset.u); if (v >= 0) u.alic = r4(v); else bad++; }); save(); rerender(); toast(bad ? 'Revisa las alícuotas vacías' : 'Alícuotas guardadas', !!bad); },
    alicM2() { S.unidades.filter((u) => u.prop === S.propSel).forEach((u) => { delete u.alic; }); save(); rerender(); toast('Alícuotas calculadas por m²'); },
    emitir() { document.querySelectorAll('input.al').forEach((el) => { if (el.value !== el.defaultValue) { const v = num(el.value); if (v >= 0) unidad(el.dataset.u).alic = r4(v); } }); const R = repartoCondo(S.propSel, mesK); if (!(R.total > 0)) return toast('Anota primero los gastos comunes del mes', true); if (!R.filas.some((f) => f.c)) return toast('No hay espacios alquilados ese mes', true); const x = emitirCondo(S.propSel, mesK); save(); rerender(); toast(x.n + (x.n === 1 ? ' cuota emitida' : ' cuotas emitidas') + (x.fijos ? ' · ' + x.fijos + ' ya tenían pagos y no se cambiaron' : '')); },
    gastoDlg(id) {
      const g = id ? S.gastos.find((x) => x.id === id) : { prop: S.propSel || (S.props[0] || {}).id, unidad: '', fecha: hoy(), cat: 'Mantenimiento', monto: '', moneda: 'USD', nota: '' };
      if (!S.props.length) return toast('Primero crea una propiedad', true);
      dlg(id ? 'Editar gasto' : 'Anotar gasto', '<div class="form"><label class="f full">Propiedad' + sel('g-p', S.props.map((p) => [p.id, p.nombre]), g.prop, ' onchange="AQ.gUnid(this.value)"') + '</label><label class="f full">Espacio (opcional)<span id="g-uw">' + sel('g-u', [['', 'Toda la propiedad']].concat(S.unidades.filter((u) => u.prop === g.prop).map((u) => [u.id, u.nombre])), g.unidad) + '</span></label><label class="f">Fecha<input class="inp" type="date" id="g-f" value="' + g.fecha + '"></label><label class="f">Categoría' + sel('g-c', CATG, g.cat) + '</label><label class="f">Monto<input class="inp num" id="g-m" inputmode="decimal" value="' + (g.monto === '' ? '' : nf.format(g.monto)) + '"></label><label class="f">Moneda' + sel('g-mo', [['USD', 'Dólares ($)'], ['VES', 'Bolívares (Bs)']], g.moneda) + '</label><label class="f full">Detalle<input class="inp" id="g-n" value="' + esc(g.nota) + '" placeholder="Ej.: Pintura de la fachada"></label></div>',
        '<button class="btn sec" onclick="AQ.cerrar()">Cancelar</button>' + (id ? '<button class="btn danger" onclick="AQ.borraG(\'' + id + '\')">Borrar</button>' : '') + '<button class="btn" onclick="AQ.guardaG(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>');
    },
    gUnid(pId) { $('g-uw').innerHTML = sel('g-u', [['', 'Toda la propiedad']].concat(S.unidades.filter((u) => u.prop === pId).map((u) => [u.id, u.nombre])), ''); },
    guardaG(id) { const m = num($('g-m').value); if (!(m > 0)) return toast('Escribe el monto', true); let g = id && S.gastos.find((x) => x.id === id); if (!g) { g = { id: uid() }; S.gastos.push(g); } Object.assign(g, { prop: $('g-p').value, unidad: $('g-u').value, fecha: $('g-f').value || hoy(), cat: $('g-c').value, monto: r2(m), moneda: $('g-mo').value, nota: $('g-n').value.trim() }); save(); cerrar(); rerender(); toast('Gasto guardado'); },
    borraG(id) { S.gastos = S.gastos.filter((x) => x.id !== id); save(); cerrar(); rerender(); toast('Borrado'); },
    guardaCfg() { S.nombre = $('cf-n').value.trim() || S.nombre; S.aviso = Math.max(1, parseInt($('cf-av').value, 10) || 60); const t = num($('cf-t').value); if (t > 0 && r2(t) !== S.tasa) { if (window.PRBTasa) PRBTasa.manual(S); S.tasa = r2(t); } save(); rerender(); toast('Guardado'); },
    respaldo() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.download = 'alquileres-respaldo-' + hoy() + '.json'; a.click(); },
    restaurar(f) { if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if ((d.v !== 1 && d.v !== 2) || !Array.isArray(d.contratos) || !Array.isArray(d.props)) throw 0; S = migrar(d); generarCargos(); save(); go(); toast('Respaldo cargado'); } catch (e) { toast('Ese archivo no es un respaldo de esta app', true); } }; r.readAsText(f); },
    reset(modo) { dlg(modo === 'demo' ? 'Volver a los datos de ejemplo' : 'Empezar en blanco', '<p>' + (modo === 'demo' ? 'Se borra lo que registraste y se cargan los datos de ejemplo.' : 'Se borra todo para que cargues tus propiedades.') + ' Si quieres conservar algo, descarga antes el respaldo.</p>', '<button class="btn sec" onclick="AQ.cerrar()">Cancelar</button><button class="btn danger" onclick="AQ.resetOk(\'' + modo + '\')">Sí, continuar</button>'); },
    resetOk(modo) { const t = S.tasa, tm = S.tasaModo; S = modo === 'demo' ? seed() : blank(); S.tasa = t; S.tasaModo = tm; generarCargos(); save(); cerrar(); uSel = null; location.hash = 'inicio'; go(); toast('Listo'); }
  };
  const tel = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '58' + d.slice(1); return d; };

  load(); go(); if (window.PRBTasa) PRBTasa.auto(() => S, save, go);
})();
