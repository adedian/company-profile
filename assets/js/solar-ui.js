/*
 * Interactive solar UI - PT Hexa Multi Energi (vanilla JS, no dependencies)
 *
 *  [data-explorer]   On-Grid / Off-Grid / Hybrid diagram: pick a system, click a component, simulate a PLN outage.
 *  [data-showcase]   project explorer: category filter, big photo, capacity bars.
 *  [data-story]      scroll storytelling: the sticky picture follows the step that is on screen.
 *  [data-lightbox]   click-to-zoom pictures (career posters).
 *  [data-post-filter] live search over the news list.
 *
 * Each module only starts when its root element exists on the page. Nothing here hijacks scrolling.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* UI strings of the page language (JSON written by includes/footer.php); fallback = Indonesian text given by the caller */
  var I18N = {};
  try { I18N = JSON.parse(($('#hme-i18n') || {}).textContent || '{}') || {}; } catch (err) { I18N = {}; }
  function tr(key, vars, fallback) {
    var s = I18N[key] || fallback || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  /* ================================================================== system explorer ============================ */
  function initExplorer(root) {
    var cfgEl = $('[data-exp-json]', root);
    if (!cfgEl) return;
    var cfg = JSON.parse(cfgEl.textContent);
    var board = $('[data-board]', root), svg = $('[data-lines]', root);
    var infoBox = $('[data-info]', root), infoTitle = $('[data-info-title]', root), infoText = $('[data-info-text]', root), status = $('[data-status]', root);
    var tag = $('[data-exp-tag]', root), outageBtn = $('[data-outage]', root);
    var tabs = $$('[data-system]', root), specs = $$('[data-spec]', root);
    var nodes = {};
    $$('[data-node]', root).forEach(function (n) { nodes[n.getAttribute('data-node')] = n; });

    // [from, to, kind, id]  (the path is drawn from -> to; the dots travel in that direction)
    var EDGES = [
      ['panel', 'inverter', 'flow', 'p-i'],
      ['inverter', 'dist', 'flow', 'i-d'],
      ['dist', 'load', 'flow', 'd-l'],
      ['grid', 'dist', 'flow', 'g-d'],
      ['inverter', 'battery', 'flow', 'i-b'],
      ['monitor', 'inverter', 'data', 'm-i']
    ];
    var state = { system: 'ongrid', outage: false, sel: 'panel' };
    var parts = {};

    function has(n) { return cfg.systems[state.system].nodes.indexOf(n) >= 0; }

    function edgeState(e) {
      var a = e[0], b = e[1], kind = e[2], id = e[3];
      var present = has(a) && has(b);
      var from = a, to = b, live = true;
      if (state.outage) {
        if (state.system === 'ongrid') live = false;          // the inverter stops, so nothing flows
        if (state.system === 'hybrid') {
          if (id === 'g-d') live = false;
          if (id === 'i-b') { from = 'battery'; to = 'inverter'; }
        }
      }
      return { present: present, from: from, to: to, live: live, kind: kind };
    }

    function center(n) { return [n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2]; }

    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      parts = {};
      svg.setAttribute('viewBox', '0 0 ' + board.offsetWidth + ' ' + board.offsetHeight);
      EDGES.forEach(function (e) {
        var st = edgeState(e);
        var A = nodes[st.from], B = nodes[st.to];
        if (!A || !B) return;
        var a = center(A), b = center(B);
        var d = 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
        var base = document.createElementNS(SVGNS, 'path');
        base.setAttribute('d', d);
        base.setAttribute('class', 'exp-line' + (st.kind === 'data' ? ' exp-line--dash' : '') + (st.present ? '' : ' is-off'));
        var flow = document.createElementNS(SVGNS, 'path');
        flow.setAttribute('d', d);
        flow.setAttribute('class', 'exp-flow' + (st.kind === 'data' ? ' exp-flow--blue' : '') + (st.present && st.live ? '' : ' is-off'));
        svg.appendChild(base); svg.appendChild(flow);
      });
    }

    function applyNodes() {
      Object.keys(nodes).forEach(function (k) {
        var n = nodes[k];
        n.classList.toggle('is-off', !has(k));
        var down = false;
        if (state.outage) {
          if (state.system === 'ongrid') down = (k === 'inverter' || k === 'dist' || k === 'load' || k === 'grid');
          if (state.system === 'hybrid') down = (k === 'grid');
        }
        n.classList.toggle('is-down', down);
        n.setAttribute('tabindex', has(k) ? '0' : '-1');
        n.setAttribute('aria-hidden', has(k) ? 'false' : 'true');
      });
    }

    function applyStatus() {
      root.classList.toggle('is-outage', state.outage);
      status.textContent = state.outage ? tr('outage', { text: cfg.systems[state.system].outage }, 'PLN padam: {text}') : tr('status_ok', null, 'Sistem normal');
    }

    function select(name) {
      if (!nodes[name] || !has(name)) return;
      state.sel = name;
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.toggle('is-sel', k === name); });
      var c = cfg.components[name];
      if (!c) return;
      infoTitle.textContent = c[0];
      infoText.textContent = c[1];
      if (!reduce) { infoBox.classList.remove('is-swap'); void infoBox.offsetWidth; infoBox.classList.add('is-swap'); }
    }

    function setSystem(k, focus) {
      state.system = k;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-system') === k;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      specs.forEach(function (s) { s.hidden = s.getAttribute('data-spec') !== k; });
      tag.textContent = cfg.systems[k].tag;
      applyNodes(); applyStatus(); draw();
      if (!has(state.sel)) select('panel'); else select(state.sel);
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setSystem(t.getAttribute('data-system'), false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); setSystem(n.getAttribute('data-system'), true); }
      });
    });
    outageBtn.addEventListener('click', function () {
      state.outage = !state.outage;
      outageBtn.setAttribute('aria-pressed', state.outage ? 'true' : 'false');
      applyNodes(); applyStatus(); draw();
    });
    var hoverOk = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    Object.keys(nodes).forEach(function (k) {
      nodes[k].addEventListener('click', function () { select(k); });
      nodes[k].addEventListener('focus', function () { select(k); });
      if (hoverOk) nodes[k].addEventListener('mouseenter', function () { select(k); });
    });

    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(board);
    else window.addEventListener('resize', draw);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { root.classList.toggle('is-paused', !en[0].isIntersecting); }).observe(root);
    }
    setSystem('ongrid', false);
  }

  /* ================================================================== project showcase =========================== */
  function initShowcase(root) {
    var items = $$('.pf-item', root), chips = $$('[data-filter]', root), bars = $$('.pf-bar', root), charts = $$('[data-chart]', root);
    var chartWrap = $('[data-charts]', root);
    var stage = $('[data-stage]', root), img = $('[data-stage-img]', root);
    var nameEl = $('[data-stage-name]', root), capEl = $('[data-stage-cap]', root), catEl = $('[data-stage-cat]', root);
    var current = items[0], token = 0;

    function select(btn) {
      if (!btn || btn === current && !btn.hasAttribute('data-force')) { if (btn) mark(btn); return; }
      current = btn; mark(btn);
      var my = ++token;
      stage.classList.add('is-swap');
      setTimeout(function () {
        if (my !== token) return;
        var pre = new Image();
        var done = function () {
          if (my !== token) return;
          img.srcset = btn.getAttribute('data-srcset');
          img.src = btn.getAttribute('data-src');
          img.width = btn.getAttribute('data-w'); img.height = btn.getAttribute('data-h');
          img.alt = tr('project_alt', { name: btn.getAttribute('data-name') }, 'Proyek PLTS {name}');
          nameEl.textContent = btn.getAttribute('data-name');
          capEl.textContent = btn.getAttribute('data-cap');
          catEl.textContent = btn.getAttribute('data-cat-label');
          stage.classList.remove('is-swap');
        };
        pre.onload = pre.onerror = done;
        pre.src = btn.getAttribute('data-src');
        if (pre.complete) done();
      }, reduce ? 0 : 170);
    }
    function mark(btn) {
      var key = btn.getAttribute('data-key');
      items.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      bars.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-key') === key ? 'true' : 'false'); });
    }
    function filter(f) {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === f ? 'true' : 'false'); });
      items.forEach(function (b) { b.parentNode.hidden = !(f === 'semua' || b.parentNode.getAttribute('data-cat') === f); });
      charts.forEach(function (c) { c.hidden = !(f === 'semua' || c.getAttribute('data-chart') === f); });
      if (chartWrap) chartWrap.hidden = (f === 'residensial');
      if (current.parentNode.hidden) {
        var first = items.filter(function (b) { return !b.parentNode.hidden; })[0];
        if (first) select(first);
      }
    }
    items.forEach(function (b) { b.addEventListener('click', function () { select(b); }); });
    bars.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = items.filter(function (i) { return i.getAttribute('data-key') === b.getAttribute('data-key'); })[0];
        if (t) { select(t); if (stage.getBoundingClientRect().top < 80) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
      });
    });
    chips.forEach(function (c) { c.addEventListener('click', function () { filter(c.getAttribute('data-filter')); }); });
    mark(current);
  }

  /* ================================================================== scroll storytelling ======================== */
  function initStory(root) {
    var steps = $$('[data-step]', root), slides = $$('.story-slide', root);
    var list = $('[data-story-steps]', root), tag = $('[data-story-tag]', root), num = $('[data-story-num]', root);
    if (!steps.length || !('IntersectionObserver' in window)) return;
    function activate(i) {
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      if (tag) tag.textContent = steps[i].getAttribute('data-tag') || '';
      if (num) num.textContent = ('0' + (i + 1)).slice(-2);
      if (list) list.style.setProperty('--k', ((i + 1) / steps.length).toFixed(3));
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) activate(steps.indexOf(en.target)); });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
    activate(0);
  }

  /* ================================================================== lightbox =================================== */
  function initLightbox(triggers) {
    if (typeof HTMLDialogElement === 'undefined') return;
    var dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', tr('lightbox', null, 'Gambar diperbesar'));
    dlg.innerHTML = '<img alt=""><button type="button"></button>';
    var closeBtn = dlg.querySelector('button');
    closeBtn.textContent = tr('close', null, 'Tutup');
    closeBtn.setAttribute('aria-label', tr('close', null, 'Tutup'));
    document.body.appendChild(dlg);
    var big = dlg.querySelector('img');
    dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    triggers.forEach(function (t) {
      t.addEventListener('click', function () {
        var im = t.querySelector('img');
        if (!im) return;
        big.src = im.currentSrc || im.src;
        big.alt = im.alt;
        dlg.showModal();
      });
    });
  }

  /* ================================================================== news filter ================================ */
  function initPostFilter(input) {
    var posts = $$('.post[data-title]');
    var out = $('[data-post-count]'), none = $('[data-post-empty]');
    function run() {
      var q = input.value.trim().toLowerCase(), n = 0;
      posts.forEach(function (p) {
        var ok = !q || p.getAttribute('data-title').indexOf(q) >= 0;
        p.hidden = !ok;
        if (ok) n++;
      });
      if (out) out.textContent = tr('articles', { n: n }, '{n} artikel');
      if (none) none.hidden = n > 0;
    }
    input.addEventListener('input', run);
  }

  var ex = $('[data-explorer]'); if (ex) initExplorer(ex);
  var sc = $('[data-showcase]'); if (sc) initShowcase(sc);
  var st = $('[data-story]'); if (st) initStory(st);
  var lb = $$('[data-lightbox]'); if (lb.length) initLightbox(lb);
  var pf = $('[data-post-filter]'); if (pf) initPostFilter(pf);
})();
