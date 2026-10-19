/* Presentation opening, real-time 3D (WebGL, no library): a pitched-roof factory gets a rooftop PLTS, start to finish.
   Orbit-style cinematic camera, depth-buffered lit geometry, planar shadows, procedural sky + ground, particles, animated crew and crane.
   Exposes window.HMEIntro3D.create(canvas, host, timeline) -> { draw(t), dispose() } or null when WebGL is unavailable. */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, k) => a + (b - a) * k;
  const eio = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const eout = k => 1 - Math.pow(1 - k, 3);
  const back = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const D2R = Math.PI / 180;
  const mixv = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
  const rgba = (c, a) => [c[0], c[1], c[2], a];
  const V3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)] };

  /* ---------- 4x4 column-major matrices ---------- */
  const M = {
    id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul: (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
    T: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
    RY: a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    RX: a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    RZ: a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    pt: (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]],
    persp: (fov, asp, n, f) => { const k = 1 / Math.tan(fov / 2); return [k / asp, 0, 0, 0, 0, k, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
    look: (e, t, up) => { const z = V3.norm(V3.sub(e, t)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x); return { m: [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V3.dot(x, e), -V3.dot(y, e), -V3.dot(z, e), 1], x, y, z }; }
  };

  /* ---------- geometry batches: pos3 nor3 col4 uv2 mat1 = 13 floats / vertex ---------- */
  const STRIDE = 13;
  function Batch(cap) { this.a = new Float32Array(cap * STRIDE); this.n = 0; this.buf = null; }
  Batch.prototype.reset = function () { this.n = 0; };
  function vert(b, p, n, c, u, v, m) {
    if ((b.n + 1) * STRIDE > b.a.length) return;
    const a = b.a, o = b.n * STRIDE;
    a[o] = p[0]; a[o + 1] = p[1]; a[o + 2] = p[2]; a[o + 3] = n[0]; a[o + 4] = n[1]; a[o + 5] = n[2];
    a[o + 6] = c[0]; a[o + 7] = c[1]; a[o + 8] = c[2]; a[o + 9] = c.length > 3 ? c[3] : 1; a[o + 10] = u; a[o + 11] = v; a[o + 12] = m; b.n++;
  }
  function tri(b, p0, p1, p2, col, mat, uv) {
    let n = V3.cross(V3.sub(p1, p0), V3.sub(p2, p0)); const l = V3.len(n); n = l > 1e-9 ? V3.mul(n, 1 / l) : [0, 1, 0];
    const u = uv || [0, 0, 1, 0, 1, 1];
    vert(b, p0, n, col, u[0], u[1], mat); vert(b, p1, n, col, u[2], u[3], mat); vert(b, p2, n, col, u[4], u[5], mat);
  }
  function quad(b, p0, p1, p2, p3, col, mat, uv) {
    const u = uv || [0, 0, 1, 0, 1, 1, 0, 1];
    tri(b, p0, p1, p2, col, mat, [u[0], u[1], u[2], u[3], u[4], u[5]]); tri(b, p0, p2, p3, col, mat, [u[0], u[1], u[4], u[5], u[6], u[7]]);
  }
  const dist = (a, b) => V3.len(V3.sub(a, b));
  function mquad(b, p0, p1, p2, p3, col, mat) { const a = dist(p0, p1), c = dist(p0, p3); quad(b, p0, p1, p2, p3, col, mat, [0, 0, a, 0, a, c, 0, c]); }
  const BOXF = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  function boxC(b, c, col, mat, skip) { BOXF.forEach((f, i) => { if (skip && skip.indexOf(i) >= 0) return; mquad(b, c[f[0]], c[f[1]], c[f[2]], c[f[3]], col, mat); }); }
  /* box occupying local x [-sx/2, sx/2], y [0, sy], z [-sz/2, sz/2] (sy may be negative to hang downward) */
  function box(b, m, sx, sy, sz, col, mat) {
    const x = sx / 2, z = sz / 2, P = (a, y, c) => M.pt(m, a, y, c);
    boxC(b, [P(-x, 0, -z), P(x, 0, -z), P(x, 0, z), P(-x, 0, z), P(-x, sy, -z), P(x, sy, -z), P(x, sy, z), P(-x, sy, z)], col, mat || 0);
  }
  const bx = (b, x, y, z, sx, sy, sz, col, mat) => box(b, M.T(x, y, z), sx, sy, sz, col, mat);
  function cyl(b, m, r, h, n, col, mat, r2) {
    const top = r2 === undefined ? r : r2, P = (a, y, rad) => M.pt(m, Math.cos(a) * rad, y, Math.sin(a) * rad);
    const cp = M.pt(m, 0, h, 0);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832;
      const p0 = P(a0, 0, r), p1 = P(a1, 0, r), p2 = P(a1, h, top), p3 = P(a0, h, top);
      quad(b, p0, p1, p2, p3, col, mat, [i / n, 0, (i + 1) / n, 0, (i + 1) / n, 1, i / n, 1]);
      if (top > .001) tri(b, p3, p2, cp, col, mat);
    }
  }
  function cone(b, m, r, h, n, col, mat) {
    const apex = M.pt(m, 0, h, 0);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832;
      tri(b, M.pt(m, Math.cos(a0) * r, 0, Math.sin(a0) * r), M.pt(m, Math.cos(a1) * r, 0, Math.sin(a1) * r), apex, col, mat, [0, 0, 0, 0, 0, 1]);
    }
  }
  /* thin square-section bar between two points */
  function bar(b, a, c, w, col, mat) {
    const d = V3.norm(V3.sub(c, a)), ref = Math.abs(d[1]) > .95 ? [1, 0, 0] : [0, 1, 0];
    const u = V3.mul(V3.norm(V3.cross(d, ref)), w / 2), v = V3.mul(V3.norm(V3.cross(d, u)), w / 2);
    const c8 = [V3.sub(V3.sub(a, u), v), V3.sub(V3.add(a, u), v), V3.add(V3.add(a, u), v), V3.add(V3.sub(a, u), v),
      V3.sub(V3.sub(c, u), v), V3.sub(V3.add(c, u), v), V3.add(V3.add(c, u), v), V3.add(V3.sub(c, u), v)];
    boxC(b, c8, col, mat || 0);
  }

  /* ---------- shaders ---------- */
  const HDR = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const NOISE = 'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' +
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}\n' +
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return s;}\n';
  const VS_MAIN = 'precision highp float;attribute vec3 aPos;attribute vec3 aNor;attribute vec4 aCol;attribute vec2 aUV;attribute float aMat;\n' +
    'uniform mat4 uVP;uniform float uTime;uniform float uShadow;uniform vec3 uL;uniform vec3 uPN;uniform float uPD;\n' +
    'varying vec3 vW;varying vec3 vN;varying vec4 vC;varying vec2 vUV;varying float vM;\n' +
    'void main(){vec3 p=aPos;\n' +
    ' if(aMat>4.5&&aMat<5.5){p.x+=sin(uTime*1.7+p.x*.35+p.z*.25)*.28*aUV.y;p.z+=cos(uTime*1.3+p.z*.3)*.16*aUV.y;}\n' +
    ' if(uShadow>.5){float k=(dot(uPN,p)-uPD)/dot(uPN,uL);p=p-uL*k+uPN*.04;}\n' +
    ' vW=p;vN=aNor;vC=aCol;vUV=aUV;vM=aMat;gl_Position=uVP*vec4(p,1.);}';
  const FS_MAIN = HDR + NOISE +
    'uniform vec3 uCam;uniform vec3 uL;uniform vec3 uSunC;uniform vec3 uSkyA;uniform vec3 uGndA;uniform vec3 uFog;uniform vec3 uSkyC;\n' +
    'uniform sampler2D uTex;uniform float uFogD;uniform float uSunI;uniform float uTime;uniform float uGlow;uniform float uLit;uniform float uLamp;uniform float uSweep;uniform float uShadow;\n' +
    'varying vec3 vW;varying vec3 vN;varying vec4 vC;varying vec2 vUV;varying float vM;\n' +
    'void main(){\n' +
    ' if(uShadow>.5){gl_FragColor=vec4(.015,.025,.07,.42);return;}\n' +
    ' float m=vM;\n' +
    ' if(m>8.5&&m<9.5){gl_FragColor=vC;return;}\n' +
    ' vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;\n' +
    ' vec3 base=vC.rgb;vec3 emit=vec3(0.);float spec=0.;float lightK=1.;float aT=1.;\n' +
    ' if(m>3.5&&m<4.5){\n' +
    '  vec2 w=vW.xz;float n1=vn(w*.3),n2=vn(w*1.9);\n' +
    '  vec3 grass=mix(vec3(.15,.27,.1),vec3(.27,.4,.16),n1*.7+n2*.3);\n' +
    '  vec3 conc=vec3(.6,.62,.64)*(.9+.1*n2);\n' +
    '  float ap=smoothstep(79.,76.,abs(w.x))*smoothstep(46.,43.,abs(w.y));\n' +
    '  float jx=abs(fract(w.x/8.+.5)-.5)*8.,jz=abs(fract(w.y/8.+.5)-.5)*8.;float jn=1.-smoothstep(0.,.12,min(jx,jz));\n' +
    '  conc*=1.-.22*jn;\n' +
    '  base=mix(grass,conc,ap);\n' +
    '  float rd=smoothstep(47.6,48.6,w.y)*smoothstep(61.,60.,w.y);\n' +
    '  vec3 asp=vec3(.19,.2,.22)*(.88+.12*n2);base=mix(base,asp,rd);\n' +
    '  float dash=(1.-smoothstep(.1,.16,abs(w.y-54.3)))*step(fract(w.x/9.),.45);\n' +
    '  float ed=(1.-smoothstep(.07,.12,abs(w.y-48.9)))+(1.-smoothstep(.07,.12,abs(w.y-59.7)));\n' +
    '  base=mix(base,vec3(.95,.8,.2),dash*rd);base=mix(base,vec3(.85),clamp(ed,0.,1.)*rd);\n' +
    '  float cur=smoothstep(45.,46.,w.y)*(1.-smoothstep(47.6,48.2,w.y));base=mix(base,vec3(.72,.73,.74),cur*.8);\n' +
    '  float dirt=smoothstep(15.,8.,length(w-vec2(-40.,30.)))*.4;base=mix(base,vec3(.42,.34,.25),dirt*(1.-rd));\n' +
    ' } else if(m>.5&&m<1.5){\n' +
    '  vec2 c=vUV*vec2(12.,6.);vec2 f=abs(fract(c)-.5);float line=smoothstep(.455,.5,max(f.x,f.y));\n' +
    '  vec3 deep=mix(vec3(.035,.085,.2),vec3(.06,.19,.42),uGlow);\n' +
    '  base=deep*(.82+.18*(1.-line))+vec3(.5,.62,.8)*line*.14;\n' +
    '  base+=vec3(.5,.62,.8)*(1.-smoothstep(.0,.03,abs(fract(c.x)-.5)))*.05;\n' +
    '  vec3 R=reflect(-V,N);float fr=pow(1.-max(dot(N,V),0.),3.);\n' +
    '  emit+=uSkyC*(.06+.3*fr);spec=pow(max(dot(R,uL),0.),90.)*.28;\n' +
    '  float band=1.-smoothstep(0.,.14,abs(vUV.x*.6+vUV.y*.55-uSweep));emit+=vec3(1.,.9,.6)*band*uGlow*.28;\n' +
    '  emit+=vec3(1.,.72,.2)*vC.r*.9;\n' +
    ' } else if(m>1.5&&m<2.5){\n' +
    '  vec2 g=abs(fract(vUV/vec2(2.4,1.5))-.5);float mull=1.-smoothstep(.0,.035,min(abs(g.x-.5)*2.,abs(g.y-.5)*2.));mull=0.;\n' +
    '  float fx=min(abs(fract(vUV.x/2.4)-.5),abs(fract(vUV.y/1.5)-.5));\n' +
    '  float frame=1.-smoothstep(.018,.03,min(fract(vUV.x/2.4),1.-fract(vUV.x/2.4)));\n' +
    '  vec3 glass=mix(vec3(.28,.42,.56),uSkyC*.8,.35);vec3 warm=vec3(1.,.82,.46);\n' +
    '  float lit=smoothstep(0.,1.,uLit-vC.a*.0);base=mix(glass,warm,lit);emit=warm*lit*.9;lightK=1.-lit*.6;base=mix(base,vec3(.93),frame*.9);\n' +
    '  vec3 R=reflect(-V,N);spec=pow(max(dot(R,uL),0.),40.)*.6*(1.-lit);\n' +
    ' } else if(m>2.5&&m<3.5){gl_FragColor=vec4(base,1.);return;\n' +
    ' } else if(m>5.5&&m<6.5){float tri=abs(fract(vUV.x/.3)-.5)*2.;base*=.9+.1*tri;\n' +
    ' } else if(m>6.5&&m<7.5){float tri=abs(fract(vUV.x/.4)-.5)*2.;base*=.88+.12*tri;spec=pow(max(dot(reflect(-V,N),uL),0.),24.)*.25;\n' +
    ' } else if(m>7.5&&m<8.5){float sl=abs(fract(vUV.y/.32)-.5)*2.;base*=.78+.22*smoothstep(.0,.8,sl);\n' +
    ' } else if(m>9.5&&m<10.5){float lp=uLamp;base=mix(vec3(.3),vec3(1.,.88,.55),lp);emit=vec3(1.,.8,.4)*lp*1.2;lightK=.4;\n' +
    ' } else if(m>4.5&&m<5.5){base*=.85+.3*vn(vW.xz*.9+vW.y*.4);\n' +
    ' } else if(m>10.5&&m<11.5){vec4 tx=texture2D(uTex,vUV);base=tx.rgb;aT=tx.a;emit=tx.rgb*.32;\n' +
    ' }\n' +
    ' float dif=max(dot(N,uL),0.);vec3 amb=mix(uGndA,uSkyA,N.y*.5+.5);\n' +
    ' vec3 col=base*(amb+uSunC*uSunI*dif)*lightK+spec*uSunC*uSunI+emit;\n' +
    ' float d=length(uCam-vW);float f=1.-exp(-d*uFogD);col=mix(col,uFog,f);\n' +
    ' gl_FragColor=vec4(col,vC.a*aT);}';
  const VS_SKY = 'attribute vec2 aP;varying vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,.9999,1.);}';
  const FS_SKY = HDR + NOISE +
    'uniform vec3 uCR;uniform vec3 uCU;uniform vec3 uCF;uniform float uTan;uniform float uAsp;uniform vec3 uTop;uniform vec3 uHor;uniform vec3 uL;uniform vec3 uSunC;uniform float uTime;uniform float uDay;\n' +
    'varying vec2 vP;\n' +
    'void main(){vec3 d=normalize(uCF+vP.x*uTan*uAsp*uCR+vP.y*uTan*uCU);\n' +
    ' float h=clamp(d.y,0.,1.);vec3 col=mix(uHor,uTop,pow(h,.5));\n' +
    ' float s=max(dot(d,uL),0.);col+=uSunC*(pow(s,5.)*.22+pow(s,80.)*.7);\n' +
    ' col=mix(col,uSunC*1.5,smoothstep(.9988,.9994,s));\n' +
    ' if(d.y>.005){vec2 p=d.xz/(d.y+.14)*1.5+vec2(uTime*.012,uTime*.004);float c=fbm(p);float cov=smoothstep(.5,.82,c)*smoothstep(.0,.2,d.y);\n' +
    '  vec3 cc=mix(vec3(.55,.5,.6),vec3(1.),uDay)*(.78+.22*smoothstep(.4,.8,fbm(p*1.7+3.)));cc+=uSunC*(.35*pow(s,3.));\n' +
    '  col=mix(col,cc,cov*.88);}\n' +
    ' gl_FragColor=vec4(col,1.);}';
  const VS_PT = 'attribute vec3 aPos;attribute float aSize;attribute vec4 aCol;uniform mat4 uVP;uniform float uScale;varying vec4 vC;\n' +
    'void main(){vec4 p=uVP*vec4(aPos,1.);gl_Position=p;gl_PointSize=clamp(aSize*uScale/max(p.w,.1),1.,160.);vC=aCol;}';
  const FS_PT = HDR + 'varying vec4 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.0,d);a*=a;gl_FragColor=vec4(vC.rgb,vC.a*a);}';

  /* ---------- scene constants (metres) ---------- */
  const HX = 30, HZ = 18, EAVE = 9, SLOPE = 10 * D2R, sA = Math.sin(SLOPE), cA = Math.cos(SLOPE), RIDGE = EAVE + HZ * Math.tan(SLOPE);
  const NRM = [0, cA, sA], PLANE_D = EAVE * cA + HZ * sA;
  const slopePt = (x, s, lift) => [x, EAVE + s * sA + cA * (lift || 0), HZ - s * cA + sA * (lift || 0)];
  const roofY = z => { const a = Math.abs(z); return a <= HZ ? EAVE + (HZ - a) * Math.tan(SLOPE) : EAVE; };
  const COLS = 14, ROWS = 6, PW = 3.35, PPX = 3.45, PL = 2.3, PPS = 2.45, S0 = .75, GAPX = 3.2, GAPS = 1.7, X0 = -(COLS * PPX + GAPX) / 2;
  /* the panel field has a vertical walkway gap in the middle and a horizontal one between the two bands */
  const colX = c => X0 + PPX * (c + .5) + (c >= COLS / 2 ? GAPX : 0), rowS0 = r => S0 + r * PPS + (r >= ROWS / 2 ? GAPS : 0), rowS = r => rowS0(r) + PL / 2;
  const SL = HZ / cA, XW = X0 + PPX * COLS / 2 + GAPX / 2, GSC = (S0 + 2 * PPS + PL + S0 + 3 * PPS + GAPS) / 2;
  const NPAN = COLS * ROWS, PER_LIFT = COLS * 2;
  const HERO = [21, 0, 28], PILOT = [-12, 0, 36], PAD = [-12, .22, 32.4], FLATBED = { x: -44, z: 38 }, PIVOT = [-37, 5.4, 27];
  const INV = [27, 2.15, 18.28], POLE = [55, 0, 24];
  const PATH = [[-24.6, EAVE + .25, 17.4], [27, EAVE + .25, 17.4], [27, 2.9, 18.4], [27, .12, 18.4], [27, .12, POLE[2]], [POLE[0], .12, POLE[2]], [POLE[0], 13.4, POLE[2]]];
  const PATH_LEN = []; let pathTotal = 0;
  PATH.forEach((p, i) => { if (i) pathTotal += dist(p, PATH[i - 1]); PATH_LEN.push(pathTotal); });
  const pathAt = d => { d = clamp(d, 0, pathTotal); for (let i = 1; i < PATH.length; i++) if (d <= PATH_LEN[i]) return V3.lerp(PATH[i - 1], PATH[i], (d - PATH_LEN[i - 1]) / (PATH_LEN[i] - PATH_LEN[i - 1] || 1)); return PATH[PATH.length - 1]; };

  const C = { wall: rgb('#dde4ea'), wall2: rgb('#c4cfd9'), navy: rgb('#104674'), amber: rgb('#f59a1b'), sun: rgb('#fdb813'), roof: rgb('#8e9ba7'), steel: rgb('#cfd8e0'), dark: rgb('#2b3643'), white: rgb('#f4f7fa'),
    yellow: rgb('#f2b01e'), yellowD: rgb('#c98f0e'), black: rgb('#1d252e'), conc: rgb('#a8b0b8'), vest: rgb('#ff7a1a'), hat: rgb('#fdd835'), skin: rgb('#e2ab82'), jeans: rgb('#26364d'), rub: rgb('#20262d') };

  function create(cv, host, T) {
    let gl = null;
    try { gl = cv.getContext('webgl', { antialias: true, stencil: true, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl', { antialias: true, stencil: true, alpha: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    function prog(vs, fs) {
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); p.u[info.name] = gl.getUniformLocation(p, info.name); }
      return p;
    }
    let PM, PS, PP;
    try { PM = prog(VS_MAIN, FS_MAIN); PS = prog(VS_SKY, FS_SKY); PP = prog(VS_PT, FS_PT); } catch (e) { if (window.console) console.warn('HME intro: WebGL shaders failed, using 2D', e); return null; }

    /* ---------- company logo texture (img/hme-logo.webp), used on the factory wall ---------- */
    const logoTex = gl.createTexture(); let texReady = false;
    gl.bindTexture(gl.TEXTURE_2D, logoTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([245, 154, 27, 255]));
    { const img = new Image(); img.onload = () => { try {
        const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(img, 0, 0, 512, 512);
        gl.bindTexture(gl.TEXTURE_2D, logoTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const ex = gl.getExtension('EXT_texture_filter_anisotropic'); if (ex) gl.texParameterf(gl.TEXTURE_2D, ex.TEXTURE_MAX_ANISOTROPY_EXT, 4);
        texReady = true; } catch (e) { texReady = false; } };
      img.src = 'img/hme-logo.webp'; }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /* ---------- batches ---------- */
    const B = { ground: new Batch(24), stat: new Batch(30000), plain0: new Batch(4000), sign: new Batch(2000), logo: new Batch(24), dyn: new Batch(14000), roof: new Batch(16000), plain: new Batch(18000), fx: new Batch(4000) };
    Object.keys(B).forEach(k => B[k].buf = gl.createBuffer());
    const skyBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const PCAP = 1600, ptA = new Float32Array(PCAP * 8), ptBuf = gl.createBuffer();
    let ptN = 0, ptSoft = 0;
    /* soft (alpha-blended) particles fill the array from the end, additive ones from the start */
    const part = (p, size, c, a, soft) => { if (ptN + ptSoft >= PCAP) return; const o = (soft ? PCAP - 1 - ptSoft++ : ptN++) * 8; ptA[o] = p[0]; ptA[o + 1] = p[1]; ptA[o + 2] = p[2]; ptA[o + 3] = size; ptA[o + 4] = c[0]; ptA[o + 5] = c[1]; ptA[o + 6] = c[2]; ptA[o + 7] = a; };

    /* ---------- static world ---------- */
    let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const lampPts = [], winPts = [];
    function buildStatic() {
      const g = B.ground, s = B.stat, p0 = B.plain0, sg = B.sign;
      const G = 900; quad(g, [-G, 0, -G], [G, 0, -G], [G, 0, G], [-G, 0, G], [1, 1, 1], 4);
      /* factory body */
      bx(s, 0, 0, 0, HX * 2, EAVE, HZ * 2, C.wall, 6);
      bx(s, 0, 0, 0, HX * 2 + .3, .5, HZ * 2 + .3, C.conc, 0);
      /* gable ends */
      [-1, 1].forEach(sd => { const x = sd * (HX + .02); tri(s, [x, EAVE, -HZ], [x, EAVE, HZ], [x, RIDGE, 0], C.wall2, 6, [0, 0, 36, 0, 18, 3.2]); });
      /* pitched roof */
      const ox = HX + .7, oz = HZ + .6, ez = EAVE - .6 * Math.tan(SLOPE);
      quad(s, [-ox, ez, oz], [ox, ez, oz], [ox, RIDGE + .05, 0], [-ox, RIDGE + .05, 0], C.roof, 7, [0, 0, 61, 0, 61, 18, 0, 18]);
      quad(s, [-ox, RIDGE + .05, 0], [ox, RIDGE + .05, 0], [ox, ez, -oz], [-ox, ez, -oz], C.roof, 7, [0, 0, 61, 0, 61, 18, 0, 18]);
      bx(s, 0, RIDGE - .05, 0, ox * 2, .35, .8, C.steel, 0);
      [-1, 1].forEach(sd => bx(s, 0, EAVE - .75, sd * (HZ + .55), ox * 2, .3, .35, C.steel, 0));
      /* navy + amber band under the eave */
      bx(s, 0, 7.9, HZ + .04, HX * 2 + .1, .65, .1, C.navy, 0); bx(s, 0, 7.55, HZ + .04, HX * 2 + .1, .2, .1, C.amber, 0);
      bx(s, HX + .04, 7.9, 0, .1, .65, HZ * 2 + .1, C.navy, 0); bx(s, HX + .04, 7.55, 0, .1, .2, HZ * 2 + .1, C.amber, 0);
      /* roller door + frame */
      bx(s, -16, 0, HZ + .05, 12.4, 5.9, .12, C.steel, 0);
      quad(s, [-21.8, 0, HZ + .13], [-10.2, 0, HZ + .13], [-10.2, 5.6, HZ + .13], [-21.8, 5.6, HZ + .13], rgb('#7a8794'), 8, [0, 0, 11.6, 0, 11.6, 5.6, 0, 5.6]);
      bx(s, 8, 0, HZ + .05, 7, 4.6, .12, C.steel, 0);
      quad(s, [4.6, 0, HZ + .13], [11.4, 0, HZ + .13], [11.4, 4.3, HZ + .13], [4.6, 4.3, HZ + .13], rgb('#7a8794'), 8, [0, 0, 6.8, 0, 6.8, 4.3, 0, 4.3]);
      /* ribbon windows (front + right) */
      for (let i = 0; i < 9; i++) { const x0 = -6 + i * 3.2; if (x0 + 2.4 > 24.5) continue; const z = HZ + .06; quad(s, [x0, 4.7, z], [x0 + 2.4, 4.7, z], [x0 + 2.4, 6.2, z], [x0, 6.2, z], rgb('#506b84'), 2, [0, 0, 2.4, 0, 2.4, 1.5, 0, 1.5]); winPts.push([x0 + 1.2, 5.45, z + .5]); }
      for (let i = 0; i < 9; i++) { const z0 = -14.5 + i * 3.4, x = HX + .06; quad(s, [x, 4.7, z0], [x, 4.7, z0 + 2.4], [x, 6.2, z0 + 2.4], [x, 6.2, z0], rgb('#506b84'), 2, [0, 0, 2.4, 0, 2.4, 1.5, 0, 1.5]); winPts.push([x + .5, 5.45, z0 + 1.2]); }
      /* fallback sign (hexagon + block letters), only shown if the logo texture cannot load */
      { const hz = HZ + .12, hc = [-24, 7.15], r = 1.25, pts = []; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; pts.push([hc[0] + Math.cos(a) * r, hc[1] + Math.sin(a) * r, hz]); }
        for (let i = 0; i < 6; i++) tri(sg, [hc[0], hc[1], hz], pts[i], pts[(i + 1) % 6], C.amber, 3);
        const L = (a, b) => bar(sg, [a[0], a[1], hz + .12], [b[0], b[1], hz + .12], .3, C.white, 3), x0 = -22, y0 = 6.4, h = 1.5, w = 1.2;
        L([x0, y0], [x0, y0 + h]); L([x0 + w, y0], [x0 + w, y0 + h]); L([x0, y0 + h / 2], [x0 + w, y0 + h / 2]);
        const mx = x0 + 1.7; L([mx, y0], [mx, y0 + h]); L([mx + 1.4, y0], [mx + 1.4, y0 + h]); L([mx, y0 + h], [mx + .7, y0 + h * .35]); L([mx + 1.4, y0 + h], [mx + .7, y0 + h * .35]);
        const ex = mx + 2.1; L([ex, y0], [ex, y0 + h]); L([ex, y0 + h], [ex + w, y0 + h]); L([ex, y0 + h / 2], [ex + w * .85, y0 + h / 2]); L([ex, y0], [ex + w, y0]); }
      /* the real PT Hexa Multi Energi logo on the front wall, left of the roller door */
      { const lx = -26, ly = 4.5, hs = 3.1, z = HZ + .045, L = B.logo; quad(L, [lx - hs, ly - hs, z], [lx + hs, ly - hs, z], [lx + hs, ly + hs, z], [lx - hs, ly + hs, z], [1, 1, 1, 1], 11, [0, 1, 1, 1, 1, 0, 0, 0]); }
      /* turbine vents on the back slope */
      for (let i = 0; i < 5; i++) { const x = -20 + i * 10, z = -4, y = roofY(z); cyl(s, M.T(x, y, z), .7, .9, 10, C.steel, 0); cyl(s, M.T(x, y + .9, z), .8, .7, 10, rgb('#aab6c1'), 0, .2); }
      /* chimney */
      cyl(s, M.T(-22, 0, -23), 1.5, 21, 12, rgb('#b4856b'), 0, 1.15); cyl(s, M.T(-22, 20, -23), 1.3, .5, 12, C.dark, 0, 1.3);
      bx(s, -22, 0, -20.6, 5, 4.5, 4, C.wall2, 6);
      /* silo pair */
      [-1, 1].forEach(sd => { cyl(s, M.T(38 + sd * 0, 0, -22 + sd * 5.2), 3.2, 11, 16, rgb('#e6ebef'), 0, 3.2); cyl(s, M.T(38, 11, -22 + sd * 5.2), 3.2, 1.6, 16, rgb('#cdd6dd'), 0, .4); });
      /* inverter + transformer cabinet */
      bx(s, INV[0], 1.5, HZ + .05, 1.3, 1.5, .25, C.steel, 0);
      bx(s, 40, 0, 20, 3.2, 2.6, 2.4, rgb('#9aa8b4'), 0); bx(s, 40, 2.6, 20, 3.5, .25, 2.7, C.dark, 0);
      /* utility pole with cross-arms + wires */
      /* a chain of utility poles, every span fully wired (no cable ends in mid-air) */
      const WOOD = rgb('#6a5440'), PXS = [-69, -7, POLE[0], 117, 179];
      PXS.forEach(x => { cyl(s, M.T(x, 0, POLE[2]), .28, 14, 8, WOOD, 0); bx(s, x, 13, POLE[2], .3, .3, 4.4, WOOD, 0); bx(s, x, 11.6, POLE[2], .3, .3, 3.6, WOOD, 0); });
      for (let i = 0; i < PXS.length - 1; i++) [-1.9, 0, 1.9].forEach(o => {
        const xa = PXS[i], xb = PXS[i + 1], n = 10; let prev = [xa, 13.3, POLE[2] + o];
        for (let k = 1; k <= n; k++) { const f = k / n, q = [lerp(xa, xb, f), 13.3 - Math.sin(Math.PI * f) * 1.1, POLE[2] + o]; p0 && bar(p0, prev, q, .06, C.black, 0); prev = q; }
      });
      /* street lamps along the apron */
      [[-52, 34], [-18, 40], [20, 40], [56, 34], [64, -10]].forEach(([x, z]) => { cyl(s, M.T(x, 0, z), .22, 9, 8, C.dark, 0); bar(s, [x, 9, z], [x, 9.2, z + 1.5], .2, C.dark, 0); bx(s, x, 8.8, z + 1.5, .9, .25, .5, rgb('#e8e4cc'), 10); lampPts.push([x, 8.7, z + 1.5]); });
      /* perimeter fence */
      for (let x = -76; x <= 76; x += 5) { bx(s, x, 0, 44, .18, 2.4, .18, C.steel, 0); }
      bar(s, [-76, 2.1, 44], [76, 2.1, 44], .1, C.steel, 0); bar(s, [-76, .9, 44], [76, .9, 44], .08, C.steel, 0);
      /* trees */
      const tree = (x, z, sc) => {
        const h = (5 + rnd() * 4) * sc, c1 = mixv(rgb('#2f6b2f'), rgb('#4f8d3a'), rnd()); const m = M.T(x, 0, z);
        cyl(s, m, .3 * sc, h * .45, 6, rgb('#5a4330'), 0);
        for (let k = 0; k < 3; k++) { const yy = h * (.3 + k * .24); const cc = c1.map((v, i) => i < 3 ? v * (.8 + k * .12) : 1); const cm = M.mul(M.T(x, yy, z), M.RY(rnd() * 6)); coneF(s, cm, (3.1 - k * .8) * sc, h * .5, 7, cc, yy / (h * 1.2)); }
      };
      const coneF = (b, m, r, h, n, col, y0) => { const apex = M.pt(m, 0, h, 0); for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832; tri(b, M.pt(m, Math.cos(a0) * r, 0, Math.sin(a0) * r), M.pt(m, Math.cos(a1) * r, 0, Math.sin(a1) * r), apex, col, 5, [0, y0, 0, y0, 0, y0 + 1]); } };
      for (let x = -170; x <= 170; x += 11 + rnd() * 6) tree(x + rnd() * 4, 68 + rnd() * 10, .9 + rnd() * .5);
      for (let i = 0; i < 70; i++) { const x = (rnd() - .5) * 360, z = -60 - rnd() * 110; tree(x, z, .9 + rnd() * .8); }
      for (let i = 0; i < 40; i++) { const side = rnd() < .5 ? -1 : 1, x = side * (84 + rnd() * 90), z = (rnd() - .6) * 200; if (z > 44 && z < 64) continue; tree(x, z, .9 + rnd() * .7); }
      /* flatbed truck carrying the pallets */
      truck(s, FLATBED.x, FLATBED.z);
      /* crane carrier (static part) */
      carrier(s);
    }
    function wheel(b, x, y, z, r) { cyl(b, M.mul(M.T(x, y, z - .35), M.RX(Math.PI / 2)), r, .7, 10, C.rub, 0); cyl(b, M.mul(M.T(x, y, z + (z > FLATBED.z ? .36 : -.37)), M.RX(Math.PI / 2)), r * .55, .05, 10, C.steel, 0); }
    function truck(b, x, z) {
      bx(b, x, 1.0, z, 14.5, .5, 3.1, C.dark, 0); bx(b, x + .3, 1.5, z, 12.6, .3, 3.0, rgb('#7b6b58'), 0);
      bx(b, x - 6.6, 1.0, z, 3.4, 2.6, 2.9, rgb('#e8eef3'), 0); bx(b, x - 7.5, 2.0, z, 1.3, 1.1, 2.7, rgb('#8fc4e6'), 0);
      [[-6.4, -1.55], [-6.4, 1.55], [3.2, -1.55], [3.2, 1.55], [5.2, -1.55], [5.2, 1.55]].forEach(([dx, dz]) => { cyl(b, M.mul(M.T(x + dx, 1.0, z + dz), M.RX(Math.PI / 2)), 1.0, .6, 10, C.rub, 0); });
    }
    function carrier(b) {
      const x = PIVOT[0], z = PIVOT[2];
      bx(b, x - 1, 1.1, z, 16, .9, 3.4, C.yellow, 0); bx(b, x - 1, 1.0, z, 16.2, .25, 3.5, C.black, 0);
      bx(b, x - 9.2, 1.2, z, 3.6, 2.8, 3.3, C.yellow, 0); bx(b, x - 10.1, 2.4, z, 1.4, 1.4, 3.1, rgb('#9fd6ef'), 0);
      [[-9.2, -1.7], [-9.2, 1.7], [-3, -1.7], [-3, 1.7], [1.8, -1.7], [1.8, 1.7], [5, -1.7], [5, 1.7]].forEach(([dx, dz]) => { cyl(b, M.mul(M.T(x + dx, 1.1, z + dz), M.RX(Math.PI / 2)), 1.1, .7, 10, C.rub, 0); });
    }

    /* ---------- crew ---------- */
    function person(b, x, y, z, yaw, o) {
      o = o || {}; const sc = o.sc || 1.45, ph = o.walk || 0, hold = o.hold || 0, base = M.mul(M.T(x, y, z), M.mul(M.RY(yaw), [sc, 0, 0, 0, 0, sc, 0, 0, 0, 0, sc, 0, 0, 0, 0, 1])), sw = Math.sin(ph) * .75 * (o.moving === false ? 0 : 1);
      const part = (jx, jy, jz, rx, sx, sy, sz, col, ry) => box(b, M.mul(base, M.mul(M.T(jx, jy, jz), M.mul(M.RY(ry || 0), M.RX(rx)))), sx, sy, sz, col, 0);
      const bob = o.moving === false ? 0 : Math.abs(Math.sin(ph)) * .04, vest = o.vest || C.vest;
      part(-.12, .88 + bob, 0, sw, .22, -.88, .26, C.jeans); part(.12, .88 + bob, 0, -sw, .22, -.88, .26, C.jeans);
      part(0, .88 + bob, 0, 0, .5, .64, .3, vest); part(0, 1.12 + bob, 0, 0, .52, .08, .32, rgb('#f6f27a'));
      const up = o.arm || 0;
      if (hold > .001) { part(-.33, 1.5 + bob, 0, -1.3 * hold, .14, -.6, .16, vest, .5 * hold); part(.33, 1.5 + bob, 0, -1.3 * hold, .14, -.6, .16, vest, -.5 * hold); }
      else { part(-.33, 1.5 + bob, 0, up ? -2.6 * up : -sw * .8, .14, -.6, .16, vest); part(.33, 1.5 + bob, 0, up ? -2.6 * up * (.8 + .2 * Math.sin(ph * 2)) : sw * .8, .14, -.6, .16, vest); }
      const hm = M.mul(base, M.mul(M.T(0, 1.52 + bob, 0), M.RX((o.headX !== undefined ? o.headX : .42 * hold) + Math.sin(ph * .5) * .02)));
      box(b, hm, .24, .26, .24, C.skin, 0); box(b, M.mul(hm, M.T(0, .22, 0)), .31, .14, .31, o.hat || C.hat, 0); box(b, M.mul(hm, M.T(0, .22, .08)), .29, .035, .34, o.hat || C.hat, 0);
      if (hold > .3 && o.item === 'rc') {
        const pm = M.mul(base, M.mul(M.T(0, 1.12 + bob, .56), M.RX(-.35)));
        box(b, pm, .34, .1, .14, rgb('#262d35'), 0); box(b, M.mul(pm, M.T(0, .1, 0)), .2, .014, .11, rgb('#0b1119'), 0);
        quad(b, M.pt(pm, -.09, .1145, -.05), M.pt(pm, .09, .1145, -.05), M.pt(pm, .09, .1145, .05), M.pt(pm, -.09, .1145, .05), [.35, .7, 1, 1], 3);
        bar(b, M.pt(pm, -.15, .1, 0), M.pt(pm, -.19, .22, .02), .04, C.black, 0); bar(b, M.pt(pm, .15, .1, 0), M.pt(pm, .19, .22, .02), .04, C.black, 0);
        return null;
      }
      if (hold > .3) {
        const pw = .15, plh = .3, pm = M.mul(base, M.mul(M.T(0, 1.17 + bob, .66), M.RX(.55)));
        box(b, pm, pw, plh, .018, rgb('#141b24'), 0);
        const zz = -.0105, sx = pw / 2 - .012; quad(b, M.pt(pm, -sx, .02, zz), M.pt(pm, sx, .02, zz), M.pt(pm, sx, plh - .02, zz), M.pt(pm, -sx, plh - .02, zz), [.42, .82, 1, 1], 3);
        return M.pt(pm, 0, plh / 2, -.03);
      }
      return null;
    }
    const drivePose = (t, k) => t * 7 + k * 2;

    /* ---------- DJI Mini 4K (scaled up so it reads on screen) ---------- */
    function droneModel(b, fxb, p, yaw, tilt, t, sc) {
      const m = M.mul(M.T(p[0], p[1], p[2]), M.mul(M.RY(yaw), M.mul(M.RX(tilt), [sc, 0, 0, 0, 0, sc, 0, 0, 0, 0, sc, 0, 0, 0, 0, 1])));
      const L = (x, y, z, sx, sy, sz, col, mat) => box(b, M.mul(m, M.T(x, y, z)), sx, sy, sz, col, mat || 0);
      L(0, -.045, 0, .11, .06, .17, rgb('#d6dade')); L(0, .012, -.01, .09, .018, .13, rgb('#aab1b8')); L(0, -.04, -.095, .09, .05, .035, rgb('#2c333b'));
      L(0, -.075, .09, .036, .04, .04, rgb('#171c22')); L(0, -.071, .112, .02, .02, .01, rgb('#05080c'));
      L(-.03, -.07, .0, .01, .03, .12, rgb('#c3c8ce')); L(.03, -.07, .0, .01, .03, .12, rgb('#c3c8ce'));
      const led = Math.sin(t * 8) > 0 ? rgb('#43e08a') : rgb('#1f6f44'); L(0, -.02, .088, .012, .012, .008, led, 3);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
        const ax = sx * .14, az = sz * .12;
        bar(b, M.pt(m, sx * .04, -.02, sz * .05), M.pt(m, ax, -.012, az), .022 * sc, rgb('#c3c8ce'), 0);
        cyl(b, M.mul(m, M.T(ax, -.03, az)), .02, .035, 8, rgb('#242b33'), 0);
        cyl(fxb, M.mul(m, M.mul(M.T(ax, .008, az), M.RY(t * 40 + i))), .085, .002, 16, [.9, .95, 1, .22], 9);
        bar(b, M.pt(m, ax - .085, .008, az), M.pt(m, ax + .085, .008, az), .006 * sc, rgb('#20262c'), 0);
      });
    }
    const catV = (keys, t) => { /* Catmull-Rom through [time, x, y, z] keys */
      let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
      const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)], u = clamp((t - k1[0]) / (k2[0] - k1[0]), 0, 1);
      return [1, 2, 3].map(j => catmull(k0[j], k1[j], k2[j], k3[j], u));
    };
    const SW = T.SW || 0;
    const DKEYS = [[0, PAD[0], PAD[1], PAD[2]], [1.0, PAD[0], PAD[1], PAD[2]], [1.7, -12, 2.4, 31.8], [2.6, -11.7, 7.6, 28.6], [SW, -10.6, 13.6, 24.6], [SW + 1, -10, 16, 22]];
    const droneAt = tr => tr < 1 ? PAD : catV(DKEYS, tr);

    /* ---------- env + camera ---------- */
    const KEYS = [
      [0, -49, 17, 48, 0, 10, 6, 40], [1.4, -30, 22, 58, 1, 10, 6, 40], [2.7, -10, 38, 92, 3, 10, 6, 36], [4.3, 30, 22, 86, -12, 11, 12, 36], [6.0, 16, 19, 66, -14, 11, 10, 34],
      [7.8, -6, 25, 76, -4, 11, 8, 36], [10.4, -26, 21, 78, 6, 10, 10, 36], [11.9, -50, 13, 56, 24, 5, 18, 38], [13.4, -30, 14, 42, 19, 3, 29, 36],
      [14.3, 8, 11, 24, 24, 2.2, 28, 36], [16.5, 42, 8, 14, 24, 1.9, 28, 34], [18.2, 54, 6, 9.5, 23.5, 1.8, 28, 32],
      [20.3, 30, 22, 120, 4, 10, 6, 40], [22.5, 10, 30, 165, 0, 9, 0, 40], [25.1, 12, 32, 200, 0, 9, 0, 40]];
    const catmull = (p0, p1, p2, p3, u) => .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    function orbitAt(t) {
      let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
      const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)], u = clamp((t - k1[0]) / (k2[0] - k1[0]), 0, 1), o = [];
      for (let j = 1; j < 8; j++) o.push(catmull(k0[j], k1[j], k2[j], k3[j], u));
      return o;
    }
    const poseOf = (o, sway, wob) => { const yaw = (o[0] + sway) * D2R, pitch = Math.max(8, o[1] + wob) * D2R, d = o[2], tg = [o[3], o[4], o[5]]; return { eye: [tg[0] + d * Math.cos(pitch) * Math.sin(yaw), tg[1] + d * Math.sin(pitch), tg[2] + d * Math.cos(pitch) * Math.cos(yaw)], tg, fov: o[6] * D2R, roll: 0 }; };
    const orbitPose = t => poseOf(orbitAt(t), Math.sin(t * .7) * .5, Math.sin(t * .9 + 1) * .3);
    /* shot 1: third person, behind the pilot (raw time). shot 2: the drone's own camera, ending on the cinematic roof framing */
    const PRE = T.PRE || 0, P0 = orbitPose(0);
    const CA = [[0, -19.5, 1.5, 42.8, -12.4, 2.1, 34, 52, 0], [1.2, -18.5, 2.0, 42.6, -12.2, 2.2, 33.4, 50, 0], [2.4, -15, 3.3, 42.5, -11.6, 6.5, 29, 40, 0], [SW, -14, 4.6, 42, -10.6, 13.2, 24.6, 38, 0], [SW + 1, -13, 5.4, 41.5, -10, 15, 22, 38, 0]];
    const D0 = DKEYS[4];
    const CB = [[SW, D0[1], D0[2], D0[3], -9, 11, 6, 66, 0], [SW + 1.4, -15, 17, 27, -6, 11, 8, 62, -.12], [SW + 2.9, -24, 21, 29.5, -2, 10, 6, 56, .08], [PRE, P0.eye[0], P0.eye[1], P0.eye[2], P0.tg[0], P0.tg[1], P0.tg[2], P0.fov / D2R, 0]];
    function track(keys, t) {
      let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
      const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)], u = clamp((t - k1[0]) / (k2[0] - k1[0]), 0, 1), o = [];
      for (let j = 1; j < 9; j++) o.push(catmull(k0[j], k1[j], k2[j], k3[j], u));
      return o;
    }
    function freeAt(t) {
      const tr = t + PRE, o = tr < SW ? track(CA, Math.min(tr, SW)) : track(CB, tr);
      /* gimbal-smooth: only a very slow, tiny drift (no high-frequency tremor), eased in from zero so the POV is steady from its first frame */
      const sh = tr < SW ? .5 : Math.min(1, (tr - SW) / 1.2), tt = tr;
      const n = [Math.sin(tt * .8) * .05 * sh, Math.sin(tt * 1.1 + 1) * .04 * sh, Math.sin(tt * .9 + 2) * .05 * sh];
      return { eye: [o[0] + n[0], o[1] + n[1], o[2] + n[2]], tg: [o[3], o[4], o[5]], fov: o[6] * D2R, roll: o[7] + Math.sin(tt * .6) * .003 * sh };
    }
    const camera = t => t < 0 ? freeAt(t) : orbitPose(t);

    /* ---------- callouts (DOM pills anchored to 3D points) ---------- */
    const callouts = [];
    const mkCallout = (t0, t1, text, anchor) => { const el = document.createElement('div'); el.className = 'pi-c'; el.innerHTML = '<i></i><span></span>'; host.appendChild(el); callouts.push({ t0, t1, text, anchor, el, last: '' }); };
    let curRaw = 0;
    mkCallout(-PRE + .5, -PRE + 2.5, 'Operator HME · drone DJI Mini 4K', () => [PILOT[0], 4.6, PILOT[2]]);
    mkCallout(-PRE + 2.2, -PRE + SW - .15, 'DJI Mini 4K naik ke atap', () => V3.add(droneAt(curRaw), [0, 2.2, 0]));
    mkCallout(T.SURVEY[0] + .3, T.SURVEY[1] + .2, 'Survei & pengukuran atap', () => [0, RIDGE + 3.4, 2]);
    mkCallout(T.RAILS[0] + .1, T.RAILS[1] + .2, 'Rail aluminium & klem', () => slopePt(-10, S0 + 3.3 * PPS, 1.8));
    mkCallout(T.LIFT0 + 1.0, T.WALK[0] + .6, t => 'Semua panel terpasang serentak  ' + installed(t) + ' / ' + NPAN, () => slopePt(0, 9, 4.6));
    mkCallout(T.WALK[0] + .3, T.WALK[1] + .3, 'Walkway aluminium anti-selip', () => slopePt(XW, 5, 2.6));
    mkCallout(T.PIPE[0] + .3, T.PIPE[1] + .3, 'Pipa air untuk cleaning panel', () => slopePt(-12, GSC, 2.6));
    mkCallout(T.SAFE[0] + .3, T.SAFE[1] + .4, 'Safety line (lifeline) keliling atap', () => slopePt(-27, 6, 3.2));
    mkCallout(T.CABLE[0] + .1, T.COMM[0] + .6, 'Kabel DC & inverter', () => [INV[0], 5.6, 19]);
    mkCallout(T.COMM[0] + .5, T.COMM[1] + .5, 'PLTS aktif · tersambung ke jaringan', () => [POLE[0] - 4, 15.4, POLE[2]]);
    let heroPhone = null;
    mkCallout(T.MON[0] + .4, T.MON[1] - .4, 'Dipantau real-time dari HP', () => heroPhone ? V3.add(heroPhone, [0, 1.0, 0]) : [HERO[0], 3.8, HERO[2]]);

    /* ---------- timeline helpers ---------- */
    const liftStart = k => T.LIFT0;
    const panelStart = (r, c) => T.LIFT0 + 1.1 + c * .012 + r * .02;
    const palletPos = k => [FLATBED.x + k * 4.4 + 1.5, 2.45, FLATBED.z];
    const landPos = k => { const p = slopePt(-27.3, S0 + (2 * k + 1) * 2.45, .6); return [p[0], p[1], p[2]]; };
    function installed(t) { let n = 0; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (t >= panelStart(r, c)) n++; return n; }
    function hookAt(t) {
      /* one lift carries all three pallets (spreader bar) to the roof */
      const up = [0, 2.8, 0], s = T.LIFT0, pp = palletPos(1), lp = landPos(1), H0 = V3.add(pp, up), H1 = [pp[0] + 3, 15, pp[2] - 3], H2 = [lp[0], lp[1] + 13, lp[2]], H3 = V3.add(lp, up), nx = [FLATBED.x + 3, 9, FLATBED.z - 2];
      if (t < s) return { p: H0, carry: false, k: 0 };
      if (t < s + .4) return { p: V3.lerp(H0, H1, eio(seg(t, s, s + .4))), carry: true, k: 0 };
      if (t < s + .85) return { p: V3.lerp(H1, H2, eio(seg(t, s + .4, s + .85))), carry: true, k: 0 };
      if (t < s + 1.1) return { p: V3.lerp(H2, H3, eio(seg(t, s + .85, s + 1.1))), carry: true, k: 0 };
      if (t < s + T.LIFT_GAP + 1.1) return { p: V3.lerp(H3, nx, eio(seg(t, s + 1.1, s + 1.1 + T.LIFT_GAP))), carry: false, k: 0 };
      return { p: nx, carry: false, k: 0 };
    }

    /* ---------- particles with state ---------- */
    let steam = [], puffs = [], spark = [], seen = new Set(), lastT = 0, landed = [false, false, false];
    function resetState() { steam = []; puffs = []; spark = []; seen = new Set(); landed = [false, false, false]; }


    /* ---------- walkway, cleaning water pipe and safety lifeline, installed after the panels ---------- */
    const WALKC = rgb('#a9b1ba'), WALKD = rgb('#6b7480'), PIPEC = rgb('#1b1f25'), PIPEL = rgb('#3a414a'), BLUEC = rgb('#3a7bff'), POSTC = rgb('#2f63c9');
    const sbox = (b, x0, x1, s0, s1, lift, th, col) => { const P = (x, ss, l) => slopePt(x, ss, l); boxC(b, [P(x0, s0, lift), P(x1, s0, lift), P(x1, s1, lift), P(x0, s1, lift), P(x0, s0, lift + th), P(x1, s0, lift + th), P(x1, s1, lift + th), P(x0, s1, lift + th)], col, 0); };
    const GAP_LO = S0 + 2 * PPS + PL, GAP_HI = S0 + 3 * PPS + GAPS, GAP_C = (GAP_LO + GAP_HI) / 2, XEND = -X0 + 1.2, RIDGE_S = SL - .9, EAVE_S = .45;
    const NOZ = [];
    [4, 10, 16, 22].forEach(x => [-x, x].forEach(xx => NOZ.push({ p: slopePt(xx, GAP_LO + .45, .55), d: 1 })));
    [5, 12, 19].forEach(x => [-x, x].forEach(xx => NOZ.push({ p: slopePt(xx, RIDGE_S, .55), d: -1 })));
    /* lifeline polyline: ridge-left -> eave-left -> eave-right -> ridge-right, posts about every 6.5 m */
    const SAFE = []; { const pts = [[-XEND, RIDGE_S - 1.5], [-XEND, EAVE_S], [XEND, EAVE_S], [XEND, RIDGE_S - 1.5]]; let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 6.5)); for (let k = (i ? 1 : 0); k <= n; k++) { const f = k / n; SAFE.push({ x: lerp(a[0], b[0], f), s: lerp(a[1], b[1], f), d: acc + len * f }); } acc += len; } SAFE.total = acc; }
    function accessories(t, rf, pl) {
      /* walkway: the vertical tray grows up the slope, then the horizontal one grows out from it */
      const wv = eout(seg(t, T.WALK[0], T.WALK[0] + (T.WALK[1] - T.WALK[0]) * .62)), wh = eout(seg(t, T.WALK[0] + (T.WALK[1] - T.WALK[0]) * .5, T.WALK[1]));
      if (wv > 0) {
        const s1 = lerp(EAVE_S, SL - 1.1, wv); sbox(rf, XW - .65, XW + .65, EAVE_S, s1, .1, .16, WALKC);
        for (let ss = EAVE_S + .35; ss < s1 - .3; ss += .6) sbox(rf, XW - .45, XW + .45, ss, ss + .22, .27, .02, WALKD);
        sbox(rf, XW - .65, XW - .55, EAVE_S, s1, .26, .06, rgb('#dde2e7')); sbox(rf, XW + .55, XW + .65, EAVE_S, s1, .26, .06, rgb('#dde2e7'));
      }
      if (wh > 0) { const hx = lerp(.7, XEND - .8, wh);
        [-1, 1].forEach(sg => { const xa = sg > 0 ? XW + .65 : XW - .65 - (hx - .65), xb = sg > 0 ? XW + .65 + (hx - .65) : XW - .65; sbox(rf, xa, xb, GAP_C - .55, GAP_C + .55, .1, .16, WALKC); for (let x = xa + .35; x < xb - .3; x += .6) sbox(rf, x, x + .22, GAP_C - .4, GAP_C + .4, .27, .02, WALKD); }); }
      /* cleaning pipe: riser, ridge main and feeder along the horizontal walkway, then nozzles */
      const pr = eout(seg(t, T.PIPE[0], T.PIPE[0] + (T.PIPE[1] - T.PIPE[0]) * .5)), pm = eout(seg(t, T.PIPE[0] + (T.PIPE[1] - T.PIPE[0]) * .35, T.PIPE[1] - .2));
      if (pr > 0) sbox(rf, XW - 1.25, XW - 1.03, EAVE_S, lerp(EAVE_S, RIDGE_S + .2, pr), .1, .2, PIPEC);
      if (pm > 0) { const hx = lerp(0, XEND - .6, pm); [-1, 1].forEach(sg => { const xa = sg > 0 ? XW - 1.03 : XW - 1.25 - hx, xb = sg > 0 ? XW - 1.03 + hx + 1.2 : XW - 1.25; sbox(rf, xa, xb, RIDGE_S - .1, RIDGE_S + .12, .1, .2, PIPEC); if (sg > 0 || true) sbox(rf, xa, xb, GAP_LO + .2, GAP_LO + .38, .1, .2, PIPEC); }); }
      const np = seg(t, T.PIPE[1] - .45, T.PIPE[1] + .2), spray = seg(t, T.PIPE[1] - .05, T.PIPE[1] + .4) * (1 - seg(t, T.COMM[0] - .2, T.COMM[0] + .5));
      NOZ.forEach((n, i) => { const k = back(clamp(np * 1.6 - i * .03, 0, 1)); if (k <= 0) return; const e = Math.min(1.1, k); box(rf, M.T(n.p[0], n.p[1] - .5, n.p[2]), .22 * e, .5 * e, .22 * e, PIPEL, 0);
        if (spray > .02) for (let q = 0; q < 4; q++) { const ph = (t * 1.25 + q / 4 + i * .17) % 1, ds = n.d * ph * 3.4, hh = ph * 2.2 - ph * ph * 2.6; part([n.p[0] + (q - 1.5) * .06, n.p[1] + ds * sA + hh * cA, n.p[2] - ds * cA + hh * sA + (q - 1.5) * .02], 1.5, [.78, .92, 1], .7 * (1 - ph) * spray); } });
      /* safety lifeline: blue posts pop up and the cable is drawn along them */
      const sk = eout(seg(t, T.SAFE[0], T.SAFE[1])), tip = sk * SAFE.total;
      let prev = null;
      SAFE.forEach(p => { if (tip < p.d) return; const h = clamp((tip - p.d) / 2.2, 0, 1), e = Math.min(1.1, back(h)); const b0 = slopePt(p.x, p.s, .1), tp = slopePt(p.x, p.s, .1 + 1.3 * e);
        bar(rf, b0, tp, .22, POSTC, 0); if (prev && h > .3) { const a = slopePt(prev.x, prev.s, 1.35), c = slopePt(p.x, p.s, .1 + 1.3 * Math.min(1, e)); bar(rf, a, V3.lerp(a, c, 1), .07, BLUEC, 0); } prev = p; });
      if (sk > 0 && sk < 1) { const nx = SAFE.find(p => p.d > tip), pv = SAFE.filter(p => p.d <= tip).pop(); if (nx && pv) { const f = (tip - pv.d) / (nx.d - pv.d), a = slopePt(pv.x, pv.s, 1.4), c = slopePt(nx.x, nx.s, 1.4); bar(rf, a, V3.lerp(a, c, f), .07, BLUEC, 0); } }
      /* crews that do each job */
      const crew = (a, b, x, ss, yaw, extra) => { if (t > a - .3 && t < b + .5) person(rf, x, slopePt(x, ss, .15)[1], slopePt(x, ss, .15)[2], yaw, Object.assign({ walk: t * 8, moving: t < b, arm: Math.max(0, Math.sin(t * 9)) * .5 }, extra || {})); };
      crew(T.WALK[0], T.WALK[1], XW + .1, lerp(EAVE_S, SL - 1.1, wv) + .5, Math.PI);
      crew(T.PIPE[0], T.PIPE[1], XW - 1.8, lerp(EAVE_S, RIDGE_S, pr) + .4, Math.PI);
      if (sk < 1) crew(T.SAFE[0], T.SAFE[1], clamp((SAFE.filter(p => p.d <= tip).pop() || SAFE[0]).x * 0.97, -XEND, XEND), (SAFE.filter(p => p.d <= tip).pop() || SAFE[0]).s + 1.0, Math.PI);
    }

    /* ---------- per-frame scene ---------- */
    function dynamic(t, day, dt, ta) {
      heroPhone = null;
      const d = B.dyn, rf = B.roof, pl = B.plain, fx = B.fx;
      d.reset(); rf.reset(); pl.reset(); fx.reset(); ptN = 0; ptSoft = 0;

      /* rails */
      for (let r = 0; r < ROWS; r++) [.45, 1.85].forEach((off, j) => {
        const k = eout(seg(t, T.RAILS[0] + r * .2 + j * .08, T.RAILS[0] + r * .2 + j * .08 + .75)); if (k <= 0) return;
        const xa = X0 - .2, xb = lerp(xa, -X0 + .2, k), s = rowS0(r) + off;
        bar(pl, slopePt(xa, s, .06), slopePt(xb, s, .06), .14, C.steel, 0);
        for (let c = 0; c <= COLS; c++) { const x = X0 + c * PPX; if (x > xb) break; const p = slopePt(x, s, .13); bx(pl, p[0], p[1] - .1, p[2], .22, .26, .22, C.amber, 0); }
      });

      /* panels */
      const sweep = ((t - T.COMM[0]) * .55) % 2.4 - .3, pm = [1, 0, 0, 0, 0, cA, sA, 0, 0, sA, -cA, 0];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const st = panelStart(r, c), k = seg(t, st, st + .34); if (k <= 0) continue;
        const e = Math.min(1.03, back(k)), lift = (1 - e) * 4.2, p = slopePt(colX(c), rowS(r), lift + .12);
        const m = [pm[0], pm[1], pm[2], 0, pm[4], pm[5], pm[6], 0, pm[8], pm[9], pm[10], 0, p[0], p[1], p[2], 1];
        const mm = k < 1 ? M.mul(m, M.RZ((1 - e) * .5)) : m;
        box(rf, mm, PW, .13, PL, C.steel, 0);
        const flash = k < 1 ? 1 - k : 0, h = .135, gx = PW / 2 - .07, gz = PL / 2 - .07;
        quad(rf, M.pt(mm, -gx, h, -gz), M.pt(mm, gx, h, -gz), M.pt(mm, gx, h, gz), M.pt(mm, -gx, h, gz), [flash, 0, 0, 1], 1, [0, 0, 1, 0, 1, 1, 0, 1]);
        if (!seen.has(r * COLS + c)) { seen.add(r * COLS + c); for (let q = 0; q < 2; q++) spark.push({ p: slopePt(colX(c) + (Math.random() - .5) * PW, rowS(r) + (Math.random() - .5) * PL, .3), v: [(Math.random() - .5) * 2, 2 + Math.random() * 3, (Math.random() - .5) * 2], a: 0, life: .7 + Math.random() * .5 }); }
      }

      accessories(t, rf, pl);

      /* crane */
      const hk = hookAt(t); const hp = hk.p || palletPos(0), tip = [hp[0], hp[1] + 9.5, hp[2]];
      const reach = dist(PIVOT, tip), dir = V3.norm(V3.sub(tip, PIVOT)), yaw = Math.atan2(tip[0] - PIVOT[0], tip[2] - PIVOT[2]);
      const out = eio(seg(t, T.RAILS[1] - .8, T.LIFT0 - .1));
      [-1, 1].forEach(sd => { bx(d, PIVOT[0] - 3, .6, PIVOT[2] + sd * (1.7 + out * 2.4), .6, .35, 1.2 + out * 4.8, C.yellowD, 0); cyl(d, M.T(PIVOT[0] - 3, 0, PIVOT[2] + sd * (1.7 + out * 4.4)), .55, .4 + out * .1, 8, C.dark, 0); bx(d, PIVOT[0] + 4, .6, PIVOT[2] + sd * (1.7 + out * 2.4), .6, .35, 1.2 + out * 4.8, C.yellowD, 0); cyl(d, M.T(PIVOT[0] + 4, 0, PIVOT[2] + sd * (1.7 + out * 4.4)), .55, .4 + out * .1, 8, C.dark, 0); });
      const tm = M.mul(M.T(PIVOT[0], 2.0, PIVOT[2]), M.RY(yaw));
      box(d, tm, 3.4, 2.6, 3.6, C.yellow, 0); box(d, M.mul(tm, M.T(0, 0, -1.2)), 3.0, 3.6, 1.4, C.yellowD, 0); box(d, M.mul(tm, M.T(.9, 1.4, 1.0)), 1.2, 1.2, 1.2, rgb('#9fd6ef'), 0);
      const sec = [[0, .42, 1.5, C.yellow], [.4, .72, 1.15, C.yellowD], [.7, 1.0, .85, C.yellow]];
      sec.forEach(([a0, a1, w, col]) => bar(d, V3.add(PIVOT, V3.mul(V3.sub(tip, PIVOT), a0)), V3.add(PIVOT, V3.mul(V3.sub(tip, PIVOT), a1)), w, col, 0));
      bx(d, tip[0], tip[1] - .5, tip[2], .8, 1, .8, C.dark, 0);
      bar(pl, tip, V3.add(hp, [0, .9, 0]), .07, C.black, 0);
      bx(d, hp[0], hp[1], hp[2], .9, .9, .6, rgb('#e34234'), 0);
      /* pallets on the flatbed / on the hook (all three together) / on the roof */
      const pallet = (c, rem) => { const hgt = .25 + .85 * rem; bx(d, c[0], c[1] - .55, c[2], 2.9, .22, 1.7, rgb('#8a6a45'), 0); if (rem > 0) { for (let i = 0; i < 4; i++) bx(d, c[0], c[1] - .33 + i * hgt / 4, c[2], 2.6, hgt / 4 - .02, 1.4, i % 2 ? rgb('#12356a') : rgb('#15407e'), 0); } };
      const s0 = T.LIFT0, lp1 = landPos(1);
      for (let k = 0; k < 3; k++) {
        const pp = palletPos(k), lp = landPos(k), off = V3.sub(lp, lp1);
        if (t < s0) pallet(pp, 1);
        else if (t < s0 + 1.1) { const c = V3.add([hp[0], hp[1] - 2.8, hp[2]], off); pallet(c, 1); [[-1.3, -.7], [1.3, -.7], [-1.3, .7], [1.3, .7]].forEach(o => bar(pl, V3.add(hp, [0, -.45, 0]), [c[0] + o[0], c[1] + .55, c[2] + o[1]], .05, C.black, 0)); }
        else { const rem = 1 - installed(t) / NPAN; if (rem > .001) pallet(lp, rem); }
        if (t >= s0 + 1.05 && !landed[k]) { landed[k] = true; for (let q = 0; q < 14; q++) puffs.push({ p: [lp[0] + (Math.random() - .5) * 3, lp[1] - .3, lp[2] + (Math.random() - .5) * 2], v: [(Math.random() - .5) * 3, .8 + Math.random(), (Math.random() - .5) * 3], a: 0, life: 1 + Math.random() }); }
      }
      if (t >= s0 && t < s0 + 1.1) { const c0 = V3.add([hp[0], hp[1] - 2.8, hp[2]], V3.sub(landPos(0), lp1)), c2 = V3.add([hp[0], hp[1] - 2.8, hp[2]], V3.sub(landPos(2), lp1)); bar(pl, V3.add(c0, [0, 1.2, 0]), V3.add(c2, [0, 1.2, 0]), .14, C.black, 0); }

      /* crew */
      const sig = t > T.LIFT0 - .8 && t < T.LIFT0 + 2.6;
      person(d, -33, 0, 33, .6 + Math.sin(t * .8) * .3, { walk: 0, moving: false, arm: sig ? Math.max(0, Math.sin(t * 4)) * .5 + .3 : 0 });
      for (let k = 0; k < 3; k++) { if (t > T.LIFT0 - .9 && t < T.LIFT0 + .35) { const pp = palletPos(k); person(d, pp[0] + 2.2, 1.55, pp[2] + 1.5, 3.9, { moving: false, arm: .45 }); } }
      /* surveyor holding the drone controller */
      
      /* roof installers: three people at the eave guide all panels down together */
      if (t > T.LIFT0 + .6 && t < T.LIFT0 + 3.2) [-19, 0, 19].forEach((x, j) => { const p = slopePt(x, rowS(0) - 1.6, .15); person(rf, p[0], p[1], p[2], 3.2 + Math.sin(t + j) * .1, { moving: false, arm: .35 + Math.max(0, Math.sin(t * 7 + j)) * .4 }); });
      /* rail crew */
      for (let j = 0; j < 2; j++) { const a = T.RAILS[0] + j * .3, b = T.RAILS[1] + .2; if (t > a && t < b) { const q = seg(t, a, b), x = lerp(X0, -X0, eio(q)), p = slopePt(x, S0 - .45 + j * 5.3, .15); person(rf, p[0], p[1], p[2], 1.57, { walk: t * 8, moving: true }); } }
      /* electrician + cheering crew */
      if (t > T.CABLE[0] && t < T.COMM[0] + .1) person(d, INV[0] - 1.6, 0, 20.4, 4.2, { moving: false, arm: .3 + Math.max(0, Math.sin(t * 6)) * .2 });
      /* opening: the pilot flies a DJI Mini 4K, the drone takes off from the pad and leaves for the roof */
      if (ta < SW) { const lean = .3 * seg(ta, 1.5, 3.2), p = droneAt(ta), bob = ta > 1 ? Math.sin(ta * 4) * .08 * seg(ta, 1, 1.8) : 0; droneModel(d, fx, [p[0], p[1] + bob, p[2]], Math.PI, lean, ta, 6); }
      person(d, PILOT[0], 0, PILOT[2], Math.PI, { moving: false, item: 'rc', hold: eio(seg(ta, .1, .8)) * (1 - seg(t, 2.6, 3.3)), headX: lerp(.4, -.42, eio(seg(ta, 1.0, 2.8))), vest: C.vest });
      /* the person who keeps an eye on the plant from a phone */
      if (t > T.RAILS[0]) heroPhone = person(d, HERO[0], 0, HERO[2], Math.PI, { moving: false, hold: eio(seg(t, T.COMM[1] - .4, T.MON[0] + .3)), vest: rgb('#104674'), hat: C.white, walk: t });
      const cheer = seg(t, T.COMM[0] + .2, T.COMM[0] + .6) * (1 - seg(t, T.COMM[1] + .4, T.COMM[1] + .9));
      [[5.5, 31], [7.6, 32.2], [9.8, 31.2], [11.6, 32.4]].forEach(([x, z], i) => { if (t > T.RAILS[0]) person(d, x, Math.abs(Math.sin(t * 5 + i)) * .35 * cheer * (t > T.COMM[0] ? 1 : 0), z, 3.5 + i * .12, { moving: false, arm: cheer * (.6 + .4 * Math.sin(t * 7 + i)), sc: 1.45 }); });

      /* cables, inverter */
      const ck = eout(seg(t, T.CABLE[0], T.CABLE[1])), tray = clamp(ck / .45, 0, 1), down = clamp((ck - .45) / .2, 0, 1), grid = clamp((ck - .6) / .4, 0, 1);
      if (tray > 0) bar(pl, PATH[0], V3.lerp(PATH[0], PATH[1], tray), .3, C.steel, 0);
      if (tray > 0) bar(pl, V3.add(PATH[0], [0, .2, 0]), V3.add(V3.lerp(PATH[0], PATH[1], tray), [0, .2, 0]), .08, rgb('#ff5a3c'), 0);
      if (down > 0) { bar(pl, PATH[1], V3.lerp(PATH[1], PATH[2], down), .18, C.black, 0); }
      const ik = back(seg(t, T.CABLE[0] + .5, T.CABLE[0] + 1)); if (ik > 0) { const s = Math.min(1.08, ik); box(pl, M.mul(M.T(INV[0], INV[1] - .75, INV[2] + .2), [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]), 1.1, 1.5, .5, C.white, 0); bx(pl, INV[0], INV[1] + .45, INV[2] + .48, 1.0, .35, .06, C.navy, 0); const on = t > T.COMM[0] + .15; bx(pl, INV[0] - .25, INV[1] - .1, INV[2] + .5, .2, .2, .06, on ? rgb('#43e08a') : rgb('#8a96a2'), 3); }
      if (grid > 0) { let acc = 0; const lim = pathTotal * 0 + grid * (PATH_LEN[6] - PATH_LEN[2]); for (let i = 3; i < PATH.length; i++) { const l = dist(PATH[i], PATH[i - 1]), f = clamp((lim - acc) / l, 0, 1); if (f <= 0) break; const a = PATH[i - 1], b = V3.lerp(a, PATH[i], f); if (i < 6) bar(pl, a, b, .22, rgb('#59514a'), 0); else bar(pl, a, b, .12, C.black, 0); acc += l; } }

      /* drone + scan */
      if (t > T.SURVEY[0] - .35 && t < T.SURVEY[1] + .7) {
        const k = seg(t, T.SURVEY[0] - .3, T.SURVEY[1]), fade = 1 - seg(t, T.SURVEY[1], T.SURVEY[1] + .7), q = eio(k);
        const dx = lerp(-36, 36, q), dz = 9 + Math.sin(k * 12) * 8 - (q > .55 ? 6 : 0), dyy = roofY(dz) + 8 + Math.sin(t * 3) * .4, dp = [dx, dyy, dz];
        const sc = [dx - 5, 0, dz - 5], g = roofY(dz) + .1;
                quad(fx, [dx - 6, roofY(HZ) + .1, HZ], [dx + 6, roofY(HZ) + .1, HZ], [dx + 6, roofY(0) + .1, 0], [dx - 6, roofY(0) + .1, 0], rgba([.3, .9, 1], .1 * fade), 9);
        const ln = (a, b, w, c) => { const mid = V3.lerp(a, b, .5), dd = V3.norm(V3.sub(b, a)), side = V3.mul(V3.norm(V3.cross(dd, [0, 1, 0])), w / 2); quad(fx, V3.sub(a, side), V3.add(a, side), V3.add(b, side), V3.sub(b, side), c, 9); };
        ln([dx, roofY(HZ) + .2, HZ], [dx, roofY(0) + .2, 0], .45, rgba([.5, 1, 1], .65 * fade));
        /* dimension lines, drawn progressively */
        const dim = (a, b, p, w) => { if (p <= 0) return; const e = V3.lerp(a, b, p); bar(pl, a, e, w, rgb('#ffe08a'), 3); [a, e].forEach(q => bar(pl, V3.add(q, [0, -.8, 0]), V3.add(q, [0, .8, 0]), w * 1.4, rgb('#ffe08a'), 3)); };
        const dp1 = eout(seg(t, T.SURVEY[0] + .4, T.SURVEY[0] + 1.3)) * fade, dp2 = eout(seg(t, T.SURVEY[0] + 1, T.SURVEY[0] + 1.8));
        if (fade > 0) { dim([-HX, RIDGE + 1.6, 0], [HX, RIDGE + 1.6, 0], dp1 || 0.0001, .18); dim([HX + 1.5, EAVE, HZ], [HX + 1.5, RIDGE, 0], dp2 * (fade > .01 ? 1 : 0), .18); }
      }

      /* birds */
      for (let i = 0; i < 6; i++) {
        const a = ta * (.12 + i * .013) + i * 1.9, r = 60 + i * 14, bp = [Math.cos(a) * r - 20, 52 + i * 5 + Math.sin(ta + i) * 2, Math.sin(a) * r - 40], hd = [-Math.sin(a), 0, Math.cos(a)], sd = [Math.cos(a), 0, Math.sin(a)];
        const fl = Math.sin(ta * 9 + i * 2) * .9, w = 1.4;
        const wl = V3.add(V3.add(bp, V3.mul(sd, -w)), [0, fl, 0]), wr = V3.add(V3.add(bp, V3.mul(sd, w)), [0, fl, 0]);
        tri(pl, V3.add(bp, V3.mul(hd, .7)), wl, V3.add(bp, V3.mul(hd, -.5)), rgb('#202a35'), 3); tri(pl, V3.add(bp, V3.mul(hd, .7)), wr, V3.add(bp, V3.mul(hd, -.5)), rgb('#202a35'), 3);
      }
      /* traffic on the road */
      const veh = (x, z, dirn, col, van) => {
        const m = M.mul(M.T(x, 0, z), M.RY(dirn > 0 ? 0 : Math.PI));
        box(d, M.mul(m, M.T(0, .6, 0)), van ? 5.6 : 4.4, van ? 2.3 : 1.0, 2.0, col, 0); if (!van) box(d, M.mul(m, M.T(-.2, 1.5, 0)), 2.3, .9, 1.8, rgb('#9fc4de'), 0);
        [[-1.5, -1], [-1.5, 1], [1.5, -1], [1.5, 1]].forEach(([a, b]) => cyl(d, M.mul(M.mul(m, M.T(a, .45, b)), M.RX(Math.PI / 2)), .45, .3, 8, C.rub, 0));
      };
      veh(((ta * 9 + 40) % 260) - 130, 51.3, 1, rgb('#d63c3c'), false); veh(130 - ((ta * 11 + 120) % 260), 57.2, -1, rgb('#e8eef3'), true); veh(((ta * 7 + 170) % 260) - 130, 51.3, 1, rgb('#2a5ea8'), false);

      /* rooftop + chimney steam + effects */
      const at = dt > 0 ? dt : 0;
      if (at > 0) {
        if (Math.random() < at * 14) steam.push({ p: [-22 + (Math.random() - .5) * .6, 20.8, -23 + (Math.random() - .5) * .6], v: [1.1 + Math.random() * .6, 3 + Math.random(), .3], a: 0, life: 4 + Math.random() * 2 });
        [steam, puffs, spark].forEach(arr => { for (let i = arr.length - 1; i >= 0; i--) { const q = arr[i]; q.a += at; if (q.a > q.life) { arr.splice(i, 1); continue; } q.p[0] += q.v[0] * at; q.p[1] += q.v[1] * at; q.p[2] += q.v[2] * at; } });
        spark.forEach(q => { q.v[1] -= 4 * at; });
      }
      return { fxStat: { steam, puffs, spark } };
    }

    /* ---------- draw ---------- */
    let built = false, ptDraw = false;
    function ub(b) { gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.bufferData(gl.ARRAY_BUFFER, b.a.subarray(0, b.n * STRIDE), b === B.ground || b === B.stat || b === B.plain0 || b === B.sign || b === B.logo ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW); }
    const AL = {}; ['aPos', 'aNor', 'aCol', 'aUV', 'aMat'].forEach(n => AL[n] = gl.getAttribLocation(PM, n));
    function bindM(b) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); const s = STRIDE * 4;
      gl.enableVertexAttribArray(AL.aPos); gl.vertexAttribPointer(AL.aPos, 3, gl.FLOAT, false, s, 0);
      gl.enableVertexAttribArray(AL.aNor); gl.vertexAttribPointer(AL.aNor, 3, gl.FLOAT, false, s, 12);
      gl.enableVertexAttribArray(AL.aCol); gl.vertexAttribPointer(AL.aCol, 4, gl.FLOAT, false, s, 24);
      gl.enableVertexAttribArray(AL.aUV); gl.vertexAttribPointer(AL.aUV, 2, gl.FLOAT, false, s, 40);
      gl.enableVertexAttribArray(AL.aMat); gl.vertexAttribPointer(AL.aMat, 1, gl.FLOAT, false, s, 48);
    }
    const resetAttribs = () => { for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i); };
    const drawB = b => { if (!b.n) return; bindM(b); gl.drawArrays(gl.TRIANGLES, 0, b.n); };

    function draw(tRaw) {
      const t = tRaw - (T.PRE || 0); curRaw = tRaw;
      if (!built) { buildStatic(); ['ground', 'stat', 'plain0', 'sign', 'logo'].forEach(k => ub(B[k])); built = true; }
      const dt = clamp(t - lastT, 0, .06); if (t < lastT - .5) resetState(); lastT = t;
      const W = cv.width, H = cv.height; if (!W || !H) return;
      const day = eio(seg(t, 11.3, 13.7)), prog = seg(t, 0, 14.2);
      /* environment */
      /* bright clear morning: sun already well above the horizon, warm white light, deep blue sky, no dusk colours */
      const el = lerp(27, 41, prog) * D2R, az = Math.atan2(.62, -.78);
      const L = V3.norm([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]);
      const sunC = mixv([1, .91, .72], [1, .96, .88], clamp(prog * 1.25, 0, 1)), sunI = lerp(1.4, 1.65, prog);
      const skyTop = mixv([.16, .44, .82], [.2, .5, .85], prog), skyHor = mixv([.7, .86, .97], [.76, .9, .98], prog);
      const skyA = mixv([.48, .56, .72], [.52, .62, .78], prog), gndA = mixv([.3, .28, .25], [.32, .3, .27], prog);
      const lamp = 0, lit = eio(seg(t, T.COMM[0] + .3, T.COMM[0] + 1.6)), glow = day;
      const fogC = mixv(skyHor, [.8, .88, .94], .25);

      const pose = camera(t), eye = pose.eye, tg = pose.tg, fov = pose.fov, asp = W / H;
      const fwd = V3.norm(V3.sub(tg, eye)), rgt = V3.norm(V3.cross(fwd, [0, 1, 0])), upv = V3.add(V3.mul([0, 1, 0], Math.cos(pose.roll)), V3.mul(rgt, Math.sin(pose.roll)));
      const view = M.look(eye, tg, upv), VP = M.mul(M.persp(fov, asp, 1, 1600), view.m);

      dynamic(t, day, dt, tRaw);
      /* effects: windows, lamps, energy flow, sparks */
      const fxB = B.fx;
      if (heroPhone && t >= T.MON[0] - .5) part(heroPhone, 8, [.5, .85, 1], .55);
      if (lit > 0) winPts.forEach((w, i) => part(w, 9, [1, .8, .45], .55 * lit));
      if (lamp > .05) lampPts.forEach(l => part(l, 16, [1, .85, .5], .8 * lamp));
      const fl = eout(seg(t, T.COMM[0], T.COMM[0] + 1.2));
      if (fl > 0) {
        for (let i = 0; i < 46; i++) { const d = (t * 14 + i * pathTotal / 46) % pathTotal, p = pathAt(d), a = fl * (.55 + .45 * Math.sin(t * 7 + i)); part(p, 2.6, [1, .85, .35], .9 * a); part(p, 6, [1, .7, .2], .25 * a); }
        for (let c = 0; c < COLS; c++) for (let j = 0; j < 2; j++) { const u = (t * .55 + j * .5 + c * .13) % 1, p = slopePt(colX(c), lerp(S0 + ROWS * PPS - .4, .2, u), .6); part(p, 2.2, [1, .9, .45], .75 * fl * Math.sin(u * 3.14)); }
        const pk = seg(t, T.COMM[0], T.COMM[0] + 1.6), ringR = pk * 70;
        if (pk < 1) { const n = 40; for (let i = 0; i < n; i++) { const a = i / n * 6.2832; part([INV[0] + Math.cos(a) * ringR, .5, INV[2] + 8 + Math.sin(a) * ringR], 7, [1, .85, .4], .6 * (1 - pk)); } }
      }
      steam.forEach(q => { const k = q.a / q.life; part(q.p, 6 + k * 16, [.9, .92, .95], .42 * (1 - k), true); });
      puffs.forEach(q => { const k = q.a / q.life; part(q.p, 3 + k * 7, [.68, .64, .58], .45 * (1 - k), true); });
      spark.forEach(q => { const k = q.a / q.life; part(q.p, 1.6, [1, .8, .3], (1 - k) * .8); });
      if (day > .05) { for (let i = 0; i < 8; i++) { const p = slopePt(colX((i * 5) % COLS), rowS(i % ROWS), .4), tw = Math.max(0, Math.sin(t * 5 + i * 2.1)); part(p, 2 + tw * 5, [1, .95, .7], .3 * tw * day); } }

      /* draw */
      gl.viewport(0, 0, W, H); gl.clearColor(skyHor[0], skyHor[1], skyHor[2], 1); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.disable(gl.STENCIL_TEST);
      /* sky */
      resetAttribs(); gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.useProgram(PS);
      const su = PS.u, tanH = Math.tan(fov / 2);
      gl.uniform3fv(su.uCR, view.x); gl.uniform3fv(su.uCU, view.y); gl.uniform3fv(su.uCF, V3.mul(view.z, -1)); gl.uniform1f(su.uTan, tanH); gl.uniform1f(su.uAsp, asp);
      gl.uniform3fv(su.uTop, skyTop); gl.uniform3fv(su.uHor, skyHor); gl.uniform3fv(su.uL, L); gl.uniform3fv(su.uSunC, sunC); gl.uniform1f(su.uTime, tRaw); gl.uniform1f(su.uDay, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); const ap = gl.getAttribLocation(PS, 'aP'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(ap);
      gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      /* world */
      gl.useProgram(PM); const u = PM.u;
      gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform3fv(u.uCam, eye); gl.uniform3fv(u.uL, L); gl.uniform3fv(u.uSunC, sunC); gl.uniform1f(u.uSunI, sunI);
      gl.uniform3fv(u.uSkyA, skyA); gl.uniform3fv(u.uGndA, gndA); gl.uniform3fv(u.uFog, fogC); gl.uniform3fv(u.uSkyC, mixv(skyHor, skyTop, .4)); gl.uniform1f(u.uFogD, .0024);
      gl.uniform1f(u.uTime, tRaw); gl.uniform1f(u.uGlow, glow); gl.uniform1f(u.uLit, lit); gl.uniform1f(u.uLamp, lamp); gl.uniform1f(u.uSweep, ((t - T.COMM[0]) * .6) % 3 - .6); gl.uniform1f(u.uShadow, 0);
      gl.uniform3fv(u.uPN, [0, 1, 0]); gl.uniform1f(u.uPD, 0);
      ['dyn', 'roof', 'plain'].forEach(k => ub(B[k]));
      [B.ground, B.stat, B.plain0, B.dyn, B.roof, B.plain].forEach(drawB);
      if (!texReady) drawB(B.sign);
      else { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, logoTex); gl.uniform1i(u.uTex, 0); drawB(B.logo); gl.depthMask(true); gl.disable(gl.BLEND); }
      /* shadows (stencil keeps overlapping casters from darkening twice) */
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 255); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      gl.uniform1f(u.uShadow, 1);
      gl.uniform3fv(u.uPN, [0, 1, 0]); gl.uniform1f(u.uPD, 0); drawB(B.stat); drawB(B.dyn);
      gl.clear(gl.STENCIL_BUFFER_BIT); gl.uniform3fv(u.uPN, NRM); gl.uniform1f(u.uPD, PLANE_D); drawB(B.roof);
      gl.disable(gl.STENCIL_TEST); gl.uniform1f(u.uShadow, 0);
      /* additive effects */
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); ub(fxB); drawB(fxB);
      ptDraw = true;
      resetAttribs(); gl.useProgram(PP); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferData(gl.ARRAY_BUFFER, ptA, gl.DYNAMIC_DRAW);
      const pa = gl.getAttribLocation(PP, 'aPos'), ps = gl.getAttribLocation(PP, 'aSize'), pc = gl.getAttribLocation(PP, 'aCol');
      gl.enableVertexAttribArray(pa); gl.vertexAttribPointer(pa, 3, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(ps); gl.vertexAttribPointer(ps, 1, gl.FLOAT, false, 32, 12); gl.enableVertexAttribArray(pc); gl.vertexAttribPointer(pc, 4, gl.FLOAT, false, 32, 16);
      gl.uniformMatrix4fv(PP.u.uVP, false, VP); gl.uniform1f(PP.u.uScale, H / (2 * tanH));
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.POINTS, PCAP - ptSoft, ptSoft);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.drawArrays(gl.POINTS, 0, ptN);
      gl.disableVertexAttribArray(pa); gl.disableVertexAttribArray(ps); gl.disableVertexAttribArray(pc);
      gl.depthMask(true); gl.disable(gl.BLEND);

      /* DOM: fade-in + callouts */
      black.style.opacity = (1 - eout(seg(tRaw, 0, .8))).toFixed(3);
      overlays(t, tRaw, eye, pose);
      const cw = cv.clientWidth, ch = cv.clientHeight, logo = t >= T.LOGO_AT;
      callouts.forEach(c => {
        const on = !logo && t >= c.t0 && t <= c.t1, a = on ? Math.min(seg(t, c.t0, c.t0 + .35), 1 - seg(t, c.t1 - .35, c.t1)) : 0;
        if (a <= 0.01) { if (c.shown) { c.el.style.opacity = 0; c.shown = false; } return; }
        const w = V3.add([0, 0, 0], typeof c.anchor === 'function' ? c.anchor(t) : c.anchor), x = VP[0] * w[0] + VP[4] * w[1] + VP[8] * w[2] + VP[12], y = VP[1] * w[0] + VP[5] * w[1] + VP[9] * w[2] + VP[13], ww = VP[3] * w[0] + VP[7] * w[1] + VP[11] * w[2] + VP[15];
        if (ww <= 0) { c.el.style.opacity = 0; return; }
        const sx = (x / ww * .5 + .5) * cw, sy = (1 - (y / ww * .5 + .5)) * ch, txt = typeof c.text === 'function' ? c.text(t) : c.text;
        if (txt !== c.last) { c.el.lastChild.textContent = txt; c.last = txt; }
        c.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)'; c.el.style.opacity = a.toFixed(2); c.shown = true;
      });
    }
    const black = document.createElement('div'); black.className = 'pi-black'; host.appendChild(black);
    /* drone OSD */
    const hud = document.createElement('div'); hud.className = 'pi-hud'; hud.style.opacity = 0;
    hud.innerHTML = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><div class="rec"><b></b>REC <span data-h="rec">00:00</span></div><div class="mid">DRONE POV · DJI MINI 4K · 30 FPS</div>' +
      '<div class="bat"><span class="cells"><i></i><i></i><i></i><i></i></span><span data-h="bat">87%</span></div>' +
      '<div class="tel"><div>ALT <b data-h="alt">0</b> m</div><div>SPD <b data-h="spd">0</b> km/h</div><div>JARAK <b data-h="dst">0</b> m</div></div>' +
      '<div class="gps">7.29°S · 112.64°E<br>Citraland, Surabaya</div><div class="cross"></div><div class="hor"><i></i></div>';
    host.appendChild(hud);
    const vig = document.createElement('div'); vig.className = 'pi-vig'; host.appendChild(vig);
    const hq = k => hud.querySelector('[data-h=' + k + ']'), hEls = { rec: hq('rec'), bat: hq('bat'), alt: hq('alt'), spd: hq('spd'), dst: hq('dst') }, hor = hud.querySelector('.hor i'), hLast = {};
    const hSet = (k, v) => { if (hLast[k] !== v) { hEls[k].textContent = v; hLast[k] = v; } };
    /* phone with the monitoring dashboard */
    const phone = document.createElement('div'); phone.className = 'pi-phone';
    phone.innerHTML = '<div class="ph-scr"><div class="ph-top"><img src="img/hme-logo.webp" alt=""><b>HME Monitor</b><span>● Online</span></div>' +
      '<div class="ph-lbl">Produksi saat ini</div><div class="ph-val"><b data-p="kw">0</b><small>kW</small></div>' +
      '<svg viewBox="0 0 200 70" preserveAspectRatio="none"><path class="g" d=""/><path class="a" d=""/><path class="l" d=""/></svg>' +
      '<div class="ph-row"><div><small>Energi hari ini</small><b data-p="kwh">0 kWh</b></div><div><small>Inverter</small><b>3 / 3 online</b></div></div>' +
      '<div class="ph-row"><div><small>Jaringan PLN</small><b>Tersambung</b></div><div><small>Status</small><b class="ok">Normal</b></div></div><div class="ph-note">Ilustrasi tampilan monitoring</div></div>';
    host.appendChild(phone);
    const pq = k => phone.querySelector('[data-p=' + k + ']'), pKw = pq('kw'), pKwh = pq('kwh'), pA = phone.querySelector('.a'), pL = phone.querySelector('.l'), pPath = { a: '', l: '' };
    { let d = ''; for (let i = 0; i <= 40; i++) { const h = i / 40 * 24, v = Math.max(0, Math.sin(Math.PI * (h - 6) / 12)); d += (i ? 'L' : 'M') + i * 5 + ' ' + (64 - v * 54).toFixed(1); } phone.querySelector('.g').setAttribute('d', d); }
    const flash = document.createElement('div'); flash.className = 'pi-flash'; host.appendChild(flash);
    let flOn = false, phShown = false, lastEye = null, lastRaw = 0, spdS = 0, hudOn = false, phLast = '';
    function overlays(t, tRaw, eye, pose) {
      /* no scan-line glitch flash at the cut to the drone camera: the POV starts clean and steady */
      const dtr = tRaw - lastRaw; lastRaw = tRaw;
      const hv = seg(tRaw, SW + .05, SW + .4) * (1 - seg(t, T.SURVEY[1] - .7, T.SURVEY[1] - .15));
      if (hv > .01 || hudOn) {
        hud.style.opacity = hv.toFixed(2); hudOn = hv > .01;
        if (lastEye && dtr > .001 && dtr < .2) spdS = lerp(spdS, clamp(dist(eye, lastEye) / dtr * 3.6, 0, 160), .2);
        { const rt = Math.max(0, tRaw - SW); hSet('rec', '00:' + String(Math.min(59, Math.floor(rt))).padStart(2, '0') + ':' + String(Math.floor((rt % 1) * 30)).padStart(2, '0')); }
        hSet('bat', Math.max(61, Math.round(96 - tRaw * 1.5)) + '%'); hSet('alt', Math.round(eye[1]) + ''); hSet('spd', Math.round(spdS) + '');
        hSet('dst', Math.round(Math.hypot(eye[0], eye[2] - 4)) + '');
        hor.style.transform = 'rotate(' + (-(pose.roll * 57.3)).toFixed(1) + 'deg)';
      }
      lastEye = eye;
      const show = t >= T.MON[0] + .5 && t < T.MON[1] - .1;
      if (show !== phShown) { phShown = show; phone.classList.toggle('show', show); }
      if (show) {
        const k = eout(seg(t, T.MON[0] + .9, T.MON[0] + 3.4)), kw = 412.6 * k + Math.sin(t * 3) * 2.5 * k, kwh = 2481 * k;
        const a = f1(kw), b = Math.round(kwh).toLocaleString('id-ID') + ' kWh'; if (a + b !== phLast) { phLast = a + b; pKw.textContent = a; pKwh.textContent = b; }
        const cur = lerp(.3, .52, k) * 40; let dl = '', first = true;
        for (let i = 0; i <= 40 && i <= cur; i++) { const h = i / 40 * 24, v = Math.max(0, Math.sin(Math.PI * (h - 6) / 12)), x = i * 5, y = 64 - v * 54; dl += (first ? 'M' : 'L') + x + ' ' + y.toFixed(1); first = false; }
        if (dl !== pPath.l) { pPath.l = dl; pL.setAttribute('d', dl); pA.setAttribute('d', dl + 'L' + (Math.floor(cur) * 5) + ' 66L0 66Z'); }
      }
    }
    function f1(v) { return (Math.round(v * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    return { draw, dispose() { callouts.forEach(c => c.el.remove()); black.remove(); hud.remove(); vig.remove(); phone.remove(); flash.remove(); } };
  }

  window.HMEIntro3D = { create };
})();
