/* Controls for the "Cara kerja panel" slide: tabs, sun slider, wire toggle, cards <-> 3D highlight */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const host = $('#pv3d'); if (!host) return;
  const api = () => window.pv3d || null;
  const tabs = { how: $('#pvTabHow'), cell: $('#pvTabCell'), lyr: $('#pvTabLyr') };
  const panes = { how: $('#pvHow'), cell: $('#pvCell'), lyr: $('#pvLyr') };
  const sun = $('#pvSun'), sunOut = $('#pvSunOut'), wire = $('#pvWire');
  const irr = $('#pvIrr'), watts = $('#pvW'), lamp = $('#pvLamp'), lampChip = $('#pvLampChip');
  const idn = v => Math.round(v).toLocaleString('id-ID');
  let cur = 'how';

  function tab(name) {
    cur = name;
    Object.keys(tabs).forEach(k => { tabs[k].setAttribute('aria-selected', k === name); panes[k].hidden = k !== name; });
    $$('.fb', panes.how).concat($$('.fb', panes.cell), $$('.fb', panes.lyr)).forEach(b => b.setAttribute('aria-pressed', 'false'));
    const a = api(); if (!a) return;
    if (name === 'cell') a.zoom(true);
    else { a.zoom(false); a.explode(name === 'lyr'); }
    a.select(null); a.highlight(null);
  }
  Object.keys(tabs).forEach(k => { tabs[k].onclick = () => tab(k); });

  const sunWord = v => v < 3 ? 'Malam' : v < 30 ? 'Mendung tebal' : v < 65 ? 'Berawan' : v < 90 ? 'Cerah' : 'Terik';
  sun.oninput = () => { sunOut.textContent = sunWord(+sun.value); const a = api(); if (a) a.sun(+sun.value / 100); };
  wire.onclick = () => {
    const on = wire.getAttribute('aria-pressed') !== 'true';
    wire.setAttribute('aria-pressed', on); wire.querySelector('span').textContent = on ? 'Kabel tersambung' : 'Kabel diputus';
    const a = api(); if (a) a.closed(on);
  };

  [panes.how, panes.cell].forEach(pane => $$('.fb', pane).forEach(b => b.onclick = () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    $$('.fb', pane).forEach(x => x.setAttribute('aria-pressed', x === b && on));
    const a = api(); if (a) a.highlight(on ? b.dataset.hi : null);
  }));
  $$('.fb', panes.lyr).forEach(b => b.onclick = () => { const a = api(); if (a) a.select(b.dataset.layer); });
  host.addEventListener('pv3d-select', e => {
    const id = e.detail.id;
    if (id && cur !== 'lyr') { tab('lyr'); const a = api(); if (a) a.select(id); return; }
    $$('.fb', panes.lyr).forEach(x => x.setAttribute('aria-pressed', x.dataset.layer === id));
  });

  let lastTxt = '';
  host.addEventListener('pv3d-state', e => {
    const s = e.detail, lit = s.watts > 4;
    const txt = idn(s.irr) + '|' + idn(s.watts) + '|' + lit + s.closed;
    if (txt === lastTxt) return; lastTxt = txt;
    irr.textContent = idn(s.irr) + ' W/m²';
    watts.textContent = s.closed ? idn(s.watts) + ' W' : '0 W (sirkuit terbuka)';
    lamp.textContent = lit ? 'Lampu menyala' : 'Lampu padam';
    lampChip.classList.toggle('warn', !lit);
  });
})();
