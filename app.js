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

  /* ---------- financing charts (inline SVG, stacked areas; index: year-1 PLN bill = 100, tariff +3%/yr) ---------- */
  const FC = {}, mobQ = matchMedia('(max-width:560px)');
  function finChart(id, rent) {
    const el = $('#' + id), uid = id + '-', bill = t => 100 * 1.03 ** (t - 1);
    const ss = u => (u = clamp(u, 0, 1)) * u * (3 - 2 * u), rs = t => .32 * (1 - ss((t - 25) / .8)), OM = .02;
    const NS = (.5 - OM) * 100, cum = t => (-270 + NS * (1.03 ** t - 1) / .03) / 10, PB = Math.log(1 + 270 * .03 / NS) / Math.log(1.03);           /* cumulative net cash flow; 10 units = 1x the year-1 bill */
    const cv = t => cum(t) * 1.25;                                     /* plotted on the shared axis: 12.5 units = 1x, so 250 = 20x and -50 = -4x */
    const lay = t => { const b = bill(t), p = .5 * b; return [0, p, p + (rent ? rs(t) : OM) * b, b]; };
    const NM = rent ? ['Tagihan PLN', 'Tagihan sewa', 'Penghematan'] : ['Tagihan PLN', 'Biaya O&M', 'Penghematan'];
    const CL = ['var(--c-pln)', rent ? 'var(--c-rent)' : 'var(--c-om)', `url(#${uid}g)`];
    let W = 760, H = 360, raf = 0, cw = 0, anim = false, L, pw, X, Y, a;
    function render(done) {
      const mob = mobQ.matches, pg = document.documentElement.classList.contains('paged'); cw = el.clientWidth || cw;    /* viewBox follows the real width so text stays 1:1 */
      W = mob ? 400 : Math.round(clamp(cw || 760, 640, 1240)); H = mob ? 330 : Math.round(clamp(W * (pg ? .3 : .38), 320, pg ? 360 : 440));
      L = rent ? (mob ? 14 : 118) : (mob ? 44 : 56); const R = 50, T = 32, Bm = 36; pw = W - L - R; const ph = H - T - Bm;
      a = rent ? 1 : 0; const y0 = rent ? 0 : -50, y1 = rent ? 250 : 260;
      X = t => L + (t - a) / (30 - a) * pw; Y = v => T + (y1 - v) / (y1 - y0) * ph;
      const ts = []; for (let t = 1; t <= 30.001; t += .25) ts.push(t);
      const pt = (t, v) => X(t).toFixed(1) + ',' + Y(v).toFixed(1);
      const band = i => 'M' + ts.map(t => pt(t, lay(t)[i + 1])).join('L') + 'L' + ts.slice().reverse().map(t => pt(t, lay(t)[i])).join('L') + 'Z';
      const fix = (x, y, w, h, s) => `<g class="fl"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" class="bub"/>` + s.map((l, k) => `<text x="${x + w / 2}" y="${y + (h - (s.length - 1) * 15) / 2 + 4.5 + k * 15}" text-anchor="middle" class="bt">${l}</text>`).join('') + '</g>';
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${rent ? 'Ilustrasi grafik: biaya listrik dengan sewa PLTS selama dan sesudah kontrak' : 'Ilustrasi grafik: penghematan tagihan listrik dan arus kas kumulatif pada pembelian PLTS'}">`;
      s += `<defs><linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c-sav)"/><stop offset="1" style="stop-color:var(--c-sav)"/></linearGradient><clipPath id="${uid}c"><rect class="rv" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`;
      for (let v = y0; v <= 250; v += 50) s += `<line x1="${L}" x2="${L + pw}" y1="${Y(v)}" y2="${Y(v)}" class="gl${v < 0 ? " ng" : ""}"/>` + (v < 0 ? "" : `<text x="${L + pw + 8}" y="${Y(v) + 4}" class="ax">${v}</text>`) + (rent ? "" : `<text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax${v < 0 ? " neg" : ""}">${v ? (v < 0 ? "−" : "") + Math.abs(v) / 12.5 + "×" : 0}</text>`);
      for (let t = a; t <= 30; t += t === 1 ? 4 : 5) s += `<text x="${X(t)}" y="${H - 18}" text-anchor="middle" class="ax">${t}</text>`;
      s += `<text x="${L + pw / 2}" y="${H - 3}" text-anchor="middle" class="ax">Tahun</text>`;
      s += `<text transform="translate(${W - 6} ${T + ph / 2}) rotate(90)" text-anchor="middle" class="ax tt">Indeks tagihan listrik (tahun 1 = 100)</text>`;
      if (!rent) s += `<text transform="translate(11 ${T + ph / 2}) rotate(-90)" text-anchor="middle" class="ax tt">Arus kas kumulatif (× tagihan tahun 1)</text>`;
      s += `<g clip-path="url(#${uid}c)">` + [0, 1, 2].map(i => `<path d="${band(i)}" ${i < 2 ? `style="fill:${CL[i]}"` : `fill="${CL[i]}"`} class="ar"/>`).join('');
      if (!rent) {
        const cs = []; for (let t = 0; t <= 30.001; t += .25) cs.push(pt(t, cv(t)));
        const ng = []; for (let t = 0; t <= PB; t += .25) ng.push(pt(t, cv(t)));    /* below zero until payback */
        s += `<rect x="${L}" y="${Y(0)}" width="${pw}" height="${Y(-50) - Y(0)}" class="nz"/><path d="M${pt(0, 0)}L${ng.join('L')}L${pt(PB, 0)}Z" class="na"/>`;
        s += `<line x1="${L}" x2="${L + pw}" y1="${Y(0)}" y2="${Y(0)}" class="zl"/><path d="M${cs.join('L')}" class="cl h"/><path d="M${cs.join('L')}" class="cl"/><rect x="${X(0) - 7}" y="${Y(0)}" width="14" height="${Y(cv(0)) - Y(0)}" class="inv"/>`;
      }
      s += '</g>';
      s += `<path d="M${ts.map(t => pt(t, bill(t))).join('L')}" class="tl fl"/>`;
      if (rent) {
        s += `<text x="${X(2)}" y="${Y(bill(2)) - 14}" class="ax fl">Tagihan tanpa surya</text>`;
        s += `<line x1="${X(25)}" x2="${X(25)}" y1="${T - 4}" y2="${Y(0)}" class="ce fl"/><text x="${X(25)}" y="${T - 12}" text-anchor="middle" class="ce-t fl">Kontrak selesai</text>`;
        const m = [['Hingga 50%', 25, '50%'], ['Hingga 32%', 66, '32%'], ['Hingga 18%', 91, '18%']];
        m.forEach((r, k) => s += mob ? `<text x="${X(2.2)}" y="${Y(r[1]) + 4}" class="in-t${k < 2 ? ' w' : ''} fl">${r[2]}</text>` : `<g class="fl"><line x1="${L - 18}" x2="${X(1) + 12}" y1="${Y(r[1])}" y2="${Y(r[1])}" class="ld"/><circle cx="${X(1) + 12}" cy="${Y(r[1])}" r="3" class="ldc"/><text x="${L - 24}" y="${Y(r[1]) + 4.5}" text-anchor="end" class="ll">${r[0]}</text></g>`);
        const ty = Y(.75 * bill(28));
        s += mob ? `<line x1="${L + 106}" y1="${Y(238) + 40}" x2="${X(28)}" y2="${ty}" class="ld fl"/><circle cx="${X(28)}" cy="${ty}" r="3" class="ldc fl"/>` + fix(L + 10, Y(238), 96, 40, ['Hemat 100%', 'porsi surya*']) : fix(X(27.4) - 47, ty - 20, 94, 40, ['Hemat 100%', 'porsi surya*']);
      } else {
        const pb = PB; if (!mob) s += `<text x="${X(0) + 14}" y="${Y(cv(0)) + 14}" class="ax fl">Investasi awal</text>`;
        s += `<text x="${X(24)}" y="${Y(cv(24)) - 12}" text-anchor="end" class="ll h fl">Arus kas kumulatif</text>`;
        const bx = mob ? X(8) : X(7.5), by = Y(-10), bw = mob ? 142 : 170;
        s += `<g class="fl"><line x1="${X(pb)}" y1="${Y(0) + 5}" x2="${bx}" y2="${by + 13}" class="ld"/><circle cx="${X(pb)}" cy="${Y(0)}" r="5" class="pm"/></g>` + fix(bx, by, bw, 26, ['Balik modal ± tahun ke-5']);
        s += `<line x1="${X(0)}" y1="${Y(238) + (mob ? 38 : 26)}" x2="${X(0)}" y2="${Y(0)}" class="ld fl"/>` + (mob ? fix(L - 4, Y(238), 128, 38, ['Sistem milik Anda', 'sejak hari pertama']) : fix(L - 8, Y(238), 252, 26, ['Sistem milik Anda sejak hari pertama']));
      }
      s += `<line class="gd" y1="${T}" y2="${Y(y0)}" hidden/></svg><div class="fc-tip" hidden></div>`;
      const lg = [['var(--c-sav)', 'Penghematan'], [rent ? 'var(--c-rent)' : 'var(--c-om)', rent ? 'Tagihan sewa' : 'Biaya O&amp;M (± 2%)'], ['var(--c-pln)', 'Tagihan PLN']];
      if (!rent) lg.push(['var(--c-cash)', 'Investasi awal &amp; arus kas kumulatif']);
      s += `<div class="fc-leg">${lg.map(l => `<span><i style="background:${l[0]}"></i>${l[1]}</span>`).join('')}</div>`;
      s += `<p class="fc-cap">${rent ? 'Ilustrasi: contoh kontrak 25 tahun, tarif PLN naik 3% per tahun. *Saat produksi puncak; hanya porsi surya yang menjadi gratis, sisa tagihan PLN tetap ada. ' : 'Ilustrasi: tarif PLN naik 3% per tahun, porsi surya hingga 50% tagihan, investasi awal ± 2,7× tagihan tahun pertama. '}Angka aktual tergantung tarif, profil beban, dan studi kelayakan.</p>`;
      el.innerHTML = s; el.classList.remove('on');
      const svg = $('svg', el), tip = $('.fc-tip', el), gd = $('.gd', el);
      $('.rv', el).setAttribute('width', done ? W : 0); if (done) el.classList.add('on');
      svg.onpointerleave = () => { tip.hidden = gd.hidden = true; };
      svg.onpointermove = e => {
        const rc = svg.getBoundingClientRect(), er = el.getBoundingClientRect(), k = Math.min(rc.width / W, rc.height / H), ox = (rc.width - W * k) / 2;
        const u = (e.clientX - rc.left - ox) / k, t = Math.round(clamp(a + (u - L) / pw * (30 - a), a, 30));
        let h = `<b>Tahun ${t}</b>`;
        if (t >= 1) { const l = lay(t); h += [2, 1, 0].map(i => `<span><i style="background:${i === 2 ? 'var(--c-sav)' : CL[i]}"></i>${NM[i]} <b>${Math.round(l[i + 1] - l[i])}</b></span>`).join(''); }
        if (!rent) h += `<span><i style="background:var(--c-cash)"></i>${t ? 'Kumulatif' : 'Investasi awal'} <b>${(cum(t) > 0 ? '+' : '') + (cum(t) / 10).toFixed(1).replace('.', ',')}×</b></span>`;
        tip.innerHTML = h; tip.hidden = gd.hidden = false;
        const px = rc.left - er.left + ox + X(t) * k; tip.style.left = px + 'px'; tip.style.transform = px > er.width * .6 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)';
        gd.setAttribute('x1', X(t)); gd.setAttribute('x2', X(t));
      };
    }
    function go() {
      if (el.clientWidth && Math.abs(el.clientWidth - cw) >= 8) render();
      const r = $('.rv', el); el.classList.remove('on'); cancelAnimationFrame(raf);
      if (reduce) { r.setAttribute('width', W); el.classList.add('on'); return; }
      const t0 = performance.now(), step = n => { const u = Math.min(1, (n - t0) / 1200); $('.rv', el).setAttribute('width', W * (1 - (1 - u) ** 3)); if (u < 1) raf = requestAnimationFrame(step); else { anim = false; el.classList.add('on'); } };
      anim = true; r.setAttribute('width', 0); raf = requestAnimationFrame(step);
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
