/*
 * Anchor / back-to-top glide - PT Hexa Multi Energi (vanilla JS, no dependencies)
 *
 * Normal wheel / trackpad scrolling is deliberately left to the browser (it runs off the main thread, so it never lags).
 * This only animates programmatic jumps (in-page anchors, "back to top", chapter buttons) with a critically damped spring.
 * Desktop pointers only; skipped for prefers-reduced-motion. Keyboard / scrollbar scrolling cancels a glide.
 *
 * API: window.hmeScroll.to(y | element, { offset })
 */
(function () {
  'use strict';

  var doc = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var SMOOTH = 0.45;   // seconds to settle for anchor and back-to-top glides

  var cur = window.scrollY, target = cur, written = cur, vel = 0, raf = 0, lastTs = 0;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function maxScroll() { return Math.max(0, doc.scrollHeight - window.innerHeight); }

  function frame(ts) {
    raf = 0;
    // someone else moved the page (keyboard, scrollbar, find-in-page): stop and follow them
    if (Math.abs(window.scrollY - written) > 2) { cur = target = written = window.scrollY; vel = 0; lastTs = 0; return; }
    var rem = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 1 / 60;
    lastTs = ts;
    // SmoothDamp (critically damped spring): position AND velocity stay continuous, so the glide starts and stops softly.
    // Stepped in <= 1/120 s slices so the result does not depend on the monitor's refresh rate.
    var om = 2 / SMOOTH;
    while (rem > 1e-4) {
      var dt = Math.min(rem, 1 / 120); rem -= dt;
      var x = om * dt, ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      var ch = cur - target, tmp = (vel + om * ch) * dt;
      vel = (vel - om * tmp) * ex;
      cur = target + (ch + tmp) * ex;
    }
    if (Math.abs(target - cur) < 0.1 && Math.abs(vel) < 0.5) { cur = target; vel = 0; }
    window.scrollTo({ top: cur, behavior: 'instant' });
    written = window.scrollY;
    if (cur !== target || vel !== 0) raf = requestAnimationFrame(frame); else lastTs = 0;
  }
  function run() { if (!raf) raf = requestAnimationFrame(frame); }

  // Native scrolling while we are idle (keyboard, scrollbar, programmatic): keep cur/target in step.
  window.addEventListener('scroll', function () {
    if (!raf && Math.abs(window.scrollY - written) > 0.5) { cur = target = written = window.scrollY; vel = 0; }
  }, { passive: true });

  function headerOffset() {
    return parseFloat(getComputedStyle(doc).getPropertyValue('--header-h')) || 0;
  }

  function to(dest, opts) {
    opts = opts || {};
    var y;
    if (typeof dest === 'number') y = dest;
    else if (dest && dest.getBoundingClientRect) {
      var sm = parseFloat(getComputedStyle(dest).scrollMarginTop) || 0;
      y = dest.getBoundingClientRect().top + window.scrollY - sm - (opts.offset != null ? opts.offset : headerOffset());
    } else return;
    if (!raf) { cur = written = window.scrollY; vel = 0; }
    target = clamp(y, 0, maxScroll());
    run();
  }
  window.hmeScroll = { to: to };

  // in-page anchors glide too (and still update the address bar + focus for keyboard users)
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.target || a.hasAttribute('download') || a.hasAttribute('data-to-top')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin || u.pathname !== location.pathname || u.search !== location.search) return;
    var id = decodeURIComponent(u.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    to(el);
    if (history.pushState && u.hash !== location.hash) history.pushState(null, '', u.hash);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });
})();
