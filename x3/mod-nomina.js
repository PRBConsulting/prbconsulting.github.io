/* X3 DATA · Módulo de nómina (Venezuela, LOTTT 2012)
   Calculadoras rápidas: liquidación, vacaciones, utilidades y prestaciones sociales (garantía trimestral,
   días adicionales, retroactivo y regla del mayor del art. 142). Nómina quincenal con aportes de ley y recibos.
   Todos los montos y porcentajes que cambian por decreto son parámetros editables.
   Resultado referencial: debe validarlo un contador o abogado laboral antes de pagar. */
(function () {
  'use strict';
  const H = window.X3H; if (!H || H.EN) return;
  const { esc, qty, num, uid, r2, hoy, addDays, diasEntre, fdia, toast, kpi } = H;
  const S = () => H.S; const N = () => S().nom;
  const on = () => S().mods && S().mods.nomina !== false;
  const nf = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bsf = (v) => 'Bs ' + nf.format(r2(v));
  const d2 = (v) => nf.format(Math.round(v * 100) / 100);

  /* =====================================================================
     MOTOR DE CÁLCULO (funciones puras, probadas en "Casos de prueba")
     ===================================================================== */
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dt = (s) => new Date(s.slice(0, 10) + 'T12:00');
  // suma meses respetando fin de mes (31-ene + 1 mes = 28/29-feb)
  function addM(s, k) { const d = dt(s); const dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + k); const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).getDate(); d.setDate(Math.min(dia, fin)); return iso(d); }
  // antigüedad en años, meses y días completos
  function antig(a, b) {
    let m = 0; while (addM(a, m + 1) <= b) m++;
    const dias = diasEntre(addM(a, m), b);
    return { anos: Math.floor(m / 12), meses: m % 12, dias, mesesTot: m };
  }
  const vacDias = (n) => (n < 1 ? 0 : 15 + Math.min(15, n - 1)); // art. 190
  const bonoDias = (n) => (n < 1 ? 15 : Math.min(30, 15 + n - 1)); // art. 192
  // salario integral diario = salario normal diario + alícuota de utilidades + alícuota de bono vacacional (art. 122)
  function integral(salMes, du, db) { const sd = salMes / 30; return { sd, au: sd * du / 360, ab: sd * db / 360, di: sd + sd * du / 360 + sd * db / 360 }; }
  function salarioEn(hist, f) { let s = hist[0] ? hist[0].salario : 0; hist.slice().sort((x, y) => x.desde.localeCompare(y.desde)).forEach((h) => { if (h.desde <= f) s = h.salario; }); return s; }
  const anoServicio = (ing, f) => Math.max(1, Math.ceil(antig(ing, f).mesesTot / 12) || 1);

  /* Prestaciones sociales, art. 142 LOTTT
     a) 15 días de salario integral por trimestre, con el salario del último mes del trimestre
     b) después del primer año, 2 días adicionales por año, acumulativos hasta 30, con el salario integral promedio del año
     c) al terminar: 30 días por año o fracción superior a 6 meses, con el último salario integral
     d) se paga el mayor entre a+b y c
     e) si termina antes de 3 meses: 5 días por mes trabajado o fracción
     Art. 143: intereses sobre la garantía (tasa anual editable, interés simple trimestral) */
  function prestaciones(o) {
    const { ingreso, egreso, hist, du } = o; const tasa = +o.tasa || 0; const ant = antig(ingreso, egreso);
    const intEn = (f) => { const n = anoServicio(ingreso, f); return integral(salarioEn(hist, f), du, bonoDias(n)); };
    const r = { ant, trim: [], adic: [], A: 0, B: 0, C: 0, cDias: 0, cAnos: 0, intereses: 0, anticipos: +o.anticipos || 0 };
    if (ant.mesesTot < 3) {
      const meses = ant.mesesTot + (ant.dias > 0 ? 1 : 0); const ii = intEn(egreso);
      r.e = { meses, dias: 5 * meses, base: ii.di, monto: 5 * meses * ii.di }; r.regla = 'e'; r.prest = r.e.monto; r.total = r2(r.prest - r.anticipos); return r;
    }
    let saldo = 0; const eventos = [];
    for (let k = 1; addM(ingreso, 3 * k) <= egreso; k++) eventos.push({ f: addM(ingreso, 3 * k), t: 'a' });
    for (let y = 2; addM(ingreso, 12 * y) <= egreso; y++) eventos.push({ f: addM(ingreso, 12 * y), t: 'b', y });
    eventos.sort((x, y) => x.f.localeCompare(y.f) || (x.t < y.t ? -1 : 1));
    let fAnt = ingreso;
    eventos.forEach((e) => {
      const it = saldo * tasa / 100 * diasEntre(fAnt, e.f) / 365; r.intereses += it; fAnt = e.f;
      if (e.t === 'a') { const ii = intEn(e.f); const m = 15 * ii.di; r.trim.push({ f: e.f, sal: salarioEn(hist, e.f), di: ii.di, dias: 15, monto: m, interes: it }); r.A += m; saldo += m; }
      else { const dias = Math.min(30, 2 * (e.y - 1)); let s = 0; for (let m = 12 * (e.y - 1) + 1; m <= 12 * e.y; m++) s += integral(salarioEn(hist, addM(ingreso, m)), du, bonoDias(e.y)).di; const base = s / 12; const m2 = dias * base; r.adic.push({ f: e.f, ano: e.y, dias, base, monto: m2 }); r.B += m2; saldo += m2; }
    });
    r.intereses += saldo * tasa / 100 * diasEntre(fAnt, egreso) / 365;
    r.cAnos = ant.anos + (ant.meses > 6 || (ant.meses === 6 && ant.dias > 0) ? 1 : 0); r.cDias = 30 * r.cAnos;
    const iu = intEn(egreso); r.cBase = iu.di; r.C = r.cDias * iu.di;
    r.regla = r.A + r.B >= r.C ? 'AB' : 'C'; r.prest = Math.max(r.A + r.B, r.C); r.total = r2(r.prest - r.anticipos); r.intereses = r2(r.intereses);
    return r;
  }
  // vacaciones y bono fraccionados al terminar (art. 196): meses completos desde el último aniversario
  function fraccionadas(ingreso, egreso) { const a = antig(ingreso, egreso); const n = a.anos + 1; return { meses: a.meses, vac: vacDias(n) * a.meses / 12, bono: bonoDias(n) * a.meses / 12, n }; }
  // utilidades fraccionadas (arts. 131 y 132): meses completos trabajados en el ejercicio
  function utilFrac(ingreso, egreso, inicioEj, du) { const desde = ingreso > inicioEj ? ingreso : inicioEj; const a = antig(desde, egreso); const meses = Math.min(12, a.mesesTot); return { meses, dias: du * meses / 12 }; }
  // feriados nacionales (art. 184 LOTTT y Ley de Fiestas Patrias) + los decretados que agregues
  function pascua(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1; return y + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0'); }
  function feriados(y, extra) {
    const p = pascua(y); const L = ['01-01', '04-19', '05-01', '06-24', '07-05', '07-24', '10-12', '12-24', '12-25', '12-31'].map((x) => y + '-' + x);
    [-48, -47, -3, -2].forEach((k) => L.push(addDays(p, k)));
    (extra || []).forEach((x) => { if (x.startsWith(String(y))) L.push(x); });
    return [...new Set(L)].sort();
  }
  // período de vacaciones: cuenta días hábiles saltando sábados, domingos y feriados
  function periodoVac(inicio, habiles, extra) {
    const fer = new Set([...feriados(+inicio.slice(0, 4), extra), ...feriados(+inicio.slice(0, 4) + 1, extra)]);
    let f = inicio, n = 0, desc = 0, ferN = 0, ultimo = inicio;
    while (n < habiles) { const w = dt(f).getDay(); if (w === 0 || w === 6) desc++; else if (fer.has(f)) ferN++; else { n++; ultimo = f; } f = addDays(f, 1); }
    let reintegro = addDays(ultimo, 1); while (dt(reintegro).getDay() === 0 || dt(reintegro).getDay() === 6 || fer.has(reintegro)) { if (dt(reintegro).getDay() === 0 || dt(reintegro).getDay() === 6) desc++; else ferN++; reintegro = addDays(reintegro, 1); }
    return { fin: ultimo, reintegro, descanso: desc, feriados: ferN };
  }
  const lunes = (desde, hasta) => { let n = 0; for (let f = desde; f <= hasta; f = addDays(f, 1)) if (dt(f).getDay() === 1) n++; return n; };
  // aportes del trabajador en un período (Seguro Social y Paro Forzoso por semanas = lunes; FAOV sobre lo devengado)
  function aportesTrab(salMes, devengado, nLunes, P) {
    const sm = +P.sm; const sem = (tope) => Math.min(salMes, tope * sm) * 12 / 52;
    return { ivss: sem(P.ivssTope) * P.ivssT / 100 * nLunes, rpe: sem(P.rpeTope) * P.rpeT / 100 * nLunes, faov: devengado * P.faovT / 100 };
  }
  function aportesPatr(salMes, devengado, noSal, nLunes, P) {
    const sm = +P.sm; const sem = (tope) => Math.min(salMes, tope * sm) * 12 / 52;
    return { ivss: sem(P.ivssTope) * P.ivssP / 100 * nLunes, rpe: sem(P.rpeTope) * P.rpeP / 100 * nLunes, faov: devengado * P.faovP / 100, inces: devengado * P.incesP / 100, pens: (devengado + noSal) * P.pensP / 100 };
  }
  const L = { addM, antig, vacDias, bonoDias, integral, salarioEn, prestaciones, fraccionadas, utilFrac, feriados, pascua, periodoVac, lunes, aportesTrab, aportesPatr };
  H.LOTTT = L;

  /* =====================================================================
     DATOS
     ===================================================================== */
  const PARAMS = { // valor, nombre, base legal
    sm: [130, 'Salario mínimo mensual (Bs)', 'Decreto de salario mínimo (vigente desde marzo de 2022)'],
    cesta: [40, 'Cestaticket mensual ($, se paga en Bs a la tasa BCV)', 'Ley del Cestaticket Socialista y decreto vigente; no es salario'],
    util: [30, 'Días de utilidades por año (30 a 120)', 'Arts. 131 y 132 LOTTT'],
    ivssT: [4, 'Seguro Social, trabajador %', 'Ley del Seguro Social'], ivssP: [9, 'Seguro Social, patrono % (9, 10 u 11 según riesgo)', 'Ley del Seguro Social'], ivssTope: [5, 'Tope Seguro Social (salarios mínimos)', 'Ley del Seguro Social'],
    rpeT: [0.5, 'Paro forzoso, trabajador %', 'Ley del Régimen Prestacional de Empleo'], rpeP: [2, 'Paro forzoso, patrono %', 'Ley del Régimen Prestacional de Empleo'], rpeTope: [10, 'Tope paro forzoso (salarios mínimos)', 'Ley del Régimen Prestacional de Empleo'],
    faovT: [1, 'Vivienda (FAOV), trabajador %', 'Ley del Régimen Prestacional de Vivienda y Hábitat'], faovP: [2, 'Vivienda (FAOV), patrono %', 'Ley del Régimen Prestacional de Vivienda y Hábitat'],
    incesP: [2, 'INCES, patrono % (nómina trimestral)', 'Ley del INCES'], incesT: [0.5, 'INCES, trabajador % sobre utilidades', 'Ley del INCES'],
    pensP: [9, 'Contribución especial de pensiones, patrono %', 'Ley de Protección de las Pensiones (2024): verifica base y exenciones'],
    tasaInt: [0, 'Tasa anual de intereses de prestaciones %', 'Art. 143 LOTTT: tasa que fije el BCV'],
    recNoct: [30, 'Recargo bono nocturno %', 'Art. 117 LOTTT'], recExtra: [50, 'Recargo horas extra %', 'Art. 118 LOTTT'], recFer: [50, 'Recargo por trabajar feriado o descanso %', 'Art. 120 LOTTT'],
    pagaDesc: [1, 'Pagar en vacaciones los sábados, domingos y feriados del período (1 sí, 0 no)', 'Criterio de la empresa o convención colectiva; revisa con tu asesor']
  };
  function ensure(st) {
    if (st.nom) { Object.keys(PARAMS).forEach((k) => { if (st.nom.p[k] == null) st.nom.p[k] = PARAMS[k][0]; }); return; }
    const p = {}; Object.keys(PARAMS).forEach((k) => (p[k] = PARAMS[k][0]));
    st.nom = { p, feriadosExtra: [], emp: [], pagos: [], fechaParams: hoy() };
    if (st.demo || /Demo/.test(st.empresa || '')) {
      const t = st.tasa || 52.4; const E = [['Trabajador Uno', 'V-10.000.001', 'Encargado de tienda', '2019-03-15', 160], ['Trabajadora Dos', 'V-20.000.002', 'Cajera', '2022-08-01', 110], ['Trabajador Tres', 'V-30.000.003', 'Despachador', '2024-02-12', 100], ['Trabajadora Cuatro', 'V-40.000.004', 'Producción', '2026-06-01', 95]];
      E.forEach((e) => st.nom.emp.push({ id: uid(), nombre: e[0], ced: e[1], cargo: e[2], ingreso: e[3], salario: r2(e[4] * t), hist: [{ desde: e[3], salario: r2(e[4] * t * 0.75) }, { desde: '2025-05-01', salario: r2(e[4] * t) }].filter((h, i, a) => i === 0 || h.desde > a[0].desde), anticipos: 0, vacPend: 0, activo: true }));
    }
  }
  const P = () => N().p;
  const emp = (id) => N().emp.find((e) => e.id === id);
  const histDe = (e) => (e.hist && e.hist.length ? e.hist : [{ desde: e.ingreso, salario: e.salario }]);

  /* =====================================================================
     VISTAS
     ===================================================================== */
  const { V, A } = H;
  const off = () => '<h1>Módulo apagado</h1><p class="sub">Actívalo en <button class="lnk" onclick="location.hash=\'modulos\'">Módulos</button>.</p>';
  const aviso = '<p class="hint" style="margin-top:10px">⚖️ Cálculo referencial según la LOTTT y los parámetros cargados. Antes de pagar, que lo revise tu contador o abogado laboral. Si hay convención colectiva o contrato con más beneficios, se aplica lo más favorable al trabajador.</p>';
  const usdRef = (v) => (S().tasa ? ' <span class="hint">≈ $' + d2(v / S().tasa) + '</span>' : '');

  V.nomina = () => {
    if (!on()) return off();
    const act = N().emp.filter((e) => e.activo); const masa = act.reduce((a, e) => a + e.salario, 0);
    return H.hub('Nómina', 'Cálculos de ley al momento y el pago de la quincena. ¿Qué necesitas?', [
      { k: 'nliq', ic: '🧮', t: 'Calcular una liquidación', d: 'Renuncia o despido: prestaciones, vacaciones, utilidades e indemnización.' },
      { k: 'nvac', ic: '🏖️', t: 'Calcular vacaciones', d: 'Cuántos días le tocan, cuándo regresa y cuánto se le paga.' },
      { k: 'nutil', ic: '🎁', t: 'Calcular utilidades', d: 'Completas o fraccionadas, con el descuento de INCES.' },
      { k: 'npres', ic: '💼', t: 'Prestaciones sociales', d: 'La garantía de cada trimestre, los días adicionales y los intereses.' },
      { k: 'nquin', ic: '🧾', t: 'Pagar la quincena', d: 'Sueldos, horas extra, bonos y descuentos de ley, con recibos.', bd: act.length ? act.length + ' trabajadores' : '' },
      { k: 'nemp', ic: '👥', t: 'Mis trabajadores', d: 'Ficha de cada trabajador: ingreso, cargo y sueldo.', bd: act.length ? bsf(masa) + ' al mes' : '' }
    ], '<details class="mas card"><summary>Ajustes de ley y pruebas</summary><div class="tiles" style="margin-top:10px">' +
      '<button class="tile" onclick="location.hash=\'nparam\'"><div class="ic">⚙️</div><div><b>Parámetros de ley</b><span>Salario mínimo, cestaticket, porcentajes y topes. Actualizados al ' + fdia(N().fechaParams) + '.</span></div></button>' +
      '<button class="tile" onclick="location.hash=\'nqa\'"><div class="ic">✅</div><div><b>Casos de prueba</b><span>Ejemplos resueltos a mano que el sistema debe dar exacto.</span></div></button></div></details>' + aviso);
  };

  // --- selector de trabajador o datos a mano (compartido por las calculadoras) ---
  let CF = { eid: '', ingreso: '', egreso: hoy(), salario: '', causa: 'renuncia', vacPend: 0, anticipos: 0, otros: 0, inicio: '', ej: hoy().slice(0, 4) + '-01-01', util: '' };
  function formBase(campos) {
    if (false) { const e0 = N().emp.find((e) => e.activo); if (e0) { CF.eid = e0.id; CF.ingreso = e0.ingreso; CF.salario = String(e0.salario); } }
    const E = N().emp.filter((e) => e.activo);
    const f = (k, l, tipo, extra) => '<label class="f">' + l + '<input class="inp' + (tipo === 'date' ? '' : ' num') + '"' + (tipo === 'date' ? ' type="date"' : ' inputmode="decimal"') + ' value="' + esc(CF[k]) + '" onchange="X.cf(\'' + k + '\',this.value)"' + (extra || '') + '></label>';
    const m = { ingreso: f('ingreso', 'Fecha de ingreso', 'date'), egreso: f('egreso', 'Fecha de salida', 'date'), salario: f('salario', 'Salario normal mensual (Bs)'), vacPend: f('vacPend', 'Días de vacaciones vencidas sin disfrutar'), anticipos: f('anticipos', 'Anticipos de prestaciones ya recibidos (Bs)'), otros: f('otros', 'Otros descuentos (préstamos, etc.) (Bs)'), inicio: f('inicio', 'Día que sale de vacaciones', 'date'), ej: f('ej', 'Inicio del ejercicio económico', 'date'), util: f('util', 'Días de utilidades que paga la empresa'),
      causa: '<label class="f full">¿Cómo termina la relación?<select class="inp" onchange="X.cf(\'causa\',this.value)">' + [['renuncia', 'Renuncia del trabajador'], ['injust', 'Despido sin causa justificada'], ['just', 'Despido con causa justificada (art. 79)'], ['retiro', 'Retiro justificado del trabajador (art. 80)'], ['mutuo', 'Mutuo acuerdo / fin de contrato']].map((x) => '<option value="' + x[0] + '"' + (x[0] === CF.causa ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></label>' };
    return '<div class="card"><div class="form"><label class="f full">Trabajador<select class="inp" onchange="X.cfEmp(this.value)"><option value="">Escribir los datos a mano</option>' + E.map((e) => '<option value="' + e.id + '"' + (e.id === CF.eid ? ' selected' : '') + '>' + esc(e.nombre) + ' · ' + esc(e.cargo) + '</option>').join('') + '</select></label>' + campos.map((c) => m[c]).join('') + '</div></div>';
  }
  const pre = () => { if (!CF.eid && !CF.ingreso) { const e0 = N().emp.find((e) => e.activo); if (e0) { CF.eid = e0.id; CF.ingreso = e0.ingreso; CF.salario = String(e0.salario); } } };
  const histCF = () => { const e = emp(CF.eid); return e ? histDe(e) : [{ desde: CF.ingreso, salario: num(CF.salario) }]; };
  const okCF = (need) => { if (need.includes('ingreso') && !CF.ingreso) return 'Falta la fecha de ingreso'; if (need.includes('salario') && !(num(CF.salario) > 0)) return 'Falta el salario'; if (need.includes('egreso') && CF.egreso < CF.ingreso) return 'La salida es antes del ingreso'; return ''; };
  const fila = (c, dias, base, monto, art, neg) => '<tr><td class="wrap">' + c + '<div class="hint">' + art + '</div></td><td class="r">' + (dias === '' ? '' : d2(dias)) + '</td><td class="r">' + (base === '' ? '' : d2(base)) + '</td><td class="r"' + (neg ? ' style="color:var(--bad)"' : '') + '>' + (neg ? '−' : '') + d2(monto) + '</td></tr>';
  const tabla = (filas, total, tl) => '<table><thead><tr><th>Concepto</th><th class="r">Días</th><th class="r">Base diaria</th><th class="r">Monto Bs</th></tr></thead><tbody>' + filas.join('') + '<tr class="tot"><td colspan="3">' + (tl || 'Total a pagar') + '</td><td class="r">' + bsf(total) + '</td></tr></tbody></table>';

  V.nliq = () => {
    if (!on()) return off();
    pre(); const err = okCF(['ingreso', 'salario', 'egreso']);
    let out = '';
    if (!err) {
      const du = num(CF.util) || +P().util; const sal = num(CF.salario); const pr = prestaciones({ ingreso: CF.ingreso, egreso: CF.egreso, hist: histCF(), du, tasa: +P().tasaInt, anticipos: num(CF.anticipos) || 0 });
      const fr = fraccionadas(CF.ingreso, CF.egreso); const uf = utilFrac(CF.ingreso, CF.egreso, CF.ej, du); const sd = sal / 30;
      const indem = ['injust', 'retiro'].includes(CF.causa) ? pr.prest : 0; const vp = num(CF.vacPend) || 0;
      const ince = uf.dias * sd * P().incesT / 100; const otros = num(CF.otros) || 0;
      const F = [fila('Prestaciones sociales (' + (pr.regla === 'e' ? 'menos de 3 meses' : pr.regla === 'AB' ? 'garantía depositada, mayor que el retroactivo' : 'retroactivo, mayor que la garantía') + ')', pr.regla === 'e' ? pr.e.dias : pr.regla === 'C' ? pr.cDias : '', pr.regla === 'C' ? pr.cBase : pr.regla === 'e' ? pr.e.base : '', pr.prest, 'Art. 142 LOTTT')];
      if (pr.intereses > 0) F.push(fila('Intereses sobre prestaciones', '', '', pr.intereses, 'Art. 143 LOTTT'));
      if (indem) F.push(fila('Indemnización por terminación (igual a las prestaciones)', '', '', indem, 'Art. 92 LOTTT'));
      if (vp) F.push(fila('Vacaciones vencidas no disfrutadas', vp, sd, vp * sd, 'Arts. 190 y 195 LOTTT'));
      F.push(fila('Vacaciones fraccionadas (' + fr.meses + ' meses del año ' + fr.n + ')', fr.vac, sd, fr.vac * sd, 'Art. 196 LOTTT'));
      F.push(fila('Bono vacacional fraccionado', fr.bono, sd, fr.bono * sd, 'Arts. 192 y 196 LOTTT'));
      F.push(fila('Utilidades fraccionadas (' + uf.meses + ' meses del ejercicio)', uf.dias, sd, uf.dias * sd, 'Arts. 131 y 132 LOTTT'));
      if (pr.anticipos) F.push(fila('Menos anticipos de prestaciones recibidos', '', '', pr.anticipos, 'Art. 144 LOTTT', true));
      F.push(fila('Menos INCES ' + P().incesT + '% sobre utilidades', '', '', ince, 'Ley del INCES', true));
      if (otros) F.push(fila('Menos otros descuentos', '', '', otros, 'Autorizados por el trabajador', true));
      const tot = pr.total + pr.intereses + indem + vp * sd + (fr.vac + fr.bono + uf.dias) * sd - ince - otros;
      const ai = integral(sal, du, bonoDias(anoServicio(CF.ingreso, CF.egreso)));
      out = '<div class="kpis">' + kpi(bsf(tot), 'Total a pagar' + usdRef(tot), 'var(--ok)') + kpi(pr.ant.anos + ' a ' + pr.ant.meses + ' m ' + pr.ant.dias + ' d', 'Tiempo de servicio') + kpi(bsf(ai.di), 'Salario integral diario') + kpi(fdia(addDays(CF.egreso, 5)), 'Plazo para pagar las prestaciones (art. 142 f)', 'var(--warn)') + '</div>' +
        '<div class="card scroll"><h3>Liquidación</h3>' + tabla(F, tot) + '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn sec" onclick="X.nImprimir(\'Liquidación\')">Imprimir</button></div>' + pasoPres(pr, sal, du) + aviso + '</div>';
    }
    return H.back('nomina', 'Nómina') + '<h1>Calcular una liquidación</h1><p class="sub">Elige al trabajador o escribe sus datos. El resultado aparece abajo al instante.</p>' + formBase(['causa', 'ingreso', 'egreso', 'salario', 'vacPend', 'anticipos', 'otros']) + (err ? '<div class="card"><div class="empty">' + err + '</div></div>' : '<div id="nout">' + out + '</div>');
  };
  function pasoPres(pr, sal, du) {
    if (pr.regla === 'e') return '<details class="mas"><summary>Ver el cálculo paso a paso</summary><p>Trabajó menos de 3 meses: 5 días por cada mes o fracción (' + pr.e.meses + ' × 5 = ' + pr.e.dias + ' días) × salario integral diario ' + d2(pr.e.base) + ' = <b>' + bsf(pr.e.monto) + '</b>.</p></details>';
    return '<details class="mas"><summary>Ver el cálculo paso a paso (art. 142)</summary>' +
      '<p><b>a) Garantía trimestral:</b> 15 días por cada trimestre con el salario integral del último mes del trimestre.</p><table><thead><tr><th>Trimestre al</th><th class="r">Salario mensual</th><th class="r">Integral diario</th><th class="r">Días</th><th class="r">Monto</th></tr></thead><tbody>' + pr.trim.map((t) => '<tr><td>' + fdia(t.f) + '</td><td class="r">' + d2(t.sal) + '</td><td class="r">' + d2(t.di) + '</td><td class="r">15</td><td class="r">' + d2(t.monto) + '</td></tr>').join('') + '<tr class="tot"><td colspan="4">Total a)</td><td class="r">' + d2(pr.A) + '</td></tr></tbody></table>' +
      '<p><b>b) Días adicionales:</b> después del primer año, 2 días por año acumulativos hasta 30, con el salario integral promedio del año.</p>' + (pr.adic.length ? '<table><tbody>' + pr.adic.map((a) => '<tr><td>Año ' + a.ano + ' (' + fdia(a.f) + ')</td><td class="r">' + a.dias + ' días</td><td class="r">' + d2(a.base) + '</td><td class="r">' + d2(a.monto) + '</td></tr>').join('') + '<tr class="tot"><td colspan="3">Total b)</td><td class="r">' + d2(pr.B) + '</td></tr></tbody></table>' : '<p class="hint">No aplica todavía.</p>') +
      '<p><b>c) Retroactivo:</b> 30 días × ' + pr.cAnos + ' años (la fracción mayor de 6 meses cuenta como año) = ' + pr.cDias + ' días × último salario integral diario ' + d2(pr.cBase) + ' = <b>' + d2(pr.C) + '</b>.</p>' +
      '<p><b>d) Se paga el mayor:</b> a+b = ' + d2(pr.A + pr.B) + ' frente a c = ' + d2(pr.C) + ' → <b>' + bsf(pr.prest) + '</b>.</p>' +
      '<p class="hint">Salario integral = salario normal diario + utilidades (' + du + ' días ÷ 360) + bono vacacional (días del año de servicio ÷ 360). Art. 122 LOTTT. Días adicionales a salario promedio del año, según la Sala de Casación Social del TSJ.</p></details>';
  }

  V.nvac = () => {
    if (!on()) return off();
    if (!CF.inicio) CF.inicio = addDays(hoy(), 7);
    pre(); const err = okCF(['ingreso', 'salario']); let out = '';
    if (!err) {
      const a = antig(CF.ingreso, CF.inicio);
      if (a.anos < 1) out = '<div class="card"><div class="empty">Todavía no cumple un año: las vacaciones completas se ganan al año de servicio (art. 190). Si sale de la empresa antes, se pagan fraccionadas en la liquidación.</div></div>';
      else {
        const n = a.anos; const hab = vacDias(n); const bono = bonoDias(n); const sd = num(CF.salario) / 30; const per = periodoVac(CF.inicio, hab, N().feriadosExtra);
        const extra = +P().pagaDesc ? per.descanso + per.feriados : 0;
        const F = [fila('Días hábiles de vacaciones (año ' + n + ')', hab, sd, hab * sd, 'Art. 190 LOTTT: 15 días + 1 por año, hasta 30')];
        if (extra) F.push(fila('Sábados, domingos y feriados dentro del período', extra, sd, extra * sd, 'Criterio configurable en parámetros'));
        F.push(fila('Bono vacacional', bono, sd, bono * sd, 'Art. 192 LOTTT: 15 días + 1 por año, hasta 30'));
        const tot = (hab + extra + bono) * sd;
        out = '<div class="kpis">' + kpi(hab + ' días hábiles', 'Le tocan por ' + n + ' año' + (n > 1 ? 's' : '') + ' cumplido' + (n > 1 ? 's' : '')) + kpi(fdia(per.fin), 'Último día de vacaciones') + kpi(fdia(per.reintegro), 'Regresa a trabajar', 'var(--ok)') + kpi(bsf(tot), 'Total a pagar antes de descuentos' + usdRef(tot), 'var(--ok)') + '</div>' +
          '<div class="card scroll"><h3>Pago de vacaciones</h3>' + tabla(F, tot, 'Total (los descuentos de ley se aplican en la nómina)') + '<p class="hint">En el período hay ' + per.descanso + ' días de descanso y ' + per.feriados + ' feriados. Las vacaciones se pagan al inicio del disfrute con el salario normal (art. 121).</p><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="X.nImprimir(\'Vacaciones\')">Imprimir</button></div>' + aviso + '</div>';
      }
    }
    return H.back('nomina', 'Nómina') + '<h1>Calcular vacaciones</h1><p class="sub">Dinos quién sale y cuándo. Calculamos los días, la fecha de regreso (saltando fines de semana y feriados) y el pago.</p>' + formBase(['ingreso', 'salario', 'inicio']) + (err ? '<div class="card"><div class="empty">' + err + '</div></div>' : '<div id="nout">' + out + '</div>');
  };

  V.nutil = () => {
    if (!on()) return off();
    const act = N().emp.filter((e) => e.activo); const du = num(CF.util) || +P().util; const fin = CF.ej.slice(0, 4) + '-12-31';
    const ej = CF.ej; const finEj = addDays(addM(ej, 12), -1);
    const filas = act.map((e) => { const uf = utilFrac(e.ingreso, addDays(finEj, 1), ej, du); const sd = e.salario / 30; const m = uf.dias * sd; return { e, uf, sd, m, ince: m * P().incesT / 100 }; });
    const tot = filas.reduce((a, f) => a + f.m, 0);
    return H.back('nomina', 'Nómina') + '<h1>Calcular utilidades</h1><p class="sub">Las utilidades se pagan entre 30 y 120 días de salario al año. Quien no trabajó el año completo cobra la parte de los meses completos trabajados.</p>' +
      '<div class="card"><div class="form"><label class="f">Inicio del ejercicio<input class="inp" type="date" value="' + esc(CF.ej) + '" onchange="X.cf(\'ej\',this.value)"></label><label class="f">Días de utilidades que paga la empresa<input class="inp num" value="' + du + '" onchange="X.cf(\'util\',this.value)"></label></div><p class="hint">Ejercicio del ' + fdia(ej) + ' al ' + fdia(finEj) + '. El mínimo de ley es 30 días y el máximo 120 (art. 131).</p></div>' +
      (du < 30 || du > 120 ? '<div class="card"><div class="empty" style="color:var(--bad)">Los días deben estar entre 30 y 120.</div></div>' :
        '<div class="kpis">' + kpi(bsf(tot), 'Total de utilidades' + usdRef(tot), 'var(--ok)') + kpi(bsf(tot * P().incesT / 100), 'Retención INCES (' + P().incesT + '%)', 'var(--warn)') + kpi(bsf(tot * (1 - P().incesT / 100)), 'Neto a pagar') + '</div>' +
        '<div class="card scroll"><table><thead><tr><th>Trabajador</th><th class="r">Meses</th><th class="r">Días</th><th class="r">Salario diario</th><th class="r">Utilidades</th><th class="r">INCES</th><th class="r">Neto</th></tr></thead><tbody>' + filas.map((f) => '<tr><td class="wrap"><b>' + esc(f.e.nombre) + '</b><div class="hint">Ingreso ' + fdia(f.e.ingreso) + '</div></td><td class="r">' + f.uf.meses + '</td><td class="r">' + d2(f.uf.dias) + '</td><td class="r">' + d2(f.sd) + '</td><td class="r">' + d2(f.m) + '</td><td class="r">' + d2(f.ince) + '</td><td class="r"><b>' + d2(f.m - f.ince) + '</b></td></tr>').join('') + '</tbody></table><p class="hint">Base: salario normal (art. 131). Si el salario varió en el año, usa el promedio del ejercicio. Se pagan dentro de los dos meses siguientes al cierre del ejercicio (art. 132).</p><div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="X.nImprimir(\'Utilidades\')">Imprimir</button></div>' + aviso + '</div>') + '<p class="hint">' + (fin ? '' : '') + '</p>';
  };

  V.npres = () => {
    if (!on()) return off();
    const act = N().emp.filter((e) => e.activo); const du = +P().util; const h = hoy();
    const filas = act.map((e) => ({ e, pr: prestaciones({ ingreso: e.ingreso, egreso: h, hist: histDe(e), du, tasa: +P().tasaInt, anticipos: e.anticipos || 0 }) }));
    const sel = filas.find((f) => f.e.id === CF.eid) || filas[0];
    return H.back('nomina', 'Nómina') + '<h1>Prestaciones sociales</h1><p class="sub">Lo que cada trabajador tiene acumulado hoy. La ley manda depositar 15 días por trimestre y, al salir, pagar lo que sea mayor entre lo depositado y el cálculo retroactivo.</p>' +
      '<div class="card scroll"><table><thead><tr><th>Trabajador</th><th class="r">Antigüedad</th><th class="r">Garantía (a+b)</th><th class="r">Retroactivo (c)</th><th class="r">Intereses</th><th class="r">Anticipos</th><th class="r">Si sale hoy</th><th></th></tr></thead><tbody>' +
      filas.map((f) => '<tr><td class="wrap"><b>' + esc(f.e.nombre) + '</b></td><td class="r">' + f.pr.ant.anos + 'a ' + f.pr.ant.meses + 'm</td><td class="r">' + d2(f.pr.regla === 'e' ? 0 : f.pr.A + f.pr.B) + '</td><td class="r">' + d2(f.pr.regla === 'e' ? f.pr.e.monto : f.pr.C) + '</td><td class="r">' + d2(f.pr.intereses) + '</td><td class="r">' + d2(f.pr.anticipos) + '</td><td class="r"><b>' + d2(f.pr.total + f.pr.intereses) + '</b></td><td><button class="btn sm sec" onclick="X.cfEmp(\'' + f.e.id + '\')">Detalle</button></td></tr>').join('') +
      '</tbody></table><p class="hint">Intereses con la tasa anual cargada en parámetros (' + P().tasaInt + '%). El trabajador puede pedir anticipos de hasta el 75% de lo depositado (art. 144).</p></div>' +
      (sel ? '<div class="card scroll"><h3>' + esc(sel.e.nombre) + '</h3>' + pasoPres(sel.pr, sel.e.salario, du) + '</div>' : '') + aviso;
  };

  // --- quincena ---
  let Q = null;
  function nuevaQ() { const h = hoy(); const d = +h.slice(8); const ym = h.slice(0, 7); const desde = d <= 15 ? ym + '-01' : ym + '-16'; const hasta = d <= 15 ? ym + '-15' : addDays(H.addDays(ym + '-01', 32).slice(0, 7) + '-01', -1); Q = { desde, hasta, l: {} }; N().emp.filter((e) => e.activo).forEach((e) => (Q.l[e.id] = { faltas: 0, he: 0, noct: 0, fer: 0, otros: 0, prest: 0 })); }
  function calcLinea(e, x) {
    const p = P(); const sd = e.salario / 30; const hora = sd / 8; const nL = lunes(Q.desde, Q.hasta); const segunda = Q.desde.slice(8) === '16';
    const base = e.salario / 2 - (+x.faltas || 0) * sd; const he = (+x.he || 0) * hora * (1 + p.recExtra / 100); const noct = (+x.noct || 0) * hora * p.recNoct / 100; const fer = (+x.fer || 0) * sd * (1 + p.recFer / 100); const otros = +x.otros || 0;
    const dev = base + he + noct + fer + otros; const cesta = segunda ? p.cesta * (S().tasa || 0) : 0;
    const t = aportesTrab(e.salario, dev, nL, p); const pa = aportesPatr(e.salario, dev, cesta, nL, p); const prest = +x.prest || 0;
    const ded = t.ivss + t.rpe + t.faov + prest;
    return { sd, base, he, noct, fer, otros, dev, cesta, t, pa, prest, ded, neto: dev + cesta - ded, nL };
  }
  V.nquin = () => {
    if (!on()) return off();
    if (!Q) nuevaQ(); const act = N().emp.filter((e) => e.activo && e.ingreso <= Q.hasta);
    const R = act.map((e) => ({ e, x: Q.l[e.id] || (Q.l[e.id] = { faltas: 0, he: 0, noct: 0, fer: 0, otros: 0, prest: 0 }), c: null })); R.forEach((r) => (r.c = calcLinea(r.e, r.x)));
    const T = (f) => R.reduce((a, r) => a + f(r.c), 0); const inp = (eid, k, v) => '<input class="inp num" style="width:64px" inputmode="decimal" value="' + (v || '') + '" placeholder="0" onchange="X.qx(\'' + eid + '\',\'' + k + '\',this.value)">';
    return H.back('nomina', 'Nómina') + '<h1>Pagar la quincena</h1><p class="sub">Solo anota lo que cambió esta quincena: faltas, horas extra, feriados trabajados o descuentos. Lo demás se calcula solo.</p>' +
      '<div class="card"><div class="form"><label class="f">Desde<input class="inp" type="date" value="' + Q.desde + '" onchange="X.qp(\'desde\',this.value)"></label><label class="f">Hasta<input class="inp" type="date" value="' + Q.hasta + '" onchange="X.qp(\'hasta\',this.value)"></label></div><p class="hint">' + lunes(Q.desde, Q.hasta) + ' lunes en el período (para el Seguro Social y el paro forzoso). ' + (Q.desde.slice(8) === '16' ? 'En la segunda quincena se paga el cestaticket del mes.' : '') + '</p></div>' +
      '<div class="kpis">' + kpi(bsf(T((c) => c.neto)), 'Neto a pagar' + usdRef(T((c) => c.neto)), 'var(--ok)') + kpi(bsf(T((c) => c.ded)), 'Descuentos a trabajadores') + kpi(bsf(T((c) => c.pa.ivss + c.pa.rpe + c.pa.faov + c.pa.inces + c.pa.pens)), 'Aportes del patrono', 'var(--warn)') + kpi(bsf(T((c) => c.neto + c.ded + c.pa.ivss + c.pa.rpe + c.pa.faov + c.pa.inces + c.pa.pens)), 'Costo total de la quincena') + '</div>' +
      '<div class="card scroll"><h3>1. Lo que cambió esta quincena</h3><table><thead><tr><th>Trabajador</th><th class="r">Faltas (días)</th><th class="r">Horas extra</th><th class="r">Horas nocturnas</th><th class="r">Feriados trabajados</th><th class="r">Otros pagos Bs</th><th class="r">Descuento préstamo Bs</th></tr></thead><tbody>' +
      R.map((r) => '<tr><td class="wrap"><b>' + esc(r.e.nombre) + '</b><div class="hint">' + esc(r.e.cargo) + ' · ' + bsf(r.e.salario) + '/mes</div></td><td class="r">' + inp(r.e.id, 'faltas', r.x.faltas) + '</td><td class="r">' + inp(r.e.id, 'he', r.x.he) + '</td><td class="r">' + inp(r.e.id, 'noct', r.x.noct) + '</td><td class="r">' + inp(r.e.id, 'fer', r.x.fer) + '</td><td class="r">' + inp(r.e.id, 'otros', r.x.otros) + '</td><td class="r">' + inp(r.e.id, 'prest', r.x.prest) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="card scroll"><h3>2. Revisa y paga</h3><table><thead><tr><th>Trabajador</th><th class="r">Sueldo</th><th class="r">Extras</th><th class="r">Cestaticket</th><th class="r">Seguro Social</th><th class="r">Paro forzoso</th><th class="r">FAOV</th><th class="r">Préstamo</th><th class="r">Neto</th></tr></thead><tbody>' +
      R.map((r) => '<tr><td class="wrap">' + esc(r.e.nombre) + '</td><td class="r">' + d2(r.c.base) + '</td><td class="r">' + d2(r.c.he + r.c.noct + r.c.fer + r.c.otros) + '</td><td class="r">' + d2(r.c.cesta) + '</td><td class="r">' + d2(r.c.t.ivss) + '</td><td class="r">' + d2(r.c.t.rpe) + '</td><td class="r">' + d2(r.c.t.faov) + '</td><td class="r">' + d2(r.c.prest) + '</td><td class="r"><b>' + d2(r.c.neto) + '</b></td></tr>').join('') +
      '<tr class="tot"><td>Totales</td><td class="r">' + d2(T((c) => c.base)) + '</td><td class="r">' + d2(T((c) => c.he + c.noct + c.fer + c.otros)) + '</td><td class="r">' + d2(T((c) => c.cesta)) + '</td><td class="r">' + d2(T((c) => c.t.ivss)) + '</td><td class="r">' + d2(T((c) => c.t.rpe)) + '</td><td class="r">' + d2(T((c) => c.t.faov)) + '</td><td class="r">' + d2(T((c) => c.prest)) + '</td><td class="r">' + d2(T((c) => c.neto)) + '</td></tr></tbody></table>' +
      '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn sec" onclick="X.qRecibos()">Imprimir recibos</button><button class="btn sec" onclick="X.qCsv()">Descargar CSV</button><button class="btn" onclick="X.qGuardar()">Guardar quincena</button></div>' +
      '<details class="mas"><summary>Aportes del patrono por trabajador</summary><table><thead><tr><th>Trabajador</th><th class="r">Seguro Social ' + P().ivssP + '%</th><th class="r">Paro forzoso ' + P().rpeP + '%</th><th class="r">FAOV ' + P().faovP + '%</th><th class="r">INCES ' + P().incesP + '%</th><th class="r">Pensiones ' + P().pensP + '%</th></tr></thead><tbody>' + R.map((r) => '<tr><td>' + esc(r.e.nombre) + '</td><td class="r">' + d2(r.c.pa.ivss) + '</td><td class="r">' + d2(r.c.pa.rpe) + '</td><td class="r">' + d2(r.c.pa.faov) + '</td><td class="r">' + d2(r.c.pa.inces) + '</td><td class="r">' + d2(r.c.pa.pens) + '</td></tr>').join('') + '</tbody></table><p class="hint">Seguro Social y paro forzoso se calculan por semanas (lunes del período) con tope de ' + P().ivssTope + ' y ' + P().rpeTope + ' salarios mínimos. FAOV sobre lo devengado. El INCES patronal se declara por trimestre.</p></details></div>' +
      (N().pagos.length ? '<div class="card scroll"><h3>Quincenas guardadas</h3><table><thead><tr><th>Período</th><th class="r">Trabajadores</th><th class="r">Neto pagado</th></tr></thead><tbody>' + N().pagos.slice().reverse().map((p) => '<tr><td>' + fdia(p.desde) + ' al ' + fdia(p.hasta) + '</td><td class="r">' + p.lineas.length + '</td><td class="r">' + bsf(p.lineas.reduce((a, l) => a + l.neto, 0)) + '</td></tr>').join('') + '</tbody></table></div>' : '');
  };

  V.nemp = () => {
    if (!on()) return off();
    return H.back('nomina', 'Nómina') + '<h1>Mis trabajadores</h1><p class="sub">La ficha de cada trabajador. Si le subes el sueldo, anota desde qué fecha: así las prestaciones se calculan con el sueldo de cada trimestre.</p><div class="row"><span class="sp"></span><button class="btn" onclick="X.nEmp()">+ Nuevo trabajador</button></div>' +
      '<div class="card scroll">' + (N().emp.length ? '<table><thead><tr><th>Nombre</th><th>Cédula</th><th>Cargo</th><th>Ingreso</th><th class="r">Antigüedad</th><th class="r">Sueldo mensual</th><th></th></tr></thead><tbody>' + N().emp.map((e) => { const a = antig(e.ingreso, hoy()); return '<tr' + (e.activo ? '' : ' class="off"') + '><td class="wrap"><b>' + esc(e.nombre) + '</b></td><td>' + esc(e.ced) + '</td><td class="wrap">' + esc(e.cargo) + '</td><td>' + fdia(e.ingreso) + '</td><td class="r">' + a.anos + 'a ' + a.meses + 'm</td><td class="r">' + bsf(e.salario) + '</td><td><button class="btn sm sec" onclick="X.nEmp(\'' + e.id + '\')">Editar</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">Aún no hay trabajadores</div>') + '</div><p class="hint">Datos ficticios de ejemplo. Los datos de tus trabajadores se guardan solo en este navegador.</p>';
  };

  V.nparam = () => {
    if (!on()) return off();
    return H.back('nomina', 'Nómina') + '<h1>Parámetros de ley</h1><p class="sub">Montos y porcentajes que cambian por decreto o gaceta. Cuando salga uno nuevo, cámbialo aquí y todo se recalcula.</p>' +
      '<div class="card scroll"><table><thead><tr><th>Parámetro</th><th class="r">Valor</th><th>Base legal</th></tr></thead><tbody>' + Object.keys(PARAMS).map((k) => '<tr><td class="wrap">' + PARAMS[k][1] + '</td><td class="r"><input class="inp num" style="width:90px" value="' + P()[k] + '" onchange="X.np(\'' + k + '\',this.value)"></td><td class="wrap hint">' + PARAMS[k][2] + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="card"><h3>Feriados decretados adicionales</h3><p class="hint" style="margin-top:0">Los feriados nacionales fijos, carnaval y Semana Santa ya están incluidos. Agrega aquí los que decrete el Ejecutivo (uno por línea, AAAA-MM-DD).</p><textarea class="inp" rows="4" style="width:100%" onchange="X.nfer(this.value)">' + esc(N().feriadosExtra.join('\n')) + '</textarea><p class="hint">Feriados ' + hoy().slice(0, 4) + ': ' + feriados(+hoy().slice(0, 4), N().feriadosExtra).map(fdia).join(', ') + '</p></div>' +
      '<p class="hint">Última actualización: ' + fdia(N().fechaParams) + '. El salario mínimo legal sigue en Bs 130 desde 2022; el "ingreso mínimo integral" se paga con bonos sin incidencia salarial, por eso no entra en prestaciones ni utilidades. Verifica cada valor en la Gaceta Oficial vigente.</p>';
  };

  // --- casos de prueba (resueltos a mano) ---
  function casos() {
    const t = (n, art, esperado, obtenido, nota) => ({ n, art, esperado, obtenido, ok: typeof esperado === 'number' ? Math.abs(esperado - obtenido) < 0.006 : esperado === obtenido, nota });
    const h300 = (ing) => [{ desde: ing, salario: 300 }];
    const pr3 = prestaciones({ ingreso: '2023-01-01', egreso: '2026-01-01', hist: h300('2023-01-01'), du: 30, tasa: 0 });
    const pr2m = prestaciones({ ingreso: '2026-01-10', egreso: '2026-03-20', hist: h300('2026-01-10'), du: 30, tasa: 0 });
    const prC = prestaciones({ ingreso: '2020-01-01', egreso: '2026-01-01', hist: [{ desde: '2020-01-01', salario: 100 }, { desde: '2025-07-01', salario: 1000 }], du: 30, tasa: 0 });
    const pv = periodoVac('2026-11-02', 15, []);
    const ap = aportesTrab(4000, 2000, 2, { sm: 130, ivssTope: 5, ivssT: 4, rpeTope: 10, rpeT: 0.5, faovT: 1 });
    const fr = fraccionadas('2022-03-01', '2026-10-15');
    return [
      t('Salario integral diario: sueldo 300, 30 días de utilidades, 15 de bono → 10 + 0,8333 + 0,4167', 'Art. 122', 11.25, integral(300, 30, 15).di),
      t('Vacaciones al primer año: 15 días hábiles', 'Art. 190', 15, vacDias(1)), t('Bono vacacional al primer año: 15 días', 'Art. 192', 15, bonoDias(1)),
      t('Vacaciones con 3 años cumplidos: 15 + 2 = 17 días', 'Art. 190', 17, vacDias(3)), t('Vacaciones con 20 años: tope de 30 días', 'Art. 190', 30, vacDias(20)), t('Bono vacacional con 20 años: tope de 30 días', 'Art. 192', 30, bonoDias(20)),
      t('Utilidades fraccionadas: 30 días × 7/12 meses × 10 diario = 175', 'Arts. 131-132', 175, 30 * 7 / 12 * 10),
      t('Retroactivo con 4 años y 7 meses: la fracción > 6 meses cuenta como año → 150 días', 'Art. 142 c', 150, prestaciones({ ingreso: '2021-01-01', egreso: '2025-08-01', hist: h300('2021-01-01'), du: 30 }).cDias),
      t('Menos de 3 meses (2 meses y 10 días = 3 meses o fracción): 15 días × 11,25 = 168,75', 'Art. 142 e', 168.75, pr2m.prest),
      t('Garantía de 3 años exactos, sueldo 300 fijo: 12 trimestres (675 + 676,67 + 678,33 = 2.030,00)', 'Art. 142 a', 2030, r2(pr3.A)),
      t('Días adicionales: año 2 = 2 días × 11,2778; año 3 = 4 días × 11,3056 → 67,78', 'Art. 142 b', 67.78, r2(pr3.B)),
      t('Retroactivo del mismo caso: 90 días × 11,3056 = 1.017,50', 'Art. 142 c', 1017.5, r2(pr3.C)),
      t('Regla del mayor: a+b = 2.097,78 > c = 1.017,50 → se paga 2.097,78', 'Art. 142 d', 2097.78, r2(pr3.prest)),
      t('Despido injustificado: la indemnización es igual a las prestaciones → 2.097,78', 'Art. 92', 2097.78, r2(pr3.prest)),
      t('Aumento fuerte al final (100 → 1.000 en jul-2025): gana el retroactivo', 'Art. 142 d', 'C', prC.regla),
      t('Vacaciones fraccionadas al salir con 4 años y 7 meses: 19 días × 7/12 = 11,0833', 'Art. 196', 11.0833, Math.round(fr.vac * 10000) / 10000),
      t('Seguro Social: sueldo 4.000, tope 5 × 130 = 650; semanal 150 × 4% × 2 lunes = 12,00', 'Ley del Seguro Social', 12, r2(ap.ivss)),
      t('Paro forzoso: sueldo 4.000, tope 10 × 130 = 1.300; semanal 300 × 0,5% × 2 lunes = 3,00', 'Ley del RPE', 3, r2(ap.rpe)),
      t('Feriado trabajado: salario diario 10 con 50% de recargo = 15', 'Art. 120', 15, 10 * (1 + 50 / 100)),
      t('Hora extra: salario diario 80 (hora 10) con 50% de recargo, 2 horas = 30', 'Art. 118', 30, 2 * (80 / 8) * 1.5),
      t('Vacaciones de 15 días hábiles desde el lunes 02/11/2026: regresa el lunes 23/11/2026', 'Art. 190', '2026-11-23', pv.reintegro),
      t('Pascua 2026: 5 de abril (Jueves Santo 02/04, Viernes Santo 03/04)', 'Art. 184', '2026-04-05', pascua(2026)),
      t('Carnaval 2026 incluido en feriados (lunes 16/02)', 'Art. 184', true, feriados(2026).includes('2026-02-16')),
      t('Monto en letras de 1.360,00', 'Requisito de la factura', 'SON: UN MIL TRESCIENTOS SESENTA BOLÍVARES CON 00/100', H.letras ? H.letras(1360) : ''),
      t('Monto en letras de 21,50', 'Requisito de la factura', 'SON: VEINTIUN BOLÍVARES CON 50/100', H.letras ? H.letras(21.5) : '')
    ];
  }
  H.nominaCasos = casos;
  V.nqa = () => {
    if (!on()) return off();
    const C = casos(); const ok = C.filter((c) => c.ok).length;
    return H.back('nomina', 'Nómina') + '<h1>Casos de prueba</h1><p class="sub">Ejemplos resueltos a mano, uno por regla de la ley. Cada vez que se cambia el sistema, se corren todos: si alguno falla, el cálculo no sale a producción.</p>' +
      '<div class="kpis">' + kpi(ok + ' de ' + C.length, 'Casos correctos', ok === C.length ? 'var(--ok)' : 'var(--bad)') + '</div>' +
      '<div class="card scroll"><table><thead><tr><th></th><th>Caso</th><th>Base legal</th><th class="r">Esperado</th><th class="r">Sistema</th></tr></thead><tbody>' + C.map((c) => '<tr><td>' + (c.ok ? '✅' : '❌') + '</td><td class="wrap">' + c.n + '</td><td class="wrap hint">' + c.art + '</td><td class="r">' + esc(typeof c.esperado === 'number' ? d2(c.esperado) : String(c.esperado)) + '</td><td class="r"' + (c.ok ? '' : ' style="color:var(--bad);font-weight:700"') + '>' + esc(typeof c.obtenido === 'number' ? d2(c.obtenido) : String(c.obtenido)) + '</td></tr>').join('') + '</tbody></table></div>' + aviso;
  };

  /* =====================================================================
     ACCIONES
     ===================================================================== */
  const recibo = (e, c) => '<div class="pg"><div style="display:flex;justify-content:space-between"><div><b>' + esc(S().empresa) + '</b><br><small>RIF ' + esc(S().rif) + '</small></div><div style="text-align:right"><b>RECIBO DE PAGO</b><br>' + fdia(Q.desde) + ' al ' + fdia(Q.hasta) + '</div></div><p>Trabajador: <b>' + esc(e.nombre) + '</b> · C.I. ' + esc(e.ced) + ' · ' + esc(e.cargo) + '<br>Ingreso: ' + fdia(e.ingreso) + ' · Salario mensual: ' + bsf(e.salario) + '</p>' +
    '<table><thead><tr><th>Concepto</th><th class="r">Asignaciones</th><th class="r">Deducciones</th></tr></thead><tbody><tr><td>Salario de la quincena</td><td class="r">' + d2(c.base) + '</td><td></td></tr>' + (c.he ? '<tr><td>Horas extra</td><td class="r">' + d2(c.he) + '</td><td></td></tr>' : '') + (c.noct ? '<tr><td>Bono nocturno</td><td class="r">' + d2(c.noct) + '</td><td></td></tr>' : '') + (c.fer ? '<tr><td>Feriados trabajados</td><td class="r">' + d2(c.fer) + '</td><td></td></tr>' : '') + (c.otros ? '<tr><td>Otras asignaciones</td><td class="r">' + d2(c.otros) + '</td><td></td></tr>' : '') + (c.cesta ? '<tr><td>Cestaticket (no salarial)</td><td class="r">' + d2(c.cesta) + '</td><td></td></tr>' : '') +
    '<tr><td>Seguro Social (' + c.nL + ' semanas)</td><td></td><td class="r">' + d2(c.t.ivss) + '</td></tr><tr><td>Régimen Prestacional de Empleo</td><td></td><td class="r">' + d2(c.t.rpe) + '</td></tr><tr><td>FAOV</td><td></td><td class="r">' + d2(c.t.faov) + '</td></tr>' + (c.prest ? '<tr><td>Préstamo</td><td></td><td class="r">' + d2(c.prest) + '</td></tr>' : '') +
    '<tr class="tot"><td>Neto a pagar</td><td colspan="2" class="r">' + bsf(c.neto) + '</td></tr></tbody></table><div class="firma"><div>Por la empresa</div><div>Recibí conforme (firma y huella)</div></div></div>';
  function abrir(html, t) { const w = window.open('', '_blank', 'width=820,height=900'); if (!w) return toast('Permite ventanas emergentes para imprimir', true); w.document.write('<title>' + t + '</title><link rel="stylesheet" href="' + new URL('../assets/prb.css', location.href) + '"><style>body{background:#fff;padding:24px;font-family:Inter,system-ui,sans-serif}.pg{page-break-after:always;margin-bottom:28px}.pg:last-child{page-break-after:auto}table{width:100%}.firma{display:flex;gap:30px;margin-top:40px}.firma div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:12px;text-align:center}details{display:block}details>*{display:block}</style><body>' + html + '<script>document.querySelectorAll("details").forEach(d=>d.open=true);setTimeout(()=>print(),400)<\/script>'); w.document.close(); }

  Object.assign(window.X, {
    cf(k, v) { CF[k] = v; H.go(true); },
    cfEmp(id) { CF.eid = id; const e = emp(id); if (e) { CF.ingreso = e.ingreso; CF.salario = String(e.salario); CF.vacPend = e.vacPend || 0; CF.anticipos = e.anticipos || 0; } H.go(true); },
    nImprimir(t) { const el = H.$('nout'); if (!el) return; const e = emp(CF.eid); abrir('<h2>' + t + '</h2><p>' + esc(S().empresa) + ' · RIF ' + esc(S().rif) + '<br>' + (e ? 'Trabajador: <b>' + esc(e.nombre) + '</b> · C.I. ' + esc(e.ced) + ' · ' + esc(e.cargo) + '<br>' : '') + 'Ingreso: ' + fdia(CF.ingreso) + (t === 'Liquidación' ? ' · Salida: ' + fdia(CF.egreso) : '') + '</p>' + el.innerHTML + '<div class="firma"><div>Por la empresa</div><div>Recibí conforme (firma y huella)</div></div>', t); },
    np(k, v) { const n = num(v); if (!(n >= 0)) return toast('Valor inválido', true); if (k === 'util' && (n < 30 || n > 120)) return toast('Las utilidades van de 30 a 120 días', true); P()[k] = n; N().fechaParams = hoy(); H.save(); toast('Parámetro actualizado'); },
    nfer(v) { N().feriadosExtra = v.split(/\s+/).map((x) => x.trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)); H.save(); H.go(true); },
    qx(eid, k, v) { Q.l[eid][k] = Math.max(0, num(v) || 0); H.go(true); },
    qp(k, v) { Q[k] = v; if (Q.hasta < Q.desde) return toast('Revisa las fechas', true); H.go(true); },
    qRecibos() { const act = N().emp.filter((e) => e.activo && e.ingreso <= Q.hasta); abrir(act.map((e) => recibo(e, calcLinea(e, Q.l[e.id]))).join(''), 'Recibos de pago'); },
    qCsv() { const rows = [['Cedula', 'Trabajador', 'Sueldo quincena', 'Extras', 'Cestaticket', 'Seguro Social', 'RPE', 'FAOV', 'Prestamo', 'Neto', 'IVSS patrono', 'RPE patrono', 'FAOV patrono', 'INCES patrono', 'Pensiones']]; N().emp.filter((e) => e.activo && e.ingreso <= Q.hasta).forEach((e) => { const c = calcLinea(e, Q.l[e.id]); rows.push([e.ced, e.nombre, r2(c.base), r2(c.he + c.noct + c.fer + c.otros), r2(c.cesta), r2(c.t.ivss), r2(c.t.rpe), r2(c.t.faov), r2(c.prest), r2(c.neto), r2(c.pa.ivss), r2(c.pa.rpe), r2(c.pa.faov), r2(c.pa.inces), r2(c.pa.pens)]); }); H.bajar('nomina-' + Q.desde + '.csv', H.csv(rows), 'text/csv'); },
    qGuardar() { if (N().pagos.some((p) => p.desde === Q.desde && p.hasta === Q.hasta)) return toast('Esa quincena ya está guardada', true); const lineas = N().emp.filter((e) => e.activo && e.ingreso <= Q.hasta).map((e) => { const c = calcLinea(e, Q.l[e.id]); return { eid: e.id, neto: r2(c.neto), dev: r2(c.dev), ded: r2(c.ded) }; }); N().pagos.push({ id: uid(), desde: Q.desde, hasta: Q.hasta, fecha: hoy(), lineas }); H.save(); H.go(true); toast('Quincena guardada'); },
    nEmp(id) {
      const e = id ? emp(id) : { nombre: '', ced: '', cargo: '', ingreso: hoy(), salario: '', activo: true, anticipos: 0, vacPend: 0, hist: [] };
      H.dlg(id ? 'Editar trabajador' : 'Nuevo trabajador', '<div class="form"><label class="f full">Nombre y apellido<input class="inp" id="en" value="' + esc(e.nombre) + '"></label><label class="f">Cédula<input class="inp" id="ec" value="' + esc(e.ced) + '"></label><label class="f">Cargo<input class="inp" id="eg" value="' + esc(e.cargo) + '"></label><label class="f">Fecha de ingreso<input class="inp" type="date" id="ei" value="' + e.ingreso + '"></label><label class="f">Sueldo mensual (Bs)<input class="inp num" id="es" inputmode="decimal" value="' + e.salario + '"></label>' +
        (id ? '<label class="f">El sueldo nuevo rige desde<input class="inp" type="date" id="ed" value="' + hoy() + '"></label>' : '') + '<label class="f">Anticipos de prestaciones recibidos (Bs)<input class="inp num" id="ea" value="' + (e.anticipos || 0) + '"></label><label class="f">Días de vacaciones vencidas pendientes<input class="inp num" id="ev" value="' + (e.vacPend || 0) + '"></label>' + (id ? '<label class="f">Estado<select class="inp" id="et"><option value="1"' + (e.activo ? ' selected' : '') + '>Activo</option><option value="0"' + (e.activo ? '' : ' selected') + '>Retirado</option></select></label>' : '') + '</div>' +
        (id && histDe(e).length ? '<h3 style="margin-top:12px">Historial de sueldos</h3><table><tbody>' + histDe(e).map((h) => '<tr><td>Desde ' + fdia(h.desde) + '</td><td class="r">' + bsf(h.salario) + '</td></tr>').join('') + '</tbody></table>' : ''),
        '<button class="btn sec" onclick="X.cerrar()">Cancelar</button><button class="btn" onclick="X.okEmp(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button>', 600);
    },
    okEmp(id) {
      const d = { nombre: H.$('en').value.trim(), ced: H.$('ec').value.trim(), cargo: H.$('eg').value.trim() || 'Sin cargo', ingreso: H.$('ei').value, salario: r2(num(H.$('es').value)), anticipos: r2(num(H.$('ea').value) || 0), vacPend: r2(num(H.$('ev').value) || 0) };
      if (!d.nombre) return toast('Falta el nombre', true); if (!d.ingreso) return toast('Falta la fecha de ingreso', true); if (!(d.salario > 0)) return toast('Revisa el sueldo', true);
      if (id) { const e = emp(id); const desde = H.$('ed').value || hoy(); e.hist = histDe(e).slice(); if (d.salario !== e.salario) { e.hist = e.hist.filter((h) => h.desde !== desde); e.hist.push({ desde: desde < d.ingreso ? d.ingreso : desde, salario: d.salario }); } Object.assign(e, d, { activo: H.$('et').value === '1' }); }
      else N().emp.push(Object.assign({ id: uid(), activo: true, hist: [{ desde: d.ingreso, salario: d.salario }] }, d));
      H.save(); H.cerrar(); Q = null; H.go(true); toast('Trabajador guardado');
    }
  });

  H.mods.push({ id: 'nomina', ensure });
  H.navMod('nomina', 'Nómina', 'nomina'); H.sub('nomina', ['nliq', 'nvac', 'nutil', 'npres', 'nquin', 'nemp', 'nparam', 'nqa']);
})();
