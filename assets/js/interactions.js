/* PT Hexa Multi Energi - interactions (vanilla JS, no dependencies).
   Scroll reveal lives in scroll-reveal.js. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- UI strings of the page language (written by includes/footer.php as JSON) ---------- */
  var I18N = {};
  try { I18N = JSON.parse(($('#hme-i18n') || {}).textContent || '{}') || {}; } catch (err) { I18N = {}; }
  window.hmeI18n = I18N;

  /* ---------- keep what the visitor typed when the language is switched ----------
     The other language is another page, so the filled-in fields are parked in sessionStorage and put back on arrival.
     Select values are language independent (the stored value is the same in both languages). */
  var DRAFT_KEY = 'hme-form-draft';
  function saveDrafts() {
    var data = {};
    $$('form[data-form]').forEach(function (form) {
      var vals = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'hidden' || el.type === 'submit' || el.name === 'website' || el.name === 'csrf' || !el.value) return;
        vals[el.name] = el.value;
      });
      if (Object.keys(vals).length) data[form.id] = vals;
    });
    try {
      if (Object.keys(data).length) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data)); else sessionStorage.removeItem(DRAFT_KEY);
    } catch (err) { /* storage unavailable: nothing to keep */ }
  }
  (function restoreDrafts() {
    var data = null;
    try { data = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); sessionStorage.removeItem(DRAFT_KEY); } catch (err) { data = null; }
    if (!data) return;
    Object.keys(data).forEach(function (id) {
      var form = document.getElementById(id);
      if (!form) return;
      Object.keys(data[id]).forEach(function (name) {
        var el = form.elements[name];
        if (el && !el.value) el.value = data[id][name];
      });
    });
  })();

  /* ---------- language dropdown ---------- */
  $$('[data-lang-switch]').forEach(function (box) {
    var btn = $('.lang-btn', box);
    var links = $$('.lang-menu a', box);
    function setOpen(open, focusBtn) {
      if (open) setNav(false);   // never show the language menu on top of the open mobile menu
      box.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open && focusBtn) btn.focus();
    }
    btn.addEventListener('click', function () { setOpen(!box.classList.contains('is-open')); });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) setOpen(false); });
    // Escape closes the menu wherever the focus is (and returns it to the button when it was inside the switcher)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) { setOpen(false, box.contains(document.activeElement)); }
    });
    box.addEventListener('keydown', function (e) {
      var open = box.classList.contains('is-open');
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (open || e.target === btn)) {
        e.preventDefault();
        if (!open) setOpen(true);
        var i = links.indexOf(document.activeElement);
        i = e.key === 'ArrowDown' ? (i + 1) % links.length : (i <= 0 ? links.length - 1 : i - 1);
        links[i].focus();
      }
    });
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        setOpen(false);
        if (a.getAttribute('aria-current') !== 'true') saveDrafts();
        // keep the section the visitor is reading (#hash is not sent to the server)
        if (location.hash && a.getAttribute('aria-current') !== 'true' && a.href.indexOf('#') < 0) a.href += location.hash;
      });
    });
  });

  /* ---------- mobile navigation + dropdown ---------- */
  var toggle = $('.menu-toggle');
  var nav = $('#primary-nav');
  function setNav(open) {
    if (!toggle || !nav) return;
    if (open) $$('[data-lang-switch].is-open').forEach(function (b) { b.classList.remove('is-open'); $('.lang-btn', b).setAttribute('aria-expanded', 'false'); });
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
  }
  function closeSub(li) {
    li.classList.remove('is-open');
    var b = $('.sub-toggle', li);
    if (b) b.setAttribute('aria-expanded', 'false');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); }
        $$('.has-sub.is-open').forEach(closeSub);
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.site-header')) { setNav(false); $$('.has-sub.is-open').forEach(closeSub); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && window.innerWidth <= 1040) setNav(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1040) setNav(false); });
  }
  $$('.sub-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.closest('.has-sub');
      var open = !li.classList.contains('is-open');
      $$('.has-sub.is-open').forEach(closeSub);
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- sticky header state + scroll progress ---------- */
  var header = $('.site-header');
  var bar = $('.scroll-progress');
  if (header && 'IntersectionObserver' in window) {
    // A 1px sentinel at the top of the page tells us when the user has scrolled: no scroll listener needed.
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
    document.body.insertBefore(sentinel, document.body.firstChild);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }
  if (bar && !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'))) {
    // Browsers without scroll-driven animations get a cheap rAF-throttled fallback.
    var ticking = false;
    var update = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- back to top ---------- */
  var topBtn = $('[data-to-top-btn]');
  if (topBtn && 'IntersectionObserver' in window) {
    var s2 = document.createElement('div');
    s2.setAttribute('aria-hidden', 'true');
    s2.style.cssText = 'position:absolute;top:120vh;left:0;width:1px;height:1px;pointer-events:none';
    document.body.appendChild(s2);
    new IntersectionObserver(function (en) { topBtn.classList.toggle('is-on', !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(s2);
  }
  var foot = $('.site-footer');
  if (topBtn && foot && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { topBtn.classList.toggle('is-off', en[0].isIntersecting); }).observe(foot);
  }
  function toTop(e) { e.preventDefault(); if (window.hmeScroll) window.hmeScroll.to(0); else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); var m = document.getElementById('content'); if (m) m.focus({ preventScroll: true }); }
  if (topBtn) topBtn.addEventListener('click', toTop);
  $$('[data-to-top]').forEach(function (a) { a.addEventListener('click', toTop); });

  /* ---------- tabs (WAI-ARIA tabs pattern) ---------- */
  $$('[data-tabs]').forEach(function (root) {
    var tabs = $$('[role="tab"]', root);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- "Why choose us" highlight rotator (runs only while on screen) ---------- */
  $$('[data-rotator]').forEach(function (list) {
    var items = $$('li', list);
    if (reduceMotion || items.length < 2 || !('IntersectionObserver' in window)) return;
    var i = 0, timer = null;
    function tick() {
      items[i].classList.remove('is-on');
      i = (i + 1) % items.length;
      items[i].classList.add('is-on');
    }
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !timer) timer = setInterval(tick, 2200);
      else if (!entries[0].isIntersecting && timer) { clearInterval(timer); timer = null; }
    }).observe(list);
  });

  /* ---------- FAQ accordion: animated height on top of native <details> ---------- */
  $$('.faq-item').forEach(function (d) {
    var summary = $('summary', d);
    var anim = null;
    if (!summary || reduceMotion || !d.animate) return;
    function run(from, to, done) {
      if (anim) anim.cancel();
      d.style.overflow = 'hidden';
      anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
      anim.onfinish = anim.oncancel = function () {
        anim = null; d.style.height = ''; d.style.overflow = '';
        if (done) done();
      };
    }
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var start = d.offsetHeight;
      if (d.open) {
        run(start, summary.offsetHeight, function () { d.open = false; });
      } else {
        d.open = true;
        run(summary.offsetHeight, d.scrollHeight);
      }
    });
  });

  /* ---------- forms (progressive enhancement over a normal POST) ---------- */
  var MSG = {
    required: I18N.required || 'Bidang ini tidak boleh kosong',
    email: I18N.email || 'Alamat email tidak valid',
    tel: I18N.tel || 'Nomor telepon tidak valid',
    number: I18N.number || 'Angka tidak valid',
    generic: I18N.generic || 'Isian tidak valid'
  };
  function fieldMessage(el) {
    if (el.validity.valueMissing) return MSG.required;
    if (el.type === 'email') return MSG.email;
    if (el.type === 'tel') return MSG.tel;
    if (el.type === 'number') return MSG.number;
    return MSG.generic;
  }
  function setFieldError(form, name, msg) {
    var el = form.elements[name];
    if (!el) return;
    var wrap = el.closest('.field');
    var err = wrap && wrap.querySelector('.field-error');
    if (wrap) wrap.classList.toggle('has-error', !!msg);
    if (err) err.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function showStatus(form, ok, msg) {
    var s = form.querySelector('.form-status');
    if (!s) return;
    s.className = 'form-status ' + (ok ? 'is-ok' : 'is-error');
    s.textContent = msg;
    s.focus();
  }
  $$('form[data-form]').forEach(function (form) {
    form.addEventListener('input', function (e) {
      if (e.target && e.target.name) setFieldError(form, e.target.name, '');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      if (status) { status.className = 'form-status'; status.textContent = ''; }

      var firstBad = null;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'hidden' || el.name === 'website' || el.type === 'submit') return;
        var bad = !el.checkValidity();
        setFieldError(form, el.name, bad ? fieldMessage(el) : '');
        if (bad && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' }
      })
        .then(function (res) {
          return res.json().then(function (data) { return { status: res.status, data: data }; });
        })
        .then(function (r) {
          var d = r.data || {};
          if (d.ok) {
            form.reset();
            Array.prototype.forEach.call(form.elements, function (el) { if (el.name) setFieldError(form, el.name, ''); });
            showStatus(form, true, d.message || I18N.thanks || 'Terima kasih.');
          } else {
            if (d.errors) {
              var first = null;
              Object.keys(d.errors).forEach(function (n) { setFieldError(form, n, d.errors[n]); if (!first) first = form.elements[n]; });
              if (first) first.focus();
            }
            showStatus(form, false, d.message || I18N.fail || 'Pengiriman gagal. Silakan coba lagi.');
          }
        })
        .catch(function () {
          showStatus(form, false, I18N.network || 'Maaf, data Anda belum berhasil terkirim. Periksa koneksi internet Anda lalu coba lagi, atau hubungi kami melalui WhatsApp.');
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
        });
    });
  });

  /* ---------- offer pop-up (home) ---------- */
  var dlg = $('[data-offer]');
  if (dlg && typeof dlg.showModal === 'function') {
    var seen = false;
    try { seen = sessionStorage.getItem('hme-offer') === '1'; } catch (err) { /* storage unavailable */ }
    var closeBtn = $('[data-close]', dlg);
    if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    if (!seen) {
      setTimeout(function () {
        var typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (document.hidden || typing || document.querySelector('dialog[open]')) return;
        try { sessionStorage.setItem('hme-offer', '1'); } catch (err) { /* ignore */ }
        dlg.showModal();
      }, 30000);
    }
  }
})();
