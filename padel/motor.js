/* PRB Consulting · Torneos de pádel · motor de formatos (sin pantalla, se puede probar en Node).
   Formatos: Americano, Americano mixto, Mexicano, Rey de la pista (Pozo), Todos contra todos,
   Grupos y cuadro final, Eliminación directa (con 3er puesto y consolación) y Escalera.
   Un "lado" de un partido es una lista de ids: 2 jugadores (formatos individuales) o 1 pareja (formatos por parejas). */
(function (root) {
  'use strict';
  const M = {};
  let rnd = Math.random;
  M.semilla = (s) => { let x = s >>> 0 || 1; rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
  M.azar = () => { rnd = Math.random; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const mezcla = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const k2 = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  /* ---------- catálogo ---------- */
  M.F = {
    americano: { t: 'Americano', ind: true, ic: 'ti-arrows-shuffle', min: 4, corto: 'Cambias de pareja en cada ronda y sumas tus puntos.', largo: 'Cada ronda juegas con un compañero distinto y contra rivales distintos. Cada jugador suma los puntos que hace; gana el que más sume al final. Nadie queda eliminado.', ideal: 'Grupos de amigos o noches de club, 8 a 24 jugadores.' },
    mixto: { t: 'Americano mixto', ind: true, mixto: true, ic: 'ti-gender-bigender', min: 4, corto: 'Como el americano, pero cada pareja es un hombre y una mujer.', largo: 'Funciona igual que el americano, con una regla: cada pareja es siempre hombre + mujer. Necesita la misma cantidad de hombres y mujeres (si sobra alguno, descansa por turnos).', ideal: 'Eventos mixtos.' },
    mexicano: { t: 'Mexicano', ind: true, ic: 'ti-chart-arrows-vertical', min: 4, corto: 'Juegan juntos los que van parejos en la tabla: partidos igualados.', largo: 'La primera ronda es por nivel o al azar. Desde la segunda, la app ordena la tabla y arma cada cancha con jugadores de puntaje parecido (1.º y 4.º contra 2.º y 3.º). Así los partidos quedan igualados aunque haya niveles distintos.', ideal: 'Grupos con niveles distintos, 8 a 48 jugadores.' },
    rey: { t: 'Rey de la pista (Pozo)', ind: true, ic: 'ti-crown', min: 8, corto: 'El que gana sube de cancha y el que pierde baja.', largo: 'La cancha 1 es la del rey. Después de cada ronda, los ganadores suben una cancha y los perdedores bajan una. Se suman puntos según la cancha donde ganas: ganar arriba vale más. Puede jugarse por jugador (las parejas se separan al moverse) o con parejas fijas.', ideal: '8 a 24 jugadores y 2 o más canchas.' },
    liga: { t: 'Todos contra todos', ind: false, ic: 'ti-list-numbers', min: 3, corto: 'Parejas fijas; cada pareja juega contra todas.', largo: 'Cada pareja juega una vez contra cada una de las demás (o ida y vuelta). Gana la que más partidos gane. Sirve para una tarde o como liga de varias semanas.', ideal: '3 a 10 parejas, o ligas por semanas.' },
    grupos: { t: 'Grupos y cuadro final', ind: false, ic: 'ti-tournament', min: 6, corto: 'Grupos de todos contra todos y luego cuadro final.', largo: 'Las parejas se reparten en grupos (las mejores sembradas en grupos distintos). Dentro de cada grupo juegan todas contra todas y las mejores pasan a un cuadro final (cuartos, semis y final).', ideal: '8 a 32 parejas, torneos de un día o un fin de semana.' },
    elim: { t: 'Eliminación directa', ind: false, ic: 'ti-git-merge', min: 4, corto: 'Pierdes y quedas fuera. Con consolación opcional.', largo: 'Cuadro clásico: la pareja que pierde queda fuera. Las mejores sembradas no se cruzan hasta el final y, si el número no es potencia de 2, pasan directo a la segunda ronda. Opcional: partido por el 3.er puesto y cuadro de consolación para quienes pierden su primer partido.', ideal: 'Muchas parejas y poco tiempo.' },
    escalera: { t: 'Escalera', ind: false, ic: 'ti-stairs-up', min: 4, corto: 'Ranking por retos: si le ganas a una pareja de arriba, le quitas el puesto.', largo: 'Ranking abierto que dura semanas. Una pareja reta a otra que esté hasta N puestos más arriba; si gana, toma su puesto y las demás bajan uno. No hay rondas fijas: se anotan los retos a medida que se juegan.', ideal: 'Clubes y grupos que juegan todas las semanas.' }
  };
  M.ind = (t) => !!M.F[t.formato].ind && !(t.formato === 'rey' && t.reyParejas);

  /* ---------- marcador ---------- */
  // pt: { tipo: 'total' (la suma da N puntos) | 'tope' (gana el primero que llega a N) | 'tiempo' (lo que se haga en X min) | 'sets', total, min, sets (1|3), juegos (4|6|9), oro, stb }
  M.ptTexto = (pt) => pt.tipo === 'total' ? pt.total + ' puntos en total por partido' : pt.tipo === 'tope' ? 'a ' + pt.total + ' puntos (gana el primero que llega)' : pt.tipo === 'tiempo' ? pt.min + ' minutos por partido' :
    (pt.sets === 3 ? 'Al mejor de 3 sets' : '1 set') + ' a ' + pt.juegos + ' juegos' + (pt.sets === 3 && pt.stb ? ', 3.er set súper tie-break a 10' : '') + (pt.oro ? ', punto de oro' : ', con ventaja');
  M.minPartido = (pt) => pt.tipo === 'tiempo' ? pt.min : pt.tipo === 'sets' ? (pt.sets === 3 ? 75 : pt.juegos === 9 ? 50 : pt.juegos === 4 ? 25 : 40) : Math.round(pt.total * 0.6 + 1);
  // devuelve '' si el marcador es válido, o el texto del problema
  M.validar = (m, pt) => {
    if (pt.tipo === 'sets') {
      const S = (m.sets || []).filter((s) => s && (s[0] !== '' && s[0] != null) && (s[1] !== '' && s[1] != null));
      if (!S.length) return 'Escribe los juegos del set.';
      for (const s of S) { if (!(s[0] >= 0 && s[1] >= 0)) return 'Los juegos tienen que ser números.'; if (+s[0] === +s[1]) return 'Un set no puede quedar empatado.'; }
      const w = S.reduce((a, s) => a + (+s[0] > +s[1] ? 1 : 0), 0), l = S.length - w;
      if (pt.sets === 3) { if (Math.max(w, l) < 2) return 'Al mejor de 3: alguien tiene que ganar 2 sets.'; if (S.length === 3 && (w === 3 || l === 3)) return 'Sobra el 3.er set.'; if (S.length === 2 && w === 1) return 'Falta el 3.er set.'; }
      else if (S.length > 1) return 'Este torneo es a 1 set.';
      return '';
    }
    const a = +m.sa, b = +m.sb;
    if (m.sa === '' || m.sb === '' || m.sa == null || m.sb == null || !(a >= 0) || !(b >= 0)) return 'Escribe los puntos de las dos parejas.';
    if (pt.tipo === 'total' && a + b !== pt.total) return 'Los puntos tienen que sumar ' + pt.total + ' (van ' + (a + b) + ').';
    if (pt.tipo === 'tope' && (Math.max(a, b) !== pt.total || a === b)) return 'La pareja que gana tiene que llegar a ' + pt.total + '.';
    return '';
  };
  // resultado normalizado: {a, b} puntos o juegos a favor de cada lado; ga/gb = sets; w = 'A'|'B'|'E'
  M.res = (m, pt) => {
    if (!m.ok) return null;
    if (pt.tipo === 'sets') {
      let a = 0, b = 0, ga = 0, gb = 0;
      (m.sets || []).forEach((s, i) => { if (!s || s[0] === '' || s[0] == null) return; const x = +s[0], y = +s[1]; const stb = pt.sets === 3 && pt.stb && i === 2; if (!stb) { a += x; b += y; } else { a += x > y ? 1 : 0; b += y > x ? 1 : 0; } if (x > y) ga++; else gb++; });
      return { a, b, ga, gb, w: ga > gb ? 'A' : 'B' };
    }
    const a = +m.sa, b = +m.sb; return { a, b, ga: a > b ? 1 : 0, gb: b > a ? 1 : 0, w: a > b ? 'A' : b > a ? 'B' : 'E' };
  };
  M.marcador = (m, pt) => { if (!m.ok) return ''; if (pt.tipo === 'sets') return (m.sets || []).filter((s) => s && s[0] !== '' && s[0] != null).map((s) => s[0] + '-' + s[1]).join(' '); return m.sa + ' - ' + m.sb; };

  /* ---------- entidades ---------- */
  M.ents = (t) => (M.ind(t) ? t.jug.filter((j) => !j.baja) : t.par.filter((p) => !p.baja));
  M.nom = (t, id) => { if (id === 'BYE') return 'Pasa directo'; const j = t.jug.find((x) => x.id === id); if (j) return j.n; const p = t.par.find((x) => x.id === id); return p ? p.n || (M.nom(t, p.a) + ' / ' + M.nom(t, p.b)) : '—'; };
  M.lado = (t, L) => (L && L.length ? L.map((id) => M.nom(t, id)).join(' / ') : 'Por definir');

  /* ---------- historial: parejas, rivales y descansos ---------- */
  function historial(t, hasta) {
    const comp = {}, riv = {}, desc = {}, jug = {}, ult = {};
    t.rondas.forEach((r, ri) => {
      if (hasta != null && ri >= hasta) return;
      r.partidos.forEach((m) => {
        [m.A, m.B].forEach((L) => { if (L.length === 2) comp[k2(L[0], L[1])] = (comp[k2(L[0], L[1])] || 0) + 1; L.forEach((x) => { jug[x] = (jug[x] || 0) + 1; }); });
        m.A.forEach((x) => m.B.forEach((y) => { riv[k2(x, y)] = (riv[k2(x, y)] || 0) + 1; }));
      });
      (r.desc || []).forEach((x) => { desc[x] = (desc[x] || 0) + 1; ult[x] = ri; });
    });
    return { comp, riv, desc, jug, ult };
  }

  // quién descansa: los que menos han descansado; en empate, los que no descansaron hace poco; luego al azar
  function elegirDescanso(ids, k, h, gen) {
    if (k <= 0) return [];
    const orden = (L) => mezcla(L).sort((x, y) => (h.desc[x] || 0) - (h.desc[y] || 0) || (h.ult[x] ?? -9) - (h.ult[y] ?? -9));
    if (!gen) return orden(ids).slice(0, k);
    // mixto: descansan primero los del género que sobra, para que queden iguales
    const H = ids.filter((x) => gen[x] === 'H'), Mu = ids.filter((x) => gen[x] !== 'H');
    let dh = Math.max(0, H.length - Mu.length), dm = Math.max(0, Mu.length - H.length);
    const resto = k - dh - dm; if (resto < 0) { const out = orden(H.length > Mu.length ? H : Mu).slice(0, k); return out; }
    dh += Math.floor(resto / 2); dm += resto - Math.floor(resto / 2);
    return orden(H).slice(0, dh).concat(orden(Mu).slice(0, dm));
  }

  // arma partidos con 4·C jugadores minimizando compañeros y rivales repetidos (y diferencia de nivel)
  function armarRotativo(ids, h, nivel, gen, intentos) {
    let mejor = null, costo = Infinity;
    const n = ids.length; const H = gen ? ids.filter((x) => gen[x] === 'H') : null; const Mu = gen ? ids.filter((x) => gen[x] !== 'H') : null;
    for (let it = 0; it < (intentos || 600); it++) {
      let pares = [];
      if (gen) { const a = mezcla(H), b = mezcla(Mu); for (let i = 0; i < a.length; i++) pares.push([a[i], b[i]]); }
      else { const a = mezcla(ids); for (let i = 0; i < n; i += 2) pares.push([a[i], a[i + 1]]); }
      pares = mezcla(pares);
      let c = 0;
      for (let i = 0; i < pares.length; i += 2) {
        const P = pares[i], Q = pares[i + 1];
        const cp = (h.comp[k2(P[0], P[1])] || 0), cq = (h.comp[k2(Q[0], Q[1])] || 0);
        c += 100 * (cp * cp + cq * cq);
        P.forEach((x) => Q.forEach((y) => { const r = h.riv[k2(x, y)] || 0; c += 6 * r * r; }));
        if (nivel) { const d = Math.abs((nivel[P[0]] + nivel[P[1]]) - (nivel[Q[0]] + nivel[Q[1]])); c += 3 * d * d; }
      }
      if (c < costo) { costo = c; mejor = pares; if (c === 0) break; }
    }
    const out = []; for (let i = 0; i < mejor.length; i += 2) out.push([mejor[i], mejor[i + 1]]);
    return out;
  }
  const partido = (t, ri, ci, A, B, extra) => Object.assign({ id: uid(), r: ri, c: ci, A, B, sa: '', sb: '', sets: [], ok: false }, extra || {});

  /* ---------- Americano y mixto: todas las rondas desde el inicio ---------- */
  M.rondaAmericano = (t) => {
    const ri = t.rondas.length; const ids = M.ents(t).map((j) => j.id);
    const gen = t.formato === 'mixto' ? Object.fromEntries(t.jug.map((j) => [j.id, j.g])) : null;
    let C = Math.min(t.canchas.length, Math.floor(ids.length / 4));
    if (gen) { const h = ids.filter((x) => gen[x] === 'H').length; C = Math.min(C, Math.floor(Math.min(h, ids.length - h) / 2)); }
    if (C < 1) throw new Error(gen ? 'Hacen falta al menos 2 hombres y 2 mujeres.' : 'Hacen falta al menos 4 jugadores.');
    const h = historial(t);
    const desc = elegirDescanso(ids, ids.length - 4 * C, h, gen);
    const juegan = ids.filter((x) => !desc.includes(x));
    const nivel = t.nivelar ? Object.fromEntries(t.jug.map((j) => [j.id, +j.nv || 3])) : null;
    const M4 = armarRotativo(juegan, h, nivel, gen);
    t.rondas.push({ n: ri + 1, desc, partidos: M4.map((x, ci) => partido(t, ri, ci, x[0], x[1])) });
  };
  M.rondasSugeridas = (formato, n, C) => {
    const c = Math.max(1, Math.min(C, Math.floor(n / 4)));
    if (formato === 'americano' || formato === 'mixto') { const base = n % 4 === 0 ? n - 1 : n; return Math.max(3, Math.min(base, Math.ceil((n * (n - 1) / 2) / (2 * c)) )); }
    return Math.max(3, Math.min(8, n - 1));
  };

  /* ---------- Mexicano: una ronda a la vez, según la tabla ---------- */
  M.rondaMexicano = (t) => {
    const ri = t.rondas.length; const ids = M.ents(t).map((j) => j.id);
    const C = Math.min(t.canchas.length, Math.floor(ids.length / 4)); if (C < 1) throw new Error('Hacen falta al menos 4 jugadores.');
    const h = historial(t);
    let orden;
    if (ri === 0) orden = t.nivelar ? mezcla(ids).sort((a, b) => (+jug(t, b).nv || 3) - (+jug(t, a).nv || 3)) : mezcla(ids);
    else { const tb = M.tabla(t); const pos = Object.fromEntries(tb.map((r, i) => [r.id, i])); orden = ids.slice().sort((a, b) => (pos[a] ?? 999) - (pos[b] ?? 999)); }
    const desc = elegirDescanso(orden.slice().reverse(), ids.length - 4 * C, h, null);
    const juegan = orden.filter((x) => !desc.includes(x));
    const partidos = [];
    for (let c = 0; c < C; c++) {
      const g = juegan.slice(c * 4, c * 4 + 4);
      let A = [g[0], g[3]], B = [g[1], g[2]];
      if (h.comp[k2(g[0], g[3])] || h.comp[k2(g[1], g[2])]) { const A2 = [g[0], g[2]], B2 = [g[1], g[3]]; if (!h.comp[k2(A2[0], A2[1])] && !h.comp[k2(B2[0], B2[1])]) { A = A2; B = B2; } }
      partidos.push(partido(t, ri, c, A, B));
    }
    t.rondas.push({ n: ri + 1, desc, partidos });
  };
  const jug = (t, id) => t.jug.find((j) => j.id === id) || {};

  /* ---------- Rey de la pista ---------- */
  M.rondaRey = (t) => {
    const ri = t.rondas.length; const ind = M.ind(t);
    const ids = M.ents(t).map((e) => e.id); const tam = ind ? 4 : 2;
    const C = Math.min(t.canchas.length, Math.floor(ids.length / tam)); if (C < 2 && ids.length >= tam * 2) { /* una sola cancha: igual funciona */ }
    if (C < 1) throw new Error(ind ? 'Hacen falta al menos 4 jugadores.' : 'Hacen falta al menos 2 parejas.');
    let canch = []; // canch[c] = lista de ids en esa cancha
    const h = historial(t);
    if (ri === 0) {
      const orden = t.nivelar ? mezcla(ids).sort((a, b) => (+nivelDe(t, b)) - (+nivelDe(t, a))) : mezcla(ids);
      for (let c = 0; c < C; c++) canch.push(orden.slice(c * tam, c * tam + tam));
      var desc = orden.slice(C * tam);
    } else {
      const prev = t.rondas[ri - 1]; canch = Array.from({ length: C }, () => []);
      const bajan = [];
      prev.partidos.forEach((m) => {
        const r = M.res(m, t.pt) || { w: 'E' }; const W = r.w === 'B' ? m.B : m.A, L = r.w === 'B' ? m.A : m.B; const c = m.c;
        if (c < C) { canch[Math.max(0, c - 1)].push(...W); if (c + 1 < C) canch[c + 1].push(...L); else bajan.push(...L); }
      });
      // los que descansaban entran por la cancha de abajo; los perdedores de abajo descansan si sobran
      const entra = (prev.desc || []).filter((x) => ids.includes(x));
      const abajo = canch[C - 1]; const libres = tam - abajo.length;
      const cola = entra.concat(bajan);
      abajo.push(...cola.slice(0, libres)); desc = cola.slice(libres);
      // si alguna cancha quedó con más o menos gente (bajas/altas), se reacomoda en orden
      const plano = canch.flat().concat(desc); if (canch.some((x) => x.length !== tam)) { canch = []; for (let c = 0; c < C; c++) canch.push(plano.slice(c * tam, c * tam + tam)); desc = plano.slice(C * tam); }
    }
    const partidos = canch.map((g, c) => {
      if (!ind) return partido(t, ri, c, [g[0]], [g[1]]);
      const P = [[[g[0], g[1]], [g[2], g[3]]], [[g[0], g[2]], [g[1], g[3]]], [[g[0], g[3]], [g[1], g[2]]]];
      const sc = (p) => (h.comp[k2(p[0][0], p[0][1])] || 0) + (h.comp[k2(p[1][0], p[1][1])] || 0);
      const lastComp = ri > 0 ? historialRonda(t.rondas[ri - 1]) : {};
      const best = P.slice().sort((x, y) => ((lastComp[k2(x[0][0], x[0][1])] || 0) + (lastComp[k2(x[1][0], x[1][1])] || 0)) * 100 + sc(x) - (((lastComp[k2(y[0][0], y[0][1])] || 0) + (lastComp[k2(y[1][0], y[1][1])] || 0)) * 100 + sc(y)))[0];
      return partido(t, ri, c, best[0], best[1]);
    });
    t.rondas.push({ n: ri + 1, desc: desc || [], partidos });
  };
  const nivelDe = (t, id) => { const j = t.jug.find((x) => x.id === id); if (j) return +j.nv || 3; const p = t.par.find((x) => x.id === id); return p ? ((+jug(t, p.a).nv || 3) + (+jug(t, p.b).nv || 3)) / 2 : 3; };
  const historialRonda = (r) => { const o = {}; r.partidos.forEach((m) => [m.A, m.B].forEach((L) => { if (L.length === 2) o[k2(L[0], L[1])] = 1; })); return o; };

  /* ---------- todos contra todos (método del círculo) ---------- */
  function circulo(ids, vueltas) {
    const L = ids.slice(); if (L.length % 2) L.push(null);
    const n = L.length, R = [];
    for (let r = 0; r < n - 1; r++) {
      const ms = [];
      for (let i = 0; i < n / 2; i++) { const a = L[i], b = L[n - 1 - i]; if (a && b) ms.push(r % 2 ? [b, a] : [a, b]); }
      R.push({ ms, desc: L.filter((x, i) => x && !ms.some((m) => m.includes(x))) });
      L.splice(1, 0, L.pop());
    }
    if (vueltas === 2) return R.concat(R.map((r) => ({ ms: r.ms.map((m) => [m[1], m[0]]), desc: r.desc })));
    return R;
  }
  M.armarLiga = (t) => {
    const ids = mezcla(M.ents(t).map((p) => p.id)); const C = t.canchas.length;
    t.rondas = circulo(ids, t.vueltas).map((r, ri) => ({ n: ri + 1, desc: r.desc, partidos: r.ms.map((m, i) => partido(t, ri, i % C, [m[0]], [m[1]], { turno: Math.floor(i / C) + 1 })) }));
  };

  /* ---------- grupos ---------- */
  M.armarGrupos = (t) => {
    const ps = M.ents(t); const G = Math.max(1, Math.min(t.nGrupos || 2, Math.floor(ps.length / 3)));
    const orden = t.nivelar ? mezcla(ps).sort((a, b) => nivelDe(t, b.id) - nivelDe(t, a.id)) : mezcla(ps);
    const grupos = Array.from({ length: G }, () => []);
    orden.forEach((p, i) => { const fila = Math.floor(i / G), col = i % G; grupos[fila % 2 ? G - 1 - col : col].push(p.id); });
    t.grupos = grupos.map((g, i) => ({ n: String.fromCharCode(65 + i), ids: g }));
    const porGrupo = t.grupos.map((g) => circulo(g.ids, t.vueltas));
    const nR = Math.max(...porGrupo.map((x) => x.length)); const C = t.canchas.length;
    t.rondas = [];
    for (let r = 0; r < nR; r++) {
      const ms = []; const desc = [];
      porGrupo.forEach((rr, gi) => { if (rr[r]) { rr[r].ms.forEach((m) => ms.push([m, t.grupos[gi].n])); desc.push(...rr[r].desc); } });
      t.rondas.push({ n: r + 1, desc, partidos: ms.map((x, i) => partido(t, r, i % C, [x[0][0]], [x[0][1]], { g: x[1], turno: Math.floor(i / C) + 1 })) });
    }
    t.cuadro = null;
  };
  M.gruposListos = (t) => t.rondas.length > 0 && t.rondas.every((r) => r.partidos.every((m) => m.ok));
  M.clasificados = (t) => {
    const pasan = t.pasan || 2; const tablas = t.grupos.map((g) => M.tabla(t, g.n));
    const out = [];
    for (let k = 0; k < pasan; k++) { const fila = tablas.map((tb, gi) => tb[k] && { id: tb[k].id, g: t.grupos[gi].n, pos: k + 1 }).filter(Boolean); out.push(...(k % 2 ? fila.reverse() : fila)); }
    return out;
  };

  /* ---------- cuadro de eliminación ---------- */
  function ordenSiembra(n) { let o = [1]; while (o.length < n) { const m = o.length * 2 + 1; o = o.flatMap((x) => [x, m - x]); } return o; }
  // entradas: lista ordenada por siembra (ids). Devuelve {rondas:[[match]], tercer, nombre}
  M.cuadro = (t, entradas, opc) => {
    const n = entradas.length; let size = 2; while (size < n) size *= 2;
    const slots = ordenSiembra(size).map((s) => (s <= n ? entradas[s - 1] : 'BYE'));
    // evitar cruces del mismo grupo en la 1.ª ronda
    if (opc && opc.grupoDe) {
      for (let i = 0; i < slots.length; i += 2) {
        const g = opc.grupoDe;
        if (slots[i] !== 'BYE' && slots[i + 1] !== 'BYE' && g[slots[i]] && g[slots[i]] === g[slots[i + 1]]) {
          for (let j = 0; j < slots.length; j += 2) { if (j === i) continue; const o = slots[j + 1]; if (o !== 'BYE' && g[o] !== g[slots[i]] && g[slots[i + 1]] !== g[slots[j]]) { slots[j + 1] = slots[i + 1]; slots[i + 1] = o; break; } }
        }
      }
    }
    const R = []; let cnt = size / 2, ri = 0;
    while (cnt >= 1) { const ms = []; for (let p = 0; p < cnt; p++) ms.push({ id: uid(), r: ri, pos: p, A: [], B: [], sa: '', sb: '', sets: [], ok: false }); R.push(ms); cnt /= 2; ri++; }
    R[0].forEach((m, p) => { m.A = [slots[2 * p]]; m.B = [slots[2 * p + 1]]; });
    const cu = { nombre: (opc && opc.nombre) || 'Cuadro principal', rondas: R, tercer: opc && opc.tercer && size >= 4 ? { id: uid(), r: R.length - 1, pos: 9, A: [], B: [], sa: '', sb: '', sets: [], ok: false, tercer: true } : null };
    R[0].forEach((m) => resolverBye(cu, m));
    asignarCanchas(t, cu);
    return cu;
  };
  function resolverBye(cu, m) {
    if (m.ok) return;
    const a = m.A[0], b = m.B[0];
    if (a === 'BYE' && b === 'BYE') { m.ok = true; m.bye = true; avanzar(cu, m, 'BYE', 'BYE'); }
    else if (b === 'BYE' && a) { m.ok = true; m.bye = true; avanzar(cu, m, a, null); }
    else if (a === 'BYE' && b) { m.ok = true; m.bye = true; avanzar(cu, m, b, null); }
  }
  function avanzar(cu, m, gan, per) {
    if (m.tercer) return;
    const sig = cu.rondas[m.r + 1];
    if (sig) { const s = sig[m.pos >> 1]; if (m.pos & 1) s.B = [gan]; else s.A = [gan]; resolverBye(cu, s); }
    if (cu.tercer && m.r === cu.rondas.length - 2 && per) { if (m.pos & 1) cu.tercer.B = [per]; else cu.tercer.A = [per]; }
  }
  function asignarCanchas(t, cu) { const C = t.canchas.length || 1; cu.rondas.forEach((ms) => { let i = 0; ms.forEach((m) => { if (!m.bye) m.c = (i++) % C; }); }); if (cu.tercer) cu.tercer.c = 1 % C; }
  M.cuadroPartidos = (cu) => cu ? cu.rondas.flat().concat(cu.tercer ? [cu.tercer] : []) : [];
  // al anotar un resultado del cuadro
  M.resultadoCuadro = (t, cu, m) => {
    const r = M.res(m, t.pt); if (!r || r.w === 'E') return 'En un cuadro no puede haber empate.';
    const gan = r.w === 'A' ? m.A[0] : m.B[0], per = r.w === 'A' ? m.B[0] : m.A[0];
    // si se corrige un resultado, se limpia lo que venía después
    limpiarDesde(cu, m); avanzar(cu, m, gan, per); return '';
  };
  function limpiarDesde(cu, m) {
    if (m.tercer) return; const sig = cu.rondas[m.r + 1]; if (!sig) return; const s = sig[m.pos >> 1];
    const lado = m.pos & 1 ? 'B' : 'A'; if (s[lado].length && !s.bye) { if (s.ok) { s.ok = false; s.sa = ''; s.sb = ''; s.sets = []; limpiarDesde(cu, s); } s[lado] = []; }
    if (cu.tercer && m.r === cu.rondas.length - 2) { cu.tercer[lado] = []; cu.tercer.ok = false; cu.tercer.sa = ''; cu.tercer.sb = ''; cu.tercer.sets = []; }
  }
  M.nombreRonda = (cu, r) => { const k = cu.rondas.length - r; return k === 1 ? 'Final' : k === 2 ? 'Semifinales' : k === 3 ? 'Cuartos de final' : k === 4 ? 'Octavos de final' : k === 5 ? 'Dieciseisavos' : 'Ronda ' + (r + 1); };
  function ganadorDe(m, pt) { const r = M.res(m, pt); return r ? (r.w === 'A' ? m.A[0] : m.B[0]) : null; }
  M.ganador = (m, pt) => ganadorDe(m, pt);
  M.armarElim = (t) => {
    const ps = M.ents(t); const orden = t.nivelar ? mezcla(ps).sort((a, b) => nivelDe(t, b.id) - nivelDe(t, a.id)) : mezcla(ps);
    t.cuadro = M.cuadro(t, orden.map((p) => p.id), { tercer: t.tercer }); t.consol = null; t.rondas = [];
  };
  M.armarCuadroFinal = (t) => {
    const cl = M.clasificados(t); const g = Object.fromEntries(cl.map((x) => [x.id, x.g]));
    t.cuadro = M.cuadro(t, cl.map((x) => x.id), { tercer: t.tercer, grupoDe: g }); t.consol = null;
  };
  // consolación: los que perdieron su primer partido de verdad (no cuenta pasar directo)
  M.consolacionLista = (t) => {
    const cu = t.cuadro; if (!cu || !t.consolacion || t.consol) return false;
    const debut = {}; const perd = [];
    for (const ms of cu.rondas) for (const m of ms) { if (m.bye) continue; [m.A[0], m.B[0]].forEach((x) => { if (x && x !== 'BYE' && debut[x] == null) debut[x] = m; }); }
    const firstMatches = [...new Set(Object.values(debut))];
    if (!firstMatches.length || firstMatches.some((m) => !m.ok || !m.A.length || !m.B.length)) return false;
    firstMatches.forEach((m) => { const g = ganadorDe(m, t.pt); const p = m.A[0] === g ? m.B[0] : m.A[0]; if (debut[p] === m) perd.push(p); });
    return perd.length >= 2 ? perd : false;
  };
  M.armarConsolacion = (t, perd) => { t.consol = M.cuadro(t, perd, { nombre: 'Consolación' }); };

  /* ---------- escalera ---------- */
  M.armarEscalera = (t) => { const ps = M.ents(t); const orden = t.nivelar ? mezcla(ps).sort((a, b) => nivelDe(t, b.id) - nivelDe(t, a.id)) : mezcla(ps); t.ranking = orden.map((p) => p.id); t.ranking0 = t.ranking.slice(); t.retos = []; t.rondas = []; };
  M.retoValido = (t, ret, rdo) => { const i = t.ranking.indexOf(ret), j = t.ranking.indexOf(rdo); if (i < 0 || j < 0) return 'Elige las dos parejas.'; if (j >= i) return 'Solo se puede retar a una pareja que esté más arriba.'; if (i - j > (t.saltos || 3)) return 'Solo se puede retar hasta ' + (t.saltos || 3) + ' puestos más arriba.'; return ''; };
  M.aplicarReto = (t, m) => {
    const r = M.res(m, t.pt); if (!r || r.w === 'E') return 'Un reto no puede quedar empatado.';
    m.antes = t.ranking.slice(); const ret = m.A[0], rdo = m.B[0];
    if (r.w === 'A') { const L = t.ranking.filter((x) => x !== ret); L.splice(L.indexOf(rdo), 0, ret); t.ranking = L; m.sube = true; } else m.sube = false;
    return '';
  };
  M.rehacerEscalera = (t) => { // recalcula el ranking desde el inicio (al borrar o corregir un reto)
    t.ranking = (t.ranking0 || (t.retos[0] && t.retos[0].antes) || t.ranking).slice();
    t.retos.forEach((m) => { if (m.ok) M.aplicarReto(t, m); });
  };

  /* ---------- tabla de posiciones ---------- */
  // crit: 'puntos' (suma de puntos/juegos), 'promedio' (puntos por partido), 'victorias'
  M.tabla = (t, grupo) => {
    const ind = M.ind(t); let ents = M.ents(t);
    if (grupo) { const g = t.grupos.find((x) => x.n === grupo); ents = ents.filter((e) => g.ids.includes(e.id)); }
    const T = Object.fromEntries(ents.map((e) => [e.id, { id: e.id, pj: 0, g: 0, e: 0, p: 0, pf: 0, pc: 0, sf: 0, sc: 0, pista: 0, desc: 0 }]));
    const C = t.canchas.length || 1;
    const ms = t.formato === 'escalera' ? t.retos : t.rondas.flatMap((r) => r.partidos);
    ms.forEach((m) => {
      if (!m.ok || (grupo && m.g !== grupo)) return; const r = M.res(m, t.pt); if (!r) return;
      const lados = [[m.A, r.a, r.b, r.ga, r.gb, r.w === 'A'], [m.B, r.b, r.a, r.gb, r.ga, r.w === 'B']];
      lados.forEach(([L, f, c, sf, sc, gana]) => L.forEach((id) => { const x = T[id]; if (!x) return; x.pj++; x.pf += f; x.pc += c; x.sf += sf; x.sc += sc; if (r.w === 'E') x.e++; else if (gana) { x.g++; if (t.formato === 'rey') x.pista += Math.max(1, C - (m.c || 0)); } else x.p++; }));
    });
    t.rondas.forEach((r) => (r.desc || []).forEach((id) => { if (T[id]) T[id].desc++; }));
    const L = Object.values(T); L.forEach((x) => { x.dif = x.pf - x.pc; x.prom = x.pj ? x.pf / x.pj : 0; x.dsets = x.sf - x.sc; });
    const crit = t.crit || (ind ? 'puntos' : 'victorias');
    const cmp = (a, b) => {
      if (t.formato === 'rey' && b.pista !== a.pista) return b.pista - a.pista;
      if (crit === 'puntos' && b.pf !== a.pf) return b.pf - a.pf;
      if (crit === 'promedio' && Math.abs(b.prom - a.prom) > 1e-9) return b.prom - a.prom;
      if (b.g !== a.g) return b.g - a.g;
      if (t.pt.tipo === 'sets' && b.dsets !== a.dsets) return b.dsets - a.dsets;
      if (b.dif !== a.dif) return b.dif - a.dif;
      if (b.pf !== a.pf) return b.pf - a.pf;
      return h2h(t, ms, a.id, b.id);
    };
    return L.sort(cmp);
  };
  function h2h(t, ms, a, b) { let s = 0; ms.forEach((m) => { if (!m.ok) return; const r = M.res(m, t.pt); if (!r || r.w === 'E') return; const W = r.w === 'A' ? m.A : m.B, L = r.w === 'A' ? m.B : m.A; if (W.includes(a) && L.includes(b)) s--; if (W.includes(b) && L.includes(a)) s++; }); return s; }

  /* ---------- crear y avanzar ---------- */
  M.iniciar = (t) => {
    t.rondas = []; t.cuadro = null; t.consol = null; t.grupos = null;
    const f = t.formato;
    if (f === 'americano' || f === 'mixto') { for (let i = 0; i < (t.nRondas || 1); i++) M.rondaAmericano(t); }
    else if (f === 'mexicano') M.rondaMexicano(t);
    else if (f === 'rey') M.rondaRey(t);
    else if (f === 'liga') M.armarLiga(t);
    else if (f === 'grupos') M.armarGrupos(t);
    else if (f === 'elim') M.armarElim(t);
    else if (f === 'escalera') M.armarEscalera(t);
  };
  M.rondaLista = (t) => { const r = t.rondas[t.rondas.length - 1]; return !!r && r.partidos.every((m) => m.ok); };
  M.puedeOtraRonda = (t) => ['americano', 'mixto', 'mexicano', 'rey'].includes(t.formato);
  M.otraRonda = (t) => { const f = t.formato; if (f === 'americano' || f === 'mixto') M.rondaAmericano(t); else if (f === 'mexicano') M.rondaMexicano(t); else if (f === 'rey') M.rondaRey(t); };
  M.todos = (t) => t.rondas.flatMap((r) => r.partidos).concat(M.cuadroPartidos(t.cuadro), M.cuadroPartidos(t.consol), t.retos || []);
  M.buscar = (t, id) => { for (const m of M.todos(t)) if (m.id === id) return m; return null; };
  M.cuadroDe = (t, m) => (M.cuadroPartidos(t.cuadro).includes(m) ? t.cuadro : M.cuadroPartidos(t.consol).includes(m) ? t.consol : null);

  /* ---------- recomendación del asistente ---------- */
  // q: { rotan: bool, n: jugadores (o parejas si no rotan), canchas, minutos, niveles: 'parejos'|'distintos', mixto: bool }
  M.recomendar = (q) => {
    const out = []; const n = q.n, C = Math.max(1, q.canchas), min = q.minutos;
    const add = (f, por, extra) => out.push(Object.assign({ f, por }, extra || {}));
    if (q.rotan) {
      if (n < 4) return out;
      const c = Math.min(C, Math.floor(n / 4));
      const desc = n - 4 * c;
      let R = M.rondasSugeridas('americano', n, c);
      if (min / R < 14) R = Math.max(3, Math.floor(min / 14));
      const porRonda = Math.max(8, Math.floor(min / R) - 2);
      const pts = porRonda >= 22 ? 32 : porRonda >= 16 ? 24 : porRonda >= 11 ? 16 : 12;
      const pt = { tipo: 'total', total: pts, min: porRonda, sets: 1, juegos: 6, oro: true, stb: true };
      const notaDesc = desc ? ' Cada ronda descansan ' + desc + ' (por turnos).' : '';
      if (q.mixto) add('mixto', 'Hay hombres y mujeres y quieren parejas mixtas.' + notaDesc, { pt, nRondas: R });
      if (q.niveles === 'distintos') { add('mexicano', 'Con niveles distintos, el mexicano junta a los que van parejos y los partidos quedan igualados.' + notaDesc, { pt, nRondas: Math.max(3, Math.floor(min / (porRonda + 2))) }); add('americano', 'Todos juegan con todos; con niveles distintos algunos partidos saldrán desparejos.' + notaDesc, { pt, nRondas: R }); }
      else { add('americano', 'Es el más social: cada uno juega con todos y nadie queda eliminado.' + notaDesc, { pt, nRondas: R }); add('mexicano', 'Si después de un par de rondas notan diferencias de nivel, el mexicano las empareja.', { pt, nRondas: Math.max(3, Math.floor(min / (porRonda + 2))) }); }
      if (n >= 8 && C >= 2) add('rey', 'Más competitivo y con movimiento: ganar en la cancha 1 vale más.', { pt: { tipo: 'tiempo', min: Math.min(15, porRonda), total: 24, sets: 1, juegos: 6, oro: true, stb: true }, nRondas: Math.max(4, Math.floor(min / (Math.min(15, porRonda) + 2))) });
      if (!q.mixto) add('mixto', 'Si quieren que cada pareja sea hombre + mujer.', { pt, nRondas: R });
      return out;
    }
    // parejas fijas
    if (n < 2) return out;
    const partidosLiga = n * (n - 1) / 2; const turnos = Math.ceil(partidosLiga / C);
    const mLiga = Math.floor(min / turnos) - 2;
    const ptPor = (m) => m >= 40 ? { tipo: 'sets', sets: 1, juegos: 6, oro: true, stb: true, total: 24, min: 40 } : m >= 22 ? { tipo: 'sets', sets: 1, juegos: 4, oro: true, stb: true, total: 24, min: 25 } : { tipo: 'tiempo', min: Math.max(10, m), total: 24, sets: 1, juegos: 6, oro: true, stb: true };
    if (q.semanas) add('escalera', 'Para jugar durante semanas: cada pareja reta a las de arriba cuando pueda.', { pt: { tipo: 'sets', sets: 3, juegos: 6, oro: true, stb: true, total: 24, min: 75 } });
    if (n <= 6 || mLiga >= 18) add('liga', 'Les alcanza el tiempo para que todas jueguen contra todas (' + partidosLiga + ' partidos).', { pt: ptPor(mLiga) });
    if (n >= 6) {
      const G = n >= 16 ? 4 : n >= 9 ? (n >= 12 ? 4 : 3) : 2; const porG = Math.ceil(n / G); const pg = G * porG * (porG - 1) / 2; const pasan = G >= 4 ? 2 : G === 3 ? 2 : 2;
      const k = G * pasan; const ko = k - 1; const turn = Math.ceil(pg / C) + Math.ceil(ko / C) + 1; const m = Math.floor(min / turn) - 2;
      add('grupos', G + ' grupos de ' + (porG - 1) + '–' + porG + ' parejas; pasan ' + pasan + ' por grupo al cuadro final. Todos juegan al menos ' + (porG - 1) + ' partidos.', { pt: ptPor(m), nGrupos: G, pasan });
    }
    if (n >= 4) { let s = 2; while (s < n) s *= 2; const rondasK = Math.log2(s); const m = Math.floor(min / (rondasK + 1)) - 2; add('elim', 'Lo más rápido: ' + rondasK + ' rondas. Con consolación, nadie juega un solo partido.', { pt: ptPor(Math.max(m, 20)), consolacion: true, tercer: true }); }
    if (!out.some((x) => x.f === 'liga')) add('liga', 'Todas contra todas: ' + partidosLiga + ' partidos; con su tiempo, quedan cortos (' + Math.max(8, mLiga) + ' min).', { pt: ptPor(Math.max(10, mLiga)) });
    if (!q.semanas) add('escalera', 'Si quieren seguir jugando por semanas con un ranking abierto.', { pt: { tipo: 'sets', sets: 3, juegos: 6, oro: true, stb: true, total: 24, min: 75 } });
    return out;
  };

  /* ---------- texto para compartir (WhatsApp) ---------- */
  M.textoTabla = (t) => {
    const ind = M.ind(t); const L = [];
    L.push('*' + t.nombre + '*' + (t.fecha ? ' · ' + t.fecha.slice(8, 10) + '/' + t.fecha.slice(5, 7) : ''));
    if (t.formato === 'escalera') { L.push('Ranking:'); t.ranking.forEach((id, i) => L.push((i + 1) + '. ' + M.nom(t, id))); return L.join('\n'); }
    if (t.cuadro) { const f = t.cuadro.rondas[t.cuadro.rondas.length - 1][0]; const g = f.ok ? M.ganador(f, t.pt) : null; if (g) L.push('🏆 Campeones: ' + M.nom(t, g)); }
    const bloques = t.grupos ? t.grupos.map((g) => ['Grupo ' + g.n, M.tabla(t, g.n)]) : (t.rondas.length ? [['Tabla', M.tabla(t)]] : []);
    bloques.forEach(([tit, tb]) => { L.push(''); L.push('*' + tit + '*'); tb.forEach((r, i) => L.push((i + 1) + '. ' + M.nom(t, r.id) + ' — ' + (t.formato === 'rey' ? r.pista + ' pts de pista' : ind && t.crit !== 'victorias' ? r.pf + ' pts' : r.g + ' G · ' + (r.dif > 0 ? '+' : '') + r.dif))); });
    const r = t.rondas[t.rondas.length - 1];
    if (r && !r.partidos.every((m) => m.ok)) { L.push(''); L.push('*Ronda ' + r.n + '*'); r.partidos.forEach((m) => L.push((t.canchas[m.c] || 'Cancha ' + (m.c + 1)) + ': ' + M.lado(t, m.A) + ' vs ' + M.lado(t, m.B))); if (r.desc && r.desc.length) L.push('Descansan: ' + r.desc.map((x) => M.nom(t, x)).join(', ')); }
    return L.join('\n');
  };

  root.Padel = M;
  if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
