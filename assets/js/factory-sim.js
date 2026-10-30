/*
 * Scroll-driven opening - vanilla JS, no dependencies.
 *
 * MAIN MODE: our own real-time 3D factory (assets/js/hme-world-core.js + hme-world.js, WebGL2).
 *   Scroll position -> progress 0..1 -> time on the 3D timeline -> engine.draw(t). The time is not applied directly: a
 *   critically-damped follower chases it every frame, so wheel clicks, trackpad flicks and touch fling all turn into one
 *   continuous camera glide. The loop only runs while the picture still has to move and the section is on screen.
 * FALLBACK: real HME photographs (one per chapter) dissolve into each other. Used when WebGL is unavailable, on
 *   data-saver / very low-end devices, or if the GPU context is lost. Reduced motion shows a static layout instead.
 *
 * Scroll is never locked or hijacked. One passive, rAF-throttled scroll listener, attached only while the track is near the viewport.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-sim]');
  if (!root) return;

  var stage = root.querySelector('[data-stage]');
  var intro = root.querySelector('[data-intro]');
  var canvas = root.querySelector('[data-canvas]');
  var sourceEl = root.querySelector('[data-source]');
  var frames = Array.prototype.slice.call(root.querySelectorAll('[data-frame]'));
  var chapters = Array.prototype.slice.call(root.querySelectorAll('[data-chapter]'));
  var railItems = Array.prototype.slice.call(root.querySelectorAll('.sim-rail li'));
  var gotoBtns = Array.prototype.slice.call(root.querySelectorAll('[data-goto]'));
  var N = frames.length;
  var enginePaths = (root.getAttribute('data-engine') || '').split(',').filter(Boolean);
  var has3dData = !!(canvas && enginePaths.length);

  function hydrate(img) {
    if (!img || !img.dataset.src) return;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    delete img.dataset.src; delete img.dataset.srcset;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { return t * t * (3 - 2 * t); }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('is-static');
    frames.forEach(function (f) { hydrate(f.querySelector('img')); });
    return;
  }

  /* ------------------------------------------------------------------ photo fallback ------------------------------- */
  var FADE = 0.38;
  var lastFrame = new WeakMap();
  function setFrame(el, a, s) {
    a = Math.round(a * 1000) / 1000; s = Math.round(s * 1000) / 1000;
    var prev = lastFrame.get(el);
    if (prev && prev[0] === a && prev[1] === s) return;
    lastFrame.set(el, [a, s]);
    el.style.setProperty('--a', a);
    el.style.setProperty('--s', s);
  }
  function renderPhotos(p) {
    var x = p * N;
    for (var i = 0; i < N; i++) {
      var t = x - i, a;
      if (i === 0) a = t < 1 - FADE / 2 ? 1 : 1 - ease(clamp((t - (1 - FADE / 2)) / FADE, 0, 1));
      else if (i === N - 1) a = ease(clamp((t + FADE / 2) / FADE, 0, 1));
      else a = ease(clamp((t + FADE / 2) / FADE, 0, 1)) * (1 - ease(clamp((t - (1 - FADE / 2)) / FADE, 0, 1)));
      var s = 1 + 0.1 * clamp(t + 0.5, 0, 1.5) + 0.22 * ease(clamp(t - (1 - FADE / 2), 0, 1));
      setFrame(frames[i], a, s);
      var img = frames[i].querySelector('img');
      if (a > 0.01 && img && img.dataset.src) hydrate(img);
    }
    var ahead = Math.min(N - 1, Math.floor(x) + 1);
    hydrate(frames[ahead].querySelector('img'));
  }

  /* ------------------------------------------------------------------ shared UI (intro, chapters, rail) ---------- */
  var lastI = -1, current = -1;
  function renderUI(p) {
    var iv = ease(clamp((p - 0.012) / 0.06, 0, 1));
    if (iv !== lastI) {
      lastI = iv;
      stage.style.setProperty('--i', Math.round(iv * 1000) / 1000);
      if (intro) intro.classList.toggle('is-gone', iv > 0.9);
    }
    var n = clamp(Math.floor(p * N + 0.1), 0, N - 1);
    if (p < 0.02) n = 0;
    if (n !== current) {
      current = n;
      chapters.forEach(function (c, idx) {
        var on = idx === n;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      railItems.forEach(function (li, idx) { li.classList.toggle('is-on', idx === n); });
      gotoBtns.forEach(function (b, idx) { if (idx === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
  }

  /* ------------------------------------------------------------------ 3D mode ------------------------------------- */
  var engine = null, engineState = 'idle';   // idle | loading | ready | failed
  var tTarget = 0, tCur = 0, tVel = 0, raf = 0, lastTs = 0, visible = true;
  var QMAX = 1, quality = 0.8, samples = [], isMobile = window.matchMedia('(max-width: 900px)');
  // Camera follower time in seconds: short enough to feel instant, long enough to smooth out the steps of wheel scrolling.
  var SMOOTH = 0.14;

  function timeOf(p) { return clamp(p, 0, 1); }   // the 3D world is driven directly by scroll progress (0..1)

  // One stable canvas size (resizing mid-scroll causes hitches). The resolution scale only ever steps DOWN, and only when frames are slow.
  function sizeCanvas() {
    var w = stage.clientWidth, h = stage.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, isMobile.matches ? 1.25 : 1.5) * quality;
    var cw = Math.max(2, Math.round(w * dpr)), ch = Math.max(2, Math.round(h * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; return true; }
    return false;
  }

  function frame(ts) {
    raf = 0;
    if (!engine) return;
    var rem = lastTs ? Math.min(0.3, (ts - lastTs) / 1000) : 1 / 60;
    var t0 = lastTs; lastTs = ts;
    // SmoothDamp (critically damped spring): position AND velocity are continuous. Stepped in <=1/60 s slices so a slow frame
    // never changes how the motion behaves, it only makes fewer steps visible.
    var om = SMOOTH > 0 ? 2 / SMOOTH : 0;
    if (!om) { tCur = tTarget; tVel = 0; rem = 0; }
    while (rem > 1e-4) {
      var dt = Math.min(rem, 1 / 120); rem -= dt;
      var x = om * dt, ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      var ch = tCur - tTarget, tmp = (tVel + om * ch) * dt;
      tVel = (tVel - om * tmp) * ex;
      tCur = tTarget + (ch + tmp) * ex;
    }
    if (Math.abs(tTarget - tCur) < 0.00004 && Math.abs(tVel) < 0.0004) { tCur = tTarget; tVel = 0; }

    // adaptive resolution (measured on the previous frames; resized BEFORE drawing so the canvas never shows a blank frame)
    if (t0) {
      samples.push(ts - t0);
      var n = samples.length;
      if (n >= 8) {
        var avg = samples.reduce(function (a, b) { return a + b; }, 0) / n;
        if (avg > 22 && quality > 0.5) { quality = Math.max(0.5, quality * 0.85); sizeCanvas(); samples = []; }
        else if (n >= 45) samples = [];
      }
    }
    engine.draw(tCur, Math.abs(tVel) > 0.45);

    if ((tCur !== tTarget || tVel !== 0 || (engine.busy && engine.busy())) && visible) raf = requestAnimationFrame(frame); else lastTs = 0;
  }
  function kick() { if (engine && !raf && visible) raf = requestAnimationFrame(frame); }

  function leave3d() {
    // GPU trouble: go back to the photographs
    engine = null; engineState = 'failed';
    root.classList.remove('is-3d');
    if (sourceEl) sourceEl.textContent = sourceEl.getAttribute('data-photo');
    renderPhotos(progress());
  }

  function start3d() {
    if (engineState !== 'idle' || !has3dData) return;
    var conn = navigator.connection || {};
    var weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    if (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '') || weak) { engineState = 'failed'; return; }
    engineState = 'loading';

    function ready() {
      var eng = null;
      try {
        sizeCanvas();
        var callouts = [];
        try { callouts = JSON.parse(root.getAttribute('data-callouts') || '[]'); } catch (err) { callouts = []; }
        eng = window.HMEWorld ? window.HMEWorld.create(canvas, stage, { logo: root.getAttribute('data-logo'), shadowSize: 1024, callouts: callouts }) : null;
      } catch (e) { eng = null; if (window.console) console.warn('HME 3D opening disabled:', e); }
      if (!eng) { engineState = 'failed'; return; }
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); leave3d(); });
      // warm-up: draw the scene at a few poses, one per task, so every shader variant is compiled and every buffer uploaded
      // BEFORE the visitor sees the canvas (otherwise the first scroll through each chapter hitches).
      var warm = [0.17, 0.4, 0.58, 0.75, 0.97], wi = 0;
      (function step() {
        if (wi < warm.length) {
          try { eng.draw(warm[wi++]); } catch (e) { engineState = 'failed'; return; }
          setTimeout(step, 30);
          return;
        }
        engine = eng; engineState = 'ready';
        tTarget = tCur = timeOf(progress()); tVel = 0;
        engine.draw(tCur);
        root.classList.add('is-3d');
        if (sourceEl) sourceEl.textContent = sourceEl.getAttribute('data-3d');
        window.addEventListener('resize', function () { if (engine && sizeCanvas()) { engine.draw(tCur); } }, { passive: true });
      })();
    }
    // load the engine files one after the other (core first)
    (function next(i) {
      if (i >= enginePaths.length) { ready(); return; }
      var sc = document.createElement('script');
      sc.src = enginePaths[i]; sc.async = false;
      sc.onerror = function () { engineState = 'failed'; };
      sc.onload = function () { next(i + 1); };
      document.head.appendChild(sc);
    })(0);
  }

  /* ------------------------------------------------------------------ progress + scroll ---------------------------- */
  function progress() {
    var r = root.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  function render(p) {
    renderUI(p);
    if (engine) { tTarget = timeOf(p); kick(); }
    else renderPhotos(p);
  }

  var ticking = false, active = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(progress()); });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      visible = vis;
      if (vis && !active) { window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll, { passive: true }); active = true; onScroll(); kick(); }
      else if (!vis && active) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); active = false; render(progress()); }
    }, { rootMargin: '200px 0px' }).observe(root);
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }
  render(progress());

  // The first paint (photo + headline) comes first; the 3D engine is loaded right after the page is idle.
  var idle = window.requestIdleCallback || function (f) { setTimeout(f, 600); };
  function afterLoad(fn) { if (document.readyState === 'complete') idle(fn); else window.addEventListener('load', function () { idle(fn); }, { once: true }); }
  // the engine builds its geometry on first use (a CPU burst), so wait until the page is quiet; a first scroll/touch starts it at once
  afterLoad(function () { setTimeout(start3d, 300); });
  // photo fallback assets: warm the next photo only when 3D is not going to be used
  afterLoad(function () { if (engineState !== 'ready' && engineState !== 'loading') hydrate(frames[1] && frames[1].querySelector('img')); });
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (engineState === 'idle') start3d(); }, { once: true, passive: true });
  });

  // pressable 3D callouts open a detail card (same idea as the Company Profile presentation); its button scrolls to the moment the pipe sprays water
  var infoEls = Array.prototype.slice.call(root.querySelectorAll('[data-info]'));
  function scrollToProgress(p) {
    var r = root.getBoundingClientRect();
    var top = r.top + window.scrollY + p * (r.height - window.innerHeight);
    if (window.hmeScroll) window.hmeScroll.to(top); else window.scrollTo({ top: top, behavior: 'smooth' });
  }
  var sprayOn = false;
  function setSpray(el, on) {
    sprayOn = on;
    var cta = el.querySelector('[data-info-cta]');
    if (cta) cta.textContent = on ? cta.getAttribute('data-off') : cta.getAttribute('data-on');
  }
  function focusEngine(key, spray) { if (engine && engine.setFocus) { engine.setFocus(key, spray); kick(); } }
  function closeInfo() { infoEls.forEach(function (el) { el.hidden = true; setSpray(el, false); }); focusEngine(null, false); }
  var INFO_P = { pipe: { show: [0.34, 0.58], open: 0.46 } };
  if (infoEls.length) {
    stage.addEventListener('click', function (e) {
      var pill = e.target.closest && e.target.closest('.pi-c[data-key]');
      if (!pill) return;
      var key = pill.getAttribute('data-key');
      infoEls.forEach(function (el) { el.hidden = el.getAttribute('data-info') !== key; setSpray(el, false); });
      // the part is fully installed from this point of the timeline on
      var cfg = INFO_P[key];
      if (cfg && progress() < cfg.open - 0.004) scrollToProgress(cfg.open);
      focusEngine(key, false);
    });
    infoEls.forEach(function (el) {
      var key = el.getAttribute('data-info');
      el.querySelector('[data-info-close]').addEventListener('click', closeInfo);
      var cta = el.querySelector('[data-info-cta]');
      if (cta) cta.addEventListener('click', function () { setSpray(el, !sprayOn); focusEngine(key, sprayOn); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeInfo(); });
    window.addEventListener('scroll', function () {
      var p = progress();
      infoEls.forEach(function (el) {
        var rg = INFO_P[el.getAttribute('data-info')];
        if (!el.hidden && rg && (p < rg.show[0] || p > rg.show[1])) closeInfo();
      });
    }, { passive: true });
  }

  // "Lewati animasi": jump straight past the track (instant, so the browser does not scroll through six screens)
  var skipBtn = root.querySelector('[data-skip]');
  if (skipBtn) skipBtn.addEventListener('click', function (e) {
    e.preventDefault();
    var next = document.getElementById('about');
    var r = root.getBoundingClientRect();
    var top = next ? next.getBoundingClientRect().top + window.scrollY : r.bottom + window.scrollY;
    window.scrollTo({ top: top - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72) + 1, behavior: 'instant' });
    if (next) { next.setAttribute('tabindex', '-1'); next.focus({ preventScroll: true }); }
  });

  // chapter buttons: smooth jump to the start of a chapter
  gotoBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = parseInt(b.getAttribute('data-goto'), 10);
      var p = k === 0 ? 0.01 : (k + 0.02) / N;
      var r = root.getBoundingClientRect();
      var top = r.top + window.scrollY + p * (r.height - window.innerHeight);
      if (window.hmeScroll) window.hmeScroll.to(top); else window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
})();
