/* Scene3D: small real-time 3D engine on Canvas 2D (no external library).
   Orbit camera, depth-sorted lit polygons, planar shadows, decals, 3D energy-flow particles, clickable parts. */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const css = (c, a = 1) => `rgba(${c[0] < 0 ? 0 : c[0] > 255 ? 255 : c[0] | 0},${c[1] < 0 ? 0 : c[1] > 255 ? 255 : c[1] | 0},${c[2] < 0 ? 0 : c[2] > 255 ? 255 : c[2] | 0},${a})`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- state coming from the simulator ---------------- */
  const S = {
    hour: 12, day: 1, cloudy: false, mode: 'ongrid', served: true, pv: 0, load: 0, soc: .5, hasBat: false, isOut: false,
    skyTop: '#2f78cf', skyBot: '#c4e6ff', invTxt: '0.0', invOk: true, led: [1, 0, 0], meterTxt: '0.0', meterCol: '#6fe3ff', batLed: 3, batCol: '#58f08c',
    gridLive: true, flows: {}, part: null, labelVals: {}
  };
  let env = {};
  /* weather progress: 0 = clear, 1 = full storm. Overcast builds first, then rain, then lightning (and the reverse when it clears) */
  const WX = { v: 0, ov: 0, rain: 0, storm: false, cloudT: 0 };
  const sstep = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  function stepWeather(dt) {
    const tg = S.cloudy ? 1 : 0;
    if (reduce) WX.v = tg; else WX.v += Math.max(-dt / 5, Math.min(dt / 9, tg - WX.v));
    WX.ov = sstep(WX.v / .55); WX.rain = sstep((WX.v - .42) / .36); WX.storm = WX.v > .85 && S.cloudy;
    WX.cloudT += dt * (1 + 3 * Math.sin(Math.PI * Math.min(1, Math.max(0, WX.v))));
  }
  function computeEnv() {
    const h = S.hour, a = Math.PI * (h - 6) / 12, el = Math.max(0, Math.sin(a)), day = S.day;
    env.sunElev = el;
    env.L = day > .08 ? norm([-Math.cos(a) * .85, .22 + el * .95, .5]) : norm([.5, .75, .45]);
    env.sunI = day * (1 - .7 * WX.ov) * .8;
    env.sunC = mixc([1, .56, .3], [1, .97, .9], clamp(el * 1.8, 0, 1));
    env.amb = mixc([.075, .1, .17], [.5, .58, .7], day); env.amb = mixc(env.amb, [.6, .64, .7], .35 * day * WX.ov);
    env.lamp = S.served ? .92 : .05;
    env.top = mixc(hex(S.skyTop), hex('#2e3744'), .78 * day * WX.ov); env.bot = mixc(hex(S.skyBot), hex('#66727f'), .75 * day * WX.ov); env.topS = css(env.top); env.botS = css(env.bot);
    env.night = 1 - day;
  }

  /* ---------------- geometry builders ---------------- */
  let SID = 0;
  function mkFace(pts, base, o) {
    const n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    let c = [0, 0, 0]; pts.forEach(p => c = add(c, p)); c = mul(c, 1 / pts.length);
    return Object.assign({ pts, base, n, c, sid: 0, part: null, dbl: false, lines: null, decals: null, kind: 'lit', layer: 3 }, o || {});
  }
  function bboxCenter(fs) {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    fs.forEach(f => f.pts.forEach(p => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); } }));
    return [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  }
  function solid(faces, o) {
    const sid = ++SID, ctr = bboxCenter(faces);
    faces.forEach(f => {
      f.sid = sid; if (dot(f.n, sub(f.c, ctr)) < 0) { f.pts.reverse(); f.n = mul(f.n, -1); }
      if (o) Object.assign(f, o);
    });
    return { faces, ctr, sid };
  }
  function boxPts(x0, x1, y0, y1, z0, z1) {
    return [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]];
  }
  const SIDES = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  function rotY(p, c, a) { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], z = p[2] - c[2]; return [c[0] + x * co + z * s, p[1], c[2] - x * s + z * co]; }
  function box(cx, cy, cz, w, h, d, base, o) {
    o = o || {}; const yaw = o.yaw || 0, c = [cx, cy, cz];
    const fs = boxPts(cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, cz - d / 2, cz + d / 2).map((pts, i) => {
      const f = mkFace(yaw ? pts.map(p => rotY(p, c, yaw)) : pts, base, { side: SIDES[i] });
      if (yaw) { f.n = norm(cross(sub(f.pts[1], f.pts[0]), sub(f.pts[2], f.pts[0]))); }
      return f;
    });
    const s = solid(fs, o.f); s.yaw = yaw; s.c = c; s.dim = [w, h, d]; return s;
  }
  function extrude(poly, vec, base, o) {
    const n = poly.length, fs = [mkFace(poly.slice(), base), mkFace(poly.map(p => add(p, vec)), base)];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; fs.push(mkFace([poly[i], poly[j], add(poly[j], vec), add(poly[i], vec)], base)); }
    return solid(fs, o);
  }
  function prism(sides, cx, y0, cz, r, h, base, o) {
    const poly = []; for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2; poly.push([cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r]); }
    return extrude(poly, [0, h, 0], base, o);
  }
  function decal(solidObj, side, O, U, V, w, h, fn) {
    const f = solidObj.faces.find(q => q.side === side) || solidObj.faces[0];
    (f.decals = f.decals || []).push({ O, U, V, w, h, fn }); return f;
  }

  /* ---------------- palette ---------------- */
  const C = {
    grass: hex('#5a8a46'), grass2: hex('#518140'), conc: hex('#a3a9b0'), conc2: hex('#8f959c'), asphalt: hex('#3c424a'),
    wall: hex('#d3dae1'), wallD: hex('#aeb8c3'), roof: hex('#b4bcc6'), fascia: hex('#eef2f6'), floor: hex('#6a727b'), back: hex('#8a949e'),
    glass: hex('#17407f'), frame: hex('#dbe3ec'), graphite: hex('#323d4a'), white: hex('#f1f4f7'), mdp: hex('#8c98a4'),
    mach: hex('#4f86b5'), machD: hex('#3a6286'), wood: hex('#7a6650'), steel: hex('#9aa6b2'), yellow: hex('#f4b400'), crate: hex('#a98457')
  };

  /* ---------------- model ---------------- */
  let MODEL; const MODELS = {};
  const newModel = () => ({ house: [], pole: [], phone: [], wires: [], panels: [], flowsPts: {}, labels: [], shadowPts: [], extra: [] });
  const HOUSE_X = 7.0;
  const roofA = [-7.95, 5.3, 5.7], roofB = [7.95, 5.3, 5.7], roofD = [-7.95, 7.8, -5.45];
  function roofP(u, v, lift) { const e1 = sub(roofB, roofA), e2 = sub(roofD, roofA); let p = add(roofA, add(mul(e1, u), mul(e2, v))); if (lift) p = add(p, mul(roofN, lift)); return p; }
  const roofN = norm(cross(sub(roofB, roofA), sub(roofD, roofA)));

  function buildHouse() {
    MODEL = newModel(); MODELS.house = MODEL;
    const H = MODEL.house;
    // floor slab
    const slab = box(0, .15, 0, 14.9, .3, 10.2, C.conc2, { f: { layer: 0 } }); H.push(slab);
    // interior floor finish + lamp pools
    const fl = box(0, .31, 0.1, 14.0, .02, 9.5, C.floor, { f: { layer: 0 } }); H.push(fl);
    const flTop = fl.faces.find(f => f.side === 'top'); flTop.lines = [];
    for (let x = -6; x <= 6; x += 2) flTop.lines.push([[x, .33, -4.6], [x, .33, 4.9], 'rgba(0,0,0,.22)', 1]);
    for (let z = -4; z <= 4; z += 2) flTop.lines.push([[-7, .33, z], [7, .33, z], 'rgba(0,0,0,.22)', 1]);
    // yellow safety frame around machine area
    [[2.4, 7, 1.6, 1.6], [2.4, 2.4, 1.6, -4.4], [7, 7, 1.6, -4.4]].forEach(() => { });
    flTop.lines.push([[2.2, .335, 1.7], [6.8, .335, 1.7], '#f4b400', 2.4], [[2.2, .335, 1.7], [2.2, .335, -4.5], '#f4b400', 2.4]);
    [[-4.6, -3.2], [-1.6, -3.2], [1.4, -3.2], [4.4, -3.2], [-4.6, 1.6], [-1.6, 1.6], [1.4, 1.6], [4.4, 1.6]].forEach(([x, z]) => {
      (flTop.decals = flTop.decals || []).push({ O: [x - 2.2, .335, z - 2.2], U: [x + 2.2, .335, z - 2.2], V: [x - 2.2, .335, z + 2.2], w: 64, h: 64, fn: (g, w, h) => { if (env.lamp < .2) return; const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, `rgba(255,236,180,${.42 * env.lamp})`); r.addColorStop(1, 'rgba(255,236,180,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); } });
    });
    // back wall
    const back = box(0, 3.9, -4.825, 14.9, 7.2, .35, C.wall, { f: { layer: 1 } }); H.push(back);
    const bw = back.faces.find(f => f.side === 'front'); bw.lines = []; for (let x = -7; x <= 7; x += .6) bw.lines.push([[x, .3, -4.65], [x, 7.5, -4.65], 'rgba(0,0,0,.1)', 1]);
    bw.base = C.back;
    // side walls (extruded profile)
    const wallPoly = x => [[x, .3, 5.0], [x, .3, -5.0], [x, 7.5, -5.0], [x, 5.15, 5.0]];
    const left = extrude(wallPoly(-7.35), [.35, 0, 0], C.wall, { layer: 1, wall: 'L' }); H.push(left);
    const right = extrude(wallPoly(7.0), [.35, 0, 0], C.wall, { layer: 1, wall: 'R' }); H.push(right);
    [left, right].forEach(w => w.faces.forEach(f => {
      if (Math.abs(f.n[0]) > .9) {
        f.lines = []; const x = f.c[0];
        for (let z = -4.9; z <= 4.9; z += .6) { const y1 = lerp(5.15, 7.5, (5 - z) / 10); f.lines.push([[x, .3, z], [x, y1, z], 'rgba(0,0,0,.12)', 1]); }
      }
    }));
    // roller door + window on right wall exterior
    const doorF = right.faces.filter(f => f.n[0] > .9)[0];
    (doorF.decals = doorF.decals || []).push({ O: [7.36, 4.0, 3.9], U: [7.36, 4.0, .6], V: [7.36, .3, 3.9], w: 110, h: 124, fn: (g, w, h) => { g.fillStyle = '#c6ced6'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,70,80,.55)'; g.lineWidth = 1.5; for (let y = 6; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#6f7a86'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); } });
    (doorF.decals).push({ O: [7.36, 4.1, -1.2], U: [7.36, 4.1, -3.9], V: [7.36, 2.5, -1.2], w: 108, h: 64, fn: (g, w, h) => { const r = g.createLinearGradient(0, 0, w, h); r.addColorStop(0, '#9fd3f5'); r.addColorStop(1, '#4a86b8'); g.fillStyle = r; g.fillRect(0, 0, w, h); g.strokeStyle = '#eef2f6'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); } });
    // base plinth
    H.push(box(0, .55, 5.12, 15.6, .5, .3, C.wallD, { f: { layer: 3 } }));
    // front columns + header
    [-7.2, 7.2].forEach(x => H.push(box(x, 2.7, 4.85, .55, 4.9, .55, C.fascia, { f: { layer: 3 } })));
    const header = box(0, 5.1, 4.95, 15.6, .62, .5, C.fascia, { f: { layer: 3 } }); H.push(header);
    decal(header, 'front', [-5.2, 5.38, 5.21], [5.2, 5.38, 5.21], [-5.2, 4.82, 5.21], 640, 68, (g, w, h) => {
      g.fillStyle = '#0a3055'; g.fillRect(0, 0, w, h); g.fillStyle = '#fdb813'; g.fillRect(0, h - 5, w, 5);
      if (logoImg.complete && logoImg.naturalWidth) g.drawImage(logoImg, 12, 6, 54, 54);
      g.fillStyle = '#fff'; g.font = '700 30px Bricolage Grotesque, Figtree, system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('PT HEXA MULTI ENERGI', 80, h / 2 - 2);
      g.font = '600 18px Figtree, system-ui, sans-serif'; g.fillStyle = '#9fd0ff'; g.textAlign = 'right'; g.fillText('Solar Power Solutions', w - 16, h / 2);
    });
    // roof slab (thick) + gutter
    const rf = [roofA, roofB, [roofB[0], roofD[1], roofD[2]], roofD];
    const roofS = extrude(rf, mul(roofN, -.32), C.roof, { layer: 4 }); H.push(roofS);
    roofS.faces.forEach(f => { f.base = Math.abs(dot(f.n, roofN)) > .9 ? C.roof : C.fascia; });
    const rtop = roofS.faces.find(f => dot(f.n, roofN) > .95);
    rtop.lines = []; for (let i = 0; i <= 40; i++) { const u = i / 40; rtop.lines.push([roofP(u, 0, .01), roofP(u, 1, .01), 'rgba(70,80,92,.35)', 1]); }
    H.push(box(0, 5.12, 5.78, 15.9, .2, .22, C.steel, { f: { layer: 4 } }));
    // solar panels
    const R = 4, Cn = 12, u0 = .05, u1 = .95, v0 = .07, v1 = .93, cw = (u1 - u0) / Cn, rh = (v1 - v0) / R, gu = .006, gv = .02;
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
      const a = u0 + c * cw + gu / 2, b = a + cw - gu, p = v0 + r * rh + gv / 2, q = p + rh - gv, lift = .16;
      const top = [roofP(a, p, lift), roofP(b, p, lift), roofP(b, q, lift), roofP(a, q, lift)];
      const base = top.map(t => add(t, mul(roofN, -lift)));
      const fs = [mkFace(top, C.glass, { part: 'pv', spec: 1, dbl: false, panel: true })];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; fs.push(mkFace([base[i], base[j], top[j], top[i]], C.frame, { part: 'pv' })); }
      const s = solid(fs, { layer: 5 }); const tf = s.faces[0]; tf.lines = [];
      for (let k = 1; k < 10; k++) { const t = k / 10; tf.lines.push([add(mul(add(top[0], mul(sub(top[1], top[0]), t)), 1), [0, 0, 0]), add(top[3], mul(sub(top[2], top[3]), t)), 'rgba(150,190,240,.3)', .8]); }
      for (let k = 1; k < 6; k++) { const t = k / 6; tf.lines.push([add(top[0], mul(sub(top[3], top[0]), t)), add(top[1], mul(sub(top[2], top[1]), t)), 'rgba(150,190,240,.3)', .8]); }
      tf.lines.push([top[0], top[1], '#e9eef4', 1.4], [top[1], top[2], '#e9eef4', 1.4], [top[2], top[3], '#e9eef4', 1.4], [top[3], top[0], '#e9eef4', 1.4]);
      H.push(s);
    }
    // ---------- interior equipment (against back wall z = -4.65) ----------
    const inv = box(-4.8, 2.6, -4.4, 1.25, 1.7, .42, C.white, { f: { layer: 2, part: 'inverter' } }); H.push(inv);
    inv.faces.find(f => f.side === 'left').base = C.steel;
    decal(inv, 'front', [-5.35, 3.25, -4.185], [-4.25, 3.25, -4.185], [-5.35, 2.45, -4.185], 110, 80, (g, w, h) => {
      g.fillStyle = '#07131f'; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = S.invOk ? '#58f08c' : '#ff7a6b'; g.font = '700 38px Bricolage Grotesque, Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.invTxt, w / 2, h / 2 - 4);
      g.font = '600 12px Figtree, sans-serif'; g.fillStyle = '#9fb8cf'; g.fillText('kW AC', w / 2, h - 13);
    });
    decal(inv, 'front', [-5.35, 2.35, -4.185], [-4.25, 2.35, -4.185], [-5.35, 2.0, -4.185], 110, 36, (g, w, h) => {
      const cols = ['#58f08c', '#6fe3ff', '#ff4d3f']; for (let i = 0; i < 3; i++) { const on = S.led[i]; g.fillStyle = on ? cols[i] : '#3a4651'; g.shadowColor = on ? cols[i] : 'transparent'; g.shadowBlur = on ? 8 : 0; g.beginPath(); g.arc(24 + i * 26, h / 2, 6, 0, 7); g.fill(); }
      g.shadowBlur = 0; g.strokeStyle = '#7d8a97'; g.lineWidth = 2; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(88, h / 2 + 8, 4 + i * 5, -2.4, -.75); g.stroke(); }
    });
    const mdp = box(-2.7, 2.35, -4.42, 1.05, 2.1, .38, C.mdp, { f: { layer: 2 } }); H.push(mdp);
    decal(mdp, 'front', [-3.2, 3.3, -4.23], [-2.2, 3.3, -4.23], [-3.2, 1.45, -4.23], 100, 186, (g, w, h) => {
      for (let r = 0; r < 5; r++) { g.fillStyle = '#2b343e'; g.fillRect(8, 10 + r * 34, w - 16, 26); g.fillStyle = '#e8edf2'; for (let k = 0; k < 4; k++) g.fillRect(14 + k * 21, 16 + r * 34, 12, 12); }
      g.fillStyle = S.served ? '#58f08c' : '#ff4d3f'; g.shadowColor = g.fillStyle; g.shadowBlur = 8; g.beginPath(); g.arc(w / 2, h - 8, 4, 0, 7); g.fill(); g.shadowBlur = 0;
    });
    // battery racks
    MODEL.batteries = [];
    [0, 1, 2].forEach(i => {
      const x = .15 + i * 1.0, b = box(x, 1.5, -3.95, .88, 2.4, 1.0, C.graphite, { f: { layer: 2, part: 'battery' } }); H.push(b); MODEL.batteries.push(b);
      decal(b, 'front', [x - .4, 2.62, -3.445], [x + .4, 2.62, -3.445], [x - .4, .42, -3.445], 80, 220, (g, w, h) => {
        g.fillStyle = '#0d141b'; g.fillRect(6, 6, w - 12, 34); g.fillStyle = '#cfe3f5'; g.font = '700 22px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(S.soc * 100) + '%', w / 2, 24);
        const lit = S.batLed; for (let k = 0; k < 6; k++) { const on = k < lit; g.fillStyle = on ? S.batCol : '#25303b'; g.shadowColor = on ? S.batCol : 'transparent'; g.shadowBlur = on ? 10 : 0; g.fillRect(12, h - 28 - k * 26, w - 24, 14); }
        g.shadowBlur = 0;
      });
    });
    // ceiling lamps + tray
    MODEL.lamps = [];
    [[-4.4, -1.4], [-1.4, -1.4], [1.6, -1.4], [4.6, -1.4], [-4.4, 2.2], [-1.4, 2.2], [1.6, 2.2], [4.6, 2.2]].forEach(([x, z]) => {
      const l = box(x, 4.72, z, 1.5, .1, .28, C.white, { f: { layer: 2, kind: 'lamp' } }); H.push(l); MODEL.lamps.push(l);
      H.push(box(x - .6, 5.0, z, .03, .56, .03, C.steel, { f: { layer: 2 } }), box(x + .6, 5.0, z, .03, .56, .03, C.steel, { f: { layer: 2 } }));
    });
    H.push(box(1.7, 4.45, -4.4, 9.5, .1, .5, C.steel, { f: { layer: 2 } }));
    // machine 1 + hopper + conveyor
    const m1 = box(4.3, 1.25, -2.9, 2.6, 1.9, 1.7, C.mach, { f: { layer: 2, part: 'loads' } }); H.push(m1);
    decal(m1, 'front', [3.0, 2.15, -2.045], [5.6, 2.15, -2.045], [3.0, .4, -2.045], 260, 175, (g, w, h) => {
      g.fillStyle = '#0d1a27'; g.fillRect(14, 16, 118, 74); g.strokeStyle = '#6fe3ff'; g.lineWidth = 2.4; g.beginPath(); const t = performance.now() / 500 * (S.served ? 1 : 0); for (let x = 0; x <= 118; x += 4) { const y = 53 + Math.sin(x / 11 + t) * 18; x ? g.lineTo(14 + x, y + 0) : g.moveTo(14, y); } g.stroke();
      [['#58f08c', 0], ['#ffb703', 1], ['#6fe3ff', 2]].forEach(([c, i]) => { g.fillStyle = S.served ? c : '#334'; g.beginPath(); g.arc(28 + i * 22, 112, 6, 0, 7); g.fill(); });
      g.save(); g.translate(196, 70); g.rotate(S.served ? performance.now() / 700 : 0); g.strokeStyle = '#e4edf5'; g.lineWidth = 9; g.setLineDash([14, 9]); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = '#e4edf5'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#1a2d40'; g.fillRect(150, 128, 94, 14);
    });
    H.push(box(3.9, 2.55, -2.9, 1.1, .95, 1.0, C.machD, { f: { layer: 2, part: 'loads' } }));
    const conv = box(5.0, .55, -.2, 3.6, .5, 1.0, C.graphite, { f: { layer: 2, part: 'loads' } }); H.push(conv);
    decal(conv, 'top', [3.2, .81, -.7], [6.8, .81, -.7], [3.2, .81, .3], 360, 100, (g, w, h) => {
      g.fillStyle = '#2a323b'; g.fillRect(0, 0, w, h); g.fillStyle = '#4b5663'; const off = S.served ? (performance.now() / 18) % 36 : 0; for (let x = -36 + off; x < w; x += 36) g.fillRect(x, 0, 14, h);
      g.fillStyle = '#c9a36b'; for (let k = 0; k < 3; k++) g.fillRect(((off * 1.1 + k * 120) % (w + 40)) - 30, 28, 34, 40);
    });
    H.push(box(3.2, .55, -.2, .12, .5, 1.0, C.steel, { f: { layer: 2 } }), box(6.8, .55, -.2, .12, .5, 1.0, C.steel, { f: { layer: 2 } }));
    // fan / cabinet unit at right back
    const fan = box(6.05, 1.55, -4.05, 1.15, 2.5, 1.1, C.white, { f: { layer: 2, part: 'loads' } }); H.push(fan);
    decal(fan, 'front', [5.47, 2.6, -3.495], [6.63, 2.6, -3.495], [5.47, .5, -3.495], 116, 210, (g, w, h) => {
      g.fillStyle = '#d8dfe6'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa5b0'; g.beginPath(); g.arc(w / 2, 62, 46, 0, 7); g.fill(); g.fillStyle = '#eef2f6'; g.beginPath(); g.arc(w / 2, 62, 40, 0, 7); g.fill();
      g.save(); g.translate(w / 2, 62); g.rotate(S.served ? performance.now() / 260 : 0); g.fillStyle = '#6c7782'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(0, -20, 9, 22, 0, 0, 7); g.fill(); } g.restore();
      g.fillStyle = '#9aa5b0'; g.fillRect(14, 132, w - 28, 8); g.fillRect(14, 152, w - 28, 8); g.fillRect(14, 172, w - 28, 8);
    });
    // crates and pallets
    H.push(box(-5.2, .75, 1.6, 1.4, .9, 1.2, C.crate, { f: { layer: 2 } }), box(-3.5, .62, 2.2, 1.1, .65, 1.1, C.crate, { f: { layer: 2 } }), box(-5.0, 1.65, 1.6, 1.0, .8, .9, C.crate, { f: { layer: 2 } }));
    [[-1.6, 3.7], [1.2, 3.9]].forEach(([x, z]) => H.push(box(x, .6, z, .3, 1.0, .3, C.yellow, { f: { layer: 2 } })));

    // ---------- kWh meter on left wall ----------
    const meter = box(-7.62, 2.0, 1.6, .26, 1.0, .75, C.white, { f: { layer: 6, part: 'meter' } }); H.push(meter);
    decal(meter, 'left', [-7.76, 2.35, 1.2], [-7.76, 2.35, 2.0], [-7.76, 1.7, 1.2], 90, 56, (g, w, h) => {
      g.fillStyle = '#07131f'; g.fillRect(2, 2, w - 4, h - 4); g.fillStyle = S.meterCol; g.font = '700 28px Bricolage Grotesque, Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.meterTxt, w / 2, h / 2 + 1);
    });
    decal(meter, 'left', [-7.76, 1.62, 1.2], [-7.76, 1.62, 2.0], [-7.76, 1.5, 1.2], 90, 12, (g, w, h) => { g.fillStyle = '#c9d1d9'; g.fillRect(0, 0, w, h); });
    // conduit on wall (visual)
    MODEL.extra.push(box(-7.6, 1.0, 1.6, .1, 1.0, .1, C.steel, { f: { layer: 6 } }));

    // ---------- utility pole ----------
    const P = MODEL.pole;
    P.push(prism(7, -11.2, 0, 2.6, .24, 8.4, C.wood, { part: 'grid' }));
    P.push(box(-11.2, 7.75, 2.6, 2.8, .2, .2, hex('#5a4630'), { f: { part: 'grid' } }));
    [-12.3, -11.2, -10.1].forEach(x => P.push(prism(6, x, 7.9, 2.6, .09, .3, hex('#a8cfe0'), { part: 'grid' })));
    P.push(prism(8, -10.35, 4.9, 2.6, .55, 1.3, C.steel, { part: 'grid' }));
    P.push(box(-10.35, 6.35, 2.6, .5, .2, .5, C.graphite, { f: { part: 'grid' } }));
    MODEL.trLed = { p: [-10.0, 5.2, 2.62] };
    // wires
    const cat = (a, b, sag, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(Math.PI * t) * sag, lerp(a[2], b[2], t)]); } return pts; };
    MODEL.wires = [cat([-12.3, 8.0, 2.6], [-26, 8.2, 2.6], .5, 8), cat([-10.1, 8.0, 2.6], [-26, 8.4, 2.9], .5, 8), cat([-10.1, 8.0, 2.6], [-7.7, 2.6, 1.6], .6, 10), cat([-10.4, 8.0, 2.6], [-7.55, 2.55, 1.9], .5, 10)];
    MODEL.gridFlow = cat([-10.1, 7.95, 2.6], [-7.7, 2.6, 1.6], .6, 10).concat([[-7.7, 1.5, 1.6], [-7.6, .45, 1.6], [-5.8, .45, 1.6], [-3.1, .45, 1.6], [-3.1, .45, -4.0], [-3.1, 1.3, -4.3]]);

    // ---------- phone + monitoring ----------
    const ph = box(11.6, 2.55, 3.6, 1.55, 2.9, .16, hex('#0d1620'), { yaw: -.42, f: { part: 'monitor' } }); MODEL.phone.push(ph);
    MODEL.phone.push(box(11.6, .6, 3.55, .24, 1.2, .24, hex('#2b3a49'), { yaw: -.42, f: { part: 'monitor' } }));
    MODEL.phone.push(box(11.6, .07, 3.55, 1.3, .14, .9, hex('#1d2833'), { yaw: -.42, f: { part: 'monitor' } }));
    const yaw = -.42, pc = [11.6, 2.55, 3.6], zf = 3.6 + .085;
    const rr = p => rotY(p, pc, yaw);
    decal(ph, 'front', rr([10.9, 3.88, zf]), rr([12.3, 3.88, zf]), rr([10.9, 1.22, zf]), 140, 266, (g, w, h) => {
      g.fillStyle = '#0a1d33'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fd0ff'; g.font = '700 12px Figtree, sans-serif'; g.textAlign = 'center'; g.fillText('HME MONITOR', w / 2, 24);
      g.fillStyle = '#fff'; const pvTxt = String(Math.round(S.pv)); g.font = '800 ' + (pvTxt.length > 4 ? 30 : pvTxt.length > 3 ? 40 : 56) + 'px Bricolage Grotesque, Figtree, sans-serif'; g.fillText(pvTxt, w / 2, 90); g.fillStyle = '#9fb8cf'; g.font = '600 13px Figtree, sans-serif'; g.fillText('kW produksi surya', w / 2, 112);
      g.strokeStyle = '#ffb703'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 24; i++) { const hh = i, v = Math.max(0, Math.sin(Math.PI * (hh - 6) / 12)); const x = 12 + i / 24 * (w - 24), y = 190 - v * 56; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      const cx = 12 + S.hour / 24 * (w - 24); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 126); g.lineTo(cx, 196); g.stroke();
      g.fillStyle = '#1c3348'; g.fillRect(12, 224, w - 24, 10); if (S.hasBat) { g.fillStyle = S.batCol; g.fillRect(12, 224, (w - 24) * S.soc, 10); } g.fillStyle = '#9fb8cf'; g.font = '600 11px Figtree, sans-serif'; g.fillText(S.hasBat ? 'Baterai ' + Math.round(S.soc * 100) + '%' : 'Tanpa baterai', w / 2, 254);
    });

    // ---------- flows (paths) ----------
    MODEL.flowsPts = {
      pv: [roofP(.2, .55, .2), [-4.8, 6.9, -2.0], [-4.8, 6.6, -4.4], [-4.8, 3.5, -4.4]],
      invmdp: [[-4.15, 2.75, -4.12], [-3.2, 2.75, -4.12], [-3.2, 2.75, -4.12]],
      l1: [[-2.7, 3.4, -4.2], [-2.7, 4.35, -4.2], [-2.7, 4.35, -3.7], [4.0, 4.35, -3.7], [4.0, 3.1, -3.7], [4.0, 3.1, -2.9]],
      l2: [[4.0, 4.35, -3.7], [6.05, 4.35, -3.7], [6.05, 3.0, -3.7]],
      bat: [[-4.8, 1.8, -4.1], [-4.8, .5, -4.1], [-.4, .5, -4.1], [-.4, .9, -3.9]],
      grid: MODEL.gridFlow
    };
    MODEL.flowsPts.invmdp = [[-4.15, 2.75, -4.12], [-3.2, 2.75, -4.12]];
    // trees (billboards)
    MODEL.trees = [[18, -6, 1.1], [-16, -9, 1.45], [16, -16, 1.5], [-12, -16, 1.4], [23, 5, 1.0], [-20, 6, 1.2], [9.2, 6.6, .6], [-9.4, 6.4, .55], [8.2, -9, 1.0], [-6, -9.5, 1.2]];
    MODEL.labels = LBL_H; MODEL.presets = PRESET_H; MODEL.home = HOME_H;
    MODEL.site = {
      shadows: [
        { base: [[-7.95, 0, -5.45], [7.95, 0, -5.45], [7.95, 0, 5.7], [-7.95, 0, 5.7]], top: [[-7.95, 7.8, -5.45], [7.95, 7.8, -5.45], [7.95, 5.3, 5.7], [-7.95, 5.3, 5.7]] },
        { base: [[-11.45, 0, 2.35], [-10.95, 0, 2.85]], top: [[-11.45, 8.4, 2.35], [-10.95, 8.4, 2.85]], a: .8 }
      ],
      xMark: [-9.0, 5.3, 2.2], outLbl: [-11.2, 9.2, 2.6], wifi: [11.6, 4.5, 3.6], glare: { p: [0, 6.6, 0], r: 9 },
      centers: { house: [0, 3, 0], pole: [-11.2, 3, 2.6], phone: [11.6, 2, 3.6] }, apron: [-20, 20, 5.4, 22]
    };
  }
  /* ---------------- factory model: big production hall + two-storey technical annex (inverter room above battery room) ---------------- */
  function pvArray(out, Pfn, N, R, Cn, u0, u1, v0, v1, lift, tight, partId) {
    const cw = (u1 - u0) / Cn, rh = (v1 - v0) / R, gu = .006, gv = .02;
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
      const a = u0 + c * cw + gu / 2, b = a + cw - gu, p = v0 + r * rh + gv / 2, q = p + rh - gv;
      const top = [Pfn(a, p, lift), Pfn(b, p, lift), Pfn(b, q, lift), Pfn(a, q, lift)], base = top.map(t => add(t, mul(N, -lift)));
      const fs = [mkFace(top, C.glass, { part: partId || 'pv', spec: 1, dbl: false, panel: true })];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; fs.push(mkFace([base[i], base[j], top[j], top[i]], C.frame, { part: partId || 'pv' })); }
      const s = solid(fs, { layer: 5 }), tf = s.faces[0]; tf.lines = [];
      if (!tight) { for (let k = 1; k < 5; k++) { const t = k / 5; tf.lines.push([add(top[0], mul(sub(top[1], top[0]), t)), add(top[3], mul(sub(top[2], top[3]), t)), 'rgba(150,190,240,.3)', .8]); } }
      for (let k = 1; k < 4; k++) { const t = k / 4; tf.lines.push([add(top[0], mul(sub(top[3], top[0]), t)), add(top[1], mul(sub(top[2], top[1]), t)), 'rgba(150,190,240,.3)', .8]); }
      tf.lines.push([top[0], top[1], '#e9eef4', 1.2], [top[1], top[2], '#e9eef4', 1.2], [top[2], top[3], '#e9eef4', 1.2], [top[3], top[0], '#e9eef4', 1.2]);
      out.push(s);
    }
  }
  function buildFactory() {
    MODEL = newModel(); MODELS.factory = MODEL; const H = MODEL.house;
    const HX0 = -6, HX1 = 30, HZ0 = -18, HZ1 = 4, EAVE = 8, RZ = -7, RIDGE = EAVE + .36 * (HZ1 - RZ);      // production hall
    const AX0 = -17, AX1 = -6, AZ0 = -8, AZ1 = 4, FL2 = 4.3;                              // technical annex (2 floors)
    const hcx = (HX0 + HX1) / 2, hcz = (HZ0 + HZ1) / 2, hw = HX1 - HX0, hd = HZ1 - HZ0;
    // ---- floors ----
    H.push(box(hcx, .15, hcz, hw + .6, .3, hd + .6, C.conc2, { f: { layer: 0 } }));
    const fl = box(hcx, .31, hcz, hw, .02, hd - .2, C.floor, { f: { layer: 0 } }); H.push(fl);
    const flTop = fl.faces.find(f => f.side === 'top'); flTop.lines = [];
    for (let x = HX0 + 3; x < HX1; x += 3) flTop.lines.push([[x, .33, HZ0 + .4], [x, .33, HZ1 - .4], 'rgba(0,0,0,.2)', 1]);
    for (let z = HZ0 + 4; z < HZ1; z += 4) flTop.lines.push([[HX0 + .4, .33, z], [HX1 - .4, .33, z], 'rgba(0,0,0,.2)', 1]);
    flTop.lines.push([[HX0 + 1, .335, 2.2], [HX1 - 1, .335, 2.2], '#f4b400', 2.4], [[HX0 + 1, .335, -3.2], [HX1 - 1, .335, -3.2], '#f4b400', 1.6]);
    for (let x = 1.5; x < 30; x += 6.5) for (const z of [-13, -4]) (flTop.decals = flTop.decals || []).push({ O: [x - 3, .335, z - 3], U: [x + 3, .335, z - 3], V: [x - 3, .335, z + 3], w: 64, h: 64, fn: (g, w, h) => { if (env.lamp < .2) return; const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, `rgba(255,236,180,${.4 * env.lamp})`); r.addColorStop(1, 'rgba(255,236,180,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); } });
    H.push(box((AX0 + AX1) / 2, .15, (AZ0 + AZ1) / 2, AX1 - AX0 + .4, .3, AZ1 - AZ0 + .4, C.conc2, { f: { layer: 0 } }));
    H.push(box((AX0 + AX1) / 2, .31, (AZ0 + AZ1) / 2, AX1 - AX0 - .3, .02, AZ1 - AZ0 - .3, C.floor, { f: { layer: 0 } }));
    // ---- hall shell ----
    const back = box(hcx, 4.15, HZ0 + .175, hw + .8, 7.7, .35, C.wall, { f: { layer: 1 } }); H.push(back);
    const bw = back.faces.find(f => f.side === 'front'); bw.base = C.back; bw.lines = []; for (let x = HX0; x <= HX1; x += .75) bw.lines.push([[x, .3, HZ0 + .36], [x, 8, HZ0 + .36], 'rgba(0,0,0,.1)', 1]);
    const wallPoly = x => [[x, .3, HZ1], [x, .3, HZ0], [x, EAVE, HZ0], [x, RIDGE, RZ], [x, EAVE, HZ1]];
    const gy = z => z >= RZ ? lerp(RIDGE, EAVE, (z - RZ) / (HZ1 - RZ)) : lerp(EAVE, RIDGE, (z - HZ0) / (RZ - HZ0));
    const left = extrude(wallPoly(HX0), [.35, 0, 0], C.wall, { layer: 1, wall: 'L' }), right = extrude(wallPoly(HX1), [.35, 0, 0], C.wall, { layer: 1, wall: 'R' }); H.push(left, right);
    [left, right].forEach(w => w.faces.forEach(f => {
      if (Math.abs(f.n[0]) > .9) { f.lines = []; const x = f.c[0]; for (let z = HZ0 + .3; z <= HZ1 - .1; z += .75) f.lines.push([[x, .3, z], [x, gy(z) - .05, z], 'rgba(0,0,0,.12)', 1]); }
    }));
    const doorF = right.faces.filter(f => f.n[0] > .9)[0], xo = HX1 + .36;
    (doorF.decals = doorF.decals || []).push({ O: [xo, 5.4, 1.4], U: [xo, 5.4, -4.2], V: [xo, .3, 1.4], w: 140, h: 130, fn: (g, w, h) => { g.fillStyle = '#c6ced6'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,70,80,.55)'; g.lineWidth = 1.4; for (let y = 6; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#6f7a86'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); } });
    doorF.decals.push({ O: [xo, 6.6, -7], U: [xo, 6.6, -14], V: [xo, 4.8, -7], w: 210, h: 54, fn: (g, w, h) => { const r = g.createLinearGradient(0, 0, w, h); r.addColorStop(0, '#9fd3f5'); r.addColorStop(1, '#4a86b8'); g.fillStyle = r; g.fillRect(0, 0, w, h); g.strokeStyle = '#eef2f6'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(w * k / 4, 0); g.lineTo(w * k / 4, h); g.stroke(); } } });
    // front columns + fascia with company name
    [HX0 + .25, 0, 6, 12, 18, 24, HX1 - .25].forEach(x => H.push(box(x, 3.375, HZ1 - .15, .5, 6.15, .5, C.fascia, { f: { layer: 3 } })));
    const header = box(hcx, 6.95, HZ1 - .05, hw + .6, 1.0, .5, C.fascia, { f: { layer: 3 } }); H.push(header);
    decal(header, 'front', [1.5, 7.4, HZ1 + .21], [14.7, 7.4, HZ1 + .21], [1.5, 6.5, HZ1 + .21], 760, 52, (g, w, h) => {
      g.fillStyle = '#0a3055'; g.fillRect(0, 0, w, h); g.fillStyle = '#fdb813'; g.fillRect(0, h - 4, w, 4);
      if (logoImg.complete && logoImg.naturalWidth) g.drawImage(logoImg, 8, 3, 44, 44);
      g.fillStyle = '#fff'; g.font = '700 27px Bricolage Grotesque, Figtree, system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('PT HEXA MULTI ENERGI', 62, h / 2 - 2);
      g.font = '600 16px Figtree, system-ui, sans-serif'; g.fillStyle = '#9fd0ff'; g.textAlign = 'right'; g.fillText('Solar Power Solutions', w - 14, h / 2);
    });
    // ---- hall roof: front slope (with PV), back slope, glass clerestory along the ridge ----
    const ov = .4, zf = HZ1 + .5, zb = HZ0 - .5, slope = (RIDGE - EAVE) / (HZ1 - RZ);
    const rA = [HX0 - ov, EAVE - .5 * slope, zf], rB = [HX1 + ov, EAVE - .5 * slope, zf], rD = [HX0 - ov, RIDGE, RZ];
    const eu0 = norm(sub(rB, rA)), ev0 = norm(sub(rD, rA)), rN = norm(cross(sub(rB, rA), sub(rD, rA))), roofF = (u, v, lift) => { let p = add(rA, add(mul(sub(rB, rA), u), mul(sub(rD, rA), v))); return lift ? add(p, mul(rN, lift)) : p; };
    const roofS = extrude([rA, rB, [rB[0], RIDGE, RZ], rD], mul(rN, -.3), C.roof, { layer: 4 }); H.push(roofS);
    roofS.faces.forEach(f => { f.base = Math.abs(dot(f.n, rN)) > .9 ? C.roof : C.fascia; });
    const rtop = roofS.faces.find(f => dot(f.n, rN) > .95); rtop.lines = []; for (let i = 0; i <= 40; i++) { const u = i / 40; rtop.lines.push([roofF(u, 0, .01), roofF(u, 1, .01), 'rgba(70,80,92,.35)', 1]); }
    const bA = [HX0 - ov, RIDGE, RZ], bB = [HX1 + ov, RIDGE, RZ], bD = [HX0 - ov, EAVE - .5 * slope, zb], bN = norm(cross(sub(bB, bA), sub(bD, bA)));
    const roofB = extrude([bA, bB, [bB[0], bD[1], bD[2]], bD], mul(bN, -.3), C.roof, { layer: 4 }); H.push(roofB);
    H.push(box(hcx, EAVE - .45, HZ1 + .55, hw + 1.2, .22, .26, C.steel, { f: { layer: 4 } }));
    // PV layout on BOTH roof slopes (front + back), following the engineering plan:
    //   per slope: 4 blocks of 4 x 5 panels (left + middle columns, two bands) + one tall 9 x 5 block on the right,
    //   orange walkway (vertical main + horizontal between the bands), red water-cleaning pipe (ridge, risers, nozzles), blue safety lifeline on the edges
    const WALK = hex('#e29a1c'), RED = hex('#d6383a'), BLUE = hex('#3a6fd8');
    MODEL.nozzles = []; MODEL.lines3d = [];
    const perf = (g, w, h) => {
      g.fillStyle = '#e8a82a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6c65a'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
      g.fillStyle = '#9a6a10'; for (let y = 9; y < h - 4; y += 12) for (let x = 9; x < w - 6; x += 11) { g.beginPath(); g.ellipse(x + ((y / 12 | 0) % 2 ? 5 : 0), y, 3.6, 2.1, 0, 0, 7); g.fill(); }
    };
    const roofSide = (P, N, eu, ev) => {
      const strip = (u0, u1, v0, v1, lift, th, col, part) => { const q = [P(u0, v0, lift), P(u1, v0, lift), P(u1, v1, lift), P(u0, v1, lift)]; const so = extrude(q, mul(N, th), col, { layer: 5.5, part }); H.push(so); return so; };
      const post = (u, v, lift, hgt, w, col, part) => { const c = P(u, v, lift), a = mul(eu, w), b = mul(ev, w); const so = extrude([sub(sub(c, a), b), sub(add(c, a), b), add(add(c, a), b), add(sub(c, a), b)], mul(N, hgt), col, { layer: 5.6, part }); H.push(so); return so; };
      // panels: left + middle block columns x two bands, plus the tall block right of the main walkway
      [[.025, .335], [.355, .665]].forEach(([u0, u1]) => [[.045, .455], [.545, .955]].forEach(([v0, v1]) => pvArray(H, P, N, 4, 5, u0, u1, v0, v1, .16)));
      pvArray(H, P, N, 9, 5, .715, .975, .045, .955, .16);
      // walkways (orange perforated tray)
      const walk = (u0, u1, v0, v1, w, hh) => { const so = strip(u0, u1, v0, v1, .06, .12, WALK, 'walkway'); so.faces[1].decals = [{ O: P(u0, v1, .18), U: P(u1, v1, .18), V: P(u0, v0, .18), w, h: hh, fn: perf }]; };
      walk(.676, .704, .004, .996, 44, 600);
      walk(.025, .672, .475, .525, 900, 40);
      // water cleaning pipe (red): ridge main, riser beside the main walkway, feeder along the horizontal walkway
      strip(.02, .98, .968, .984, .06, .16, RED, 'pipe');
      strip(.667, .673, .004, .97, .06, .16, RED, 'pipe');
      strip(.025, .667, .458, .468, .06, .16, RED, 'pipe');
      const nz = (u, v, dir) => { post(u, v, .2, .4, .05, hex('#ff9a9c'), 'pipe'); MODEL.nozzles.push({ p: P(u, v, .7), v0: add(mul(ev, 3.6 * dir), mul(N, 3.4)), k: MODEL.nozzles.length }); };
      [.07, .17, .27, .37, .47, .57].forEach((u, i) => nz(u, .463, i % 2 ? 1 : -1));
      [.08, .2, .32, .44, .56, .8, .9].forEach(u => nz(u, .976, -1));
      // safety lifeline (blue): along the eave and both gable edges
      const line = (pts, tops) => {
        const all = [pts[0], ...tops, pts[pts.length - 1]], out = [];
        for (let i = 0; i < all.length - 1; i++) { const a = all[i], b = all[i + 1]; for (let k = 0; k < 6; k++) { const f = k / 6; out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) - Math.sin(Math.PI * f) * .08, lerp(a[2], b[2], f)]); } }
        out.push(all[all.length - 1]); MODEL.lines3d.push({ pts: out, col: '#3a7bff', w: .085, part: 'safety' });
      };
      const eaveU = [.02, .12, .22, .32, .42, .52, .62, .72, .82, .92, .98];
      eaveU.forEach(u => post(u, .018, .06, 1.1, .035, BLUE, 'safety'));
      line([P(.02, .018, .1), P(.98, .018, .1)], eaveU.map(u => P(u, .018, 1.16)));
      [.012, .988].forEach(u => { const vs = [.02, .34, .67, .99]; vs.forEach(v => post(u, v, .06, 1.1, .035, BLUE, 'safety')); line([P(u, .02, .1), P(u, .99, .1)], vs.map(v => P(u, v, 1.16))); });
    };
    roofSide(roofF, rN, eu0, ev0);
    { const A = [HX0 - ov, EAVE - .5 * slope, zb], B = [HX1 + ov, EAVE - .5 * slope, zb], Dd = [HX0 - ov, RIDGE, RZ]; let N2 = norm(cross(sub(B, A), sub(Dd, A))); if (N2[1] < 0) N2 = mul(N2, -1);
      const Pb = (u, v, lift) => { const p = add(A, add(mul(sub(B, A), u), mul(sub(Dd, A), v))); return lift ? add(p, mul(N2, lift)) : p; };
      roofSide(Pb, N2, norm(sub(B, A)), norm(sub(Dd, A))); }
    MODEL.roofPts = { walk: roofF(.69, .5, 1.5), pipe: roofF(.3, .463, 1.4), safety: roofF(.5, .018, 1.9) };
    // ---- annex shell ----
    const aMidX = (AX0 + AX1) / 2, aw = AX1 - AX0, ad = AZ1 - AZ0;
    H.push(box(aMidX, 4.15, AZ0 + .175, aw, 7.7, .35, C.wall, { f: { layer: 3.1 } }));
    const aBack = H[H.length - 1].faces.find(f => f.side === 'front'); aBack.base = C.back;
    const aLeft = box(AX0 + .175, 4.15, (AZ0 + AZ1) / 2, .35, 7.7, ad, C.wall, { f: { layer: 3.1, wall: 'AL' } }); H.push(aLeft);
    const slab2 = box(aMidX, FL2 - .15, (AZ0 + AZ1) / 2 - .2, aw - .4, .3, ad - .4, C.conc2, { f: { layer: 3.3 } }); H.push(slab2);
    slab2.faces.forEach(f => { if (f.side === 'top') f.base = C.floor; if (f.side === 'front') f.base = C.fascia; });
    const aRoof = box(aMidX, 8.15, (AZ0 + AZ1) / 2, aw + .6, .3, ad + .6, C.roof, { f: { layer: 4.5 } }); H.push(aRoof);
    aRoof.faces.forEach(f => { if (f.side !== 'top') f.base = C.fascia; });
    // PV on the annex roof (flat)
    const aN = [0, 1, 0], aP = (u, v, lift) => [lerp(AX0 + .6, AX1 - .6, u), 8.3 + (lift || 0), lerp(AZ1 - .5, AZ0 + .6, v)];
    pvArray(H, aP, aN, 2, 5, 0, 1, 0, 1, .25, true);
    // ---- staircase to the upper floor ----
    for (let i = 0; i < 12; i++) { const top = .3 + (i + 1) * (FL2 - .3) / 12; H.push(box(AX0 + .95, (.3 + top) / 2, 3.0 - i * .55, 1.1, top - .3, .55, C.steel, { f: { layer: 3.4 } })); }
    // ---- lower floor: battery racks ----
    MODEL.batteries = [];
    const batFn = (g, w, h) => {
      g.fillStyle = '#0d141b'; g.fillRect(6, 6, w - 12, 34); g.fillStyle = '#cfe3f5'; g.font = '700 22px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(S.soc * 100) + '%', w / 2, 24);
      const lit = S.batLed; for (let k = 0; k < 6; k++) { const on = k < lit; g.fillStyle = on ? S.batCol : '#25303b'; g.shadowColor = on ? S.batCol : 'transparent'; g.shadowBlur = on ? 10 : 0; g.fillRect(12, h - 28 - k * 30, w - 24, 16); }
      g.shadowBlur = 0;
    };
    [-14.9, -13.6, -12.3, -11.0].forEach(x => {
      const b = box(x, 1.8, -7.05, 1.1, 3.0, 1.0, C.graphite, { f: { layer: 3.2, part: 'battery' } }); H.push(b); MODEL.batteries.push(b);
      decal(b, 'front', [x - .5, 3.2, -6.545], [x + .5, 3.2, -6.545], [x - .5, .45, -6.545], 90, 250, batFn);
    });
    // ---- upper floor: inverter + main distribution panel ----
    const inv = box(-14.3, FL2 + 1.4, -7.2, 2.4, 2.8, .8, C.white, { f: { layer: 3.5, part: 'inverter' } }); H.push(inv);
    inv.faces.find(f => f.side === 'left').base = C.steel;
    decal(inv, 'front', [-15.4, 6.9, -6.795], [-13.2, 6.9, -6.795], [-15.4, 5.7, -6.795], 150, 82, (g, w, h) => {
      g.fillStyle = '#07131f'; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = S.invOk ? '#58f08c' : '#ff7a6b'; g.font = '700 40px Bricolage Grotesque, Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.invTxt, w / 2, h / 2 - 5);
      g.font = '600 12px Figtree, sans-serif'; g.fillStyle = '#9fb8cf'; g.fillText('kW AC', w / 2, h - 12);
    });
    decal(inv, 'front', [-15.4, 5.55, -6.795], [-13.2, 5.55, -6.795], [-15.4, 4.55, -6.795], 150, 68, (g, w, h) => {
      const cols = ['#58f08c', '#6fe3ff', '#ff4d3f']; for (let i = 0; i < 3; i++) { const on = S.led[i]; g.fillStyle = on ? cols[i] : '#3a4651'; g.shadowColor = on ? cols[i] : 'transparent'; g.shadowBlur = on ? 8 : 0; g.beginPath(); g.arc(26 + i * 28, 18, 7, 0, 7); g.fill(); }
      g.shadowBlur = 0; g.fillStyle = '#8a97a4'; for (let k = 0; k < 5; k++) g.fillRect(14, 36 + k * 6, w - 28, 3);
    });
    const mdp = box(-9.9, FL2 + 1.2, -7.35, 1.4, 2.4, .6, C.mdp, { f: { layer: 3.5 } }); H.push(mdp);
    decal(mdp, 'front', [-10.6, 6.5, -7.045], [-9.2, 6.5, -7.045], [-10.6, 4.4, -7.045], 100, 150, (g, w, h) => {
      for (let r = 0; r < 4; r++) { g.fillStyle = '#2b343e'; g.fillRect(8, 8 + r * 34, w - 16, 26); g.fillStyle = '#e8edf2'; for (let k = 0; k < 4; k++) g.fillRect(14 + k * 21, 14 + r * 34, 12, 12); }
      g.fillStyle = S.served ? '#58f08c' : '#ff4d3f'; g.shadowColor = g.fillStyle; g.shadowBlur = 8; g.beginPath(); g.arc(w / 2, h - 8, 4, 0, 7); g.fill(); g.shadowBlur = 0;
    });
    H.push(box(-11.5, 7.5, -7.4, 10.4, .12, .45, C.steel, { f: { layer: 3.5 } }));
    // ---- kWh meter on the annex outer wall ----
    const meter = box(-17.13, 2.4, .5, .26, 1.0, .75, C.white, { f: { layer: 6, part: 'meter' } }); H.push(meter);
    decal(meter, 'left', [-17.27, 2.75, .1], [-17.27, 2.75, .9], [-17.27, 2.1, .1], 90, 56, (g, w, h) => {
      g.fillStyle = '#07131f'; g.fillRect(2, 2, w - 4, h - 4); g.fillStyle = S.meterCol; g.font = '700 28px Bricolage Grotesque, Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.meterTxt, w / 2, h / 2 + 1);
    });
    MODEL.extra.push(box(-17.1, 1.0, .5, .1, 1.0, .1, C.steel, { f: { layer: 6 } }));
    // ---- production line inside the hall ----
    const machFn = (g, w, h) => {
      g.fillStyle = '#0d1a27'; g.fillRect(14, 16, 118, 74); g.strokeStyle = '#6fe3ff'; g.lineWidth = 2.4; g.beginPath(); const t = performance.now() / 500 * (S.served ? 1 : 0); for (let x = 0; x <= 118; x += 4) { const y = 53 + Math.sin(x / 11 + t) * 18; x ? g.lineTo(14 + x, y) : g.moveTo(14, y); } g.stroke();
      [['#58f08c', 0], ['#ffb703', 1], ['#6fe3ff', 2]].forEach(([c, i]) => { g.fillStyle = S.served ? c : '#334'; g.beginPath(); g.arc(28 + i * 22, 112, 6, 0, 7); g.fill(); });
      g.save(); g.translate(196, 70); g.rotate(S.served ? performance.now() / 700 : 0); g.strokeStyle = '#e4edf5'; g.lineWidth = 9; g.setLineDash([14, 9]); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = '#e4edf5'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#1a2d40'; g.fillRect(150, 128, 94, 14);
    };
    [[4, 'A'], [14, 'B'], [24, 'C']].forEach(([x]) => {
      const m = box(x, 1.95, -15.2, 4.8, 3.3, 3.2, C.mach, { f: { layer: 2, part: 'loads' } }); H.push(m);
      decal(m, 'front', [x - 2.1, 3.3, -13.595], [x + 2.1, 3.3, -13.595], [x - 2.1, .6, -13.595], 260, 167, machFn);
      H.push(box(x - .9, 4.5, -15.2, 1.8, 1.9, 1.6, C.machD, { f: { layer: 2, part: 'loads' } }));
    });
    H.push(prism(10, 9.0, .3, -15.4, 1.3, 6.0, C.steel, { layer: 2, part: 'loads' }));
    const beltFn = (g, w, h) => { g.fillStyle = '#2a323b'; g.fillRect(0, 0, w, h); g.fillStyle = '#4b5663'; const off = S.served ? (performance.now() / 18) % 36 : 0; for (let x = -36 + off; x < w; x += 36) g.fillRect(x, 0, 14, h); g.fillStyle = '#c9a36b'; for (let k = 0; k < 6; k++) g.fillRect(((off * 1.1 + k * 110) % (w + 40)) - 30, h * .28, 34, h * .44); };
    const conv = box(13.5, .55, -9.5, 22, .5, 1.1, C.graphite, { f: { layer: 2, part: 'loads' } }); H.push(conv);
    decal(conv, 'top', [2.5, .81, -10.05], [24.5, .81, -10.05], [2.5, .81, -8.95], 1100, 55, beltFn);
    H.push(box(2.5, .55, -9.5, .12, .5, 1.1, C.steel, { f: { layer: 2 } }), box(24.5, .55, -9.5, .12, .5, 1.1, C.steel, { f: { layer: 2 } }));
    const conv2 = box(13.5, .55, -4.2, 22, .5, 1.1, C.graphite, { f: { layer: 2, part: 'loads' } }); H.push(conv2);
    decal(conv2, 'top', [2.5, .81, -4.75], [24.5, .81, -4.75], [2.5, .81, -3.65], 1100, 55, beltFn);
    // storage racks + crates, safety posts
    [[28.2, -16], [28.2, -13.2], [28.2, -10.4], [28.2, -7.6]].forEach(([x, z], i) => { H.push(box(x, .75, z, 1.5, 1.0, 1.5, C.crate, { f: { layer: 2 } })); if (i % 2 === 0) H.push(box(x, 1.75, z, 1.3, .9, 1.3, C.crate, { f: { layer: 2 } })); });
    [[-3.5, -1], [-3.8, 1.2]].forEach(([x, z]) => H.push(box(x, .75, z, 1.4, .9, 1.2, C.crate, { f: { layer: 2 } })));
    [[2, 2.2], [9, 2.2], [16, 2.2], [23, 2.2], [29, 2.2]].forEach(([x, z]) => H.push(box(x, .6, z, .3, 1.0, .3, C.yellow, { f: { layer: 2 } })));
    H.push(box(12, 7.3, HZ0 + .65, 35, .12, .45, C.steel, { f: { layer: 2 } }));
    // ceiling lamps
    MODEL.lamps = [];
    for (const x of [0, 6.5, 13, 19.5, 26]) for (const z of [-14, -7, -.5]) {
      const l = box(x, 6.7, z, 2.4, .1, .3, C.white, { f: { layer: 2, kind: 'lamp' } }); H.push(l); MODEL.lamps.push(l);
      H.push(box(x - .9, 7.0, z, .03, .6, .03, C.steel, { f: { layer: 2 } }), box(x + .9, 7.0, z, .03, .6, .03, C.steel, { f: { layer: 2 } }));
    }
    // ---- carport with PV canopy on the right of the hall ----
    const CX0 = 31, CX1 = 47, CZ0 = -10, CZ1 = 4.4, cpIdx0 = H.length;
    const cpad = box((CX0 + CX1) / 2, .08, (CZ0 + CZ1) / 2, CX1 - CX0 + 1.4, .16, CZ1 - CZ0 + 1.4, C.conc, { f: { layer: 0, part: 'carport' } }); H.push(cpad);
    const cpTop = cpad.faces.find(f => f.side === 'top'); cpTop.lines = [];
    [4.35, 1.25, -1.85, -4.95, -8.05].forEach(z => [[CX0 + .3, 38.0], [40.0, CX1 - .3]].forEach(([a, b]) => cpTop.lines.push([[a, .17, z], [b, .17, z], 'rgba(255,255,255,.85)', 1.6])));
    const carBox = (x, z, col, flip) => {
      const out = [], L = { layer: 3.2, part: 'carport' };
      [[-1.5, -.8], [1.5, -.8], [-1.5, .8], [1.5, .8]].forEach(([dx, dz]) => out.push(box(x + dx, .5, z + dz, .72, .72, .3, hex('#1b2128'), { f: L })));
      out.push(box(x, .95, z, 4.4, .7, 1.7, col, { f: L }));
      const cab = box(x + (flip ? .35 : -.35), 1.55, z, 2.3, .6, 1.5, hex('#26394f'), { f: L }); cab.faces.forEach(f => { if (f.side !== 'bottom') f.spec = 1; }); out.push(cab);
      out.push(box(x + (flip ? .35 : -.35), 1.88, z, 2.1, .08, 1.4, col, { f: L }));
      return out;
    };
    const carCols = [hex('#e9edf2'), hex('#c0392b'), hex('#9aa5b0'), hex('#1f4e8c'), hex('#2b2f36'), hex('#e08a1e'), hex('#2f8f5b'), hex('#d8dde3')];
    const slots = [[35.0, 2.8, 0], [43.0, 2.8, 1], [35.0, -.3, 2], [43.0, -.3, 3], [35.0, -3.4, 4], [43.0, -3.4, 5], [43.0, -6.5, 6], [35.0, -6.5, 7]];
    slots.forEach(([x, z, k]) => carBox(x, z, carCols[k], k % 2).forEach(b => H.push(b)));
    // T-shaped pylons with a butterfly PV table on each arm (cars park under the arms, on both sides of the pylon)
    const MX = (CX0 + CX1) / 2, TOP = 3.1, EDGE = 4.25, arm = MX - CX0;
    [1.25, -4.95].forEach(z => {
      H.push(box(MX, (.16 + 2.6) / 2, z, .9, 2.44, .8, hex('#9aa4ad'), { f: { layer: 3.3, part: 'carport' } }));
      H.push(box(MX, 2.88, z, 4.4, .55, .55, hex('#8f959c'), { f: { layer: 3.3, part: 'carport' } }));
    });
    [[-1, 'L'], [1, 'R']].forEach(([sg]) => {
      const A = [MX + sg * arm, EDGE, CZ1], B = [MX + sg * arm, EDGE, CZ0], D = [MX + sg * .05, TOP, CZ1];
      const N = norm(cross(sub(D, A), sub(B, A))), Nn = N[1] < 0 ? mul(N, -1) : N;
      const Pf = (u, v, lift) => { const p = add(A, add(mul(sub(B, A), u), mul(sub(D, A), v))); return lift ? add(p, mul(Nn, lift)) : p; };
      const slab = extrude([A, B, add(B, sub(D, A)), D], mul(Nn, -.26), C.fascia, { layer: 4.6, part: 'carport' }); H.push(slab);
      pvArray(H, Pf, Nn, 5, 9, .02, .98, .03, .97, .12, false, 'carport');
    });
    for (let i = cpIdx0; i < H.length; i++) H[i].faces.forEach(f => { f.cp = true; f.cl = f.layer; });

    // ---- utility pole + wires ----
    const PX = -23, PZ = 2.0, P = MODEL.pole;
    P.push(prism(7, PX, 0, PZ, .26, 9.6, C.wood, { part: 'grid' }));
    P.push(box(PX, 8.95, PZ, 3.2, .22, .22, hex('#5a4630'), { f: { part: 'grid' } }));
    [-1.3, 0, 1.3].forEach(dx => P.push(prism(6, PX + dx, 9.1, PZ, .1, .34, hex('#a8cfe0'), { part: 'grid' })));
    P.push(prism(8, PX + .95, 5.6, PZ, .62, 1.5, C.steel, { part: 'grid' }));
    P.push(box(PX + .95, 7.25, PZ, .55, .22, .55, C.graphite, { f: { part: 'grid' } }));
    MODEL.trLed = { p: [PX + 1.5, 6.0, PZ + .3] };
    const cat = (a, b, sag, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(Math.PI * t) * sag, lerp(a[2], b[2], t)]); } return pts; };
    MODEL.wires = [cat([PX - 1.3, 9.2, PZ], [PX - 22, 9.4, PZ], .6, 8), cat([PX + 1.3, 9.2, PZ], [PX - 22, 9.6, PZ + .3], .6, 8), cat([PX + 1.3, 9.2, PZ], [-17.2, 2.95, .35], 1.0, 14), cat([PX + .05, 9.2, PZ], [-17.2, 2.9, .75], .9, 14)];
    MODEL.gridFlow = cat([PX + 1.3, 9.15, PZ], [-17.2, 2.9, .5], 1.0, 14).concat([[-17.1, 1.9, .5], [-16.9, .45, .5], [-9.9, .45, .5], [-9.9, .45, -6.6], [-9.9, 4.9, -6.6]]);
    // ---- phone with the monitoring dashboard ----
    const phx = -25.5, phz = 6.8, phy = 3.0, pyaw = .42;
    const ph = box(phx, phy, phz, 2.2, 4.1, .22, hex('#0d1620'), { yaw: pyaw, f: { part: 'monitor' } }); MODEL.phone.push(ph);
    MODEL.phone.push(box(phx, .55, phz - .05, .34, 1.1, .34, hex('#2b3a49'), { yaw: pyaw, f: { part: 'monitor' } }));
    MODEL.phone.push(box(phx, .08, phz - .05, 1.9, .16, 1.3, hex('#1d2833'), { yaw: pyaw, f: { part: 'monitor' } }));
    const pc = [phx, phy, phz], zfp = phz + .115, rr = p => rotY(p, pc, pyaw);
    decal(ph, 'front', rr([phx - 1.0, phy + 1.9, zfp]), rr([phx + 1.0, phy + 1.9, zfp]), rr([phx - 1.0, phy - 1.9, zfp]), 140, 266, (g, w, h) => {
      g.fillStyle = '#0a1d33'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fd0ff'; g.font = '700 12px Figtree, sans-serif'; g.textAlign = 'center'; g.fillText('HME MONITOR', w / 2, 24);
      g.fillStyle = '#fff'; const pvTxt = String(Math.round(S.pv)); g.font = '800 ' + (pvTxt.length > 4 ? 30 : pvTxt.length > 3 ? 40 : 56) + 'px Bricolage Grotesque, Figtree, sans-serif'; g.fillText(pvTxt, w / 2, 90); g.fillStyle = '#9fb8cf'; g.font = '600 13px Figtree, sans-serif'; g.fillText('kW produksi surya', w / 2, 112);
      g.strokeStyle = '#ffb703'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 24; i++) { const v = Math.max(0, Math.sin(Math.PI * (i - 6) / 12)); const x = 12 + i / 24 * (w - 24), y = 190 - v * 56; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      const cx = 12 + S.hour / 24 * (w - 24); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 126); g.lineTo(cx, 196); g.stroke();
      g.fillStyle = '#1c3348'; g.fillRect(12, 224, w - 24, 10); if (S.hasBat) { g.fillStyle = S.batCol; g.fillRect(12, 224, (w - 24) * S.soc, 10); } g.fillStyle = '#9fb8cf'; g.font = '600 11px Figtree, sans-serif'; g.fillText(S.hasBat ? 'Baterai ' + Math.round(S.soc * 100) + '%' : 'Tanpa baterai', w / 2, 254);
    });
    // ---- energy flows ----
    MODEL.flowsPts = {
      pv: [roofF(.12, .25, .22), [-5.5, 9.2, -1.5], [-9.5, 9.0, -3.5], [-14.3, 8.9, -3.5], [-14.3, 8.9, -7.2], [-14.3, 7.2, -7.2]],
      invmdp: [[-13.1, 5.9, -6.8], [-10.6, 5.9, -7.0]],
      l1: [[-9.9, 6.7, -7.35], [-9.9, 7.5, -7.35], [-6.4, 7.5, -7.35], [-5.0, 7.5, -7.35], [-5.0, 7.4, -17.3], [4.0, 7.4, -17.3], [4.0, 7.4, -15.2], [4.0, 3.7, -15.2]],
      l2: [[4.0, 7.4, -17.3], [14.0, 7.4, -17.3], [14.0, 7.4, -15.2], [14.0, 3.7, -15.2]],
      bat: [[-12.6, 5.0, -6.2], [-12.6, 3.45, -6.2], [-15.2, 3.45, -6.2]],
      grid: MODEL.gridFlow
    };
    MODEL.trees = [[-36, -6, 1.3], [-32, -24, 1.5], [54, -28, 1.6], [58, 0, 1.3], [-8, -32, 1.5], [22, -34, 1.6], [60, 12, 1.1], [-40, 12, 1.3], [52, 16, .8], [-30, 16, .8], [40, -22, 1.4]];
    MODEL.labels = [
      { id: 'pv', a: [2, 13.2, -5], t: 'Panel surya', modes: 3 }, { id: 'grid', a: [PX, 10.6, PZ], t: 'Jaringan PLN', modes: 5 }, { id: 'meter', a: [-17.2, 3.4, .5], t: 'kWh meter', modes: 5 },
      { id: 'inverter', a: [-14.3, 7.4, -7.2], t: 'Inverter', modes: 7 }, { id: 'battery', a: [-13, 3.55, -7.0], t: 'Baterai', modes: 6 }, { id: 'loads', a: [24, 5.9, -15.2], t: 'Beban', modes: 7 }, { id: 'monitor', a: [phx, 5.5, phz], t: 'Monitoring', modes: 7 },
      { id: 'walkway', a: MODEL.roofPts.walk, t: 'Walkway', modes: 7 }, { id: 'pipe', a: MODEL.roofPts.pipe, t: 'Pipa air cleaning', modes: 7, grp: 1 }, { id: 'safety', a: MODEL.roofPts.safety, t: 'Safety line', modes: 7, grp: 1 },
      { id: 'carport', a: [(CX0 + CX1) / 2, 5.6, -2], t: 'Carport', modes: 7 }
    ];
    MODEL.presets = {
      pv: { az: .04, el: 1.15, dist: 46, tx: 12, ty: 8.5, tz: -6 },
      inverter: { az: .12, el: .12, dist: 14, tx: -13, ty: 5.8, tz: -7 },
      battery: { az: .1, el: .1, dist: 14, tx: -13, ty: 2.3, tz: -6.5 },
      loads: { az: -.1, el: .2, dist: 26, tx: 12, ty: 2.8, tz: -14 },
      meter: { az: -.6, el: .14, dist: 9, tx: -17.2, ty: 2.6, tz: .5 },
      grid: { az: -.35, el: .2, dist: 28, tx: -22, ty: 6.5, tz: 2 },
      monitor: { az: .45, el: .14, dist: 18, tx: -25.5, ty: 3.0, tz: 6.8 },
      walkway: { az: .1, el: .6, dist: 22, tx: 19, ty: 10, tz: -1.3 },
      pipe: { az: .2, el: .6, dist: 22, tx: 10, ty: 9.8, tz: -1.3 },
      safety: { az: .2, el: .35, dist: 26, tx: 12, ty: 8.2, tz: 3 },
      carport: { az: .55, el: .24, dist: 27, tx: 39, ty: 2.8, tz: -2 }
    };
    MODEL.home = { az: .3, el: .2, dist: 86, tx: 10, ty: 4.2, tz: -3 };
    MODEL.site = {
      shadows: [
        { base: [[HX0 - .4, 0, HZ0], [HX1 + .4, 0, HZ0], [HX1 + .4, 0, HZ1 + .5], [HX0 - .4, 0, HZ1 + .5]], top: [[HX0, RIDGE, RZ], [HX1, RIDGE, RZ], [HX1, EAVE, HZ1], [HX0, EAVE, HZ1], [HX0, EAVE, HZ0], [HX1, EAVE, HZ0]] },
        { base: [[CX0 - .4, 0, CZ0 - .4], [CX1 + .4, 0, CZ0 - .4], [CX1 + .4, 0, CZ1 + .4], [CX0 - .4, 0, CZ1 + .4]], top: [[CX0 - .4, 4.4, CZ0 - .4], [CX1 + .4, 4.4, CZ0 - .4], [CX1 + .4, 4.4, CZ1 + .4], [CX0 - .4, 4.4, CZ1 + .4], [(CX0 + CX1) / 2, 3.3, CZ0 - .4], [(CX0 + CX1) / 2, 3.3, CZ1 + .4]], a: .9 },
        { base: [[AX0, 0, AZ0], [AX1, 0, AZ0], [AX1, 0, AZ1], [AX0, 0, AZ1]], top: [[AX0, 8.4, AZ0], [AX1, 8.4, AZ0], [AX1, 8.4, AZ1], [AX0, 8.4, AZ1]] },
        { base: [[PX - .25, 0, PZ - .25], [PX + .25, 0, PZ + .25]], top: [[PX - .25, 9.6, PZ - .25], [PX + .25, 9.6, PZ + .25]], a: .8 }
      ],
      xMark: [-20, 6.2, 1.2], outLbl: [PX, 11.4, PZ], wifi: [phx, 5.6, phz], glare: { p: [12, 10.5, -4], r: 22 },
      centers: { house: [12, 4, -6], pole: [PX, 3, PZ], phone: [phx, 2, phz] }, apron: [-34, 56, 4.6, 30]
    };
  }

  const logoImg = new Image(); logoImg.src = 'img/hme-logo.webp';

  /* ---------------- camera ---------------- */
  const cam = { az: .3, el: .2, dist: 27, tx: 0, ty: 3.0, tz: 0 }, tgt = { az: .3, el: .2, dist: 27, tx: 0, ty: 3.0, tz: 0 };
  const HOME_H = { az: .3, el: .2, dist: 27, tx: 0, ty: 3.0, tz: 0 };
  const PRESET_H = {
    pv: { az: .15, el: .42, dist: 17, tx: 0, ty: 6.4, tz: 0 },
    inverter: { az: .12, el: .14, dist: 11, tx: -4.2, ty: 2.7, tz: -3.5 },
    battery: { az: .1, el: .16, dist: 10.5, tx: 1.2, ty: 1.7, tz: -3.6 },
    loads: { az: -.1, el: .2, dist: 12, tx: 4.8, ty: 1.8, tz: -2 },
    meter: { az: -.65, el: .14, dist: 10, tx: -7.5, ty: 2.0, tz: 1.6 },
    grid: { az: -.35, el: .2, dist: 17, tx: -10, ty: 5.2, tz: 2.6 },
    monitor: { az: .45, el: .14, dist: 13, tx: 11.2, ty: 2.5, tz: 3.6 }
  };
  let W = 1200, Hh = 640, DPR = 1, F = 1000, CX = 600, CY = 380, pos = [0, 0, 0], fw = [0, 0, -1], rt = [1, 0, 0], up = [0, 1, 0], horizonY = 200;
  function setupView() {
    const ce = Math.cos(cam.el), T = [cam.tx, cam.ty, cam.tz];
    pos = [T[0] + cam.dist * Math.sin(cam.az) * ce, T[1] + cam.dist * Math.sin(cam.el), T[2] + cam.dist * Math.cos(cam.az) * ce];
    fw = norm(sub(T, pos)); rt = norm(cross(fw, [0, 1, 0])); up = cross(rt, fw);
    F = (Hh / 2) / Math.tan(17 * Math.PI / 180); CX = W / 2; CY = Hh * .6;
    horizonY = CY - F * Math.tan(cam.el);
  }
  const toCam = p => { const d = sub(p, pos); return [dot(d, rt), dot(d, up), dot(d, fw)]; };
  const proj = c => [CX + F * c[0] / c[2], CY - F * c[1] / c[2]];
  const NEAR = .3;
  function clipNear(pts) {
    const out = []; for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ina = a[2] >= NEAR, inb = b[2] >= NEAR;
      if (ina) out.push(a);
      if (ina !== inb) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), NEAR]); }
    } return out;
  }

  /* ---------------- rendering ---------------- */
  let cv, ctx, frameId = 0, hits = [], hover = null, selected = null, tNow = 0;
  function shade(f) {
    const base = f.base; let r, g, b;
    if (f.kind === 'lamp') { const k = env.lamp > .3 ? 1 : .35; return [255 * k, 244 * k, 214 * k]; }
    const d = Math.max(0, dot(f.n, env.L)), A = env.amb, sc = env.sunC;
    if (f.interior) {
      const lamp = env.lamp * (.6 + .3 * Math.max(0, f.n[1])), s = env.sunI * .14 * d;
      r = base[0] * (A[0] * .5 + lamp + s * sc[0]); g = base[1] * (A[1] * .5 + lamp * .97 + s * sc[1]); b = base[2] * (A[2] * .5 + lamp * .9 + s * sc[2]);
    } else {
      const hemi = (f.n[1] * .5 + .5) * .1, k = env.sunI * d;
      r = base[0] * (A[0] + k * sc[0] + hemi); g = base[1] * (A[1] + k * sc[1] + hemi); b = base[2] * (A[2] + k * sc[2] + hemi);
    }
    if (f.spec) {
      const V = norm(sub(pos, f.c)), Hv = norm(add(env.L, V)), s = Math.pow(Math.max(0, dot(f.n, Hv)), 40) * env.sunI * 1.1;
      const fres = .22 + .55 * Math.pow(1 - Math.max(0, dot(f.n, V)), 3), sky = env.top;
      const dayK = S.day; const sp = Math.min(s, .12); r = lerp(r, sky[0] * .9, fres * .5 * dayK) + sp * 255; g = lerp(g, sky[1] * .9, fres * .5 * dayK) + sp * 255; b = lerp(b, sky[2] * .95, fres * .5 * dayK) + sp * 255;
    }
    if (f.part && (f.part === hover || f.part === selected)) { const pulse = f.part === selected ? .1 + .06 * Math.sin(tNow * 4) : .14; r = r * (1 + pulse) + 14; g = g * (1 + pulse) + 10; b = b * (1 + pulse); }
    return [r, g, b];
  }
  const facing = f => f.n[0] * (pos[0] - f.c[0]) + f.n[1] * (pos[1] - f.c[1]) + f.n[2] * (pos[2] - f.c[2]) > 0;
  function paintFace(f) {
    if (!f.dbl && !facing(f)) return;
    let cp = f.pts.map(toCam); cp = clipNear(cp); if (cp.length < 3) return;
    const sp = cp.map(proj);
    /* skip faces fully outside the canvas (common when zoomed in on a part): fill, lines and decals all lie inside the face */
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of sp) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    if (x1 < -2 || x0 > W + 2 || y1 < -2 || y0 > Hh + 2) return;
    const col = shade(f), fill = css(col);
    ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.closePath();
    if (f.grad) { let mn = 1e9, mx = -1e9; sp.forEach(p => { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); }); const gr = ctx.createLinearGradient(0, mn, 0, mx); gr.addColorStop(0, css(col)); gr.addColorStop(1, css(col.map(v => v * .8))); ctx.fillStyle = gr; } else ctx.fillStyle = fill;
    ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = .8; ctx.stroke();
    if (f.part) hits.push({ sp, part: f.part });
    if (f.part && f.part === selected) { ctx.strokeStyle = 'rgba(253,184,19,.95)'; ctx.lineWidth = 1.8; ctx.stroke(); }
    if (f.lines) {
      /* consecutive lines with the same style share one path and one stroke() (a solar panel has ~13 lines, 250+ panels) */
      let open = false, cs = null, cw = 0;
      for (const L of f.lines) {
        const a = toCam(L[0]), b = toCam(L[1]); if (a[2] < NEAR || b[2] < NEAR) continue; const pa = proj(a), pb = proj(b);
        if (!open || L[2] !== cs || L[3] !== cw) { if (open) ctx.stroke(); cs = L[2]; cw = L[3]; ctx.strokeStyle = cs; ctx.lineWidth = cw; ctx.beginPath(); open = true; }
        ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]);
      }
      if (open) ctx.stroke();
    }
    if (f.decals) for (const d of f.decals) {
      const O = toCam(d.O), U = toCam(d.U), V = toCam(d.V); if (O[2] < NEAR || U[2] < NEAR || V[2] < NEAR) continue;
      const o = proj(O), u = proj(U), v = proj(V);
      ctx.save(); ctx.setTransform(DPR * (u[0] - o[0]) / d.w, DPR * (u[1] - o[1]) / d.w, DPR * (v[0] - o[0]) / d.h, DPR * (v[1] - o[1]) / d.h, DPR * o[0], DPR * o[1]);
      ctx.beginPath(); ctx.rect(0, 0, d.w, d.h); ctx.clip(); d.fn(ctx, d.w, d.h); ctx.restore();
    }
  }
  function renderSolids(list, sortLayers) {
    const faces = [];
    /* back faces are dropped before sorting: it halves the sort and the toCam work */
    for (const s of list) { let dp = null; for (const f of s.faces) { if (!f.dbl && !facing(f)) continue; if (dp === null) dp = toCam(s.ctr)[2]; f._sd = dp; f._fd = toCam(f.c)[2]; faces.push(f); } }
    faces.sort((a, b) => (a.layer - b.layer) || (b._sd - a._sd) || (b._fd - a._fd));
    for (const f of faces) paintFace(f);
  }
  function worldPoly(pts, fill, alpha) {
    let cp = clipNear(pts.map(toCam)); if (cp.length < 3) return; const sp = cp.map(proj);
    ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.closePath(); ctx.fillStyle = css(fill, alpha === undefined ? 1 : alpha); ctx.fill();
  }
  function worldLine(a, b, color, wpx) {
    const ca = toCam(a), cb = toCam(b); const p = clipNear([ca, cb]); if (p.length < 2) return; const pa = proj(p[0]), pb = proj(p[1]);
    ctx.strokeStyle = color; ctx.lineWidth = wpx; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
  }
  const lit = (c, k) => c.map((v, i) => v * (env.amb[i] + env.sunI * env.sunC[i] * k));

  /* ---- sky, sun, moon, clouds, hills ---- */
  const STARS = Array.from({ length: 90 }, (_, i) => { const s = (i * 9301 + 49297) % 233280 / 233280, t = (i * 4871 + 13337) % 233280 / 233280; return [s, t, .5 + (i % 5) * .25]; });
  const CLOUDS = [[.1, .22, 1, .6, 0], [.45, .12, .8, .5, 0], [.78, .3, 1.15, .45, 0], [.3, .42, .7, .7, 1], [.62, .5, .9, .6, 1], [.9, .15, 1.1, .5, 1]];
  function drawSky() {
    const hy = Math.max(horizonY, 40), g = ctx.createLinearGradient(0, 0, 0, hy + 20); g.addColorStop(0, env.topS); g.addColorStop(1, env.botS);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    if (env.night > .1) { ctx.fillStyle = '#fff'; for (const [x, y, s] of STARS) { ctx.globalAlpha = env.night * env.night * (.5 + .5 * Math.sin(tNow * 1.5 + x * 40)) * (1 - .6 * WX.ov); ctx.beginPath(); ctx.arc(((x * W - cam.az * 90) % W + W) % W, y * hy * .92, s, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
    const t = clamp((S.hour - 5.5) / 13, 0, 1), sx = W * (.12 + .76 * t) - cam.az * W * .28, sy = hy - Math.sin(Math.PI * t) * Math.min(hy * .9, Hh * .42) - 10;
    if (S.hour > 5.2 && S.hour < 18.8) {
      const a = (1 - .55 * WX.ov) * clamp(Math.sin(Math.PI * t) * 3, 0, 1);
      const gl = ctx.createRadialGradient(sx, sy, 4, sx, sy, 190); gl.addColorStop(0, `rgba(255,244,200,${.9 * a})`); gl.addColorStop(.25, `rgba(255,214,120,${.4 * a})`); gl.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = gl; ctx.fillRect(sx - 200, sy - 200, 400, 400); ctx.fillStyle = `rgba(255,252,230,${a})`; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 7); ctx.fill();
      env.sunScreen = [sx, sy, a];
    } else env.sunScreen = null;
    const mh = S.hour >= 18.5 ? S.hour - 18.5 : S.hour + 5.5, mt = clamp(mh / 11, 0, 1), mx = W * (.12 + .76 * mt) - cam.az * W * .28, my = hy - Math.sin(Math.PI * mt) * Math.min(hy * .9, Hh * .4) - 10;
    if (env.night > .15) {
      ctx.globalAlpha = env.night * (1 - .5 * WX.ov); const mg = ctx.createRadialGradient(mx, my, 3, mx, my, 100); mg.addColorStop(0, 'rgba(210,225,255,.55)'); mg.addColorStop(1, 'rgba(210,225,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 110, my - 110, 220, 220);
      ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(mx, my, 17, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(160,175,205,.55)'; ctx.beginPath(); ctx.arc(mx - 5, my - 3, 3.4, 0, 7); ctx.arc(mx + 6, my + 6, 2.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    // clouds
    for (const [cx0, cy0, s, o, more] of CLOUDS) {
      const vis = more ? WX.ov : lerp(.55, 1, WX.ov); if (vis <= .01) continue;
      const x = ((cx0 + WX.cloudT * .004 * (.6 + s * .4)) % 1.4 - .2) * W - cam.az * W * .2 - (more ? (1 - WX.ov) * W * .45 : 0), y = cy0 * Math.max(hy, 120) * .9 + 20, sc = s * Math.max(.6, W / 1200);
      const tint = mixc([255, 255, 255], [110, 125, 150], env.night * .9), grey = mixc(tint, [70, 78, 92], .8 * WX.ov);
      ctx.globalAlpha = vis * o * 1.3 > 1 ? 1 : vis * o * 1.3;
      [[0, 0, 90, 26], [-52, -14, 44, 28], [10, -26, 52, 34], [64, -8, 44, 24]].forEach(([ox, oy, rx, ry]) => {
        const gr = ctx.createRadialGradient(x + ox * sc, y + oy * sc, 2, x + ox * sc, y + oy * sc, rx * sc); gr.addColorStop(0, css(grey, .95)); gr.addColorStop(1, css(grey, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x + ox * sc, y + oy * sc, rx * sc, ry * sc * 1.1, 0, 0, 7); ctx.fill();
      });
    } ctx.globalAlpha = 1;
  }

  /* ---- rain + lightning (shown when the weather is set to Hujan) ---- */
  const DROPS = Array.from({ length: 360 }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, y: ((i * 104729) % 1000) / 1000, z: .25 + ((i * 31) % 100) / 100 * .85 }));
  const RL = { k: 0, t: 0, next: 2.5, bolt: null, age: 0, fl: 0 };
  function makeBolt() {
    const hy = Math.max(horizonY, 80), x0 = W * (.15 + Math.random() * .7), pts = [[x0, -10]], br = [];
    let x = x0, y = -10; const n = 13, endY = hy + 10 + Math.random() * 30;
    for (let i = 1; i <= n; i++) {
      x += (Math.random() - .5) * 60; y = lerp(-10, endY, i / n); pts.push([x, y]);
      if (i > 3 && i < n - 2 && Math.random() < .3) { const b = [[x, y]]; let bx = x, by = y; for (let j = 0; j < 4; j++) { bx += (Math.random() < .5 ? -1 : 1) * (10 + Math.random() * 26); by += 14 + Math.random() * 20; b.push([bx, by]); } br.push(b); }
    }
    return { pts, br };
  }
  function stepRain(dt) {
    RL.k = WX.rain;
    if (!WX.storm || reduce) { if (!WX.storm) { RL.bolt = null; RL.fl = 0; RL.t = 0; RL.next = .9 + Math.random() * 1.6; } return; }
    RL.t += dt;
    if (!RL.bolt && RL.t >= RL.next) { RL.bolt = makeBolt(); RL.age = 0; }
    if (RL.bolt) {
      RL.age += dt; const a = RL.age;
      RL.fl = a < .07 ? 1 : a < .15 ? .3 : a < .25 ? .9 : Math.max(0, 1 - (a - .25) / .4);
      if (a > .7) { RL.bolt = null; RL.fl = 0; RL.t = 0; RL.next = 3 + Math.random() * 6; }
    }
  }
  function drawBolt() {
    if (!RL.bolt || RL.fl < .02) return;
    const stroke = (pts, w, col, a) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [RL.bolt.pts, ...RL.bolt.br].forEach((p, i) => { const k = i ? .55 : 1; stroke(p, 9 * k, 'rgba(150,180,255,.35)', RL.fl); stroke(p, 3.4 * k, '#cfe0ff', RL.fl); stroke(p, 1.4 * k, '#ffffff', RL.fl); });
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawRain(dt) {
    if (RL.k < .02) return;
    const sl = .2, sc = Hh / 640, k = RL.k;
    ctx.save(); ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      ctx.beginPath(); ctx.strokeStyle = 'rgba(205,224,248,' + ((.16 + b * .12) * k).toFixed(3) + ')'; ctx.lineWidth = (.7 + b * .55) * Math.max(.8, sc);
      for (const d of DROPS) {
        if (Math.min(2, Math.floor((d.z - .25) / .85 * 3)) !== b) continue;
        const sp = (1.1 + d.z * 1.5) * (dt || 0); d.y += sp; if (d.y > 1.05) { d.y -= 1.1; d.x = Math.random(); }
        const x = d.x * (W + 120) - 60 - d.y * 40, y = d.y * Hh, len = (14 + 30 * d.z) * sc;
        ctx.moveTo(x, y); ctx.lineTo(x + len * sl, y - len);
      }
      ctx.stroke();
    }
    ctx.restore();
    // low mist along the ground
    const g = ctx.createLinearGradient(0, Math.max(horizonY, 0) - 20, 0, Math.max(horizonY, 0) + 140); g.addColorStop(0, 'rgba(140,155,175,0)'); g.addColorStop(.3, 'rgba(140,155,175,' + (.4 * k) + ')'); g.addColorStop(1, 'rgba(140,155,175,0)'); ctx.fillStyle = g; ctx.fillRect(0, Math.max(horizonY, 0) - 20, W, 160);
    if (RL.fl > .02) { ctx.fillStyle = 'rgba(205,222,255,' + (.34 * RL.fl).toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh); }
  }
  function drawHills() {
    const hy = horizonY; if (hy < -20) return;
    const shadeC = (c, k) => css(mixc(lit(c, 0).map(v => v * 1.0), env.bot, k));
    [[hex('#4e7284'), .45, .35, 34, .006, 1], [hex('#3d6a55'), .25, .6, 20, .011, 2]].forEach(([c, haze, par, amp, fr, seed]) => {
      ctx.fillStyle = shadeC(c.map(v => v * 1.3), haze); ctx.beginPath(); ctx.moveTo(0, hy + 20);
      for (let x = 0; x <= W; x += 12) { const px = x + cam.az * W * par; const y = hy - 6 - amp * (.55 + .45 * Math.sin(px * fr * 2.3 + seed) + .3 * Math.sin(px * fr * 5.1 + seed * 3)) * .8; ctx.lineTo(x, y); }
      ctx.lineTo(W, hy + 20); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = css(mixc(lit(hex('#566a7c'), 0), env.bot, .4)); const px = cam.az * W * .5;
    [[.62, 70, 16], [.66, 46, 10], [.2, 36, 40]].forEach(([fx, hh, ww]) => { const x = fx * W + px; ctx.fillRect(x, hy - hh - 6, ww, hh); });
  }
  function drawGround() {
    const hy = Math.max(horizonY, 0), gc = lit(C.grass, .45); ctx.fillStyle = css(gc); ctx.fillRect(0, hy - 2, W, Hh - hy + 2);
    const FAR = 260;
    worldPoly([[-FAR, 0, -FAR], [FAR, 0, -FAR], [FAR, 0, FAR], [-FAR, 0, FAR]], lit(C.grass, .45));
    for (let i = -8; i < 8; i += 2) worldPoly([[i * 8, .005, -90], [i * 8 + 8, .005, -90], [i * 8 + 8, .005, 90], [i * 8, .005, 90]], lit(C.grass2, .4), .55);
    // apron + road
    const [ax0, ax1, az0, az1] = MODEL.site.apron;
    worldPoly([[ax0, .01, az0], [ax1, .01, az0], [ax1, .01, az1], [ax0, .01, az1]], lit(C.conc, .5));
    worldPoly([[-70, .01, 30], [70, .01, 30], [70, .01, 40], [-70, .01, 40]], lit(C.asphalt, .4));
    worldPoly([[-70, .012, 29.4], [70, .012, 29.4], [70, .012, 30], [-70, .012, 30]], lit(hex('#c9ced4'), .5));
    ctx.lineCap = 'butt'; const jc = 'rgba(40,46,54,.28)';
    for (let x = ax0; x <= ax1; x += 4) worldLine([x, .02, az0], [x, .02, az1], jc, 1);
    for (let z = az0 + 2.6; z <= az1; z += 3.5) worldLine([ax0, .02, z], [ax1, .02, z], jc, 1);
    for (let x = -60; x < 60; x += 6) worldLine([x, .02, 35], [x + 3, .02, 35], 'rgba(244,180,0,.85)', 2);
    for (let k = 0; k < 5; k++) worldLine([8 + k * 2.4, .02, 9], [8 + k * 2.4, .02, 16], 'rgba(255,255,255,.8)', 2);
    // soft haze at horizon
    const hz = ctx.createLinearGradient(0, hy - 4, 0, hy + 70); hz.addColorStop(0, css(env.bot, .75)); hz.addColorStop(1, css(env.bot, 0)); ctx.fillStyle = hz; ctx.fillRect(0, hy - 4, W, 74);
  }
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[2] - b[2]); const cr = (o, a, b) => (a[0] - o[0]) * (b[2] - o[2]) - (a[2] - o[2]) * (b[0] - o[0]); const lo = [], hi = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    lo.pop(); hi.pop(); return lo.concat(hi);
  }
  function drawShadows() {
    const L = env.L; if (L[1] < .12) return; const a = (S.day > .1 ? env.sunI * .55 : .06) * clamp(L[1] * 3, 0, 1); if (a < .02) return;
    const cast = p => [p[0] - L[0] / L[1] * p[1], .015, p[2] - L[2] / L[1] * p[1]];
    MODEL.site.shadows.forEach(v => worldPoly(hull(v.base.concat(v.top.map(cast))), [8, 14, 22], a * (v.a || 1)));
    ctx.globalAlpha = 1;
  }
  function drawTree(t) {
    const [x, z, s] = t, c = toCam([x, 0, z]); if (c[2] < 1) return; const p = proj(c), k = F / c[2] * s, h = 7 * k, w = 3.2 * k;
    ctx.fillStyle = css(lit(hex('#4a3a2c'), .4)); ctx.fillRect(p[0] - .18 * k, p[1] - 2 * k, .36 * k, 2.2 * k);
    [[0, -h * .5, w * .62, .1], [-w * .3, -h * .6, w * .5, .0], [w * .3, -h * .62, w * .5, -.05], [0, -h * .88, w * .5, .12]].forEach(([ox, oy, r, sh]) => {
      const col = lit(hex('#3d7240'), .5 + sh); const gr = ctx.createRadialGradient(p[0] + ox - r * .25, p[1] + oy - r * .3, r * .1, p[0] + ox, p[1] + oy, r);
      gr.addColorStop(0, css(col.map(v => v * 1.25))); gr.addColorStop(1, css(col.map(v => v * .72))); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p[0] + ox, p[1] + oy, r, 0, 7); ctx.fill();
    });
  }

  /* ---- flows ---- */
  const FLOW = {}; const SPR = {};
  function sprite(color) {
    if (SPR[color]) return SPR[color]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 1, 32, 32, 32);
    r.addColorStop(0, '#fff'); r.addColorStop(.18, color); r.addColorStop(.5, color + '66'); r.addColorStop(1, color + '00'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (SPR[color] = c);
  }
  function initFlows() {
    Object.entries(MODEL.flowsPts).forEach(([id, pts]) => {
      const seg = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(...sub(pts[i + 1], pts[i])); seg.push(l); tot += l; }
      FLOW[id] = { id, pts, seg, tot, on: 0, target: 0, dir: 1, kw: 0, color: '#6fe3ff', phase: Math.random() * 3, speed: 3 };
    });
  }
  function pointAt(fl, s) {
    s = ((s % fl.tot) + fl.tot) % fl.tot; for (let i = 0; i < fl.seg.length; i++) { if (s <= fl.seg[i]) { const t = fl.seg[i] ? s / fl.seg[i] : 0; return [lerp(fl.pts[i][0], fl.pts[i + 1][0], t), lerp(fl.pts[i][1], fl.pts[i + 1][1], t), lerp(fl.pts[i][2], fl.pts[i + 1][2], t)]; } s -= fl.seg[i]; }
    return fl.pts[fl.pts.length - 1];
  }
  function drawTracks() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const id in FLOW) {
      const fl = FLOW[id]; if (id === 'grid') continue;
      for (let i = 0; i < fl.pts.length - 1; i++) { const a = toCam(fl.pts[i]), b = toCam(fl.pts[i + 1]); const p = clipNear([a, b]); if (p.length < 2) continue; const pa = proj(p[0]), pb = proj(p[1]), w = Math.max(2, .11 * F / ((a[2] + b[2]) / 2)); ctx.strokeStyle = 'rgba(14,20,27,.85)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
    }
    const g = FLOW.grid; if (g && S.mode !== 'offgrid') for (let i = 0; i < g.pts.length - 1; i++) { const a = toCam(g.pts[i]), b = toCam(g.pts[i + 1]), p = clipNear([a, b]); if (p.length < 2) continue; const pa = proj(p[0]), pb = proj(p[1]), w = Math.max(1.6, .08 * F / ((a[2] + b[2]) / 2)); ctx.strokeStyle = 'rgba(14,20,27,.85)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
  }
  function drawParticles(dt) {
    ctx.globalCompositeOperation = 'lighter';
    for (const id in FLOW) {
      const fl = FLOW[id]; fl.on += (fl.target - fl.on) * Math.min(1, dt * 6); if (fl.on < .02) continue;
      if (!reduce) fl.phase += fl.dir * fl.speed * dt;
      const sp = sprite(fl.color), n = Math.max(2, Math.round(fl.tot / 1.15)), gap = fl.tot / n;
      for (let i = 0; i < n; i++) {
        const w = pointAt(fl, fl.phase + i * gap), c = toCam(w); if (c[2] < NEAR) continue; const p = proj(c), r = Math.max(5, .62 * F / c[2]);
        ctx.globalAlpha = .95 * fl.on; ctx.drawImage(sp, p[0] - r, p[1] - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ---- labels ---- */
  const LBL_H = [
    { id: 'pv', a: [0, 8.4, -1.2], t: 'Panel surya', modes: 3 }, { id: 'grid', a: [-11.2, 9.0, 2.6], t: 'Jaringan PLN', modes: 5 }, { id: 'meter', a: [-7.62, 2.7, 1.6], t: 'kWh meter', modes: 5 },
    { id: 'inverter', a: [-4.8, 3.65, -4.2], t: 'Inverter', modes: 7 }, { id: 'battery', a: [1.15, 2.95, -3.95], t: 'Baterai', modes: 6 }, { id: 'loads', a: [4.4, 3.75, -2.9], t: 'Beban', modes: 7 }, { id: 'monitor', a: [11.6, 4.3, 3.6], t: 'Monitoring', modes: 7 }
  ];
  let lblEls = {}, lblHost;
  function buildLabels() {
    lblHost.innerHTML = ''; lblEls = {}; MODEL.labels.forEach(l => { const b = document.createElement('button'); b.className = 'l3d'; b.type = 'button'; b.dataset.part = l.id; b.innerHTML = `<b>${l.t}</b><i></i>`; b.onclick = () => pick(l.id); lblHost.appendChild(b); lblEls[l.id] = b; });
  }
  function updateLabels() {
    const bit = S.mode === 'ongrid' ? 1 : S.mode === 'offgrid' ? 2 : 4;
    MODEL.labels.forEach(l => {
      const el = lblEls[l.id], c = toCam(l.a), show = (l.modes & bit) && c[2] > 1 && (!l.grp || selected === 'walkway' || selected === 'pipe' || selected === 'safety'); if (!show) { el.style.opacity = 0; el.style.pointerEvents = 'none'; return; }
      const p = proj(c); el.style.opacity = 1; el.style.pointerEvents = 'auto'; el.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) translate(-50%,-100%)`;
      el.classList.toggle('sel', selected === l.id); const v = S.labelVals[l.id]; const i = el.querySelector('i'); if (i.textContent !== (v || '')) i.textContent = v || '';
    });
  }

  /* ---- main draw ---- */
  let running = false, last = 0, objs = [];
  function draw(dt) {
    hits = []; frameId++; stepWeather(dt); computeEnv(); setupView();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, Hh);
    stepRain(dt); drawSky(); drawHills(); drawBolt(); drawGround(); drawShadows();
    const mark = box => box; // eslint placeholder
    // house layers: far wall below near wall
    const nearRight = cam.az >= 0;
    MODEL.house.forEach(s => s.faces.forEach(f => { if (f.cp) f.layer = cam.az >= 0 ? f.cl : f.cl - 4.2; else if (f.wall === 'AL') f.layer = cam.az < 0 ? 3.9 : 3.05; else if (f.wall) f.layer = (f.wall === 'R') === nearRight ? 3 : 1; }));
    const objects = [
      { c: MODEL.site.centers.house, run: () => { renderSolids(MODEL.house.concat(MODEL.extra).filter(o => S.hasBat || !MODEL.batteries.includes(o))); drawLines3D(); drawSpray(); } },
      { c: MODEL.site.centers.pole, run: () => { renderSolids(MODEL.pole); drawWires(); } },
      { c: MODEL.site.centers.phone, run: () => { renderSolids(MODEL.phone); drawWifi(); } }
    ].concat(MODEL.trees.map(t => ({ c: [t[0], 1, t[1]], run: () => drawTree(t) })));
    objects.forEach(o => o.d = toCam(o.c)[2]); objects.sort((a, b) => b.d - a.d); objects.forEach(o => o.run());
    drawTracks(); drawParticles(dt); drawGlare(); drawRain(dt);
    updateLabels();
  }
  function drawLines3D() {
    if (!MODEL.lines3d) return; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const L of MODEL.lines3d) {
      const sel = selected === L.part; ctx.strokeStyle = sel ? '#ffd24a' : L.col;
      for (let i = 0; i < L.pts.length - 1; i++) {
        const a = toCam(L.pts[i]), b = toCam(L.pts[i + 1]), p = clipNear([a, b]); if (p.length < 2) continue;
        const pa = proj(p[0]), pb = proj(p[1]); ctx.lineWidth = Math.max(1.6, L.w * F / ((a[2] + b[2]) / 2) * (sel ? 1.5 : 1));
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      }
    }
  }
  function drawSpray() {
    if (selected !== 'pipe' || !MODEL.nozzles) return;
    for (const nz of MODEL.nozzles) for (let i = 0; i < 6; i++) {
      const ph = (tNow * 1.25 + i / 6 + nz.k * .137) % 1, t = ph * .85;
      const w = [nz.p[0] + nz.v0[0] * t, nz.p[1] + nz.v0[1] * t - 4.9 * t * t, nz.p[2] + nz.v0[2] * t], c = toCam(w); if (c[2] < NEAR) continue;
      const q = proj(c), r = Math.max(1.6, .11 * F / c[2]); ctx.fillStyle = 'rgba(200,230,255,' + (.9 * (1 - ph * .65)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 7); ctx.fill();
    }
  }
  function drawWires() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    MODEL.wires.forEach((w, wi) => {
      if (wi >= 2 && S.mode === 'offgrid') return; const out = S.isOut && wi >= 2; ctx.strokeStyle = out ? 'rgba(10,14,18,.45)' : '#0e1217'; ctx.beginPath(); let started = false;
      for (const p of w) { const c = toCam(p); if (c[2] < NEAR) continue; const q = proj(c); if (!started) { ctx.moveTo(q[0], q[1]); started = true; } else ctx.lineTo(q[0], q[1]); }
      ctx.lineWidth = Math.max(1.2, .055 * F / toCam(w[Math.floor(w.length / 2)])[2]); ctx.stroke();
    });
    const c = toCam(MODEL.trLed.p); if (c[2] > NEAR) { const q = proj(c); ctx.fillStyle = S.isOut ? '#ff4d3f' : '#58f08c'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(2, .09 * F / c[2]), 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
    if (S.mode === 'offgrid') { const m = toCam(MODEL.site.xMark); if (m[2] > NEAR) { const q = proj(m), r = Math.max(6, .4 * F / m[2]); ctx.strokeStyle = '#ff7a6b'; ctx.lineWidth = Math.max(2, r * .35); ctx.beginPath(); ctx.moveTo(q[0] - r, q[1] - r); ctx.lineTo(q[0] + r, q[1] + r); ctx.moveTo(q[0] + r, q[1] - r); ctx.lineTo(q[0] - r, q[1] + r); ctx.stroke(); } }
    if (S.isOut && S.mode !== 'offgrid') { const m = toCam(MODEL.site.outLbl); if (m[2] > NEAR) { const q = proj(m); const k = F / m[2]; ctx.save(); ctx.translate(q[0], q[1] - k * .2); const pul = 1 + .05 * Math.sin(tNow * 6); ctx.scale(pul, pul); ctx.fillStyle = '#e5483b'; const w = 2.7 * k, h = .62 * k; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h, w, h, h / 2) : ctx.rect(-w / 2, -h, w, h); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(10, .36 * k)}px Figtree, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PLN PADAM', 0, -h / 2); ctx.restore(); } }
  }
  function drawWifi() {
    const c = toCam(MODEL.site.wifi); if (c[2] < NEAR) return; const q = proj(c), k = F / c[2]; ctx.lineCap = 'round'; ctx.strokeStyle = '#fdb813';
    for (let i = 0; i < 3; i++) { const ph = ((tNow * .9 + i * .33) % 1); ctx.globalAlpha = (1 - ph) * .85; ctx.lineWidth = Math.max(1.5, .09 * k); ctx.beginPath(); ctx.arc(q[0], q[1], (.35 + ph * 1.2) * k, -2.3, -.84); ctx.stroke(); } ctx.globalAlpha = 1;
  }
  function drawGlare() {
    const g = S.pvFrac !== undefined ? S.pvFrac : S.pv / 88; if (g < .05 || S.day < .3) return; const gl = MODEL.site.glare, c = toCam(gl.p), p = proj(c); const r = F / c[2] * gl.r;
    ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p[0], p[1], 2, p[0], p[1], r); gr.addColorStop(0, `rgba(255,240,200,${.16 * g})`); gr.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = gr; ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- interaction ---------------- */
  let dragging = false, moved = 0, lx = 0, ly = 0, vAz = 0, auto = true, idleT = 0, interactAt = -10, lastPick = null;
  function ptr(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (Hh / r.height)]; }
  function hitTest(x, y) {
    for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (inPoly(h.sp, x, y)) return h.part; } return null;
  }
  function inPoly(sp, x, y) { let c = false; for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) { if (((sp[i][1] > y) !== (sp[j][1] > y)) && (x < (sp[j][0] - sp[i][0]) * (y - sp[i][1]) / (sp[j][1] - sp[i][1]) + sp[i][0])) c = !c; } return c; }
  function pick(id) { if (api.onPick) api.onPick(id); focus(id); }
  function focus(id) { selected = id; const p = MODEL.presets[id]; if (p) Object.assign(tgt, p, { dist: p.dist * fitK() }); interactAt = tNow; }
  function fitK() { return clamp(1.875 / (W / Hh), 1, 2.6) ** .85; }
  function reset() { Object.assign(tgt, MODEL.home, { dist: MODEL.home.dist * fitK() }); selected = null; interactAt = tNow; if (api.onPick) api.onPick(null); }
  function bind() {
    cv.addEventListener('pointerdown', e => { dragging = true; moved = 0; [lx, ly] = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; interactAt = tNow; });
    cv.addEventListener('pointermove', e => {
      if (dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY; tgt.az = clamp(tgt.az - dx * .006, -1.0, 1.0); if (e.pointerType === 'mouse') tgt.el = clamp(tgt.el + dy * .004, .05, .9); interactAt = tNow; }
      else { const [x, y] = ptr(e); const h = hitTest(x, y); if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; } }
    });
    const end = e => { if (!dragging) return; dragging = false; cv.style.cursor = hover ? 'pointer' : 'grab'; if (moved < 6) { const [x, y] = ptr(e); const h = hitTest(x, y); if (h) pick(h); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { dragging = false; });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') tgt.az = clamp(tgt.az - .08, -1, 1); if (e.key === 'ArrowRight') tgt.az = clamp(tgt.az + .08, -1, 1); });
  }
  function resize() {
    const r = cv.getBoundingClientRect(); W = Math.max(300, r.width); Hh = Math.max(220, r.height); DPR = Math.min(2, window.devicePixelRatio || 1) * quality;
    cv.width = Math.round(W * DPR); cv.height = Math.round(Hh * DPR); if (selected === null) { tgt.dist = MODEL.home.dist * fitK(); cam.dist = tgt.dist; }
  }
  /* adaptive resolution: if the machine cannot hold ~30 fps the backing store is scaled down (never back up, so it cannot oscillate).
     Drawing is the main-thread cost, so a smaller canvas is what stops the page from freezing on weaker PCs */
  let quality = 1, rafId = 0, avgMs = 16, slowRun = 0;
  function adapt(ms) {
    if (ms > 200) { slowRun = 0; return; }                 // tab was hidden / debugger pause: not a real sample
    avgMs += (ms - avgMs) * .12;
    slowRun = avgMs > 36 ? slowRun + 1 : 0;
    if (slowRun > 30 && quality > .5) { quality = Math.max(.5, quality - .25); slowRun = 0; avgMs = 24; resize(); }
  }
  function frame(ts) {
    if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); adapt(ts - last); last = ts; tNow += dt;
    if (auto && !reduce && tNow - interactAt > 3.5 && !dragging && selected === null) tgt.az = MODEL.home.az + Math.sin(tNow * .28) * .32;
    const k = 1 - Math.pow(.0009, dt);
    for (const key of ['az', 'el', 'dist', 'tx', 'ty', 'tz']) cam[key] += (tgt[key] - cam[key]) * k;
    draw(dt); rafId = requestAnimationFrame(frame);
  }
  const api = {
    ok: false, onPick: null, _rl: RL, _wx: WX, _tick(dt) { tNow += dt; draw(dt); }, setCam(o) { Object.assign(tgt, o); selected = '_cam'; interactAt = tNow; },
    init(canvas, host, site) {
      try {
        cv = canvas; ctx = cv.getContext('2d'); if (!ctx) return false; lblHost = host; buildHouse(); buildFactory(); MODEL = MODELS[site || 'factory'] || MODELS.factory; Object.assign(cam, MODEL.home); Object.assign(tgt, MODEL.home); initFlows(); buildLabels(); bind(); resize(); computeEnv(); setupView();
        new ResizeObserver(() => { resize(); if (!running) { draw(0); } }).observe(cv); api.ok = true; draw(0); return true;
      } catch (err) { console.error('Scene3D init failed', err); return false; }
    },
    set(st) { Object.assign(S, st); if (!running) { WX.v = S.cloudy ? 1 : 0; stepWeather(0); } if (st.flows) Object.entries(st.flows).forEach(([id, f]) => { const fl = FLOW[id]; if (!fl) return; fl.target = f.on ? 1 : 0; fl.dir = f.dir; fl.color = f.color; fl.speed = 1.2 + Math.min(5, f.kw * .06); }); if (!running) { computeEnv(); draw(0); } },
    /* stop() cancels the pending frame: otherwise a quick stop() -> start() (slide change, scroll jitter) left two loops alive and each toggle added another */
    start() { if (running || !api.ok) return; running = true; last = performance.now(); avgMs = 16; slowRun = 0; cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(rafId); },
    resize() { resize(); if (!running && api.ok) draw(0); },
    setSite(name) {
      if (!MODELS[name] || MODEL === MODELS[name]) return; MODEL = MODELS[name]; selected = null; hover = null;
      Object.keys(FLOW).forEach(k => delete FLOW[k]); initFlows(); buildLabels();
      Object.assign(cam, MODEL.home, { dist: MODEL.home.dist * fitK() }); Object.assign(tgt, cam); interactAt = tNow; if (api.onPick) api.onPick(null);
      if (!running && api.ok) { computeEnv(); draw(0); }
    },
    focus, reset, select(id) { if (id) focus(id); else { selected = null; } },
    setAuto(v) { auto = v; interactAt = tNow; },
    isAuto() { return auto; }
  };
  window.Scene3D = api;
})();
