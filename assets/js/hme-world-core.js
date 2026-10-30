/*
 * HME World - core (math, geometry builder, WebGL2 renderer). No library.
 * Written for the website opening. PBR-style lighting (GGX), cascade-less sun shadow map with PCF, hemisphere ambient,
 * analytic sky reflections, ACES tone mapping, instancing for repeated parts (solar modules).
 *
 * Exposes window.HMEW = { M, V, MB, Renderer, srgb, clamp, seg, ease, lerp }
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ small math ------------------------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = k => k * k * (3 - 2 * k);
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const easeInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)],
  };

  /* column-major 4x4 */
  const M = {
    id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul(a, b) {
      const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    T: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
    S: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
    RX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    RY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    RZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    pt: (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]],
    dir: (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z],
    persp(fov, asp, n, f) { const k = 1 / Math.tan(fov / 2); return [k / asp, 0, 0, 0, 0, k, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
    ortho(l, r, b, t, n, f) { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; },
    look(eye, tg, up) {
      const z = V.norm(V.sub(eye, tg)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
      return { m: [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V.dot(x, eye), -V.dot(y, eye), -V.dot(z, eye), 1], x, y, z };
    },
  };

  /* hex "#rrggbb" -> linear rgb array */
  const srgb = h => [0, 1, 2].map(i => Math.pow(parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255, 2.2));

  /* ------------------------------------------------------------------ mesh builder ---------------------------- */
  const STRIDE = 14; // pos3 nor3 col3 mat1 par2 uv2
  class MB {
    constructor() { this.a = []; this.m = M.id(); this.st = []; this.col = [1, 1, 1]; this.mat = 0; this.par = [.6, 0]; }
    push() { this.st.push(this.m); return this; }
    pop() { this.m = this.st.pop(); return this; }
    xf(m) { this.m = M.mul(this.m, m); return this; }
    get n() { return this.a.length / STRIDE; }
    style(col, mat, rough, metal) { if (col) this.col = col; if (mat !== undefined) this.mat = mat; if (rough !== undefined) this.par = [rough, metal || 0]; return this; }
    v(p, n, u, v, col) {
      const m = this.m, c = col || this.col;
      const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
      let nx = m[0] * n[0] + m[4] * n[1] + m[8] * n[2], ny = m[1] * n[0] + m[5] * n[1] + m[9] * n[2], nz = m[2] * n[0] + m[6] * n[1] + m[10] * n[2];
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      this.a.push(x, y, z, nx, ny, nz, c[0], c[1], c[2], this.mat, this.par[0], this.par[1], u || 0, v || 0);
    }
    tri(p0, p1, p2, n0, n1, n2, uv, col) {
      const u = uv || [0, 0, 1, 0, 1, 1];
      this.v(p0, n0, u[0], u[1], col); this.v(p1, n1, u[2], u[3], col); this.v(p2, n2, u[4], u[5], col);
    }
    quad(p0, p1, p2, p3, n, uv, col) {
      const nn = n || V.norm(V.cross(V.sub(p1, p0), V.sub(p3, p0)));
      const u = uv || [0, 0, 1, 0, 1, 1, 0, 1];
      this.tri(p0, p1, p2, nn, nn, nn, [u[0], u[1], u[2], u[3], u[4], u[5]], col);
      this.tri(p0, p2, p3, nn, nn, nn, [u[0], u[1], u[4], u[5], u[6], u[7]], col);
      return this;
    }
    /* box with softly rounded edges (2-segment bevel, smooth normals). centre c, half sizes h, bevel b */
    box(c, h, b, col) {
      b = Math.min(b === undefined ? .04 : b, Math.min(h[0], h[1], h[2]) * .95);
      // Small bevels are invisible at the viewing distances of this scene: use a plain box (12 triangles instead of 108).
      const flat = b < .1; if (flat) b = 0;
      const cc = col || this.col;
      for (let a = 0; a < 3; a++) for (let s = -1; s <= 1; s += 2) {
        const t1 = (a + 1) % 3, t2 = (a + 2) % 3;
        const L1 = flat ? [-h[t1], h[t1]] : [-h[t1], -h[t1] + b, h[t1] - b, h[t1]], L2 = flat ? [-h[t2], h[t2]] : [-h[t2], -h[t2] + b, h[t2] - b, h[t2]];
        const P = [], N = [], nn_ = L1.length;
        for (let i = 0; i < nn_; i++) { P.push([]); N.push([]); for (let j = 0; j < nn_; j++) {
          const p0 = [0, 0, 0]; p0[a] = s * h[a]; p0[t1] = L1[i]; p0[t2] = L2[j];
          const inner = [0, 1, 2].map(k => clamp(p0[k], -(h[k] - b), h[k] - b));
          let d = V.sub(p0, inner); const l = V.len(d);
          if (l < 1e-6) { d = [0, 0, 0]; d[a] = s; } else d = V.mul(d, 1 / l);
          const pos = V.add(inner, V.mul(d, b));
          P[i].push([c[0] + pos[0], c[1] + pos[1], c[2] + pos[2]]); N[i].push(d);
        } }
        for (let i = 0; i < nn_ - 1; i++) for (let j = 0; j < nn_ - 1; j++) {
          const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]], nn = [N[i][j], N[i + 1][j], N[i + 1][j + 1], N[i][j + 1]];
          const uv = [q[0][t1] , q[0][t2], q[1][t1], q[1][t2], q[2][t1], q[2][t2], q[3][t1], q[3][t2]];
          this.tri(q[0], q[1], q[2], nn[0], nn[1], nn[2], [uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]], cc);
          this.tri(q[0], q[2], q[3], nn[0], nn[2], nn[3], [uv[0], uv[1], uv[4], uv[5], uv[6], uv[7]], cc);
        }
      }
      return this;
    }
    /* cylinder along local +Y from y0 to y1, smooth sides, optional caps; r1 for cones */
    cyl(c, r0, y0, y1, seg, r1, caps, col) {
      const cc = col || this.col; seg = seg || 20; const rt = r1 === undefined ? r0 : r1;
      const sl = (r0 - rt) / (y1 - y0 || 1), ny = sl / Math.hypot(1, sl);
      const ring = (a, y, r) => [c[0] + Math.cos(a) * r, c[1] + y, c[2] + Math.sin(a) * r];
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const n0 = V.norm([Math.cos(a0), ny, Math.sin(a0)]), n1 = V.norm([Math.cos(a1), ny, Math.sin(a1)]);
        const p0 = ring(a0, y0, r0), p1 = ring(a1, y0, r0), p2 = ring(a1, y1, rt), p3 = ring(a0, y1, rt);
        this.tri(p0, p1, p2, n0, n1, n1, [i / seg, 0, (i + 1) / seg, 0, (i + 1) / seg, 1], cc);
        this.tri(p0, p2, p3, n0, n1, n0, [i / seg, 0, (i + 1) / seg, 1, i / seg, 1], cc);
        if (caps !== false) {
          if (rt > 1e-4) this.tri([c[0], c[1] + y1, c[2]], p3, p2, [0, 1, 0], [0, 1, 0], [0, 1, 0], [.5, .5, 0, 0, 1, 0], cc);
          if (r0 > 1e-4) this.tri([c[0], c[1] + y0, c[2]], p1, p0, [0, -1, 0], [0, -1, 0], [0, -1, 0], [.5, .5, 1, 0, 0, 0], cc);
        }
      }
      return this;
    }
    sphere(c, rx, seg, ry, rz, col) {
      const cc = col || this.col; seg = seg || 14; ry = ry === undefined ? rx : ry; rz = rz === undefined ? rx : rz;
      const pt = (i, j) => { const th = i / seg * Math.PI, ph = j / (seg * 2) * Math.PI * 2; const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; return { p: [c[0] + d[0] * rx, c[1] + d[1] * ry, c[2] + d[2] * rz], n: V.norm([d[0] / rx, d[1] / ry, d[2] / rz]) }; };
      for (let i = 0; i < seg; i++) for (let j = 0; j < seg * 2; j++) {
        const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1);
        this.tri(a.p, b.p, e.p, a.n, b.n, e.n, [0, 0, 0, 1, 1, 1], cc); this.tri(a.p, e.p, d.p, a.n, e.n, d.n, [0, 0, 1, 1, 1, 0], cc);
      }
      return this;
    }
    /* round tube through points, spheres at the joints (smooth cables, pipes, rails) */
    tube(pts, r, seg, col, joints) {
      seg = seg || 10; const cc = col || this.col;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], d = V.sub(b, a), L = V.len(d); if (L < 1e-5) continue;
        const dn = V.mul(d, 1 / L), ref = Math.abs(dn[1]) > .95 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(dn, ref)), w = V.cross(dn, u);
        for (let k = 0; k < seg; k++) {
          const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
          const n0 = V.add(V.mul(u, Math.cos(a0)), V.mul(w, Math.sin(a0))), n1 = V.add(V.mul(u, Math.cos(a1)), V.mul(w, Math.sin(a1)));
          const p0 = V.add(a, V.mul(n0, r)), p1 = V.add(a, V.mul(n1, r)), p2 = V.add(b, V.mul(n1, r)), p3 = V.add(b, V.mul(n0, r));
          this.tri(p0, p1, p2, n0, n1, n1, [0, 0, 1, 0, 1, 1], cc); this.tri(p0, p2, p3, n0, n1, n0, [0, 0, 1, 1, 0, 1], cc);
        }
        if (joints !== false && i > 0) this.sphere(a, r, 6, undefined, undefined, cc);
      }
      return this;
    }
    /* bar between two points with a rounded rectangular section (width w, depth d) */
    bar(a, b, w, d, col) {
      const dv = V.sub(b, a), L = V.len(dv); if (L < 1e-5) return this;
      const f = V.mul(dv, 1 / L), up = Math.abs(f[1]) > .95 ? [1, 0, 0] : [0, 1, 0], x = V.norm(V.cross(up, f)), y = V.cross(f, x);
      const mid = V.mul(V.add(a, b), .5), rot = [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, f[0], f[1], f[2], 0, mid[0], mid[1], mid[2], 1];
      this.push().xf(rot).box([0, 0, 0], [w / 2, d / 2, L / 2], Math.min(w, d) * .18, col).pop();
      return this;
    }
    reset() { this.a.length = 0; this.m = M.id(); this.st.length = 0; return this; }
    finish() { return new Float32Array(this.a); }
    /* write into a persistent Float32Array (grown when needed) and return [array, floatCount] */
    fillInto(buf) { const n = this.a.length; if (!buf || buf.length < n) buf = new Float32Array(Math.max(n * 1.5, 4096)); const a = this.a; for (let i = 0; i < n; i++) buf[i] = a[i]; return buf; }
  }

  /* ------------------------------------------------------------------ shaders --------------------------------- */
  const HDR = '#version 300 es\nprecision highp float;\nprecision highp sampler2DShadow;\n';
  const VS = HDR + `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in float aMat; layout(location=4) in vec2 aPar; layout(location=5) in vec2 aUV;
#ifdef INST
layout(location=6) in vec4 iM0; layout(location=7) in vec4 iM1; layout(location=8) in vec4 iM2; layout(location=9) in vec4 iM3; layout(location=10) in float iA;
#endif
uniform mat4 uVP; uniform mat4 uXF;
out vec3 vW; out vec3 vN; out vec3 vC; out float vM; out vec2 vP; out vec2 vUV; out float vA;
void main(){
  vec3 p=aPos; vec3 n=aNor; float a=1.;
#ifdef INST
  mat4 im=mat4(iM0,iM1,iM2,iM3); p=(im*vec4(p,1.)).xyz; n=mat3(im)*n; a=iA;
#endif
  vec4 w=uXF*vec4(p,1.); vW=w.xyz; vN=mat3(uXF)*n; vC=aCol; vM=aMat; vP=aPar; vUV=aUV; vA=a;
  gl_Position=uVP*w;
}`;
  const VS_SHADOW = HDR + `
layout(location=0) in vec3 aPos;
#ifdef INST
layout(location=6) in vec4 iM0; layout(location=7) in vec4 iM1; layout(location=8) in vec4 iM2; layout(location=9) in vec4 iM3;
#endif
uniform mat4 uVP; uniform mat4 uXF;
void main(){ vec3 p=aPos;
#ifdef INST
  p=(mat4(iM0,iM1,iM2,iM3)*vec4(p,1.)).xyz;
#endif
  gl_Position=uVP*(uXF*vec4(p,1.)); }`;
  const FS_SHADOW = HDR + 'void main(){}';

  const NOISE = `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(7.1,3.7); a*=.5; } return s; }
`;
  const SKYFN = `
uniform vec3 uSkyTop; uniform vec3 uSkyHor; uniform vec3 uGnd; uniform vec3 uL; uniform vec3 uSunC;
vec3 skyCol(vec3 d){
  float h=clamp(d.y,0.,1.); vec3 c=mix(uSkyHor,uSkyTop,pow(h,.55));
  c=mix(c,uGnd*1.4,smoothstep(0.,-.25,d.y));
  float s=max(dot(d,uL),0.); c+=uSunC*(pow(s,6.)*.18+pow(s,200.)*3.);
  return c;
}`;
  const FS = HDR + NOISE + SKYFN + `
in vec3 vW; in vec3 vN; in vec3 vC; in float vM; in vec2 vP; in vec2 vUV; in float vA;
uniform vec3 uCam; uniform vec3 uAmb; uniform float uFog; uniform float uTime; uniform float uExposure; uniform float uLampOn; uniform float uPanelGlow; uniform float uPass;
uniform mat4 uLVP; uniform sampler2DShadow uShadow; uniform float uTexel; uniform sampler2D uTex; uniform vec4 uClip; uniform float uDisp;
uniform vec4 uLP[8]; uniform vec3 uLC[8]; uniform float uInst;
out vec4 o;
const float PI=3.14159265;
float shadowAt(vec3 w, vec3 n){
  vec4 lp=uLVP*vec4(w+n*.08,1.); vec3 pc=lp.xyz/lp.w*.5+.5;
  if(pc.z>=1.||pc.x<0.||pc.x>1.||pc.y<0.||pc.y>1.) return 1.;
  float k=uTexel*1.3; float z=pc.z-.0009;
  float sh=texture(uShadow,vec3(pc.xy+vec2(-k,-k*.4),z))+texture(uShadow,vec3(pc.xy+vec2(k*.4,-k),z))+texture(uShadow,vec3(pc.xy+vec2(-k*.4,k),z))+texture(uShadow,vec3(pc.xy+vec2(k,k*.4),z));
  return sh*.25;
}
float ggx(float NdH,float r){ float a=r*r, a2=a*a, d=NdH*NdH*(a2-1.)+1.; return a2/(PI*d*d+1e-4); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  if(dot(vW,uClip.xyz)>uClip.w) discard;
  int m=int(vM+.5);
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(uCam-vW); vec3 albedo=vC; float rough=vP.x, metal=vP.y; float alpha=1.; vec3 emit=vec3(0.); float ao=1.; float spec0=1.;
  vec3 Tt=normalize(cross(vec3(0.,1.,0.),N)+1e-5);

  if(m==1){ // vertical ribbed cladding
    float ph=dot(vW,Tt)*6.2832/.3; N=normalize(N+Tt*cos(ph)*.28); albedo*=.94+.1*vn(vW.xy*.7+vW.zy*.7); ao*=.9+.1*smoothstep(-.8,.8,sin(ph));
  } else if(m==11){ // standing seam roof, seams run down the slope
    float ph=vW.x*6.2832/.46; N=normalize(N+vec3(1.,0.,0.)*cos(ph)*.22); albedo*=.92+.12*vn(vW.xz*.35); albedo*=.96+.04*sin(ph);
  } else if(m==2){ // concrete
    float n=fbm(vW.xz*1.3+vW.y*.7); albedo*=.82+.34*n; N=normalize(N+vec3(vn(vW.xy*8.)-.5,vn(vW.yz*8.)-.5,vn(vW.zx*8.)-.5)*.08);
  } else if(m==5){ // ground: grass / concrete apron / asphalt road
    vec2 w=vW.xz; float n1=vn(w*.25), n2=vn(w*1.8), n3=vn(w*7.);
    vec3 grass=mix(vec3(.08,.18,.05),vec3(.19,.34,.1),n1*.7+n2*.3)*(.88+.24*n3);
    vec3 conc=vec3(.56,.57,.58)*(.86+.2*n2);
    float ap=smoothstep(110.,106.,abs(w.x))*smoothstep(50.,46.,w.y)*smoothstep(-34.,-30.,w.y);
    float jx=abs(fract(w.x/7.+.5)-.5)*7., jz=abs(fract(w.y/7.+.5)-.5)*7.; conc*=1.-.26*(1.-smoothstep(0.,.1,min(jx,jz)));
    float road=smoothstep(51.,52.,w.y)*smoothstep(68.,67.,w.y);
    vec3 asp=vec3(.075,.08,.085)*(.8+.4*n3);
    float dash=(1.-smoothstep(.07,.13,abs(w.y-59.5)))*step(fract(w.x/10.),.5);
    float edge=(1.-smoothstep(.05,.1,abs(w.y-52.6)))+(1.-smoothstep(.05,.1,abs(w.y-66.4)));
    albedo=mix(grass,conc,ap); albedo=mix(albedo,asp,road); albedo=mix(albedo,vec3(.8,.62,.1),dash*road); albedo=mix(albedo,vec3(.7),clamp(edge,0.,1.)*road);
    float curb=smoothstep(48.,48.4,w.y)*(1.-smoothstep(50.6,51.,w.y)); albedo=mix(albedo,vec3(.35),curb);
    float lot=smoothstep(.0,.06,abs(fract((w.x+3.5)/5.)-.5)-.45)*0.; // reserved
    rough=mix(.95,.85,road);
  } else if(m==4){ // solar module cells (uv 0..1 across the cell area)
    vec2 g=vUV*vec2(6.,10.); vec2 f=fract(g); vec2 id=floor(g);
    float line=smoothstep(.0,.045,f.x)*smoothstep(.0,.045,1.-f.x)*smoothstep(.0,.04,f.y)*smoothstep(.0,.04,1.-f.y);
    float cellv=hash(id);
    vec3 cell=mix(vec3(.006,.016,.055),vec3(.018,.055,.15),cellv*.6+.2);
    cell=mix(cell,vec3(.07,.2,.46),uPanelGlow*.4*(.6+.4*cellv));
    float bus=1.-smoothstep(.0,.02,abs(f.x-.33))*0.; bus=(1.-smoothstep(.006,.016,abs(f.x-.33)))+(1.-smoothstep(.006,.016,abs(f.x-.66)));
    albedo=mix(vec3(.5,.55,.62),cell,line)+vec3(.55,.6,.7)*clamp(bus,0.,1.)*line*.55;
    rough=.12; metal=.0;
  } else if(m==12){ // epoxy floor
    albedo*=.94+.1*vn(vW.xz*.9); rough=mix(.35,.22,uLampOn);
  } else if(m==15){ // foliage: leafy variation, darker underneath, no glossy rim
    float lv=vn(vW.xz*2.6+vW.y*1.7); albedo*=.62+.7*lv; ao*=.5+.5*smoothstep(1.5,7.5,vW.y); rough=.97; spec0=0.;
  } else if(m==13){ // rubber / belt
    albedo*=.9+.2*vn(vW.xz*20.);
  } else if(m==7){ // emissive (lamps, indicators)
    emit=vC*vP.x; albedo=vec3(0.);
  } else if(m==14){ // inverter / LVMDP display
    vec2 d=vUV; float bar=step(fract(d.x*14.),.62)*step(.12,d.y)*step(d.y,.12+.74*(.35+.65*abs(sin(floor(d.x*14.)*1.7+uTime*1.3))));
    vec3 scr=mix(vec3(.01,.05,.07),vec3(.12,.9,.78),bar*uPanelGlow); emit=scr*(.6+.9*uPanelGlow); albedo=vec3(.02);
  } else if(m==3){ // glass (blend pass)
    alpha=.26; rough=.04; albedo=vec3(.04,.1,.16);
  } else if(m==9){ // soft contact shadow decal
    float r=length(vUV*2.-1.); alpha=vC.r*(1.-smoothstep(.0,1.,r))*(1.-smoothstep(.85,1.,r)); albedo=vec3(0.);
  } else if(m==10){ // logo decal
    vec4 tx=texture(uTex,vUV); albedo=tx.rgb; alpha=tx.a; emit=tx.rgb*.28; rough=.5;
  }

  /* interior mask: points inside the hall receive far less sky light */
  float inside=(1.-smoothstep(31.5,31.8,abs(vW.x)))*(1.-smoothstep(19.5,19.8,abs(vW.z)))*(1.-smoothstep(10.2,10.8,vW.y))*step(0.2,vW.y);
  float NdV=max(dot(N,V),0.);
  vec3 F0=mix(vec3(.04),albedo,metal); vec3 dcol=albedo*(1.-metal);
  float sh=shadowAt(vW,N);
  float NdL=max(dot(N,uL),0.);
  vec3 H=normalize(uL+V); float NdH=max(dot(N,H),0.); float VdH=max(dot(V,H),0.);
  vec3 Fs=F0+(1.-F0)*pow(1.-VdH,5.);
  float rr=max(rough,.045);
  vec3 spec=ggx(NdH,rr)*Fs*.25/(max(NdL,.2)+.2)*spec0;
  vec3 col=(dcol/PI*3.14159+spec)*uSunC*NdL*sh;
  vec3 amb=mix(uGnd,uAmb,N.y*.5+.5)*mix(1.,.14,inside);
  col+=dcol*amb*ao;
  /* environment reflection of the analytic sky (stronger on glossy / metallic / glass) */
  vec3 R=reflect(-V,N); vec3 env=skyCol(R)*mix(1.,.16,inside);
  if(inside>.5){ env=mix(vec3(.05,.055,.06),vec3(.85,.82,.72)*.5,uLampOn)*smoothstep(-.2,.6,R.y)+vec3(.02); }
  vec3 Fe=F0+(max(vec3(1.-rough),F0)-F0)*pow(1.-NdV,5.);
  col+=env*Fe*pow(1.-rough,1.7)*(m==4?.42:1.);
  /* interior point lights */
  if(uLampOn>.01) for(int i=0;i<8;i++){
    vec3 Lv=uLP[i].xyz-vW; float d=length(Lv); float rad=uLP[i].w; if(rad<=0.) continue;
    vec3 Ld=Lv/max(d,1e-3); float att=pow(clamp(1.-d/rad,0.,1.),2.);
    float dl=max(dot(N,Ld),0.); vec3 Hh=normalize(Ld+V);
    col+=(dcol*dl+vec3(.5)*Fs*pow(max(dot(N,Hh),0.),mix(8.,160.,1.-rr))*.35)*uLC[i]*att*uLampOn;
  }
  col+=emit*(m==7?1.:1.);
  /* aerial perspective */
  float d=length(uCam-vW); float f=1.-exp(-d*uFog); f*=mix(1.,.0,inside);
  vec3 fogc=mix(uSkyHor,uSkyTop,.12);
  col=mix(col,fogc,clamp(f,0.,1.));
  col=aces(col*uExposure); col=pow(col,vec3(1./2.2));
  o=vec4(col,alpha*vA*(uPass>.5?1.:1.));
}`;
  const VS_SKY = HDR + 'layout(location=0) in vec2 aP; out vec2 vP; void main(){ vP=aP; gl_Position=vec4(aP,.9999,1.); }';
  const FS_SKY = HDR + NOISE + SKYFN + `
in vec2 vP; uniform vec3 uCR; uniform vec3 uCU; uniform vec3 uCF; uniform float uTan; uniform float uAsp; uniform float uTime; uniform float uExposure; uniform float uCloud;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec3 d=normalize(uCF+vP.x*uTan*uAsp*uCR+vP.y*uTan*uCU); vec3 c=skyCol(d);
  if(d.y>.004){ vec2 p=d.xz/(d.y+.16)*1.6+vec2(uTime*.01,uTime*.003); float cl=fbm(p); float cov=smoothstep(.5,.82,cl)*smoothstep(0.,.18,d.y)*uCloud;
    vec3 cc=mix(uSkyHor*1.1,vec3(1.),.55)*(.8+.3*smoothstep(.4,.8,fbm(p*1.8+3.)))+uSunC*.25*pow(max(dot(d,uL),0.),3.); c=mix(c,cc,cov*.85); }
  o=vec4(pow(aces(c*uExposure),vec3(1./2.2)),1.);
}`;
  const VS_PT = HDR + 'layout(location=0) in vec3 aPos; layout(location=1) in float aSize; layout(location=2) in vec4 aCol; uniform mat4 uVP; uniform float uScale; out vec4 vC; void main(){ vec4 p=uVP*vec4(aPos,1.); gl_Position=p; gl_PointSize=clamp(aSize*uScale/max(p.w,.1),1.,150.); vC=aCol; }';
  const FS_PT = HDR + 'in vec4 vC; out vec4 o; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,0.,d); a*=a; o=vec4(vC.rgb,vC.a*a); }';

  /* ------------------------------------------------------------------ renderer -------------------------------- */
  class Renderer {
    constructor(canvas, opts) {
      opts = opts || {};
      const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
      if (!gl) throw new Error('WebGL2 unavailable');
      this.gl = gl; this.cv = canvas; this.shadowSize = opts.shadowSize || 2048;
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').slice(0, 3).join(' ')); return s; };
      const prog = (vs, fs, defs) => {
        const pre = defs ? defs.map(d => '#define ' + d + '\n').join('') : '';
        const ins = src => src.replace('precision highp float;', 'precision highp float;\n' + pre);
        const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, ins(vs))); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, ins(fs))); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace('[0]', ''); p.u[nm] = gl.getUniformLocation(p, info.name); }
        return p;
      };
      this.P = { main: prog(VS, FS), inst: prog(VS, FS, ['INST']), shadow: prog(VS_SHADOW, FS_SHADOW), shadowInst: prog(VS_SHADOW, FS_SHADOW, ['INST']), sky: prog(VS_SKY, FS_SKY), pt: prog(VS_PT, FS_PT) };
      // sky triangle
      this.skyVAO = gl.createVertexArray(); gl.bindVertexArray(this.skyVAO);
      const sb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      // shadow map
      this.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.shadowSize, this.shadowSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      this.shFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // 1x1 texture for the logo slot until it is loaded
      this.logoTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.logoTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([245, 154, 27, 255]));
      // particle buffer
      this.ptCap = 2400; this.ptA = new Float32Array(this.ptCap * 8); this.ptN = 0;
      this.ptVAO = gl.createVertexArray(); gl.bindVertexArray(this.ptVAO); this.ptBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.ptA.byteLength, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
      gl.bindVertexArray(null);
    }
    loadLogo(src) {
      const gl = this.gl, img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(img, 0, 0, 512, 512);
        gl.bindTexture(gl.TEXTURE_2D, this.logoTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      };
      img.src = src;
    }
    /* upload an MB as a static / dynamic mesh */
    mesh(mb, dynamic) {
      const gl = this.gl, o = { vao: gl.createVertexArray(), vbo: gl.createBuffer(), n: 0, dyn: !!dynamic };
      gl.bindVertexArray(o.vao); gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo);
      const s = STRIDE * 4;
      [[0, 3, 0], [1, 3, 12], [2, 3, 24], [3, 1, 36], [4, 2, 40], [5, 2, 48]].forEach(a => { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, s, a[2]); });
      gl.bindVertexArray(null);
      this.setMesh(o, mb);
      return o;
    }
    setMesh(o, mb) {
      const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo);
      if (!o.dyn) { const d = mb.finish(); o.n = d.length / STRIDE; gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); return; }
      const n = mb.a.length; o.cpu = mb.fillInto(o.cpu); o.n = n / STRIDE;
      if (!o.cap || o.cap < n) { o.cap = o.cpu.length; gl.bufferData(gl.ARRAY_BUFFER, o.cap * 4, gl.DYNAMIC_DRAW); }
      if (n) gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.cpu, 0, n);
    }
    /* instanced mesh: per-instance mat4 (4 vec4) + alpha, up to cap instances */
    instanced(mb, cap) {
      const gl = this.gl, o = this.mesh(mb, false); o.cap = cap; o.count = 0; o.data = new Float32Array(cap * 20);
      o.ibo = gl.createBuffer(); gl.bindVertexArray(o.vao); gl.bindBuffer(gl.ARRAY_BUFFER, o.ibo); gl.bufferData(gl.ARRAY_BUFFER, o.data.byteLength, gl.DYNAMIC_DRAW);
      for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(6 + i); gl.vertexAttribPointer(6 + i, 4, gl.FLOAT, false, 80, i * 16); gl.vertexAttribDivisor(6 + i, 1); }
      gl.enableVertexAttribArray(10); gl.vertexAttribPointer(10, 1, gl.FLOAT, false, 80, 64); gl.vertexAttribDivisor(10, 1);
      gl.bindVertexArray(null); o.inst = true;
      return o;
    }
    setInstances(o, count) { const gl = this.gl; o.count = count; gl.bindBuffer(gl.ARRAY_BUFFER, o.ibo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.data.subarray(0, count * 20)); }
    resetPoints() { this.ptN = 0; }
    point(p, size, c, a) { if (this.ptN >= this.ptCap) return; const o = this.ptN++ * 8, A = this.ptA; A[o] = p[0]; A[o + 1] = p[1]; A[o + 2] = p[2]; A[o + 3] = size; A[o + 4] = c[0]; A[o + 5] = c[1]; A[o + 6] = c[2]; A[o + 7] = a; }

    /* scene: { cam:{eye,tg,fov}, sun:{dir,col}, sky:{top,hor,gnd,amb}, fog, time, exposure, lampOn, panelGlow, lights:[{p,rad,c}], groups:[{mesh, clip, blend, xf}], cloud } */
    render(S) {
      const gl = this.gl, W = this.cv.width, H = this.cv.height, asp = W / H;
      const eye = S.cam.eye, tg = S.cam.tg;
      const view = M.look(eye, tg, [0, 1, 0]), proj = M.persp(S.cam.fov, asp, .5, 900), VP = M.mul(proj, view.m);
      // light matrix, fitted around the site
      const L = V.norm(S.sun.dir), C = S.shadowCenter || [0, 4, 0], ext = S.shadowExtent || 95;
      const lv = M.look(V.add(C, V.mul(L, 260)), C, Math.abs(L[1]) > .98 ? [0, 0, 1] : [0, 1, 0]), LP = M.ortho(-ext, ext, -ext, ext, 20, 560), LVP = M.mul(LP, lv.m);
      const ID = M.id(), draw = (g, inst) => { gl.bindVertexArray(g.mesh.vao); if (g.mesh.inst) gl.drawArraysInstanced(gl.TRIANGLES, 0, g.mesh.n, g.mesh.count); else gl.drawArrays(gl.TRIANGLES, 0, g.mesh.n); };

      /* ---- shadow pass (re-rendered only when the sun or the shadow casters changed) ---- */
      const needShadow = S.shadowKey === undefined || S.shadowKey !== this._shKey || !this._shDone;
      if (needShadow) { this._shKey = S.shadowKey; this._shDone = true;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFB); gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2.2, 3.5); gl.disable(gl.CULL_FACE);
      S.groups.forEach(g => {
        if (g.blend || g.noShadow) return;
        const p = g.mesh.inst ? this.P.shadowInst : this.P.shadow; gl.useProgram(p);
        gl.uniformMatrix4fv(p.u.uVP, false, LVP); gl.uniformMatrix4fv(p.u.uXF, false, g.xf || ID);
        draw(g);
      });
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }

      /* ---- main pass ---- */
      gl.viewport(0, 0, W, H); gl.clearColor(S.sky.hor[0], S.sky.hor[1], S.sky.hor[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindVertexArray(this.skyVAO); gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.useProgram(this.P.sky);
      const su = this.P.sky.u;
      gl.uniform3fv(su.uCR, view.x); gl.uniform3fv(su.uCU, view.y); gl.uniform3fv(su.uCF, V.mul(view.z, -1)); gl.uniform1f(su.uTan, Math.tan(S.cam.fov / 2)); gl.uniform1f(su.uAsp, asp);
      gl.uniform3fv(su.uSkyTop, S.sky.top); gl.uniform3fv(su.uSkyHor, S.sky.hor); gl.uniform3fv(su.uGnd, S.sky.gnd); gl.uniform3fv(su.uL, L); gl.uniform3fv(su.uSunC, S.sun.col);
      gl.uniform1f(su.uTime, S.time); gl.uniform1f(su.uExposure, S.exposure); gl.uniform1f(su.uCloud, S.cloud === undefined ? 1 : S.cloud);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);

      const lp = new Float32Array(32), lc = new Float32Array(24);
      (S.lights || []).slice(0, 8).forEach((l, i) => { lp.set([l.p[0], l.p[1], l.p[2], l.rad], i * 4); lc.set(l.c, i * 3); });
      const setCommon = p => {
        const u = p.u;
        gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniformMatrix4fv(u.uLVP, false, LVP); gl.uniform3fv(u.uCam, eye);
        gl.uniform3fv(u.uL, L); gl.uniform3fv(u.uSunC, S.sun.col); gl.uniform3fv(u.uSkyTop, S.sky.top); gl.uniform3fv(u.uSkyHor, S.sky.hor); gl.uniform3fv(u.uGnd, S.sky.gnd); gl.uniform3fv(u.uAmb, S.sky.amb);
        gl.uniform1f(u.uFog, S.fog); gl.uniform1f(u.uTime, S.time); gl.uniform1f(u.uExposure, S.exposure); gl.uniform1f(u.uLampOn, S.lampOn); gl.uniform1f(u.uPanelGlow, S.panelGlow);
        gl.uniform1f(u.uTexel, 1 / this.shadowSize);
        gl.uniform4fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shTex); gl.uniform1i(u.uShadow, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.logoTex); gl.uniform1i(u.uTex, 1);
      };
      const pass = blend => {
        S.groups.forEach(g => {
          if (!!g.blend !== blend) return;
          const p = g.mesh.inst ? this.P.inst : this.P.main; gl.useProgram(p); setCommon(p);
          gl.uniformMatrix4fv(p.u.uXF, false, g.xf || ID); const c = g.clip || [0, 0, 0, 1e9]; gl.uniform4fv(p.u.uClip, c); gl.uniform1f(p.u.uPass, blend ? 1 : 0);
          draw(g);
        });
      };
      gl.disable(gl.BLEND); pass(false);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); pass(true);
      /* particles (additive) */
      if (this.ptN) {
        gl.bindVertexArray(this.ptVAO); gl.useProgram(this.P.pt);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.ptA.subarray(0, this.ptN * 8));
        gl.uniformMatrix4fv(this.P.pt.u.uVP, false, VP); gl.uniform1f(this.P.pt.u.uScale, H / (2 * Math.tan(S.cam.fov / 2)));
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.drawArrays(gl.POINTS, 0, this.ptN);
      }
      gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
      return { VP, view };
    }
  }

  window.HMEW = { M, V, MB, Renderer, srgb, clamp, lerp, seg, ease, easeOut, easeInOut, STRIDE };
})();
