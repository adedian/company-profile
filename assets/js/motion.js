/*
 * Motion helpers - PT Hexa Multi Energi (vanilla JS, no dependencies)
 *
 *  [data-split]            headline split into words; each word slides up (styles in animations.css).
 *                          data-split="load" animates right away (page heroes); otherwise scroll-reveal.js triggers it.
 *  [data-count="N"]        number counts up once when it enters the screen. Optional: data-prefix, data-suffix,
 *                          data-fmt="raw" (no thousands separator), data-decimals.
 *  [data-parallax="0.12"]  subtle vertical parallax while the element is on screen (transform only).
 *  [data-magnetic]         buttons lean a few pixels towards the pointer (pointer: fine devices only).
 *  .marquee                paused while off screen.
 *
 * Everything is skipped (final state shown) when the visitor prefers reduced motion.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- split headlines into words ---------- */
  $$('[data-split]').forEach(function (el) {
    if (reduce) return;
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    el.setAttribute('aria-label', text);
    var frag = document.createDocumentFragment();
    text.split(' ').forEach(function (word, i, all) {
      var outer = document.createElement('span');
      outer.className = 'sw';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.style.setProperty('--w', i);
      inner.textContent = word;
      outer.appendChild(inner);
      frag.appendChild(outer);
      if (i < all.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.appendChild(frag);
    if (el.getAttribute('data-split') === 'load') {
      requestAnimationFrame(function () { el.classList.add('is-visible'); });
    }
  });

  /* ---------- counters ---------- */
  var numLocale = (document.documentElement.lang || 'id') === 'en' ? 'en-US' : 'id-ID';
  var nf = new Intl.NumberFormat(numLocale);
  function fmt(el, v) {
    var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var raw = el.getAttribute('data-fmt') === 'raw';
    var s = raw ? String(Math.round(v)) : (d ? v.toLocaleString(numLocale, { minimumFractionDigits: d, maximumFractionDigits: d }) : nf.format(Math.round(v)));
    return (el.getAttribute('data-prefix') || '') + s + (el.getAttribute('data-suffix') || '');
  }
  var counters = $$('[data-count]');
  function runCounter(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    if (isNaN(end)) return;
    if (reduce || !window.requestAnimationFrame) { el.textContent = fmt(el, end); return; }
    var t0 = null, dur = 1500;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(el, end * eased);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(el, end);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if ('IntersectionObserver' in window && !reduce) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); } });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { el.textContent = fmt(el, 0); cio.observe(el); });
    } else {
      counters.forEach(function (el) { runCounter(el); });
    }
  }

  /* ---------- parallax (only while visible; one rAF per scroll tick) ---------- */
  var pxEls = $$('[data-parallax]');
  if (pxEls.length && !reduce && 'IntersectionObserver' in window) {
    var live = [], ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      live.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        var f = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var off = ((r.top + r.height / 2) - vh / 2) * -f;
        el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
      });
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = live.indexOf(en.target);
        if (en.isIntersecting && i < 0) live.push(en.target);
        else if (!en.isIntersecting && i >= 0) live.splice(i, 1);
      });
      if (live.length) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
      else window.removeEventListener('scroll', onScroll);
    }, { rootMargin: '20% 0px' });
    pxEls.forEach(function (el) { pio.observe(el); });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-magnetic]').forEach(function (el) {
      var raf = 0;
      el.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          el.style.setProperty('--mx', (dx * 10).toFixed(1) + 'px');
          el.style.setProperty('--my', (dy * 7).toFixed(1) + 'px');
        });
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- marquees: stop while off screen ---------- */
  var marquees = $$('.marquee');
  if (marquees.length && 'IntersectionObserver' in window) {
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    });
    marquees.forEach(function (m) { mio.observe(m); });
  }
})();
