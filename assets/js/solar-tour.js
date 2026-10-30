/*
 * Solar PV Tour (home hero) - vanilla JS.
 *  - Auto-advances scene by scene; each scene's progress bar animation drives the timing (animationend).
 *  - Pauses while off screen, when the tab is hidden, on hover/focus, or after a manual choice finishes.
 *  - Lazy-loads scenes 2+ after the first paint; optionally loads a background video when files exist,
 *    the connection allows it and the visitor has not asked for reduced motion / data saving.
 *  - Never locks scroll, never blocks interaction.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-tour]');
  if (!root) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');

  var scenes = Array.prototype.slice.call(root.querySelectorAll('[data-scene]'));
  var caps = Array.prototype.slice.call(root.querySelectorAll('.tour-cap'));
  var items = Array.prototype.slice.call(root.querySelectorAll('.tour-progress li'));
  var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-go]'));
  var video = root.querySelector('[data-video]');
  var idx = 0;
  var paused = { offscreen: false, hidden: false, hover: false };

  function updatePause() {
    var p = paused.offscreen || paused.hidden || paused.hover;
    root.classList.toggle('is-paused', p);
  }

  /* ---- lazy scenes: swap data-src into src once the page has painted ---- */
  function hydrate(img) {
    if (!img || !img.dataset.src) return;
    if (img.dataset.srcset) { img.srcset = img.dataset.srcset; }
    img.src = img.dataset.src;
    delete img.dataset.src; delete img.dataset.srcset;
  }
  function hydrateAll() { scenes.forEach(function (s) { hydrate(s.querySelector('img')); }); }
  function afterPaint(fn) {
    var run = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(fn); };
    if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true });
  }
  // Load photos just in time (one scene ahead) instead of all at once: saves mobile data and keeps the first paint fast.
  var DUR = (parseFloat(getComputedStyle(root).getPropertyValue("--dur")) || 7.5) * 1000;
  function warm(n) { hydrate(scenes[(n + 1) % scenes.length].querySelector("img")); }
  function scheduleWarm(n, delay) { setTimeout(function () { if (!document.hidden) warm(n); else window.addEventListener("focus", function () { warm(n); }, { once: true }); }, delay); }
  scheduleWarm(0, Math.max(2500, DUR - 2800));
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { window.addEventListener(ev, function () { hydrateAll(); }, { once: true, passive: true }); });

  /* ---- scene switching ---- */
  function show(n, manual) {
    n = (n + scenes.length) % scenes.length;
    if (n === idx && !manual) return;
    var prev = scenes[idx];
    hydrate(scenes[n].querySelector('img'));
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    setTimeout(function () { prev.classList.remove('is-leaving'); }, 1300);

    // restart the new scene's camera move from the beginning
    var next = scenes[n];
    next.classList.remove('is-leaving');
    var img = next.querySelector('img');
    if (img) { img.style.animation = 'none'; void img.offsetWidth; img.style.animation = ''; }
    next.classList.add('is-active');

    caps.forEach(function (c, i) { c.classList.toggle('is-active', i === n); });
    items.forEach(function (li, i) {
      li.classList.remove('is-active', 'is-done');
      if (i < n) li.classList.add('is-done');
      if (i === n) {
        // restart the progress animation
        var bar = li.querySelector('i');
        if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
        li.classList.add('is-active');
      }
    });
    buttons.forEach(function (b, i) { if (i === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    scenes.forEach(function (s, i) { s.setAttribute('aria-hidden', i === n ? 'false' : 'true'); });
    idx = n;
    scheduleWarm(n, Math.max(2500, DUR - 2800));
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { show(parseInt(b.getAttribute('data-go'), 10), true); });
  });

  // The progress bar of the active scene finishes => go to the next scene (skipped for reduced motion: static)
  if (!reduce) {
    root.addEventListener('animationend', function (e) {
      if (e.animationName !== 'tour-fill' || root.classList.contains('has-video')) return;
      show(idx + 1);
    });
  } else {
    items.forEach(function (li) { li.classList.remove('is-active'); });
    if (items[0]) items[0].classList.add('is-active');
  }

  /* ---- pause when it should not run ---- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      paused.offscreen = !entries[0].isIntersecting;
      updatePause();
      if (video && !video.paused && paused.offscreen) video.pause();
      else if (video && root.classList.contains('has-video') && !paused.offscreen && !paused.hidden) video.play().catch(function () {});
    }, { threshold: 0.12 }).observe(root);
  }
  document.addEventListener('visibilitychange', function () { paused.hidden = document.hidden; updatePause(); });
  var bar = root.querySelector('.tour-bar');
  if (bar) {
    bar.addEventListener('mouseenter', function () { paused.hover = true; updatePause(); });
    bar.addEventListener('mouseleave', function () { paused.hover = false; updatePause(); });
    bar.addEventListener('focusin', function () { paused.hover = true; updatePause(); });
    bar.addEventListener('focusout', function () { paused.hover = false; updatePause(); });
  }

  /* ---- optional video ---- */
  if (video && !reduce && !saveData) {
    afterPaint(function () {
      var mobile = window.matchMedia('(max-width: 700px)').matches;
      var src = (mobile && video.dataset.srcMobile) || video.dataset.srcDesktop || video.dataset.srcMobile;
      var webm = !mobile && video.dataset.srcWebm && video.canPlayType('video/webm; codecs="vp9"');
      src = webm ? video.dataset.srcWebm : src;
      if (!src) return;
      var fail = function () { video.remove(); root.classList.remove('has-video'); };
      video.addEventListener('error', fail, { once: true });
      video.addEventListener('playing', function () { root.classList.add('has-video'); }, { once: true });
      video.preload = 'metadata';
      video.src = src;
      var p = video.play();
      if (p && p.catch) p.catch(fail); // autoplay blocked: keep the photo tour
    });
  }
})();
