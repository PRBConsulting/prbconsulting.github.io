/* PRB Consulting · tasa del día automática y calculadora de tasas.
   Fuente: DolarApi Venezuela (https://ve.dolarapi.com): dólar y euro oficiales del BCV y el promedio del mercado paralelo.
   La app usa por defecto el dólar BCV y se actualiza sola al abrirla. El usuario puede elegir el paralelo o escribir su tasa (manual).
   Si no hay internet o la API no responde, se queda la última tasa guardada. */
(function () {
  'use strict';
  const KEY = 'prb-tasas-v1';
  const API = ['https://ve.dolarapi.com/v1/dolares', 'https://ve.dolarapi.com/v1/euros'];
  const VIGENCIA = 30 * 60 * 1000; // 30 minutos
  const r2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
  const r4 = (v) => Math.round((+v + Number.EPSILON) * 10000) / 10000;
  const nf = (d) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = (v, d) => (isFinite(v) && v !== '' ? nf(d == null ? 2 : d).format(v) : '');
  const num = (v) => { let s = String(v ?? '').trim(); if (!s) return NaN; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isFinite(x) ? x : NaN; };
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fdia = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const en = () => !!(window.PRB && window.PRB.en);

  let D = null; try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { D = null; }
  let cargando = null;

  async function refrescar(forzar) {
    if (!forzar && D && Date.now() - D.ts < VIGENCIA) return D;
    if (cargando) return cargando;
    cargando = (async () => {
      try {
        const [u, e] = await Promise.all(API.map((x) => fetch(x, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })));
        const f = (L, k) => { const x = (L || []).find((y) => y.fuente === k); return x && +x.promedio > 0 ? { v: +x.promedio, f: String(x.fechaActualizacion || '').slice(0, 10) } : null; };
        const o = f(u, 'oficial'), p = f(u, 'paralelo'), eo = f(e, 'oficial'), ep = f(e, 'paralelo');
        if (!o) throw new Error('sin tasa oficial');
        D = { ts: Date.now(), usd: o.v, usdF: o.f, par: p ? p.v : null, parF: p ? p.f : '', eur: eo ? eo.v : null, eurF: eo ? eo.f : '', eurPar: ep ? ep.v : null };
        try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (er) { /* sin almacenamiento */ }
        return D;
      } catch (er) { return D; } finally { cargando = null; }
    })();
    return cargando;
  }
  // valor que debe usar la app según su modo
  function valor(S) { if (!D) return null; const m = S.tasaModo || 'oficial'; return m === 'paralelo' ? D.par : m === 'oficial' ? D.usd : null; }
  function aplicar(S) { const v = valor(S); if (!v || (S.tasaModo || 'oficial') === 'manual') return false; const t = r2(v); if (t === S.tasa) return false; S.tasa = t; S.tasaFecha = hoy(); return true; }
  async function auto(getS, save, render) {
    if (en()) return;
    const S0 = getS(); if (S0 && (S0.tasaModo || 'oficial') !== 'manual' && D && aplicar(S0)) { save(); render(); }
    await refrescar(false);
    const S = getS(); if (S && aplicar(S)) { save(); render(); } else if (S && D && location.hash === '#tasas') render();
  }
  function tag(S) {
    if (en()) return '';
    const m = S.tasaModo || 'oficial';
    return '<small style="display:block;color:#B7BBA8;margin-top:2px">' + (m === 'manual' ? 'Manual · la escribiste tú' : (m === 'paralelo' ? 'Paralelo' : 'BCV') + ' · se actualiza sola') + '</small>';
  }
  // al escribir la tasa a mano en cualquier pantalla: queda en modo manual
  function manual(S) { S.tasaModo = 'manual'; }

  /* ---------- calculadora multidireccional ---------- */
  const filas = () => [
    { k: 'bs', t: 'Bolívares', s: 'Bs', r: 1 },
    { k: 'usd', t: 'Dólar BCV', s: '$', r: D && D.usd, f: D && D.usdF },
    { k: 'eur', t: 'Euro BCV', s: '€', r: D && D.eur, f: D && D.eurF },
    { k: 'par', t: 'Dólar paralelo', s: '$', r: D && D.par, f: D && D.parF, n: 'Promedio del mercado libre' },
    { k: 'eurPar', t: 'Euro paralelo', s: '€', r: D && D.eurPar },
    { k: 'mia', t: 'Mi tasa', s: '$', r: null, mia: true }
  ];
  let C = { bs: 1000, mia: '' };
  function vista(S) {
    const F = filas(); const miaR = num(C.mia) || S.tasa;
    const amt = (x) => { const r = x.mia ? miaR : x.r; return r ? C.bs / r : NaN; };
    const modo = S.tasaModo || 'oficial';
    const opt = (k, t, d) => '<label class="tile" style="cursor:pointer;align-items:center;padding:12px 15px' + (modo === k ? ';border-color:var(--oliva);background:var(--oliva-suave)' : '') + '"><input type="radio" name="tmodo" value="' + k + '"' + (modo === k ? ' checked' : '') + ' style="accent-color:var(--oliva)"><div><b style="font-size:15px">' + t + '</b><span>' + d + '</span></div></label>';
    return '<h1>Calculadora de tasas</h1><p class="sub">Escribe un monto en cualquier casilla y las demás se calculan solas, en las dos direcciones.</p>' +
      '<div class="card" id="pcalc" style="max-width:720px"><table class="calc"><tbody>' + F.map((x) => '<tr><td class="wrap" style="width:46%"><b>' + x.t + '</b><div class="hint">' + (x.k === 'bs' ? 'Moneda local' : x.mia ? 'Bs por 1 $: <input class="inp num" data-mia style="width:110px;min-height:34px;padding:4px 8px;display:inline-block" inputmode="decimal" placeholder="' + fmt(S.tasa) + '" value="' + (C.mia || '') + '">' : x.r ? 'Bs ' + fmt(x.r, 4) + ' por 1 ' + x.s + (x.f ? ' · ' + fdia(x.f) : '') : 'No disponible ahora') + '</div></td><td class="r"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><span class="hint" style="min-width:20px;text-align:right">' + x.s + '</span><input class="inp num" data-k="' + x.k + '" inputmode="decimal" style="max-width:190px;text-align:right;font-size:18px;font-weight:600"' + (x.r || x.mia || x.k === 'bs' ? '' : ' disabled') + ' value="' + (x.k === 'bs' ? fmt(C.bs) : fmt(amt(x))) + '"></div></td></tr>').join('') + '</tbody></table>' +
      '<div class="row" style="margin:12px 0 0"><span class="hint">' + (D ? 'Tasas consultadas a las ' + new Date(D.ts).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) + '. Fuente: DolarApi (BCV y promedio del paralelo).' : 'Sin conexión: no se pudieron traer las tasas.') + '</span><span class="sp"></span><button class="btn sec sm" data-act="refrescar"><i class="ti ti-refresh" aria-hidden="true"></i> Actualizar ahora</button></div></div>' +
      '<h3 style="margin-top:24px">¿Qué tasa usa la app?</h3><p class="hint" style="margin-top:-6px">Con esta se convierten las ventas, compras y sueldos nuevos. Lo ya registrado guarda su propia tasa.</p>' +
      '<div class="tiles" id="pmodo" style="max-width:720px">' + opt('oficial', 'Dólar BCV', 'Automática' + (D && D.usd ? ' · hoy Bs ' + fmt(D.usd) : '')) + opt('paralelo', 'Dólar paralelo', 'Automática' + (D && D.par ? ' · hoy Bs ' + fmt(D.par) : '')) + opt('manual', 'Manual', 'La que escribas tú · hoy Bs ' + fmt(S.tasa)) + '</div>';
  }
  function montar(getS, save, render) {
    const c = document.getElementById('pcalc'); if (!c) return;
    const recalc = (src) => {
      const S = getS(); const F = filas(); const miaR = num(C.mia) || S.tasa;
      c.querySelectorAll('input[data-k]').forEach((i) => { if (i === src) return; const x = F.find((y) => y.k === i.dataset.k); const r = x.mia ? miaR : x.r; if (x.k === 'bs') i.value = fmt(C.bs); else if (r) i.value = fmt(C.bs / r); });
    };
    c.addEventListener('input', (ev) => {
      const i = ev.target; const S = getS();
      if (i.hasAttribute('data-mia')) { C.mia = i.value; recalc(null); return; }
      if (!i.dataset.k) return; const v = num(i.value); if (!isFinite(v)) return;
      const x = filas().find((y) => y.k === i.dataset.k); const r = x.k === 'bs' ? 1 : x.mia ? num(C.mia) || S.tasa : x.r; if (!r) return;
      C.bs = v * r; recalc(i);
    });
    c.addEventListener('focusout', (ev) => { const i = ev.target; if (i.dataset && i.dataset.k) { const v = num(i.value); if (isFinite(v)) i.value = fmt(v); } });
    c.addEventListener('click', async (ev) => { const b = ev.target.closest('[data-act="refrescar"]'); if (!b) return; b.disabled = true; await refrescar(true); const S = getS(); if (aplicar(S)) save(); render(); if (window.PRBok) window.PRBok(D ? 'Tasas actualizadas' : 'Sin conexión', !D); });
    const m = document.getElementById('pmodo');
    if (m) m.addEventListener('change', (ev) => { if (ev.target.name !== 'tmodo') return; const S = getS(); S.tasaModo = ev.target.value; aplicar(S); save(); render(); if (window.PRBok) window.PRBok(S.tasaModo === 'manual' ? 'La app usará tu tasa' : 'Tasa automática activada'); });
  }

  window.PRBTasa = { refrescar, auto, tag, manual, aplicar, vista, montar, get datos() { return D; } };
})();
