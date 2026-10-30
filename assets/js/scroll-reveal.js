/*
 * Scroll reveal (Intersection Observer) - PT Hexa Multi Energi
 *
 * Classes:  .reveal / .reveal-up (fade-up)  .reveal-left  .reveal-right  .reveal-scale  .reveal-clip  .reveal-mask (image wipe)
 *            .reveal-draw (line draws itself)  [data-split] (headline words)  .stagger-item
 * Add data-stagger to a parent to delay its .stagger-item children one after another.
 *
 * Safety rules:
 *  - Content is visible by default. The hidden "pending" state is only applied by this script, and only to
 *    elements that are still below the fold, so nothing is hidden if JS fails, IO is missing, or the user
 *    prefers reduced motion.
 *  - Each element animates once, when it enters the viewport (one observer, no scroll handlers).
 *  - Animations only use opacity + transform (see animations.css).
 */
(function () {
  'use strict';

  var SELECTOR = '.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-clip, .reveal-mask, .reveal-draw, [data-split]:not([data-split="load"]), .stagger-item';
  var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  if (!els.length) return;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Stagger index: position among the .stagger-item siblings of each [data-stagger] parent
  Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (parent) {
    var n = 0;
    Array.prototype.forEach.call(parent.children, function (child) {
      if (child.classList.contains('stagger-item')) { child.style.setProperty('--i', Math.min(n, 8)); n++; }
    });
  });

  function show(el) {
    el.removeAttribute('data-reveal');
    el.classList.add('is-visible');
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      show(entry.target);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  var vh = window.innerHeight || document.documentElement.clientHeight;
  els.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < vh * 0.9) return; // already on screen at load (or above it): never hide
    el.setAttribute('data-reveal', 'pending');
    io.observe(el);
  });

  // Safety net: if an observer callback never arrives (unusual embeds, very tall viewports) show what is on screen.
  setTimeout(function () {
    els.forEach(function (el) {
      if (el.getAttribute('data-reveal') !== 'pending') return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { show(el); io.unobserve(el); }
    });
  }, 2500);

  // Printing / saving as PDF must never show blanks.
  window.addEventListener('beforeprint', function () {
    els.forEach(function (el) { if (el.getAttribute('data-reveal') === 'pending') { show(el); io.unobserve(el); } });
  });
})();
