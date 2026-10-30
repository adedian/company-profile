/* Interaction layer for the Hexa Multi Energi profile */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const idn = (v, d = 0) => v.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const rp = v => 'Rp ' + Math.round(v).toLocaleString('id-ID');

  /* ---------- menu, progress, active section, parallax ---------- */
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  menuBtn.onclick = () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); };
  $$('#nav a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); }));

  const secs = $$('section[data-title]');
  const dots = $('#dots');
  secs.forEach(s => { const a = document.createElement('a'); a.href = '#' + s.id; a.title = s.dataset.title; a.setAttribute('aria-label', s.dataset.title); dots.appendChild(a); });
  const navLinks = $$('#nav a'), dotLinks = $$('#dots a'), prog = $('#prog'), heroBg = $('#heroBg'), hero = $('#top');
  let ticking = false, kbdGone = false; setTimeout(() => { kbdGone = true; $('#kbd').style.opacity = 0; }, 9000);
  function onScroll() {
    ticking = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    let cur = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= 140) cur = i; });
    dotLinks.forEach((d, i) => d.classList.toggle('on', i === cur));
    navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + secs[cur].id));
    if (!reduce && y < hero.offsetHeight) heroBg.style.transform = `translateY(${y * .22}px)`;
    $('#kbd').style.opacity = (y > 600 || kbdGone) ? 0 : 1;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  hero.addEventListener('pointermove', e => {
    if (reduce) return; const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    $('#sunorb').style.transform = `translate(${-x * 60}px,${-y * 40}px)`;
  });

  /* ---------- reveal + counters ---------- */
  document.documentElement.classList.add('rv');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08, rootMargin: '0px 0px -6% 0px' });
  $$('[data-r]').forEach(el => io.observe(el));
  function count(el) {
    const to = +el.dataset.count, raw = el.dataset.fmt === 'raw'; if (reduce) return;
    const t0 = performance.now(), dur = 1300;
    (function step(t) { const p = clamp((t - t0) / dur, 0, 1), v = to * (1 - Math.pow(1 - p, 3)); el.textContent = raw ? Math.round(v) : Math.round(v).toLocaleString('id-ID'); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { count(e.target); cio.unobserve(e.target); } }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- mission accordion ---------- */
  $$('#miss .mi').forEach(mi => mi.querySelector('button').onclick = () => {
    const open = mi.dataset.open !== 'true';
    $$('#miss .mi').forEach(o => { o.dataset.open = 'false'; o.querySelector('button').setAttribute('aria-expanded', false); });
    mi.dataset.open = open; mi.querySelector('button').setAttribute('aria-expanded', open);
  });

  /* ---------- org focus ---------- */
  const org = $('#org');
  $$('.dv .head', org).forEach(b => b.onclick = () => {
    const d = b.closest('.dv').dataset.d;
    if (org.dataset.focus === d) delete org.dataset.focus; else org.dataset.focus = d;
  });

  /* ---------- monitoring: live camera over the dashboard screenshot ---------- */
  const MON = {
    ov: [
      { t: 'Real-Time Monitoring', d: 'Pantau produksi energi, konsumsi, dan interaksi dengan jaringan secara langsung.', r: [.30, .08, .70, .58] },
      { t: 'Detailed Analytics', d: 'Wawasan berbasis data untuk keputusan operasional yang lebih cerdas.', r: [0, .6, .58, 1] },
      { t: 'Remote Access', d: 'Respons lebih cepat dan perawatan proaktif demi keandalan maksimal.', r: [.73, .08, .99, .62] }
    ],
    pv: [
      { t: 'Device-Level Tracking', d: 'Pemantauan rinci performa tiap inverter.', r: [.64, .08, 1, .62] },
      { t: 'Efficiency Metrics', d: 'Rasio kinerja langsung untuk panen energi yang optimal.', r: [0, .62, .31, 1] },
      { t: 'Advanced Analysis', d: 'Analisis mendalam daya yang dihasilkan terhadap iradiasi matahari.', r: [.32, .62, .62, .96] }
    ]
  };
  const TOUR_MS = 4800;
  let monTab = 'ov', monSel = -1, tour = !reduce, tourT = null, monOn = false, hoverPt = null;
  const shot = $('#shot'), cam = $('#cam'), ring = $('#ring'), mcurEl = $('#mcur'), mcapEl = $('#mcap'), imgs = { ov: $('#imgOv'), pv: $('#imgPv') };
  const MC = { s: 1.04, x: .5, y: .5 }, MT = { s: 1.04, x: .5, y: .5 };
  function monTarget() {
    const f = MON[monTab][monSel];
    if (!f) { MT.s = 1.07; MT.x = .5; MT.y = .5; return; }
    const [x0, y0, x1, y1] = f.r, w = x1 - x0, h = y1 - y0;
    MT.s = clamp(Math.min(1 / (w * 1.16), 1 / (h * 1.16)), 1.35, 3.1); MT.x = (x0 + x1) / 2; MT.y = (y0 + y1) / 2;
  }
  let mLast = 0, mT = 0;
  function monFrame(ts) {
    if (!monOn) return;
    const dt = Math.min(.05, (ts - mLast) / 1000 || 0); mLast = ts; mT += dt;
    const k = 1 - Math.pow(.004, dt);
    let tx = MT.x, ty = MT.y, ts_ = MT.s;
    if (!reduce) {
      const amp = monSel < 0 ? .045 : .008;
      tx += Math.sin(mT * .5) * amp + (hoverPt ? (hoverPt[0] - .5) * .03 : 0); ty += Math.cos(mT * .43) * amp * .7 + (hoverPt ? (hoverPt[1] - .5) * .03 : 0);
      ts_ += Math.sin(mT * .7) * (monSel < 0 ? .02 : .025);
    }
    MC.s += (ts_ - MC.s) * k; MC.x += (tx - MC.x) * k; MC.y += (ty - MC.y) * k;
    applyCam();
    requestAnimationFrame(monFrame);
  }
  function camXY() {
    const W = shot.clientWidth, H = shot.clientHeight, s = MC.s;
    const px = clamp(W / 2 - s * MC.x * W, (1 - s) * W, 0), py = clamp(H / 2 - s * MC.y * H, (1 - s) * H, 0);
    return { W, H, s, px, py };
  }
  function applyCam() {
    const { W, H, s, px, py } = camXY();
    cam.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    const f = MON[monTab][monSel];
    if (f) {
      const [x0, y0, x1, y1] = f.r, X0 = px + x0 * W * s, Y0 = py + y0 * H * s, X1 = px + x1 * W * s, Y1 = py + y1 * H * s;
      const l = clamp(X0, 6, W - 6), t = clamp(Y0, 6, H - 6), r = clamp(X1, 6, W - 6), b = clamp(Y1, 6, H - 6);
      ring.style.cssText = `left:${l.toFixed(1)}px;top:${t.toFixed(1)}px;width:${Math.max(20, r - l).toFixed(1)}px;height:${Math.max(20, b - t).toFixed(1)}px`;
      mcurEl.style.transform = `translate(${(r - 26).toFixed(1)}px,${(b - 20).toFixed(1)}px)`;
      mcapEl.style.transform = `translate(${(t < 44 ? l + 10 : l).toFixed(1)}px,${(t < 44 ? t + 10 : t - 38).toFixed(1)}px)`;
    }
  }
  function monZoom() { monTarget(); if (!monOn || reduce) { Object.assign(MC, MT); applyCam(); } }
  function renderMon() {
    const wrap = $('#feat');
    wrap.innerHTML = `<h3>${monTab === 'ov' ? 'Overview' : 'PV'}</h3>` + MON[monTab].map((f, i) => `<button class="fb${tour && i === monSel ? ' tour' : ''}" data-i="${i}" aria-pressed="${i === monSel}"><b>${f.t}</b><span>${f.d}</span><i class="pg"></i></button>`).join('') +
      `<div class="mfoot"><button class="tourbtn" id="tourBtn" aria-pressed="${tour}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${tour ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'}"/></svg>${tour ? 'Jeda tur otomatis' : 'Putar tur otomatis'}</button><p>Klik fitur untuk menyorot bagian dashboard yang relevan.</p></div>`;
    $$('.fb', wrap).forEach(b => b.onclick = () => { const i = +b.dataset.i; tour = false; clearTimeout(tourT); selMon(monSel === i ? -1 : i); });
    $('#tourBtn').onclick = () => { tour = !tour; if (tour) { if (monSel < 0) selMon(0); else { renderMon(); sched(); } } else { clearTimeout(tourT); renderMon(); } };
    ring.classList.toggle('on', monSel >= 0); mcurEl.classList.toggle('on', monSel >= 0); mcapEl.classList.toggle('on', monSel >= 0);
    if (monSel >= 0) mcapEl.textContent = MON[monTab][monSel].t;
  }
  function selMon(i) {
    monSel = i; monTarget(); renderMon();
    mcurEl.classList.remove('click'); void mcurEl.offsetWidth; mcurEl.classList.add('click');
    if (reduce || !monOn) { Object.assign(MC, MT); applyCam(); }
    if (tour) sched();
  }
  function sched() { clearTimeout(tourT); if (!tour || !monOn) return; tourT = setTimeout(() => { const n = monSel + 1; if (n >= MON[monTab].length) { setMon(monTab === 'ov' ? 'pv' : 'ov', true); } else selMon(n); }, TOUR_MS); }
  function setMon(t, fromTour) {
    monTab = t; monSel = -1;
    $('#mtOv').setAttribute('aria-selected', t === 'ov'); $('#mtPv').setAttribute('aria-selected', t === 'pv');
    Object.entries(imgs).forEach(([k, im]) => im.classList.toggle('on', k === t));
    shot.classList.remove('swap'); void shot.offsetWidth; shot.classList.add('swap');
    if (fromTour !== true) { tour = false; clearTimeout(tourT); }
    Object.assign(MC, { s: 1.25, x: .5, y: .5 }); monTarget(); renderMon();
    if (fromTour === true) setTimeout(() => { if (tour) selMon(0); }, 700);
  }
  $('#mtOv').onclick = () => setMon('ov'); $('#mtPv').onclick = () => setMon('pv');
  shot.addEventListener('pointermove', e => { const r = shot.getBoundingClientRect(); hoverPt = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; });
  shot.addEventListener('pointerleave', () => hoverPt = null);
  addEventListener('resize', () => applyCam());
  new IntersectionObserver(es => es.forEach(en => {
    const on = en.isIntersecting; if (on === monOn) return; monOn = on;
    if (on) { mLast = performance.now(); requestAnimationFrame(monFrame); if (tour && monSel < 0) setTimeout(() => { if (tour && monOn && monSel < 0) selMon(0); }, 900); else sched(); } else clearTimeout(tourT);
  }), { threshold: .35 }).observe(shot);
  monTarget(); Object.assign(MC, MT); applyCam(); renderMon();

  /* ---------- services ---------- */
  const STEPS = [
    { t: 'Konsultasi & studi kelayakan', tag: 'Consultancy', d: 'Analisis kebutuhan energi, simulasi sistem PLTS, evaluasi teknis dan finansial, serta panduan regulasi.', img: 'aerial-white' },
    { t: 'Desain sistem', tag: 'EPC · Engineering', d: 'Desain sistem PLTS yang disesuaikan dengan kebutuhan dan profil beban Anda.', img: 'roof-panels' },
    { t: 'Pengadaan material', tag: 'EPC · Procurement', d: 'Pengadaan modul fotovoltaik Tier-1 dan inverter dari produsen tepercaya global.', img: 'inkasa' },
    { t: 'Konstruksi & instalasi', tag: 'EPC · Construction', d: 'Instalasi profesional agar kualitas terjaga dan proyek selesai tepat waktu.', img: 'team-install' },
    { t: 'Monitoring sistem', tag: 'Installation & Maintenance', d: 'Sistem monitoring memantau produksi, konsumsi, dan performa tiap perangkat.', img: 'dash-overview' },
    { t: 'Perawatan berkala', tag: 'Installation & Maintenance', d: 'Perawatan rutin menjaga efisiensi dan kinerja optimal PLTS sepanjang umur sistem.', img: 'mitra-saruta' }
  ];
  const stepsEl = $('#steps'), vis = $('#svcVis');
  vis.innerHTML = STEPS.map((s, i) => `<img src="img/${s.img}.webp" alt="" class="${i === 0 ? 'on' : ''}">`).join('') + '<div class="badge" id="svcBadge"></div>';
  let svcIdx = 0, svcAuto = !reduce, svcOn = false, svcTimer = null; const svcEl = $('.svc');
  function schedSvc() { clearTimeout(svcTimer); const act = svcAuto && svcOn; svcEl.classList.toggle('auto', act); if (act) svcTimer = setTimeout(() => setStep((svcIdx + 1) % STEPS.length), 5500); }
  function setStep(i) {
    svcIdx = i; schedSvc();
    $$('.step', stepsEl).forEach((b, k) => b.setAttribute('aria-selected', k === i));
    $$('img', vis).forEach((im, k) => im.classList.toggle('on', k === i));
    $('#svcBadge').textContent = STEPS[i].tag;
  }
  stepsEl.innerHTML = STEPS.map((s, i) => `<button class="step" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="rail"><span class="dot">${i + 1}</span></span><span class="t"><b>${s.t}</b><span><em>${s.d}</em></span></span></button>`).join('');
  $$('.step', stepsEl).forEach(b => b.onclick = () => { svcAuto = false; setStep(+b.dataset.i); });
  setStep(0);
  new IntersectionObserver(es => { svcOn = es[0].isIntersecting; schedSvc(); }, { threshold: .35 }).observe(svcEl);

  /* ---------- liquid glass: the glare on the card under the pointer follows it (--lgx/--lgy, not inherited) ---------- */
  const LG = '.fact,.mi,.node,.dv li,.mt,.kpi,.chart-card,.card-n,.cmp,.fb,.sc,.fp,.bn,.pdet,.ci,.addr,.save-card,.fin-chart,.cam-btns button,.wirebtn,.tourbtn';
  let lgCard = null;
  const lgOff = () => { if (lgCard) { lgCard.style.removeProperty('--lgx'); lgCard.style.removeProperty('--lgy'); lgCard = null; } };
  addEventListener('pointermove', e => {
    const c = e.pointerType === 'mouse' && e.target.closest ? e.target.closest(LG) : null;
    if (c !== lgCard) lgOff();
    if (!c) return;
    const r = c.getBoundingClientRect(), k = c.offsetWidth ? r.width / c.offsetWidth : 1; lgCard = c;    /* k undoes the paged layout's section zoom */
    c.style.setProperty('--lgx', (e.clientX - r.left) / k + 'px'); c.style.setProperty('--lgy', (e.clientY - r.top) / k + 'px');
  }, { passive: true });
  document.addEventListener('pointerleave', lgOff);

  /* ---------- financing charts (inline SVG: donut = shares of the no-solar PLN bill; line = cumulative cash flow, tariff +3%/yr) ---------- */
  const FC = {}, mobQ = matchMedia('(max-width:560px)'), dec = v => v.toFixed(1).replace('.', ',');
  function finChart(id, rent) {
    const el = $('#' + id), uid = id + '-', OM = .02;
    const NS = (.5 - OM) * 100, cum = t => (-270 + NS * (1.03 ** t - 1) / .03) / 100;    /* cumulative net cash flow, × the year-1 bill */
    const PB = Math.log(1 + 270 * .03 / NS) / Math.log(1.03);
    const K = { sav: ['Penghematan', 'var(--c-sav)', ' d'], mid: [rent ? 'Tagihan sewa' : 'Biaya O&amp;M', 'var(--c-mid)', ' d'], pln: ['Tagihan PLN', 'var(--c-pln)', ''] };
    const PIES = rent ? [{ ttl: 'Selama kontrak', un: 'tahun 1–25', seg: [['sav', 18], ['mid', 32], ['pln', 50]] }, { ttl: 'Setelah kontrak selesai', un: 'tahun ke-26 dst.', seg: [['sav', 50], ['pln', 50]] }]
      : [{ ttl: 'Komposisi tagihan listrik', un: 'porsi tagihan tanpa surya', seg: [['sav', 48], ['mid', 2], ['pln', 50]] }];
    const A = f => -Math.PI / 2 + f * 2 * Math.PI, at = (cx, cy, r, f) => (cx + r * Math.cos(A(f))).toFixed(2) + ',' + (cy + r * Math.sin(A(f))).toFixed(2);
    const arc = (g, a1) => { const x = g.cx + g.ox, y = g.cy + g.oy; return `M${x},${y}L${at(x, y, g.R, g.a0)}A${g.R},${g.R} 0 ${a1 - g.a0 > .5 ? 1 : 0} 1 ${at(x, y, g.R, a1)}Z`; };    /* pie slice, pushed out along its middle */
    let W = 760, H = 360, raf = 0, cw = 0, anim = false, PS = [], SG = [];
    const pies = u => $$('.sg', el).forEach((s, i) => { const g = SG[i], a1 = Math.min(g.a1, u), d = a1 > g.a0 + 1e-4 ? arc(g, a1) : 'M0,0'; $$('path', s).forEach(q => q.setAttribute('d', d)); });
    function render(done) {
      const mob = mobQ.matches, pg = document.documentElement.classList.contains('paged'); cw = el.clientWidth || cw;    /* viewBox follows the real width so text stays 1:1 */
      W = mob ? 400 : Math.round(clamp((cw || 796) - 36, 640, 1240));    /* minus the backdrop padding */
      const ph = mob ? 170 : Math.round(clamp(W * (pg ? .22 : .26), 210, pg ? 250 : 290)), ch = mob ? 220 : ph, T = 34, B = 40, L = 46, R = 12, G = 56;
      const cash = { cash: 1, a: 0, y0: -5, y1: 22, st: 5, f: v => v ? (v < 0 ? '−' : '') + Math.abs(v) + '×' : '0', ttl: 'Arus kas kumulatif', un: '× tagihan tahun 1' };
      if (rent) PS = mob ? [{ x: 0, y: T, w: W, h: ph }, { x: 0, y: 2 * T + ph + 12, w: W, h: ph }] : [{ x: 0, y: T, w: (W - G) / 2, h: ph }, { x: (W + G) / 2, y: T, w: (W - G) / 2, h: ph }];
      else if (mob) PS = [{ x: 0, y: T, w: W, h: ph }, Object.assign(cash, { x: L, y: 2 * T + ph + 12, w: W - L - R, h: ch })];
      else { const w1 = Math.round((W - L - R - G) * .42); PS = [{ x: 0, y: T, w: w1, h: ph }, Object.assign(cash, { x: w1 + G + L, y: T, w: W - w1 - G - L - R, h: ch })]; }
      PS.forEach((p, i) => { if (!p.cash) Object.assign(p, PIES[i]); else { p.X = t => p.x + t / 30 * p.w; p.Y = v => p.y + (p.y1 - v) / (p.y1 - p.y0) * p.h; } });
      const last = PS[PS.length - 1]; H = last.y + last.h + (last.cash ? B : 12);

      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${rent ? 'Grafik ilustrasi: porsi tagihan listrik dengan sewa PLTS, selama dan sesudah kontrak 25 tahun' : 'Grafik ilustrasi: porsi tagihan listrik dan arus kas kumulatif pada pembelian PLTS'}"><defs>`;
      if (!rent) { const p = PS[1]; s += `<clipPath id="${uid}c"><rect class="rv" data-w="${p.w + 16}" x="${p.x - 8}" y="${p.y - 30}" width="${p.w + 16}" height="${p.h + 40}"/></clipPath>`; }
      Object.keys(K).forEach(k => { const c = K[k][1]; s += `<radialGradient id="${uid}g${k}" cx=".45" cy=".4" r=".75"><stop offset="0" style="stop-color:color-mix(in srgb,${c},#fff 40%)"/><stop offset=".6" style="stop-color:${c}"/><stop offset="1" style="stop-color:color-mix(in srgb,${c},#000 30%)"/></radialGradient>`; });    /* glossy, lit from the top left */
      /* gel slice: drop shadow, slice, inner shadow along the lower edge, specular bevel lit from the top left */
      s += `<filter id="${uid}s" x="-25%" y="-25%" width="150%" height="160%" color-interpolation-filters="sRGB">`
        + '<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/><feSpecularLighting in="b" surfaceScale="4" specularConstant=".8" specularExponent="20" lighting-color="#fff" result="sp"><feDistantLight azimuth="225" elevation="35"/></feSpecularLighting><feComposite in="sp" in2="SourceAlpha" operator="in" result="hi"/>'
        + '<feOffset in="SourceAlpha" dy="-4"/><feGaussianBlur stdDeviation="3" result="ob"/><feComposite in="SourceAlpha" in2="ob" operator="arithmetic" k2="1" k3="-1" result="rim"/><feFlood flood-color="#001028" flood-opacity=".45"/><feComposite in2="rim" operator="in" result="is"/>'
        + '<feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dy="5"/><feComponentTransfer result="ds"><feFuncA type="linear" slope=".38"/></feComponentTransfer>'
        + '<feMerge><feMergeNode in="ds"/><feMergeNode in="SourceGraphic"/><feMergeNode in="is"/><feMergeNode in="hi"/></feMerge></filter>';
      PS.forEach((p, i) => { if (p.cash) return; const R = Math.min(p.h / 2 - 4, (p.w - 210) / 2 - 14, 130), cx = p.x + R + 4, cy = p.y + p.h / 2;    /* curved white cap over the top of each pie */
        s += `<radialGradient id="${uid}h${i}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy - R * .95}" r="${R * .85}"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".8" stop-color="#fff" stop-opacity=".14"/><stop offset=".83" stop-color="#fff" stop-opacity="0"/></radialGradient>`; });
      s += '</defs>'; SG = [];
      if (rent && !mob) s += `<line x1="${W / 2}" x2="${W / 2}" y1="${T - 20}" y2="${T + ph}" class="gl"/>`;
      PS.forEach((p, pi) => {
        if (p.cash) return;
        s += `<text x="${p.x + 4}" y="${p.y - 18}" class="pt">${p.ttl}<tspan dx="8">${p.un}</tspan></text>`;
        const R0 = Math.min(p.h / 2 - 4, (p.w - 210) / 2 - 14, 130), dx = clamp(R0 * .03, 2, 4), Ro = R0 - dx, cx = p.x + R0 + 4, cy = p.y + p.h / 2;
        let f = 0; p.seg.forEach(([k, v]) => { const m = A(f + v / 200); SG.push({ cx, cy, ox: dx * Math.cos(m), oy: dx * Math.sin(m), R: Ro, a0: f, a1: f + v / 100, k, n: K[k][0], c: K[k][1], v, ttl: p.ttl, pi }); f += v / 100; });
        const lx = cx + R0 + 28, lw = Math.min(p.x + p.w - lx - 8, 250), n = p.seg.length + 1, y0 = cy - (n - 1) * 13;
        p.seg.forEach(([k, v], j) => s += `<rect x="${lx}" y="${y0 + j * 26 - 6}" width="10" height="10" rx="2" style="fill:${K[k][1]}"/><text x="${lx + 18}" y="${y0 + j * 26 + 3.5}" class="li">${K[k][0]}</text><text x="${lx + lw}" y="${y0 + j * 26 + 3.5}" text-anchor="end" class="lv">${k === 'sav' ? 'up to ' : ''}${v}%</text>`);
        const yt = y0 + (n - 1) * 26; s += `<line x1="${lx}" x2="${lx + lw}" y1="${yt - 13}" y2="${yt - 13}" class="gl"/><text x="${lx}" y="${yt + 3.5}" class="ax">Tagihan tanpa surya</text><text x="${lx + lw}" y="${yt + 3.5}" text-anchor="end" class="lv m">100%</text>`;
      });
      s += SG.map((g, i) => `<g class="sg" data-i="${i}" filter="url(#${uid}s)"><path class="sf" style="fill:url(#${uid}g${g.k})" d="M0,0"/><path class="sh" fill="url(#${uid}h${g.pi})" d="M0,0"/></g>`).join('');
      s += SG.map(g => { if (g.v < 7) return ''; const [x, y] = at(g.cx + g.ox, g.cy + g.oy, g.R * .6, (g.a0 + g.a1) / 2).split(',').map(Number), c = `il${K[g.k][2]} fl`, fs = Math.round(clamp(g.R * .19, 15, 24));    /* savings are a ceiling, not a promise */
        return g.k === 'sav' ? `<text x="${x}" y="${(y - fs * .5).toFixed(1)}" text-anchor="middle" class="${c} iu" style="font-size:${Math.max(10, Math.round(fs * .5))}px">up to</text><text x="${x}" y="${(y + fs * .55).toFixed(1)}" text-anchor="middle" class="${c}" style="font-size:${fs}px">${g.v}%</text>` : `<text x="${x}" y="${(y + fs * .36).toFixed(1)}" text-anchor="middle" class="${c}" style="font-size:${fs}px">${g.v}%</text>`; }).join('');
      if (!rent) {
        const p = PS[1], { X, Y } = p, pt = (t, v) => X(t).toFixed(1) + ',' + Y(v).toFixed(1);
        s += `<text x="${p.x - L + 4}" y="${p.y - 18}" class="pt">${p.ttl}<tspan dx="8">${p.un}</tspan></text>`;
        for (let v = p.y0; v <= p.y1; v += p.st) s += `<line x1="${p.x}" x2="${p.x + p.w}" y1="${Y(v)}" y2="${Y(v)}" class="${v ? 'gl' : 'zl'}"/><text x="${p.x - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">${p.f(v)}</text>`;
        [0, 5, 10, 15, 20, 25, 30].forEach(t => s += `<text x="${X(t)}" y="${p.y + p.h + 18}" text-anchor="middle" class="ax">${t}</text>`);
        s += `<text x="${p.x + p.w / 2}" y="${p.y + p.h + 35}" text-anchor="middle" class="ax">Tahun</text><g clip-path="url(#${uid}c)">`;
        const cs = [], ng = [], po = [];
        for (let t = 0; t <= 30.001; t += .25) { cs.push(pt(t, cum(t))); (t < PB ? ng : po).push(pt(t, cum(t))); }
        s += `<path d="M${pt(0, 0)}L${ng.join('L')}L${pt(PB, 0)}Z" class="na"/><path d="M${pt(PB, 0)}L${po.join('L')}L${pt(30, 0)}Z" class="pa"/>`;
        s += `<path d="M${cs.join('L')}" class="cl h"/><path d="M${cs.join('L')}" class="cl"/>`;
        s += [[0, cum(0)], [PB, 0], [30, cum(30)]].map(c => `<circle cx="${X(c[0])}" cy="${Y(c[1])}" r="4.5" class="pm"/>`).join('') + '</g>';
        s += `<text x="${X(0) + 2}" y="${Y(cum(0)) + 19}" class="an fl">Investasi awal −${dec(-cum(0))}×</text>`;
        s += `<text x="${X(PB) + 10}" y="${Y(0) + 18}" class="an fl">Balik modal ± tahun ke-${Math.round(PB)}</text>`;
        s += `<text x="${X(30) - 8}" y="${Y(cum(30)) - 12}" text-anchor="end" class="an fl">+${dec(cum(30))}× di tahun ke-30</text>`;
        s += `<circle class="hd" r="4.5" visibility="hidden"/><line class="gd" y1="${p.y}" y2="${p.y + p.h}" visibility="hidden"/>`;
      }
      s += `</svg><div class="fc-tip" hidden></div>`;
      s += `<p class="fc-cap">${rent ? 'Ilustrasi: porsi dari tagihan listrik tanpa surya, contoh kontrak 25 tahun. Setelah kontrak selesai, porsi surya (hingga 50% tagihan) menjadi gratis; sisa tagihan PLN tetap ada. ' : 'Ilustrasi: porsi surya hingga 50% tagihan, biaya O&amp;M ± 2%, tarif PLN naik 3% per tahun, investasi awal ± 2,7× tagihan tahun pertama. '}Angka aktual tergantung tarif, profil beban, dan studi kelayakan.</p>`;
      s += `<table class="sr"><caption>Data grafik (porsi dari tagihan tanpa surya)</caption><tr><th>Periode</th>${PIES[0].seg.map(([k]) => `<th>${K[k][0]}</th>`).join('')}</tr>`
        + PIES.map(q => `<tr><td>${q.ttl}</td>${PIES[0].seg.map(([k]) => `<td>${(q.seg.find(x => x[0] === k) || [0, 0])[1]}%</td>`).join('')}</tr>`).join('') + '</table>';
      if (!rent) s += `<table class="sr"><caption>Arus kas kumulatif (× tagihan tahun 1)</caption><tr><th>Tahun</th><th>Kumulatif</th></tr>${[0, 1, 5, 10, 15, 20, 25, 30].map(t => `<tr><td>${t}</td><td>${dec(cum(t))}×</td></tr>`).join('')}</table>`;
      el.innerHTML = s; el.classList.remove('on');
      const svg = $('svg', el), tip = $('.fc-tip', el), gd = $('.gd', el), hd = $('.hd', el), sgs = $$('.sg', el);
      $$('.rv', el).forEach(r => r.setAttribute('width', done ? r.dataset.w : 0)); pies(done ? 1 : 0); if (done) el.classList.add('on');
      const hide = () => { tip.hidden = true; sgs.forEach(g => g.classList.remove('dim')); [gd, hd].forEach(g => g && g.setAttribute('visibility', 'hidden')); };
      svg.onpointerleave = hide;
      svg.onpointermove = e => {
        const rc = svg.getBoundingClientRect(), er = el.getBoundingClientRect(), k = Math.min(rc.width / W, rc.height / H), ox = (rc.width - W * k) / 2;
        const u = (e.clientX - rc.left - ox) / k, v = (e.clientY - rc.top) / k, sg = e.target.closest('.sg'), p = PS[1];
        let px;
        if (sg) {
          const g = SG[+sg.dataset.i]; hide();
          sgs.forEach((o, i) => o.classList.toggle('dim', o !== sg && SG[i].cx === g.cx));
          tip.innerHTML = `<b>${g.ttl}</b><span><i style="background:${g.c}"></i>${g.n} <b>${g.k === 'sav' ? 'up to ' : ''}${g.v}%</b></span>`;
          px = e.clientX - er.left; tip.style.top = (e.clientY - er.top - 20) + 'px';
        } else if (p && p.cash && (mob ? v > p.y - T : u > p.x - 20)) {
          sgs.forEach(o => o.classList.remove('dim'));
          const t = Math.round(clamp(u - p.x, 0, p.w) / p.w * 30);
          tip.innerHTML = `<b>${t ? 'Tahun ' + t : 'Awal (tahun 0)'}</b><span><i style="background:var(--c-sav)"></i>${t ? 'Arus kas kumulatif' : 'Investasi awal'} <b>${(cum(t) > 0 ? '+' : '') + dec(cum(t))}×</b></span>`;
          gd.setAttribute('x1', p.X(t)); gd.setAttribute('x2', p.X(t)); gd.setAttribute('visibility', 'visible');
          hd.setAttribute('cx', p.X(t)); hd.setAttribute('cy', p.Y(cum(t))); hd.setAttribute('visibility', 'visible');
          px = rc.left - er.left + ox + p.X(t) * k; tip.style.top = (rc.top - er.top + p.y * k) + 'px';
        } else return hide();
        tip.hidden = false; tip.style.left = px + 'px'; tip.style.transform = px > er.width * .6 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)';
      };
    }
    function go() {
      if (el.clientWidth && Math.abs(el.clientWidth - cw) >= 8) render();
      const set = u => { $$('.rv', el).forEach(r => r.setAttribute('width', r.dataset.w * u)); pies(u); };
      el.classList.remove('on'); cancelAnimationFrame(raf);
      if (reduce) { set(1); el.classList.add('on'); return; }
      const t0 = performance.now(), step = n => { const u = clamp((n - t0) / 1200, 0, 1); set(1 - (1 - u) ** 3); if (u < 1) raf = requestAnimationFrame(step); else { anim = false; el.classList.add('on'); } };
      anim = true; set(0); raf = requestAnimationFrame(step);
    }
    render(); mobQ.addEventListener('change', () => render(!anim));
    new ResizeObserver(() => { const w = el.clientWidth; if (!w || Math.abs(w - cw) < 8) return; cw = w; render(!anim && el.classList.contains('on')); }).observe(el);
    FC[id] = { go };
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting && el.offsetParent) { go(); o.disconnect(); } }, { threshold: .3 }).observe(el);
  }
  finChart('chBuy', false); finChart('chRent', true);

  /* ---------- financing ---------- */
  function setFin(rent) {
    $('#fBuy').setAttribute('aria-selected', !rent); $('#fRent').setAttribute('aria-selected', rent);
    $('#pBuy').hidden = rent; $('#pRent').hidden = !rent; FC[rent ? 'chRent' : 'chBuy'].go();
  }
  $('#fBuy').onclick = () => setFin(false); $('#fRent').onclick = () => setFin(true);

  /* ---------- portfolio ---------- */
  const IND = [
    { n: 'PT Pei Hai International Wiratama Indonesia (Phase 1)', s: 'Pei Hai · Fase 1', v: 1.51, img: 'pei-hai-1' },
    { n: 'PT Mitra Saruta Indonesia', s: 'Mitra Saruta', v: 3, img: 'mitra-saruta' },
    { n: 'PT Setia Kawan Makmur Sejahtera (Phase 1)', s: 'Setia Kawan · Fase 1', v: 1.59, img: 'setia-kawan' },
    { n: 'PT Inkasa Jaya Aluminium', s: 'Inkasa Jaya', v: 1.9, img: 'inkasa' },
    { n: 'PT Pei Hai International Wiratama Indonesia (Phase 2)', s: 'Pei Hai · Fase 2', v: 2.26, img: 'pei-hai-2' }
  ].map(x => ({ ...x, u: 'MWp', cat: 'Industri', cd: 2 }));
  const COM = [
    { n: 'Hotel Azana Style', s: 'Hotel Azana Style', v: 44.2, img: 'azana', cat: 'Komersial' },
    { n: 'PT Indrayasa Migasa', s: 'Indrayasa Migasa', v: 7, img: 'indrayasa', cat: 'Komersial' },
    { n: 'Zhang Palace', s: 'Zhang Palace', v: 15, img: 'zhang', cat: 'Komersial' },
    { n: 'PT Boncafe Sejahtera', s: 'Boncafe Sejahtera', v: 15.2, img: 'boncafe', cat: 'Komersial' },
    { n: 'Residensial 1', s: 'Residensial', v: null, img: 'res-1', cat: 'Residensial' },
    { n: 'Residensial 2', s: 'Residensial', v: null, img: 'res-2', cat: 'Residensial' },
    { n: 'Residensial 3', s: 'Residensial', v: null, img: 'res-3', cat: 'Residensial' }
  ].map(x => ({ ...x, u: 'kWp' }));
  const cap = p => p.v == null ? 'Residensial' : (p.u === 'MWp' ? idn(p.v, p.v % 1 ? 2 : 0) : idn(p.v, p.v % 1 ? 1 : 0)) + ' ' + p.u;
  let pfTab = 'ind', pfSel = { ind: 0, com: 0 };
  function hexHtml(list, off, idx) { return list.map((p, i) => `<div class="hw"><button class="hex" data-i="${off + i}" aria-pressed="false" aria-label="${p.n}, ${cap(p)}"><img src="img/${p.img}.webp" alt=""><span class="cap">${cap(p)}</span></button></div>`).join(''); }
  $('#hcInd').innerHTML = `<div class="hr">${hexHtml(IND.slice(0, 2), 0)}</div><div class="hr">${hexHtml(IND.slice(2), 2)}</div>`;
  $('#hcCom').innerHTML = `<div class="hr">${hexHtml(COM.slice(0, 4), 0)}</div><div class="hr">${hexHtml(COM.slice(4), 4)}</div>`;
  function renderPf() {
    const list = pfTab === 'ind' ? IND : COM, i = pfSel[pfTab], p = list[i];
    $$('.hex').forEach(h => h.setAttribute('aria-pressed', 'false'));
    $$((pfTab === 'ind' ? '#hcInd' : '#hcCom') + ' .hex').forEach(h => h.setAttribute('aria-pressed', +h.dataset.i === i));
    const barList = pfTab === 'ind' ? IND : COM.slice(0, 4), max = Math.max(...barList.map(x => x.v));
    const total = barList.reduce((a, x) => a + x.v, 0);
    $('#pdet').innerHTML = `<div class="ph"><img src="img/${p.img}.webp" alt="Foto instalasi ${p.n}"></div>
      <div><span class="cat">${p.cat}</span><h3>${p.n}</h3></div>
      <div class="cp">${cap(p)}</div>
      <div class="bars" aria-label="Perbandingan kapasitas">${barList.map((x, k) => `<button data-k="${k}" aria-pressed="${list[i] === x}"><span class="nm">${x.s}</span><span class="tr"><i data-w="${(x.v / max * 100).toFixed(1)}"></i></span><span class="vl">${idn(x.v, x.v % 1 ? (x.u === 'MWp' ? 2 : 1) : 0)}</span></button>`).join('')}</div>
      <p style="font-size:.84rem;color:var(--on-navy-muted)">${pfTab === 'ind' ? `Total proyek industri di atas: ${idn(total, 2)} MWp.` : `Total proyek komersial di atas: ${idn(total, 1)} kWp, ditambah instalasi residensial.`}</p>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.bars i').forEach(b => b.style.width = b.dataset.w + '%')));
    $('#pdet').dispatchEvent(new Event('hme-render', { bubbles: true }));
    $$('.bars button').forEach(b => b.onclick = () => { pfSel[pfTab] = +b.dataset.k; renderPf(); });
  }
  $$('.hex').forEach(h => h.onclick = () => { pfSel[pfTab] = +h.dataset.i; renderPf(); });
  function setPf(t) {
    pfTab = t; $('#pfInd').setAttribute('aria-selected', t === 'ind'); $('#pfCom').setAttribute('aria-selected', t === 'com');
    $('#hcInd').classList.toggle('on', t === 'ind'); $('#hcCom').classList.toggle('on', t === 'com'); renderPf();
  }
  $('#pfInd').onclick = () => setPf('ind'); $('#pfCom').onclick = () => setPf('com'); setPf('ind');

  /* ---------- clients + brands ---------- */
  const CL = [['c-ph', 'PT Pei Hai International Wiratama Indonesia'], ['c-bravo', 'Bravo Supermarket Tuban'], ['c-sk', 'SK'], ['c-inkasa', 'PT Inkasa Jaya Aluminium'], ['c-azana', 'Azana Tulungagung'], ['c-boncafe', 'Boncafe Steak & Ice Cream'], ['c-mitra', 'Mitra'], ['c-sh', 'Sekolah Sinar Harapan'], ['c-im', 'IM'], ['c-zhang', 'Zhang Palace']];
  const BR = [['b-huawei', 'Huawei'], ['b-supreme', 'Supreme'], ['b-kabelindo', 'Kabelindo'], ['b-trina', 'Trina Solar'], ['b-jinko', 'Jinko Solar'], ['b-zte', 'ZTE'], ['b-solarack', 'Solarack'], ['b-sungrow', 'Sungrow'], ['b-schneider', 'Schneider Electric'], ['b-jasolar', 'JA Solar'], ['b-jjlapp', 'JJ-Lapp'], ['b-soeasy', 'Soeasy']];
  const SQ = ['b-huawei', 'b-supreme', 'b-kabelindo'];
  const track = (list, cls) => { const one = list.map(([f, a]) => `<div class="lg ${cls}${SQ.includes(f) ? ' sq' : ''}"><img src="img/${f}.webp" alt="${a}"></div>`).join(''); return one + one.replace(/alt="/g, 'aria-hidden="true" alt="'); };
  $('#trC').innerHTML = track(CL, ''); $('#trB').innerHTML = track(BR, 'w');

  /* ---------- copy ---------- */
  $$('[data-copy]').forEach(b => b.onclick = () => {
    const txt = b.dataset.copy, done = () => { const o = b.textContent; b.textContent = 'Tersalin'; setTimeout(() => b.textContent = o, 1500); };
    const sel = () => { const v = b.closest('.ci').querySelector('.v'), r = document.createRange(); r.selectNodeContents(v); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(txt).then(done, sel); } catch (e) { sel(); }
  });

  /* ---------- keyboard: ← → move between chapters ---------- */
  const all = [hero, ...secs.filter(s => s !== hero)];
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    if (e.target.closest && e.target.closest('input,select,textarea,[role=tab],[role=switch]')) return;
    const tops = all.map(s => s.getBoundingClientRect().top);
    let i = 0; tops.forEach((t, k) => { if (t <= 120) i = k; });
    const ni = clamp(e.key === 'ArrowRight' ? i + 1 : (tops[i] < -40 ? i : i - 1), 0, all.length - 1);
    all[ni].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
})();
