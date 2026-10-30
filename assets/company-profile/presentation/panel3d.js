/* Panel3D: a realistic, colored 3D solar module in raw WebGL (no external library).
   Shows how a panel makes electricity (photons -> electrons -> closed circuit -> lamp) and what each layer is made of (exploded view). */
(function () {
  'use strict';
  const host = document.getElementById('pv3d');
  if (!host) return;
  const cv = host.querySelector('canvas'), lblHost = host.querySelector('.pv3d-labels');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255].map(c => Math.pow(c, 2.2));

  let gl = null;
  try { gl = cv.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
  if (!gl) { host.classList.add('nogl'); return; }

  /* ---------------- module geometry: a 60-cell (6 x 10) mono module, 1.65 x 0.99 m, tilted 28° ---------------- */
  const TILT = 28 * Math.PI / 180;
  const C = [0, 1.02, 0];
  const U = [1, 0, 0], N = [0, Math.cos(TILT), Math.sin(TILT)], V = [0, -Math.sin(TILT), Math.cos(TILT)]; // V points down-slope, toward the viewer
  const W = 1.65, H = 0.99, IW = 1.59, IH = 0.93; // outer frame and glass area
  const P = (x, y, s) => add(add(add(C, mul(U, x)), mul(V, y)), mul(N, s));
  const SUN = norm([-0.5, 0.82, 0.42]);

  /* ---------------- shaders ---------------- */
  const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;uniform mat4 uVP;uniform vec3 uOff;varying vec3 vP;varying vec3 vN;varying vec2 vT;
  void main(){vec3 p=aP+uOff;vP=p;vN=aN;vT=aT;gl_Position=uVP*vec4(p,1.);}`;
  const ENV = `uniform vec3 uSun;
  vec3 sky(vec3 d){float h=d.y;vec3 top=vec3(.30,.40,.55),hor=vec3(.20,.30,.44),gnd=vec3(.025,.045,.08);
    vec3 c=h>0.?mix(hor,top,pow(clamp(h,0.,1.),.6)):mix(hor*.45,gnd,clamp(-h*5.,0.,1.));
    c+=vec3(.95,.97,1.)*smoothstep(.55,.95,h)*1.1+vec3(.6,.7,.85)*smoothstep(.75,.98,dot(d,normalize(vec3(.8,.5,.6))))*.8;
    float s=max(dot(d,uSun),0.);c+=vec3(1.,.82,.55)*(pow(s,900.)*60.+pow(s,24.)*.35);return c;}
  vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}`;
  const FS = `precision highp float;varying vec3 vP;varying vec3 vN;varying vec2 vT;
  uniform vec3 uCol;uniform float uMetal;uniform float uRough;uniform float uAlpha;uniform float uKind;uniform vec3 uEmis;uniform float uHi;uniform float uTime;
  uniform sampler2D uTex;uniform sampler2D uMask;uniform float uUseTex;uniform vec3 uCam;uniform float uSunI;uniform vec2 uShadow;uniform vec2 uLampXZ;uniform float uLamp;
  ${ENV}
  void main(){
    vec3 n=normalize(vN);vec3 v=normalize(uCam-vP);if(dot(n,v)<0.)n=-n;
    vec3 base=uCol;float metal=uMetal;float rough=uRough;float gap=0.;
    if(uUseTex>.5){vec3 t=texture2D(uTex,vT).rgb;base=pow(t,vec3(2.2));vec3 m=texture2D(uMask,vT).rgb;metal=m.r;gap=m.g;rough=mix(.32,.38,m.r);
      rough=mix(rough,.7,gap);}
    vec3 l=uSun;float ndl=max(dot(n,l),0.);
    float shade=1.;
    if(uKind>2.5){float d=length((vP.xz-uShadow)*vec2(1.,1.6));shade=mix(.35,1.,smoothstep(.25,1.1,d));}
    vec3 sunC=vec3(1.,.93,.82)*3.2*uSunI;
    vec3 amb=mix(vec3(.05,.07,.10),vec3(.25,.33,.45),n.y*.5+.5);
    vec3 h=normalize(l+v);float sh=mix(900.,8.,rough);
    vec3 f0=mix(vec3(.04),base,metal);float fres=pow(1.-max(dot(n,v),0.),5.);
    vec3 F=f0+(1.-f0)*fres*(1.-rough*.85);
    vec3 spec=F*pow(max(dot(n,h),0.),sh)*(sh+8.)/25.*sunC*ndl;
    vec3 env=sky(reflect(-v,n));
    vec3 col=base*(1.-metal)*(sunC*ndl*shade+amb)+spec+env*F*(1.-rough)*mix(.35,1.,metal);
    float a=uAlpha;
    if(uKind>.5&&uKind<1.5){ /* glass: mostly reflection, a faint green edge tint */
      col=env*F+spec*1.4+vec3(.02,.05,.04)*.3;a=clamp(uAlpha+fres*.75+length(spec)*.3,0.,1.);}
    if(uKind>1.5&&uKind<2.5){col=mix(col,vec3(.9,.92,.9)*(amb+sunC*ndl*.6),.6);}
    if(uKind>2.5){col=vec3(.022,.05,.095)*(shade*.85+.15)*(1.+.6*uSunI);
      float lp=length(vP.xz-uLampXZ);col+=vec3(1.,.66,.3)*uLamp*.55*exp(-lp*lp*9.);
      a=1.-smoothstep(1.8,3.4,length(vP.xz-vec2(.3,0.)));}
    col+=uEmis;
    col+=vec3(1.,.6,.1)*uHi*(.35+.25*sin(uTime*5.));
    col=aces(col*1.05);gl_FragColor=vec4(pow(col,vec3(1./2.2)),a);}`;
  const VSB = `attribute vec2 aP;varying vec2 vU;void main(){vU=aP;gl_Position=vec4(aP,.999,1.);}`;
  const FSB = `precision highp float;varying vec2 vU;uniform mat4 uIVP;uniform vec3 uCam;${ENV}
  void main(){vec2 q=vU*vec2(1.,.8)-vec2(.05,.25);float r=length(q);vec3 c=mix(vec3(.075,.17,.30),vec3(.012,.03,.06),smoothstep(.0,1.25,r));
    gl_FragColor=vec4(pow(c,vec3(1./2.2)),1.);}`;
  const VSP = `attribute vec3 aP;attribute vec4 aC;attribute float aS;uniform mat4 uVP;uniform float uPx;varying vec4 vC;varying float vR;
  void main(){vC=aC;vR=aS<0.?1.:0.;gl_Position=uVP*vec4(aP,1.);gl_PointSize=abs(aS)*uPx/gl_Position.w;}`;
  const FSP = `precision mediump float;varying vec4 vC;varying float vR;uniform float uSolid;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;float a=exp(-r*r*3.)+.6*exp(-r*r*18.);
    if(vR>.5)a=exp(-pow((r-.62)*7.,2.))*1.4;
    float k=min(a,1.)*vC.a;gl_FragColor=vec4(vC.rgb*mix(a*vC.a,k,uSolid),k*uSolid*.9);}`;
  function prog(vs, fs) {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); p.u[a.name] = gl.getUniformLocation(p, a.name); }
    p.a = {}; const m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < m; i++) { const a = gl.getActiveAttrib(p, i); p.a[a.name] = gl.getAttribLocation(p, a.name); }
    return p;
  }
  let PM, PB, PP;
  try { PM = prog(VS, FS); PB = prog(VSB, FSB); PP = prog(VSP, FSP); } catch (e) { console.warn('panel3d', e); host.classList.add('nogl'); return; }

  /* ---------------- textures: the cell matrix (color + mask: r = silver metal, g = backsheet gap) ---------------- */
  const TW = 2048, TH = 1024, COLS = 10, ROWS = 6;
  const tc = document.createElement('canvas'), tm = document.createElement('canvas');
  tc.width = tm.width = TW; tc.height = tm.height = TH;
  const g = tc.getContext('2d'), m = tm.getContext('2d');
  (function paintCells() {
    g.fillStyle = '#e8edf1'; g.fillRect(0, 0, TW, TH);
    m.fillStyle = '#00ff00'; m.fillRect(0, 0, TW, TH);
    const mx = 34, my = 34, gapX = 6, gapY = 10;
    const cw = (TW - mx * 2 - gapX * (COLS - 1)) / COLS, ch = (TH - my * 2 - gapY * (ROWS - 1)) / ROWS;
    let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const busY = [0.1, 0.3, 0.5, 0.7, 0.9];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = mx + c * (cw + gapX), y = my + r * (ch + gapY), k = cw * 0.11;
      const path = ctx => { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + cw - k, y); ctx.lineTo(x + cw, y + k); ctx.lineTo(x + cw, y + ch - k); ctx.lineTo(x + cw - k, y + ch); ctx.lineTo(x + k, y + ch); ctx.lineTo(x, y + ch - k); ctx.lineTo(x, y + k); ctx.closePath(); };
      const tint = rnd() * 0.06;
      const gr = g.createLinearGradient(x, y, x + cw, y + ch);
      gr.addColorStop(0, `rgb(${16 + tint * 90 | 0},${28 + tint * 60 | 0},${58 + tint * 120 | 0})`);
      gr.addColorStop(1, `rgb(${10 + tint * 60 | 0},${18 + tint * 50 | 0},${42 + tint * 90 | 0})`);
      path(g); g.fillStyle = gr; g.fill();
      path(m); m.fillStyle = '#000'; m.fill();
      g.save(); path(g); g.clip(); m.save(); path(m); m.clip();
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '70,100,170' : '5,10,25'},${rnd() * .08})`; g.fillRect(x + rnd() * cw, y + rnd() * ch, 2 + rnd() * 10, 1 + rnd() * 3); }
      g.strokeStyle = 'rgba(190,200,215,.55)'; m.strokeStyle = 'rgb(150,0,0)'; g.lineWidth = m.lineWidth = 1;
      for (let fx = x + 3; fx < x + cw; fx += 5.2) { g.beginPath(); g.moveTo(fx, y); g.lineTo(fx, y + ch); g.stroke(); m.beginPath(); m.moveTo(fx, y); m.lineTo(fx, y + ch); m.stroke(); }
      g.restore(); m.restore();
      busY.forEach(b => { const by = y + ch * b; g.fillStyle = '#c9d0d8'; g.fillRect(x - (c ? gapX : 0), by - 1.6, cw + (c ? gapX : 0), 3.2); m.fillStyle = '#ff0000'; m.fillRect(x - (c ? gapX : 0), by - 1.6, cw + (c ? gapX : 0), 3.2); });
    }
    // cross-connector ribbons at both short ends, joining the rows into one string
    g.fillStyle = '#c3cad3'; m.fillStyle = '#ff0000';
    for (let r = 0; r < ROWS; r++) { const y0 = my + r * (ch + gapY) + ch * 0.06, y1 = y0 + ch * 0.88; [mx - 18, TW - mx + 8].forEach(x => { g.fillRect(x, y0, 10, y1 - y0); m.fillRect(x, y0, 10, y1 - y0); }); }
  })();
  const tex = src => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const ex = gl.getExtension('EXT_texture_filter_anisotropic'); if (ex) gl.texParameterf(gl.TEXTURE_2D, ex.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return t;
  };
  const TEX = tex(tc), MASK = tex(tm);

  /* ---------------- mesh builder ---------------- */
  function Mesh() { this.v = []; }
  Mesh.prototype.tri = function (a, b, c, n, ta, tb, tc2) { this.v.push(...a, ...n, ...(ta || [0, 0]), ...b, ...n, ...(tb || [0, 0]), ...c, ...n, ...(tc2 || [0, 0])); return this; };
  Mesh.prototype.quad = function (a, b, c, d, n, uv) { uv = uv || [[0, 0], [1, 0], [1, 1], [0, 1]]; this.tri(a, b, c, n, uv[0], uv[1], uv[2]); return this.tri(a, c, d, n, uv[0], uv[2], uv[3]); };
  Mesh.prototype.triN = function (a, b, c, na, nb, nc) { this.v.push(...a, ...na, 0, 0, ...b, ...nb, 0, 0, ...c, ...nc, 0, 0); return this; };
  // a box in a local frame (u, v, n axes), centred at (x, y, s) with half sizes
  Mesh.prototype.box = function (F, x, y, s, hx, hy, hs) {
    const p = (i, j, k) => add(add(add(F.o, mul(F.u, x + i * hx)), mul(F.v, y + j * hy)), mul(F.n, s + k * hs));
    const faces = [[F.n, [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]], [mul(F.n, -1), [[-1, 1, -1], [1, 1, -1], [1, -1, -1], [-1, -1, -1]]],
      [F.u, [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]], [mul(F.u, -1), [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
      [F.v, [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]], [mul(F.v, -1), [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]]];
    faces.forEach(([n, q]) => this.quad(...q.map(c => p(...c)), n));
    return this;
  };
  Mesh.prototype.tube = function (path, r, seg) {
    seg = seg || 10;
    const rings = path.map((p, i) => {
      const t = norm(sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)]));
      const a = norm(cross(t, Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), b = cross(t, a);
      return Array.from({ length: seg }, (_, k) => { const ang = k / seg * Math.PI * 2, n = add(mul(a, Math.cos(ang)), mul(b, Math.sin(ang))); return [add(p, mul(n, r)), n]; });
    });
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % seg], c = rings[i + 1][(k + 1) % seg], d = rings[i + 1][k];
      this.triN(a[0], b[0], c[0], a[1], b[1], c[1]); this.triN(a[0], c[0], d[0], a[1], c[1], d[1]);
    }
    return this;
  };
  Mesh.prototype.cyl = function (c, r, h, seg, axis) {
    seg = seg || 24; axis = axis || [0, 1, 0];
    const a = norm(cross(axis, Math.abs(axis[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), b = cross(axis, a), top = add(c, mul(axis, h));
    for (let k = 0; k < seg; k++) {
      const t0 = k / seg * Math.PI * 2, t1 = (k + 1) / seg * Math.PI * 2;
      const n0 = add(mul(a, Math.cos(t0)), mul(b, Math.sin(t0))), n1 = add(mul(a, Math.cos(t1)), mul(b, Math.sin(t1)));
      const p0 = add(c, mul(n0, r)), p1 = add(c, mul(n1, r)), q0 = add(top, mul(n0, r)), q1 = add(top, mul(n1, r));
      this.triN(p0, p1, q1, n0, n1, n1); this.triN(p0, q1, q0, n0, n1, n0);
      this.tri(top, q0, q1, axis); this.tri(c, p1, p0, mul(axis, -1));
    }
    return this;
  };
  Mesh.prototype.sphere = function (c, r, seg) {
    seg = seg || 24;
    const pt = (i, j) => { const th = i / seg * Math.PI, ph = j / seg * Math.PI * 2, n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; return [add(c, mul(n, r)), n]; };
    for (let i = 0; i < seg; i++) for (let j = 0; j < seg; j++) { const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1); this.triN(a[0], b[0], e[0], a[1], b[1], e[1]); this.triN(a[0], e[0], d[0], a[1], e[1], d[1]); }
    return this;
  };
  const upload = mesh => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW); return { b, n: mesh.v.length / 8 }; };

  /* ---------------- parts ---------------- */
  const F = { o: C, u: U, v: V, n: N };
  const mat = (o) => Object.assign({ col: [.5, .5, .5], metal: 0, rough: .5, alpha: 1, kind: 0, emis: [0, 0, 0], tex: false }, o);
  // exploded offsets along N: the frame (with the junction box and cables) stays, the laminate lifts toward the viewer
  const LAYERS = [
    { id: 'frame', name: 'Bingkai aluminium', at: [W / 2, H / 2, -.01], ex: 0 },
    { id: 'back', name: 'Lembar belakang (backsheet)', at: [IW / 2, 0, -.004], ex: .2 },
    { id: 'eva2', name: 'EVA bawah', at: [IW / 2, 0, -.001], ex: .4 },
    { id: 'cells', name: 'Sel surya silikon', at: [IW / 2, 0, 0], ex: .6 },
    { id: 'eva1', name: 'EVA atas', at: [IW / 2, 0, .002], ex: .8 },
    { id: 'glass', name: 'Kaca tempered', at: [IW / 2, 0, .009], ex: 1 },
    { id: 'jbox', name: 'Kotak sambungan (junction box)', at: [0.22 - .09, -0.3, -.055], ex: 0, left: true },
  ];
  const L = Object.fromEntries(LAYERS.map(l => [l.id, l]));
  const parts = [];
  const part = (layer, mesh, mt) => { const p = Object.assign(upload(mesh), { layer, m: mat(mt) }); parts.push(p); return p; };

  // frame: four anodised aluminium bars with a front lip over the laminate
  { const me = new Mesh(), fw = (W - IW) / 2 + .012;
    me.box(F, 0, -H / 2 + fw / 2, -.006, W / 2, fw / 2, .024).box(F, 0, H / 2 - fw / 2, -.006, W / 2, fw / 2, .024);
    me.box(F, -W / 2 + fw / 2, 0, -.006, fw / 2, H / 2 - fw, .024).box(F, W / 2 - fw / 2, 0, -.006, fw / 2, H / 2 - fw, .024);
    // inner return flanges on the back
    me.box(F, 0, -H / 2 + fw + .015, -.026, W / 2 - fw, .015, .004).box(F, 0, H / 2 - fw - .015, -.026, W / 2 - fw, .015, .004);
    part('frame', me, { col: rgb('#d9dfe6'), metal: .55, rough: .3 }); }
  // backsheet with a product label on its back
  part('back', new Mesh().box(F, 0, 0, -.004, IW / 2, IH / 2, .0015), { col: rgb('#eef1f4'), rough: .6 });
  part('back', new Mesh().box(F, -.35, -.05, -.0062, .12, .07, .0004), { col: rgb('#c8d2dc'), rough: .7 });
  part('eva2', new Mesh().box(F, 0, 0, -.0015, IW / 2, IH / 2, .001), { col: [.95, .96, .95], alpha: .0, kind: 2, rough: .4 });
  // the cell matrix: one textured sheet (front and back)
  { const me = new Mesh(), z = .0003, uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
    me.quad(P(-IW / 2, IH / 2, z), P(IW / 2, IH / 2, z), P(IW / 2, -IH / 2, z), P(-IW / 2, -IH / 2, z), N, uv);
    me.quad(P(-IW / 2, -IH / 2, -z), P(IW / 2, -IH / 2, -z), P(IW / 2, IH / 2, -z), P(-IW / 2, IH / 2, -z), mul(N, -1), [[0, 0], [1, 0], [1, 1], [0, 1]]);
    part('cells', me, { tex: true }); }
  part('eva1', new Mesh().box(F, 0, 0, .002, IW / 2, IH / 2, .001), { col: [.95, .96, .95], alpha: .0, kind: 2, rough: .4 });
  part('glass', new Mesh().box(F, 0, 0, .0075, IW / 2, IH / 2, .0035), { col: [.9, .95, .93], alpha: .03, kind: 1, rough: .02 });
  // junction box, bypass-diode housing on the back, with cable glands
  const JB = { x: .22, y: -.3 };
  part('jbox', new Mesh().box(F, JB.x, JB.y, -.032, .09, .06, .022).box(F, JB.x, JB.y, -.056, .075, .048, .003), { col: rgb('#1b2027'), rough: .55 });
  const GL1 = P(JB.x - .04, JB.y - .06, -.03), GL2 = P(JB.x + .04, JB.y - .06, -.03);
  part('jbox', new Mesh().cyl(GL1, .013, .02, 14, mul(V, -1)).cyl(GL2, .013, .02, 14, mul(V, -1)), { col: rgb('#2a3038'), rough: .5 });

  // mounting legs and feet
  { const me = new Mesh(), bot = P(0, H / 2, -.03), top = P(0, -H / 2, -.03);
    [-.6, .6].forEach(x => {
      const fb = [x, 0, bot[2]], tb = [x, 0, top[2]];
      me.box({ o: [x, bot[1] / 2, bot[2]], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] }, 0, 0, 0, .018, bot[1] / 2, .018);
      me.box({ o: [x, top[1] / 2, top[2]], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] }, 0, 0, 0, .018, top[1] / 2, .018);
      me.box({ o: [x, .012, (bot[2] + top[2]) / 2], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] }, 0, 0, 0, .05, .012, (bot[2] - top[2]) / 2 + .05);
      void fb; void tb;
    });
    part('stand', me, { col: rgb('#b4bec9'), metal: .5, rough: .4 }); }

  // the load: a desk lamp with a bulb that lights up with the panel's power
  const LAMP = [1.28, 0, .5], BULB = [1.28, .5, .5];
  part('lamp', new Mesh().cyl(LAMP, .13, .025, 32).cyl(add(LAMP, [0, .025, 0]), .016, .36, 14).cyl(add(LAMP, [0, .385, 0]), .05, .045, 20), { col: rgb('#2b3a4c'), metal: .6, rough: .35 });
  const bulb = part('bulb', new Mesh().sphere(BULB, .075, 24), { col: [1, .95, .85], rough: .1, alpha: .9 });

  // cables: + (red) and - (black) from the junction box down to the floor and to the lamp, with an MC4 coupler on +
  const route = (start, side) => {
    const a = start, b = add(start, mul(V, -.05)), c = [start[0] + .02, .02, start[2] - .25];
    const d = [.85, .02, -.15 + side * .05], e = [LAMP[0] - .2, .02, LAMP[2] - .12 + side * .05], f = [LAMP[0] - .02, .02, LAMP[2] + side * .03];
    const pts = [a, b, [start[0] + .015, start[1] - .25, start[2] - .12], c, d, e, f];
    // densify with a soft curve
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 8; k++) { const t = k / 8; out.push(add(mul(pts[i], 1 - t), mul(pts[i + 1], t))); }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const CAB_P = route(GL1, -1), CAB_N = route(GL2, 1);
  const CUT = 30; // index on the + cable where the MC4 coupler sits
  part('cable', new Mesh().tube(CAB_N, .009), { col: rgb('#16191d'), rough: .5 });
  part('cablep', new Mesh().tube(CAB_P.slice(0, CUT + 1), .009), { col: rgb('#b8262b'), rough: .45 });
  const plugA = part('plugA', new Mesh().cyl(CAB_P[CUT], .018, .07, 16, norm(sub(CAB_P[CUT + 1], CAB_P[CUT]))), { col: rgb('#1d2228'), rough: .4 });
  const tail = part('plugB', new Mesh().cyl(add(CAB_P[CUT], mul(norm(sub(CAB_P[CUT + 1], CAB_P[CUT])), .07)), .018, .07, 16, norm(sub(CAB_P[CUT + 1], CAB_P[CUT]))).tube(CAB_P.slice(CUT + 1), .009), { col: rgb('#b8262b'), rough: .45 });
  const cutDir = norm(sub(CAB_P[CUT + 1], CAB_P[CUT]));
  plugA.m.col = rgb('#1d2228'); void tail;
  // floor
  const floor = part('floor', new Mesh().quad([-4, 0, 4], [4, 0, 4], [4, 0, -4], [-4, 0, -4], [0, 1, 0]), { kind: 3 });

  /* ---------------- inside one cell: a cut-away block of the silicon wafer ---------------- */
  const MC = [-8, 0, 0], MX = .6, MZ = .4;
  const MY = { contact: [0, .06], p: [.06, .615], junc: [.615, .635], n: [.635, .8], ar: [.8, .82], finger: [.82, .9] };
  const FM = { o: MC, u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
  const FINGERS = [-.3, .3];
  const slab = (y, hx, hz, x) => new Mesh().box(FM, x || 0, (y[0] + y[1]) / 2, 0, hx, (y[1] - y[0]) / 2, hz);
  const micro = (layer, mesh, mt, trans) => { const q = part(layer, mesh, mt); q.micro = true; q.trans = !!trans; return q; };
  micro('m-contact', slab(MY.contact, MX, MZ), { col: rgb('#c9ced4'), metal: .6, rough: .4 });
  { const me = new Mesh(); FINGERS.forEach(x => me.box(FM, x, (MY.finger[0] + MY.finger[1]) / 2, 0, .045, (MY.finger[1] - MY.finger[0]) / 2, MZ + .002)); micro('m-finger', me, { col: rgb('#e4e8ec'), metal: .85, rough: .22 }); }
  // the silicon crystal: atoms on a lattice, joined by bonds
  const ATOMS = [];
  { const am = new Mesh(), bm = new Mesh(), xs = [-.5, -.3, -.1, .1, .3, .5], ys = [.13, .26, .39, .52, .69, .76], zs = [-.3, -.1, .1, .3];
    xs.forEach((x, i) => ys.forEach((y, j) => zs.forEach((z, k) => {
      const c = add(MC, [x, y, z]); ATOMS.push(c); am.sphere(c, .026, 10);
      if (i + 1 < xs.length) bm.tube([c, add(MC, [xs[i + 1], y, z])], .006, 6);
      if (j + 1 < ys.length) bm.tube([c, add(MC, [x, ys[j + 1], z])], .006, 6);
      if (k + 1 < zs.length) bm.tube([c, add(MC, [x, y, zs[k + 1]])], .006, 6);
    })));
    micro('m-bond', bm, { col: rgb('#7d8a99'), rough: .5 });
    micro('m-atom', am, { col: rgb('#a9b4c0'), metal: .35, rough: .3 }); }
  // translucent doped layers, drawn after everything opaque
  micro('m-p', slab(MY.p, MX, MZ), { col: rgb('#e0607a'), alpha: .16, rough: .25 }, true);
  micro('m-junc', slab(MY.junc, MX, MZ), { col: rgb('#fdb813'), alpha: .55, rough: .3, emis: [.55, .32, .02] }, true);
  micro('m-n', slab(MY.n, MX, MZ), { col: rgb('#3f86e8'), alpha: .2, rough: .25 }, true);
  micro('m-ar', slab(MY.ar, MX, MZ), { col: rgb('#1d2f7a'), alpha: .6, rough: .15 }, true);
  const MLAB = [
    { name: 'Garis perak (finger)', at: [FINGERS[1] + .045, MY.finger[1], MZ], hi: 'm-finger' },
    { name: 'Lapisan antipantul', at: [MX, MY.ar[1], MZ], hi: 'm-ar' },
    { name: 'Lapisan N', at: [MX, .72, MZ], hi: 'm-n' },
    { name: 'Sambungan P-N (medan listrik)', at: [MX, .625, MZ], hi: 'm-junc' },
    { name: 'Lapisan P', at: [MX, .34, MZ], hi: 'm-p' },
    { name: 'Kontak belakang', at: [MX, .03, MZ], hi: 'm-contact' },
    { name: 'Atom silikon', at: [-.5, .52, .3], hi: 'm-atom', left: true },
  ];

  /* ---------------- state ---------------- */
  const S = { mode: 'macro', explode: 0, exT: 0, sun: 1, sunT: 1, closed: true, cutO: 0, sel: null, hiPart: null, time: 0,
    yaw: .42, pitch: .3, dist: 3.5, yawT: .42, pitchT: .3, distT: 3.5, auto: !reduce, tgtY: .8 };
  const VIEWS = { zoom: { yaw: .62, pitch: .36, dist: 2.75, tgt: [MC[0] + .32, .42, 0] }, whole: { yaw: .5, pitch: .3, dist: 4.1, tgt: [.32, .72, .1] }, apart: { yaw: .95, pitch: .16, dist: 4.1, tgt: [.1, 1.55, .3] }, back: { yaw: 2.55, pitch: .24, dist: 3.4, tgt: [.1, .8, -.1] } };
  S.tgt = VIEWS.whole.tgt.slice(); S.tgtT = VIEWS.whole.tgt.slice(); S.yaw = S.yawT = S.yawBase = .5; S.dist = S.distT = 4.1; S.swing = 0;
  const api = {};

  /* ---------------- particles: photons from the sun, electrons in the cells and the wire ---------------- */
  const PCAP = 900, pA = new Float32Array(PCAP * 8), pBuf = gl.createBuffer();
  const photons = [], electrons = [], flashes = [];
  const cellPoint = () => { const x = (Math.random() - .5) * (IW - .08), y = (Math.random() - .5) * (IH - .08); return { x, y }; };
  const BUS = [0.1, 0.3, 0.5, 0.7, 0.9].flatMap(b => Array.from({ length: ROWS }, (_, r) => -IH / 2 + (34 + r * (((TH - 68 - 50) / ROWS) + 10) + ((TH - 68 - 50) / ROWS) * b) / TH * IH));
  const nearestBus = y => BUS.reduce((a, b) => Math.abs(b - y) < Math.abs(a - y) ? b : a, BUS[0]);
  const loop = CAB_P.slice().concat([BULB]).concat(CAB_N.slice().reverse());
  const loopLen = []; let loopTotal = 0; loop.forEach((p, i) => { if (i) loopTotal += Math.hypot(...sub(p, loop[i - 1])); loopLen.push(loopTotal); });
  const loopAt = d => { d = ((d % loopTotal) + loopTotal) % loopTotal; for (let i = 1; i < loop.length; i++) if (d <= loopLen[i]) { const t = (d - loopLen[i - 1]) / (loopLen[i] - loopLen[i - 1] || 1); return add(mul(loop[i - 1], 1 - t), mul(loop[i], t)); } return loop[0]; };
  const wire = Array.from({ length: 70 }, (_, i) => ({ d: i / 70 * loopTotal }));
  let spawnAcc = 0;
  const offOf = id => mul(N, (L[id] ? L[id].ex : 0) * S.explode * 1.5);

  function stepParticles(dt) {
    const rate = S.sun * 46;
    spawnAcc += rate * dt;
    while (spawnAcc > 1 && photons.length < 160) { spawnAcc--; const t = cellPoint(); photons.push({ ...t, k: 0, speed: .9 + Math.random() * .5 }); }
    const cellsOff = offOf('cells');
    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i]; p.k += dt * p.speed;
      if (p.k >= 1) { photons.splice(i, 1); flashes.push({ x: p.x, y: p.y, t: 0 }); if (electrons.length < 140) electrons.push({ x: p.x, y: p.y, bus: nearestBus(p.y), t: 0, stage: 0 }); }
    }
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > .35) flashes.splice(i, 1); }
    const flow = S.closed ? S.sun : 0;
    for (let i = electrons.length - 1; i >= 0; i--) {
      const e = electrons[i]; e.t += dt;
      if (!S.closed) { if (e.t > 1.2) electrons.splice(i, 1); continue; }
      if (e.stage === 0) { e.y += clamp(e.bus - e.y, -dt * .35, dt * .35); if (Math.abs(e.bus - e.y) < .002) e.stage = 1; }
      else { e.x += dt * .55; if (e.x > IW / 2 - .02) electrons.splice(i, 1); }
    }
    wire.forEach(w => { w.d += dt * flow * .55; });
    void cellsOff;
  }
  const PD = norm([-.35, 1, .45]);
  const micros = []; let microAcc = 0;
  const jit = (e, a) => [Math.sin(S.time * 23 + e.seed) * a, Math.sin(S.time * 19 + e.seed * 2) * a, Math.cos(S.time * 21 + e.seed * 3) * a];
  const moveTo = (pos, tgt, sp) => { const d = sub(tgt, pos), l = Math.hypot(...d); if (l <= sp) return [tgt.slice(), true]; return [add(pos, mul(d, sp / l)), false]; };
  function stepMicro(dt) {
    microAcc += S.sun * 1.5 * dt;
    while (microAcc > 1 && micros.length < 9) {
      microAcc--;
      const atom = ATOMS[(Math.random() * ATOMS.length) | 0], loc = sub(atom, MC);
      const rec = loc[1] < .3 && Math.random() < .55;
      const fx = FINGERS.reduce((a, b) => Math.abs(b - loc[0]) < Math.abs(a - loc[0]) ? b : a);
      const L0 = (x, y, z) => add(MC, [x, y, z]);
      micros.push({ t: 0, stage: 0, seed: Math.random() * 100, atom, rec, e: atom.slice(), h: atom.slice(), ei: 0, hi: 0, fade: 1,
        ep: [L0(loc[0], .7, loc[2]), L0(fx, .74, loc[2]), L0(fx, .86, loc[2]), L0(fx, .86, MZ + .3)],
        hp: [L0(loc[0], .09, loc[2]), L0(loc[0], .03, loc[2])] });
    }
    for (let i = micros.length - 1; i >= 0; i--) {
      const m = micros[i]; m.t += dt;
      if (m.stage === 0) { if (m.t > .6) { m.stage = 1; m.t = 0; } continue; }
      if (m.rec) {
        // far from the junction: the electron falls back into a hole, its energy only warms the cell
        const mid = add(mul(m.e, .5), mul(m.h, .5));
        if (m.stage === 1) { m.e = moveTo(m.e, add(m.atom, [.09, .05, 0]), dt * .2)[0]; m.h = moveTo(m.h, add(m.atom, [-.06, -.04, 0]), dt * .15)[0]; if (m.t > .7) { m.stage = 2; m.t = 0; } }
        else if (m.stage === 2) { m.e = moveTo(m.e, mid, dt * .3)[0]; m.h = moveTo(m.h, mid, dt * .3)[0]; if (m.t > .6) { m.stage = 3; m.t = 0; } }
        else if (m.t > .5) micros.splice(i, 1);
        continue;
      }
      if (m.ei < m.ep.length) {
        const inP = m.e[1] < MC[1] + MY.junc[0];
        const stuck = !S.closed && m.ei >= 1;
        if (!stuck) { const r = moveTo(m.e, m.ep[m.ei], dt * (inP ? .26 : .62)); m.e = r[0]; if (r[1]) m.ei++; }
        else { m.fade -= dt * .25; }
      }
      if (m.hi < m.hp.length) { const r = moveTo(m.h, m.hp[m.hi], dt * .18); m.h = r[0]; if (r[1]) m.hi++; }
      m.tr = (m.tr || []); m.tr.unshift(m.e.slice()); if (m.tr.length > 9) m.tr.pop();
      if (m.ei >= m.ep.length || m.fade <= 0) micros.splice(i, 1);
    }
  }
  function writeMicro(put) {
    micros.forEach(m => {
      if (m.stage === 0) {
        const k = clamp(m.t / .6, 0, 1), from = add(m.atom, mul(PD, 1.5)), at = add(mul(from, 1 - k), mul(m.atom, k));
        for (let j = 0; j < 8; j++) put(add(at, mul(PD, j * .035)), .11 - j * .011, [1, .82, .3], (.95 - j * .12) * Math.max(.4, S.sun));
        return;
      }
      if (m.stage === 1 && m.t < .45) put(m.atom, .16 + m.t * .5, [1, .9, .55], (1 - m.t / .45));
      if (m.rec && m.stage === 3) { put(m.e, .14 + m.t * .4, [1, .42, .12], 1 - m.t / .5); return; }
      const f = clamp(m.fade, 0, 1), out = m.ei >= 3 ? clamp(1 - (m.e[2] - MC[2] - MZ) / .3, 0, 1) : 1;
      (m.tr || []).forEach((q, j) => { if (j) put(q, .08 - j * .006, [.3, .85, 1], (.5 - j * .05) * f * out); });
      put(add(m.e, jit(m, m.e[1] < MC[1] + MY.junc[0] ? .006 : .002)), .12, [.35, .88, 1], f * out);
      if (m.hi < m.hp.length || m.rec) put(add(m.h, jit(m, .004)), -.13, [1, .55, .15], f);
    });
  }
  function writeParticles() {
    let n = 0;
    const put = (p, s, c, a) => { if (n >= PCAP) return; const o = n++ * 8; pA[o] = p[0]; pA[o + 1] = p[1]; pA[o + 2] = p[2]; pA[o + 3] = c[0]; pA[o + 4] = c[1]; pA[o + 5] = c[2]; pA[o + 6] = a; pA[o + 7] = s; };
    if (S.mode === 'zoom') { writeMicro(put); gl.bindBuffer(gl.ARRAY_BUFFER, pBuf); gl.bufferData(gl.ARRAY_BUFFER, pA.subarray(0, n * 8), gl.DYNAMIC_DRAW); return n; }
    const front = add(offOf('cells'), [0, 0, 0]);
        photons.forEach(p => {
      const hit = add(P(p.x, p.y, .001), front), from = add(hit, mul(SUN, 2.4));
      const at = add(mul(from, 1 - p.k), mul(hit, p.k));
      for (let k = 0; k < 6; k++) put(add(at, mul(SUN, k * .035)), .055 - k * .006, [1, .8, .3], (.9 - k * .14) * S.sun);
    });
    flashes.forEach(f => put(add(P(f.x, f.y, .004), front), .05 + f.t * .25, [1, .85, .4], (1 - f.t / .35) * .9));
    electrons.forEach(e => {
      const fade = S.closed ? 1 : clamp(1 - e.t / 1.2, 0, 1);
      const jig = S.closed ? 0 : Math.sin(e.t * 40 + e.x * 90) * .004;
      put(add(P(e.x + jig, e.y, .004), front), .035, [.3, .85, 1], .95 * fade);
    });
    if (S.closed && S.sun > .01) wire.forEach(w => put(add(loopAt(w.d), [0, .012, 0]), .03, [.3, .85, 1], clamp(S.sun * 1.4, 0, 1)));
    // the sun and the bulb glow
    put(add(C, mul(SUN, 3.2)), 1.3, [1, .8, .45], .55 + .45 * S.sun);
    const lit = S.closed ? S.sun : 0;
    if (lit > .01) put(BULB, .3 + .2 * lit, [1, .78, .4], lit * .7);
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuf); gl.bufferData(gl.ARRAY_BUFFER, pA.subarray(0, n * 8), gl.DYNAMIC_DRAW);
    return n;
  }

  /* ---------------- camera ---------------- */
  const perspective = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const lookAt = (e, c, up) => { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; };
  const mm = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  function inv(m) {
    const a = m, o = new Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
    return o;
  }
  let VP = null, IVP = null, EYE = [0, 0, 0], cw = 1, ch = 1;
  function camera() {
    const tgt = S.tgt;
    EYE = add(tgt, [Math.sin(S.yaw) * Math.cos(S.pitch) * S.dist, Math.sin(S.pitch) * S.dist, Math.cos(S.yaw) * Math.cos(S.pitch) * S.dist]);
    const proj = perspective(cw / ch < 1 ? .9 : .62, cw / ch, .05, 40);
    VP = mm(proj, lookAt(EYE, tgt, [0, 1, 0])); IVP = inv(VP);
  }
  const project = p => { const x = VP[0] * p[0] + VP[4] * p[1] + VP[8] * p[2] + VP[12], y = VP[1] * p[0] + VP[5] * p[1] + VP[9] * p[2] + VP[13], w = VP[3] * p[0] + VP[7] * p[1] + VP[11] * p[2] + VP[15]; return [(x / w * .5 + .5) * cw, (1 - (y / w * .5 + .5)) * ch, w]; };

  /* ---------------- labels (html, projected) ---------------- */
  const labels = LAYERS.map(l => { const b = document.createElement('button'); b.type = 'button'; b.className = 'l3d'; b.textContent = l.name; b.dataset.id = l.id; b.onclick = () => api.select(l.id, true); lblHost.appendChild(b); return { l, b }; });
  const mlabels = MLAB.map(l => { const b = document.createElement('button'); b.type = 'button'; b.className = 'l3d'; b.textContent = l.name; b.onclick = () => { S.hiPart = [l.hi]; }; lblHost.appendChild(b); return { l, b }; });
  function placeLabels() {
    const zoom = S.mode === 'zoom';
    mlabels.forEach(({ l, b }) => {
      const p = project(add(MC, l.at));
      b.style.opacity = zoom && p[2] > 0 ? 1 : 0; b.style.pointerEvents = zoom ? 'auto' : 'none';
      b.style.transform = l.left ? `translate(${(p[0] - 10).toFixed(1)}px,${p[1].toFixed(1)}px) translate(-100%,-50%)` : `translate(${(p[0] + 10).toFixed(1)}px,${p[1].toFixed(1)}px) translate(0,-50%)`;
      b.classList.toggle('sel', !!(S.hiPart && S.hiPart.includes(l.hi)));
    });
    labels.forEach(({ l, b }) => {
      if (zoom) { b.style.opacity = 0; b.style.pointerEvents = 'none'; return; }
      const p = project(add(P(l.at[0], l.at[1], l.at[2]), offOf(l.id)));
      const show = S.explode > .6 || S.sel === l.id;
      b.style.opacity = show && p[2] > 0 ? 1 : 0; b.style.pointerEvents = show ? 'auto' : 'none';
      b.style.transform = l.left ? `translate(${(p[0] - 10).toFixed(1)}px,${p[1].toFixed(1)}px) translate(-100%,-50%)` : `translate(${(p[0] + 10).toFixed(1)}px,${p[1].toFixed(1)}px) translate(0,-50%)`;
      b.classList.toggle('sel', S.sel === l.id);
    });
  }

  /* ---------------- draw ---------------- */
  const bgBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bgBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  function bindMesh(p) {
    gl.bindBuffer(gl.ARRAY_BUFFER, p.b);
    gl.enableVertexAttribArray(PM.a.aP); gl.vertexAttribPointer(PM.a.aP, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(PM.a.aN); gl.vertexAttribPointer(PM.a.aN, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(PM.a.aT); gl.vertexAttribPointer(PM.a.aT, 2, gl.FLOAT, false, 32, 24);
  }
  function drawPart(p, alphaOverride) {
    const m = p.m, u = PM.u;
    let off = offOf(p.layer);
    if (p.layer === 'plugA') off = mul(cutDir, -.07 * S.cutO); // the coupler slides back along its cable: the circuit opens
    gl.uniform3fv(u.uOff, off);
    gl.uniform3fv(u.uCol, m.col); gl.uniform1f(u.uMetal, m.metal); gl.uniform1f(u.uRough, m.rough);
    gl.uniform1f(u.uAlpha, alphaOverride != null ? alphaOverride : m.alpha); gl.uniform1f(u.uKind, m.kind); gl.uniform1f(u.uUseTex, m.tex ? 1 : 0);
    let emis = m.emis;
    if (p === bulb) { const lit = (S.closed ? S.sun : 0); emis = [3.2 * lit, 2.3 * lit, 1.1 * lit]; }
    gl.uniform3fv(u.uEmis, emis);
    const hi = S.hiPart && (S.hiPart.includes(p.layer)) ? 1 : 0;
    gl.uniform1f(u.uHi, hi * (.6 + .4 * Math.sin(S.time * 3)) * .6);
    bindMesh(p); gl.drawArrays(gl.TRIANGLES, 0, p.n);
  }
  function render() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    cw = cv.clientWidth; ch = cv.clientHeight;
    camera();
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(PB); gl.bindBuffer(gl.ARRAY_BUFFER, bgBuf); gl.enableVertexAttribArray(PB.a.aP); gl.vertexAttribPointer(PB.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(PB.u.uIVP, false, IVP); gl.uniform3fv(PB.u.uCam, EYE); gl.uniform3fv(PB.u.uSun, SUN);
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(PB.a.aP);

    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(PM);
    gl.uniformMatrix4fv(PM.u.uVP, false, VP); gl.uniform3fv(PM.u.uCam, EYE); gl.uniform3fv(PM.u.uSun, SUN);
    gl.uniform1f(PM.u.uSunI, .35 + .65 * S.sun); gl.uniform1f(PM.u.uTime, S.time);
    gl.uniform2fv(PM.u.uLampXZ, [LAMP[0], LAMP[2]]); gl.uniform1f(PM.u.uLamp, S.closed ? S.sun : 0);
    gl.uniform2fv(PM.u.uShadow, [C[0] - SUN[0] / SUN[1] * C[1] * .9, C[2] - SUN[2] / SUN[1] * C[1] * .9]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TEX); gl.uniform1i(PM.u.uTex, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, MASK); gl.uniform1i(PM.u.uMask, 1);
    // floor (blended into the backdrop)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    const zoom = S.mode === 'zoom', inView = p => zoom ? p.micro : !p.micro;
    if (!zoom) drawPart(floor);
    gl.depthMask(true); gl.disable(gl.BLEND);
    parts.forEach(p => { if (inView(p) && p !== floor && p.m.kind === 0 && !p.trans && p !== bulb) drawPart(p); });
    // transparent layers back to front
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    const front = dot(sub(EYE, C), N) > 0;
    if (zoom) parts.filter(p => p.micro && p.trans).forEach(p => drawPart(p));
    const tr = zoom ? [] : parts.filter(p => p.m.kind === 1 || p.m.kind === 2 || p === bulb).sort((a, b) => (L[a.layer] ? L[a.layer].ex : 0) - (L[b.layer] ? L[b.layer].ex : 0));
    if (!front) tr.reverse();
    tr.forEach(p => { if (p.m.kind === 2) drawPart(p, .08 + .32 * S.explode); else drawPart(p); });
    gl.depthMask(true);
    // particles, additive
    const n = writeParticles();
    gl.useProgram(PP); const solid = S.mode === 'zoom' ? 1 : 0; gl.uniform1f(PP.u.uSolid, solid); if (solid) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    gl.uniformMatrix4fv(PP.u.uVP, false, VP); gl.uniform1f(PP.u.uPx, h / (2 * Math.tan(.31)));
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
    gl.enableVertexAttribArray(PP.a.aP); gl.vertexAttribPointer(PP.a.aP, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(PP.a.aC); gl.vertexAttribPointer(PP.a.aC, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(PP.a.aS); gl.vertexAttribPointer(PP.a.aS, 1, gl.FLOAT, false, 32, 28);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disableVertexAttribArray(PP.a.aC); gl.disableVertexAttribArray(PP.a.aS);
    gl.depthMask(true); gl.disable(gl.BLEND);
    placeLabels();
  }

  /* ---------------- loop + input ---------------- */
  let visible = false, raf = 0, last = 0, dragging = false, idleT = 0;
  const ease = (cur, tgt, dt, tau) => reduce ? tgt : cur + (tgt - cur) * (1 - Math.exp(-dt / tau));
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    S.time += dt;
    S.explode = ease(S.explode, S.exT, dt, .45);
    S.sun = ease(S.sun, S.sunT, dt, .25);
    S.cutO = ease(S.cutO, S.closed ? 0 : 1, dt, .2);
    if (S.auto && !dragging) { S.swing += dt; S.yawT = S.yawBase + .2 * Math.sin(S.swing * .2); }
    S.tgt = S.tgt.map((v, i) => ease(v, S.tgtT[i], dt, .5));
    S.yaw = ease(S.yaw, S.yawT, dt, .5); S.pitch = ease(S.pitch, S.pitchT, dt, .5); S.dist = ease(S.dist, S.distT, dt, .5);
    if (S.mode === 'zoom') stepMicro(reduce ? dt * .5 : dt);
    else if (!reduce) stepParticles(dt); else if (!photons.length) stepParticles(.5);
    render();
    host.dispatchEvent(new CustomEvent('pv3d-state', { detail: api.state() }));
    raf = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
  new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '80px 0px' }).observe(host);
  let px = 0, py = 0;
  cv.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); S.auto = false; clearTimeout(idleT); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; S.yawT -= (e.clientX - px) * .008; S.pitchT = clamp(S.pitchT + (e.clientY - py) * .005, .04, 1.1); px = e.clientX; py = e.clientY; });
  const up = () => { if (!dragging) return; dragging = false; S.yawBase = S.yawT; S.swing = 0; clearTimeout(idleT); idleT = setTimeout(() => { S.auto = !reduce; }, 5000); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); S.distT = clamp(S.distT * (1 + e.deltaY * .001), 2.2, 6); }, { passive: false });
  addEventListener('resize', () => { if (visible) render(); });
  document.addEventListener('hme-fit', () => { if (visible) render(); });

  /* ---------------- public api, used by the slide's controls ---------------- */
  const HI = { sun: ['glass'], cells: ['cells'], metal: ['cells'], circuit: ['cablep', 'cable', 'plugA', 'plugB', 'jbox', 'lamp'], atom: ['m-atom'], junction: ['m-junc'], finger: ['m-finger', 'm-contact'] };
  const snap = () => { S.yaw = S.yawT; S.pitch = S.pitchT; S.dist = S.distT; S.tgt = S.tgtT.slice(); host.classList.remove('swap'); void host.offsetWidth; host.classList.add('swap'); };
  api.zoom = on => {
    const was = S.mode === 'zoom';
    S.mode = on ? 'zoom' : 'macro'; S.hiPart = null; S.sel = null;
    if (on) { S.exT = S.explode = 0; api.view('zoom'); micros.length = 0; microAcc = .9; }
    else api.view(S.exT ? 'apart' : 'whole');
    if (was !== !!on) snap();
  };
  api.view = name => { const v = VIEWS[name]; if (!v) return; S.yawT = S.yawBase = v.yaw; S.swing = 0; S.pitchT = v.pitch; S.distT = v.dist; S.tgtT = v.tgt.slice(); };
  api.explode = on => { if (S.mode === 'zoom') api.zoom(false); S.exT = on ? 1 : 0; api.view(on ? 'apart' : 'whole'); };
  api.sun = v => { S.sunT = clamp(v, 0, 1); };
  api.closed = on => { S.closed = !!on; };
  api.highlight = key => { S.hiPart = key ? (HI[key] || [key]) : null; };
  api.select = (id, fromLabel) => { S.sel = id; S.hiPart = id ? [id] : null; if (id === 'jbox') api.view('back'); host.dispatchEvent(new CustomEvent('pv3d-select', { detail: { id, fromLabel: !!fromLabel } })); };
  api.state = () => ({ sun: S.sun, closed: S.closed, explode: S.explode, watts: (S.closed ? 1 : 0) * 350 * S.sun, irr: 1000 * S.sun, sel: S.sel });
  api.layers = LAYERS;
  window.pv3d = api;
  render();
})();
