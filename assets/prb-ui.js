/* PRB Consulting · confirmaciones en su sitio (manual de marca: sin avisos flotantes).
   Al guardar, el mismo botón que se tocó muestra "✓ Guardado" por 2 segundos.
   Si la pantalla se redibujó, aparece una línea discreta arriba del contenido y se va sola.
   Los errores se quedan junto al botón o arriba del formulario, en rojo, hasta el siguiente clic. */
(function () {
  'use strict';
  let last = null;
  document.addEventListener('click', (e) => { last = e.target.closest && e.target.closest('button, .btn'); }, true);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function linea(msg, err) {
    const dlg = document.querySelector('dialog[open] .bd');
    const host = (err && dlg) || document.getElementById('m') || document.querySelector('main');
    if (!host) return;
    host.querySelectorAll(':scope > .prb-line').forEach((x) => x.remove());
    const d = document.createElement('div'); d.className = 'prb-line' + (err ? ' err' : ''); d.setAttribute('role', 'status');
    d.textContent = (err ? '' : '✓ ') + msg; host.prepend(d);
    if (!err) setTimeout(() => d.remove(), 2600);
    else document.addEventListener('click', () => setTimeout(() => d.remove(), 0), { once: true, capture: true });
  }

  /* Botón para ocultar o mostrar el menú lateral (se recuerda en este navegador) y marca de app con scroll propio */
  function menuBtn() {
    const bar = document.querySelector('.prb-bar'); const side = document.querySelector('.side');
    if (!bar || !side || document.getElementById('prb-navbtn')) return;
    document.body.classList.add('has-app');
    let off = false; try { off = localStorage.getItem('prb-nav-off') === '1'; } catch (e) { /* */ }
    const b = document.createElement('button'); b.id = 'prb-navbtn'; b.type = 'button'; b.className = 'prb-navbtn';
    const pinta = () => { document.body.classList.toggle('nav-off', off); b.setAttribute('aria-pressed', String(!off)); b.innerHTML = '<i class="ti ti-layout-sidebar-left-' + (off ? 'expand' : 'collapse') + '" aria-hidden="true"></i><span class="hide-m">' + (off ? 'Mostrar menú' : 'Ocultar menú') + '</span>'; b.title = off ? 'Mostrar el menú' : 'Ocultar el menú'; };
    b.onclick = () => { off = !off; try { localStorage.setItem('prb-nav-off', off ? '1' : '0'); } catch (e) { /* */ } pinta(); };
    pinta(); bar.prepend(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', menuBtn); else menuBtn();

  /* Botón flotante de comentarios: el usuario cuenta qué le costó o qué falló y llega como fila a la hoja
     "Comentarios apps PRB (respuestas)" (Formulario de Google de prbconsultingve@gmail.com). Solo se abre si lo tocan. */
  const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdgcjTS9J7Gdk-14zAN5ReNMxx-8dlpcsw-_oR2lxrYTEc4ZQ/formResponse';
  const E = { app: 'entry.987785807', pantalla: 'entry.487302736', tipo: 'entry.1955921082', comentario: 'entry.728310815', contacto: 'entry.514396738', equipo: 'entry.2112970780' };
  function feedback() {
    if (!document.querySelector('.side') || document.getElementById('prb-fb-btn')) return;
    const b = document.createElement('button'); b.id = 'prb-fb-btn'; b.type = 'button'; b.className = 'prb-fb-btn';
    b.innerHTML = '<i class="ti ti-message-circle" aria-hidden="true"></i><span>Comentarios</span>'; b.title = 'Cuéntanos qué te costó o qué falló';
    document.body.appendChild(b);
    let p = null;
    const cerrar = () => { if (p) { p.remove(); p = null; } };
    b.onclick = () => {
      if (p) return cerrar();
      p = document.createElement('div'); p.id = 'prb-fb'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Enviar comentarios');
      p.innerHTML = '<div class="hd"><b>¿Algo te costó?</b><button type="button" class="x" aria-label="Cerrar">×</button></div>' +
        '<textarea class="inp" rows="3" placeholder="Cuéntanos qué pasó (sin datos de tus clientes o trabajadores)"></textarea>' +
        '<div class="row" style="margin:0;justify-content:flex-end"><button type="button" class="btn">Enviar</button></div>';
      document.body.appendChild(p);
      const ta = p.querySelector('textarea'); ta.focus();
      p.querySelector('.x').onclick = cerrar;
      p.querySelector('.btn').onclick = async (ev) => {
        const txt = ta.value.trim(); if (!txt) { ta.focus(); ta.placeholder = 'Escribe lo que pasó para poder enviarlo'; return; }
        const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Enviando…';
        const brand = document.querySelector('.side .brand'); const app = brand ? brand.childNodes[0].textContent.trim() : document.title;
        const d = new URLSearchParams();
        d.append(E.app, app); d.append(E.pantalla, (location.hash.slice(1) || 'inicio') + ' · ' + location.pathname);
        d.append(E.tipo, 'Comentario'); d.append(E.comentario, txt);
        d.append(E.contacto, ''); d.append(E.equipo, (/Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Teléfono' : 'Computadora') + ' · ' + window.innerWidth + '×' + window.innerHeight + ' · ' + navigator.userAgent.slice(0, 160));
        try { await fetch(FORM, { method: 'POST', mode: 'no-cors', body: d }); p.innerHTML = '<div class="ok"><i class="ti ti-circle-check" aria-hidden="true"></i><b>¡Gracias!</b><span>Lo vamos a revisar para mejorar la app.</span></div>'; setTimeout(cerrar, 2600); }
        catch (e) { btn.disabled = false; btn.textContent = 'Enviar'; const er = document.createElement('p'); er.className = 'prb-ok err'; er.textContent = 'No se pudo enviar. Revisa tu conexión e intenta otra vez.'; btn.before(er); }
      };
    };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', feedback); else feedback();
  window.PRBok = function (msg, err) {
    setTimeout(() => {
      const b = last;
      if (b && b.isConnected && b.offsetParent !== null) {
        if (err) {
          const prev = b.parentNode.querySelector(':scope > .prb-ok'); if (prev) prev.remove();
          const s = document.createElement('span'); s.className = 'prb-ok err'; s.setAttribute('role', 'status'); s.textContent = msg; b.after(s);
          document.addEventListener('click', () => setTimeout(() => s.remove(), 0), { once: true, capture: true });
          return;
        }
        if (b.tagName === 'BUTTON' && !b.dataset.prbOrig && b.offsetWidth > 60) {
          b.dataset.prbOrig = b.innerHTML; const w = b.offsetWidth; b.style.minWidth = w + 'px';
          b.classList.add('ok-now'); b.innerHTML = '✓ ' + esc(msg);
          setTimeout(() => { if (b.dataset.prbOrig != null) { b.innerHTML = b.dataset.prbOrig; delete b.dataset.prbOrig; b.classList.remove('ok-now'); b.style.minWidth = ''; } }, 2000);
          return;
        }
      }
      linea(msg, err);
    }, 0);
  };
})();
