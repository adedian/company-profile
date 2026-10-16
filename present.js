/* Presentation mode: fullscreen, one chapter per screen, ← → to move */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const sections = [...document.querySelectorAll('main > section[data-title]')];
  const startBtn = $('#presentBtn'), ctl = $('#pctl'), count = $('#pCount'), prog = $('#pprog'), main = $('main');
  const prev = $('#pPrev'), next = $('#pNext'), exit = $('#pExit');
  if (!startBtn || !sections.length) return;

  const pages = sections.map(s => ({ el: s, title: s.dataset.title }));

  const MIN_ZOOM = .55;
  let on = false, cur = 0, idleT = 0;

  /* Paged layout (css: html.paged): on laptop-size screens every chapter is exactly one screen, in the normal page too, not only in present mode */
  const pagedMQ = matchMedia('(min-width:981px) and (min-height:520px)');
  const hh = () => on ? 0 : (parseFloat(getComputedStyle(root).getPropertyValue('--hh')) || 64);
  const availH = () => innerHeight - hh();

  function fit(s, shrinkOnly) {
    /* shrink (css zoom) until the chapter no longer overflows its screen; reflow changes the height, so re-measure a few times.
       shrinkOnly (after an interaction): never zoom back up, so auto-playing tabs cannot make the page pulse in and out */
    if (!root.classList.contains('paged')) return;
    const avail = availH();
    let z = shrinkOnly ? (parseFloat(s.style.getPropertyValue('--z')) || 1) : 1;
    s.style.setProperty('--z', z);
    for (let i = 0; i < 5 && z > MIN_ZOOM; i++) {
      s.style.minHeight = '0';
      const h = s.getBoundingClientRect().height;
      s.style.minHeight = '';
      if (h <= avail + 1) break;
      z = Math.max(MIN_ZOOM, z * avail / h - .004);
      s.style.setProperty('--z', z.toFixed(3));
    }
  }
  function fitAll() {
    if (!root.classList.contains('paged')) return;
    const anchor = !on && sections.find(x => x.getBoundingClientRect().bottom > hh() + 40);
    sections.forEach(s => { if (!on || s.classList.contains('pslide')) fit(s); });
    if (anchor) { const d = anchor.getBoundingClientRect().top - hh(); if (Math.abs(d) > 2 && Math.abs(d) < innerHeight) scrollBy(0, d); }
    dispatchEvent(new Event('hme-fit'));
  }
  function syncPaged() {
    const p = on || pagedMQ.matches;
    root.classList.toggle('paged', p);
    if (!p) sections.forEach(s => s.style.removeProperty('--z'));
  }
  let fitT = 0; const dirty = new Set();
  const later = (s, ms) => { if (s) dirty.add(s); clearTimeout(fitT); fitT = setTimeout(() => { if (dirty.size && !on) { dirty.forEach(x => fit(x, true)); } else fitAll(); dirty.clear(); }, ms || 140); };
  syncPaged(); fitAll();
  addEventListener('load', () => { syncPaged(); fitAll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { syncPaged(); fitAll(); });
  pagedMQ.addEventListener && pagedMQ.addEventListener('change', () => { syncPaged(); later(); });
  /* chapter content changes size on interaction (tabs, accordions, org focus, portfolio): re-fit just that chapter */
  new MutationObserver(ms => { if (on) return; ms.forEach(m => { const s = m.target.closest && m.target.closest('main>section'); if (s) dirty.add(s); }); later(null, 220); })
    .observe(main, { subtree: true, attributes: true, attributeFilter: ['hidden', 'data-open', 'data-focus', 'aria-selected'] });
  document.addEventListener('hme-render', e => later(e.target && e.target.closest ? e.target.closest('main>section') : null, 60));

  const redraw = () => { if (window.__hme && window.__hme.update) window.__hme.update(); };

  function show(i, dir) {
    cur = clamp(i, 0, pages.length - 1);
    const pg = pages[cur], s = pg.el;
    sections.forEach(x => x.classList.toggle('pslide', x === s));
    root.classList.toggle('pback', dir < 0);
    s.querySelectorAll('[data-r]').forEach(el => el.classList.add('in'));
    main.scrollTop = 0;
    redraw();
    fit(s);
    requestAnimationFrame(() => { fit(s); dispatchEvent(new Event('resize')); label(); });
    setTimeout(() => { if (on && pages[cur] === pg) { fit(s); label(); } }, 500);
    label();
    prev.disabled = cur === 0; next.disabled = cur === pages.length - 1;
    prog.firstElementChild.style.width = ((cur + 1) / pages.length * 100) + '%';
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  function wake() {
    ctl.classList.remove('idle'); root.classList.remove('pidle');
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (on) { ctl.classList.add('idle'); root.classList.add('pidle'); } }, 2800);
  }

  function currentIndex() {
    let si = 0; sections.forEach((s, k) => { if (s.getBoundingClientRect().top <= 140) si = k; });
    return pages.findIndex(p => p.el === sections[si]);
  }

  function start() {
    if (on) return;
    const intro = window.HMEIntro;
    /* Present always opens with the animation, then the deck starts from the first slide */
    const idx = intro ? 0 : currentIndex();
    on = true;
    root.classList.add('present'); syncPaged();
    const begin = () => { if (!on) return; ctl.hidden = false; prog.hidden = false; show(idx, 1); wake(); };
    if (intro) intro.play(begin); else begin();
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) { try { const p = req.call(root); if (p && p.catch) p.catch(() => {}); } catch (e) { /* stays in windowed present mode */ } }
  }

  function stop() {
    if (!on) return;
    on = false;
    if (window.HMEIntro) window.HMEIntro.cancel();
    const s = pages[cur].el;
    root.classList.remove('present', 'pback', 'pidle');
    sections.forEach(x => x.classList.remove('pslide'));
    ctl.hidden = true; prog.hidden = true; clearTimeout(idleT);
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) { const ex = document.exitFullscreen || document.webkitExitFullscreen; try { const p = ex.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
    syncPaged();
    redraw();
    fitAll();
    s.scrollIntoView({ behavior: 'auto', block: 'start' });
    dispatchEvent(new Event('resize'));
  }

  /* a page taller than the screen (even after shrinking) is scrolled through before moving on */
  const step = () => main.clientHeight * .9;
  const canScroll = d => d > 0 ? main.scrollTop + main.clientHeight < main.scrollHeight - 24 : main.scrollTop > 24;
  function label() {
    const sub = Math.ceil(Math.max(0, main.scrollHeight - main.clientHeight - 24) / step() - .05) + 1;
    let t = '<b>' + (cur + 1) + '</b> / ' + pages.length + ' <em>· ' + pages[cur].title;
    if (sub > 1) t += ' · ' + clamp(Math.round(main.scrollTop / step()) + 1, 1, sub) + '/' + sub;
    count.innerHTML = t + '</em>';
  }
  const go = d => {
    if (canScroll(d)) main.scrollTo({ top: clamp(main.scrollTop + d * step(), 0, main.scrollHeight), behavior: 'smooth' });
    else { const n = clamp(cur + d, 0, pages.length - 1); if (n !== cur) show(n, d); }
    wake();
  };
  main.addEventListener('scroll', () => { if (on) label(); }, { passive: true });

  startBtn.addEventListener('click', start);
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  exit.addEventListener('click', stop);

  document.addEventListener('fullscreenchange', () => { if (on && !document.fullscreenElement) stop(); });
  document.addEventListener('webkitfullscreenchange', () => { if (on && !document.webkitFullscreenElement) stop(); });

  /* capture phase: wins over the page-scroll handler in app.js and the 3D canvas arrow handler */
  addEventListener('keydown', e => {
    if (!on || e.altKey || e.ctrlKey || e.metaKey) return;
    if (window.HMEIntro && window.HMEIntro.active && e.key !== 'Escape') {
      if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); window.HMEIntro.skip(); }
      return;
    }
    const t = e.target;
    if (t && t.closest && t.closest('textarea,input[type=text],input[type=search],input[type=number]')) return;
    let d = 0;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': d = 1; break;
      case 'ArrowLeft': case 'PageUp': d = -1; break;
      case ' ': d = e.shiftKey ? -1 : 1; break;
      case 'Home': show(0, -1); wake(); break;
      case 'End': show(pages.length - 1, 1); wake(); break;
      case 'Escape': stop(); break;
      default: return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    if (d) go(d);
  }, true);

  addEventListener('pointermove', () => { if (on) wake(); }, { passive: true });

  addEventListener('resize', () => { if (on) fit(pages[cur].el); else { syncPaged(); later(); } });

  /* touch: swipe left / right */
  let tx = null, ty = 0;
  main.addEventListener('touchstart', e => { if (on && e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } }, { passive: true });
  main.addEventListener('touchend', e => {
    if (!on || tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('#chart,#stage3d,.scene-scroll,.chart-scroll,input[type=range]')) go(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
