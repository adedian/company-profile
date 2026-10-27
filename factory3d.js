/* Factory3D: realistic WebGL (Three.js) factory + rooftop PV scene.
   Wraps the legacy Canvas2D Scene3D: the house keeps the old engine, the factory ("Pabrik") uses this one.
   Same public API (init/set/setSite/focus/reset/start/stop/setAuto/isAuto/select/onPick/ok). */
(function () {
  'use strict';
  const T = window.THREE, legacy = window.Scene3D;
  if (!T || !legacy) return;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t, sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const V3 = T.Vector3, col = h => new T.Color(h);
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(), _u = new T.Vector3(0, 1, 0);

  /* ---------------- geometry helpers ---------------- */
  function merge(list) {
    const L = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; L.forEach(g => n += g.attributes.position.count);
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = L.every(g => g.attributes.color) ? new Float32Array(n * 3) : null; let o = 0;
    L.forEach(g => { const a = g.attributes, c = a.position.count; P.set(a.position.array, o * 3); N.set(a.normal.array, o * 3); if (a.uv) U.set(a.uv.array, o * 2); if (C) C.set(a.color.array, o * 3); o += c; });
    const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(P, 3)); r.setAttribute('normal', new T.BufferAttribute(N, 3)); r.setAttribute('uv', new T.BufferAttribute(U, 2)); if (C) r.setAttribute('color', new T.BufferAttribute(C, 3)); return r;
  }
  function xf(g, x, y, z, rx, ry, rz, sx, sy, sz) { _m.compose(_v.set(x || 0, y || 0, z || 0), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0)), _s.set(sx || 1, sy || 1, sz || 1)); return g.applyMatrix4(_m); }
  const bx = (w, h, d, x, y, z, ry) => xf(new T.BoxGeometry(w, h, d), x, y, z, 0, ry || 0, 0);
  const cy = (r, h, x, y, z, seg, rt) => xf(new T.CylinderGeometry(rt === undefined ? r : rt, r, h, seg || 12), x, y, z);
  function rod(a, b, r, seg) {
    const d = new V3().subVectors(b, a), len = d.length(), g = new T.CylinderGeometry(r, r, len, seg || 6, 1);
    _m.compose(new V3().addVectors(a, b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(_u, d.normalize()), _s.set(1, 1, 1)); return g.applyMatrix4(_m);
  }
  function tube(pts, r, seg) { const c = new T.CatmullRomCurve3(pts.map(p => new V3(...p)), false, 'catmullrom', .05); return new T.TubeGeometry(c, seg || Math.max(8, pts.length * 6), r, 5, false); }
  function poly(pts, r) { return merge(pts.slice(1).map((p, i) => rod(new V3(...pts[i]), new V3(...p), r, 5))); }
  const cat = (a, b, sag, n) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(Math.PI * t) * sag, lerp(a[2], b[2], t)]); } return p; };
  /* tile box UVs in metres (u unit um, v unit vm) so one texture period = fixed world size */
  function tileBox(g, w, h, d, um, vm) {
    const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / (um || 1), uv.getY(i) * dims[f][1] / (vm || um || 1)); }
    return g;
  }
  const cbox = (x0, x1, y0, y1, z0, z1, um, vm) => tileBox(xf(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), x1 - x0, y1 - y0, z1 - z0, um, vm);

  /* ---------------- procedural textures ---------------- */
  function tex(w, h, fn, o) {
    o = o || {}; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = o.clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping; t.anisotropy = 8; t.colorSpace = o.lin ? T.NoColorSpace : T.SRGBColorSpace; t.userData = { c, g }; return t;
  }
  const grain = (g, w, h, n, a, dark) => { for (let i = 0; i < n; i++) { const v = rnd() * 255 | 0; g.fillStyle = dark ? `rgba(0,0,0,${a * rnd()})` : `rgba(${v},${v},${v},${a * rnd()})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } };
  const RIBS = 5;
  const claN = tex(256, 64, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let x = 0; x < w; x++) {
      const t = (x / w * RIBS) % 1, s = t < .2 ? 0 : t < .35 ? 1 : t < .65 ? 0 : t < .8 ? -1 : 0, nx = -s * .8, l = Math.hypot(nx, 1);
      for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; im.data[i] = (nx / l * .5 + .5) * 255; im.data[i + 1] = 128; im.data[i + 2] = (1 / l * .5 + .5) * 255; im.data[i + 3] = 255; }
    }
    g.putImageData(im, 0, 0);
  }, { lin: 1 });
  const claC = tex(256, 512, (g, w, h) => {
    g.fillStyle = '#e1e4e6'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) { const t = (x / w * RIBS) % 1; g.fillStyle = t > .35 && t < .65 ? 'rgba(255,255,255,.22)' : t < .2 || t > .8 ? 'rgba(40,50,60,.20)' : 'rgba(0,0,0,.06)'; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 26; i++) { const x = rnd() * w, gr = g.createLinearGradient(0, 0, 0, h * (.3 + rnd() * .7)); gr.addColorStop(0, `rgba(70,62,50,${.04 + rnd() * .08})`); gr.addColorStop(1, 'rgba(70,62,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + rnd() * 6, h); }
    grain(g, w, h, 1400, .08);
  });
  const concT = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#a2a4a4'; g.fillRect(0, 0, w, h); grain(g, w, h, 5000, .14); grain(g, w, h, 1500, .12, 1);
    for (let i = 0; i < 18; i++) { const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 90, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, `rgba(70,66,60,${.1 + rnd() * .1})`); gr.addColorStop(1, 'rgba(70,66,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = 'rgba(40,40,40,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
  const ascT = tex(512, 512, (g, w, h) => { g.fillStyle = '#42454a'; g.fillRect(0, 0, w, h); grain(g, w, h, 9000, .22); grain(g, w, h, 2500, .2, 1); });
  const grsT = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#5f7a45'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const k = rnd(); g.fillStyle = `rgba(${(60 + k * 60) | 0},${(90 + k * 70) | 0},${(40 + k * 30) | 0},${.25 + rnd() * .3})`; g.fillRect(rnd() * w, rnd() * h, 2, 3 + rnd() * 3); }
  });
  /* PV cell texture: 12 x 6 cells, thin busbars, half-cut look */
  const pvT = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#c9ced4'; g.fillRect(0, 0, w, h); const m = 14; g.fillStyle = '#06101f'; g.fillRect(m, m, w - 2 * m, h - 2 * m);
    const cw = (w - 2 * m) / 12, ch = (h - 2 * m) / 6;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
      const x = m + c * cw + 2.5, y = m + r * ch + 2.5, gr = g.createLinearGradient(x, y, x + cw, y + ch); const k = rnd() * 10 | 0;
      gr.addColorStop(0, `rgb(${9 + k * .6},${22 + k},${48 + k * 2})`); gr.addColorStop(1, `rgb(${6 + k * .5},${16 + k},${38 + k * 1.5})`); g.fillStyle = gr; g.fillRect(x, y, cw - 5, ch - 5);
      g.strokeStyle = 'rgba(150,175,215,.5)'; g.lineWidth = 1.1; for (let b = 1; b <= 3; b++) { g.beginPath(); g.moveTo(x, y + (ch - 5) * b / 4); g.lineTo(x + cw - 5, y + (ch - 5) * b / 4); g.stroke(); }
      g.strokeStyle = 'rgba(90,115,160,.22)'; g.lineWidth = .8; for (let b = 1; b < 14; b++) { g.beginPath(); g.moveTo(x + (cw - 5) * b / 14, y); g.lineTo(x + (cw - 5) * b / 14, y + ch - 5); g.stroke(); }
    }
    g.strokeStyle = '#2a3548'; g.lineWidth = 3; g.beginPath(); g.moveTo(m, h / 2); g.lineTo(w - m, h / 2); g.stroke();
  });
  const perfT = tex(128, 128, (g, w, h) => {
    g.fillStyle = '#e19420'; g.fillRect(0, 0, w, h); g.fillStyle = '#f0b24a'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    g.fillStyle = '#7a4a0a'; for (let y = 14; y < h; y += 28) for (let x = 14; x < w; x += 28) { g.beginPath(); g.ellipse(x + ((y / 28 | 0) % 2 ? 14 : 0), y, 7, 4, 0, 0, 7); g.fill(); }
    grain(g, w, h, 300, .1, 1);
  });
  const gratT = tex(128, 128, (g, w, h) => { g.fillStyle = '#9ea4a9'; g.fillRect(0, 0, w, h); g.fillStyle = '#5b6168'; for (let y = 8; y < h; y += 16) for (let x = 4; x < w; x += 8) g.fillRect(x, y, 5, 10); g.fillStyle = '#c3c8cc'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4); });
  const ladT = tex(64, 64, (g, w, h) => { g.fillStyle = '#6a7076'; g.fillRect(0, 0, w, h); g.fillStyle = '#b7bdc2'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillRect(0, 28, w, 8); });
  const slatT = tex(64, 64, (g, w, h) => { g.fillStyle = '#c4c9cd'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 6, w, 2); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, y, w, 2); } grain(g, w, h, 300, .1); });
  const beltT = tex(64, 64, (g, w, h) => { g.fillStyle = '#23272c'; g.fillRect(0, 0, w, h); g.fillStyle = '#34393f'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 6, h); });
  const dotT = tex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.42, 'rgba(255,255,255,.95)'); r.addColorStop(.7, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, { clamp: 1 });
  const glowT = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,230,170,.9)'); r.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, { clamp: 1 });
  const patchT = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, { clamp: 1 });
  const logoImg = new Image(); logoImg.src = 'img/hme-logo.webp';
  const signT = (() => { const t = tex(1536, 160, (g, w, h) => drawSign(g, w, h), { clamp: 1 }); logoImg.addEventListener('load', () => { drawSign(t.userData.g, 1536, 160); t.needsUpdate = true; }); return t; })();
  function drawSign(g, w, h) {
    g.fillStyle = '#0a2c4f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fdb813'; g.fillRect(0, h - 12, w, 12); g.fillStyle = '#143f6b'; g.fillRect(0, 0, w, 6);
    let x = 40; if (logoImg.complete && logoImg.naturalWidth) { g.drawImage(logoImg, 30, 14, 120, 120); x = 176; }
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.font = '700 82px Bricolage Grotesque, Figtree, system-ui, sans-serif'; g.fillText('PT HEXA MULTI ENERGI', x, h / 2 - 6);
    g.font = '600 44px Figtree, system-ui, sans-serif'; g.fillStyle = '#9fd0ff'; g.textAlign = 'right'; g.fillText('Solar Power Solutions', w - 40, h / 2 - 4); g.textAlign = 'left';
  }
  function signTex(lines, bg, fg, w, h, tri) {
    return tex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let y = tri ? h * .64 : h / 2 - (lines.length - 1) * h * .1; if (tri) { g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2 + 34, 62); g.lineTo(w / 2 - 34, 62); g.closePath(); g.fill(); g.fillStyle = bg; g.font = '700 30px Figtree'; g.fillText('!', w / 2, 46); g.fillStyle = fg; }
      lines.forEach((l, i) => { g.font = `700 ${Math.round(h * (tri ? .13 : .2))}px Figtree, system-ui, sans-serif`; g.fillText(l, w / 2, y + i * h * .2); });
    }, { clamp: 1 });
  }

  /* ---------------- materials ---------------- */
  const std = (o) => new T.MeshStandardMaterial(o), phys = (o) => new T.MeshPhysicalMaterial(o);
  const mat = {
    wall: std({ color: '#dfe2e3', map: claC, normalMap: claN, normalScale: new T.Vector2(.45, .45), roughness: .62, metalness: .35 }),
    wallB: std({ color: '#7d8791', map: claC, normalMap: claN, normalScale: new T.Vector2(.9, .9), roughness: .55, metalness: .55 }),
    roof: std({ color: '#b9bec2', map: claC, normalMap: claN, normalScale: new T.Vector2(.6, .6), roughness: .55, metalness: .6 }),
    roofLo: std({ color: '#9aa1a6', map: claC, normalMap: claN, roughness: .6, metalness: .6 }),
    conc: std({ color: '#b3b3b0', map: concT, roughness: .92, metalness: 0 }),
    concD: std({ color: '#8d8f8f', map: concT, roughness: .95 }),
    asph: std({ color: '#7d7f84', map: ascT, roughness: .95 }),
    grass: std({ color: '#a6b295', map: grsT, roughness: 1 }),
    steel: std({ color: '#a9afb4', roughness: .45, metalness: .9 }),
    steelD: std({ color: '#5d656c', roughness: .5, metalness: .85 }),
    galv: std({ color: '#b4babe', roughness: .42, metalness: .92 }),
    paintG: std({ color: '#8c949a', roughness: .5, metalness: .4 }),
    black: std({ color: '#17191c', roughness: .7, metalness: .2 }),
    rubber: std({ color: '#222426', roughness: .95 }),
    frame: std({ color: '#c3c8cd', roughness: .38, metalness: .92 }),
    alu: std({ color: '#9aa0a6', roughness: .4, metalness: .9 }),
    glass: phys({ color: '#c4ccd8', map: pvT, roughness: .14, metalness: .15, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .8 }),
    walk: std({ color: '#ffffff', map: perfT, roughness: .5, metalness: .5 }),
    grat: std({ color: '#ffffff', map: gratT, roughness: .5, metalness: .8 }),
    ladder: std({ color: '#ffffff', map: ladT, roughness: .5, metalness: .85 }),
    pipe: std({ color: '#b5322f', roughness: .45, metalness: .3 }),
    yellow: std({ color: '#e1ae17', roughness: .55, metalness: .25 }),
    blueL: std({ color: '#2d62b5', roughness: .5, metalness: .4 }),
    cable: std({ color: '#111315', roughness: .6 }),
    glassW: std({ color: '#35505f', roughness: .08, metalness: .6, transparent: true, opacity: .55 }),
    poly: std({ color: '#cfe0e6', roughness: .3, transparent: true, opacity: .55, emissive: '#ffe2a8', emissiveIntensity: 0 }),
    invCover: std({ color: '#d9dadb', roughness: .42, metalness: .12 }),
    invDark: std({ color: '#2b2e32', roughness: .55, metalness: .5 }),
    cab: std({ color: '#aeb5ba', roughness: .5, metalness: .5 }),
    cabW: std({ color: '#e4e6e7', roughness: .45, metalness: .3 }),
    mach: std({ color: '#cfd4d8', roughness: .45, metalness: .5 }),
    machD: std({ color: '#464d54', roughness: .5, metalness: .7 }),
    navy: std({ color: '#163a63', roughness: .45, metalness: .4 }),
    shutter: std({ color: '#ffffff', map: slatT, roughness: .45, metalness: .8 }),
    belt: std({ color: '#ffffff', map: beltT, roughness: .8 }),
    carton: std({ color: '#b39a73', roughness: .9 }),
    rackO: std({ color: '#c8661c', roughness: .6, metalness: .3 }),
    rackB: std({ color: '#2a4f86', roughness: .6, metalness: .3 }),
    bark: std({ color: '#4d4033', roughness: 1 }),
    hill: std({ color: '#566b63', roughness: 1, fog: true }),
    wood: std({ color: '#8f8a80', roughness: .95 }),
    copper: std({ color: '#b87333', roughness: .35, metalness: .9 }),
    red: std({ color: '#b3231f', roughness: .5, metalness: .2 })
  };
  mat.wall.map.repeat.set(1, 1);
  const ledM = c => new T.MeshBasicMaterial({ color: c });
  const glowAdd = new T.MeshBasicMaterial({ map: glowT, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, fog: false });

  /* ================================================================== */
  function create(cv, host) {
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(34, 1.875, .5, 3000);
    scene.fog = new T.FogExp2(0xbfd0e0, .0019);

    /* ---- state ---- */
    const S = { hour: 12, day: 1, cloudy: false, mode: 'ongrid', served: true, pv: 0, pvFrac: 0, load: 0, soc: .5, hasBat: false, isOut: false, skyTop: '#2f78cf', skyBot: '#c4e6ff', invTxt: '0.0', invOk: true, led: [1, 0, 0], meterTxt: '0.0', meterCol: '#6fe3ff', batLed: 3, batCol: '#58f08c', gridLive: true, flows: {}, labelVals: {} };
    const WX = { v: 0, ov: 0, rain: 0, storm: false, t: 0 };
    function stepWeather(dt) {
      const tg = S.cloudy ? 1 : 0; if (reduce) WX.v = tg; else WX.v += Math.max(-dt / 5, Math.min(dt / 9, tg - WX.v));
      WX.ov = sstep(WX.v / .55); WX.rain = sstep((WX.v - .42) / .36); WX.storm = WX.v > .85 && S.cloudy; WX.t += dt;
    }

    /* ---- sky dome (also baked into an environment map for reflections) ---- */
    const skyU = { uTop: { value: new T.Color() }, uBot: { value: new T.Color() }, uSun: { value: new V3(0, 1, 0) }, uSunCol: { value: new T.Color() }, uSunAmt: { value: 1 }, uMoon: { value: new V3(.4, .7, .4).normalize() }, uNight: { value: 0 }, uCov: { value: .2 }, uCloud: { value: new T.Color(1, 1, 1) }, uTime: { value: 0 }, uFlash: { value: 0 } };
    const skyMat = new T.ShaderMaterial({
      uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vD; uniform vec3 uTop,uBot,uSun,uSunCol,uMoon,uCloud; uniform float uSunAmt,uNight,uCov,uTime,uFlash;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float h3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+7.1;a*=.5;}return s;}
      void main(){ vec3 d=normalize(vD); float y=max(d.y,0.); vec3 c=mix(uBot,uTop,pow(y,.42));
        float sd=max(dot(d,uSun),0.); float sh=smoothstep(-.03,.06,uSun.y);
        c+=uSunCol*uSunAmt*sh*(pow(sd,6.)*.18+pow(sd,60.)*.5+pow(sd,900.)*3.+smoothstep(.99965,.99985,sd)*14.);
        float nt=uNight*uNight; vec3 sp=d*110.; vec3 id=floor(sp); float r=h3(id); c+=vec3(.9,.95,1.)*step(.988,r)*smoothstep(.34,.0,length(fract(sp)-.5))*nt*(1.-uCov)*step(0.,d.y)*1.6;
        float md=max(dot(d,uMoon),0.); c+=vec3(.75,.82,1.)*uNight*(smoothstep(.99935,.9996,md)*3.+pow(md,50.)*.12);
        if(d.y>0.){ vec2 p=d.xz/(d.y+.16)*.55+vec2(uTime*.012,uTime*.004); float q=fbm(p*1.7); float lo=1.02-uCov*.78, m=smoothstep(lo,lo+.3,q)*smoothstep(0.,.22,d.y);
          float l=.78+.35*fbm(p*3.1+3.); vec3 cc=uCloud*l; c=mix(c,cc,m*(.78+.2*uCov)); }
        c=mix(c,uBot,smoothstep(.16,0.,d.y)*.75); c+=vec3(.55,.62,.8)*uFlash;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    });
    const domeG = new T.SphereGeometry(900, 40, 24), sky = new T.Mesh(domeG, skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
    const skyScene = new T.Scene(), sky2 = new T.Mesh(domeG, skyMat); skyScene.add(sky2);
    const pmrem = new T.PMREMGenerator(renderer); let envRT = null;
    function bakeEnv() { const rt = pmrem.fromScene(skyScene, 0, 1, 2000); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; }

    /* ---- lights ---- */
    const sun = new T.DirectionalLight(0xffffff, 3), sunDir = new V3(0, 1, 0), SC = new V3(10, 0, -5);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 46; sc.bottom = -46; sc.near = 10; sc.far = 520;
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .045; sun.target.position.copy(SC); scene.add(sun, sun.target);
    const hemi = new T.HemisphereLight(0xbfd6f0, 0x74715f, .5); scene.add(hemi);
    const pl = [[5, 6.2, -2], [16, 6.2, -2], [25, 6.2, -2], [14, 6.2, -12]].map(p => { const l = new T.PointLight(0xffe9c8, 0, 24, 2); l.position.set(...p); scene.add(l); return l; });
    const yardL = [[7, 3.2, 5.6], [-11, 4.2, 8], [40, 6, 6]].map(p => { const l = new T.PointLight(0xffe2b0, 0, 22, 2); l.position.set(...p); scene.add(l); return l; });

    /* ---- camera model ---- */
    const HOME = { az: .3, el: .2, dist: 66, tx: 12, ty: 4.2, tz: -2 };
    const PRE = {
      pv: { az: .04, el: 1.12, dist: 50, tx: 12, ty: 9, tz: -5 },
      inverter: { az: .2, el: .16, dist: 16, tx: 7.2, ty: 2.1, tz: 5.2 },
      battery: { az: .3, el: .13, dist: 15.5, tx: -11, ty: 1.5, tz: 9.8 },
      loads: { az: -.06, el: .2, dist: 21, tx: 21, ty: 2.8, tz: -.5 },
      meter: { az: -.55, el: .14, dist: 9, tx: -16, ty: 1.5, tz: 6 },
      grid: { az: -.35, el: .22, dist: 30, tx: -21, ty: 6, tz: 2.5 },
      monitor: { az: .3, el: .1, dist: 10, tx: -2.6, ty: 2.7, tz: 4.6 },
      walkway: { az: .1, el: .62, dist: 21, tx: 14, ty: 8.7, tz: -2 },
      pipe: { az: .2, el: .6, dist: 21, tx: 10, ty: 9.3, tz: -3 },
      safety: { az: .25, el: .38, dist: 28, tx: 14, ty: 8.2, tz: 3 },
      carport: { az: .55, el: .24, dist: 27, tx: 39, ty: 2.8, tz: -2 }
    };
    const cam = Object.assign({}, HOME), tgt = Object.assign({}, HOME);
    let W = 1200, Hh = 640, DPR = 1, dprCap = 2;
    const fitK = () => Math.pow(clamp(1.875 / (W / Hh), 1, 2.6), .85);
    function placeCam() {
      const ce = Math.cos(cam.el); camera.position.set(cam.tx + cam.dist * Math.sin(cam.az) * ce, Math.max(.6, cam.ty + cam.dist * Math.sin(cam.el)), cam.tz + cam.dist * Math.cos(cam.az) * ce); camera.lookAt(cam.tx, cam.ty, cam.tz);
    }
    function resize() {
      const r = cv.getBoundingClientRect(); W = Math.max(300, r.width); Hh = Math.max(220, r.height); DPR = Math.min(dprCap, window.devicePixelRatio || 1);
      renderer.setPixelRatio(DPR); renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.setViewOffset(W, Hh, 0, -.1 * Hh, W, Hh); camera.updateProjectionMatrix();
      if (selected === null) { tgt.dist = HOME.dist * fitK(); cam.dist = tgt.dist; }
    }
    let selected = null, hover = null;

    /* ================= scene content ================= */
    const root = new T.Group(); scene.add(root);
    const PK = {}, OCC = [], HLM = {}, ANIM = [];
    const hl = (part, ...ms) => { (HLM[part] = HLM[part] || []).push(...ms); };
    function add(g, m, o) {
      o = o || {}; const me = new T.Mesh(g, m); me.castShadow = o.cs !== false; me.receiveShadow = o.rs !== false; (o.p || root).add(me);
      if (o.part) { me.userData.part = o.part; if (o.hb) me.userData.hb = 1; (PK[o.part] = PK[o.part] || []).push(me); } else if (o.occ) OCC.push(me); return me;
    }
    function inst(g, m, mats, o) { const im = new T.InstancedMesh(g, m, mats.length); mats.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; o = o || {}; im.castShadow = o.cs !== false; im.receiveShadow = true; (o.p || root).add(im); if (o.part) { im.userData.part = o.part; (PK[o.part] = PK[o.part] || []).push(im); } im.computeBoundingSphere(); return im; }
    const place = (me, X, Y, Z, p) => { me.quaternion.setFromRotationMatrix(_m.makeBasis(X, Y, Z)); me.position.copy(p); return me; };
    const basisM = (X, Y, Z, p, sx, sy, sz) => { const m = new T.Matrix4().makeBasis(X, Y, Z); m.setPosition(p); if (sx !== undefined) m.multiply(new T.Matrix4().makeScale(sx, sy, sz)); return m; };
    const tm = (x, y, z, sx, sy, sz, ry) => new T.Matrix4().compose(new V3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new V3(sx || 1, sy || 1, sz || 1));
    const planeXZ = (w, d, um, y) => { const g = new T.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / um, uv.getY(i) * d / um); if (y) g.translate(0, y, 0); return g; };
    const flat = (w, d, x, y, z, m, o) => add(xf(new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), x, y, z), m, Object.assign({ cs: false }, o));

    /* ---------- site: ground, yard, road ---------- */
    grsT.repeat.set(260, 260); add(xf(new T.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2), 0, 0, 0), mat.grass, { cs: false });
    for (let i = 0; i < 26; i++) { const r = 14 + rnd() * 40, p = new T.Mesh(new T.PlaneGeometry(r, r * (.5 + rnd() * .6)).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: patchT, transparent: true, depthWrite: false, opacity: .1 + rnd() * .12, color: rnd() < .5 ? '#2f4a20' : '#9bab6a', fog: true })); p.position.set(-90 + rnd() * 200, .02, -90 + rnd() * 90); scene.add(p); }
    mat.conc.map.repeat.set(1, 1);
    add(planeXZ(94, 24.4, 4, 0).translate(11, .04, 16.8), mat.conc, { cs: false });
    add(planeXZ(46, 22, 4, 0).translate(-11, .04, -8), mat.conc, { cs: false });          // side yard
    add(xf(planeXZ(240, 12, 5), 11, .03, 36), mat.asph, { cs: false });
    { const g = [], dash = (x0, x1, z, w) => g.push(xf(new T.PlaneGeometry(x1 - x0, w).rotateX(-Math.PI / 2), (x0 + x1) / 2, .07, z));
      for (let x = -100; x < 120; x += 6) dash(x, x + 3, 36, .14); dash(-110, 130, 30.7, .14); dash(-110, 130, 41.3, .14);
      add(merge(g), std({ color: '#d9d4c0', roughness: .8 }), { cs: false });
      const y = [], pk = (x0, x1, z) => y.push(xf(new T.PlaneGeometry(x1 - x0, .1).rotateX(-Math.PI / 2), (x0 + x1) / 2, .07, z));
      [4.35, 1.25, -1.85, -4.95, -8.05].forEach(z => { pk(31.3, 38, z); pk(40, 46.7, z); });
      for (let k = 0; k < 6; k++) { const x = 22 + k * 3.2; y.push(xf(new T.PlaneGeometry(.1, 5).rotateX(-Math.PI / 2), x, .07, 22)); }
      add(merge(y), std({ color: '#e6e6df', roughness: .8 }), { cs: false });
      add(cbox(-70, 90, 0, .16, 29.7, 30.1, 4), mat.conc);
    }
    /* distant hills + neighbouring plants + lattice tower */
    { const SEG = 180, pos = [], idx = []; const H = a => 16 + 30 * (Math.sin(a * 3 + 1) * .5 + .5) * (Math.sin(a * 7.3 + 2) * .3 + .7) + 8 * Math.sin(a * 17);
      for (let i = 0; i <= SEG; i++) { const a = i / SEG * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), h = H(a); [[420, -4], [470, h], [560, h * .8], [760, 0]].forEach(([r, y]) => pos.push(c * r + 10, y, s * r - 5)); }
      for (let i = 0; i < SEG; i++) for (let k = 0; k < 3; k++) { const a = i * 4 + k, b = a + 4; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); add(g, new T.MeshStandardMaterial({ color: '#5d7468', roughness: 1, side: T.DoubleSide }), { cs: false, rs: false }); }
    [[-62, -78, 44, 26, 9.5], [-8, -92, 56, 30, 11], [48, -80, 38, 24, 9], [84, -64, 30, 20, 8], [-98, -50, 30, 22, 8]].forEach(([x, z, w, d, h]) => {
      add(cbox(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, 1, 2), mat.wall, { rs: false }); add(cbox(x - w / 2 - .3, x + w / 2 + .3, h, h + .5, z - d / 2 - .3, z + d / 2 + .3, 1, 2), std({ color: '#496f9e', map: claC, normalMap: claN, roughness: .55, metalness: .5 }), { rs: false });
      add(new T.CylinderGeometry(.5, .6, 6, 8).translate(x + w * .3, h + 3, z), mat.steel, { cs: false });
    });
    { const L = [], pts = (y, h) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new V3(a * h, y, b * h)), lv = 8, Hh = 42;
      const hw = y => 3.2 * (1 - y / Hh) + .5; let prev = pts(0, hw(0));
      for (let i = 1; i <= lv; i++) { const y = i * Hh / lv, cur = pts(y, hw(y)); for (let k = 0; k < 4; k++) { L.push(rod(prev[k], cur[k], .13), rod(cur[k], cur[(k + 1) % 4], .07), rod(prev[k], cur[(k + 1) % 4], .06), rod(prev[(k + 1) % 4], cur[k], .06)); } prev = cur; }
      L.push(cy(.06, 7, 0, Hh + 3, 0, 5)); [[1, 30], [-1, 24], [1, 36]].forEach(([s, y], i) => L.push(xf(new T.CylinderGeometry(1, 1, .15, 14).rotateX(Math.PI / 2), s * (hw(y) + .6), y, 0, 0, i * .8)));
      const tw = add(xf(merge(L), -52, 0, -52), mat.galv, { rs: false }); tw.castShadow = false; }
    /* perimeter fence (chain-link) + gate */
    { const fT = tex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(190,196,200,.85)'; g.lineWidth = 2; for (let k = -h; k < w + h; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke(); } }, { lin: 0 });
      const fm = new T.MeshBasicMaterial({ map: fT, transparent: true, alphaTest: .1, side: T.DoubleSide, depthWrite: false, color: '#9aa0a4' }), segs = [], posts = [];
      const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), g = new T.PlaneGeometry(L, 2.1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 2.1, uv.getY(i)); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, 1.1, (z0 + z1) / 2); segs.push(g); const n = Math.ceil(L / 3); for (let i = 0; i <= n; i++) posts.push(cy(.05, 2.3, x0 + (x1 - x0) * i / n, 1.15, z0 + (z1 - z0) * i / n, 6)); };
      run(-34, 28.3, 6.5, 28.3); run(17.5, 28.3, 56, 28.3); run(-34, -30, 56, -30); run(-34, -30, -34, 28.3); run(56, -30, 56, 28.3);
      const fs = add(merge(segs), fm, { cs: false, rs: false }); fs.renderOrder = 2; add(merge(posts), mat.galv);
      add(cbox(6.4, 6.8, 0, 3.4, 28.1, 28.5), mat.galv); add(cbox(17.2, 17.6, 0, 3.4, 28.1, 28.5), mat.galv);
      const gt = add(xf(new T.PlaneGeometry(5.4, 2.1), 9.5, 1.15, 28.3), fm, { cs: false }); gt.renderOrder = 2; add(merge([cbox(6.8, 12.4, 2.1, 2.22, 28.25, 28.35), cbox(6.8, 12.4, .08, .2, 28.25, 28.35), cbox(6.8, 6.92, 0, 2.2, 28.25, 28.35), cbox(12.3, 12.4, 0, 2.2, 28.25, 28.35)]), mat.galv);
      add(xf(new T.PlaneGeometry(2.4, 1.2), 12, 2.9, 28.2), new T.MeshBasicMaterial({ map: signTex(['KAWASAN PLTS', 'DILARANG MASUK'], '#f2c01c', '#1b1b1b', 256, 128) })); }
    /* yard lighting poles */
    const poleLamps = [];
    [[-1, 21], [34, 19], [50, 14], [-22, 14], [-4, -22], [30, -22]].forEach(([x, z]) => {
      add(merge([cy(.1, 9, x, 4.5, z, 8, .07), bx(2.0, .1, .1, x, 8.9, z), bx(.7, .12, .4, x - .9, 8.85, z), bx(.7, .12, .4, x + .9, 8.85, z)]), mat.galv);
      const lm = ledM('#fff6dc'); add(merge([bx(.62, .04, .34, x - .9, 8.77, z), bx(.62, .04, .34, x + .9, 8.77, z)]), lm, { cs: false }); poleLamps.push(lm);
      const gl = new T.Mesh(new T.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), glowAdd.clone()); gl.position.set(x, .09, z); gl.renderOrder = 3; scene.add(gl); poleLamps.push(gl);
    });

    /* ---------- production hall ---------- */
    const HX0 = -6, HX1 = 30, HZ0 = -18, HZ1 = 4, EAVE = 8, RZ = -7, RIDGE = 10, TH = Math.atan2(RIDGE - EAVE, HZ1 - RZ), SS = Math.sin(TH), CC = Math.cos(TH), SL = (HZ1 - RZ) / CC;
    // floor
    { const fl = tex(1024, 640, (g, w, h) => { g.fillStyle = '#868a8d'; g.fillRect(0, 0, w, h); grain(g, w, h, 6000, .12); g.strokeStyle = 'rgba(30,30,30,.35)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 171) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 160) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.fillStyle = '#e1ae17'; g.fillRect(0, 205, w, 8); g.fillRect(0, 214 + 20, w, 0); g.fillRect(0, 465, w, 8); for (let x = 60; x < w; x += 340) { g.fillRect(x, 213, 8, 252); } });
      add(xf(new T.BoxGeometry(35.5, .12, 21.5), 12, .06, -7), std({ map: fl, roughness: .42, metalness: .1 }), { occ: 1 }); }
    // front wall, built around the openings
    const wz0 = 3.75, wz1 = 4.0, W_ = (x0, x1, y0, y1, m, z0, z1) => add(cbox(x0, x1, y0, y1, z0 === undefined ? wz0 : z0, z1 === undefined ? wz1 : z1, 1, 2), m || mat.wall, { occ: 1 });
    W_(-6, 17.5, 0, 1.1, mat.conc, wz0 - .06, wz1 + .06); W_(22.5, 30, 0, 1.1, mat.conc, wz0 - .06, wz1 + .06);
    W_(-6, 17, 1.1, 5.4, mat.wall); W_(-6, 17, 6.6, 8, mat.wall); W_(-6, -5.5, 5.4, 6.6); W_(16.5, 17, 5.4, 6.6);
    W_(17, 17.5, 1.1, 8); W_(22.5, 24.5, 1.1, 8); W_(29.5, 30, 1.1, 8); W_(17.5, 22.5, 5, 8); W_(24.5, 29.5, 5, 8);
    add(cbox(-5.5, 16.5, 5.4, 6.6, 3.85, 3.92), mat.poly);
    // door 1 (open roller shutter) + door 2 (closed, dock)
    add(merge([xf(new T.CylinderGeometry(.22, .22, 5, 14).rotateZ(Math.PI / 2), 20, 5.05, 3.82), cbox(17.4, 17.55, 0, 5, 3.7, 4.12), cbox(22.45, 22.6, 0, 5, 3.7, 4.12), cbox(17.4, 22.6, 4.95, 5.15, 3.7, 4.12)]), mat.steelD);
    add(cbox(24.5, 29.5, 1.1, 5, 3.8, 3.9, .5, .5), mat.shutter, { occ: 1 }); add(merge([cbox(24.4, 24.55, 1.1, 5, 3.7, 4.12), cbox(29.45, 29.6, 1.1, 5, 3.7, 4.12), cbox(24.4, 29.6, 4.95, 5.15, 3.7, 4.12)]), mat.steelD);
    // loading dock: platform, bumpers, leveller, ramp
    add(cbox(24, 30.2, 0, 1.1, 4, 8.2, 4), mat.conc); add(cbox(24, 30.2, 1.1, 1.16, 4, 8.2, 4), mat.concD); add(cbox(24, 30.2, 1.1, 1.2, 8.05, 8.2), mat.yellow);
    add(merge([bx(.35, .5, .25, 25.2, 2.6, 4.12), bx(.35, .5, .25, 28.8, 2.6, 4.12), bx(5, .08, 2.2, 27, 1.18, 5.3)]), mat.rubber); add(cbox(26, 28, 1.14, 1.2, 4.1, 6.3), mat.steelD);
    add(merge([cbox(30.2, 33.5, 0, .22, 4, 8.2, 4)]), mat.conc);
    // personnel door + windows on the left of the front wall
    add(cbox(-5.55, -4.45, 0, 2.15, 4, 4.08), mat.steelD); add(cbox(-5.4, -4.6, .1, 2.05, 4.08, 4.1), mat.cabW);
    // back wall + gable walls (extruded pentagon)
    add(cbox(HX0, HX1, 0, EAVE, HZ0, HZ0 + .25, 1, 2), mat.wall, { occ: 1 });
    function gable(x) { const sh = new T.Shape(); sh.moveTo(-4, 0); sh.lineTo(18, 0); sh.lineTo(18, EAVE); sh.lineTo(-RZ, RIDGE); sh.lineTo(-4, EAVE); sh.closePath(); const g = new T.ExtrudeGeometry(sh, { depth: .25, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x, 0, 0); return g; }
    add(gable(HX0), mat.wall, { occ: 1 }); add(gable(HX1 - .25), mat.wall, { occ: 1 }); add(cbox(HX0 - .06, HX0 + .25, 0, 1.1, HZ0, HZ1, 4), mat.conc); add(cbox(HX1 - .25, HX1 + .06, 0, 1.1, HZ0, HZ1, 4), mat.conc);
    // right gable details: louvres, personnel door, electrical box, downpipe
    add(merge([cbox(30.0, 30.05, 5.2, 6.4, -12, -9.5), cbox(30.0, 30.05, 5.2, 6.4, -4.5, -2)]), mat.shutter); add(cbox(30.0, 30.08, 0, 2.15, -9.4, -8.3), mat.steelD);
    add(cbox(30.0, 30.3, 1.2, 2.2, -14, -13.3), mat.cabW);
    // interior frames + crane
    { const fr = []; for (let x = -4; x <= 28; x += 6.4) { fr.push(bx(.3, 8, .3, x, 4, 3.55), bx(.3, 8, .3, x, 4, -17.55)); [1, -1].forEach(sd => { const a = new V3(x, 8, sd > 0 ? 3.55 : -17.55), b = new V3(x, 10, -7); fr.push(rod(a, b, .1, 4)); }); }
      add(merge(fr), mat.paintG, { rs: false }); const cr = [bx(36, .5, .3, 12, 6.0, 3.2), bx(36, .5, .3, 12, 6.0, -16.8), bx(.5, .7, 20.6, 8, 6.4, -6.8), bx(.8, .5, .8, 8, 5.9, -6.8)]; add(merge(cr), mat.rackO, { rs: false }); add(merge([cy(.03, 3, 8, 4.4, -6.8, 5)]), mat.cable); }
    // roof sheets, ridge, parapets, gutters
    const slopeP = (side, x, s, h) => new V3(x, RIDGE - s * SS + h * CC, RZ + side * (s * CC + h * SS));
    const slopeN = side => new V3(0, CC, side * SS), slopeD = side => new V3(0, -SS, side * CC);
    [1, -1].forEach(side => {
      const n = slopeN(side), d = slopeD(side), X = new V3(side, 0, 0);
      const sheet = add(tileBox(new T.BoxGeometry(36.8, .1, SL + .5), 36.8, .1, SL + .5, 1, 2), mat.roof, { occ: 1 }); place(sheet, X, n, new V3().crossVectors(X, n), slopeP(side, 12, (SL + .5) / 2, -.05));
      [-6.3, 30.3].forEach(px => { const pa = add(tileBox(new T.BoxGeometry(.2, .42, SL + .5), .2, .42, SL + .5, 1, 2), mat.wall); place(pa, X, n, new V3().crossVectors(X, n), slopeP(side, px, (SL + .5) / 2, .2)); });
      const gt = add(new T.BoxGeometry(36.9, .16, .22), mat.galv); gt.position.copy(slopeP(side, 12, SL + .55, -.1)); gt.position.y -= .08;
    });
    add(cbox(-6.4, 30.4, 9.97, 10.1, -7.15, -6.85), mat.galv);
    // downpipes, roof-access ladder with cage (right gable)
    add(merge([cy(.06, 7.7, -5.8, 4.1, 4.2, 8), cy(.06, 7.7, 16.8, 4.1, 4.2, 8), cy(.06, 7.7, 29.7, 4.1, 4.2, 8), cy(.06, 7.7, 29.7, 4.1, -18.2, 8)]), mat.galv);
    { const lx = 30.2, lz = 1.6, L = [cy(.03, 8.2, lx, 4.3, lz - .22, 5), cy(.03, 8.2, lx, 4.3, lz + .22, 5)]; for (let y = .4; y < 8.2; y += .3) L.push(xf(new T.CylinderGeometry(.02, .02, .44, 5).rotateX(Math.PI / 2), lx, y, lz));
      add(merge(L), mat.galv); const cg = []; for (let y = 2.6; y < 8; y += .9) cg.push(xf(new T.TorusGeometry(.42, .018, 5, 14, Math.PI * 1.35).rotateY(Math.PI / 2).rotateX(0), lx + .3, y, lz)); cg.push(cy(.015, 5.6, lx + .7, 5.3, lz - .2, 4), cy(.015, 5.6, lx + .7, 5.3, lz + .2, 4)); add(merge(cg), mat.yellow); }
    // fascia sign above the doors
    add(new T.PlaneGeometry(12.6, 1.29).translate(23.5, 6.45, 4.06), new T.MeshStandardMaterial({ map: signT, roughness: .5, metalness: .2, emissive: '#ffffff', emissiveMap: signT, emissiveIntensity: .12 }), { cs: false });
    add(cbox(16.9, 30.1, 5.75, 7.2, 4.0, 4.05), mat.navy);

    /* ---------- rooftop PV: portrait modules in long rows, rails, feet, clamps ---------- */
    const MW = 1.134, ML = 2.278, PX0 = -5.3, NC = 30, CPI = 1.154, S0 = [.95, 6.1], MPI = 2.298, LIFT = .17, ROWS = [];
    const glassG = xf(new T.PlaneGeometry(ML - .04, MW - .04).rotateX(-Math.PI / 2), 0, .0196, 0), frameG = new T.BoxGeometry(ML, .035, MW);
    const gM = [], fM = [], rM = [], ftM = [], clM = [];
    const railG = new T.BoxGeometry(1, .04, .05), footG = new T.BoxGeometry(.07, .12, .09), clampG = new T.BoxGeometry(.04, .035, .06);
    [1, -1].forEach(side => {
      const n = slopeN(side), d = slopeD(side), Z = new V3().crossVectors(d, n), X = new V3(1, 0, 0), Zr = new V3().crossVectors(X, n);
      S0.forEach(s0 => {
        for (let m = 0; m < 2; m++) {
          const sc = s0 + (m + .5) * MPI;
          for (let c = 0; c < NC; c++) { const mm = basisM(d, n, Z, slopeP(side, PX0 + (c + .5) * CPI, sc, LIFT)); gM.push(mm); fM.push(mm); }
          [-.57, .57].forEach(o => {
            rM.push(basisM(X, n, Zr, slopeP(side, PX0 + NC * CPI / 2, sc + o * side * 0 + o, LIFT - .0375), NC * CPI, 1, 1));
            for (let k = 0; k < 29; k++) ftM.push(basisM(X, n, Zr, slopeP(side, PX0 + .6 + k * 1.2, sc + o, .055)));
            for (let k = 0; k <= NC; k += 1) clM.push(basisM(X, n, Zr, slopeP(side, PX0 + k * CPI, sc + o, LIFT - .0125)));
          });
        }
      });
    });
    inst(glassG, mat.glass, gM, { part: 'pv', cs: false }); inst(frameG, mat.frame, fM, { part: 'pv' }); hl('pv', mat.glass, mat.frame);
    inst(railG, mat.alu, rM); inst(footG, mat.galv, ftM); inst(clampG, mat.black, clM, { cs: false });
    // ridge aisle (light grey grating), orange walkway between bands, DC tray, turbines
    const ridgeSeg = []; for (let i = 0; i < 6; i++) { const x0 = -5.6 + i * 5.9, x1 = x0 + 5.4; ridgeSeg.push(tileBox(xf(new T.BoxGeometry(x1 - x0, .05, 1.3), (x0 + x1) / 2, 10.07, RZ), x1 - x0, .05, 1.3, .5, .5)); }
    add(merge(ridgeSeg), mat.grat, { occ: 1 });
    const walkM = std({ color: '#ffffff', map: perfT, roughness: .5, metalness: .5 }); hl('walkway', walkM);
    [1, -1].forEach(side => {
      const n = slopeN(side), X = new V3(1, 0, 0), Zr = new V3().crossVectors(X, n); const wl = NC * CPI;
      const w = add(tileBox(new T.BoxGeometry(wl, .05, .5), wl, .05, .5, .5, .5), walkM, { part: 'walkway' }); place(w, X, n, Zr, slopeP(side, PX0 + wl / 2, 5.83, .1));
      inst(footG, mat.galv, Array.from({ length: 29 }, (_, k) => basisM(X, n, Zr, slopeP(side, PX0 + .6 + k * 1.2, 5.83, .045))), { cs: false });
      const tr = add(tileBox(new T.BoxGeometry(wl + 1.2, .05, .32), wl + 1.2, .05, .32, .3, .3), mat.ladder); place(tr, X, n, Zr, slopeP(side, PX0 + wl / 2, 10.95, .1));
    });
    // red water-cleaning pipe with nozzles; ridge pipe, mid pipe, risers
    const pipeM = std({ color: '#b5322f', roughness: .45, metalness: .3 }); hl('pipe', pipeM); const NOZ = [];
    [1, -1].forEach(side => {
      const n = slopeN(side), d = slopeD(side), X = new V3(1, 0, 0), wl = NC * CPI, G_ = [];
      [.8, 5.62].forEach((s, pi) => {
        const a = slopeP(side, PX0, s, .13), b = slopeP(side, PX0 + wl, s, .13); G_.push(rod(a, b, .04, 8));
        for (let k = 0; k < 7; k++) { const x = PX0 + 1.8 + k * 4.5, p = slopeP(side, x, s, .13); G_.push(rod(p, p.clone().addScaledVector(n, .3), .022, 5)); NOZ.push({ p: p.clone().addScaledVector(n, .32), v: d.clone().multiplyScalar(pi ? -1.6 : 3.2).addScaledVector(n, 2.6), k: NOZ.length }); G_.push(rod(slopeP(side, PX0 + 1.8 + k * 4.5 + .0, s, .06), slopeP(side, PX0 + 1.8 + k * 4.5, s, .13), .02, 4)); }
      });
      [-5.65, PX0 + wl + .35].forEach(x => G_.push(rod(slopeP(side, x, .8, .13), slopeP(side, x, 11, .13), .04, 8)));
      add(merge(G_), pipeM, { part: 'pipe' });
    });
    // safety lifeline: yellow posts + blue cable
    const postM = [], cabG = [];
    [1, -1].forEach(side => {
      const n = slopeN(side), eave = []; for (let i = 0; i < 8; i++) { const x = -5.7 + i * 5.1; eave.push(x); postM.push(basisM(new V3(1, 0, 0), n, new V3().crossVectors(new V3(1, 0, 0), n), slopeP(side, x, 11.15, .65))); }
      for (let i = 0; i < 7; i++) cabG.push(...[0].map(() => tube(cat(slopeP(side, eave[i], 11.15, 1.18).toArray(), slopeP(side, eave[i + 1], 11.15, 1.18).toArray(), .07, 6), .016, 12)));
      [-6.05, 30.05].forEach(x => { const ss = [2, 4.6, 7.3, 10.2]; ss.forEach(s => postM.push(basisM(new V3(1, 0, 0), n, new V3().crossVectors(new V3(1, 0, 0), n), slopeP(side, x, s, .65)))); for (let i = 0; i < 3; i++) cabG.push(tube(cat(slopeP(side, x, ss[i], 1.18).toArray(), slopeP(side, x, ss[i + 1], 1.18).toArray(), .05, 6), .016, 10)); });
    });
    const safeM = std({ color: '#2d62b5', roughness: .5, metalness: .4 }), postMat = std({ color: '#e1ae17', roughness: .55, metalness: .25 }); hl('safety', safeM, postMat);
    inst(new T.CylinderGeometry(.035, .035, 1.3, 6), postMat, postM, { part: 'safety' }); add(merge(cabG), safeM, { part: 'safety', cs: false });
    // turbine ventilators along the ridge aisle
    { const prof = [[.26, 0], [.3, .08], [.36, .25], [.39, .45], [.35, .65], [.22, .82], [.0, .92]].map(p => new T.Vector2(p[0], p[1])); const parts = [new T.LatheGeometry(prof, 24), cy(.18, .4, 0, -.2, 0, 10), cy(.3, .06, 0, -.38, 0, 12)];
      for (let a = 0; a < 18; a++) { const an = a / 18 * Math.PI * 2; parts.push(xf(new T.BoxGeometry(.012, .62, .2), Math.cos(an) * .37, .46, Math.sin(an) * .37, 0, -an + .7, 0)); }
      const tg = merge(parts); for (let i = 0; i < 6; i++) { const m = add(tg, mat.steel); m.position.set(-3.5 + i * 6.2, 10.44, RZ); m.userData.spin = .8 + rnd() * .3; ANIM.push(m); } }
    // lightning protection: air terminals, ridge conductor, down conductors + earth pits
    { const L = []; for (let i = 0; i < 7; i++) L.push(cy(.012, 1.1, -5.5 + i * 6, 10.65, RZ + .0, 5), new T.SphereGeometry(.03, 6, 4).translate(-5.5 + i * 6, 11.2, RZ));
      L.push(rod(new V3(-6.1, 10.14, RZ + .55), new V3(30.1, 10.14, RZ + .55), .01, 4)); [-6.2, 30.2].forEach(x => { L.push(rod(new V3(x, 10.14, RZ + .55), new V3(x, EAVE + .1, HZ1 + .1), .01, 4), rod(new V3(x, EAVE, HZ1 + .15), new V3(x, .08, HZ1 + .15), .012, 4)); });
      add(merge(L), mat.copper, { cs: false }); [-6.2, 30.2].forEach(x => { add(cbox(x - .22, x + .22, 0, .08, HZ1 + .0, HZ1 + .45), mat.concD); add(xf(new T.PlaneGeometry(.18, .18).rotateX(-Math.PI / 2), x, .085, HZ1 + .22), new T.MeshBasicMaterial({ map: signTex(['E'], '#2a2f33', '#d8d8d8', 64, 64) }), { cs: false }); }); }
    // rooftop weather station (monitor) + yellow guardrail
    { const bx0 = 28.3, by = 10.1, bz = RZ, P = 'monitor', Wm = std({ color: '#f1f2f2', roughness: .5, metalness: .1 });
      add(merge([cy(.035, 2.6, bx0, by + 1.3, bz, 8), bx(1.3, .035, .035, bx0, by + 2.0, bz)]), mat.galv, { part: P });
      const sh = []; for (let i = 0; i < 6; i++) sh.push(new T.CylinderGeometry(.11, .07, .03, 12).translate(bx0 - .55, by + 1.82 + i * .036, bz)); sh.push(cy(.025, .2, bx0 - .55, by + 1.95, bz, 6)); add(merge(sh), Wm, { part: P });
      add(merge([cy(.06, .05, bx0 + .55, by + 2.04, bz, 12), new T.SphereGeometry(.055, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(bx0 + .55, by + 2.065, bz)]), std({ color: '#e8eef2', roughness: .15, metalness: .1, transparent: true, opacity: .85 }), { part: P });
      add(merge([cy(.03, .3, bx0, by + 2.75, bz, 6), bx(.5, .02, .1, bx0 + .15, by + 2.95, bz, 0), xf(new T.ConeGeometry(.04, .14, 6).rotateZ(Math.PI / 2), bx0 - .2, by + 2.95, bz)]), Wm, { part: P });
      const cups = [rod(new V3(bx0 - .2, by + 2.6, bz), new V3(bx0 + .2, by + 2.6, bz), .01, 4), rod(new V3(bx0, by + 2.6, bz - .2), new V3(bx0, by + 2.6, bz + .2), .01, 4)]; [[-.2, 0], [.2, 0], [0, -.2], [0, .2]].forEach(([a, b]) => cups.push(new T.SphereGeometry(.04, 6, 4, 0, Math.PI).translate(bx0 + a, by + 2.62, bz + b))); add(merge(cups), mat.black, { part: P });
      add(cbox(bx0 - .12, bx0 + .12, by + .7, by + 1.0, bz + .04, bz + .22), Wm, { part: P }); add(tube([[bx0, by + .8, bz + .2], [bx0 + .2, by + .5, bz + .3], [bx0 + .8, by + .1, bz + .5]], .012), mat.cable, { part: P });
            const hq = [cy(.022, 1.1, 25.5, by + .55, bz + 1.35, 5), cy(.022, 1.1, 27.6, by + .55, bz + 1.35, 5), cy(.022, 1.1, 29.7, by + .55, bz + 1.35, 5)]; hq.push(rod(new V3(25.5, by + 1.1, bz + 1.35), new V3(29.7, by + 1.1, bz + 1.35), .022, 5), rod(new V3(25.5, by + .6, bz + 1.35), new V3(29.7, by + .6, bz + 1.35), .022, 5)); add(merge(hq), mat.yellow); }

    /* ---------- dynamic screens (CanvasTexture, redrawn only when the value changes) ---------- */
    const SCR = {};
    function screen(name, w, h, fn) { const t = tex(w, h, () => { }, { clamp: 1 }); t.userData.fn = fn; t.userData.key = null; SCR[name] = t; t.anisotropy = 8; return t; }
    function upScreen(name, key) { const t = SCR[name]; if (t.userData.key === key) return; t.userData.key = key; const { c, g } = t.userData; t.userData.fn(g, c.width, c.height); t.needsUpdate = true; }
    const F2 = 'Figtree, system-ui, sans-serif', F1 = 'Bricolage Grotesque, Figtree, system-ui, sans-serif';
    let peakKW = 0;
    const eDay = () => { if (S.pvFrac > .12) peakKW = S.pv / S.pvFrac; const h = clamp(S.hour, 6, 18); return peakKW * (12 / Math.PI) * (1 - Math.cos(Math.PI * (h - 6) / 12)) * .72 * (1 - .45 * WX.ov); };
    const tvT = screen('tv', 1024, 576, (g, w, h) => {
      g.fillStyle = '#071526'; g.fillRect(0, 0, w, h); g.fillStyle = '#0c2440'; g.fillRect(0, 0, w, 62); g.fillStyle = '#e7f1fb'; g.font = `700 26px ${F2}`; g.textBaseline = 'middle'; g.fillText('HME MONITORING  |  PLTS Atap Pabrik', 24, 32); g.textAlign = 'right'; g.fillStyle = '#7fb3e0'; g.font = `600 22px ${F2}`; const hh = Math.floor(S.hour), mm = Math.floor((S.hour % 1) * 60); g.fillText(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + '   ' + (S.mode === 'ongrid' ? 'On-Grid' : S.mode === 'offgrid' ? 'Off-Grid' : 'Hybrid'), w - 24, 32); g.textAlign = 'left';
      const tiles = [['PRODUKSI HARI INI', (eDay() / 1000).toFixed(2), 'MWh', '#3ee0b0'], ['DAYA SAAT INI', S.pv.toFixed(0), 'kW', '#ffc233'], ['BEBAN PABRIK', (S.served ? S.load : 0).toFixed(0), 'kW', '#5cc8ff']];
      tiles.forEach(([t, v, u, c], i) => { const x = 20 + i * 232, y = 80; g.fillStyle = '#0f2a4a'; g.fillRect(x, y, 218, 112); g.fillStyle = c; g.fillRect(x, y, 5, 112); g.fillStyle = '#8fb2d4'; g.font = `700 15px ${F2}`; g.fillText(t, x + 18, y + 24); g.fillStyle = '#fff'; g.font = `800 52px ${F1}`; g.fillText(v, x + 18, y + 68); const tw = g.measureText(v).width; g.fillStyle = c; g.font = `600 22px ${F2}`; g.fillText(u, x + 26 + tw, y + 70); g.fillStyle = '#6f93b5'; g.font = `500 14px ${F2}`; g.fillText(i === 0 ? 'akumulasi harian' : i === 1 ? 'dari panel surya' : 'terlayani', x + 18, y + 96); });
      const cx = 20, cy0 = 214, cw = 696, ch = 330; g.fillStyle = '#0a1f38'; g.fillRect(cx, cy0, cw, ch); g.fillStyle = '#8fb2d4'; g.font = `700 16px ${F2}`; g.fillText('Produksi vs beban (24 jam)', cx + 16, cy0 + 24);
      const X = hr => cx + 40 + hr / 24 * (cw - 60), Y = v => cy0 + ch - 34 - v * (ch - 90);
      g.strokeStyle = 'rgba(143,178,212,.18)'; g.lineWidth = 1; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(cx + 40, Y(k / 4)); g.lineTo(cx + cw - 20, Y(k / 4)); g.stroke(); } g.fillStyle = '#6f93b5'; g.font = `500 14px ${F2}`; g.textAlign = 'center'; for (let k = 0; k <= 24; k += 6) g.fillText(String(k).padStart(2, '0'), X(k), cy0 + ch - 12); g.textAlign = 'left';
      const gr = g.createLinearGradient(0, Y(1), 0, Y(0)); gr.addColorStop(0, 'rgba(62,224,176,.55)'); gr.addColorStop(1, 'rgba(62,224,176,.02)'); g.beginPath(); g.moveTo(X(0), Y(0)); for (let k = 0; k <= 48; k++) { const hr = k / 2; g.lineTo(X(hr), Y(Math.max(0, Math.sin(Math.PI * (hr - 6) / 12)) * (1 - .45 * WX.ov))); } g.lineTo(X(24), Y(0)); g.closePath(); g.fillStyle = gr; g.fill();
      g.beginPath(); for (let k = 0; k <= 48; k++) { const hr = k / 2, v = Math.max(0, Math.sin(Math.PI * (hr - 6) / 12)) * (1 - .45 * WX.ov); k ? g.lineTo(X(hr), Y(v)) : g.moveTo(X(hr), Y(v)); } g.strokeStyle = '#3ee0b0'; g.lineWidth = 3; g.stroke();
      g.beginPath(); for (let k = 0; k <= 48; k++) { const hr = k / 2, v = .55 + .12 * Math.sin(hr / 3); k ? g.lineTo(X(hr), Y(v)) : g.moveTo(X(hr), Y(v)); } g.strokeStyle = '#5cc8ff'; g.lineWidth = 2; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(S.hour), Y(1) - 8); g.lineTo(X(S.hour), Y(0)); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(X(S.hour), Y(Math.max(0, Math.sin(Math.PI * (S.hour - 6) / 12)) * (1 - .45 * WX.ov)), 6, 0, 7); g.fill();
      const lx = 736; g.fillStyle = '#0a1f38'; g.fillRect(lx, 80, 268, 464); g.fillStyle = '#8fb2d4'; g.font = `700 16px ${F2}`; g.fillText('Status perangkat', lx + 16, 104);
      const rows = [['Inverter 1', S.invOk ? 'Normal' : 'Standby', S.invOk ? '#3ee0b0' : '#ff7a6b'], ['Inverter 2', S.invOk ? 'Normal' : 'Standby', S.invOk ? '#3ee0b0' : '#ff7a6b'], ['Inverter 3', S.invOk ? 'Normal' : 'Standby', S.invOk ? '#3ee0b0' : '#ff7a6b'], ['Inverter 4', S.invOk ? 'Normal' : 'Standby', S.invOk ? '#3ee0b0' : '#ff7a6b'], ['Baterai', S.hasBat ? Math.round(S.soc * 100) + '%' : 'tidak ada', S.hasBat ? S.batCol : '#6f93b5'], ['Jaringan PLN', S.mode === 'offgrid' ? 'terputus' : S.isOut ? 'PADAM' : 'terhubung', S.mode === 'offgrid' ? '#6f93b5' : S.isOut ? '#ff7a6b' : '#3ee0b0'], ['Suhu modul', (28 + 24 * S.pvFrac * (1 - .6 * WX.ov)).toFixed(0) + ' °C', '#ffc233'], ['Iradiasi', (1000 * S.pvFrac / .88 * 1).toFixed(0) + ' W/m²', '#ffc233']];
      rows.forEach(([a, b, c], i) => { const y = 120 + i * 52; g.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; g.fillRect(lx + 8, y, 252, 44); g.fillStyle = '#d5e6f7'; g.font = `600 18px ${F2}`; g.fillText(a, lx + 20, y + 23); g.fillStyle = c; g.textAlign = 'right'; g.font = `700 18px ${F2}`; g.fillText(b, lx + 250, y + 23); g.textAlign = 'left'; });
    });
    const meterT = screen('meter', 256, 128, (g, w, h) => { g.fillStyle = '#05101a'; g.fillRect(0, 0, w, h); g.fillStyle = S.meterCol; g.font = `700 64px ${F1}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.meterTxt, w / 2, h / 2 - 6); g.fillStyle = '#7f98ad'; g.font = `600 16px ${F2}`; g.fillText('kW  |  kWh METER', w / 2, h - 16); });
    const bessT = screen('bess', 256, 512, (g, w, h) => { g.fillStyle = '#0b1219'; g.fillRect(0, 0, w, h); g.fillStyle = '#cfe3f5'; g.font = `800 82px ${F1}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(S.soc * 100) + '%', w / 2, 80); g.font = `600 22px ${F2}`; g.fillStyle = '#7f98ad'; g.fillText('STATE OF CHARGE', w / 2, 140); for (let k = 0; k < 6; k++) { const on = k < S.batLed; g.fillStyle = on ? S.batCol : '#1f2a35'; g.shadowColor = on ? S.batCol : 'transparent'; g.shadowBlur = on ? 18 : 0; g.fillRect(34, h - 60 - k * 54, w - 68, 36); } g.shadowBlur = 0; });
    const brandT = tex(128, 40, (g, w, h) => { g.fillStyle = '#3a3e43'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8cdd2'; g.font = `700 24px ${F2}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HME', w / 2, h / 2 + 1); }, { clamp: 1 });

    /* ---------- inverter shelter (outdoor, on the hall's front wall) ---------- */
    const SH = { x0: .6, x1: 16.6, z0: 4.0, z1: 7.2 }, WZ = 4.0;
    { // canopy: steel columns, mono-pitch trapezoid roof, rafters, slab
      add(cbox(.3, 16.9, 0, .14, 4.0, 7.7, 4), mat.conc);
      add(merge([cbox(.3, 16.9, .14, .17, 4.0, 4.3, 1), cbox(.3, 16.9, .14, .17, 7.4, 7.7, 1)]), mat.yellow, { cs: false });
      const cols = [], ras = []; [.8, 4.8, 8.8, 12.8, 16.4].forEach(x => { cols.push(bx(.14, 3.4, .14, x, 1.75, 7.15)); ras.push(rod(new V3(x, 3.62, 4.05), new V3(x, 3.32, 7.3), .05, 5)); });
      cols.push(bx(16.4, .12, .1, 8.6, 3.34, 7.2), bx(16.4, .12, .1, 8.6, 3.66, 4.06)); add(merge(cols.concat(ras)), mat.galv);
      const rf = add(tileBox(new T.BoxGeometry(16.8, .08, 3.45), 16.8, .08, 3.45, 1, 2), mat.roofLo, { occ: 1 }); rf.position.set(8.6, 3.5, 5.7); rf.rotation.x = .1;
      add(bx(16.9, .12, .12, 8.6, 3.43, 7.38), mat.steel);
    }
    const invs = [], invLED = []; let invGeo, gridLive_led;
    { // inverter geometry (soft-edged cover, heat-sink block, handle bracket, hex screws, glands)
      const rr = (w, h, r) => { const s = new T.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; };
      const cover = xf(new T.ExtrudeGeometry(rr(.8, .7, .075), { depth: .19, bevelEnabled: true, bevelSize: .014, bevelThickness: .014, bevelSegments: 3, curveSegments: 6 }), .04, 0, -.045);
      const dark = []; dark.push(bx(.14, .7, .3, -.43, 0, .0)); for (let i = 0; i < 9; i++) dark.push(bx(.006, .62, .1, -.495 + i * .0165, 0, .2)); dark.push(bx(.06, .5, .2, .47, 0, 0), bx(.05, .26, .05, .5, 0, .13), bx(.2, .05, .26, -.2, -.375, 0), bx(.2, .05, .26, .26, -.375, 0), bx(.18, .015, .04, -.45, 0, 0));
      for (let i = 0; i < 5; i++) { dark.push(cy(.022, .08, -.28 + i * .15, -.4, .02, 8)); }
      const sil = []; [[-.31, .31], [.39, .31], [-.31, -.31], [.39, -.31], [.04, .335], [.04, -.335]].forEach(([x, y]) => sil.push(xf(new T.CylinderGeometry(.014, .014, .012, 6).rotateX(Math.PI / 2), x, y, .163)));
      const cb = []; for (let i = 0; i < 5; i++) cb.push(cy(.011, .36, -.28 + i * .15, -.62, .02, 4));
      const led = new T.ShapeGeometry((() => { const s = rr(.075, .075, .014); s.holes.push(rr(.05, .05, .008)); return s; })()), plate = new T.PlaneGeometry(.22, .07);
      invGeo = { cover, dark: merge(dark), sil: merge(sil), cb: merge(cb), led, plate };
    }
    const invX = [3.0, 4.9, 6.8, 8.7];
    invX.forEach((x, i) => {
      const g = new T.Group(); g.position.set(x, 1.76, WZ + .29); root.add(g);
      const part = { part: 'inverter', p: g }; add(invGeo.cover, mat.invCover, part); add(invGeo.dark, mat.invDark, part); add(invGeo.sil, mat.steel, part); add(invGeo.cb, mat.cable, { p: g });
      const lm = ledM('#2aa8ff'); const l = new T.Mesh(invGeo.led, lm); l.position.set(.04, .26, .1625); g.add(l); invLED.push(lm);
      const pl_ = new T.Mesh(invGeo.plate, new T.MeshStandardMaterial({ map: brandT, roughness: .5 })); pl_.position.set(.04, -.2, .1625); g.add(pl_); g.userData.part = 'inverter'; invs.push(g);
    });
    hl('inverter', mat.invCover);
    { // rack, trays, combiner, ACDB, SmartLogger, MDP, earth, extinguisher, signs
      const R = []; [1.38, 2.14].forEach(y => R.push(bx(9.4, .07, .05, 5.9, y, WZ + .1))); [1.95, 3.95, 5.85, 7.75, 9.75].forEach(x => R.push(bx(.06, 2.0, .05, x, 1.75, WZ + .1))); [1.95, 5.85, 9.75].forEach(x => { R.push(bx(.05, .05, .1, x, 1.38, WZ + .05), bx(.05, .05, .1, x, 2.14, WZ + .05)); });
      add(merge(R), mat.galv, { part: 'inverter' });
      const tr = (x0, x1, y, z, wd) => add(tileBox(xf(new T.BoxGeometry(x1 - x0, .06, wd), (x0 + x1) / 2, y, z), x1 - x0, .06, wd, .3, .3), mat.ladder, { part: 'inverter' });
      tr(.05, 16.6, 2.95, 4.3, .34); tr(.05, 10.3, 1.04, 4.3, .26); add(tileBox(xf(new T.BoxGeometry(.3, 5.2, .06), .1, 5.45, 4.1), .3, 5.2, .06, .3, .3), mat.ladder, { part: 'inverter' });
      add(tileBox(xf(new T.BoxGeometry(.32, .9, .06), 14.2, 2.5, 4.36), .32, .9, .06, .3, .3), mat.ladder, { part: 'inverter' });
      add(merge([bx(.55, .75, .22, 1.05, 1.76, WZ + .11), bx(.55, .75, .22, 11.0, 1.76, WZ + .14)]), mat.cab, { part: 'inverter' });
      add(merge([xf(new T.CylinderGeometry(.06, .06, .04, 12).rotateX(Math.PI / 2), 1.05, 1.95, WZ + .24), xf(new T.BoxGeometry(.1, .03, .03), 1.05, 1.95, WZ + .26)]), mat.yellow, { part: 'inverter' });
      add(merge([bx(.35, .4, .02, 11.0, 1.8, WZ + .27), bx(.4, .015, .02, 11.0, 1.55, WZ + .27)]), mat.cabW, { part: 'inverter' });
      add(new T.PlaneGeometry(.36, .12).translate(1.05, 1.5, WZ + .226), new T.MeshBasicMaterial({ map: signTex(['DC COMBINER'], '#d8dadc', '#222', 128, 40) }), { cs: false }); add(new T.PlaneGeometry(.36, .12).translate(11.0, 1.4, WZ + .286), new T.MeshBasicMaterial({ map: signTex(['ACDB'], '#d8dadc', '#222', 128, 40) }), { cs: false });
      // LVMDP: three floor-standing sections
      const md = []; for (let i = 0; i < 3; i++) { const x = 13.4 + i * .8; md.push(bx(.78, 2.1, .6, x, 1.15, 4.62)); }
      add(merge(md), mat.cab, { part: 'inverter' }); const mdd = []; for (let i = 0; i < 3; i++) { const x = 13.4 + i * .8; mdd.push(bx(.02, 1.9, .02, x + .3, 1.15, 4.935), bx(.62, .015, .02, x, 1.95, 4.935), bx(.1, .04, .03, x + .27, 1.1, 4.95)); }
      add(merge(mdd), mat.black, { cs: false, p: root }); add(bx(2.4, .12, .64, 14.2, 0.2, 4.62), mat.rubber);
      const lights = []; for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) lights.push(new T.CircleGeometry(.025, 8).translate(13.2 + i * .8 + k * .09, 1.78, 4.936)); add(merge(lights), ledM('#4de08f'), { cs: false });
      add(new T.PlaneGeometry(1.1, .2).translate(14.2, 2.0, 4.936), new T.MeshBasicMaterial({ map: signTex(['LVMDP  380/220 V'], '#d8dadc', '#222', 256, 40) }), { cs: false });
      // SmartLogger (monitor) with antenna
      add(merge([bx(.4, .26, .1, 12.1, 2.0, WZ + .05), cy(.012, .32, 12.28, 2.28, WZ + .05, 6), bx(.04, .04, .04, 12.28, 2.12, WZ + .05)]), mat.cabW, { part: 'monitor' }); add(new T.CircleGeometry(.014, 8).translate(11.95, 2.05, WZ + .102), ledM('#4de08f'), { cs: false });
      add(new T.PlaneGeometry(.3, .08).translate(12.1, 1.92, WZ + .102), new T.MeshBasicMaterial({ map: signTex(['SMARTLOGGER'], '#2c3136', '#e4e6e7', 128, 36) }), { cs: false });
      // earth bar, earth pit, fire extinguisher, warning signs
      add(merge([bx(.4, .04, .05, .8, .7, WZ + .03), tube([[.7, .7, WZ + .06], [.7, .3, WZ + .08], [.7, .06, WZ + .4], [.7, .0, 4.9]], .012)]), mat.copper, { cs: false }); add(cbox(.5, .9, 0, .06, 4.7, 5.1), mat.concD);
      add(merge([cy(.09, .46, 16.3, 1.3, WZ + .1, 10), cy(.03, .1, 16.3, 1.6, WZ + .1, 8), bx(.16, .05, .05, 16.3, 1.0, WZ + .04)]), mat.red); add(new T.PlaneGeometry(.4, .4).translate(16.3, 1.95, WZ + .02), new T.MeshBasicMaterial({ map: signTex(['APAR'], '#b3231f', '#fff', 64, 64) }), { cs: false });
      add(new T.PlaneGeometry(.42, .38).translate(5.85, 2.45, WZ + .03), new T.MeshBasicMaterial({ map: signTex(['BAHAYA', 'TEGANGAN'], '#f2c01c', '#1b1b1b', 128, 128, 1) }), { cs: false }); add(new T.PlaneGeometry(.42, .38).translate(14.2, 2.4, 4.94), new T.MeshBasicMaterial({ map: signTex(['AWAS', '380 V'], '#f2c01c', '#1b1b1b', 128, 128, 1) }), { cs: false });
      add(new T.PlaneGeometry(.9, .4).rotateX(.1).translate(6.0, 3.0, 7.24), new T.MeshBasicMaterial({ map: signTex(['AREA INVERTER'], '#0a2c4f', '#fdb813', 256, 64) }), { cs: false });
    }
    const shLamp = ledM('#fff0cf'); add(bx(1.4, .05, .12, 8, 3.28, 5.6), shLamp, { cs: false });
    // cables: inverter glands -> DC tray
    { const L = []; invX.forEach(x => { for (let i = 0; i < 5; i++) L.push(rod(new V3(x - .28 + i * .15, 1.38, WZ + .31), new V3(x - .28 + i * .15, 1.06, WZ + .31), .011, 4)); }); add(merge(L), mat.cable, { cs: false }); }

    /* ---------- monitoring TV (wall mounted, under a small awning) ---------- */
    { const tx = -2.2, ty = 2.45;
      add(merge([bx(2.5, 1.45, .07, tx, ty, WZ + .06), bx(.1, .6, .12, tx - .7, ty, WZ + .03), bx(.1, .6, .12, tx + .7, ty, WZ + .03)]), mat.black, { part: 'monitor', hb: 1 });
      add(new T.PlaneGeometry(2.4, 1.35).translate(tx, ty, WZ + .099), new T.MeshBasicMaterial({ map: tvT, toneMapped: false }), { cs: false, part: 'monitor' });
      const aw = add(tileBox(new T.BoxGeometry(3.2, .07, 1.2), 3.2, .07, 1.2, 1, 2), mat.roofLo); aw.position.set(tx, 3.55, WZ + .6); aw.rotation.x = .12; add(merge([rod(new V3(tx - 1.4, 3.4, WZ), new V3(tx - 1.4, 3.35, WZ + 1.1), .03, 4), rod(new V3(tx + 1.4, 3.4, WZ), new V3(tx + 1.4, 3.35, WZ + 1.1), .03, 4)]), mat.galv); }

    /* ---------- BESS container + HVAC ---------- */
    const bessG = new T.Group(); root.add(bessG);
    { const cx = -11, cz = 10.3, o = { part: 'battery', p: bessG }, bm = std({ color: '#e6e9eb', map: claC, normalMap: claN, roughness: .5, metalness: .5 }); hl('battery', bm);
      add(cbox(cx - 3.6, cx + 3.6, 0, .14, cz - 1.9, cz + 1.9, 4), mat.conc, { p: bessG });
      add(cbox(cx - 3.03, cx + 3.03, .14, 2.73, cz - 1.22, cz + 1.22, 1, 2), bm, o);
      add(merge([bx(.1, 2.59, .1, cx - 3.03, 1.44, cz + 1.22), bx(.1, 2.59, .1, cx + 3.03, 1.44, cz + 1.22), bx(.1, 2.59, .1, cx - 3.03, 1.44, cz - 1.22), bx(.1, 2.59, .1, cx + 3.03, 1.44, cz - 1.22), bx(6.1, .1, .1, cx, 2.73, cz + 1.22), bx(6.1, .1, .1, cx, .14, cz + 1.22)]), mat.paintG, o);
      add(new T.PlaneGeometry(2.4, .5).translate(cx - 1.2, 1.2, cz + 1.226), new T.MeshBasicMaterial({ map: signTex(['HME  BESS 500 kWh'], '#0a2c4f', '#fff', 512, 100) }), { cs: false, p: bessG });
      add(new T.PlaneGeometry(.74, 1.4).translate(cx + 1.7, 1.4, cz + 1.228), new T.MeshBasicMaterial({ map: bessT, toneMapped: false }), { cs: false, p: bessG });
      const hv = []; [-1.5, 1.2].forEach(dx => { hv.push(bx(1.2, .55, .9, cx + dx, 3.05, cz)); }); add(merge(hv), mat.cabW, o); const fans = [-1.5, 1.2].map(dx => xf(new T.CircleGeometry(.24, 18).rotateX(-Math.PI / 2), cx + dx, 3.33, cz)); add(merge(fans), mat.black, { cs: false, p: bessG });
      add(merge([bx(.6, .9, .04, cx - 2.4, 1.1, cz + 1.23)].concat([0, 1, 2, 3, 4].map(i => bx(.5, .02, .05, cx - 2.4, .8 + i * .1, cz + 1.25)))), mat.paintG, { p: bessG }); add(cy(.05, .05, cx + 2.5, 1.8, cz + 1.25, 10), mat.red, { p: bessG });
      add(new T.PlaneGeometry(.4, .36).translate(cx + 2.6, 2.2, cz + 1.226), new T.MeshBasicMaterial({ map: signTex(['AWAS', 'BATERAI'], '#f2c01c', '#1b1b1b', 128, 128, 1) }), { cs: false, p: bessG });
      add(tube([[cx + 3.03, 1.2, cz - .5], [cx + 3.6, .5, cz - .5], [-8.1, .08, 9.6]], .05), mat.cable, { p: bessG, cs: false });
    }

    /* ---------- kWh meter cubicle (APP) ---------- */
    const meterLED = ledM('#4de08f');
    { const mx = -16, mz = 6; add(cbox(mx - .8, mx + .8, 0, .22, mz - .5, mz + .5, 4), mat.conc);
      const o = { part: 'meter' }; const mcab = mat.cab.clone(); add(merge([bx(1.0, 1.5, .5, mx, .97, mz), bx(1.1, .06, .6, mx, 1.75, mz)]), mcab, o); hl('meter', mcab);
      add(new T.PlaneGeometry(.78, .39).translate(mx, 1.18, mz + .252), new T.MeshBasicMaterial({ map: meterT, toneMapped: false }), { cs: false, part: 'meter' });
      add(new T.PlaneGeometry(.84, .5).translate(mx, 1.18, mz + .256), new T.MeshStandardMaterial({ color: '#9ec0d4', transparent: true, opacity: .16, roughness: .05, metalness: .6 }), { cs: false });
      add(new T.CircleGeometry(.045, 12).translate(mx, 1.55, mz + .252), meterLED, { cs: false }); add(new T.PlaneGeometry(.5, .14).translate(mx, .62, mz + .252), new T.MeshBasicMaterial({ map: signTex(['APP - PLN'], '#d8dadc', '#222', 128, 40) }), { cs: false });
      add(tube([[mx + .2, 1.78, mz], [mx + .3, 2.2, mz - .3]], .03), mat.cable, { cs: false }); }

    /* ---------- PLN pole, transformer, MV lines ---------- */
    const PLN = { x: -23, z: 2 }, lvWires = [], gridG = new T.Group(); root.add(gridG);
    { const o = { part: 'grid', p: gridG }, px = PLN.x, pz = PLN.z;
      const poleM = mat.concD.clone(); hl('grid', poleM); add(new T.CylinderGeometry(.15, .22, 11, 14).translate(px, 5.5, pz), poleM, Object.assign({ hb: 1 }, o));
      add(merge([bx(3.4, .14, .12, px, 10.2, pz - .1), bx(3.4, .14, .12, px, 10.2, pz + .1), rod(new V3(px, 9.6, pz), new V3(px - 1.2, 10.2, pz), .04), rod(new V3(px, 9.6, pz), new V3(px + 1.2, 10.2, pz), .04)]), mat.galv, o);
      const ins = [-1.4, 0, 1.4]; add(merge(ins.map(dx => cy(.07, .3, px + dx, 10.45, pz, 8, .04))), std({ color: '#b9c4c2', roughness: .3 }), o);
      add(merge([cy(.55, 1.5, px + 1.35, 7.4, pz, 20), cy(.6, .1, px + 1.35, 8.2, pz, 20), cy(.6, .1, px + 1.35, 6.6, pz, 20), ...[-.25, 0, .25].map(dx => cy(.05, .35, px + 1.35 + dx, 8.55, pz, 8, .03)), bx(.1, .8, .1, px + .4, 7.5, pz), bx(.9, .06, .3, px + .55, 8.3, pz)]), std({ color: '#79858a', roughness: .5, metalness: .6 }), Object.assign({ hb: 1 }, o));
      add(rod(new V3(px + .2, 6.2, pz + .1), new V3(px + .2, 1.0, pz + .1), .035, 6), mat.galv, o); add(rod(new V3(px + 1.35, 9.0, pz), new V3(px + .1, 10.1, pz), .02, 4), mat.cable, o);
      const trLed = ledM('#4de08f'); gridLive_led = trLed; add(new T.SphereGeometry(.07, 10, 8).translate(px + 1.35, 7.0, pz + .56), trLed, { cs: false });
      const mv = []; [-1.4, 0, 1.4].forEach((dx, i) => { mv.push(tube(cat([px + dx, 10.5, pz], [px + dx - 60, 10.7, pz - i * .3], 1.2, 10), .025, 20)); mv.push(tube([[px + dx, 10.5, pz], [px + dx, 10.5, pz - 40 - i], [px + dx, 10.5, pz - 80]], .025, 20)); }); add(merge(mv), mat.cable, { cs: false, p: gridG, part: 'grid' });
      const lv1 = tube(cat([px + 1.1, 6.9, pz + .3], [-16.2, 1.76, 5.9], .7, 10), .03, 20), lv2 = tube(cat([px + 1.4, 6.9, pz + .3], [-15.8, 1.76, 5.9], .8, 10), .03, 20); lvWires.push(add(lv1, mat.cable, { cs: false, p: gridG, part: 'grid' }), add(lv2, mat.cable, { cs: false, p: gridG, part: 'grid' }));
    }
    // trench with concrete covers + markers
    { const tr = []; for (let x = -16.4; x < 15.8; x += 1.0) tr.push(bx(.94, .06, .9, x + .5, .07, 5.25)); add(merge(tr), mat.concD, { cs: false }); }

    /* ---------- loads: machines in the hall, outdoor chiller/compressor ---------- */
    const lampsG = [], machineBeacons = [], conveyors = [];
    const Lp = { part: 'loads' };
    { // CNC machining centre near door 1
      const cx = 19.4, cz = -.2; hl('loads', mat.mach);
      add(merge([bx(3.4, 2.3, 2.3, cx, 1.25, cz), bx(1.1, .9, 1.1, cx - 1.8, 1.2, cz + .2)]), mat.mach, { part: 'loads', hb: 1 }); add(bx(1.7, 1.1, .05, cx - .3, 1.45, cz + 1.17), std({ color: '#25343f', roughness: .1, metalness: .6, transparent: true, opacity: .7 }), Lp);
      add(merge([bx(3.4, .08, .12, cx, 2.1, cz + 1.18), bx(3.4, .3, 2.3, cx, 0.3, cz)]), mat.navy, Lp); add(merge([bx(.4, .6, .3, cx + 1.9, 1.5, cz + 1.2), bx(.7, .5, .06, cx + 1.9, 1.75, cz + 1.4)]), mat.machD, Lp);
      const bc = ledM('#ffb020'); machineBeacons.push(bc); add(cy(.09, .22, cx + 1.4, 2.5, cz, 10), bc, Lp);
      // second machine + press behind
      add(merge([bx(3.0, 2.2, 2.2, 22.6, 1.2, -6), bx(1.4, 3.2, 1.6, 25.2, 1.7, -6)]), mat.machD, Lp); add(bx(3.0, .6, 2.2, 22.6, 2.6, -6), mat.yellow, Lp); add(bx(2.8, 2.0, 2.4, 14.5, 1.1, -5.5), mat.mach, Lp);
      // conveyor with animated belt
      const bt = beltT.clone(); bt.needsUpdate = true; bt.repeat.set(10, 1); const bm = new T.MeshStandardMaterial({ map: bt, roughness: .8 }); conveyors.push(bt);
      add(merge([bx(12, .5, .9, 13, .85, -11), ...[-5.5, -2, 2, 5.5].map(dx => bx(.1, .8, .8, 13 + dx, .4, -11))]), mat.machD, Lp); add(xf(new T.PlaneGeometry(11.8, .82).rotateX(-Math.PI / 2), 13, 1.12, -11), bm, { cs: false, part: 'loads' });
      [0, 1, 2, 3].forEach(i => add(bx(.6, .45, .5, 8.5 + i * 3.1, 1.36, -11), mat.carton, Lp));
      // pallet racking
      const rk = [], rb = []; for (let z = -16.5; z <= -13; z += 3.5) for (let x = 3; x <= 20; x += 3.4) { rk.push(bx(.1, 4.6, .1, x, 2.4, z), bx(.1, 4.6, .1, x, 2.4, z + 1.1)); }
      for (let x = 3; x < 20.3; x += 3.4) [0, 1].forEach(zz => [1.1, 2.5, 3.9].forEach(y => rb.push(bx(3.4, .12, .08, x + 1.7, y, -16.5 + zz * 3.5 + .0), bx(3.4, .12, .08, x + 1.7, y, -16.5 + zz * 3.5 + 1.1))));
      add(merge(rk), mat.rackB, Lp); add(merge(rb), mat.rackO, Lp); const bxs = []; for (let x = 3.4; x < 19; x += 3.4) [1.22, 2.62, 4.02].forEach((y, i) => { if ((x * 7 + y * 3 | 0) % 3) bxs.push(bx(1.0, .8, .9, x + .7, y + .46, -16.4), bx(.9, .7, .9, x + 1.7, y + .4, -16.4)); }); add(merge(bxs), mat.carton, Lp);
      // forklift
      const fx = 12, fz = 0.5, fk = [bx(1.1, .6, 2.2, fx, .7, fz), bx(1.0, .06, 1.2, fx, 1.9, fz + .2), bx(.08, 1.2, .08, fx - .5, 1.3, fz - .3), bx(.08, 1.2, .08, fx + .5, 1.3, fz - .3), bx(.08, 1.2, .08, fx - .5, 1.3, fz + .7), bx(.08, 1.2, .08, fx + .5, 1.3, fz + .7), bx(.9, .2, .4, fx, 1.0, fz + .95), bx(.1, 2.6, .12, fx - .3, 1.4, fz + 1.35), bx(.1, 2.6, .12, fx + .3, 1.4, fz + 1.35), bx(.1, .08, 1.2, fx - .3, .22, fz + 1.9), bx(.1, .08, 1.2, fx + .3, .22, fz + 1.9)];
      add(merge(fk), mat.yellow, Lp); add(merge([[-.55, -.8], [.55, -.8], [-.55, .8], [.55, .8]].map(([a, b]) => xf(new T.CylinderGeometry(.28, .28, .22, 12).rotateZ(Math.PI / 2), fx + a, .28, fz + b))), mat.rubber, Lp);
      // high-bay lamps
      const lamps = []; for (let x = 0; x <= 28; x += 5.6) for (const z of [-14, -8, -2]) lamps.push(tm(x, 7.2, z));
      const lm = ledM('#fff3d6'); lampsG.push(lm); inst(new T.CylinderGeometry(.34, .34, .05, 14), lm, lamps.map(m => { const q = m.clone(); q.elements[13] -= .2; return q; }), { cs: false }); inst(new T.CylinderGeometry(.1, .38, .28, 14), mat.steelD, lamps, { cs: false }); inst(new T.CylinderGeometry(.015, .015, .9, 4), mat.black, lamps.map(m => { const q = m.clone(); q.elements[13] += .5; return q; }), { cs: false });
      // outdoor chiller + air compressor beside the hall
      const ox = -9.5, oz = -9; add(merge([bx(3.2, 2.0, 1.7, ox, 1.2, oz), bx(1.2, 1.4, 1.2, ox + 2.4, .8, oz + .2), xf(new T.CylinderGeometry(.45, .45, 1.6, 14).rotateZ(Math.PI / 2), ox + 2.4, 1.9, oz + .2)]), mat.mach, Lp);
      add(merge([0, 1].map(i => xf(new T.CircleGeometry(.62, 22).rotateX(-Math.PI / 2), ox - .85 + i * 1.7, 2.22, oz))), mat.black, { cs: false, part: 'loads' });
      add(merge([rod(new V3(ox, 2.2, oz + .85), new V3(ox, .2, oz + 2.4), .05, 6), bx(3.6, .12, 2.0, ox, .06, oz)]), mat.machD, Lp);
    }
    hl('loads', mat.machD);

    /* ---------- solar carport with butterfly PV, cars, EV charger ---------- */
    const MX = 39, CX0 = 31, CX1 = 47, CZ0 = -10, CZ1 = 4.4, PHI = Math.atan2(1.15, 8), cpM = std({ color: '#8c949a', roughness: .5, metalness: .7 }); hl('carport', cpM);
    { add(cbox(CX0 - .7, CX1 + .7, 0, .16, CZ0 - .7, CZ1 + .7, 4), mat.conc, { part: 'carport', cs: false });
      const st = []; [1.25, -4.95].forEach(z => { st.push(bx(.5, 2.95, .45, MX, 1.6, z)); [-1, 1].forEach(sg => st.push(rod(new V3(MX, 2.95, z), new V3(MX + sg * 7.9, 4.02, z), .09, 6))); });
      [-1, 1].forEach(sg => [1.2, 2.8, 4.4, 6, 7.5].forEach(u => { const x = MX + sg * u * Math.cos(PHI), y = 2.98 + u * Math.sin(PHI); st.push(rod(new V3(x, y, CZ0 + .1), new V3(x, y, CZ1 - .1), .045, 5)); }));
      add(merge(st), cpM, { part: 'carport' });
      const cg = [], cf = [], ZC = []; for (let j = 0; j < 6; j++) ZC.push(-8.55 + j * 2.3);
      [-1, 1].forEach(sg => {
        const N = new V3(-sg * Math.sin(PHI), Math.cos(PHI), 0), Xd = new V3(0, 0, 1), Zd = new V3().crossVectors(Xd, N);
        for (let k = 0; k < 7; k++) { const u = .7 + k * 1.154; ZC.forEach(zc => { const p = new V3(MX + sg * u * Math.cos(PHI), 3.1 + u * Math.sin(PHI), zc).addScaledVector(N, .22); const m = basisM(Xd, N, Zd, p); cg.push(m); cf.push(m); }); }
      });
      const glassC = mat.glass.clone(), frameC = mat.frame.clone(); hl('carport', glassC, frameC); inst(glassG, glassC, cg, { part: 'carport', cs: false }); inst(frameG, frameC, cf, { part: 'carport' });
      // cars
      const prof = pts => { const s = new T.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
      const bodyG = xf(new T.ExtrudeGeometry(prof([[-2.15, .32], [2.15, .32], [2.22, .58], [2.12, .84], [1.2, .94], [-1.4, .97], [-2.05, .93], [-2.2, .66]]), { depth: 1.6, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 3 }), 0, 0, -.8);
      const cabG = xf(new T.ExtrudeGeometry(prof([[1.2, .9], [.55, 1.4], [-.6, 1.43], [-1.35, 1.25], [-1.8, .93]]), { depth: 1.5, bevelEnabled: true, bevelSize: .05, bevelThickness: .04, bevelSegments: 2 }), 0, 0, -.75), roofG = bx(1.1, .05, 1.38, -.02, 1.46, 0), glM = std({ color: '#141b22', roughness: .05, metalness: .8 });
      const cols = ['#e8eaec', '#b9bec3', '#3b4650', '#1c2733', '#f0f0ee', '#7a2a2a', '#8b929a', '#27343f'], wh = [];
      [[35, 2.8], [43, 2.8], [35, -.3], [43, -.3], [35, -3.4], [43, -3.4], [43, -6.5], [35, -6.5]].forEach(([x, z], i) => {
        const ry = i % 3 === 0 ? Math.PI : 0, pm = phys({ color: cols[i], roughness: .28, metalness: .6, clearcoat: 1, clearcoatRoughness: .08 });
        const car = new T.Group(); car.position.set(x, .16, z); car.rotation.y = ry; root.add(car); const o = { p: car, part: 'carport' };
        add(bodyG, pm, o); add(roofG, pm, o); add(cabG, glM, o); [[1.4, .8], [1.4, -.8], [-1.35, .8], [-1.35, -.8]].forEach(([a, b]) => wh.push(tm(x + (ry ? -a : a), .49, z + (ry ? -b : b), 1, 1, 1)));
      });
      const wg = xf(new T.CylinderGeometry(.33, .33, .22, 16).rotateX(Math.PI / 2), 0, 0, 0); inst(wg, mat.rubber, wh, { part: 'carport' });
      add(merge([bx(.34, 1.4, .26, 31.8, .86, -2.6), bx(.1, .16, .1, 31.8, 1.2, -2.45)]), std({ color: '#2f343a', roughness: .5, metalness: .4 }), { part: 'carport' }); add(new T.CircleGeometry(.05, 10).translate(31.8, 1.55, -2.46), ledM('#33d6a0'), { cs: false });
      add(tube([[31.8, 1.1, -2.47], [32.2, .6, -2.2], [32.0, .3, -1.9]], .025), mat.cable, { cs: false });
    }

    /* ---------- cable runs, energy-flow paths ---------- */
    const FP = {
      pv: [[22, 8.34, 3.81], [.1, 8.34, 3.81], [.1, 7.9, 4.3], [.1, 1.0, 4.5], [9.8, 1.0, 4.5]],
      invmdp: [[8.7, 2.2, 4.5], [8.7, 3.0, 4.52], [14.2, 3.0, 4.52], [14.2, 2.2, 4.75]],
      l1: [[14.6, 2.1, 4.95], [14.6, .16, 5.0], [14.6, .16, 5.15], [21.0, .16, 5.15], [21.0, .2, 1.0], [20.3, .2, .2]],
      l2: [[15.4, 2.1, 4.95], [15.4, .16, 5.0], [15.4, .16, 5.35], [22.2, .16, 5.35], [22.2, .2, 2.0], [22.2, .2, -3.5], [23.6, .2, -5.4]],
      bat: [[-8.1, .6, 9.6], [-8.1, .16, 9.6], [-8.1, .16, 6.3], [.9, .16, 6.3], [.9, .16, 4.5], [1.0, 1.0, 4.5]],
      grid: cat([PLN.x + 1.1, 6.9, PLN.z + .3], [-16.2, 1.76, 5.9], .7, 10).concat([[-16, .3, 5.9], [-16, .16, 5.3], [14.6, .16, 5.3], [14.6, .16, 4.95], [14.6, .9, 4.95]])
    };
    { const cv_ = []; for (let x = -7.6; x < .9; x += 1) cv_.push(bx(.94, .06, .7, x + .5, .06, 6.3)); for (let z = 4.4; z < 6.3; z += 1) cv_.push(bx(.7, .06, .94, .9, .06, z + .5)); add(merge(cv_), mat.concD, { p: bessG, cs: false }); }
    const FL = {};
    Object.entries(FP).forEach(([id, pts]) => {
      const seg = [], P = pts.map(p => new V3(...p)); let tot = 0; for (let i = 0; i < P.length - 1; i++) { const l = P[i].distanceTo(P[i + 1]); seg.push(l); tot += l; }
      const n = Math.max(3, Math.round(tot / 1.25)), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
      const m = new T.PointsMaterial({ map: dotT, size: 1, sizeAttenuation: true, transparent: true, depthWrite: false, blending: T.NormalBlending, color: '#6fe3ff', opacity: 0, fog: false, toneMapped: false });
      const pts3 = new T.Points(g, m); pts3.frustumCulled = false; pts3.renderOrder = 5; scene.add(pts3);
      FL[id] = { id, P, seg, tot, n, m, g, pts3, on: 0, target: 0, dir: 1, speed: 3, phase: rnd() * 3 };
    });
    function stepFlows(dt) {
      const sz = clamp(cam.dist * .04, .6, 3.2);
      for (const id in FL) {
        const f = FL[id]; f.on += (f.target - f.on) * Math.min(1, dt * 6); const vis = f.on > .02 && !(id === 'bat' && !S.hasBat) && !(id === 'grid' && S.mode === 'offgrid'); f.pts3.visible = vis; if (!vis) continue;
        if (!reduce) f.phase += f.dir * f.speed * dt; f.m.opacity = .95 * f.on; f.m.size = sz; const a = f.g.attributes.position, gap = f.tot / f.n;
        for (let i = 0; i < f.n; i++) { let s = (((f.phase + i * gap) % f.tot) + f.tot) % f.tot, k = 0; while (k < f.seg.length - 1 && s > f.seg[k]) { s -= f.seg[k]; k++; } const t = f.seg[k] ? s / f.seg[k] : 0, p = f.P[k], q = f.P[k + 1]; a.setXYZ(i, lerp(p.x, q.x, t), lerp(p.y, q.y, t), lerp(p.z, q.z, t)); }
        a.needsUpdate = true;
      }
    }

    /* ---------- status sprites ---------- */
    function pill(txt, bg) { const t = tex(512, 128, (g, w, h) => { g.fillStyle = bg; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 52); g.fill(); g.fillStyle = '#fff'; g.font = `800 62px ${F2}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 3); }, { clamp: 1 }); const sp = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false })); sp.scale.set(7, 1.75, 1); sp.renderOrder = 30; sp.visible = false; scene.add(sp); return sp; }
    const outPill = pill('PLN PADAM', '#d8402f'), offPill = pill('TERPUTUS DARI PLN', '#56606a'); outPill.position.set(PLN.x + .5, 13, PLN.z); offPill.position.set(-19.5, 4.6, 4.5); offPill.scale.set(8, 2, 1);

    /* ---------- weather: rain, lightning ---------- */
    const RN = 3200, rpos = new Float32Array(RN * 6), rtip = new Float32Array(RN * 2);
    for (let i = 0; i < RN; i++) { const x = (rnd() - .5) * 110, y = rnd() * 44, z = (rnd() - .5) * 110; for (let v = 0; v < 2; v++) { rpos.set([x, y, z], (i * 2 + v) * 3); rtip[i * 2 + v] = v; } }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rpos, 3)); rg.setAttribute('tip', new T.BufferAttribute(rtip, 1));
    const rainU = { uT: { value: 0 }, uC: { value: new V3() }, uK: { value: 0 } };
    const rain = new T.LineSegments(rg, new T.ShaderMaterial({ uniforms: rainU, transparent: true, depthWrite: false, fog: false, vertexShader: 'attribute float tip; varying float vT; uniform float uT; uniform vec3 uC; void main(){ vec3 p=position; p.y=mod(p.y-uT*26.,44.); vec3 w=vec3(uC.x+p.x,p.y,uC.z+p.z)+tip*vec3(.22,1.9,0.); vT=tip; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }', fragmentShader: 'varying float vT; uniform float uK; void main(){ gl_FragColor=vec4(.72,.78,.86,uK*.32*(1.-vT*.8)); }' }));
    rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 6; scene.add(rain);
    const RL = { t: 0, next: 2.5, bolt: null, age: 0, fl: 0 }, boltM = new T.MeshBasicMaterial({ color: '#e8f0ff', fog: false, toneMapped: false });
    function makeBolt() {
      const parts = [], x0 = cam.tx + (rnd() - .5) * 90, z0 = cam.tz - 85 - rnd() * 30; let p = [x0, 95, z0]; const pts = [p];
      for (let i = 1; i <= 12; i++) { p = [p[0] + (rnd() - .5) * 13, 95 - i * 95 / 12, p[2] + (rnd() - .5) * 5]; pts.push(p); if (i > 3 && i < 11 && rnd() < .35) { const br = [p]; let q = p; for (let j = 0; j < 4; j++) { q = [q[0] + (rnd() < .5 ? -1 : 1) * (4 + rnd() * 7), q[1] - 6 - rnd() * 6, q[2]]; br.push(q); } parts.push(tube(br, .28, 10)); } }
      parts.push(tube(pts, .55, 40)); const m = new T.Mesh(merge(parts), boltM); m.frustumCulled = false; m.renderOrder = 7; scene.add(m); return m;
    }
    function stepRain(dt) {
      rain.visible = WX.rain > .02; rainU.uK.value = WX.rain; rainU.uT.value = tNow; rainU.uC.value.set((camera.position.x + cam.tx) / 2, 0, (camera.position.z + cam.tz) / 2);
      if (!WX.storm || reduce) { if (!WX.storm) { if (RL.bolt) { scene.remove(RL.bolt); RL.bolt.geometry.dispose(); RL.bolt = null; } RL.fl = 0; RL.t = 0; RL.next = .9 + rnd() * 1.6; } return; }
      RL.t += dt; if (!RL.bolt && RL.t >= RL.next) { RL.bolt = makeBolt(); RL.age = 0; }
      if (RL.bolt) { RL.age += dt; const a = RL.age; RL.fl = a < .07 ? 1 : a < .15 ? .3 : a < .25 ? .9 : Math.max(0, 1 - (a - .25) / .4); RL.bolt.visible = RL.fl > .05; boltM.opacity = 1; if (a > .7) { scene.remove(RL.bolt); RL.bolt.geometry.dispose(); RL.bolt = null; RL.fl = 0; RL.t = 0; RL.next = 3 + rnd() * 6; } }
    }
    // water spray (pipe selected)
    const SPN = NOZ.length * 10, sprayG = new T.BufferGeometry(); sprayG.setAttribute('position', new T.BufferAttribute(new Float32Array(SPN * 3), 3));
    const spray = new T.Points(sprayG, new T.PointsMaterial({ map: dotT, size: .22, transparent: true, depthWrite: false, color: '#dff1ff', opacity: .85, fog: false })); spray.frustumCulled = false; spray.visible = false; scene.add(spray);
    function stepSpray() {
      spray.visible = selected === 'pipe'; if (!spray.visible) return; const a = sprayG.attributes.position; let c = 0;
      NOZ.forEach(nz => { for (let i = 0; i < 10; i++) { const ph = (tNow * 1.25 + i / 10 + nz.k * .137) % 1, t = ph * .9; a.setXYZ(c++, nz.p.x + nz.v.x * t, nz.p.y + nz.v.y * t - 4.9 * t * t, nz.p.z + nz.v.z * t); } }); a.needsUpdate = true;
    }

    /* ---------- environment / state -> scene ---------- */
    const env = { L: new V3(0, 1, 0) }, tmpC = new T.Color(), cTop = new T.Color(), cBot = new T.Color(), cGrey = new T.Color('#6c7683'), cGreyB = new T.Color('#8c97a3'), warm = new T.Color('#ff9a52'), white = new T.Color('#fff4e4');
    let envKey = '', envT = -1, shadowDir = new V3(0, 1, 0);
    function computeEnv() {
      const h = S.hour, a = Math.PI * (h - 6) / 12, el = Math.max(0, Math.sin(a)), day = S.day, ov = WX.ov;
      env.night = 1 - day; env.lamp = S.served ? 1 : .05;
      env.L.copy(day > .08 ? new V3(-Math.cos(a) * .85, .22 + el * .95, .5).normalize() : new V3(.5, .75, .45).normalize());
      cTop.set(S.skyTop).lerp(tmpC.set('#98b6d3'), .3 * day).lerp(cGrey, .78 * day * ov); cBot.set(S.skyBot).lerp(tmpC.set('#e8e4d8'), .28 * day).lerp(cGreyB, .75 * day * ov);
      skyU.uTop.value.copy(cTop); skyU.uBot.value.copy(cBot); skyU.uSun.value.copy(day > .08 ? env.L : new V3(0, -1, 0)); skyU.uSunCol.value.copy(tmpC.copy(warm).lerp(white, clamp(el * 1.8, 0, 1))).multiplyScalar(1.6);
      skyU.uSunAmt.value = day * (1 - .88 * ov); skyU.uNight.value = env.night * (1 - .3 * ov); skyU.uCov.value = .22 + .72 * ov; skyU.uTime.value = tNow + WX.t * 2;
      const cl = 1 - ov * .65; skyU.uCloud.value.setRGB(cl, cl * .99, cl * .97).multiplyScalar(.1 + .95 * day).lerp(tmpC.set('#10151f'), 0);
      const sunI = day * (1 - .72 * ov);
      if (day > .08) { sun.color.copy(tmpC.copy(warm).lerp(white, clamp(el * 1.8, 0, 1))); sun.intensity = sunI * 3.6; sun.position.copy(SC).addScaledVector(env.L, 240); }
      else { sun.color.set('#8aa4d6'); sun.intensity = .45 * env.night * (1 - .5 * ov); sun.position.copy(SC).addScaledVector(env.L, 240); }
      hemi.color.copy(cTop).lerp(tmpC.set('#ffffff'), .35); hemi.groundColor.set('#6d6a5a').multiplyScalar(.3 + .7 * day); hemi.intensity = lerp(.26, .5, day) * (1 + .3 * ov) + RL.fl * 1.4;
      scene.environmentIntensity = lerp(.2, 1, day) * (1 - .3 * ov); renderer.toneMappingExposure = lerp(1.15, 1, day);
      scene.fog.color.copy(cBot); scene.fog.density = .0019 + .0016 * WX.rain; skyU.uFlash.value = RL.fl * .5;
      const lampK = env.lamp * (1 - .35 * day); pl.forEach(l => l.intensity = 95 * lampK); yardL.forEach(l => l.intensity = 38 * env.night * (S.served ? 1 : .6));
      lampsG.forEach(m => m.color.setRGB(1, .95, .82).multiplyScalar(.08 + .92 * env.lamp)); mat.poly.emissiveIntensity = env.lamp * (.15 + 1.6 * env.night); shLamp.color.setRGB(1, .94, .81).multiplyScalar(.15 + .85 * env.night);
      poleLamps.forEach(m => { if (m.isMesh && m.material.map) m.material.opacity = .85 * env.night; else m.color.setRGB(1, .96, .86).multiplyScalar(.2 + .8 * env.night); });
      const k = `${Math.round(h * 6)}|${Math.round(WX.v * 12)}|${S.skyTop}`; if (k !== envKey && tNow - envT > .25) { envKey = k; envT = tNow; bakeEnv(); }
      if (env.L.dot(shadowDir) < .99995) { shadowDir.copy(env.L); renderer.shadowMap.needsUpdate = true; }
    }
    function applyState() {
      const on = S.invOk; invLED.forEach((m, i) => m.color.set(S.led[0] === 0 ? '#ff3b30' : S.led[0] === 1 ? '#2aa8ff' : '#26313b'));
      bessG.visible = S.hasBat; lvWires.forEach(w => w.visible = S.mode !== 'offgrid'); outPill.visible = S.isOut && S.mode !== 'offgrid'; offPill.visible = S.mode === 'offgrid'; meterLED.color.set(S.isOut || S.mode === 'offgrid' ? '#ff4d3f' : '#4de08f'); gridLive_led.color.set(S.isOut ? '#ff4d3f' : '#4de08f');
      upScreen('tv', `${Math.round(S.hour * 4)}|${Math.round(S.pv)}|${Math.round(S.load)}|${S.served}|${S.mode}|${S.isOut}|${Math.round(S.soc * 100)}|${S.hasBat}|${S.invOk}|${Math.round(WX.ov * 4)}`);
      upScreen('meter', S.meterTxt + S.meterCol); upScreen('bess', `${Math.round(S.soc * 100)}|${S.batLed}|${S.batCol}`);
    }

    /* ---------- labels ---------- */
    const LB = [
      { id: 'pv', a: [2, 11.9, -2.5], t: 'Panel surya', modes: 3 }, { id: 'grid', a: [PLN.x, 12.2, PLN.z], t: 'Jaringan PLN', modes: 5 }, { id: 'meter', a: [-16, 2.9, 6], t: 'kWh meter', modes: 5 },
      { id: 'inverter', a: [6, 4.4, 6.2], t: 'Inverter', modes: 7 }, { id: 'battery', a: [-11, 3.9, 10.3], t: 'Baterai', modes: 6 }, { id: 'loads', a: [20, 5.1, 4.2], t: 'Beban', modes: 7 }, { id: 'monitor', a: [-2.2, 4.1, 5], t: 'Monitoring', modes: 7 },
      { id: 'walkway', a: [slopeP(1, 17, 5.83, .6).x, slopeP(1, 17, 5.83, .6).y + .5, slopeP(1, 17, 5.83, .6).z], t: 'Walkway', modes: 7 }, { id: 'pipe', a: [10, 10.9, -4.5], t: 'Pipa air cleaning', modes: 7, grp: 1 }, { id: 'safety', a: [12, 9.3, 4.2], t: 'Safety line', modes: 7, grp: 1 },
      { id: 'carport', a: [39, 5.6, -2], t: 'Carport', modes: 7 }
    ], LE = {}, _p = new V3();
    host.innerHTML = ''; LB.forEach(l => { const b = document.createElement('button'); b.className = 'l3d'; b.type = 'button'; b.style.opacity = 0; b.dataset.part = l.id; b.innerHTML = `<b>${l.t}</b><i></i>`; b.onclick = () => pick(l.id); host.appendChild(b); LE[l.id] = b; });
    function updateLabels() {
      const bit = S.mode === 'ongrid' ? 1 : S.mode === 'offgrid' ? 2 : 4;
      LB.forEach(l => {
        const el = LE[l.id]; _p.set(...l.a).project(camera); const vis = (l.modes & bit) && _p.z < 1 && _p.z > -1 && (!l.grp || selected === 'walkway' || selected === 'pipe' || selected === 'safety');
        if (!vis) { el.style.opacity = 0; el.style.pointerEvents = 'none'; return; }
        const x = (_p.x * .5 + .5) * W, y = (-_p.y * .5 + .5) * Hh; el.style.opacity = 1; el.style.pointerEvents = 'auto'; el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
        el.classList.toggle('sel', selected === l.id); const v = S.labelVals[l.id], i = el.querySelector('i'); if (i.textContent !== (v || '')) i.textContent = v || '';
      });
    }

    /* ---------- selection highlight + picking ---------- */
    const selBox = new T.Box3Helper(new T.Box3(), 0xfdb813); selBox.material.depthTest = false; selBox.material.transparent = true; selBox.renderOrder = 40; selBox.visible = false; scene.add(selBox);
    const NOBOX = { pv: 1, walkway: 1, pipe: 1, safety: 1, carport: 1 };
    function boxFor(id) { const b = new T.Box3(), a = PK[id] || [], h = a.filter(o => o.userData.hb); (h.length ? h : a).forEach(o => b.expandByObject(o)); return b; }
    function stepHL() {
      const pulse = .11 + .07 * Math.sin(tNow * 4);
      for (const part in HLM) { const e = part === selected ? pulse : part === hover ? .1 : 0; HLM[part].forEach(m => m.emissive.setRGB(e * 1.0, e * .62, e * .1)); }
      selBox.visible = !!selected && !NOBOX[selected] && !!PK[selected]; if (selBox.visible) { selBox.box.copy(boxFor(selected)).expandByScalar(.12); selBox.material.opacity = .55 + .35 * Math.sin(tNow * 4); }
    }
    const ray = new T.Raycaster(), ndc = new T.Vector2(); let rayList = null;
    const visChain = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
    function hitTest(e) {
      if (!rayList) rayList = [].concat(...Object.values(PK), OCC); const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hs = ray.intersectObjects(rayList, false); for (const h of hs) { if (!visChain(h.object)) continue; return h.object.userData.part || null; } return null;
    }
    function pick(id) { if (E.onPick) E.onPick(id); focus(id); }
    function focus(id) { selected = id; const p = PRE[id]; if (p) Object.assign(tgt, p, { dist: p.dist * fitK() }); interactAt = tNow; }
    function reset() { Object.assign(tgt, HOME, { dist: HOME.dist * fitK() }); selected = null; interactAt = tNow; if (E.onPick) E.onPick(null); }

    /* ---------- loop ---------- */
    let running = false, last = 0, tNow = 0, interactAt = -10, auto = true, dragging = false, moved = 0, lx = 0, ly = 0, slow = 0, frames = 0;
    function step(dt) {
      tNow += dt; stepWeather(dt);
      if (auto && !reduce && tNow - interactAt > 3.5 && !dragging && selected === null) tgt.az = HOME.az + Math.sin(tNow * .28) * .32;
      const k = 1 - Math.pow(.0009, dt); for (const key of ['az', 'el', 'dist', 'tx', 'ty', 'tz']) cam[key] += (tgt[key] - cam[key]) * k;
      placeCam(); stepRain(dt); computeEnv(); applyState(); stepFlows(dt); stepSpray(); stepHL();
      if (!reduce) { ANIM.forEach(m => m.rotation.y += m.userData.spin * dt); if (S.served) conveyors.forEach(t => t.offset.x -= dt * .25); }
      machineBeacons.forEach(m => m.color.set(S.served && Math.sin(tNow * 6) > 0 ? '#ffb020' : '#4a3010'));
      sky.position.copy(camera.position);
    }
    function draw() { renderer.render(scene, camera); updateLabels(); }
    function frame(ts) {
      if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; step(dt); draw();
      frames++; slow = slow * .96 + dt * .04; if (frames > 90 && slow > .028 && dprCap > 1) { dprCap = dprCap > 1.5 ? 1.5 : 1; resize(); frames = 0; slow = .016; }
      rafId = requestAnimationFrame(frame);
    }
    let rafId = 0;
    const E = {
      onPick: null, ok: true,
      set(st) { Object.assign(S, st); if (st.flows) Object.entries(st.flows).forEach(([id, f]) => { const fl = FL[id]; if (!fl) return; fl.target = f.on ? 1 : 0; fl.dir = f.dir; fl.m.color.set(f.color); fl.speed = 1.2 + Math.min(5, f.kw * .06); }); if (!running) { WX.v = S.cloudy ? 1 : 0; stepWeather(0); placeCam(); computeEnv(); applyState(); stepHL(); draw(); } },
      /* stop() cancels the pending frame so a quick stop() -> start() never leaves two loops running */
      start() { if (running) return; running = true; last = performance.now(); resize(); placeCam(); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(rafId); }, focus, reset, select(id) { if (id) focus(id); else selected = null; },
      setAuto(v) { auto = v; interactAt = tNow; }, isAuto: () => auto, resize,
      down(e) { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; try { e.target.setPointerCapture(e.pointerId); } catch (_) { } e.target.style.cursor = 'grabbing'; interactAt = tNow; },
      move(e) {
        if (dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY; tgt.az = clamp(tgt.az - dx * .006, -1, 1); if (e.pointerType === 'mouse') tgt.el = clamp(tgt.el + dy * .004, .05, .9); interactAt = tNow; }
        else { const h = hitTest(e); if (h !== hover) { hover = h; e.target.style.cursor = h ? 'pointer' : 'grab'; } }
      },
      up(e) { if (!dragging) return; dragging = false; e.target.style.cursor = hover ? 'pointer' : 'grab'; if (moved < 6) { const h = hitTest(e); if (h) pick(h); } },
      snap() { Object.assign(cam, tgt); }, tgt, cam, wx: WX, rl: RL, info: renderer.info, fl: FL, camera, cancel() { dragging = false; }, leave() { hover = null; },
      key(e) { if (e.key === 'ArrowLeft') tgt.az = clamp(tgt.az - .08, -1, 1); if (e.key === 'ArrowRight') tgt.az = clamp(tgt.az + .08, -1, 1); }
    };
    renderer.setClearColor(0xbfd0e0); resize(); bakeEnv();
    cv.addEventListener('webglcontextlost', e => e.preventDefault());
    return E;
  }

  /* ================= wrapper: factory -> WebGL engine, house -> legacy Canvas2D engine ================= */
  let fac = null, which = 'legacy', running = false, userPick = null, legacyOk = false, glCv = null, facHost = null, hostL = null, cvL = null, fallback = false;
  const last = {};
  const eng = () => which === 'fac' ? fac : legacy;
  function show(w) {
    if (!fac || which === w) return; const prev = eng(); which = w; prev.stop();
    const f = w === 'fac'; glCv.style.display = f ? 'block' : 'none'; facHost.style.display = f ? '' : 'none'; hostL.style.display = f ? 'none' : ''; cvL.style.opacity = f ? '0' : '';
    const n = eng(); if (w === 'fac') fac.resize(); n.set(Object.assign({}, last)); n.reset(); if (running) n.start();
  }
  const api = {
    get ok() { return legacyOk || !!fac; },
    get onPick() { return userPick; }, set onPick(v) { userPick = v; if (fallback) legacy.onPick = v; },
    init(canvas, hostLabels, site) {
      cvL = canvas; hostL = hostLabels;
      try {
        const stage = canvas.parentElement; glCv = document.createElement('canvas'); glCv.id = 'scene3dGL'; glCv.setAttribute('aria-hidden', 'true'); glCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
        facHost = document.createElement('div'); facHost.id = 'labels3dF'; facHost.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
        stage.insertBefore(glCv, canvas); hostLabels.after(facHost);
        fac = create(glCv, facHost); fac.onPick = id => { if (which === 'fac' && userPick) userPick(id); };
      } catch (err) { console.warn('Factory3D disabled, using legacy renderer', err); if (glCv) glCv.remove(); if (facHost) facHost.remove(); fac = null; }
      if (!fac) { fallback = true; legacy.onPick = userPick; legacyOk = legacy.init(canvas, hostLabels, site || 'factory'); return legacyOk; }
      // legacy engine keeps the house; its canvas listeners only react while the house is shown
      const orig = canvas.addEventListener; canvas.addEventListener = function (t, l, o) { orig.call(this, t, e => { if (which === 'legacy') l.call(this, e); }, o); };
      try { legacyOk = legacy.init(canvas, hostLabels, 'house'); } finally { delete canvas.addEventListener; }
      legacy.onPick = id => { if (which === 'legacy' && userPick) userPick(id); };
      const g = n => e => { if (which === 'fac') fac[n](e); };
      canvas.addEventListener('pointerdown', g('down')); canvas.addEventListener('pointermove', g('move')); canvas.addEventListener('pointerup', g('up')); canvas.addEventListener('pointercancel', g('cancel')); canvas.addEventListener('pointerleave', g('leave')); canvas.addEventListener('keydown', g('key'));
      new ResizeObserver(() => { if (which === 'fac') fac.resize(); }).observe(canvas);
      which = 'legacy'; show(site === 'house' ? 'legacy' : 'fac'); if (site === 'house') { glCv.style.display = 'none'; facHost.style.display = 'none'; } return true;
    },
    set(st) { Object.assign(last, st); eng().set(st); },
    setSite(name) { if (fallback) return legacy.setSite(name); show(name === 'house' ? 'legacy' : 'fac'); },
    start() { running = true; eng().start(); }, stop() { running = false; eng().stop(); },
    focus(id) { eng().focus(id); }, reset() { eng().reset(); }, select(id) { eng().select(id); },
    setAuto(v) { legacy.setAuto(v); if (fac) fac.setAuto(v); }, isAuto() { return eng().isAuto(); },
    resize() { const e = eng(); if (e.resize) e.resize(); },
    get _fac() { return fac; }, _tick: (dt) => legacy._tick && legacy._tick(dt), setCam: (o) => legacy.setCam && legacy.setCam(o)
  };
  window.Scene3D = api;
})();
