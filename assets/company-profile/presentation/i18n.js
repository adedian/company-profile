/* Company Profile presentation - language layer.
 *
 * The presentation is written in Indonesian. It is shown in English when it is opened with ?lang=en (the website passes the
 * visitor's language this way). The English texts are written and reviewed in i18n-en.js: no machine translation, no
 * request to a translation service. This file only applies them:
 *
 *  - static text and attributes are replaced while the page is parsed (the page stays hidden until the first pass is done,
 *    so no Indonesian text flashes);
 *  - text that the presentation's own scripts create later (simulator status, captions, cards) is replaced the moment it is
 *    inserted (MutationObserver);
 *  - text drawn on a canvas goes through HMEi18n.t() explicitly.
 *
 * Without ?lang=en nothing here does anything: HMEi18n.t(x) returns x and the locale stays id-ID.
 *
 * Dictionary format (i18n-en.js):  exact:    { 'Indonesian text': 'English text' }
 *                                  patterns: [ ['Indonesian with {#number} and {*text}', 'English using {number} {text}'] ]
 *   {#name} = digits / separators / time,  {*name} = any text (translated again on its own).
 */
(function () {
  'use strict';

  var lang = /[?&]lang=en(?:&|#|$)/.test(location.search) ? 'en' : 'id';
  var I = window.HMEi18n = {
    lang: lang,
    locale: lang === 'en' ? 'en-US' : 'id-ID',
    t: function (s) { return s; },
    init: function () {}
  };
  if (lang !== 'en') return;

  var root = document.documentElement;
  root.lang = 'en';
  root.classList.add('i18n-pending');

  var exact = Object.create(null), patterns = [], cache = new Map();

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* "Panel {#pv} kW{*w}" -> regex + ordered capture names */
  function compile(idText, enText) {
    var names = [];
    var src = idText.split(/(\{[#*]\w+\})/).map(function (part) {
      var m = /^\{([#*])(\w+)\}$/.exec(part);
      if (!m) return escapeRe(part);
      names.push([m[2], m[1]]);
      return m[1] === '#' ? '([\\d.,:]+)' : '([\\s\\S]*?)';
    }).join('');
    return { re: new RegExp('^' + src + '$'), names: names, en: enText };
  }

  I.init = function (dict) {
    Object.keys(dict.exact || {}).forEach(function (k) { exact[k] = dict.exact[k]; });
    patterns = (dict.patterns || []).map(function (p) { return compile(p[0], p[1]); });
  };

  function lookup(core) {
    if (cache.has(core)) return cache.get(core);
    var out = exact[core];
    if (out === undefined) {
      for (var i = 0; i < patterns.length; i++) {
        var p = patterns[i], m = p.re.exec(core);
        if (!m) continue;
        var vals = {};
        p.names.forEach(function (n, k) { vals[n[0]] = n[1] === '*' ? tr(m[k + 1]) : m[k + 1]; });
        out = p.en.replace(/\{(\w+)\}/g, function (all, k) { return k in vals ? vals[k] : all; });
        break;
      }
    }
    if (out === undefined) out = core;
    if (cache.size > 4000) cache.clear();
    cache.set(core, out);
    return out;
  }

  /* keeps the whitespace around the text, translates the rest */
  function tr(s) {
    if (typeof s !== 'string' || s === '') return s;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    if (!m[2]) return s;
    var core = m[2].replace(/\s+/g, ' '), out = lookup(core);
    return out === core ? s : m[1] + out + m[3];
  }
  I.t = tr;

  var ATTRS = ['aria-label', 'title', 'alt', 'placeholder', 'data-title', 'data-copy-label'];

  function fixAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v) { var o = tr(v); if (o !== v) el.setAttribute(ATTRS[i], o); }
    }
  }
  function walk(node) {
    if (node.nodeType === 3) {
      var v = node.nodeValue, o = tr(v);
      if (o !== v) node.nodeValue = o;
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    fixAttrs(node);
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') {
        for (var k = 0; k < m.addedNodes.length; k++) walk(m.addedNodes[k]);
      } else if (m.type === 'characterData') {
        walk(m.target);
      } else if (m.type === 'attributes') {
        fixAttrs(m.target);
      }
    }
  }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  function ready() {
    walk(root);
    root.classList.remove('i18n-pending');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  /* the dictionary is loaded synchronously, before the page body is parsed */
  document.write('<style>html.i18n-pending body{visibility:hidden}</style><script src="i18n-en.js"><\/script>');
})();
