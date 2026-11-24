/* Torneos de pádel · PRB Consulting
   Asistente de 3 preguntas que recomienda el formato, rondas y marcador automáticos, tabla al instante y cuadros.
   Todo se guarda en el navegador del visitante (localStorage). Datos ficticios. */
(function () {
  'use strict';
  const P = window.Padel; const KEY = 'prb-padel-v1';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const fdia = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const ico = (n) => '<i class="ti ti-' + n + '" aria-hidden="true"></i>';
  const toast = (msg, err) => (window.PRBok ? window.PRBok(msg, err) : null);

  /* ---------- datos ---------- */
  let S;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este navegador', true); } }
  function load() { try { const r = localStorage.getItem(KEY); if (r) { S = JSON.parse(r); if (S && S.v === 1) return; } } catch (e) { /* */ } S = seed(); save(); }
  const T = () => S.torneos.find((t) => t.id === S.activo) || null;
  const NOMBRES = ['Andrea', 'Luis', 'Carla', 'Diego', 'Valentina', 'José', 'Mariana', 'Pedro', 'Gabriela', 'Andrés', 'Sofía', 'Ricardo', 'Daniela', 'Miguel', 'Paola', 'Jorge', 'Camila', 'Rafael', 'Lucía', 'Simón'];
  function base(o) { return Object.assign({ id: uid(), v: 1, nombre: 'Torneo', fecha: hoy(), formato: 'americano', canchas: ['Cancha 1', 'Cancha 2'], jug: [], par: [], rondas: [], pt: { tipo: 'total', total: 24, min: 15, sets: 1, juegos: 6, oro: true, stb: true }, crit: '', nivelar: false, estado: 'activo', creado: Date.now() }, o); }
  function seed() {
    const st = { v: 1, torneos: [], activo: null, dir: [] };
    NOMBRES.forEach((n, i) => st.dir.push({ id: uid(), n, g: ['Andrea', 'Carla', 'Valentina', 'Mariana', 'Gabriela', 'Sofía', 'Daniela', 'Paola', 'Camila', 'Lucía'].includes(n) ? 'M' : 'H', nv: 2 + (i * 7) % 4 }));
    // Americano en curso: 8 jugadores, 2 canchas, 3 rondas jugadas
    P.semilla(11);
    const a = base({ nombre: 'Americano de los jueves', formato: 'americano', nRondas: 7, crit: 'puntos' });
    a.jug = st.dir.slice(0, 8).map((j) => ({ id: uid(), n: j.n, g: j.g, nv: j.nv }));
    P.iniciar(a);
    const res = [[15, 9], [13, 11], [8, 16], [17, 7], [12, 12], [14, 10]]; let k = 0;
    a.rondas.slice(0, 3).forEach((r) => r.partidos.forEach((m) => { const x = res[k++ % res.length]; m.sa = x[0]; m.sb = x[1]; m.ok = true; }));
    // Grupos y cuadro: 8 parejas, fase de grupos a medias
    const g = base({ nombre: 'Copa del club', formato: 'grupos', canchas: ['Cancha 1', 'Cancha 2', 'Cancha 3'], nGrupos: 2, pasan: 2, tercer: true, pt: { tipo: 'sets', total: 24, min: 30, sets: 1, juegos: 6, oro: true, stb: true }, crit: 'victorias' });
    g.jug = st.dir.slice(4, 20).map((j) => ({ id: uid(), n: j.n, g: j.g, nv: j.nv }));
    for (let i = 0; i < 16; i += 2) g.par.push({ id: uid(), a: g.jug[i].id, b: g.jug[i + 1].id });
    P.iniciar(g);
    const sets = [[6, 3], [4, 6], [6, 2], [7, 5], [6, 4], [3, 6]]; k = 0;
    g.rondas.slice(0, 2).forEach((r) => r.partidos.forEach((m) => { m.sets = [sets[k++ % sets.length].slice()]; m.ok = true; }));
    P.azar();
    st.torneos.push(a, g); st.activo = a.id;
    return st;
  }

  /* ---------- navegación ---------- */
  let vista = 'inicio', sub = '';
  function nav() {
    const t = T(); const k = vista;
    const b = (h, txt, ic) => '<button' + (k === h || (h.startsWith('t/') && k === 't' && 't/' + sub === h) ? ' class="on"' : '') + ' onclick="location.hash=\'' + h + '\'">' + ico(ic) + txt + '</button>';
    let h = '<div class="brand">Pádel<small>Torneos sin enredos</small></div>' + b('inicio', 'Inicio', 'home') + b('nuevo', 'Nuevo torneo', 'plus');
    if (t) {
      h += '<div class="grp">' + esc(t.nombre) + '</div>' + b('t/partidos', t.formato === 'escalera' ? 'Retos' : 'Partidos', 'ball-tennis') + b('t/tabla', t.formato === 'escalera' ? 'Ranking' : 'Tabla', 'list-numbers');
      if (t.formato === 'grupos' || t.formato === 'elim') h += b('t/cuadro', 'Cuadro', 'tournament');
      h += b('t/ajustes', 'Jugadores y ajustes', 'adjustments');
    }
    h += '<div class="grp">General</div>' + b('torneos', 'Mis torneos', 'trophy') + b('formatos', '¿Qué formato elijo?', 'help-circle') + b('jugadores', 'Jugadores', 'users') + b('config', 'Configuración', 'settings');
    $('nav').innerHTML = h;
  }
  function go() {
    const hs = location.hash.slice(1).split('/'); let k = hs[0] || 'inicio'; sub = hs[1] || '';
    if (k === 't') { if (!T()) k = 'inicio'; else if (!['partidos', 'tabla', 'cuadro', 'ajustes'].includes(sub)) sub = 'partidos'; }
    vista = V[k] ? k : 'inicio'; nav();
    $('m').innerHTML = V[vista]() + '<div class="foot">Torneos de pádel · hecho por <a href="../">PRB Consulting</a>. Demo con datos ficticios: lo que registres se guarda solo en este navegador (no se ve desde otro equipo ni desde el teléfono; para pasarlo usa el respaldo en Configuración).</div>';
    if (A[vista]) A[vista]();
  }
  function rerender() { const y = $('m').scrollTop, w = window.scrollY; go(); $('m').scrollTop = y; window.scrollTo(0, w); }
  window.addEventListener('hashchange', () => { go(); $('m').scrollTop = 0; window.scrollTo(0, 0); });
  function dlg(t, c, b) { const d = $('dlg'); d.innerHTML = '<div class="hd"><b>' + t + '</b><button class="x" aria-label="Cerrar" onclick="PD.cerrar()">×</button></div><div class="bd">' + c + '</div><div class="ft">' + (b || '<button class="btn sec" onclick="PD.cerrar()">Cerrar</button>') + '</div>'; if (!d.open) d.showModal(); }
  const cerrar = () => $('dlg').open && $('dlg').close();
  const V = {}, A = {};

  /* ---------- inicio ---------- */
  const estadoT = (t) => {
    if (t.estado === 'terminado') return '<span class="tag mut">Terminado</span>';
    if (t.formato === 'escalera') return '<span class="tag ok">' + (t.retos || []).length + ' retos</span>';
    const pend = P.todos(t).filter((m) => !m.ok && m.A.length && m.B.length).length;
    const r = t.rondas.find((x) => x.partidos.some((m) => !m.ok));
    return '<span class="tag ok">' + (r && !t.cuadro ? 'Ronda ' + r.n + ' de ' + t.rondas.length : pend ? pend + ' partidos por jugar' : 'En curso') + '</span>';
  };
  V.inicio = () => {
    const t = T(); const act = S.torneos.filter((x) => x.estado !== 'terminado');
    let h = '<h1>¿Qué quieres hacer hoy?</h1><p class="sub">Arma un torneo en 3 preguntas. La app hace las rondas, cuenta los puntos y ordena la tabla.</p><div class="hoy"><div class="tiles">' +
      '<button class="tile main" onclick="location.hash=\'nuevo\'"><div class="ic">' + ico('plus') + '</div><div><b>Nuevo torneo</b><span>Te recomendamos el formato según cuántos son y el tiempo que tienen.</span></div></button>';
    if (t && t.estado !== 'terminado') h += '<button class="tile att" onclick="location.hash=\'t/partidos\'"><div class="ic">' + ico('ball-tennis') + '</div><div><b>Seguir: ' + esc(t.nombre) + '</b><span>' + esc(P.F[t.formato].t) + ' · anota los resultados de la ronda.</span></div></button>' +
      '<button class="tile" onclick="location.hash=\'t/tabla\'"><div class="ic">' + ico('list-numbers') + '</div><div><b>Ver la tabla</b><span>Quién va ganando y compartirla por WhatsApp.</span></div></button>';
    h += '<button class="tile" onclick="location.hash=\'formatos\'"><div class="ic">' + ico('help-circle') + '</div><div><b>¿Qué formato elijo?</b><span>Americano, mexicano, rey de la pista y más, explicados en una línea.</span></div></button></div></div>';
    if (act.length) h += '<h3>Torneos en curso</h3>' + listaT(act);
    return h;
  };
  const listaT = (L) => '<div class="card" style="padding:0"><table><tbody>' + L.map((t) => '<tr style="cursor:pointer" onclick="PD.abrir(\'' + t.id + '\')"><td class="wrap"><b>' + esc(t.nombre) + '</b><br><span class="hint">' + esc(P.F[t.formato].t) + ' · ' + fdia(t.fecha) + ' · ' + (P.ind(t) ? t.jug.filter((j) => !j.baja).length + ' jugadores' : t.par.length + ' parejas') + '</span></td><td class="r">' + estadoT(t) + '</td></tr>').join('') + '</tbody></table></div>';
  V.torneos = () => '<h1>Mis torneos</h1><p class="sub">Toca uno para abrirlo.</p><div class="row"><button class="btn" onclick="location.hash=\'nuevo\'">' + ico('plus') + ' Nuevo torneo</button></div>' + (S.torneos.length ? listaT(S.torneos.slice().sort((a, b) => b.creado - a.creado)) : '<div class="card empty">Todavía no tienes torneos.</div>');

  /* ---------- asistente ---------- */
  let W = null;
  const nuevoW = (f) => ({ paso: 1, rotan: f ? !!P.F[f].ind : null, semanas: f === 'escalera', txt: '', lista: [], canchas: 2, minutos: 120, niveles: 'parejos', nombre: '', fecha: hoy(), f: f || null, cfg: null });
  V.nuevo = () => {
    if (!W) W = nuevoW();
    const pasos = ['Cómo juegan', 'Quiénes', 'Canchas y tiempo', 'Formato', 'Revisar'];
    let h = '<h1>Nuevo torneo</h1><div class="pasos">' + pasos.map((p, i) => '<span class="' + (i + 1 === W.paso ? 'on' : i + 1 < W.paso ? 'ya' : '') + '">' + (i + 1) + '. ' + p + '</span>').join('') + '</div>';
    h += WP[W.paso](); return h;
  };
  const WP = {};
  WP[1] = () => '<p class="sub">¿Cambian de pareja en cada partido o juegan con la misma pareja todo el torneo?</p><div class="elige">' +
    '<button class="op' + (W.rotan === true ? ' on' : '') + '" id="w-rotan" onclick="PD.w({rotan:true,paso:2})">' + ico('arrows-shuffle') + '<b>Cambian de pareja</b><span>Cada uno se inscribe solo y juega con varios compañeros. Lo más social: americano, mexicano, rey de la pista.</span></button>' +
    '<button class="op' + (W.rotan === false ? ' on' : '') + '" id="w-fijas" onclick="PD.w({rotan:false,paso:2})">' + ico('users') + '<b>Parejas fijas</b><span>Se inscriben en pareja y compiten juntos: todos contra todos, grupos y cuadro, eliminación o escalera.</span></button></div>';
  WP[2] = () => {
    const fij = !W.rotan; const L = parseLista(); const n = fij ? L.length : L.length;
    let h = '<p class="sub">' + (fij ? 'Escribe una pareja por línea, separando los dos nombres con <b>/</b>. Ejemplo: <i>Ana / Luis</i>' : 'Escribe un nombre por línea (o pégalos desde WhatsApp).') + '</p>' +
      '<div class="g2"><div class="card"><label class="f">' + (fij ? 'Parejas' : 'Jugadores') + '<textarea class="inp" id="w-txt" rows="10" oninput="PD.wtxt(this.value)" placeholder="' + (fij ? 'Ana / Luis\nCarla / Diego\n…' : 'Ana\nLuis\nCarla\n…') + '">' + esc(W.txt) + '</textarea></label>' +
      '<p class="cuenta" id="w-cuenta">' + cuentaTxt(n, fij) + '</p></div>' +
      '<div class="card"><h3>Agregar de tus jugadores</h3><p class="hint" style="margin-top:0">Toca un nombre para sumarlo a la lista.</p><div class="chips">' + S.dir.slice().sort((a, b) => a.n.localeCompare(b.n)).map((j) => '<button onclick="PD.wadd(\'' + esc(j.n).replace(/'/g, '&#39;') + '\')">' + esc(j.n) + '</button>').join('') + '</div></div></div>';
    if (L.length && !fij) h += '<details class="mas"' + (W.abierto ? ' open' : '') + ' ontoggle="PD.wab(this.open)"><summary>Más opciones: género (para mixto) y nivel (para emparejar mejor)</summary><div class="card" style="margin-top:12px;padding:0"><table><thead><tr><th>Jugador</th><th>Género</th><th>Nivel (1 a 5)</th></tr></thead><tbody>' +
      L.map((j, i) => '<tr><td>' + esc(j.n) + '</td><td><div class="chips">' + ['H', 'M'].map((g) => '<button class="' + (j.g === g ? 'on' : '') + '" onclick="PD.wset(' + i + ',\'g\',\'' + g + '\')">' + (g === 'H' ? 'Hombre' : 'Mujer') + '</button>').join('') + '</div></td><td><div class="chips">' + [1, 2, 3, 4, 5].map((v) => '<button class="' + (+j.nv === v ? 'on' : '') + '" onclick="PD.wset(' + i + ',\'nv\',' + v + ')">' + v + '</button>').join('') + '</div></td></tr>').join('') + '</tbody></table></div></details>';
    h += '<div class="row" style="margin-top:18px"><button class="btn sec" onclick="PD.w({paso:1})">Atrás</button><button class="btn" id="w-sig2" onclick="PD.wsig2()">Siguiente</button></div>';
    return h;
  };
  const cuentaTxt = (n, fij) => n ? n + (fij ? (n === 1 ? ' pareja' : ' parejas') : (n === 1 ? ' jugador' : ' jugadores')) + (fij ? '' : n % 4 ? ' · cada ronda descansan ' + (n % 4) : ' · nadie descansa') : 'Todavía no hay nombres.';
  function parseLista() {
    const lines = W.txt.split(/\n|,|;/).map((x) => x.replace(/^\s*\d+[.)-]\s*/, '').trim()).filter(Boolean);
    const prev = Object.fromEntries((W.lista || []).map((j) => [j.n.toLowerCase(), j]));
    const fromDir = (n) => S.dir.find((d) => d.n.toLowerCase() === n.toLowerCase());
    if (W.rotan) { const seen = new Set(); W.lista = lines.filter((n) => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).map((n) => prev[n.toLowerCase()] || Object.assign({ n, g: '', nv: 3 }, fromDir(n) ? { g: fromDir(n).g, nv: fromDir(n).nv } : {})); }
    else W.lista = W.txt.split('\n').map((x) => x.replace(/^\s*\d+[.)-]\s*/, '').trim()).filter(Boolean).map((l) => { const p = l.split(/\s*[\/&+]\s*|\s+y\s+/i).filter(Boolean); return { n: l, a: (p[0] || '').trim(), b: (p[1] || '').trim() }; });
    return W.lista;
  }
  WP[3] = () => '<p class="sub">¿Cuántas canchas tienen y cuánto tiempo dura el torneo?</p><div class="g2e"><div class="card"><label class="f">Canchas</label><div class="step" style="margin:9px 0 18px"><button onclick="PD.wc(-1)">−</button><b id="w-c">' + W.canchas + '</b><button onclick="PD.wc(1)">+</button></div>' +
    '<label class="f">Tiempo disponible</label><div class="chips" style="margin-top:9px">' + [[60, '1 h'], [90, '1 h 30'], [120, '2 h'], [180, '3 h'], [240, '4 h'], [480, 'Todo el día']].map((x) => '<button class="' + (W.minutos === x[0] ? 'on' : '') + '" onclick="PD.w({minutos:' + x[0] + '})">' + x[1] + '</button>').join('') + '</div>' +
    (W.rotan ? '<label class="f" style="margin-top:18px">¿Los niveles son parecidos?</label><div class="chips" style="margin-top:9px"><button class="' + (W.niveles === 'parejos' ? 'on' : '') + '" onclick="PD.w({niveles:\'parejos\'})">Sí, parecidos</button><button class="' + (W.niveles === 'distintos' ? 'on' : '') + '" onclick="PD.w({niveles:\'distintos\'})">No, hay de todo</button></div>' :
      '<label class="f" style="margin-top:18px">¿Es un solo día o una liga de varias semanas?</label><div class="chips" style="margin-top:9px"><button class="' + (!W.semanas ? 'on' : '') + '" onclick="PD.w({semanas:false})">Un solo día</button><button class="' + (W.semanas ? 'on' : '') + '" onclick="PD.w({semanas:true})">Varias semanas</button></div>') +
    '</div><div class="card"><div class="form"><label class="f full">Nombre del torneo<input class="inp" id="w-nom" value="' + esc(W.nombre) + '" placeholder="Ej.: Americano del viernes" oninput="W_set(\'nombre\',this.value)"></label><label class="f">Fecha<input class="inp" type="date" id="w-fecha" value="' + W.fecha + '" onchange="W_set(\'fecha\',this.value)"></label></div></div></div>' +
    '<div class="row" style="margin-top:18px"><button class="btn sec" onclick="PD.w({paso:2})">Atrás</button><button class="btn" id="w-sig3" onclick="PD.w({paso:4})">Ver formatos recomendados</button></div>';
  WP[4] = () => {
    const n = W.lista.length; const mixto = W.rotan && W.lista.some((j) => j.g === 'H') && W.lista.some((j) => j.g === 'M');
    let R = P.recomendar({ rotan: W.rotan, n, canchas: W.canchas, minutos: W.minutos, niveles: W.niveles, mixto, semanas: W.semanas });
    if (W.f && !R.some((x) => x.f === W.f) && n >= (P.F[W.f].min || 2) && !!P.F[W.f].ind === !!W.rotan) R.push({ f: W.f, por: 'El formato que elegiste.', pt: { tipo: 'total', total: 24, min: 15, sets: 1, juegos: 6, oro: true, stb: true }, nRondas: P.rondasSugeridas(W.f, n, W.canchas) });
    W.R = R;
    if (!R.length) return '<div class="card empty">Con ' + n + (W.rotan ? ' jugadores' : ' parejas') + ' no alcanza para un torneo. ' + (W.rotan ? 'Hacen falta al menos 4.' : 'Hacen falta al menos 2 parejas.') + '</div><div class="row" style="margin-top:18px"><button class="btn sec" onclick="PD.w({paso:2})">Volver a la lista</button></div>';
    return '<p class="sub">Para ' + n + (W.rotan ? ' jugadores' : ' parejas') + ', ' + W.canchas + (W.canchas === 1 ? ' cancha' : ' canchas') + ' y ' + durTxt(W.minutos) + ', esto es lo que mejor funciona:</p><div class="elige">' +
      R.map((r, i) => '<button class="op' + (W.f === r.f ? ' on' : '') + '" data-f="' + r.f + '" onclick="PD.welige(' + i + ')">' + (i === 0 ? '<span class="rec">Recomendado</span>' : '') + ico(P.F[r.f].ic.replace('ti-', '')) + '<b>' + P.F[r.f].t + '</b><span>' + esc(r.por) + '</span><span><b style="font:600 14px var(--font);color:var(--tinta)">' + esc(P.ptTexto(r.pt)) + (r.nRondas ? ' · ' + r.nRondas + ' rondas' : '') + '</b></span></button>').join('') + '</div>' +
      '<div class="row"><button class="btn sec" onclick="PD.w({paso:3})">Atrás</button><span class="hint">Toca el formato para revisarlo y empezar.</span></div>';
  };
  const durTxt = (m) => m >= 480 ? 'todo el día' : m % 60 ? Math.floor(m / 60) + ' h ' + (m % 60) : (m / 60) + (m === 60 ? ' hora' : ' horas');
  WP[5] = () => {
    const c = W.cfg; const F = P.F[c.formato]; const pt = c.pt; const ind = !!F.ind && !(c.formato === 'rey' && c.reyParejas);
    const sel = (id, v, ops, on) => '<select class="inp" id="' + id + '" onchange="' + on + '">' + ops.map((o) => '<option value="' + o[0] + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
    let h = '<p class="sub">' + F.largo + '</p><div class="g2e"><div class="card"><h3>' + ico(F.ic.replace('ti-', '')) + ' ' + F.t + '</h3><div class="form">';
    h += '<label class="f full">¿Cómo se cuenta cada partido?' + sel('c-tipo', pt.tipo, [['total', 'Por puntos (la suma da un total fijo)'], ['tope', 'A X puntos (gana el que llega primero)'], ['tiempo', 'Por tiempo (lo que se haga en X minutos)'], ['sets', 'Por sets y juegos (como un partido normal)']], 'PD.cpt(\'tipo\',this.value)') + '</label>';
    if (pt.tipo === 'total' || pt.tipo === 'tope') h += '<label class="f">Puntos por partido' + sel('c-total', pt.total, [12, 16, 21, 24, 32].map((x) => [x, x + ' puntos']), 'PD.cpt(\'total\',+this.value)') + '</label><p class="hint full" style="margin:0">' + (pt.tipo === 'total' ? 'Cada saque cuenta un punto; el partido termina cuando entre las dos parejas suman ' + pt.total + '. Así todos los partidos duran parecido.' : 'Gana la pareja que llega primero a ' + pt.total + ' puntos.') + ' Saca cada jugador por turnos (4 saques seguidos es lo habitual).</p>';
    if (pt.tipo === 'tiempo') h += '<label class="f">Minutos por partido' + sel('c-min', pt.min, [8, 10, 12, 15, 20, 25, 30].map((x) => [x, x + ' min']), 'PD.cpt(\'min\',+this.value)') + '</label><p class="hint full" style="margin:0">La app trae un cronómetro para la ronda. Se anotan los puntos o juegos que hizo cada pareja al sonar el tiempo.</p>';
    if (pt.tipo === 'sets') h += '<label class="f">Sets' + sel('c-sets', pt.sets, [[1, '1 set'], [3, 'Al mejor de 3']], 'PD.cpt(\'sets\',+this.value)') + '</label><label class="f">Juegos por set' + sel('c-jue', pt.juegos, [[4, 'A 4 juegos (corto)'], [6, 'A 6 juegos (normal)'], [9, 'A 9 juegos (pro set)']], 'PD.cpt(\'juegos\',+this.value)') + '</label>' +
      '<label class="f">En 40-40' + sel('c-oro', pt.oro ? 1 : 0, [[1, 'Punto de oro'], [0, 'Con ventaja']], 'PD.cpt(\'oro\',this.value===\'1\')') + '</label>' + (pt.sets === 3 ? '<label class="f">3.er set' + sel('c-stb', pt.stb ? 1 : 0, [[1, 'Súper tie-break a 10'], [0, 'Set completo']], 'PD.cpt(\'stb\',this.value===\'1\')') + '</label>' : '');
    if (P.puedeOtraRonda({ formato: c.formato })) h += '<label class="f">Rondas<input class="inp" id="c-rondas" type="number" min="1" max="40" inputmode="numeric" value="' + c.nRondas + '" onchange="PD.ccfg(\'nRondas\',Math.max(1,+this.value||1))"></label><p class="hint" style="margin:0;align-self:end">Unos ' + Math.round(c.nRondas * (P.minPartido(pt) + 2)) + ' min en total. Puedes añadir más rondas después.</p>';
    if (c.formato === 'rey') h += '<label class="f full">¿Cómo se mueven?' + sel('c-reyp', c.reyParejas ? 1 : 0, [[0, 'Por jugador: las parejas se separan al subir o bajar'], [1, 'Con parejas fijas: la pareja sube o baja junta']], 'PD.ccfg(\'reyParejas\',this.value===\'1\')') + '</label>';
    if (c.formato === 'liga' || c.formato === 'grupos') h += '<label class="f">Vueltas' + sel('c-vu', c.vueltas || 1, [[1, 'Solo ida'], [2, 'Ida y vuelta']], 'PD.ccfg(\'vueltas\',+this.value)') + '</label>';
    if (c.formato === 'grupos') { const n = W.lista.length; h += '<label class="f">Grupos' + sel('c-ng', c.nGrupos, Array.from({ length: Math.max(1, Math.floor(n / 3)) }, (_, i) => [i + 1, (i + 1) + (i ? ' grupos' : ' grupo')]), 'PD.ccfg(\'nGrupos\',+this.value)') + '</label><label class="f">Pasan por grupo' + sel('c-pa', c.pasan, [[1, '1 (el primero)'], [2, '2'], [3, '3'], [4, '4']], 'PD.ccfg(\'pasan\',+this.value)') + '</label>'; }
    if (c.formato === 'grupos' || c.formato === 'elim') h += '<label class="f">Partido por el 3.er puesto' + sel('c-3', c.tercer ? 1 : 0, [[1, 'Sí'], [0, 'No']], 'PD.ccfg(\'tercer\',this.value===\'1\')') + '</label>';
    if (c.formato === 'elim') h += '<label class="f">Cuadro de consolación' + sel('c-co', c.consolacion ? 1 : 0, [[1, 'Sí: quien pierde su primer partido sigue jugando'], [0, 'No']], 'PD.ccfg(\'consolacion\',this.value===\'1\')') + '</label>';
    if (c.formato === 'escalera') h += '<label class="f">Se puede retar hasta' + sel('c-sa', c.saltos || 3, [1, 2, 3, 4, 5].map((x) => [x, x + (x === 1 ? ' puesto arriba' : ' puestos arriba')]), 'PD.ccfg(\'saltos\',+this.value)') + '</label>';
    if (ind && c.formato !== 'rey') h += '<label class="f full">La tabla se ordena por' + sel('c-crit', c.crit, [['puntos', 'Puntos sumados (lo clásico)'], ['promedio', 'Promedio por partido (justo si unos descansan más)'], ['victorias', 'Partidos ganados']], 'PD.ccfg(\'crit\',this.value)') + '</label>';
    if (!ind) h += '<p class="hint full" style="margin:0">La tabla se ordena por partidos ganados; si hay empate, por diferencia de ' + (pt.tipo === 'sets' ? 'sets, luego de juegos' : 'puntos') + ' y luego por quién le ganó a quién.</p>';
    const tieneNivel = W.rotan ? W.lista.some((j) => +j.nv !== 3) : false;
    if (c.formato !== 'americano' && c.formato !== 'mixto' || tieneNivel) h += '<label class="f full">' + (c.formato === 'americano' || c.formato === 'mixto' ? 'Usar los niveles para que los partidos queden parejos' : 'Ordenar la primera ronda / siembra por nivel') + sel('c-niv', c.nivelar ? 1 : 0, [[0, 'No, al azar'], [1, 'Sí, usar los niveles']], 'PD.ccfg(\'nivelar\',this.value===\'1\')') + '</label>';
    h += '</div></div><div class="card"><h3>Resumen</h3><p class="paso"><i>1</i><span><b>' + esc(W.nombre || P.F[c.formato].t) + '</b> · ' + fdia(W.fecha) + '</span></p><p class="paso"><i>2</i><span>' + W.lista.length + (W.rotan ? ' jugadores' : ' parejas') + ' en ' + W.canchas + (W.canchas === 1 ? ' cancha' : ' canchas') + '</span></p><p class="paso"><i>3</i><span>' + esc(P.ptTexto(pt)) + '</span></p>' +
      '<p class="hint">' + F.ideal + '</p></div></div><div class="row" style="margin-top:18px"><button class="btn sec" onclick="PD.w({paso:4})">Atrás</button><button class="btn" id="w-empezar" onclick="PD.empezar()">' + ico('player-play') + ' Empezar torneo</button></div>';
    return h;
  };
  window.W_set = (k, v) => { W[k] = v; };

  /* ---------- partidos ---------- */
  let verRonda = null;
  const cancha = (t, m) => (m.c != null ? t.canchas[m.c] || 'Cancha ' + (m.c + 1) : '');
  function tarjeta(t, m, etiqueta) {
    const r = P.res(m, t.pt); const sets = t.pt.tipo === 'sets';
    const lado = (L, k) => {
      const w = r && r.w === k; let inp;
      if (sets) { const n = t.pt.sets === 3 ? 3 : 1; inp = Array.from({ length: n }, (_, i) => '<input class="st num" inputmode="numeric" aria-label="Set ' + (i + 1) + '" value="' + esc((m.sets[i] || [])[k === 'A' ? 0 : 1] ?? '') + '" onchange="PD.sc(\'' + m.id + '\',\'' + k + '\',' + i + ',this.value)"' + (i === 2 && t.pt.stb ? ' placeholder="TB"' : '') + '>').join(''); }
      else inp = '<input class="num" inputmode="numeric" aria-label="Puntos" value="' + esc(k === 'A' ? m.sa : m.sb) + '" onchange="PD.sc(\'' + m.id + '\',\'' + k + '\',0,this.value)"' + (t.pt.tipo === 'total' ? ' oninput="PD.auto(\'' + m.id + '\',\'' + k + '\',this)"' : '') + '>';
      return '<div class="ms"><div class="ln' + (w ? ' w' : '') + '">' + esc(P.lado(t, L)) + '</div>' + inp + '</div>';
    };
    return '<div class="mt' + (m.ok ? ' ok' : '') + '" id="mt-' + m.id + '"><div class="mh"><span>' + esc(etiqueta || cancha(t, m)) + (m.g ? ' · Grupo ' + m.g : '') + (m.turno > 1 ? ' · turno ' + m.turno : '') + '</span>' + (m.ok ? '<span class="tag ok">' + (r.w === 'E' ? 'Empate' : 'Listo') + '</span>' : '<span class="tag mut">Por jugar</span>') + '</div>' + lado(m.A, 'A') + lado(m.B, 'B') + '<p class="merr"></p></div>';
  }
  V.t = () => { const t = T(); return '<div class="row" style="margin-bottom:6px"><div><h1>' + esc(t.nombre) + '</h1><p class="sub" style="margin:0">' + esc(P.F[t.formato].t) + ' · ' + esc(P.ptTexto(t.pt)) + '</p></div></div><div style="margin-top:18px">' + TV[sub](t) + '</div>'; };
  const TV = {};
  TV.partidos = (t) => {
    if (t.formato === 'escalera') return retos(t);
    if (t.formato === 'elim') return pendientesCuadro(t);
    if (t.formato === 'grupos' && t.cuadro) return '<div class="row"><button class="lnk" onclick="PD.verGrupos()">Ver partidos de la fase de grupos</button></div>' + pendientesCuadro(t);
    if (!t.rondas.length) return '<div class="card empty">Sin rondas todavía.</div>';
    const actual = t.rondas.findIndex((r) => r.partidos.some((m) => !m.ok)); const cur = actual < 0 ? t.rondas.length - 1 : actual;
    const ri = verRonda != null && t.rondas[verRonda] ? verRonda : cur; const r = t.rondas[ri];
    let h = '<div class="rondas" id="rondas">' + t.rondas.map((x, i) => '<button class="' + (i === ri ? 'on ' : '') + (x.partidos.every((m) => m.ok) ? 'ok' : '') + '" onclick="PD.ronda(' + i + ')">' + (t.formato === 'grupos' || t.formato === 'liga' ? 'Jornada ' : 'Ronda ') + x.n + '</button>').join('') + '</div>';
    h += '<div class="row"><h3 style="margin:0">' + (t.formato === 'grupos' || t.formato === 'liga' ? 'Jornada ' : 'Ronda ') + r.n + (ri === cur && t.estado !== 'terminado' ? ' · la que toca' : '') + '</h3><span class="sp"></span>' + (t.pt.tipo === 'tiempo' && t.estado !== 'terminado' ? '<span class="crono" id="crono">' + pad(t.pt.min) + ':00</span><button class="btn sec sm" id="b-crono" onclick="PD.crono()">' + ico('player-play') + ' Cronómetro</button>' : '') + '</div>';
    if (r.desc && r.desc.length) h += '<div class="descansa">' + ico('coffee') + ' Descansa' + (r.desc.length > 1 ? 'n' : '') + ': <b>' + r.desc.map((x) => esc(P.nom(t, x))).join(', ') + '</b></div>';
    h += '<div class="mts">' + r.partidos.map((m) => tarjeta(t, m)).join('') + '</div>';
    const lista = r.partidos.every((m) => m.ok); const ultima = ri === t.rondas.length - 1;
    if (t.estado === 'terminado') h += '<div class="card"><b>Torneo terminado.</b> <button class="lnk" onclick="location.hash=\'t/tabla\'">Ver la tabla final</button></div>';
    else if (t.formato === 'grupos') { if (P.gruposListos(t)) h += '<div class="card" style="background:var(--dorado-suave);border-color:var(--dorado-suave)"><b>Terminó la fase de grupos.</b><p class="hint" style="color:var(--tinta)">Pasan ' + (t.pasan || 2) + ' por grupo al cuadro final.</p><button class="btn" id="b-cuadro" onclick="PD.cuadroFinal()">' + ico('tournament') + ' Armar el cuadro final</button></div>'; else if (lista && !ultima) h += '<div class="row"><button class="btn" onclick="PD.ronda(' + (ri + 1) + ')">Ir a la jornada ' + (r.n + 1) + '</button></div>'; }
    else if (lista && !ultima) h += '<div class="row"><button class="btn" id="b-sig" onclick="PD.ronda(' + (ri + 1) + ')">Ir a la ronda ' + (r.n + 1) + ' ' + ico('arrow-right') + '</button></div>';
    else if (lista && ultima) {
      h += '<div class="card" style="background:var(--dorado-suave);border-color:var(--dorado-suave)"><b>' + (t.formato === 'liga' ? 'Se jugaron todos los partidos.' : 'Ronda ' + r.n + ' completa.') + '</b><div class="row" style="margin:12px 0 0">' +
        (P.puedeOtraRonda(t) ? '<button class="btn" id="b-otra" onclick="PD.otra()">' + ico('plus') + ' ' + (t.formato === 'mexicano' || t.formato === 'rey' ? 'Armar la ronda ' + (r.n + 1) + ' según la tabla' : 'Añadir otra ronda') + '</button>' : '') +
        '<button class="btn ' + (P.puedeOtraRonda(t) ? 'sec' : '') + '" id="b-fin" onclick="PD.terminar()">' + ico('flag') + ' Terminar y ver ganadores</button></div></div>';
    }
    return h;
  };
  function pendientesCuadro(t) {
    const cus = [t.cuadro, t.consol].filter(Boolean); let h = '';
    const pend = cus.flatMap((cu) => P.cuadroPartidos(cu).filter((m) => !m.ok && m.A.length && m.B.length && m.A[0] !== 'BYE' && m.B[0] !== 'BYE').map((m) => [cu, m]));
    const lista = P.consolacionLista(t);
    if (lista) h += '<div class="card" style="background:var(--dorado-suave);border-color:var(--dorado-suave);margin-bottom:12px"><b>Ya se puede armar la consolación</b><p class="hint" style="color:var(--tinta)">' + lista.length + ' parejas perdieron su primer partido y siguen jugando.</p><button class="btn" onclick="PD.consol()">Armar consolación</button></div>';
    const camp = campeon(t);
    if (camp) h += '<div class="card" style="margin-bottom:12px">' + ico('trophy') + ' <b>Campeones: ' + esc(P.nom(t, camp)) + '</b> · <button class="lnk" onclick="location.hash=\'t/cuadro\'">Ver el cuadro</button></div>';
    h += pend.length ? '<h3>Próximos partidos</h3><div class="mts">' + pend.map(([cu, m]) => tarjeta(t, m, (m.tercer ? '3.er puesto' : (cu === t.consol ? 'Consolación · ' : '') + P.nombreRonda(cu, m.r)) + (m.c != null ? ' · ' + cancha(t, m) : ''))).join('') + '</div>' : (camp ? '' : '<div class="card empty">No hay partidos listos para jugar.</div>');
    if (camp && t.estado !== 'terminado') h += '<button class="btn" onclick="PD.terminar()">' + ico('flag') + ' Terminar torneo</button>';
    return h;
  }
  const campeon = (t) => { if (!t.cuadro) return null; const f = t.cuadro.rondas[t.cuadro.rondas.length - 1][0]; return f.ok ? (f.bye ? (f.A[0] !== 'BYE' ? f.A[0] : f.B[0]) : P.ganador(f, t.pt)) : null; };
  function retos(t) {
    const R = t.ranking; const opt = (ids, v) => ids.map((id) => '<option value="' + id + '"' + (id === v ? ' selected' : '') + '>' + (R.indexOf(id) + 1) + '. ' + esc(P.nom(t, id)) + '</option>').join('');
    const ret = E.ret && R.includes(E.ret) ? E.ret : R[R.length - 1]; const i = R.indexOf(ret); const posibles = R.slice(Math.max(0, i - (t.saltos || 3)), i);
    let h = '<div class="g2"><div class="card"><h3>Anotar un reto</h3>' + (posibles.length ? '<div class="form"><label class="f">Pareja que reta<select class="inp" id="r-ret" onchange="PD.ret(this.value)">' + opt(R.slice(1), ret) + '</select></label><label class="f">Pareja retada<select class="inp" id="r-rdo">' + opt(posibles, posibles[posibles.length - 1]) + '</select></label><label class="f">Fecha<input class="inp" type="date" id="r-f" value="' + hoy() + '"></label></div><p class="hint">Después de crear el reto, anota el resultado en su tarjeta.</p><button class="btn" id="b-reto" onclick="PD.reto()">' + ico('swords') + ' Crear reto</button>' : '<p class="hint">La pareja de arriba no puede retar a nadie: elige otra.</p>') + '</div>' +
      '<div class="card"><h3>Cómo funciona</h3><p class="paso"><i>1</i><span>Una pareja reta a otra que esté hasta ' + (t.saltos || 3) + ' puestos más arriba.</span></p><p class="paso"><i>2</i><span>Si gana la retadora, toma ese puesto y las demás bajan uno.</span></p><p class="paso"><i>3</i><span>Si gana la retada, todo queda igual.</span></p></div></div>';
    const pend = t.retos.filter((m) => !m.ok), hechos = t.retos.filter((m) => m.ok).reverse();
    if (pend.length) h += '<h3 style="margin-top:18px">Retos por jugar</h3><div class="mts">' + pend.map((m) => tarjeta(t, m, 'Reto · ' + fdia(m.fecha)).replace('</div><p class="merr">', '</div><p class="merr">') + '').join('') + '</div>';
    if (hechos.length) h += '<h3 style="margin-top:18px">Historial</h3><div class="card" style="padding:0"><table><tbody>' + hechos.map((m) => '<tr><td>' + fdia(m.fecha) + '</td><td class="wrap"><b>' + esc(P.nom(t, m.A[0])) + '</b> retó a <b>' + esc(P.nom(t, m.B[0])) + '</b> · ' + esc(P.marcador(m, t.pt)) + '</td><td>' + (m.sube ? '<span class="tag ok">Subió</span>' : '<span class="tag mut">Sin cambio</span>') + '</td><td class="r"><button class="lnk bad" onclick="PD.borraReto(\'' + m.id + '\')">Borrar</button></td></tr>').join('') + '</tbody></table></div>';
    return h;
  }
  const E = {};

  /* ---------- tabla ---------- */
  TV.tabla = (t) => {
    const ind = P.ind(t); let h = '';
    const comp = '<div class="row no-print"><button class="btn sec" id="b-wa" onclick="PD.wa()">' + ico('brand-whatsapp') + ' Compartir por WhatsApp</button><button class="btn sec" onclick="PD.copiar()">' + ico('copy') + ' Copiar texto</button><button class="btn sec" onclick="print()">' + ico('printer') + ' Imprimir</button></div>';
    if (t.formato === 'escalera') return comp + '<div class="card" style="padding:0"><table><thead><tr><th>#</th><th>Pareja</th><th class="r">Retos</th><th class="r">Ganados</th></tr></thead><tbody>' + t.ranking.map((id, i) => { const x = P.tabla(t).find((r) => r.id === id) || { pj: 0, g: 0 }; return '<tr><td>' + (i + 1) + '</td><td>' + esc(P.nom(t, id)) + '</td><td class="r">' + x.pj + '</td><td class="r">' + x.g + '</td></tr>'; }).join('') + '</tbody></table></div>';
    const camp = campeon(t);
    if (t.cuadro) { const f = t.cuadro.rondas[t.cuadro.rondas.length - 1][0]; if (camp) { const sub = f.A[0] === camp ? f.B[0] : f.A[0]; const ter = t.cuadro.tercer && t.cuadro.tercer.ok ? P.ganador(t.cuadro.tercer, t.pt) : null; h += podio([camp, sub, ter].map((x) => x && P.nom(t, x)), ['Campeones', 'Subcampeones', '3.er puesto']); } }
    const tablaHTML = (tb, grupo) => {
      const sets = t.pt.tipo === 'sets'; const pas = grupo ? (t.pasan || 2) : 0;
      return '<div class="card scroll" style="padding:0;margin-bottom:12px">' + (grupo ? '<h3 style="padding:15px 18px 0">Grupo ' + grupo + '</h3>' : '') + '<table><thead><tr><th>#</th><th>' + (ind ? 'Jugador' : 'Pareja') + '</th>' + (t.formato === 'rey' ? '<th class="r">Pts de pista</th>' : '') + (ind && t.crit !== 'victorias' && t.formato !== 'rey' ? '<th class="r">' + (t.crit === 'promedio' ? 'Promedio' : 'Puntos') + '</th>' : '') + '<th class="r">PJ</th><th class="r">G</th>' + (t.pt.tipo === 'tiempo' || (ind && t.pt.tipo !== 'sets') ? '<th class="r hm">E</th>' : '') + '<th class="r">P</th>' + (sets ? '<th class="r hm">Sets</th>' : '') + '<th class="r hm">' + (sets ? 'Juegos' : 'Pts a favor') + '</th><th class="r">Dif.</th>' + (ind ? '<th class="r hm">Descansó</th>' : '') + '</tr></thead><tbody>' +
        tb.map((r, i) => '<tr class="' + (i < pas ? 'pasa' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(P.nom(t, r.id)) + '</td>' + (t.formato === 'rey' ? '<td class="r"><b>' + r.pista + '</b></td>' : '') + (ind && t.crit !== 'victorias' && t.formato !== 'rey' ? '<td class="r"><b>' + (t.crit === 'promedio' ? r.prom.toFixed(1) : r.pf) + '</b></td>' : '') + '<td class="r">' + r.pj + '</td><td class="r">' + (ind && t.crit !== 'victorias' ? r.g : '<b>' + r.g + '</b>') + '</td>' + (t.pt.tipo === 'tiempo' || (ind && t.pt.tipo !== 'sets') ? '<td class="r hm">' + r.e + '</td>' : '') + '<td class="r">' + r.p + '</td>' + (sets ? '<td class="r hm">' + r.sf + '-' + r.sc + '</td>' : '') + '<td class="r hm">' + r.pf + '</td><td class="r">' + (r.dif > 0 ? '+' : '') + r.dif + '</td>' + (ind ? '<td class="r hm">' + r.desc + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>';
    };
    if (t.grupos) { h += comp + t.grupos.map((g) => tablaHTML(P.tabla(t, g.n), g.n)).join('') + '<p class="hint">Las marcadas con la raya dorada pasan al cuadro final. Desempate: ganados, diferencia de ' + (t.pt.tipo === 'sets' ? 'sets y juegos' : 'puntos') + ' y quién le ganó a quién.</p>'; return h; }
    if (t.formato === 'elim') return h + comp + (camp ? '' : '<div class="card empty">Cuando se juegue la final aparecen los ganadores. <button class="lnk" onclick="location.hash=\'t/cuadro\'">Ver el cuadro</button></div>');
    const tb = P.tabla(t);
    if (t.estado === 'terminado' && tb.length >= 3) h += podio(tb.slice(0, 3).map((r) => P.nom(t, r.id)), ['1.er lugar', '2.º lugar', '3.er lugar'], tb.slice(0, 3).map((r) => t.formato === 'rey' ? r.pista + ' pts de pista' : ind && t.crit !== 'victorias' ? (t.crit === 'promedio' ? r.prom.toFixed(1) + ' de promedio' : r.pf + ' puntos') : r.g + ' ganados'));
    return h + comp + tablaHTML(tb) + '<p class="hint">' + (t.formato === 'rey' ? 'Ganar en la cancha 1 da ' + t.canchas.length + ' puntos de pista; en la última, 1. Desempate: ganados y diferencia.' : ind ? 'Orden: ' + ({ puntos: 'puntos sumados', promedio: 'promedio por partido', victorias: 'partidos ganados' }[t.crit || 'puntos']) + '; luego ganados y diferencia.' : 'Orden: ganados, diferencia de ' + (t.pt.tipo === 'sets' ? 'sets y juegos' : 'puntos') + ' y quién le ganó a quién.') + '</p>';
  };
  const podio = (n, tit, det) => '<div class="podio">' + [1, 0, 2].map((i) => n[i] ? '<div class="p' + (i + 1) + '"><i>' + (i + 1) + '</i><b>' + esc(n[i]) + '</b><small>' + tit[i] + (det ? ' · ' + det[i] : '') + '</small></div>' : '<div style="visibility:hidden"></div>').join('') + '</div>';

  /* ---------- cuadro ---------- */
  TV.cuadro = (t) => {
    if (!t.cuadro) return '<div class="card empty">' + (t.formato === 'grupos' ? 'El cuadro final se arma cuando termine la fase de grupos.' : 'Sin cuadro.') + '</div>';
    const caja = (cu, m) => { const r = P.res(m, t.pt); const g = m.ok && !m.bye ? P.ganador(m, t.pt) : m.bye ? (m.A[0] !== 'BYE' ? m.A[0] : m.B[0]) : null;
      const fila = (L, k) => { const id = L[0]; const sc = r && !m.bye ? (t.pt.tipo === 'sets' ? (m.sets || []).filter((s) => s && s[0] !== '').map((s) => s[k === 'A' ? 0 : 1]).join(' ') : (k === 'A' ? m.sa : m.sb)) : ''; return '<div class="' + (!id ? 'tbd' : id === g ? 'w' : '') + '"><span>' + (id ? esc(P.nom(t, id)) : 'Por definir') + '</span><span class="num">' + sc + '</span></div>'; };
      return '<button class="bm' + (m.bye ? ' bye' : '') + '"' + (m.bye || !m.A.length || !m.B.length ? ' disabled' : ' onclick="PD.bm(\'' + m.id + '\')"') + '>' + (m.c != null && !m.ok && m.A.length && m.B.length ? '<small>' + esc(cancha(t, m)) + '</small>' : '') + fila(m.A, 'A') + fila(m.B, 'B') + '</button>'; };
    const dib = (cu) => '<h3>' + esc(cu.nombre) + '</h3><div class="bk">' + cu.rondas.map((ms, ri) => '<div class="col"><b>' + P.nombreRonda(cu, ri) + '</b>' + ms.map((m) => caja(cu, m)).join('') + (cu.tercer && ri === cu.rondas.length - 1 ? '<b style="margin-top:18px">3.er puesto</b>' + caja(cu, cu.tercer) : '') + '</div>').join('') + '</div>';
    return '<p class="hint" style="margin-top:0">Toca un partido para anotar o corregir el resultado. El ganador pasa solo a la siguiente ronda.</p>' + dib(t.cuadro) + (t.consol ? dib(t.consol) : '');
  };

  /* ---------- ajustes del torneo ---------- */
  TV.ajustes = (t) => {
    const ind = P.ind(t); const rot = P.puedeOtraRonda(t);
    let h = '<div class="g2"><div class="card"><h3>' + (ind ? 'Jugadores' : 'Parejas') + '</h3><table><tbody>' + (ind ? t.jug : t.par).map((e) => '<tr' + (e.baja ? ' class="off"' : '') + '><td>' + esc(P.nom(t, e.id)) + '</td><td class="r"><button class="lnk" onclick="PD.renombrar(\'' + e.id + '\')">Cambiar nombre</button>' + (rot && t.formato !== 'rey' ? ' · <button class="lnk' + (e.baja ? '' : ' bad') + '" onclick="PD.baja(\'' + e.id + '\')">' + (e.baja ? 'Volver a sumarlo' : 'Se retiró') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table>' +
      (rot && ind && t.formato !== 'rey' ? '<div class="row" style="margin-top:12px"><input class="inp" id="a-nuevo" placeholder="Nombre de quien llega tarde" style="flex:1"><button class="btn sec" onclick="PD.tarde()">Sumar</button></div><p class="hint">Quien se suma o se retira cuenta desde la próxima ronda que se arme.</p>' : '') + '</div>' +
      '<div class="card"><h3>Torneo</h3><div class="form"><label class="f full">Nombre<input class="inp" id="a-nom" value="' + esc(t.nombre) + '"></label><label class="f">Fecha<input class="inp" type="date" id="a-fecha" value="' + t.fecha + '"></label><label class="f full">Nombres de las canchas (uno por línea)<textarea class="inp" id="a-can" rows="3">' + esc(t.canchas.join('\n')) + '</textarea></label></div><div class="row" style="margin-top:12px"><button class="btn" onclick="PD.guardaT()">Guardar</button></div>' +
      '<details class="mas"><summary>Más acciones</summary><div class="row" style="margin-top:12px">' + (t.estado === 'terminado' ? '<button class="btn sec" onclick="PD.reabrir()">Reabrir el torneo</button>' : '<button class="btn sec" onclick="PD.terminar()">Terminar el torneo</button>') + '<button class="btn sec" onclick="PD.duplicar()">Repetir con la misma gente</button><button class="btn danger" onclick="PD.borrar()">Borrar torneo</button></div></details></div></div>';
    return h;
  };

  /* ---------- formatos, jugadores, configuración ---------- */
  V.formatos = () => '<h1>¿Qué formato elijo?</h1><p class="sub">Si no sabes, empieza un torneo nuevo: con 3 preguntas te decimos cuál conviene.</p><div class="fmt">' + Object.entries(P.F).map(([k, f]) => '<div class="card"><b>' + ico(f.ic.replace('ti-', '')) + f.t + '</b><p>' + f.largo + '</p><p class="hint"><b>Ideal para:</b> ' + f.ideal + '</p><button class="btn sec sm" onclick="PD.conFormato(\'' + k + '\')">Usar este formato</button></div>').join('') + '</div>' +
    '<h3 style="margin-top:24px">Formas de contar los partidos</h3><div class="card"><p class="paso"><i>1</i><span><b>Puntos totales (16, 24 o 32).</b> Cada saque es un punto y el partido termina cuando la suma llega al total. Todos los partidos duran parecido: lo clásico del americano.</span></p><p class="paso"><i>2</i><span><b>A X puntos.</b> Gana la pareja que llega primero.</span></p><p class="paso"><i>3</i><span><b>Por tiempo.</b> Se juega X minutos y se anota lo que hizo cada pareja. Puede haber empate.</span></p><p class="paso"><i>4</i><span><b>Sets y juegos.</b> A 4, 6 o 9 juegos; 1 set o al mejor de 3 con súper tie-break; con punto de oro o con ventaja.</span></p></div>';
  V.jugadores = () => '<h1>Jugadores</h1><p class="sub">Los que ya jugaron quedan aquí para armar el próximo torneo más rápido.</p><div class="g2"><div class="card" style="padding:0"><table><thead><tr><th>Nombre</th><th>Género</th><th>Nivel</th><th></th></tr></thead><tbody>' +
    S.dir.slice().sort((a, b) => a.n.localeCompare(b.n)).map((j) => '<tr><td>' + esc(j.n) + '</td><td><select class="inp" style="min-height:36px;width:auto" onchange="PD.dir(\'' + j.id + '\',\'g\',this.value)"><option value="">—</option><option value="H"' + (j.g === 'H' ? ' selected' : '') + '>Hombre</option><option value="M"' + (j.g === 'M' ? ' selected' : '') + '>Mujer</option></select></td><td><select class="inp" style="min-height:36px;width:auto" onchange="PD.dir(\'' + j.id + '\',\'nv\',+this.value)">' + [1, 2, 3, 4, 5].map((v) => '<option' + (+j.nv === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></td><td class="r"><button class="lnk bad" onclick="PD.dirDel(\'' + j.id + '\')">Quitar</button></td></tr>').join('') +
    '</tbody></table></div><div class="card"><h3>Agregar</h3><div class="form"><label class="f full">Nombre<input class="inp" id="d-n"></label><label class="f">Género<select class="inp" id="d-g"><option value="">—</option><option value="H">Hombre</option><option value="M">Mujer</option></select></label><label class="f">Nivel<select class="inp" id="d-nv"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label></div><div class="row" style="margin-top:12px"><button class="btn" onclick="PD.dirAdd()">Agregar</button></div><p class="hint">Nivel: 1 = empezando, 3 = intermedio, 5 = avanzado. Sirve para sembrar y para el mexicano.</p></div></div>';
  V.config = () => '<h1>Configuración</h1><p class="sub">Respaldo y datos de ejemplo.</p><div class="g2e"><div class="card"><h3>Respaldo</h3><p class="hint" style="margin-top:0">Tus datos viven solo en este navegador y en este equipo. <b>Si abres la app en tu teléfono o en otra computadora, no vas a ver lo que registraste aquí.</b> Para pasarlos: descarga el respaldo aquí y, en el otro equipo, toca «Cargar respaldo».</p><div class="row"><button class="btn" onclick="PD.respaldo()">' + ico('download') + ' Descargar respaldo</button><label class="btn sec">' + ico('upload') + ' Cargar respaldo<input type="file" accept=".json" hidden onchange="PD.restaurar(this.files[0])"></label></div></div>' +
    '<div class="card"><h3>Empezar de nuevo</h3><div class="row"><button class="btn sec" onclick="PD.reset(\'demo\')">Volver a los datos de ejemplo</button><button class="btn danger" onclick="PD.reset(\'blanco\')">Empezar en blanco</button></div></div></div>';

  /* ---------- acciones ---------- */
  let cronoT = null;
  const PD = window.PD = {
    cerrar,
    limpiarW() { W = null; },
    abrir(id) { S.activo = id; save(); verRonda = null; location.hash = 't/partidos'; },
    w(o) { Object.assign(W, o); if (o.paso === 2 || o.rotan != null) parseLista(); go(); },
    wtxt(v) { W.txt = v; const L = parseLista(); const c = $('w-cuenta'); if (c) c.textContent = cuentaTxt(L.length, !W.rotan); },
    wab(o) { W.abierto = o; },
    wadd(n) { W.txt = (W.txt.trim() ? W.txt.replace(/\s+$/, '') + '\n' : '') + n + (W.rotan ? '' : ' / '); parseLista(); go(); const ta = $('w-txt'); if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } },
    wset(i, k, v) { W.lista[i][k] = v; W.abierto = true; go(); },
    wsig2() { const L = parseLista(); if (!W.rotan && L.some((p) => !p.b)) return toast('Cada línea tiene que tener 2 nombres separados por /', true); const min = W.rotan ? 4 : 2; if (L.length < min) return toast(W.rotan ? 'Hacen falta al menos 4 jugadores' : 'Hacen falta al menos 2 parejas', true); W.paso = 3; go(); },
    wc(d) { W.canchas = Math.max(1, Math.min(20, W.canchas + d)); $('w-c').textContent = W.canchas; },
    welige(i) {
      const r = W.R[i]; W.f = r.f;
      W.cfg = { formato: r.f, pt: Object.assign({ tipo: 'total', total: 24, min: 15, sets: 1, juegos: 6, oro: true, stb: true }, r.pt), nRondas: r.nRondas || P.rondasSugeridas(r.f, W.lista.length, W.canchas), crit: P.F[r.f].ind ? (r.f === 'americano' || r.f === 'mixto' ? (W.lista.length % 4 ? 'promedio' : 'puntos') : 'puntos') : 'victorias', nGrupos: r.nGrupos || 2, pasan: r.pasan || 2, tercer: r.tercer ?? true, consolacion: r.consolacion ?? true, vueltas: 1, saltos: 3, reyParejas: false, nivelar: W.niveles === 'distintos' || W.lista.some((j) => j.nv && +j.nv !== 3) };
      if (r.f === 'rey' && W.rotan === false) W.cfg.reyParejas = true;
      W.paso = 5; go();
    },
    cpt(k, v) { W.cfg.pt[k] = v; if (k === 'tipo' && v === 'sets' && !W.cfg.pt.juegos) W.cfg.pt.juegos = 6; go(); },
    ccfg(k, v) { W.cfg[k] = v; go(); },
    conFormato(f) { W = nuevoW(f); location.hash = 'nuevo'; go(); },
    empezar() {
      const c = W.cfg; const t = base({ nombre: (W.nombre || '').trim() || P.F[c.formato].t + ' ' + fdia(W.fecha).slice(0, 5), fecha: W.fecha, formato: c.formato, canchas: Array.from({ length: W.canchas }, (_, i) => 'Cancha ' + (i + 1)), pt: c.pt, crit: c.crit, nivelar: c.nivelar, nRondas: c.nRondas, nGrupos: c.nGrupos, pasan: c.pasan, tercer: c.tercer, consolacion: c.consolacion, vueltas: c.vueltas, saltos: c.saltos, reyParejas: c.reyParejas });
      const getJ = (n, extra) => { const nn = n.trim(); let d = S.dir.find((x) => x.n.toLowerCase() === nn.toLowerCase()); if (!d) { d = { id: uid(), n: nn, g: (extra && extra.g) || '', nv: (extra && extra.nv) || 3 }; S.dir.push(d); } else if (extra) { if (extra.g) d.g = extra.g; if (extra.nv) d.nv = extra.nv; } let j = t.jug.find((x) => x.n.toLowerCase() === nn.toLowerCase()); if (!j) { j = { id: uid(), n: nn, g: d.g, nv: d.nv }; t.jug.push(j); } return j.id; };
      if (W.rotan) W.lista.forEach((j) => getJ(j.n, { g: j.g, nv: j.nv }));
      else W.lista.forEach((p) => t.par.push({ id: uid(), a: getJ(p.a), b: getJ(p.b) }));
      if (c.formato === 'rey' && c.reyParejas && W.rotan) { for (let i = 0; i + 1 < t.jug.length; i += 2) t.par.push({ id: uid(), a: t.jug[i].id, b: t.jug[i + 1].id }); }
      if (c.formato === 'mixto') { const h = t.jug.filter((j) => j.g === 'H').length, m = t.jug.filter((j) => j.g === 'M').length; if (h < 2 || m < 2) return toast('Para el mixto marca el género de cada jugador (Más opciones, en el paso 2): hacen falta 2 hombres y 2 mujeres como mínimo.', true); }
      try { P.iniciar(t); } catch (e) { return toast(e.message, true); }
      S.torneos.push(t); S.activo = t.id; save(); W = null; verRonda = null; location.hash = 't/partidos';
    },
    ronda(i) { verRonda = i; rerender(); },
    auto(id, k, el) { const t = T(); const m = P.buscar(t, id); if (!m || t.pt.tipo !== 'total') return; const v = parseInt(el.value, 10); const card = $('mt-' + id); const otro = card.querySelectorAll('input')[k === 'A' ? 1 : 0]; if (v >= 0 && v <= t.pt.total) otro.value = t.pt.total - v; },
    sc(id, k, i, val) {
      const t = T(); const m = P.buscar(t, id); if (!m) return; const v = String(val).trim() === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
      const card = $('mt-' + id); const ins = card.querySelectorAll('input');
      if (t.pt.tipo === 'sets') { const n = t.pt.sets === 3 ? 3 : 1; m.sets = Array.from({ length: n }, (_, s) => [ins[s].value.trim() === '' ? '' : +ins[s].value, ins[n + s].value.trim() === '' ? '' : +ins[n + s].value]); }
      else { if (t.pt.tipo === 'total' && v !== '' && v <= t.pt.total) { if (k === 'A') { m.sa = v; m.sb = t.pt.total - v; } else { m.sb = v; m.sa = t.pt.total - v; } } else { m.sa = ins[0].value.trim() === '' ? '' : +ins[0].value; m.sb = ins[1].value.trim() === '' ? '' : +ins[1].value; } }
      const err = P.validar(m, t.pt); const antes = m.ok;
      const completo = t.pt.tipo === 'sets' ? (m.sets[0] && m.sets[0][0] !== '' && m.sets[0][1] !== '') : (m.sa !== '' && m.sb !== '');
      card.querySelector('.merr').textContent = completo && err ? err : '';
      m.ok = !err;
      const cu = P.cuadroDe(t, m);
      if (cu && m.ok) { const e2 = P.resultadoCuadro(t, cu, m); if (e2) { m.ok = false; card.querySelector('.merr').textContent = e2; } }
      if (t.formato === 'escalera') { if (m.ok && P.res(m, t.pt).w === 'E') { m.ok = false; card.querySelector('.merr').textContent = 'Un reto no puede quedar empatado.'; } P.rehacerEscalera(t); }
      if (m.r != null && !cu && t.rondas[m.r] && t.rondas[m.r].partidos.includes(m)) verRonda = m.r;
      save();
      if (m.ok !== antes || m.ok) { if ($('dlg').open && m.ok) { cerrar(); } setTimeout(rerender, 0); }
    },
    crono() {
      const t = T(); const b = $('b-crono'); if (cronoT) { clearInterval(cronoT); cronoT = null; if (b) b.innerHTML = ico('player-play') + ' Cronómetro'; return; }
      const fin = Date.now() + t.pt.min * 60000; if (b) b.innerHTML = ico('player-stop') + ' Parar';
      cronoT = setInterval(() => { const el = $('crono'); if (!el) { clearInterval(cronoT); cronoT = null; return; } const s = Math.max(0, Math.round((fin - Date.now()) / 1000)); el.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60); if (!s) { el.textContent = '¡Tiempo!'; el.classList.add('fin'); clearInterval(cronoT); cronoT = null; const bb = $('b-crono'); if (bb) bb.innerHTML = ico('player-play') + ' Otra vez'; } }, 500);
    },
    otra() { const t = T(); try { P.otraRonda(t); } catch (e) { return toast(e.message, true); } save(); verRonda = t.rondas.length - 1; rerender(); },
    terminar() { const t = T(); t.estado = 'terminado'; save(); location.hash = 't/tabla'; },
    reabrir() { const t = T(); t.estado = 'activo'; save(); rerender(); toast('Torneo reabierto'); },
    cuadroFinal() { const t = T(); P.armarCuadroFinal(t); save(); location.hash = 't/cuadro'; },
    verGrupos() { const t = T(); const c = t.cuadro; t.cuadro = null; $('m').innerHTML = V.t(); t.cuadro = c; },
    consol() { const t = T(); const L = P.consolacionLista(t); if (!L) return; P.armarConsolacion(t, L); save(); rerender(); toast('Consolación armada'); },
    bm(id) { const t = T(); const m = P.buscar(t, id); const cu = P.cuadroDe(t, m); dlg(m.tercer ? '3.er puesto' : P.nombreRonda(cu, m.r), tarjeta(t, m, cu.nombre + (m.c != null ? ' · ' + cancha(t, m) : '')) + (m.ok ? '<p class="hint">Si cambias el resultado, se borra lo que se jugó después con ese ganador.</p>' : '')); },
    ret(v) { E.ret = v; rerender(); },
    reto() { const t = T(); const a = $('r-ret').value, b = $('r-rdo').value; const e = P.retoValido(t, a, b); if (e) return toast(e, true); t.retos.push({ id: uid(), A: [a], B: [b], sa: '', sb: '', sets: [], ok: false, fecha: $('r-f').value || hoy() }); save(); rerender(); toast('Reto creado: anota el resultado abajo'); },
    borraReto(id) { const t = T(); t.retos = t.retos.filter((m) => m.id !== id); P.rehacerEscalera(t); save(); rerender(); },
    wa() { const t = T(); window.open('https://wa.me/?text=' + encodeURIComponent(P.textoTabla(t)), '_blank', 'noopener'); },
    async copiar() { const t = T(); try { await navigator.clipboard.writeText(P.textoTabla(t)); toast('Copiado'); } catch (e) { dlg('Copia el texto', '<textarea class="inp" rows="12">' + esc(P.textoTabla(t)) + '</textarea>'); } },
    renombrar(id) { const t = T(); const j = t.jug.find((x) => x.id === id); const p = t.par.find((x) => x.id === id);
      if (j) dlg('Cambiar nombre', '<label class="f">Nombre<input class="inp" id="rn" value="' + esc(j.n) + '"></label>', '<button class="btn sec" onclick="PD.cerrar()">Cancelar</button><button class="btn" onclick="PD.rnOk(\'' + id + '\')">Guardar</button>');
      else dlg('Cambiar nombres', '<div class="form"><label class="f">Jugador 1<input class="inp" id="rn" value="' + esc(P.nom(t, p.a)) + '"></label><label class="f">Jugador 2<input class="inp" id="rn2" value="' + esc(P.nom(t, p.b)) + '"></label></div>', '<button class="btn sec" onclick="PD.cerrar()">Cancelar</button><button class="btn" onclick="PD.rnOk(\'' + id + '\')">Guardar</button>'); },
    rnOk(id) { const t = T(); const j = t.jug.find((x) => x.id === id); if (j) j.n = $('rn').value.trim() || j.n; else { const p = t.par.find((x) => x.id === id); const a = t.jug.find((x) => x.id === p.a), b = t.jug.find((x) => x.id === p.b); a.n = $('rn').value.trim() || a.n; b.n = $('rn2').value.trim() || b.n; } save(); cerrar(); rerender(); toast('Guardado'); },
    baja(id) { const t = T(); const e = (P.ind(t) ? t.jug : t.par).find((x) => x.id === id); e.baja = !e.baja; if (P.ind(t) && M_quedan(t) < 4) { e.baja = !e.baja; return toast('Tienen que quedar al menos 4 jugadores', true); } rehacerFuturas(t); save(); rerender(); toast(e.baja ? 'Retirado desde la próxima ronda' : 'Vuelve a jugar desde la próxima ronda'); },
    tarde() { const t = T(); const n = $('a-nuevo').value.trim(); if (!n) return; if (t.jug.some((j) => j.n.toLowerCase() === n.toLowerCase())) return toast('Ya está en el torneo', true); const d = S.dir.find((x) => x.n.toLowerCase() === n.toLowerCase()); t.jug.push({ id: uid(), n, g: d ? d.g : '', nv: d ? d.nv : 3 }); if (!d) S.dir.push({ id: uid(), n, g: '', nv: 3 }); rehacerFuturas(t); save(); rerender(); toast('Sumado desde la próxima ronda'); },
    guardaT() { const t = T(); t.nombre = $('a-nom').value.trim() || t.nombre; t.fecha = $('a-fecha').value || t.fecha; const c = $('a-can').value.split('\n').map((x) => x.trim()).filter(Boolean); c.forEach((x, i) => { t.canchas[i] = x; }); save(); rerender(); toast('Guardado'); },
    duplicar() { const t = T(); W = nuevoW(t.formato); W.rotan = P.ind(t) || (t.formato === 'rey'); W.txt = P.ind(t) || t.formato === 'rey' && !t.par.length ? t.jug.filter((j) => !j.baja).map((j) => j.n).join('\n') : t.par.map((p) => P.nom(t, p.a) + ' / ' + P.nom(t, p.b)).join('\n'); W.canchas = t.canchas.length; W.nombre = t.nombre; parseLista(); W.paso = 2; location.hash = 'nuevo'; go(); },
    borrar() { const t = T(); dlg('Borrar torneo', '<p>Se borra <b>' + esc(t.nombre) + '</b> con todos sus resultados. No se puede deshacer.</p>', '<button class="btn sec" onclick="PD.cerrar()">Cancelar</button><button class="btn danger" onclick="PD.borrarOk()">Borrar</button>'); },
    borrarOk() { S.torneos = S.torneos.filter((x) => x.id !== S.activo); S.activo = S.torneos[0] ? S.torneos[0].id : null; save(); cerrar(); location.hash = 'inicio'; },
    dir(id, k, v) { const j = S.dir.find((x) => x.id === id); j[k] = v; save(); toast('Guardado'); },
    dirDel(id) { S.dir = S.dir.filter((x) => x.id !== id); save(); rerender(); },
    dirAdd() { const n = $('d-n').value.trim(); if (!n) return toast('Escribe el nombre', true); if (S.dir.some((x) => x.n.toLowerCase() === n.toLowerCase())) return toast('Ya está en la lista', true); S.dir.push({ id: uid(), n, g: $('d-g').value, nv: +$('d-nv').value }); save(); rerender(); toast('Agregado'); },
    respaldo() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.download = 'padel-respaldo-' + hoy() + '.json'; a.click(); },
    restaurar(f) { if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.v !== 1 || !Array.isArray(d.torneos)) throw 0; S = d; save(); go(); toast('Respaldo cargado'); } catch (e) { toast('Ese archivo no es un respaldo de esta app', true); } }; r.readAsText(f); },
    reset(modo) { dlg(modo === 'demo' ? 'Volver a los datos de ejemplo' : 'Empezar en blanco', '<p>' + (modo === 'demo' ? 'Se borra lo que registraste y se cargan los torneos de ejemplo.' : 'Se borran todos los torneos y jugadores.') + ' Si quieres conservar algo, descarga antes el respaldo.</p>', '<button class="btn sec" onclick="PD.cerrar()">Cancelar</button><button class="btn danger" onclick="PD.resetOk(\'' + modo + '\')">Sí, continuar</button>'); },
    resetOk(modo) { S = modo === 'demo' ? seed() : { v: 1, torneos: [], activo: null, dir: [] }; save(); cerrar(); W = null; location.hash = 'inicio'; go(); toast('Listo'); }
  };
  const M_quedan = (t) => t.jug.filter((j) => !j.baja).length;
  // en el americano las rondas ya armadas que no se han empezado se rehacen al cambiar la gente
  function rehacerFuturas(t) {
    if (t.formato !== 'americano' && t.formato !== 'mixto') return;
    let k = t.rondas.length; while (k > 0 && t.rondas[k - 1].partidos.every((m) => !m.ok && m.sa === '' && !(m.sets || []).length)) k--;
    const faltan = t.rondas.length - k; t.rondas = t.rondas.slice(0, k); for (let i = 0; i < faltan; i++) P.rondaAmericano(t);
  }

  load(); go();
})();
