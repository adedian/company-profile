/* Watermark for the present opening: PT Hexa Multi Energi.
   Drawn in a closed shadow root above everything, re-built if it is removed, hidden or restyled while the opening runs.
   Exposes window.HMEWM = { ensure }. intro.js only plays the opening when this is present. */
(function () {
  'use strict';
  const NAME = 'PT HEXA MULTI ENERGI';
  const NOTE = '© PT Hexa Multi Energi · Hak cipta dilindungi';
  const SIG = 'hme-wm-v1';
  const Z = '2147483000';

  const CSS =
    ':host{all:initial;position:fixed!important;inset:0!important;z-index:' + Z + '!important;pointer-events:none!important;display:block!important;opacity:1!important;visibility:visible!important;contain:none!important;mix-blend-mode:normal!important;transform:none!important;filter:none!important}' +
    '.t{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:1}' +
    '.b{position:absolute;left:max(20px,3vw);top:max(18px,3vh);display:flex;align-items:center;gap:10px;padding:7px 16px 7px 8px;border-radius:999px;background:rgba(7,28,48,.62);border:1px solid rgba(255,255,255,.2);color:#fff;font:700 clamp(.66rem,1vw,.82rem)/1.1 Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.6)}' +
    '.b img{width:28px;height:28px;object-fit:contain;display:block}' +
    '.b small{display:block;margin-top:3px;font-weight:600;letter-spacing:.04em;text-transform:none;opacity:.8;font-size:.86em}';

  let host = null, timer = 0, vis = false;

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build() {
    const h = document.createElement('div');
    h.setAttribute('data-wm', SIG);
    const sr = h.attachShadow({ mode: 'closed' });
    const style = document.createElement('style'); style.textContent = CSS;
    const svg =
      '<svg class="t" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>' +
      '<pattern id="p" width="560" height="190" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">' +
      '<text x="0" y="60" font-family="Figtree,system-ui,sans-serif" font-size="25" font-weight="800" letter-spacing="5" fill="rgba(255,255,255,.17)" stroke="rgba(0,0,0,.2)" stroke-width=".7" paint-order="stroke">' + esc(NAME) + '</text>' +
      '<text x="280" y="155" font-family="Figtree,system-ui,sans-serif" font-size="25" font-weight="800" letter-spacing="5" fill="rgba(255,255,255,.17)" stroke="rgba(0,0,0,.2)" stroke-width=".7" paint-order="stroke">' + esc(NAME) + '</text>' +
      '</pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>';
    const wrap = document.createElement('div');
    wrap.innerHTML = svg +
      '<div class="b"><img src="img/hme-logo.webp" alt="" width="28" height="28"><span>' + esc(NAME) + '<small>' + esc(NOTE) + '</small></span></div>';
    sr.appendChild(style);
    while (wrap.firstChild) sr.appendChild(wrap.firstChild);
    h._sr = sr;
    return h;
  }

  /* the shadow root is closed, so keep our own reference to check that its content is still intact */
  function intact() {
    if (!host || !host.isConnected || host.parentNode !== document.documentElement) return false;
    if (host.getAttribute('data-wm') !== SIG) return false;
    const sr = host._sr;
    if (!sr || sr.querySelectorAll('text').length !== 2 || !sr.querySelector('.b img')) return false;
    if (sr.querySelector('text').textContent !== NAME) return false;
    const cs = getComputedStyle(host);
    if (cs.display === 'none' || cs.visibility !== 'visible' || parseFloat(cs.opacity) < .99 || cs.position !== 'fixed') return false;
    const r = host.getBoundingClientRect();
    if (r.width < innerWidth - 2 || r.height < innerHeight - 2) return false;
    const t = sr.querySelector('.t'), cst = t && getComputedStyle(t);
    if (!cst || cst.display === 'none' || cst.visibility !== 'visible' || parseFloat(cst.opacity) < .99) return false;
    return true;
  }

  function mount() {
    if (host && host.isConnected) host.remove();
    host = build();
    document.documentElement.appendChild(host);
  }

  function ensure() {
    if (!intact()) mount();
    return intact();
  }

  function introVisible() {
    const o = document.querySelector('.pintro');
    return !!(o && !o.hidden && getComputedStyle(o).display !== 'none');
  }

  function tick() {
    const on = introVisible();
    if (on) { ensure(); }
    else if (vis && host && host.isConnected) { host.remove(); }
    vis = on;
  }

  /* put it back immediately when something removes or moves it while the opening is playing */
  new MutationObserver(() => { if (introVisible() && !intact()) ensure(); })
    .observe(document.documentElement, { childList: true, attributes: true, subtree: false, attributeFilter: ['style', 'class', 'hidden'] });

  timer = setInterval(tick, 200);
  addEventListener('resize', tick);
  document.addEventListener('fullscreenchange', tick);

  /* reading the watermark text out of the closure is the only way to change it; the property itself is read-only */
  Object.defineProperty(window, 'HMEWM', { value: Object.freeze({ ensure }), writable: false, configurable: false });
})();
