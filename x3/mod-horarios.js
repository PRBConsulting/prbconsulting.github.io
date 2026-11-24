/* X3 DATA · Horarios y turnos (Venezuela, LOTTT 2012)
   Turnos por sede, plan semanal por trabajador, separación automática de horas diurnas y nocturnas,
   tipo de jornada, horas extra, descanso semanal, domingos y cobertura por hora de cada sede.
   Las horas de la quincena (nocturnas, extra y domingos) pasan a "Pagar la quincena" con un botón.
   Reglas usadas (arts. 117, 168, 173 y 178 LOTTT):
   - Diurna 05:00-19:00, nocturna 19:00-05:00.
   - Diurna máx. 8 h/día y 40 h/semana; mixta 7,5 y 37,5; nocturna 7 y 35. Mixta con más de 4 h nocturnas = nocturna.
   - No más de 5 horas seguidas sin reposo; el reposo es de al menos 1 hora.
   - Dos días de descanso continuos por semana.
   - Horas extra: máx. 10 por semana.
   Resultado referencial: debe validarlo un contador o abogado laboral. */
(function () {
  'use strict';
  const H = window.X3H; if (!H || H.EN) return;
  const { esc, uid, hoy, addDays, toast } = H;
  const S = () => H.S; const R = () => S().hor; const E = () => (S().nom ? S().nom.emp.filter((e) => e.activo) : []);
  const on = () => S().mods && S().mods.nomina !== false;
  const DS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const LIM = { D: [8, 40, 'Diurna'], M: [7.5, 37.5, 'Mixta'], N: [7, 35, 'Nocturna'] };
  const nf = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
  const min = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim()); return m ? +m[1] * 60 + +m[2] : NaN; };
  const hhmm = (m) => String(Math.floor((m % 1440) / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const lunesDe = (iso) => { const d = new Date(iso + 'T12:00'); const k = (d.getDay() + 6) % 7; return addDays(iso, -k); };
  const idxDia = (iso) => (new Date(iso + 'T12:00').getDay() + 6) % 7; // 0 = lunes

  /* ---------- motor (funciones puras) ---------- */
  // minutos trabajados de un turno, separando diurnos y nocturnos; el reposo va en pIni o, si no, a mitad del turno
  function horasTurno(t) {
    const a = min(t.ini); let b = min(t.fin); if (!isFinite(a) || !isFinite(b)) return null; if (b <= a) b += 1440;
    const pausa = Math.max(0, +t.pausa || 0); let p0 = isFinite(min(t.pIni)) ? min(t.pIni) : Math.round((a + b - pausa) / 2); if (p0 < a) p0 += 1440;
    let d = 0, n = 0, seg = 0, maxSeg = 0;
    for (let m = a; m < b; m++) {
      if (pausa && m >= p0 && m < p0 + pausa) { seg = 0; continue; }
      const h = m % 1440; if (h >= 300 && h < 1140) d++; else n++; seg++; if (seg > maxSeg) maxSeg = seg;
    }
    const noct = n / 60, diur = d / 60; const tipo = n === 0 ? 'D' : (d === 0 || noct > 4) ? 'N' : 'M';
    return { diur, noct, tot: diur + noct, tipo, seguidas: maxSeg / 60, pausa, presencia: (b - a) / 60 };
  }
  const turno = (cod) => R().turnos.find((t) => t.cod === cod);
  // semana de un trabajador: códigos lun..dom → totales, jornada, extras y alertas
  function semana(cods) {
    const dias = cods.map((c) => { const t = c && c !== 'L' ? turno(c) : null; return t ? Object.assign({ cod: c }, horasTurno(t)) : null; });
    const w = dias.filter(Boolean); const r = { dias, diur: 0, noct: 0, tot: 0, bono: 0, xDia: 0, al: [], dom: dias[6] ? 1 : 0, libres: 7 - w.length };
    w.forEach((x) => { r.diur += x.diur; r.noct += x.noct; r.tot += x.tot; r.bono += x.tipo === 'N' ? x.tot : x.noct; r.xDia += Math.max(0, x.tot - LIM[x.tipo][0]); });
    r.tipo = w.some((x) => x.tipo === 'N') ? 'N' : w.some((x) => x.tipo === 'M') ? 'M' : 'D';
    r.tope = LIM[r.tipo][1]; r.xSem = Math.max(0, r.tot - r.tope); r.extra = Math.max(r.xDia, r.xSem);
    // alertas
    dias.forEach((x, i) => { if (!x) return; if (x.tot > LIM[x.tipo][0] + 1e-9) r.al.push(DS[i] + ': ' + nf(x.tot) + ' h en jornada ' + LIM[x.tipo][2].toLowerCase() + ' (máx. ' + nf(LIM[x.tipo][0]) + ')'); if (x.seguidas > 5 + 1e-9) r.al.push(DS[i] + ': ' + nf(x.seguidas) + ' h seguidas sin reposo (máx. 5)'); else if (x.pausa > 0 && x.pausa < 60) r.al.push(DS[i] + ': reposo de ' + x.pausa + ' min (mín. 1 hora)'); });
    if (r.xSem > 1e-9) r.al.push(nf(r.tot) + ' h en la semana, pasa el tope de ' + nf(r.tope) + ' h (jornada ' + LIM[r.tipo][2].toLowerCase() + ')');
    if (r.libres < 2) r.al.push('Solo ' + r.libres + ' día' + (r.libres === 1 ? '' : 's') + ' de descanso (deben ser 2)');
    else { const L = dias.map((x) => !x); const seguidos = L.some((v, i) => v && L[(i + 1) % 7]); if (!seguidos) r.al.push('Los 2 días de descanso no son seguidos'); }
    if (r.extra > 10 + 1e-9) r.al.push(nf(r.extra) + ' horas extra en la semana (máx. 10)');
    return r;
  }
  // personas presentes por franja de 30 min en una sede (sin descontar el reposo)
  function cobertura(sedeId, plan) {
    const sd = R().sedes.find((s) => s.id === sedeId); const out = [];
    for (let i = 0; i < 7; i++) {
      const fr = []; const ab = sd.abre[i]; const a = ab ? min(ab[0]) : NaN; let b = ab ? min(ab[1]) : NaN; if (b <= a) b += 1440;
      for (let m = 300; m < 1440 + 120; m += 30) {
        let n = 0; E().forEach((e) => { if ((R().asig[e.id] || '') !== sedeId) return; const c = (plan[e.id] || [])[i]; const t = c && c !== 'L' ? turno(c) : null; if (!t) return; const x = min(t.ini); let y = min(t.fin); if (y <= x) y += 1440; if (m >= x && m < y) n++; });
        fr.push({ m, n, abierto: isFinite(a) && m >= a && m < b });
      }
      out.push(fr);
    }
    return out;
  }

  /* ---------- datos ---------- */
  const T0 = [['A', 'Apertura', '08:00', '16:00', 60, ''], ['T', 'Tarde', '14:00', '22:00', 60, ''], ['C', 'Cierre', '14:30', '22:30', 60, ''], ['N', 'Noche corta', '17:00', '22:00', 0, ''], ['I', 'Intermedio', '11:00', '19:00', 60, '']];
  function ensure(st) {
    if (!st.nom) return;
    if (st.hor) { st.hor.sem = st.hor.sem || {}; return; }
    const s1 = uid(), s2 = uid(); const todos = (a, b) => [0, 1, 2, 3, 4, 5, 6].map(() => [a, b]);
    st.hor = { sedes: [{ id: s1, nombre: 'Sede Centro', abre: todos('08:00', '22:00'), min: 1 }, { id: s2, nombre: 'Sede Norte', abre: [['14:00', '22:30'], ['14:00', '22:30'], ['08:00', '22:30'], ['08:00', '22:30'], ['08:00', '22:30'], ['08:00', '22:30'], ['08:00', '22:30']], min: 1 }],
      turnos: T0.map((t) => ({ id: uid(), cod: t[0], nombre: t[1], ini: t[2], fin: t[3], pausa: t[4], pIni: t[5] })), asig: {}, base: {}, sem: {}, vw: 'base' };
    if (!(st.demo || /Demo/.test(st.empresa || ''))) return;
    const t = st.tasa || 52.4;
    [['Trabajadora Cinco', 'Encargada', 150], ['Trabajador Seis', 'Vendedor', 105], ['Trabajadora Siete', 'Vendedora', 105], ['Trabajador Ocho', 'Vendedor', 100]].forEach((x, i) => { const sal = Math.round(x[2] * t * 100) / 100; st.nom.emp.push({ id: uid(), nombre: x[0], ced: 'V-' + (5 + i) + '0.000.00' + (5 + i), cargo: x[1], ingreso: '2025-0' + (3 + i) + '-01', salario: sal, hist: [{ desde: '2025-0' + (3 + i) + '-01', salario: sal }], anticipos: 0, vacPend: 0, activo: true, horario: 'Por turnos', dias: [1, 2, 3, 4, 5], nota: '' }); });
    const P = [[s1, 'A A A A A L L'], [s1, 'L T T T T T L'], [s1, 'T L L A A A A'], [s1, 'A A L L C C C'], [s2, 'L L A A A A A'], [s2, 'C C L L C C C'], [s2, 'T T A L A L A'], [s2, 'N N L N N N N']];
    st.nom.emp.filter((e) => e.activo).forEach((e, i) => { const p = P[i % P.length]; st.hor.asig[e.id] = p[0]; st.hor.base[e.id] = p[1].split(' '); });
  }
  const plan = (vw) => { const B = R().base; if (vw === 'base') return B; const s = R().sem[vw]; const o = {}; E().forEach((e) => (o[e.id] = (s && s[e.id]) || B[e.id] || ['L', 'L', 'L', 'L', 'L', 'L', 'L'])); return o; };
  const codsDe = (e, vw) => (plan(vw)[e.id] || ['L', 'L', 'L', 'L', 'L', 'L', 'L']);

  // horas de un período para la quincena: nocturnas (con bono), extra y domingos trabajados
  H.horQ = (e, desde, hasta) => {
    if (!R() || !R().asig[e.id]) return null; let noct = 0, he = 0, dom = 0;
    for (let lu = lunesDe(desde); lu <= hasta; lu = addDays(lu, 7)) {
      const c = codsDe(e, lu); const w = semana(c); let dentro = 0;
      w.dias.forEach((x, i) => { const f = addDays(lu, i); if (!x || f < desde || f > hasta) return; dentro += x.tot; noct += x.tipo === 'N' ? x.tot : x.noct; if (i === 6) dom++; });
      if (w.tot > 0) he += w.extra * dentro / w.tot;
    }
    const k = (v) => Math.round(v * 100) / 100; return { noct: k(noct), he: k(he), dom };
  };

  /* ---------- vistas ---------- */
  const V = H.V;
  const vwLbl = (vw) => (vw === 'base' ? 'Plan base (se repite cada semana)' : 'Semana del ' + H.fdia(vw) + ' al ' + H.fdia(addDays(vw, 6)));
  const sel = (eid, i, c, sede) => '<select class="inp" style="min-width:58px;padding:4px" onchange="X.hc(\'' + eid + '\',' + i + ',this.value)">' + ['L'].concat(R().turnos.filter((t) => !t.sede || t.sede === sede).map((t) => t.cod)).map((k) => '<option' + (k === c ? ' selected' : '') + '>' + k + '</option>').join('') + '</select>';
  function abreTxt(sd) { // agrupa días seguidos con el mismo horario: "Lun-Mar 14:00-22:30 · Mié-Dom 08:00-22:30"
    const k = sd.abre.map((a) => (a ? a[0] + '-' + a[1] : 'cerrado')); if (k.every((x) => x === k[0])) return 'todos los días ' + k[0];
    const g = []; k.forEach((x, i) => { if (g.length && g[g.length - 1].x === x) g[g.length - 1].f = i; else g.push({ x, i, f: i }); });
    return g.map((o) => DS[o.i] + (o.f > o.i ? '-' + DS[o.f] : '') + ' ' + o.x).join(' · ');
  }
  function tablaSede(sd, vw) {
    const emps = E().filter((e) => R().asig[e.id] === sd.id); const P = Object.assign({}, plan(vw)); emps.forEach((e) => { if (!P[e.id]) P[e.id] = ['L', 'L', 'L', 'L', 'L', 'L', 'L']; });
    if (!emps.length) return '<div class="card"><h3>' + esc(sd.nombre) + '</h3><div class="empty">Nadie asignado a esta sede todavía.</div></div>';
    const W = emps.map((e) => ({ e, w: semana(P[e.id]) })); const tot = (f) => nf(W.reduce((a, x) => a + f(x.w), 0));
    const cob = cobertura(sd.id, P); let desde = 1e9, hasta = 0;
    cob.forEach((fr) => fr.forEach((f) => { if (f.abierto || f.n) { desde = Math.min(desde, f.m); hasta = Math.max(hasta, f.m + 30); } }));
    desde = Math.floor(desde / 60) * 60; hasta = Math.ceil(hasta / 60) * 60; if (!(hasta > desde)) { desde = 480; hasta = 1320; }
    const grid = '<div class="scroll" style="margin-top:12px"><table style="font-size:11px;border-collapse:collapse"><thead><tr><th></th>' + cob[0].filter((f) => f.m % 60 === 0 && f.m >= desde && f.m < hasta).map((f) => '<th colspan="2" style="text-align:left;font-weight:400;padding:0 2px">' + hhmm(f.m).slice(0, 2) + '</th>').join('') + '</tr></thead><tbody>' +
      cob.map((fr, i) => '<tr><td style="padding-right:6px"><b>' + DS[i] + '</b></td>' + fr.filter((f) => f.m >= desde && f.m < hasta).map((f) => { const c = !f.abierto ? (f.n ? 'var(--dorado-suave)' : 'transparent') : f.n === 0 ? 'var(--bad-bg)' : f.n < sd.min ? 'var(--warn-bg)' : 'var(--ok-bg)'; return '<td title="' + hhmm(f.m) + ' · ' + f.n + ' persona' + (f.n === 1 ? '' : 's') + (f.abierto ? '' : ' (cerrado)') + '" style="width:14px;height:20px;text-align:center;background:' + c + ';border:1px solid var(--line)">' + (f.n || '') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>';
    const huecos = []; cob.forEach((fr, i) => { let ini = null; fr.concat([{ m: 99999, abierto: false, n: 1 }]).forEach((f) => { const malo = f.abierto && f.n < sd.min; if (malo && ini === null) ini = f; if (!malo && ini !== null) { huecos.push(DS[i] + ' ' + hhmm(ini.m) + '-' + hhmm(f.m) + (ini.n === 0 ? ' sin nadie' : ' con menos de ' + sd.min)); ini = null; } }); });
    return '<div class="card scroll"><h3>' + esc(sd.nombre) + ' <span class="hint" style="font-weight:400">· abre ' + abreTxt(sd) + '</span></h3>' +
      '<table><thead><tr><th>Trabajador</th>' + DS.map((d) => '<th>' + d + '</th>').join('') + '<th class="r">H. diurnas</th><th class="r">H. nocturnas</th><th class="r">Total</th><th>Jornada</th><th class="r">Extra</th></tr></thead><tbody>' +
      W.map(({ e, w }) => '<tr><td class="wrap" style="min-width:190px"><b>' + esc(e.nombre) + '</b><div class="hint">' + esc(e.cargo) + '</div>' + w.al.map((a) => '<div class="hint" style="color:var(--bad)">• ' + esc(a) + '</div>').join('') + '</td>' + P[e.id].slice(0, 7).map((c, i) => '<td>' + sel(e.id, i, c, sd.id) + '</td>').join('') + '<td class="r">' + nf(w.diur) + '</td><td class="r">' + nf(w.noct) + '</td><td class="r"><b>' + nf(w.tot) + '</b></td><td>' + LIM[w.tipo][2] + ' (' + nf(w.tope) + ' h)</td><td class="r">' + (w.extra ? '<span class="bd w" style="margin:0">' + nf(w.extra) + '</span>' : '0') + '</td></tr>').join('') +
      '<tr class="tot"><td>Total sede</td><td colspan="7"></td><td class="r">' + tot((w) => w.diur) + '</td><td class="r">' + tot((w) => w.noct) + '</td><td class="r">' + tot((w) => w.tot) + '</td><td></td><td class="r">' + tot((w) => w.extra) + '</td><td></td></tr></tbody></table>' +
      '<h3 style="margin-top:16px">Cobertura por hora</h3><p class="hint" style="margin:0">Personas en turno cada media hora. Verde: cubierto · amarillo: menos de ' + sd.min + ' · rojo: abierto sin nadie · dorado: hay gente con la sede cerrada.</p>' + grid +
      (huecos.length ? '<p class="hint" style="color:var(--bad)">Huecos: ' + huecos.join(' · ') + '</p>' : '<p class="hint" style="color:var(--ok)">Todas las horas de apertura están cubiertas.</p>') + '</div>';
  }
  V.nhor = () => {
    if (!on() || !R()) return '<h1>Horarios</h1><div class="card"><div class="empty">Enciende el módulo de Nómina para usar los horarios.</div></div>';
    const vw = R().vw || 'base'; const sinSede = E().filter((e) => !R().sedes.some((s) => s.id === R().asig[e.id]));
    const all = E().filter((e) => R().asig[e.id]).map((e) => semana(codsDe(e, vw)));
    const nAl = all.reduce((a, w) => a + w.al.length, 0);
    const prox = lunesDe(hoy());
    return (H.back ? H.back('nomina', 'Nómina') : '') + '<h1>Horarios y turnos</h1><p class="sub">Arma la semana de cada sede con códigos de turno. El sistema separa las horas diurnas y nocturnas, revisa topes y descansos de la LOTTT, y muestra qué horas quedan sin cubrir.</p>' +
      '<div class="kpis">' + H.kpi(E().length, 'Trabajadores activos') + H.kpi(nf(all.reduce((a, w) => a + w.tot, 0)) + ' h', 'Horas en la semana') + H.kpi(nf(all.reduce((a, w) => a + w.bono, 0)) + ' h', 'Horas con bono nocturno') + H.kpi(nf(all.reduce((a, w) => a + w.extra, 0)) + ' h', 'Horas extra', 'var(--warn)') + H.kpi(nAl, nAl === 1 ? 'Cosa por revisar' : 'Cosas por revisar', nAl ? 'var(--bad)' : 'var(--ok)') + '</div>' +
      '<div class="card no-print"><div class="row" style="flex-wrap:wrap;gap:8px;align-items:center"><button class="btn sec" onclick="X.hw(-1)">←</button><b style="min-width:260px;text-align:center">' + vwLbl(vw) + '</b><button class="btn sec" onclick="X.hw(1)">→</button>' +
      (vw === 'base' ? '<button class="btn sec" onclick="X.hw(\'' + prox + '\')">Ir a esta semana</button>' : '<button class="btn sec" onclick="X.hw(\'base\')">Ver plan base</button>' + (R().sem[vw] ? '<button class="btn sec" onclick="X.hBase()">Usar esta semana como plan base</button><button class="btn sec" onclick="X.hReset()">Volver al plan base</button>' : '')) +
      '<span class="sp" style="flex:1"></span><button class="btn sec" onclick="location.hash=\'nhort\'">Turnos y sedes</button><button class="btn sec" onclick="X.hCsv()">Descargar CSV</button><button class="btn sec" onclick="window.print()">Imprimir</button></div>' +
      '<p class="hint" style="margin-bottom:0">' + (vw === 'base' ? 'El plan base se usa en todas las semanas que no cambies. Para cambiar solo una semana (una falta, un permiso, un cambio de turno), muévete con las flechas y edita esa semana.' : R().sem[vw] ? 'Esta semana tiene cambios propios; el plan base no se toca.' : 'Esta semana sigue el plan base. Si cambias algo aquí, se guarda solo para esta semana.') + ' Códigos: ' + R().turnos.map((t) => '<b>' + esc(t.cod) + '</b> ' + esc(t.nombre) + ' ' + t.ini + '-' + t.fin).join(' · ') + ' · <b>L</b> libre.</p></div>' +
      (sinSede.length ? '<div class="card"><h3>Sin sede asignada</h3><table><tbody>' + sinSede.map((e) => '<tr><td>' + esc(e.nombre) + ' <span class="hint">' + esc(e.cargo) + '</span></td><td><select class="inp" onchange="X.hs(\'' + e.id + '\',this.value)"><option value="">Elegir sede…</option>' + R().sedes.map((s) => '<option value="' + s.id + '">' + esc(s.nombre) + '</option>').join('') + '</select></td></tr>').join('') + '</tbody></table></div>' : '') +
      R().sedes.map((s) => tablaSede(s, vw)).join('') +
      '<div class="card no-print"><h3>A la quincena</h3><p class="hint" style="margin-top:0">Las horas nocturnas (bono nocturno), las horas extra y los domingos trabajados de cada quincena salen de este horario. En <b>Pagar la quincena</b>, toca «Traer horas del horario».</p><div class="row"><button class="btn" onclick="location.hash=\'nquin\'">Ir a pagar la quincena</button></div></div>' +
      '<p class="hint">Reglas: diurna 05:00-19:00 y nocturna 19:00-05:00; topes diarios y semanales del art. 173; mixta con más de 4 h nocturnas cuenta como nocturna; no más de 5 h seguidas sin reposo de 1 hora (art. 168); 2 días de descanso seguidos; máximo 10 horas extra por semana (art. 178). Si en una semana hay turnos de distinto tipo, se usa el tope más bajo. El reposo se descuenta de las horas: si el trabajador no puede salir del lugar durante el reposo, cuenta como trabajado (revísalo con tu asesor). Cálculo referencial.</p>';
  };
  V.nhort = () => {
    if (!R()) return V.nhor();
    const trs = R().turnos.map((t) => { const h = horasTurno(t) || { diur: 0, noct: 0, tot: 0, tipo: 'D' }; return '<tr><td><input class="inp" style="width:52px" value="' + esc(t.cod) + '" onchange="X.ht(\'' + t.id + '\',\'cod\',this.value)"></td><td><input class="inp" value="' + esc(t.nombre) + '" onchange="X.ht(\'' + t.id + '\',\'nombre\',this.value)"></td><td><input class="inp" type="time" value="' + t.ini + '" onchange="X.ht(\'' + t.id + '\',\'ini\',this.value)"></td><td><input class="inp" type="time" value="' + t.fin + '" onchange="X.ht(\'' + t.id + '\',\'fin\',this.value)"></td><td><input class="inp num" style="width:64px" value="' + (t.pausa || 0) + '" onchange="X.ht(\'' + t.id + '\',\'pausa\',this.value)"></td><td><input class="inp" type="time" value="' + (t.pIni || '') + '" onchange="X.ht(\'' + t.id + '\',\'pIni\',this.value)"></td><td><select class="inp" onchange="X.ht(\'' + t.id + '\',\'sede\',this.value)"><option value="">Todas</option>' + R().sedes.map((s) => '<option value="' + s.id + '"' + (t.sede === s.id ? ' selected' : '') + '>' + esc(s.nombre) + '</option>').join('') + '</select></td><td class="r">' + nf(h.diur) + '</td><td class="r">' + nf(h.noct) + '</td><td>' + LIM[h.tipo][2] + (h.tot > LIM[h.tipo][0] ? ' <span class="bd b" style="margin:0">pasa ' + nf(LIM[h.tipo][0]) + ' h</span>' : '') + '</td><td><button class="lnk" onclick="X.htDel(\'' + t.id + '\')">Quitar</button></td></tr>'; }).join('');
    const srs = R().sedes.map((s) => '<div class="card"><div class="row" style="gap:8px;align-items:center"><input class="inp" style="flex:1" value="' + esc(s.nombre) + '" onchange="X.hsd(\'' + s.id + '\',\'nombre\',this.value)"><label class="hint">Mínimo de personas <input class="inp num" style="width:56px" value="' + s.min + '" onchange="X.hsd(\'' + s.id + '\',\'min\',this.value)"></label>' + (R().sedes.length > 1 ? '<button class="lnk" onclick="X.hsdDel(\'' + s.id + '\')">Quitar sede</button>' : '') + '</div><table style="margin-top:8px"><tbody>' + DS.map((d, i) => '<tr><td>' + d + '</td><td><label class="hint"><input type="checkbox"' + (s.abre[i] ? ' checked' : '') + ' onchange="X.hab(\'' + s.id + '\',' + i + ',this.checked)"> abre</label></td><td>' + (s.abre[i] ? '<input class="inp" type="time" value="' + s.abre[i][0] + '" onchange="X.hab2(\'' + s.id + '\',' + i + ',0,this.value)"> a <input class="inp" type="time" value="' + s.abre[i][1] + '" onchange="X.hab2(\'' + s.id + '\',' + i + ',1,this.value)">' : '') + '</td></tr>').join('') + '</tbody></table></div>').join('');
    const asig = '<div class="card"><h3>Quién trabaja en cada sede</h3><table><tbody>' + E().map((e) => '<tr><td>' + esc(e.nombre) + ' <span class="hint">' + esc(e.cargo) + '</span></td><td><select class="inp" onchange="X.hs(\'' + e.id + '\',this.value)"><option value="">Sin sede</option>' + R().sedes.map((s) => '<option value="' + s.id + '"' + (R().asig[e.id] === s.id ? ' selected' : '') + '>' + esc(s.nombre) + '</option>').join('') + '</select></td></tr>').join('') + '</tbody></table></div>';
    return '<button class="back" onclick="location.hash=\'nhor\'">← Horarios</button><h1>Turnos y sedes</h1><p class="sub">Define los turnos una vez y úsalos por código en el horario. Las horas diurnas y nocturnas se calculan solas.</p>' +
      '<div class="card scroll"><h3>Turnos</h3><table><thead><tr><th>Código</th><th>Nombre</th><th>Entra</th><th>Sale</th><th>Reposo (min)</th><th>Reposo desde</th><th>Sede</th><th class="r">H. diurnas</th><th class="r">H. nocturnas</th><th>Jornada</th><th></th></tr></thead><tbody>' + trs + '</tbody></table><p class="hint">Si no pones la hora del reposo, se toma a mitad del turno. El código <b>L</b> (libre) está reservado.</p><div class="row"><button class="btn sec" onclick="X.htAdd()">Agregar turno</button></div></div>' +
      '<h3>Sedes y horario de apertura</h3>' + srs + '<div class="row" style="margin-bottom:12px"><button class="btn sec" onclick="X.hsdAdd()">Agregar sede</button></div>' + asig;
  };

  /* ---------- acciones ---------- */
  const sv = () => { H.save(); H.go(true); };
  Object.assign(window.X, {
    hc(eid, i, c) { const vw = R().vw || 'base'; if (vw === 'base') { const b = R().base[eid] || ['L', 'L', 'L', 'L', 'L', 'L', 'L']; b[i] = c; R().base[eid] = b; } else { const s = R().sem[vw] || (R().sem[vw] = {}); const cur = (s[eid] || (R().base[eid] || ['L', 'L', 'L', 'L', 'L', 'L', 'L'])).slice(); cur[i] = c; s[eid] = cur; } sv(); },
    hw(k) { const vw = R().vw || 'base'; if (k === 'base' || /^\d{4}-/.test(k)) R().vw = k; else R().vw = vw === 'base' ? addDays(lunesDe(hoy()), k > 0 ? 0 : -7) : addDays(vw, 7 * k); sv(); },
    hBase() { const vw = R().vw; const s = R().sem[vw]; if (!s) return; Object.keys(s).forEach((k) => (R().base[k] = s[k].slice())); delete R().sem[vw]; sv(); toast('Plan base actualizado'); },
    hReset() { delete R().sem[R().vw]; sv(); toast('Semana igual al plan base'); },
    hs(eid, sid) { if (sid) R().asig[eid] = sid; else delete R().asig[eid]; if (!R().base[eid]) R().base[eid] = ['L', 'L', 'L', 'L', 'L', 'L', 'L']; sv(); },
    ht(id, k, v) { const t = R().turnos.find((x) => x.id === id); if (!t) return; if (k === 'cod') { v = v.trim().toUpperCase(); if (!v || v === 'L' || R().turnos.some((x) => x.cod === v && x.id !== id)) return toast('Código vacío, repetido o reservado', true); const viejo = t.cod; [R().base].concat(Object.values(R().sem)).forEach((P) => Object.values(P).forEach((a) => a.forEach((c, i) => { if (c === viejo) a[i] = v; }))); } if (k === 'pausa') v = Math.max(0, parseInt(v, 10) || 0); t[k] = v; sv(); },
    htAdd() { let n = 1; while (R().turnos.some((t) => t.cod === 'X' + n)) n++; R().turnos.push({ id: uid(), cod: 'X' + n, nombre: 'Nuevo turno', ini: '08:00', fin: '16:00', pausa: 60, pIni: '' }); sv(); },
    htDel(id) { const t = R().turnos.find((x) => x.id === id); const usado = [R().base].concat(Object.values(R().sem)).some((P) => Object.values(P).some((a) => a.includes(t.cod))); if (usado) return toast('Ese turno está en uso en el horario: cámbialo primero', true); R().turnos = R().turnos.filter((x) => x.id !== id); sv(); },
    hsd(id, k, v) { const s = R().sedes.find((x) => x.id === id); s[k] = k === 'min' ? Math.max(1, parseInt(v, 10) || 1) : v.trim() || s[k]; sv(); },
    hsdAdd() { R().sedes.push({ id: uid(), nombre: 'Nueva sede', abre: [0, 1, 2, 3, 4, 5, 6].map(() => ['08:00', '18:00']), min: 1 }); sv(); },
    hsdDel(id) { if (Object.values(R().asig).includes(id)) return toast('Hay trabajadores en esa sede: muévelos primero', true); R().sedes = R().sedes.filter((s) => s.id !== id); sv(); },
    hab(id, i, v) { const s = R().sedes.find((x) => x.id === id); s.abre[i] = v ? ['08:00', '18:00'] : null; sv(); },
    hab2(id, i, j, v) { const s = R().sedes.find((x) => x.id === id); s.abre[i][j] = v; sv(); },
    hCsv() {
      const vw = R().vw || 'base'; const rows = [['Sede', 'Trabajador', 'Cargo'].concat(DS, ['H. diurnas', 'H. nocturnas', 'Total', 'Jornada', 'Horas extra', 'Revisar'])];
      R().sedes.forEach((s) => E().filter((e) => R().asig[e.id] === s.id).forEach((e) => { const c = codsDe(e, vw); const w = semana(c); rows.push([s.nombre, e.nombre, e.cargo].concat(c, [nf(w.diur), nf(w.noct), nf(w.tot), LIM[w.tipo][2], nf(w.extra), w.al.join(' | ')])); }));
      H.bajar('horario-' + (vw === 'base' ? 'plan-base' : vw) + '.csv', H.csv(rows), 'text/csv;charset=utf-8');
    }
  });

  H.horMotor = { horasTurno, semana }; // para pruebas
  H.mods.push({ id: 'horarios', ensure });
  if (H.sub) H.sub('nomina', ['nhor', 'nhort']);
})();
