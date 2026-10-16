/* Watermark for the present opening: PT Hexa Multi Energi.
   A single badge in the bottom-right corner, drawn in a closed shadow root above everything, shown for the whole present session
   (opening animation through the last slide) and re-built if it is removed, hidden or restyled meanwhile.
   Exposes window.HMEWM = { ensure }. intro.js only plays the opening when this is present. */
(function () {
  'use strict';
  const NAME = 'PT HEXA MULTI ENERGI';
  const NOTE = '© PT Hexa Multi Energi · Hak cipta dilindungi';
  const SIG = 'hme-wm-v1';
  const Z = '2147483000';

  const CSS =
    ':host{all:initial;position:fixed!important;inset:0!important;z-index:' + Z + '!important;pointer-events:none!important;display:block!important;opacity:1!important;visibility:visible!important;contain:none!important;mix-blend-mode:normal!important;transform:none!important;filter:none!important}' +
    '.b{position:absolute;right:max(14px,1.6vw);bottom:max(10px,1.4vh);display:flex;align-items:center;gap:10px;padding:7px 16px 7px 8px;border-radius:999px;background:rgba(7,28,48,.62);border:1px solid rgba(255,255,255,.2);color:#fff;font:700 clamp(.66rem,1vw,.82rem)/1.1 Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.6)}' +
    '.b img{width:28px;height:28px;object-fit:contain;display:block}' +
    '.b small{display:block;margin-top:3px;font-weight:600;letter-spacing:.04em;text-transform:none;opacity:.8;font-size:.86em}';

  let host = null, timer = 0, vis = false;

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build() {
    const h = document.createElement('div');
    h.setAttribute('data-wm', SIG);
    const sr = h.attachShadow({ mode: 'closed' });
    const style = document.createElement('style'); style.textContent = CSS;
    const wrap = document.createElement('div');
    wrap.innerHTML =
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
    const label = sr && sr.querySelector('.b span');
    if (!label || !sr.querySelector('.b img') || label.firstChild.textContent !== NAME) return false;
    const cs = getComputedStyle(host);
    if (cs.display === 'none' || cs.visibility !== 'visible' || parseFloat(cs.opacity) < .99 || cs.position !== 'fixed') return false;
    const r = host.getBoundingClientRect();
    if (r.width < innerWidth - 2 || r.height < innerHeight - 2) return false;
    const csb = getComputedStyle(sr.querySelector('.b'));
    if (csb.display === 'none' || csb.visibility !== 'visible' || parseFloat(csb.opacity) < .99) return false;
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

  /* on for the whole present session: opening animation, every slide, until present mode is closed */
  function introVisible() {
    if (document.documentElement.classList.contains('present')) return true;
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
