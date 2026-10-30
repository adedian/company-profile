/*
 * HME World - the scroll-driven 3D factory (own scene, built on hme-world-core.js).
 *
 * A modern production hall with a gable roof, glazed clerestory, canopy entrance and an office wing; a solar array that
 * is installed module by module; walkway, cleaning pipe, lifeline; DC trunk, inverters, transformer and utility pole; and a
 * full interior (steel frame, trusses, lights, walkway lanes, conveyor line, robot cells, racking, inverter + LVMDP room).
 *
 * draw(p) is a pure function of the scroll progress p (0..1): camera, sun, installation, power-on and machines all follow it.
 * window.HMEWorld.create(canvas, host, opts) -> { draw(p), resize(), dispose() }  (throws if WebGL2 is missing)
 */
(function () {
  'use strict';
  const { M, V, MB, Renderer, srgb, clamp, lerp, seg, ease, easeOut, easeInOut } = window.HMEW;
  const D2R = Math.PI / 180;

  /* ------------------------------------------------------------------ constants (metres) ---------------------- */
  const HX = 32, HZ = 20, EH = 10.5, TA = 6 * D2R, TH = Math.tan(TA), RY = EH + HZ * TH;
  const ROOF_Y = z => EH + (HZ - Math.min(Math.abs(z), HZ)) * TH;   // roof top surface height at z (slab centre line)
  const C = {
    wall: srgb('#e3e9ee'), wall2: srgb('#c8d2db'), plinth: srgb('#aab2b9'), navy: srgb('#104674'), navyD: srgb('#0a3055'), amber: srgb('#f59a1b'), sun: srgb('#fdb813'),
    steel: srgb('#c6d0d9'), steelD: srgb('#7c8a97'), dark: srgb('#252d38'), white: srgb('#f3f6f9'), conc: srgb('#9ea6ae'), green: srgb('#2c9f5e'), yellow: srgb('#f2b01e'),
    roof: srgb('#aab4be'), alu: srgb('#d5dce2'), orange: srgb('#ff7a1a'), red: srgb('#d23c3c'), blue: srgb('#2f63c9'), floor: srgb('#8a939b'), cart: srgb('#c9a577'), glass: srgb('#1b3347'),
    treeA: srgb('#2f6b2f'), treeB: srgb('#3f7f35'), trunk: srgb('#5a4330'), cable: srgb('#1a1f27'),
  };

  /* ------------------------------------------------------------------ camera timeline (p -> pose) --------------- */
  // [p, eye, target, fov(deg)]
  const KF = [
    [0.00, [-86, 56, 104], [6, 6, 6], 36],
    [0.06, [-66, 42, 92], [4, 7, 6], 36],
    [0.13, [-40, 33, 66], [0, 9, 4], 38],
    [0.20, [-24, 26, 46], [-4, 11, 6], 40],
    [0.28, [10, 24, 42], [-2, 11.5, 6], 40],
    [0.36, [34, 22, 36], [4, 11.5, 6], 40],
    [0.43, [10, 17.5, 28], [0, 11.3, 5], 42],
    [0.50, [-18, 15.5, 31], [6, 10.5, 12], 42],
    [0.56, [44, 9.5, 42], [28, 3.4, 22], 40],
    [0.62, [28, 4.6, 36], [27.2, 2.8, 21], 40],
    [0.67, [14, 4.4, 36], [8, 3.4, 19], 44],
    [0.72, [8, 3.5, 28], [8, 3.3, 8], 50],
    [0.78, [8, 3.3, 12], [4, 3.6, -6], 54],
    [0.84, [17, 3.5, 5], [22, 2.8, 15], 54],
    [0.92, [22, 3.2, 3], [24.5, 2.3, 18.4], 50],
    [1.00, [26.5, 3.0, 8.2], [24.0, 2.4, 18.6], 46],
  ];
  /* tangents are finite differences in p, so the camera speed is continuous across keyframes (no stutter) */
  const KT = KF.map((k, i) => {
    const a = KF[Math.max(0, i - 1)], b = KF[Math.min(KF.length - 1, i + 1)], dp = (b[0] - a[0]) || 1;
    const t = (j, c) => (b[j][c] - a[j][c]) / dp;
    return { eye: [t(1, 0), t(1, 1), t(1, 2)], tg: [t(2, 0), t(2, 1), t(2, 2)] };
  });
  const KTF = KF.map((k, i) => (KF[Math.min(KF.length - 1, i + 1)][3] - KF[Math.max(0, i - 1)][3]) / ((KF[Math.min(KF.length - 1, i + 1)][0] - KF[Math.max(0, i - 1)][0]) || 1));
  const herm = (y0, y1, m0, m1, h, u) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * m1; };
  function pose(p) {
    p = clamp(p, 0, 1); let i = 0; while (i < KF.length - 2 && p >= KF[i + 1][0]) i++;
    const k1 = KF[i], k2 = KF[i + 1], h = k2[0] - k1[0], u = clamp((p - k1[0]) / h, 0, 1);
    const v = (key, t) => [0, 1, 2].map(c => herm(k1[key][c], k2[key][c], KT[i][t][c], KT[i + 1][t][c], h, u));
    return { eye: v(1, 'eye'), tg: v(2, 'tg'), fov: herm(k1[3], k2[3], KTF[i], KTF[i + 1], h, u) * D2R };
  }

  /* ------------------------------------------------------------------ geometry -------------------------------- */
  /* wall made of pieces around openings. axis 'x': the wall runs along x at z=w ; axis 'z': runs along z at x=w. */
  function wallPieces(B, G, o) {
    const place = (u0, u1, v0, v1, w0, w1) => {
      const hu = (u1 - u0) / 2, hv = (v1 - v0) / 2, hw = (w1 - w0) / 2, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, cw = (w0 + w1) / 2;
      return o.axis === 'x' ? { c: [cu, cv, cw], h: [hu, hv, hw] } : { c: [cw, cv, cu], h: [hw, hv, hu] };
    };
    const solid = (u0, u1, v0, v1, mat, col, rough) => { if (u1 - u0 < .02 || v1 - v0 < .02) return; const q = place(u0, u1, v0, v1, o.w0, o.w1); B.style(col, mat, rough === undefined ? .5 : rough, 0).box(q.c, q.h, .03); };
    const [A0, A1] = o.span; const open = o.openings || [];
    // lower zone (y 0..4.6) minus openings
    let cur = A0; [...open].sort((a, b) => a[0] - b[0]).forEach(op => { solid(cur, op[0], 0, 4.6, 1, C.wall, .55); cur = op[1]; }); solid(cur, A1, 0, 4.6, 1, C.wall, .55);
    // clerestory band: piers + glass
    const bay = o.bay || 4, pw = .5;
    for (let u = A0; u < A1 - .01; u += bay) {
      solid(u, Math.min(u + pw, A1), 4.6, 6.9, 1, C.wall, .55);
      const g0 = u + pw, g1 = Math.min(u + bay, A1);
      if (g1 - g0 > .1) { const q = place(g0, g1, 4.6, 6.9, o.wg - .02, o.wg + .02); G.style(C.glass, 3, .05, 0).box(q.c, q.h, .005); }
    }
    solid(A1 - .001, A1, 4.6, 6.9, 1, C.wall, .55);
    // upper zone, accent band
    solid(A0, A1, 6.9, EH, 1, C.wall, .55);
    const nb = place(A0 - .06, A1 + .06, 7.9, 8.5, o.w1 - .02, o.w1 + (o.sgn || 1) * .1); B.style(C.navy, 0, .45, 0).box(nb.c, nb.h, .02);
    const ab = place(A0 - .06, A1 + .06, 7.55, 7.76, o.w1 - .02, o.w1 + (o.sgn || 1) * .11); B.style(C.amber, 0, .4, 0).box(ab.c, ab.h, .015);
  }

  function buildGround() {
    const b = new MB(); b.style([1, 1, 1], 5, .95, 0);
    const G = 700; b.quad([-G, 0, -G], [G, 0, -G], [G, 0, G], [-G, 0, G], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
    return b;
  }

  function buildSite(opts) {
    const B = new MB(), G = new MB(), D = new MB();   // opaque, glass(blend), decals(blend)
    /* --- foundations + shell --- */
    B.style(C.plinth, 2, .9, 0).box([0, .55, 0], [HX + .25, .55, HZ + .25], .06);                         // plinth slab (top y 1.1)
    // interior floor
    B.style(C.floor, 12, .3, 0).box([0, .6, 0], [HX - .35, .02, HZ - .35], .005);
    // front wall (z=+20): openings: roll-up door x -24..-12 (closed door drawn below), entrance x 4..12
    wallPieces(B, G, { axis: 'x', span: [-HX, HX], w0: HZ - .35, w1: HZ, wg: HZ - .17, sgn: 1, openings: [[-24, -12], [4, 12]] });
    wallPieces(B, G, { axis: 'x', span: [-HX, HX], w0: -HZ, w1: -HZ + .35, wg: -HZ + .17, sgn: -1 });
    wallPieces(B, G, { axis: 'z', span: [-HZ, HZ], w0: HX - .35, w1: HX, wg: HX - .17, sgn: 1, bay: 4 });
    wallPieces(B, G, { axis: 'z', span: [-HZ, HZ], w0: -HX, w1: -HX + .35, wg: -HX + .17, sgn: -1, bay: 4 });
    // roll-up door (closed) + frame
    B.style(C.steel, 0, .4, .5).box([-18, 2.3, HZ - .28], [6.15, 2.3, .06], .02);
    for (let i = 0; i < 9; i++) B.style(i % 2 ? C.white : C.alu, 6, .3, .6).box([-18, .55 + i * .5, HZ - .2], [5.9, .22, .035], .02);
    [-24.1, -11.9].forEach(x => B.style(C.steelD, 6, .4, .6).box([x, 2.4, HZ - .1], [.14, 2.45, .16], .02)); B.style(C.steelD, 6, .4, .6).box([-18, 4.7, HZ - .1], [6.2, .13, .16], .02);
    // entrance: lintel steel + canopy slab on rods, amber soffit light
    B.style(C.steelD, 6, .4, .6).box([8, 4.72, HZ - .12], [4.15, .13, .18], .02);
    B.style(C.white, 0, .35, .1).box([8, 5.35, HZ + 2.2], [6.2, .16, 2.4], .06);
    B.style(C.navy, 0, .4, 0).box([8, 5.2, HZ + 4.55], [6.2, .3, .08], .03);
    [[2.4, HZ + 4.2], [13.6, HZ + 4.2]].forEach(c => { B.style(C.steel, 6, .3, .7).cyl([c[0], 1.1, c[1]], .11, 0, 4.1, 14, undefined, false); B.sphere([c[0], 5.2, c[1]], .16, 8); });
    B.style(C.sun, 7, 1, 0).box([8, 5.17, HZ + 2.2], [5.6, .02, 1.9], .005); B.col = C.sun; B.par = [3.5, 0];
    // hazard threshold + entrance mat
    B.style(C.yellow, 12, .5, 0).box([8, 1.12, HZ + .5], [4, .015, .45], .003);
    /* --- roof: two slabs, ridge cap, fascia, gutters, vents, skylights --- */
    const L = (HZ + 1.3) / Math.cos(TA);
    [1, -1].forEach(s => {
      B.push().xf(M.T(0, EH + (HZ + 1.3) * TH * 0 + (RY - EH) * .0, 0));
      const zc = s * (HZ + 1.3) / 2, yc = (RY + (EH - 1.3 * TH)) / 2 + .0;
      B.pop().push().xf(M.mul(M.T(0, yc + .02, zc), M.RX(s * TA))).style(C.roof, 11, .5, .35).box([0, 0, 0], [HX + 1.25, .14, L / 2], .04);
      B.pop();
      B.style(C.alu, 6, .35, .8).tube([[-HX - 1.2, EH - 1.3 * TH - .3, s * (HZ + 1.3)], [HX + 1.2, EH - 1.3 * TH - .3, s * (HZ + 1.3)]], .13, 10, undefined, false);
      [-30, -10, 10, 30].forEach(x => B.style(C.alu, 6, .35, .8).tube([[x, EH - 1.3 * TH - .3, s * (HZ + 1.3)], [x, EH - 1.6, s * (HZ + 1.3)], [x, .2, s * (HZ + 1.3)]], .07, 8, undefined, false));
    });
    B.style(C.alu, 6, .3, .85).box([0, RY + .2, 0], [HX + 1.25, .12, .38], .05);
    // north slope: roof ventilators + skylight strips
    for (let i = 0; i < 6; i++) { const x = -26 + i * 10.4, z = -9, y = ROOF_Y(z) + .15; B.style(C.alu, 6, .3, .8).cyl([x, y, z], .55, 0, .5, 16).cyl([x, y + .5, z], .8, 0, .55, 18, .55).sphere([x, y + 1.1, z], .55, 8, .22, .55); }
    for (let i = 0; i < 5; i++) { const x = -26 + i * 13, z0 = -7, z1 = -16; const y0 = ROOF_Y(z0) + .16, y1 = ROOF_Y(z1) + .16; G.style(C.glass, 3, .05, 0).quad([x - 2.6, y0, z0], [x + 2.6, y0, z0], [x + 2.6, y1, z1], [x - 2.6, y1, z1]); B.style(C.alu, 6, .3, .8).tube([[x - 2.6, y0, z0], [x - 2.6, y1, z1]], .05, 6, undefined, false).tube([[x + 2.6, y0, z0], [x + 2.6, y1, z1]], .05, 6, undefined, false); }

    /* --- logo + contact shadows (decals, blended) --- */
    D.style([1, 1, 1], 10, .5, 0).quad([-30.5, 1.3, HZ + .02], [-26.5, 1.3, HZ + .02], [-26.5, 5.3, HZ + .02], [-30.5, 5.3, HZ + .02], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
    D.style([.55, 0, 0], 9, 1, 0);
    const shadowQuad = (cx, cz, rx, rz, k) => D.style([k, 0, 0], 9, 1, 0).quad([cx - rx, .03, cz - rz], [cx + rx, .03, cz - rz], [cx + rx, .03, cz + rz], [cx - rx, .03, cz + rz], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
    shadowQuad(0, 0, HX + 5, HZ + 5, .55);

    /* --- office wing (west, front) --- */
    B.style(C.wall, 1, .55, 0).box([-39, 3.75, 13], [7, 3.75, 7], .05);
    B.style(C.navyD, 0, .4, .2).box([-39, 7.65, 13], [7.3, .22, 7.3], .05);                           // roof edge
    B.style(C.roof, 0, .8, .1).box([-39, 7.5, 13], [6.9, .08, 6.9], .02);
    G.style(C.glass, 3, .05, 0).box([-39, 3.4, 20.02], [6.4, 2.35, .03], .005);                       // curtain wall
    for (let i = 0; i <= 8; i++) B.style(C.alu, 6, .3, .8).box([-45.4 + i * 1.6, 3.4, 20.08], [.05, 2.4, .05], .01);
    [1.9, 3.4, 4.9].forEach(y => B.style(C.alu, 6, .3, .8).box([-39, y, 20.08], [6.45, .04, .05], .01));
    B.style(C.navy, 0, .4, 0).box([-39, 6.6, 20.1], [7, .5, .04], .02);
    B.style(C.white, 0, .4, .1).box([-39, 5.6, 21.5], [3, .12, 1.4], .04); [[-41.6, 22.6], [-36.4, 22.6]].forEach(c => B.style(C.steel, 6, .3, .7).cyl([c[0], 1.1, c[1]], .08, 0, 4.4, 12));
    [[-42, 10], [-36, 10]].forEach(c => { B.style(C.steel, 6, .4, .6).box([c[0], 8.2, c[1]], [1.2, .55, .9], .1); B.style(C.dark, 13, .8, 0).cyl([c[0], 8.76, c[1]], .55, 0, .06, 18); });

    /* --- silos, tank, pipe rack (west / north) --- */
    [[-56, -12], [-56, -20]].forEach(c => { B.style(C.white, 6, .35, .55).cyl([c[0], 1.1, c[1]], 3.4, 0, 15, 36).sphere([c[0], 16.1, c[1]], 3.4, 12, 1.4, 3.4); B.style(C.steelD, 6, .4, .6).cyl([c[0], 16.1, c[1]], 3.5, -.1, .22, 36); B.style(C.steel, 6, .4, .6).box([c[0] + 3.6, 7, c[1]], [.12, 6.5, .35], .02); });
    B.style(C.steelD, 6, .4, .6).tube([[-52.7, 13, -12], [-52.7, 13, -16], [-HX - .2, 11.2, -16]], .28, 12);
    B.style(C.white, 6, .35, .55).cyl([-50, 6.2, 26], 3, 0, 6, 32).sphere([-50, 12.2, 26], 3, 10, 1, 3); [[-52, 24], [-48, 24], [-52, 28], [-48, 28]].forEach(c => B.style(C.steelD, 6, .4, .6).cyl([c[0], 1.1, c[1]], .18, 0, 5.2, 8));
    /* --- apron details: bollards, light poles, fence --- */
    for (let x = -40; x <= 40; x += 8) { B.style(C.yellow, 0, .5, 0).cyl([x, 1.1, HZ + 8], .12, 0, .8, 10); }
    [[-44, 40], [-14, 42], [18, 42], [48, 40]].forEach(c => { B.style(C.dark, 6, .4, .6).cyl([c[0], 0, c[1]], .16, 0, 10, 10).tube([[c[0], 10, c[1]], [c[0], 10.6, c[1] - 1.6]], .1, 8); B.style([1, 1, 1], 7, 1, 0).box([c[0], 10.55, c[1] - 1.8], [.3, .05, .6], .02); B.col = [1, .9, .7]; B.par = [4, 0]; });
    for (let x = -100; x <= 100; x += 5) B.style(C.steel, 6, .4, .6).cyl([x, 0, 46], .06, 0, 2.2, 8, undefined, false);
    B.style(C.steel, 6, .4, .6).tube([[-100, 2.1, 46], [100, 2.1, 46]], .035, 6, undefined, false).tube([[-100, 1.0, 46], [100, 1.0, 46]], .03, 6, undefined, false);

    /* --- electrical yard: transformer, pole, wires --- */
    B.style(C.conc, 2, .9, 0).box([50, .05, 32], [6.5, .05, 5.5], .02);
    B.style(C.steelD, 6, .4, .6).box([49, 1.7, 32], [1.9, 1.5, 1.4], .1);                              // transformer tank
    for (let i = 0; i < 8; i++) B.style(C.steel, 6, .4, .6).box([49 + 2.1, 1.7, 30.9 + i * .3], [.18, 1.2, .08], .02);
    [-1.2, 0, 1.2].forEach(dx => { B.style(C.white, 6, .15, .1).cyl([49 + dx, 3.15, 32], .16, 0, .35, 12, .28, false); for (let k = 0; k < 3; k++) B.cyl([49 + dx, 3.5 + k * .12, 32], .24 - k * .02, 0, .08, 14, undefined, false); });
    B.style(C.steel, 6, .4, .6).box([49, 3.1, 32], [1.7, .06, 1.2], .02);
    [[43.7, 28.2], [55.8, 28.2], [43.7, 36], [55.8, 36]].forEach(c => B.style(C.steelD, 6, .4, .6).cyl([c[0], 0, c[1]], .07, 0, 2.2, 8));
    B.style(C.steel, 6, .4, .6).tube([[43.7, 2, 28.2], [55.8, 2, 28.2], [55.8, 2, 36], [43.7, 2, 36], [43.7, 2, 28.2]], .03, 6, undefined, false);
    const POLE = [58, 0, 33];
    B.style(srgb('#6a5440'), 0, .85, 0).cyl([POLE[0], 0, POLE[2]], .26, 0, 14, 12).box([POLE[0], 13.2, POLE[2]], [.18, .14, 2.3], .03).box([POLE[0], 11.7, POLE[2]], [.18, .12, 1.9], .03);
    [-1.9, 0, 1.9].forEach(o => { B.style(C.white, 6, .15, .1).cyl([POLE[0], 13.3, POLE[2] + o], .06, 0, .3, 8); });
    [[-1.9], [0], [1.9]].forEach(([o]) => { B.style(C.cable, 6, .5, .3).tube([[POLE[0], 13.55, POLE[2] + o], [POLE[0] + 30, 13.0, POLE[2] + o], [POLE[0] + 60, 13.55, POLE[2] + o]], .035, 5, undefined, false); });
    B.style(C.cable, 6, .5, .3).tube([[49, 3.9, 32], [52, 8, 32.5], [POLE[0], 11.9, POLE[2]]], .045, 6, undefined, false);
    /* exterior inverters + DC trunk + AC feeder */
    [25.6, 28.6].forEach((x, i) => {
      B.style(C.white, 0, .3, .1).box([x, 2.15, HZ + .5], [1.0, 1.3, .35], .08);
      B.style(C.navy, 0, .4, .1).box([x, 3.45, HZ + .5], [1.04, .08, .38], .03);
      G.style(C.glass, 3, .05, 0).box([x, 2.4, HZ + .87], [.6, .35, .01], .002);
      B.style([1, 1, 1], 14, .4, 0).box([x, 2.4, HZ + .865], [.52, .28, .004], .001); B.mat = 14;
      for (let k = 0; k < 6; k++) B.style(C.steelD, 0, .6, .4).box([x, 1.2 + k * .09, HZ + .87], [.6, .02, .01], .004);
    });
    B.style(C.steelD, 6, .4, .6).box([27.1, 3.9, HZ + .45], [3.3, .08, .12], .02);
    B.style(C.alu, 6, .35, .8).tube([[27.1, EH - .2, HZ + .2], [27.1, 3.95, HZ + .38]], .1, 10, undefined, false);
    B.style(C.cable, 6, .5, .3).tube([[27.1, 1.1, HZ + .6], [27.1, .5, HZ + 4], [34, .15, 29.5], [46, .15, 31]], .07, 8);
    /* trees */
    return { B, G, D };
  }

  function buildTree() {
    const b = new MB(); b.style(C.trunk, 0, .9, 0).cyl([0, 0, 0], .28, 0, 3.2, 8, .16);
    b.style(C.treeA, 15, .97, 0).sphere([0, 5.2, 0], 2.7, 5, 3.1, 2.7).sphere([.9, 4.1, .3], 1.9, 4, 1.9, 1.8, C.treeB).sphere([-.9, 6.4, -.2], 1.7, 4, 1.9, 1.6, C.treeA);
    return b;
  }

  /* interior: frame, trusses, lights, floor markings, production line, robots (static parts), racking, electrical room */
  function buildInterior() {
    const B = new MB(), G = new MB(), L = [];
    const FL = 1.1;      // top of the slab
    // floor markings (on the epoxy slab at y 1.1)
    const mark = (cx, cz, sx, sz, col, mat) => B.style(col, mat || 12, .35, 0).box([cx, FL + .005, cz], [sx / 2, .012, sz / 2], .003);
    const lane = (cx, cz, sx, sz) => { mark(cx, cz, sx, sz, C.green); const e = .1; if (sx > sz) { mark(cx, cz - sz / 2 + e, sx, .12, C.white); mark(cx, cz + sz / 2 - e, sx, .12, C.white); } else { mark(cx - sx / 2 + e, cz, .12, sz, C.white); mark(cx + sx / 2 - e, cz, .12, sz, C.white); } };
    lane(8, 8.2, 2.6, 24); lane(2, -1.1, 54, 2.4); lane(17, 14.4, 22, 2.4);
    mark(8, 18.6, 8, .5, C.yellow);
    [[-8, -12.6], [8, -12.6], [24, -12.6]].forEach(c => { mark(c[0], c[1], 5.2, 4.4, C.yellow); mark(c[0], c[1], 4.9, 4.1, C.floor); });
    for (let i = 0; i < 9; i++) mark(23.5 + (i % 2 ? .35 : 0), 13.2 + i * .0, .5, .08, C.yellow);
    /* steel frame: columns + base plates + trusses + purlins */
    for (let x = -28; x <= 28; x += 8) {
      [-1, 1].forEach(s => {
        const z = s * (HZ - .85);
        B.style(C.navy, 6, .4, .5).box([x, (FL + EH - .6) / 2, z], [.17, (EH - .6 - FL) / 2, .17], .02);
        B.style(C.navy, 6, .4, .5).box([x, (FL + EH - .6) / 2, z], [.32, (EH - .6 - FL) / 2 * .0 + .02, .045], .01);
        B.style(C.steelD, 6, .4, .6).box([x, FL + .03, z], [.35, .03, .35], .01);
      });
      const e = EH - .75, r = RY - .85;
      [-1, 1].forEach(s => {
        B.style(C.alu, 6, .35, .75).bar([x, e, s * (HZ - .8)], [x, r, 0], .16, .2);
        B.style(C.alu, 6, .35, .75).bar([x, e - 1.2, s * (HZ - .8)], [x, r - 1.3, s * 3.2], .1, .12);
      });
      B.style(C.alu, 6, .35, .75).bar([x, e - 1.25, -HZ + .8], [x, e - 1.25, HZ - .8], .14, .16);
      [-14, -7, 0, 7, 14].forEach((z, i) => B.style(C.alu, 6, .35, .75).bar([x, e - 1.25, z], [x, ROOF_Y(z) - .55, z], .06, .06));
    }
    [-17, -13, -9, -5, -1, 1, 5, 9, 13, 17].forEach(z => B.style(C.steelD, 6, .45, .6).box([0, ROOF_Y(z) - .42, z], [HX - .4, .05, .05], .01));
    /* LED high-bay fixtures */
    for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 3; iz++) {
      const x = -28 + ix * 8 + 4, z = -10 + iz * 10, y = ROOF_Y(z) - 2.6;
      B.style(C.dark, 6, .4, .5).cyl([x, y, z], .05, .1, 2.2 - 0, 6, undefined, false); B.style(C.steelD, 6, .4, .6).cyl([x, y - .3, z], .42, 0, .3, 20, .22);
      B.style([1, .93, .78], 7, 1, 0).cyl([x, y - .31, z], .36, 0, .03, 20); B.par = [5.5, 0];
      L.push([x, y - .6, z]);
    }
    /* conveyor line (z=-6) */
    const cy = FL + .95;
    B.style(C.steel, 6, .4, .6).box([-1, cy - .2, -6 - .85], [24.5, .1, .06], .015).box([-1, cy - .2, -6 + .85], [24.5, .1, .06], .015);
    for (let i = 0; i <= 16; i++) { const x = -24 + i * 3; B.style(C.steelD, 6, .4, .6).box([x, (FL + cy - .2) / 2, -6 - .8], [.06, (cy - .2 - FL) / 2, .06], .01).box([x, (FL + cy - .2) / 2, -6 + .8], [.06, (cy - .2 - FL) / 2, .06], .01); }
    for (let i = 0; i < 80; i++) { const x = -23.6 + i * .6; B.style(C.alu, 6, .3, .85).push().xf(M.mul(M.T(x, cy, -6 - .78), M.RX(Math.PI / 2))).cyl([0, 0, 0], .075, 0, 1.56, 10, undefined, true).pop(); }
    B.style(C.dark, 13, .85, 0).box([-1, cy + .03, -6], [24.4, .02, .72], .01);
    /* robot cells: housings + guard glass + status towers + pedestals */
    [[-8, -12.6, C.navy], [8, -12.6, C.white], [24, -12.6, C.navy]].forEach(([x, z, col], i) => {
      B.style(col, 0, .25, .15).box([x, FL + 1.55, z - .3], [2.1, 1.45, 1.4], .12);
      B.style(C.alu, 6, .3, .7).box([x, FL + 3.1, z - .3], [2.0, .12, 1.3], .06);
      B.style(C.amber, 0, .4, .1).box([x, FL + .9, z + 1.12], [2.12, .12, .04], .015);
      B.style([1, 1, 1], 14, .4, 0).box([x - .8, FL + 2.2, z + 1.12], [.5, .32, .015], .004);
      B.style(C.steelD, 6, .4, .6).box([x + .5, FL + 3.25, z + .1], [.05, .35, .05], .01);
      B.style([.1, 1, .5], 7, 1, 0).cyl([x + .5, FL + 3.45, z + .1], .1, 0, .22, 12); B.par = [3.2, 0]; B.style([1, .55, .1], 7, 1, 0).cyl([x + .5, FL + 3.67, z + .1], .1, 0, .22, 12); B.par = [3.2, 0];
      G.style(C.glass, 3, .05, 0).box([x, FL + 1.6, z + 1.35], [2.15, 1.1, .02], .004);
      B.style(C.alu, 6, .3, .8).box([x, FL + 1.6, z + 1.37], [2.18, .04, .03], .006).box([x - 2.1, FL + 1.6, z + 1.37], [.04, 1.1, .03], .006).box([x + 2.1, FL + 1.6, z + 1.37], [.04, 1.1, .03], .006);
      B.style(C.steelD, 6, .4, .6).cyl([x, FL, z + 3], .5, 0, .35, 24, undefined, true);                // robot pedestal on the line side
    });
    /* pallet racking along the back wall */
    for (let b = 0; b < 5; b++) {
      const x0 = -27 + b * 6.2;
      [0, 5.6].forEach(o => B.style(C.amber, 6, .4, .3).box([x0 + o, FL + 2.6, -HZ + 1.5], [.07, 2.6, .07], .015));
      [1.2, 2.9, 4.6].forEach((h, i) => {
        B.style(C.navy, 6, .4, .3).box([x0 + 2.8, FL + h, -HZ + 1.5], [2.9, .08, .06], .015).box([x0 + 2.8, FL + h, -HZ + 2.2], [2.9, .08, .06], .015);
        for (let k = 0; k < 2; k++) { B.style(srgb('#8b6a45'), 0, .8, 0).box([x0 + 1.4 + k * 2.8, FL + h + .08, -HZ + 1.85], [1.2, .06, .62], .01); B.style((i + k) % 2 ? C.cart : C.white, 0, .7, 0).box([x0 + 1.4 + k * 2.8, FL + h + .62, -HZ + 1.85], [1.0, .45 - ((i + k) % 3) * .08, .55], .04); }
      });
    }
    /* electrical room (east, front): inverter + LVMDP + transformer cabinet, cable tray, partition, signs */
    const zc = HZ - .35 - .55;
    const cab = (x, w, col, doors) => {
      B.style(col, 0, .3, .2).box([x, FL + 1.45, zc], [w / 2, 1.45, .5], .05);
      B.style(C.steelD, 0, .5, .4).box([x, FL + .05, zc], [w / 2 + .03, .05, .53], .01);
      for (let d = 1; d < doors; d++) B.style(C.dark, 0, .6, 0).box([x - w / 2 + w * d / doors, FL + 1.45, zc - .505], [.012, 1.3, .004], .001);
    };
    cab(27, 3.2, C.white, 2); cab(22.4, 4.6, srgb('#7d8a96'), 4); cab(18.4, 2.6, srgb('#6b7886'), 2);
    B.style([1, 1, 1], 14, .4, 0).box([26.2, FL + 2.0, zc - .515], [.6, .36, .006], .001);
    B.style(C.navy, 0, .4, .1).box([27.6, FL + 1.6, zc - .512], [.9, .5, .006], .002); B.style(C.amber, 0, .4, .1).box([27, FL + 2.88, zc], [1.62, .05, .52], .01);
    [[21.1, 2.3], [23.7, 2.3]].forEach(([x, y]) => B.style([1, 1, 1], 14, .4, 0).box([x, FL + y, zc - .515], [.34, .22, .006], .001));
    [0, 1, 2, 3].forEach(k => B.style(k === 3 ? [1, .25, .2] : [.2, 1, .45], 7, 1, 0).box([20.9 + k * .26, FL + 1.1, zc - .515], [.05, .05, .006], .001));
    [1, 2, 3].forEach(k => { B.mat = 7; B.par = [3, 0]; });
    B.style(C.steelD, 6, .4, .6).box([24, FL + 3.35, zc + .1], [7.2, .06, .22], .015);                  // cable tray over the cabinets
    for (let i = 0; i < 24; i++) B.style(C.steelD, 6, .4, .6).box([17.2 + i * .3, FL + 3.35, zc + .1], [.015, .075, .21], .004);
    B.style(C.cable, 6, .5, .3).tube([[27.1, FL + 3.4, zc + .1], [27.1, EH - .8, HZ - .55]], .07, 8, undefined, false).tube([[20, FL + 3.4, zc + .1], [27.1, FL + 3.4, zc + .1]], .06, 6, undefined, false);
    B.style(C.yellow, 12, .5, 0).box([23, FL + .005, 16.0], [5.4, .012, .22], .003);
    /* hanging fixtures lights list */
    return { B, G, L };
  }

  /* ------------------------------------------------------------------ solar array (instanced) -------------------- */
  const COLS = 23, ROWS = 6, PW = 1.14, PL = 2.3, PG = .04;             // two bands of COLS modules, walkway gap in the middle
  const GAPX = 2.6, X0 = -((COLS * 2) * (PW + PG) + GAPX) / 2;
  const colX = c => X0 + (PW + PG) * (c + .5) + (c >= COLS ? GAPX : 0);
  const rowS = r => 1.9 + (PL + .1) * r + PL / 2 + (r >= 3 ? 1.1 : 0);    // distance down-slope from the ridge
  function buildPanel() {
    const b = new MB();
    b.style(C.alu, 6, .3, .85).box([0, 0, 0], [PW / 2, .022, PL / 2], .012);                           // frame body
    const iw = PW / 2 - .035, il = PL / 2 - .035;
    b.style([1, 1, 1], 4, .12, 0).quad([-iw, .0235, -il], [iw, .0235, -il], [iw, .0235, il], [-iw, .0235, il], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
    return b;
  }
  function panelMatrix(c, r, anim) {
    const x = colX(c), s = rowS(r);
    const y = RY - s * Math.sin(TA) + .38, z = s * Math.cos(TA);
    const lift = (1 - anim) * (18 + (c % 5) * .6), tw = (1 - anim) * (c % 2 ? .28 : -.22);
    let m = M.mul(M.T(x, y + lift * Math.cos(TA) , z - lift * Math.sin(TA) * 0 + (1 - anim) * (c % 3 - 1) * 1.6), M.mul(M.RX(TA), M.mul(M.RY(tw), M.RZ((1 - anim) * (r % 2 ? .12 : -.1)))));
    return m;
  }

  /* ------------------------------------------------------------------ the world --------------------------------- */
  function create(canvas, host, opts) {
    opts = opts || {};
    const R = new Renderer(canvas, { shadowSize: opts.shadowSize || 2048 });
    if (opts.logo) R.loadLogo(opts.logo);

    /* meshes */
    const ground = R.mesh(buildGround());
    const site = buildSite(opts), interior = buildInterior();
    const siteMesh = R.mesh(site.B), siteGlass = R.mesh(site.G), siteDecal = R.mesh(site.D);
    const inMesh = R.mesh(interior.B), inGlass = R.mesh(interior.G);
    const panelMesh = R.instanced(buildPanel(), COLS * 2 * ROWS);
    // trees
    const treeMesh = R.instanced(buildTree(), 220); { let n = 0; let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const put = (x, z, s) => { if (n >= 220) return; const m = M.mul(M.T(x, 0, z), M.mul(M.RY(rnd() * 6.28), M.S(s, s, s))); treeMesh.data.set(m, n * 20); treeMesh.data[n * 20 + 16] = 1; n++; };
      for (let x = -230; x <= 230; x += 13 + rnd() * 7) put(x + rnd() * 5, 78 + rnd() * 12, .9 + rnd() * .6);
      for (let i = 0; i < 80; i++) put((rnd() - .5) * 520, -50 - rnd() * 130, .9 + rnd() * .9);
      for (let i = 0; i < 40; i++) { const sd = rnd() < .5 ? -1 : 1; put(sd * (86 + rnd() * 130), (rnd() - .55) * 230, .9 + rnd() * .8); }
      R.setInstances(treeMesh, n); }
    // hills in the distance
    const hills = new MB(); [[-260, -300, 150, 46], [60, -330, 190, 58], [300, -280, 140, 40], [-60, 380, 160, 30], [330, 120, 120, 36], [-340, 60, 130, 38]].forEach(h => hills.style(srgb('#4c7a55'), 0, 1, 0).sphere([h[0], 0, h[1]], h[2], 10, h[3], h[2] * .9));
    const hillMesh = R.mesh(hills);

    /* groups with animated reveal */
    const gp = o => { const m = new MB(); o(m); return R.mesh(m); };
    const RAIL_Y = RY - 0 * 0;
    const rails = gp(m => { for (let r = 0; r < ROWS; r++) { [-1, 1].forEach(sd => { const s = rowS(r) + sd * .75, y = RY - s * Math.sin(TA) + .17, z = s * Math.cos(TA); m.style(C.alu, 6, .3, .85).box([0, y, z], [HX - 3.5, .035, .03], .008); }); } });
    const walkSlope = gp(m => {       // walkway tray down the slope, in the central gap
      const x = 0, s0 = .45, s1 = 17.5; const p0 = [x, RY - s0 * Math.sin(TA) + .26, s0 * Math.cos(TA)], p1 = [x, RY - s1 * Math.sin(TA) + .26, s1 * Math.cos(TA)];
      m.style(srgb('#b9bec3'), 6, .35, .85).push().xf(M.mul(M.T((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), M.RX(TA))).box([0, 0, 0], [.55, .04, (s1 - s0) / 2], .015).pop();
      for (let s = s0 + .3; s < s1 - .3; s += .5) m.style(srgb('#7d848a'), 6, .5, .6).push().xf(M.mul(M.T(x, RY - s * Math.sin(TA) + .31, s * Math.cos(TA)), M.RX(TA))).box([0, 0, 0], [.42, .012, .09], .004).pop();
      [-.58, .58].forEach(dx => m.style(C.yellow, 6, .4, .3).push().xf(M.mul(M.T(dx, (p0[1] + p1[1]) / 2 + .02, (p0[2] + p1[2]) / 2), M.RX(TA))).box([0, 0, 0], [.03, .05, (s1 - s0) / 2], .01).pop());
    });
    const walkAcross = gp(m => {      // horizontal walkway between the two bands
      const s = rowS(2) + PL / 2 + .55; const y = RY - s * Math.sin(TA) + .26, z = s * Math.cos(TA);
      m.style(srgb('#b9bec3'), 6, .35, .85).push().xf(M.mul(M.T(0, y, z), M.RX(TA))).box([0, 0, 0], [HX - 3.3, .04, .5], .015).pop();
      for (let x = -HX + 4; x < HX - 4; x += .5) m.style(srgb('#7d848a'), 6, .5, .6).push().xf(M.mul(M.T(x, y + .05, z), M.RX(TA))).box([0, 0, 0], [.09, .012, .4], .004).pop();
    });
    const pipe = gp(m => {            // cleaning water pipe with nozzles along the ridge side (bright blue, thick: it must read clearly from the air)
      const s = 1.1, y = RY - s * Math.sin(TA) + .55, z = s * Math.cos(TA);
      const PIPE_C = srgb('#14161a');
      m.style(PIPE_C, 6, .3, .05).tube([[-HX + 3.5, y, z], [HX - 3.5, y, z]], .13, 10, undefined, false);
      for (let x = -HX + 6; x < HX - 5; x += 6) { m.tube([[x, y, z], [x, y - .25, z + .28]], .07, 6, undefined, false); m.style(srgb('#9aa3ad'), 6, .35, .1).sphere([x, y - .3, z + .32], .13, 6); m.style(PIPE_C, 6, .3, .05); }
      m.style(PIPE_C, 6, .3, .05).tube([[-HX + 3.5, y, z], [-HX + 3.5, y - .9, z + 2.1]], .13, 10, undefined, false);
    });
    const safety = gp(m => {          // lifeline posts + rope along the eave (front slope)
      const s = rowS(ROWS - 1) + PL / 2 + 1.3, y = RY - s * Math.sin(TA), z = s * Math.cos(TA);
      for (let x = -HX + 1; x <= HX - 1; x += 6.2) m.style(C.blue, 6, .4, .5).cyl([x, y, z], .035, 0, 1.15, 8, undefined, false);
      m.style(srgb('#d63c3c'), 6, .5, .2).tube([[-HX + 1, y + 1.1, z], [HX - 1, y + 1.1, z]], .014, 5, undefined, false);
    });

    /* cable runs with reveal: [from, to] segments (world) */
    const CAB = [
      [[26.9, EH + .35, 6.5], [26.9, EH + .35, HZ - .2], C.cable, .06],                      // roof collector to the eave
      [[27.1, EH - .1, HZ + .2], [27.1, 3.9, HZ + .38], C.alu, .07],                          // down the wall to the inverters
      [[27.1, 1.1, HZ + .6], [27.1, .5, HZ + 4], C.cable, .07],
      [[27.1, .5, HZ + 4], [34, .2, 29.5], C.cable, .07],
      [[34, .2, 29.5], [46, .2, 31], C.cable, .07],
    ];
    const cabMeshes = CAB.map(c => gp(m => m.style(c[2], 6, .4, .5).tube([c[0], c[1]], c[3], 8, undefined, false)));
    /* moving things are drawn as instanced templates (a mat4 per object), so no geometry is generated per frame */
    const mkT = (build, cap) => { const m = new MB(); build(m); return R.instanced(m, cap); };
    const unitTube = (col, rough, metal) => mkT(m => m.style(col, 6, rough, metal).cyl([0, 0, 0], 1, 0, 1, 12, undefined, true), 4);
    const unitBall = (col, rough, metal, seg) => mkT(m => m.style(col, 6, rough, metal).sphere([0, 0, 0], 1, seg || 10), 4);
    const robLink = unitTube(C.orange, .3, .3), robArm = unitTube(C.alu, .3, .3), robJ = unitBall(C.orange, .3, .3), robT = unitBall(C.steelD, .4, .6, 8);
    const robStatic = R.mesh((() => { const m = new MB(); [[-8, -12.6], [8, -12.6], [24, -12.6]].forEach(([x, z]) => { const b = [x, 2.1, z + 3], j1 = [x, 3.2, z + 3];
      m.style(C.orange, 6, .3, .3).tube([b, j1], .2, 14, undefined, false).sphere(j1, .27, 10); m.style(C.navy, 6, .4, .3).cyl([b[0], b[1] - 1.0, b[2]], .38, 0, 1.0, 18); }); return m; })());
    const cartonMeshes = [0, 1, 2, 3].map(k => mkT(m => m.style(k < 2 ? C.cart : C.white, 0, .7, 0).box([0, 0, 0], [.5, .3 + (k % 2) * .08, .42], .05), 10));
    const fanMesh = mkT(m => m.style(C.steelD, 6, .4, .6).box([0, 0, 0], [.5, .015, .06], .005).box([0, 0, 0], [.06, .015, .5], .005), 6);
    const carBody = col => mkT(m => { m.style(col, 0, .25, .5).box([0, .65, 0], [2.2, .45, .95], .18).box([-.1, 1.2, 0], [1.2, .38, .85], .18).style(C.dark, 13, .8, 0);
      [[-1.4, .95], [-1.4, -.95], [1.4, .95], [1.4, -.95]].forEach(w => m.push().xf(M.mul(M.T(w[0], .38, w[1]), M.RX(Math.PI / 2))).cyl([0, 0, 0], .38, -.12, .12, 14).pop()); }, 1);
    const carA = carBody(srgb('#c9342f')), carB = carBody(srgb('#2a5ea8'));
    const carGlassMesh = mkT(m => m.style(C.glass, 3, .05, 0).box([-.1, 1.22, 0], [1.05, .3, .87], .08), 2);
    const put = (o, m) => { o.data.set(m, o.count * 20); o.data[o.count * 20 + 16] = 1; o.count++; };
    const spanM = (a, b, r) => { const d = V.sub(b, a), L = V.len(d), y = V.mul(d, 1 / (L || 1)), h = Math.abs(y[1]) > .95 ? [1, 0, 0] : [0, 1, 0], x = V.norm(V.cross(h, y)), z = V.cross(x, y);
      return [x[0] * r, x[1] * r, x[2] * r, 0, d[0], d[1], d[2], 0, z[0] * r, z[1] * r, z[2] * r, 0, a[0], a[1], a[2], 1]; };
    const ballM = (c, r) => [r, 0, 0, 0, 0, r, 0, 0, 0, 0, r, 0, c[0], c[1], c[2], 1];
    const instAll = [robLink, robArm, robJ, robT, ...cartonMeshes, fanMesh, carA, carB, carGlassMesh];
    let panelKey = -1, lastPanelN = 0;

    /* ---- beads along power paths ---- */
    const PATHA = [[26.9, EH + .45, 6.5], [26.9, EH + .45, HZ - .2], [27.1, EH - .1, HZ + .2], [27.1, 3.9, HZ + .38], [27.1, 1.2, HZ + .6], [27.1, .5, HZ + 4], [34, .25, 29.5], [46, .25, 31], [49, 3.2, 32], [52, 8, 32.5], [58, 11.9, 33]];
    const PATHB = [[27.1, EH - .8, HZ - .55], [27.1, 4.6, HZ - .9], [26.8, 4.5, HZ - .9], [24, 4.5, HZ - .9], [17.2, 4.5, HZ - .9]];
    const plen = pts => { const a = [0]; for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + V.len(V.sub(pts[i], pts[i - 1]))); return a; };
    const LA = plen(PATHA), LB = plen(PATHB);
    const at = (pts, len, d) => { d = clamp(d, 0, len[len.length - 1]); for (let i = 1; i < pts.length; i++) if (d <= len[i]) return V.lerp(pts[i - 1], pts[i], (d - len[i - 1]) / (len[i] - len[i - 1] || 1)); return pts[pts.length - 1]; };

    /* ---- callouts (DOM pills tied to 3D anchors) ---- */
    const callouts = [];
    const L = (i, fallback) => (opts.callouts && opts.callouts[i]) || fallback;   // texts come from the page (current language)
    const mk = (p0, p1, text, anchor, key) => { const el = document.createElement('div'); el.className = 'pi-c'; if (key) el.setAttribute('data-key', key); el.innerHTML = '<i></i><span></span>'; host.appendChild(el); callouts.push({ p0, p1, text, anchor, el, last: '' }); };
    mk(.02, .12, L(0, 'Pabrik dengan atap yang siap dipasangi PLTS'), [0, 12.5, 0]);
    mk(.17, .30, L(1, 'Modul surya dipasang satu per satu'), [-6, 12.6, 6]);
    mk(.335, .40, L(2, 'Jalur pejalan kaki dari aluminium yang antiselip'), [0, 11.9, 8]);
    mk(.385, .45, L(3, 'Pipa air untuk membersihkan panel'), [-16, 13.1, 1.1], 'pipe');
    mk(.43, .52, L(4, 'Tali pengaman (lifeline) di sekeliling atap'), [14, 10.9, 20.8]);
    mk(.54, .62, L(5, 'Kabel DC dan inverter'), [27.1, 3.6, HZ + .8]);
    mk(.58, .67, L(6, 'Trafo dan jaringan listrik'), [49, 3.9, 32]);
    mk(.66, .73, L(7, 'Pintu masuk pabrik'), [8, 5.6, HZ]);
    mk(.73, .82, L(8, 'Jalur pejalan kaki'), [8, 1.7, 10]);
    mk(.76, .86, L(9, 'Lini produksi'), [-4, 3.2, -6]);
    mk(.88, 1.01, L(10, 'Inverter'), [27, 5.2, HZ - .9]);
    mk(.9, 1.01, L(11, 'Panel distribusi (LVMDP)'), [22.4, 5.2, HZ - .9]);

    /* ---- pressed callouts: the camera flies to a close view of the part (same idea as the Company Profile model) ---- */
    const FOCUS = { pipe: { eye: [-4, 19.2, 15], tg: [3, 12.6, 1.5], fov: 40 * D2R } };
    let focusKey = null, focusK = 0, focusTarget = 0, spray = { on: 0, k: 0 }, lastNow = 0;
    function setFocus(key, sprayOn) { if (key && FOCUS[key]) { focusKey = key; focusTarget = 1; } else focusTarget = 0; spray.on = key && sprayOn ? 1 : 0; }
    const busy = () => focusK !== focusTarget || spray.k !== spray.on;
    function stepFocus() {
      const now = performance.now(), dt = lastNow ? Math.min(.05, (now - lastNow) / 1000) : 1 / 60; lastNow = now;
      const mv = (v, t, sec) => v < t ? Math.min(t, v + dt / sec) : Math.max(t, v - dt / sec);
      focusK = mv(focusK, focusTarget, 1.1); spray.k = mv(spray.k, spray.on, .5);
      if (!busy()) lastNow = 0;
    }

    /* ---- per-frame state ---- */
    let lastVP = null;
    const lightsList = interior.L;
    function sunAt(p) {
      const e = lerp(19, 52, easeOut(seg(p, 0, .3))) * D2R, az = -.5;
      const L = V.norm([Math.cos(e) * Math.sin(az), Math.sin(e), Math.cos(e) * Math.cos(az)]);
      const k = easeOut(seg(p, 0, .3));
      const col = [lerp(1, 1, k) * lerp(3.3, 3.6, k), lerp(.62, .93, k) * lerp(3.3, 3.6, k), lerp(.36, .85, k) * lerp(3.3, 3.6, k)];
      const top = [lerp(.02, .05, k), lerp(.05, .2, k), lerp(.16, .5, k)], hor = [lerp(.55, .62, k), lerp(.34, .78, k), lerp(.22, .95, k)];
      return { L, col, top, hor, amb: [lerp(.34, .42, k), lerp(.34, .5, k), lerp(.42, .68, k)], gnd: [lerp(.07, .12, k), lerp(.08, .15, k), lerp(.06, .1, k)] };
    }

    function build(p) {
      const sky = sunAt(p), pose_ = pose(p);
      const lampOn = easeOut(seg(p, .62, .7)), glow = easeOut(seg(p, .5, .6));
      const t = performance.now() / 1000;

      /* panels: staggered drop-in */
      const D = panelMesh.data; let n = 0;
      const pk = p < .16 ? 0 : p > .33 ? 2 : 1;
      if (pk !== 1 && pk === panelKey) n = lastPanelN;
      else { panelKey = pk;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS * 2; c++) {
        const st = .165 + .10 * (r / ROWS * .6 + (Math.abs(c - COLS) / COLS) * .4 + ((c * 7 + r * 3) % 5) * .012), a = easeOut(seg(p, st, st + .045));
        if (a <= 0.001) continue;
        const m = panelMatrix(c, r, a); D.set(m, n * 20); D[n * 20 + 16] = 1; n++;
      }
      R.setInstances(panelMesh, n); lastPanelN = n; }

      /* moving things: cartons on the belt, robot arms, roof fans, cars -> one matrix each, no geometry rebuilt */
      instAll.forEach(o => { o.count = 0; });
      const run = seg(p, .7, 1), phase = p * 36;
      const cy = 1.1 + .95;
      for (let i = 0; i < 10; i++) {
        const x = ((-22 + i * 4.6 + phase * 1.4 + 22) % 46) - 22;
        put(cartonMeshes[(i % 3 ? 0 : 2) + (i % 2)], M.T(x, cy + .32, -6));
      }
      [[-8, -12.6], [8, -12.6], [24, -12.6]].forEach(([x, z], i) => {
        const ph = (phase * .55 + i * 2.1), a1 = Math.sin(ph) * .55, a2 = Math.cos(ph * 1.3) * .5;
        const base = [x, 1.1 + 1.0, z + 3];
        const j1 = [base[0], base[1] + 1.1, base[2]];
        const j2 = [j1[0] + Math.sin(a1) * 1.5, j1[1] + 1.0 + Math.cos(a2) * .3, j1[2] - 1.0 - Math.cos(a1) * .4];
        const j3 = [j2[0] + Math.sin(a2) * .9, j2[1] - .9, j2[2] - .7];
        put(robLink, spanM(j1, j2, .15)); put(robJ, ballM(j2, .22)); put(robArm, spanM(j2, j3, .1)); put(robT, ballM(j3, .1));
      });
      for (let i = 0; i < 6; i++) { const x = -26 + i * 10.4, z = -9, y = ROOF_Y(z) + .15 + 1.0; put(fanMesh, M.mul(M.T(x, y, z), M.RY(t * 1.5 + i))); }
      // two cars on the road
      const carM = (x, z, dir) => M.mul(M.T(x, 0, z), M.RY(dir > 0 ? 0 : Math.PI));
      const m1 = carM(((p * 520 + 80) % 360) - 180, 55, 1), m2 = carM(180 - ((p * 380 + 40) % 360), 63.5, -1);
      put(carA, m1); put(carB, m2); put(carGlassMesh, m1); put(carGlassMesh, m2);
      instAll.forEach(o => R.setInstances(o, o.count));

      /* clips: reveal the installation items */
      const rl = easeOut(seg(p, .115, .19)), wv = easeOut(seg(p, .335, .385)), wh = easeOut(seg(p, .365, .42)), pp = easeOut(seg(p, .385, .45)), sf = easeOut(seg(p, .43, .52));
      const xClip = v => [1, 0, 0, v];
      const groups = [
        { mesh: ground, noShadow: true }, { mesh: hillMesh, noShadow: true }, { mesh: siteMesh }, { mesh: inMesh }, { mesh: treeMesh }, { mesh: panelMesh }, { mesh: robStatic, noShadow: true }, { mesh: robLink, noShadow: true }, { mesh: robArm, noShadow: true }, { mesh: robJ, noShadow: true }, { mesh: robT, noShadow: true }, ...cartonMeshes.map(m => ({ mesh: m, noShadow: true })), { mesh: fanMesh, noShadow: true }, { mesh: carA, noShadow: true }, { mesh: carB, noShadow: true },
        { mesh: rails, clip: xClip(lerp(-HX, HX, rl)) },
        { mesh: walkSlope, clip: [0, 0, -1, -lerp(HZ, 0, wv)] },
        { mesh: walkAcross, clip: xClip(lerp(-HX, HX, wh)) },
        { mesh: pipe, clip: xClip(lerp(-HX, HX, pp)) },
        { mesh: safety, clip: xClip(lerp(-HX, HX, sf)) },
        { mesh: siteGlass, blend: true }, { mesh: inGlass, blend: true }, { mesh: carGlassMesh, blend: true, noShadow: true }, { mesh: siteDecal, blend: true },
      ];
      const cabP = [seg(p, .5, .535), seg(p, .53, .56), seg(p, .55, .575), seg(p, .57, .6), seg(p, .595, .63)];
      CAB.forEach((c, i) => { const d = V.norm(V.sub(c[1], c[0])), L0 = V.len(V.sub(c[1], c[0])); groups.push({ mesh: cabMeshes[i], clip: [d[0], d[1], d[2], V.dot(d, c[0]) + L0 * easeOut(cabP[i])] }); });

      /* nearest interior lamps */
      const eye = pose_.eye; const near = lightsList.map(l => ({ l, d: V.len(V.sub(l, eye)) })).sort((a, b) => a.d - b.d).slice(0, 7);
      const lights = near.map(o => ({ p: o.l, rad: 15, c: [3.2, 2.9, 2.4] }));
      lights.push({ p: [27, 4.6, 16], rad: 11, c: [.6, 1.2, 1.4].map(v => v * 1.2) });

      /* particles: beads, lamp halos, twinkles */
      R.resetPoints();
      const flowA = seg(p, .535, .56) * (1 - seg(p, .74, .8) * .0), flowB = seg(p, .6, .64);
      if (flowA > 0) for (let i = 0; i < 40; i++) { const d = ((t * 5 + i * LA[LA.length - 1] / 40) % LA[LA.length - 1]); const q = at(PATHA, LA, d); R.point(q, .55, [1, .78, .28], .95 * flowA); R.point(q, 1.3, [1, .55, .15], .22 * flowA); }
      if (flowB > 0) for (let i = 0; i < 22; i++) { const d = ((t * 3.5 + i * LB[LB.length - 1] / 22) % LB[LB.length - 1]); const q = at(PATHB, LB, d); R.point(q, .4, [.5, 1, .9], .9 * flowB); }
      if (lampOn > .02) interior.L.forEach(l => R.point([l[0], l[1] + .25, l[2]], 2.8, [1, .93, .75], .5 * lampOn));
      if (glow > .05) for (let i = 0; i < 10; i++) { const c = (i * 7) % (COLS * 2), r = (i * 5) % ROWS, tw = Math.max(0, Math.sin(t * 3 + i * 2.3)); const s = rowS(r); R.point([colX(c), RY - s * Math.sin(TA) + .5, s * Math.cos(TA)], .5 + tw * 1.3, [1, .95, .8], .55 * tw * glow); }
      const sprayA = Math.max(seg(p, .43, .46) * (1 - seg(p, .5, .53)), easeInOut(spray.k));
      if (sprayA > 0) for (let x = -HX + 6; x < HX - 5; x += 6) for (let q = 0; q < 16; q++) { const ph = (t * 1.2 + q / 16 + x * .05) % 1; const s = 1.1 + ph * 3.2; R.point([x + (q - 2.5) * .06, RY - s * Math.sin(TA) + .55 - ph * ph * 1.8, s * Math.cos(TA)], 1.5 + ph * 1.1, [.45, .75, 1], 1 * (1 - ph * .5) * sprayA); }

      return { sky, pose: pose_, lampOn, glow, groups, lights, t, sunKey: easeOut(seg(p, 0, .3)) };
    }

    let heldShadowKey = null;
    function draw(p, fast) {
      const W = canvas.width, H = canvas.height; if (!W || !H) return;
      stepFocus();
      const S = build(p), sk = S.sky;
      let cam = S.pose;
      if (focusK > 0 && FOCUS[focusKey]) {
        const f = FOCUS[focusKey], k = easeInOut(focusK), mixv = (a, b) => [0, 1, 2].map(i => lerp(a[i], b[i], k));
        cam = { eye: mixv(cam.eye, f.eye), tg: mixv(cam.tg, f.tg), fov: lerp(cam.fov, f.fov, k) };
      }
      // fast scrolling: keep the last shadow map instead of re-rendering it every frame (it is refreshed as soon as the motion slows)
      const liveKey = Math.round(S.sunKey * 36) * 1000 + lastPanelN;
      if (!fast || heldShadowKey === null) heldShadowKey = liveKey;
      const info = R.render({
        cam: cam, sun: { dir: sk.L, col: sk.col }, sky: { top: sk.top, hor: sk.hor, gnd: sk.gnd, amb: sk.amb },
        fog: .0006, time: S.t, exposure: 1.08, shadowKey: heldShadowKey, lampOn: S.lampOn, panelGlow: S.glow, lights: S.lights, groups: S.groups, shadowCenter: [0, 4, 8], shadowExtent: 100,
      });
      lastVP = info.VP;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      callouts.forEach(c => {
        const a = Math.min(seg(p, c.p0, c.p0 + .012), 1 - seg(p, c.p1 - .012, c.p1));
        if (a <= .01) { if (c.shown) { c.el.style.opacity = 0; c.shown = false; } return; }
        const w = c.anchor, VP = lastVP, x = VP[0] * w[0] + VP[4] * w[1] + VP[8] * w[2] + VP[12], y = VP[1] * w[0] + VP[5] * w[1] + VP[9] * w[2] + VP[13], ww = VP[3] * w[0] + VP[7] * w[1] + VP[11] * w[2] + VP[15];
        if (ww <= 0) { c.el.style.opacity = 0; c.shown = false; return; }
        const sx = (x / ww * .5 + .5) * cw, sy = (1 - (y / ww * .5 + .5)) * ch;
        if (c.text !== c.last) { c.el.lastChild.textContent = c.text; c.last = c.text; c.sw = c.el.lastChild.offsetWidth; }
        const sw = c.sw || 0, off = sw ? Math.min(Math.max(sx - sw / 2, 10), Math.max(10, cw - sw - 10)) - (sx - sw / 2) : 0;
        if (off !== c.off) { c.el.lastChild.style.transform = off ? 'translateX(calc(-50% + ' + off.toFixed(1) + 'px))' : ''; c.off = off; }
        c.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)'; c.el.style.opacity = a.toFixed(2); c.shown = true;
      });
    }
    return { draw, setFocus, busy, dispose() { callouts.forEach(c => c.el.remove()); } };
  }

  window.HMEWorld = { create };
})();
