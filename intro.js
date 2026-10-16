/* Presentation opening: rooftop PLTS installed on a factory, start to finish, then the PT Hexa Multi Energi logo.
   Drawn procedurally on a canvas (no extra assets). Exposes window.HMEIntro = { play, skip, cancel, active }. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, k) => a + (b - a) * k;
  const eio = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const eout = k => 1 - Math.pow(1 - k, 3);
  const back = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const mix = (a, b, k) => 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',') + ')';

  /* ---------- timeline (seconds) ---------- */
  const SURVEY = [.8, 2.7], RAILS = [2.7, 4.3], LIFT0 = 4.4, LIFT_GAP = 1.55, CABLE = [9.7, 11.0], COMM = [11.0, 13.3];
  /* the 3D version adds a drone-POV beat in front (PRE) and a phone-monitoring beat (MON, story time) before the logo */
  const PRE3 = 8.2, SW3 = 3.6, MON = [13.4, 17.8];
  /* 3D timeline: all panels land together, then walkway, cleaning pipe and safety line are installed before the cabling */
  const T3 = { SURVEY, RAILS, LIFT0, LIFT_GAP, WALK: [6.6, 8.0], PIPE: [7.8, 9.2], SAFE: [9.0, 10.3], CABLE: [10.5, 11.8], COMM: [11.8, 14.1] }, MON3 = [14.2, 18.6];
  let PRE = 0, LOGO_AT = 13.4, REVEAL_AT = 17.2, END_AT = 18.0;
  const BASE_STAGES = [
    { a: SURVEY[0], t: 'Survei & desain atap' },
    { a: RAILS[0], t: 'Pemasangan rangka & rail' },
    { a: LIFT0, t: 'Pemasangan panel surya' },
    { a: CABLE[0], t: 'Kabel DC & inverter' },
    { a: COMM[0], t: 'Commissioning · PLTS menyala' }
  ];
  let STAGES = BASE_STAGES;

  /* ---------- scene geometry (virtual 1600 x 900) ---------- */
  const VW = 1600, VH = 900, GROUND = 760;
  const WALL = { x0: 330, x1: 1230, y0: 470, y1: GROUND }, DX = 150, DY = -190;
  const roof = (u, v) => [WALL.x0 + (WALL.x1 - WALL.x0) * u + DX * v, WALL.y0 + DY * v];
  const ROWS = 3, COLS = 10, RV0 = .12, RV1 = .88, RU0 = .04, RU1 = .96;
  const rowV = r => { const h = (RV1 - RV0) / ROWS; return [RV0 + r * h + .012, RV0 + (r + 1) * h - .012]; };
  const colU = c => { const w = (RU1 - RU0) / COLS; return [RU0 + c * w + .004, RU0 + (c + 1) * w - .004]; };
  const PILE = [265, GROUND], BOOM = [170, 690], TIP_Y = 135;
  const INV = { x: 1182, y0: 600, y1: 690 };
  const POLE = { x: 1520, top: 520 };
  const FLOW = [roof(RU0, .05), roof(.94, .05), [INV.x, INV.y0], [INV.x, INV.y1], [INV.x, 775], [POLE.x, 775], [POLE.x, POLE.top + 20]];
  const FLOW_LEN = []; let flowTotal = 0;
  FLOW.forEach((p, i) => { if (i) { flowTotal += Math.hypot(p[0] - FLOW[i - 1][0], p[1] - FLOW[i - 1][1]); } FLOW_LEN.push(flowTotal); });
  const flowAt = d => {
    d = clamp(d, 0, flowTotal);
    for (let i = 1; i < FLOW.length; i++) if (d <= FLOW_LEN[i]) { const k = (d - FLOW_LEN[i - 1]) / (FLOW_LEN[i] - FLOW_LEN[i - 1] || 1); return [lerp(FLOW[i - 1][0], FLOW[i][0], k), lerp(FLOW[i - 1][1], FLOW[i][1], k)]; }
    return FLOW[FLOW.length - 1];
  };

  /* roof row k: a pallet is hoisted from the pile, lowered on the row, then panels are fixed one by one */
  const liftStart = k => LIFT0 + k * LIFT_GAP;
  const panelStart = (r, c) => liftStart(r) + 1.1 + c * .08;
  const rowTarget = r => { const v = rowV(r); const p = roof(RU0 + .05, (v[0] + v[1]) / 2); return p; };

  /* ---------- DOM ---------- */
  let ov, cv, ctx, r3 = null, capN, capT, capS, steps, skipBtn, W = 0, H = 0, DPR = 1, S = 1, OX = 0, OY = 0;
  let raf = 0, t0 = 0, t = 0, running = false, revealed = false, onReveal = null, stageIdx = -1, logoOn = false;

  function build() {
    if (ov) return;
    ov = document.createElement('div'); ov.className = 'pintro'; ov.hidden = true; ov.setAttribute('role', 'img'); ov.setAttribute('aria-label', 'Animasi pemasangan PLTS di pabrik, diakhiri logo PT Hexa Multi Energi');
    ov.innerHTML =
      '<canvas aria-hidden="true"></canvas>' +
      '<div class="pi-cap" aria-hidden="true"><span class="n">1</span><span><small>Pemasangan PLTS atap pabrik</small><b></b></span></div>' +
      '<div class="pi-steps" aria-hidden="true"></div>' +
      '<div class="pi-logo" aria-hidden="true">' +
      '<div class="pi-mark"><svg viewBox="0 0 200 200" class="pi-ring"><polygon points="100,6 181,53 181,147 100,194 19,147 19,53"/></svg><svg viewBox="0 0 200 200" class="pi-ring r2"><polygon points="100,6 181,53 181,147 100,194 19,147 19,53"/></svg><img src="img/hme-logo.webp" alt="" width="360" height="360"></div>' +
      '<h2 class="pi-name">PT Hexa <em>Multi Energi</em></h2><p class="pi-tag">Clean energy for a better future</p></div>' +
      '<button type="button" class="pi-skip">Lewati <span aria-hidden="true">›</span></button>';
    document.body.appendChild(ov);
    cv = ov.querySelector('canvas');
    /* real-time 3D when WebGL is available, otherwise the flat 2D version below */
    r3 = window.HMEIntro3D ? window.HMEIntro3D.create(cv, ov, Object.assign({}, T3, { LOGO_AT: MON3[1], PRE: PRE3, SW: SW3, MON: MON3 })) : null;
    if (!r3) { const c2 = document.createElement('canvas'); c2.setAttribute('aria-hidden', 'true'); cv.replaceWith(c2); cv = c2; ctx = cv.getContext('2d'); }
    if (r3) {
      PRE = PRE3; LOGO_AT = PRE + MON3[1]; REVEAL_AT = LOGO_AT + 3.8; END_AT = REVEAL_AT + .8;
      STAGES = [{ a: 0, t: 'Operator menerbangkan drone DJI Mini 4K' }, { a: SW3, t: 'Survei udara · drone POV' }].concat([
        { a: T3.SURVEY[0], t: 'Survei & desain atap' }, { a: T3.RAILS[0], t: 'Pemasangan rangka & rail' }, { a: T3.LIFT0, t: 'Pemasangan panel surya serentak' },
        { a: T3.WALK[0], t: 'Walkway, pipa cleaning & safety line' }, { a: T3.CABLE[0], t: 'Kabel DC & inverter' }, { a: T3.COMM[0], t: 'Commissioning · PLTS menyala' }
      ].map(s => ({ a: s.a + PRE, t: s.t })), [{ a: PRE + MON3[0], t: 'Monitoring dari HP' }]);
    }
    ov.querySelector('.pi-steps').innerHTML = STAGES.map(s => '<i title="' + s.t + '"></i>').join('');
    capN = ov.querySelector('.pi-cap .n'); capT = ov.querySelector('.pi-cap b'); capS = ov.querySelector('.pi-cap'); steps = [...ov.querySelectorAll('.pi-steps i')];
    skipBtn = ov.querySelector('.pi-skip');
    skipBtn.addEventListener('click', e => { e.stopPropagation(); skip(); });
    ov.addEventListener('click', skip);
    addEventListener('resize', () => { if (running) size(); });
  }

  function size() {
    const r = ov.getBoundingClientRect(); W = r.width; H = r.height; DPR = Math.min(r3 ? 1.5 : 2, devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    S = Math.min(W / VW, H / VH); OX = (W - VW * S) / 2; OY = (H - VH * S) / 2;
  }

  /* ---------- drawing helpers ---------- */
  const poly = pts => { ctx.beginPath(); pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); ctx.closePath(); };
  const cell = (u0, u1, v0, v1, k = 1) => {
    const cu = (u0 + u1) / 2, cvv = (v0 + v1) / 2, hu = (u1 - u0) / 2 * k, hv = (v1 - v0) / 2 * k;
    return [roof(cu - hu, cvv - hv), roof(cu + hu, cvv - hv), roof(cu + hu, cvv + hv), roof(cu - hu, cvv + hv)];
  };

  function worker(x, y, sc, ph, arm, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
    const sw = Math.sin(ph) * 5;
    ctx.strokeStyle = '#1d2f45'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-3 - sw, 0); ctx.moveTo(3, -16); ctx.lineTo(3 + sw, 0); ctx.stroke();
    ctx.fillStyle = '#ff7a1a'; ctx.fillRect(-7, -34, 14, 20);
    ctx.fillStyle = '#ffe36b'; ctx.fillRect(-7, -27, 14, 3);
    ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-7, -31); ctx.lineTo(-11, -31 + (arm ? -14 * arm : 12)); ctx.moveTo(7, -31); ctx.lineTo(11, -31 + (arm ? -10 * arm : 12)); ctx.stroke();
    ctx.fillStyle = '#e8b48a'; ctx.beginPath(); ctx.arc(0, -41, 6, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fdb813'; ctx.beginPath(); ctx.arc(0, -43, 7, Math.PI, 0); ctx.fill(); ctx.fillRect(-8, -44, 16, 3);
    ctx.restore();
  }

  function drawPanel(u0, u1, v0, v1, k, energy, glare) {
    const q = cell(u0, u1, v0, v1, k);
    poly(q);
    const g = ctx.createLinearGradient(q[3][0], q[3][1], q[1][0], q[1][1]);
    g.addColorStop(0, mix([14, 44, 92], [24, 96, 178], energy)); g.addColorStop(1, mix([8, 28, 66], [14, 66, 140], energy));
    ctx.fillStyle = g; ctx.fill();
    /* cells */
    ctx.strokeStyle = 'rgba(160,200,245,.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 6; i++) { const a = roof(lerp(u0, u1, i / 6), v0), b = roof(lerp(u0, u1, i / 6), v1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    for (let j = 1; j < 3; j++) { const a = roof(u0, lerp(v0, v1, j / 3)), b = roof(u1, lerp(v0, v1, j / 3)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    ctx.strokeStyle = '#cfd9e3'; ctx.lineWidth = 2; poly(q); ctx.stroke();
    if (glare > 0) { poly(q); ctx.fillStyle = 'rgba(255,236,170,' + (glare * .5).toFixed(3) + ')'; ctx.fill(); }
    return q;
  }

  /* ---------- scene ---------- */
  function frame(ts) {
    if (!running) return;
    t = (ts - t0) / 1000;
    if (r3) { r3.draw(t); ui(t); } else draw(t);
    if (!revealed && t >= REVEAL_AT) doReveal();
    if (t >= END_AT) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function draw(t) {
    const day = eio(seg(t, 10.6, 13.0));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* sky + ground fill the whole screen, the scene itself is letterboxed */
    const horizonY = OY + GROUND * S;
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, mix([22, 50, 84], [46, 128, 196], day)); sky.addColorStop(1, mix([246, 178, 90], [196, 226, 244], day));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(OX, OY); ctx.scale(S, S);
    ctx.beginPath(); ctx.rect(-OX / S - 4, -OY / S - 4, W / S + 8, H / S + 8); ctx.clip();

    /* sun + clouds + hills */
    const sunY = lerp(330, 175, seg(t, 0, 13)), sx = 1330;
    const sg = ctx.createRadialGradient(sx, sunY, 0, sx, sunY, 380);
    sg.addColorStop(0, 'rgba(255,224,130,' + (.85 + .1 * day).toFixed(2) + ')'); sg.addColorStop(.18, 'rgba(255,200,90,.45)'); sg.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 400, sunY - 400, 800, 800);
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(sx, sunY, 46, 0, 6.3); ctx.fill();
    [[200, 150, 1], [760, 90, .8], [1080, 210, .7]].forEach(([cx, cy, sc], i) => {
      const x = (cx + t * (6 + i * 3)) % (VW + 360) - 180; ctx.fillStyle = 'rgba(255,255,255,' + (.16 + .2 * day).toFixed(2) + ')';
      ctx.beginPath(); ctx.ellipse(x, cy, 110 * sc, 26 * sc, 0, 0, 6.3); ctx.ellipse(x - 50 * sc, cy + 8 * sc, 70 * sc, 22 * sc, 0, 0, 6.3); ctx.ellipse(x + 60 * sc, cy + 10 * sc, 76 * sc, 20 * sc, 0, 0, 6.3); ctx.fill();
    });
    ctx.fillStyle = mix([20, 58, 84], [96, 150, 150], day); ctx.beginPath(); ctx.moveTo(-200, GROUND); ctx.lineTo(-200, 690); ctx.bezierCurveTo(100, 600, 260, 650, 480, 668); ctx.bezierCurveTo(700, 690, 900, 610, 1150, 640); ctx.bezierCurveTo(1350, 662, 1550, 630, 1800, 680); ctx.lineTo(1800, GROUND); ctx.fill();
    ctx.fillStyle = mix([14, 44, 66], [70, 126, 118], day); ctx.beginPath(); ctx.moveTo(-200, GROUND); ctx.lineTo(-200, 730); ctx.bezierCurveTo(200, 690, 420, 724, 700, 716); ctx.bezierCurveTo(1000, 708, 1300, 690, 1800, 726); ctx.lineTo(1800, GROUND); ctx.fill();

    /* ground */
    ctx.fillStyle = mix([58, 70, 82], [150, 160, 168], day); ctx.fillRect(-OX / S - 4, GROUND, W / S + 8, VH - GROUND + OY / S + 8);
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(-OX / S - 4, GROUND, W / S + 8, 6);
    ctx.fillStyle = 'rgba(255,214,90,.5)'; for (let x = -40; x < VW + 80; x += 140) ctx.fillRect(x, 842, 70, 5);

    /* factory (fades in) */
    const fa = eout(seg(t, 0, 1.1));
    ctx.save(); ctx.globalAlpha = fa; ctx.translate(0, (1 - fa) * 24);
    factory(t, day);
    ctx.restore();

    if (t >= SURVEY[0] - .2) { survey(t); }
    if (t >= RAILS[0]) { rails(t); }
    panels(t, day);
    crane(t);
    if (t >= CABLE[0] - .2) { cabling(t, day); }
    if (t >= COMM[0]) { commission(t, day); }
    ctx.restore();

    /* open from black */
    const fade = 1 - eout(seg(t, 0, .8));
    if (fade > 0) { ctx.fillStyle = 'rgba(3,10,18,' + fade.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ui(t);
  }

  function factory(t, day) {
    const lit = eio(seg(t, COMM[0] + .5, COMM[0] + 1.6));
    const { x0, x1, y0, y1 } = WALL;
    /* right wall */
    poly([[x1, y0], [x1 + DX, y0 + DY], [x1 + DX, y1 + DY], [x1, y1]]);
    const rw = ctx.createLinearGradient(x1, 0, x1 + DX, 0); rw.addColorStop(0, '#9fadba'); rw.addColorStop(1, '#8a99a8'); ctx.fillStyle = rw; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 1; i < 6; i++) { const k = i / 6; ctx.moveTo(x1 + DX * k, y0 + DY * k); ctx.lineTo(x1 + DX * k, y1 + DY * k); } ctx.stroke();
    /* front wall */
    const fw = ctx.createLinearGradient(0, y0, 0, y1); fw.addColorStop(0, '#d6dfe7'); fw.addColorStop(1, '#bcc8d3'); ctx.fillStyle = fw; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(40,60,80,.11)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = x0 + 45; x < x1; x += 45) { ctx.moveTo(x, y0 + 14); ctx.lineTo(x, y1); } ctx.stroke();
    ctx.fillStyle = '#104674'; ctx.fillRect(x0, y0 + 12, x1 - x0, 10);
    ctx.fillStyle = '#f59a1b'; ctx.fillRect(x0, y0 + 22, x1 - x0, 4);
    /* roller door */
    ctx.fillStyle = '#5d6c7b'; ctx.fillRect(420, 600, 190, 160);
    ctx.strokeStyle = '#7d8c9a'; ctx.lineWidth = 2; ctx.beginPath(); for (let y = 612; y < 760; y += 14) { ctx.moveTo(420, y); ctx.lineTo(610, y); } ctx.stroke();
    ctx.fillStyle = '#3f4d5a'; ctx.fillRect(412, 592, 206, 10);
    /* windows */
    for (let i = 0; i < 8; i++) {
      const wx = 360 + i * 95;
      ctx.fillStyle = mix([84, 118, 150], [255, 224, 130], lit); ctx.fillRect(wx, 505, 70, 36);
      ctx.strokeStyle = '#eef3f7'; ctx.lineWidth = 3; ctx.strokeRect(wx, 505, 70, 36);
      if (lit > 0) { const g = ctx.createRadialGradient(wx + 35, 523, 0, wx + 35, 523, 70); g.addColorStop(0, 'rgba(255,214,110,' + (.5 * lit).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,214,110,0)'); ctx.fillStyle = g; ctx.fillRect(wx - 40, 480, 150, 90); }
    }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x0, y1 - 6, x1 - x0, 6);
    /* roof plane */
    poly([roof(0, 0), roof(1, 0), roof(1, 1), roof(0, 1)]);
    const rg = ctx.createLinearGradient(0, WALL.y0 + DY, 0, WALL.y0); rg.addColorStop(0, '#8795a2'); rg.addColorStop(1, '#a3afbb'); ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = 'rgba(30,45,60,.16)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 1; i < 60; i++) { const a = roof(i / 60, 0), b = roof(i / 60, 1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    ctx.strokeStyle = '#eef3f7'; ctx.lineWidth = 4; poly([roof(0, 0), roof(1, 0), roof(1, 1), roof(0, 1)]); ctx.stroke();
    /* grid pole */
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(POLE.x - 5, POLE.top, 10, GROUND + 28 - POLE.top);
    ctx.fillRect(POLE.x - 44, POLE.top + 6, 88, 7);
    ctx.strokeStyle = 'rgba(20,30,40,.7)'; ctx.lineWidth = 2; ctx.beginPath(); [-38, 0, 38].forEach(o => { ctx.moveTo(POLE.x + o, POLE.top + 8); ctx.lineTo(POLE.x + o + 180, POLE.top - 40 + o * .2); ctx.moveTo(POLE.x + o, POLE.top + 8); ctx.lineTo(POLE.x + o - 120, POLE.top - 6 + o * .1); }); ctx.stroke();
  }

  function survey(t) {
    const k = seg(t, SURVEY[0], SURVEY[1]), fadeOut = 1 - seg(t, SURVEY[1], SURVEY[1] + .6);
    if (fadeOut <= 0) return;
    ctx.save(); ctx.globalAlpha = fadeOut; ctx.lineCap = 'round';
    /* drone sweeps the roof */
    const u = eio(k), v = .5 + .22 * Math.sin(k * 9);
    const dp = roof(lerp(-.05, 1.05, u), v), dx = dp[0], dy = dp[1] - 92 + Math.sin(t * 2) * 2;
    const beam = ctx.createLinearGradient(0, dy, 0, dp[1]); beam.addColorStop(0, 'rgba(111,227,255,.55)'); beam.addColorStop(1, 'rgba(111,227,255,.05)');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(dx - 3, dy + 6); ctx.lineTo(dx + 3, dy + 6); ctx.lineTo(dx + 70, dp[1] + 8); ctx.lineTo(dx - 70, dp[1] + 8); ctx.fill();
    ctx.fillStyle = '#1b2c3d'; ctx.fillRect(dx - 16, dy - 4, 32, 10);
    ctx.strokeStyle = '#1b2c3d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx - 34, dy - 8); ctx.lineTo(dx - 8, dy - 4); ctx.moveTo(dx + 34, dy - 8); ctx.lineTo(dx + 8, dy - 4); ctx.stroke();
    ctx.fillStyle = '#6fe3ff'; [-34, 34].forEach(o => { ctx.beginPath(); ctx.ellipse(dx + o, dy - 10, 14, 3, 0, 0, 6.3); ctx.fill(); });
    ctx.fillStyle = '#fdb813'; ctx.beginPath(); ctx.arc(dx, dy + 8, 3, 0, 6.3); ctx.fill();
    /* scanned area outline + measurement lines */
    ctx.strokeStyle = 'rgba(111,227,255,.95)'; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
    const edge = [roof(0, 0), roof(1, 0), roof(1, 1), roof(0, 1), roof(0, 0)];
    const total = 3 * 900 + 2 * 250, drawn = total * eout(seg(k, .12, .85)); let acc = 0;
    ctx.beginPath(); ctx.moveTo(edge[0][0], edge[0][1]);
    for (let i = 1; i < edge.length && acc < drawn; i++) { const l = Math.hypot(edge[i][0] - edge[i - 1][0], edge[i][1] - edge[i - 1][1]), f = clamp((drawn - acc) / l, 0, 1); ctx.lineTo(lerp(edge[i - 1][0], edge[i][0], f), lerp(edge[i - 1][1], edge[i][1], f)); acc += l; }
    ctx.stroke(); ctx.setLineDash([]);
    const dim = (a, b, p) => { if (p <= 0) return; ctx.strokeStyle = '#ffe08a'; ctx.fillStyle = '#ffe08a'; ctx.lineWidth = 3; const bx = lerp(a[0], b[0], p), by = lerp(a[1], b[1], p);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(bx, by); ctx.stroke();
      [a, [bx, by]].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 6, 0, 6.3); ctx.fill(); }); };
    dim([roof(0, 1)[0], roof(0, 1)[1] - 28], [roof(1, 1)[0], roof(1, 1)[1] - 28], eout(seg(k, .3, .75)));
    dim([roof(1, 0)[0] + 30, roof(1, 0)[1] + 4], [roof(1, 1)[0] + 30, roof(1, 1)[1] + 4], eout(seg(k, .55, .95)));
    ctx.restore();
  }

  function rails(t) {
    ctx.save(); ctx.lineCap = 'round';
    for (let r = 0; r < ROWS; r++) {
      const [v0, v1] = rowV(r);
      [v0 + .04, v1 - .04].forEach((v, j) => {
        const k = eout(seg(t, RAILS[0] + r * .28 + j * .1, RAILS[0] + r * .28 + j * .1 + .7)); if (k <= 0) return;
        const a = roof(RU0 - .01, v), b = roof(lerp(RU0 - .01, RU1 + .01, k), v);
        ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a[0], a[1] + 2); ctx.lineTo(b[0], b[1] + 2); ctx.stroke();
        ctx.strokeStyle = '#dbe3ea'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        for (let i = 0; i <= 10; i++) { const uu = lerp(RU0, RU1, i / 10); if ((uu - RU0) / (RU1 - RU0) > k) break; const p = roof(uu, v); ctx.fillStyle = '#f59a1b'; ctx.fillRect(p[0] - 3, p[1] - 5, 6, 8); }
      });
    }
    /* a worker walks along the front edge fixing brackets */
    const wk = seg(t, RAILS[0], RAILS[1] + .3);
    if (wk > 0 && wk < 1) { const p = roof(lerp(RU0, RU1, eio(wk)), .06); worker(p[0], p[1] + 14, 1.15, t * 10, 0); }
    ctx.restore();
  }

  function panels(t, day) {
    const energy = day, sweep = ((t - COMM[0]) * .75) % 2.2;
    for (let r = 0; r < ROWS; r++) {
      const [v0, v1] = rowV(r);
      for (let c = 0; c < COLS; c++) {
        const st = panelStart(r, c), k = seg(t, st, st + .32);
        if (k <= 0) continue;
        const sc = lerp(.55, 1, Math.min(1.12, back(k))); const [u0, u1] = colU(c);
        ctx.save(); ctx.globalAlpha = Math.min(1, k * 2.2);
        const gl = t > COMM[0] ? clamp(1 - Math.abs((u0 * 1.4 + (v0 + v1) * .3) - sweep + .4) * 3.4, 0, 1) * day : 0;
        drawPanel(u0, u1, v0, v1, sc, energy, gl);
        ctx.restore();
        if (k < 1) { const q = cell(u0, u1, v0, v1, 1.08); ctx.save(); ctx.globalAlpha = (1 - k) * .9; ctx.strokeStyle = '#fdb813'; ctx.lineWidth = 3; poly(q); ctx.stroke(); ctx.restore(); }
      }
    }
    /* installer works along the row currently being fixed */
    for (let r = 0; r < ROWS; r++) {
      const a = panelStart(r, 0) - .1, b = panelStart(r, COLS - 1) + .4;
      if (t > a && t < b + .5) {
        const k = clamp((t - a) / (b - a), 0, 1), [v0] = rowV(r), p = roof(lerp(RU0 + .02, RU1 - .1, k), v0 + .02);
        worker(p[0], p[1] + 10, 1.2, t * 9, Math.max(0, Math.sin(t * 12)) * (k < 1 ? 1 : 0));
        if (r === 0 || r === 1) { const p2 = roof(lerp(RU0 + .1, RU1 - .02, k), v0 + .02); if (r === 1) worker(p2[0], p2[1] + 10, 1.2, t * 9 + 2, Math.max(0, Math.sin(t * 12 + 1)) * (k < 1 ? 1 : 0)); }
      }
    }
  }

  const stackBase = k => GROUND - 6 - (ROWS - 1 - k) * 15;
  function crane(t) {
    /* hook position and load state */
    const idleOf = k => [PILE[0] + 10, stackBase(Math.min(k, ROWS - 1)) - 50];
    let H = idleOf(0), load = false, rowK = -1;
    for (let k = 0; k < ROWS; k++) {
      const s = liftStart(k), idle = idleOf(k), nxt = idleOf(k + 1), tgt = rowTarget(k), above = [tgt[0] + 20, tgt[1] - 150], down = [tgt[0] + 20, tgt[1] - 26];
      if (t >= s && t < s + .4) { const q = eio(seg(t, s, s + .4)); H = [lerp(idle[0], idle[0] + 10, q), lerp(idle[1], TIP_Y + 150, q)]; load = true; rowK = k; }
      else if (t >= s + .4 && t < s + .85) { const q = eio(seg(t, s + .4, s + .85)); H = [lerp(idle[0] + 10, above[0], q), lerp(TIP_Y + 150, above[1], q)]; load = true; rowK = k; }
      else if (t >= s + .85 && t < s + 1.1) { const q = eio(seg(t, s + .85, s + 1.1)); H = [above[0], lerp(above[1], down[1], q)]; load = true; rowK = k; }
      else if (t >= s + 1.1 && t < s + LIFT_GAP) { const q = eio(seg(t, s + 1.1, s + LIFT_GAP)); H = [lerp(down[0], nxt[0], q), lerp(down[1], nxt[1], q)]; }
      else if (t >= s + LIFT_GAP && k === ROWS - 1) H = nxt;
    }
    const tipX = H[0], tipY = TIP_Y;
    /* pallets still waiting on the ground */
    for (let k = 0; k < ROWS; k++) if (t < liftStart(k)) pallet(PILE[0], stackBase(k) + 8, 1);
    /* crane truck */
    ctx.save();
    ctx.fillStyle = '#2a3a4a'; [[60, 752], [200, 752]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 17, 0, 6.3); ctx.fill(); ctx.fillStyle = '#9fb0c0'; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 6.3); ctx.fill(); ctx.fillStyle = '#2a3a4a'; });
    ctx.fillStyle = '#f2b01e'; ctx.fillRect(20, 722, 230, 26); ctx.fillStyle = '#d99a10'; ctx.fillRect(20, 742, 230, 6);
    ctx.fillStyle = '#f2b01e'; ctx.fillRect(20, 684, 66, 40); ctx.fillStyle = '#9fd6ef'; ctx.fillRect(26, 690, 36, 20);
    ctx.fillStyle = '#e0a012'; ctx.fillRect(150, 700, 52, 24);
    /* boom */
    ctx.strokeStyle = '#a97908'; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(BOOM[0], BOOM[1]); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = '#f2b01e'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(BOOM[0], BOOM[1]); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.fillStyle = '#3a4a5a'; ctx.beginPath(); ctx.arc(BOOM[0], BOOM[1], 9, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(tipX, tipY, 8, 0, 6.3); ctx.fill();
    /* cable, hook, load */
    ctx.strokeStyle = '#26323f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(H[0], H[1]); ctx.stroke();
    ctx.fillStyle = '#26323f'; ctx.fillRect(H[0] - 5, H[1], 10, 9);
    if (load) {
      const bx = H[0], by = H[1] + 46; ctx.strokeStyle = '#26323f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(H[0], H[1] + 8); ctx.lineTo(bx - 54, by - 4); ctx.moveTo(H[0], H[1] + 8); ctx.lineTo(bx + 54, by - 4); ctx.stroke();
      if (t < liftStart(rowK) + 1.1) pallet(bx, by + 4, 1);
    }
    ctx.restore();
    /* ground crew member signalling the lift */
    worker(318, GROUND + 18, 1.1, t * 3, Math.abs(Math.sin(t * 4)) * (t > LIFT0 - .5 && t < liftStart(ROWS - 1) + 1.5 ? 1 : 0));
  }

  function pallet(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#7b5a36'; ctx.fillRect(-56, 2, 112, 6);
    const g = ctx.createLinearGradient(-54, -14, 54, 0); g.addColorStop(0, '#1a4a8c'); g.addColorStop(1, '#0c2b5c');
    ctx.fillStyle = g; ctx.fillRect(-54, -14, 108, 16);
    ctx.strokeStyle = '#cfd9e3'; ctx.lineWidth = 2; ctx.strokeRect(-54, -14, 108, 16);
    ctx.strokeStyle = 'rgba(160,200,245,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -36; i < 54; i += 18) { ctx.moveTo(i, -14); ctx.lineTo(i, 2); } ctx.stroke();
    ctx.restore();
  }

  function cabling(t, day) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const k = eout(seg(t, CABLE[0], CABLE[1]));
    /* tray along the front edge of the array -> down the wall -> inverter */
    const a = roof(RU0, .05), b = roof(.94, .05), tray = clamp(k / .5, 0, 1), down = clamp((k - .5) / .5, 0, 1);
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(a[0], a[1] + 2); ctx.lineTo(lerp(a[0], b[0], tray), lerp(a[1], b[1], tray) + 2); ctx.stroke();
    ctx.strokeStyle = '#e2e8ee'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], tray), lerp(a[1], b[1], tray)); ctx.stroke();
    ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a[0], a[1] - 1); ctx.lineTo(lerp(a[0], b[0], tray), lerp(a[1], b[1], tray) - 1); ctx.stroke();
    if (down > 0) { ctx.strokeStyle = '#26323f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(INV.x, lerp(b[1], INV.y0, down)); ctx.stroke(); }
    /* inverter box */
    const ik = back(seg(t, CABLE[0] + .5, CABLE[0] + 1.0));
    if (ik > 0) {
      ctx.save(); ctx.translate(INV.x, (INV.y0 + INV.y1) / 2); ctx.scale(Math.min(1.1, ik), Math.min(1.1, ik));
      ctx.fillStyle = '#f4f7fa'; ctx.fillRect(-32, -45, 64, 90); ctx.strokeStyle = '#8fa1b3'; ctx.lineWidth = 2.5; ctx.strokeRect(-32, -45, 64, 90);
      ctx.fillStyle = '#104674'; ctx.fillRect(-32, -45, 64, 18); ctx.fillStyle = '#fdb813'; ctx.font = '800 12px Figtree,Segoe UI,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('INVERTER', 0, -32);
      const on = t > COMM[0] + .15; ctx.fillStyle = on ? '#43e08a' : '#c4ced8'; ctx.beginPath(); ctx.arc(0, -4, 6, 0, 6.3); ctx.fill();
      if (on) { const g = ctx.createRadialGradient(0, -4, 0, 0, -4, 24); g.addColorStop(0, 'rgba(67,224,138,.6)'); g.addColorStop(1, 'rgba(67,224,138,0)'); ctx.fillStyle = g; ctx.fillRect(-26, -30, 52, 52); }
      ctx.fillStyle = '#c4ced8'; for (let i = 0; i < 4; i++) ctx.fillRect(-20, 14 + i * 6, 40, 2.5);
      ctx.restore();
    }
    /* AC line to the grid pole */
    const ak = eout(seg(t, CABLE[0] + .7, CABLE[1] + .1));
    if (ak > 0) {
      ctx.strokeStyle = '#26323f'; ctx.lineWidth = 4; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(INV.x, INV.y1);
      const pts = [[INV.x, 775], [POLE.x, 775], [POLE.x, POLE.top + 20]]; let total = 0; pts.forEach((p, i) => { total += Math.hypot(p[0] - (i ? pts[i - 1][0] : INV.x), p[1] - (i ? pts[i - 1][1] : INV.y1)); });
      let drawn = total * ak, px = INV.x, py = INV.y1;
      for (const p of pts) { const l = Math.hypot(p[0] - px, p[1] - py), f = clamp(drawn / l, 0, 1); ctx.lineTo(lerp(px, p[0], f), lerp(py, p[1], f)); drawn -= l; px = p[0]; py = p[1]; if (drawn <= 0) break; }
      ctx.stroke();
    }
    ctx.restore();
  }

  function commission(t, day) {
    const k = seg(t, COMM[0], COMM[0] + 1.2), n = 26, speed = 340;
    /* sun beams on the array */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[.25, .2], [.5, .55], [.78, .85]].forEach(([u, v], i) => {
      const p = roof(u, v), pulse = .6 + .4 * Math.sin(t * 2 + i * 2), g = ctx.createLinearGradient(1330, 175, p[0], p[1]);
      g.addColorStop(0, 'rgba(255,224,130,' + (.2 * k * pulse).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,224,130,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(1330 - 24, 175 + 24); ctx.lineTo(1330 + 24, 175 - 24); ctx.lineTo(p[0] + 90, p[1] + 20); ctx.lineTo(p[0] - 90, p[1] - 20); ctx.fill();
    });
    /* energy flowing panels -> inverter -> grid */
    for (let i = 0; i < n; i++) {
      const d = ((t * speed + i * flowTotal / n) % flowTotal), p = flowAt(d), a = k * (.5 + .5 * Math.sin(t * 6 + i));
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 20); g.addColorStop(0, 'rgba(255,236,150,' + (.95 * a).toFixed(2) + ')'); g.addColorStop(1, 'rgba(253,184,19,0)');
      ctx.fillStyle = g; ctx.fillRect(p[0] - 20, p[1] - 20, 40, 40);
    }
    ctx.restore();
    /* status pill */
    const pk = eout(seg(t, COMM[0] + .3, COMM[0] + .9));
    if (pk > 0) {
      ctx.save(); ctx.globalAlpha = pk; ctx.translate(820, 222 - (1 - pk) * 16);
      ctx.fillStyle = 'rgba(7,28,48,.88)'; const w = 214, h = 38; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 19) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill();
      ctx.strokeStyle = 'rgba(253,184,19,.8)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#43e08a'; ctx.beginPath(); ctx.arc(-w / 2 + 24, 0, 6, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 16px Figtree,Segoe UI,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('PLTS aktif · energi bersih', -w / 2 + 40, 1);
      ctx.restore();
    }
  }

  /* ---------- DOM state driven by the timeline ---------- */
  function ui(t) {
    let idx = -1; STAGES.forEach((s, i) => { if (t >= s.a) idx = i; });
    if (idx !== stageIdx) {
      stageIdx = idx;
      if (idx >= 0) { capN.textContent = idx + 1; capT.textContent = STAGES[idx].t; capS.classList.remove('swap'); void capS.offsetWidth; capS.classList.add('swap'); }
      steps.forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('done', i < idx); });
    }
    if (!logoOn && t >= LOGO_AT) { logoOn = true; ov.classList.add('logo'); steps.forEach(s => s.classList.add('done')); steps.forEach(s => s.classList.remove('on')); }
  }

  /* ---------- control ---------- */
  function doReveal() {
    if (revealed) return; revealed = true; ov.classList.add('out');
    const cb = onReveal; onReveal = null; if (cb) cb();
  }
  function finish() {
    running = false; cancelAnimationFrame(raf);
    if (!revealed) doReveal();
    setTimeout(() => { if (!running && ov) { ov.hidden = true; ov.classList.remove('out', 'logo'); } }, 100);
  }
  function play(reveal) {
    /* the opening only runs together with the PT Hexa Multi Energi watermark (wm.js) */
    if (!window.HMEWM || !window.HMEWM.ensure()) { if (reveal) reveal(); return; }
    build(); onReveal = reveal || null; revealed = false; stageIdx = -1; logoOn = false;
    ov.classList.remove('out', 'logo'); ov.hidden = false; size();
    running = true; cancelAnimationFrame(raf);
    raf = requestAnimationFrame(ts => { t0 = ts - (reduce ? (LOGO_AT - .2) * 1000 : 0); frame(ts); });
  }
  /* skip: jump straight to the first slide */
  function skip() {
    if (!running) return;
    running = false; cancelAnimationFrame(raf);
    doReveal();
    setTimeout(() => { if (ov && !running) { ov.hidden = true; ov.classList.remove('out', 'logo'); } }, 750);
  }
  /* cancel: leave presentation mode, no reveal callback */
  function cancel() {
    onReveal = null; running = false; cancelAnimationFrame(raf);
    if (ov) { ov.hidden = true; ov.classList.remove('out', 'logo'); }
  }

  window.HMEIntro = { play, skip, cancel, get active() { return running; } };
})();
