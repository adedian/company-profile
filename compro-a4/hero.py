"""Generator hero 'bingkai heksagon' (desain halaman 2): foto + pita navy + garis amber + panel kaca +
heksagon tech + halftone + baji amber. Semua vektor (SVG inline)."""
import math, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE_W = 794

def _hex(cx, cy, r):
    return " ".join(f"{cx+r*math.cos(math.radians(60*i)):.1f},{cy+r*math.sin(math.radians(60*i)):.1f}" for i in range(6))

def render(p, img, ax, cx, h0, h, shift="0", px="50", py="50", glow="blue", dots="1", ribbon="1"):
    ax, cx, h0, h, shift = float(ax), float(cx), float(h0), float(h), float(shift)
    px, py = float(px) / 100, float(py) / 100
    s = max(0.55, min(1.0, h / 404))
    # geometri tepi kiri foto
    def lx(y): return ax + shift + (cx - ax) * y / h0
    A = (lx(0), 0.0)
    yb = 0.42 * h
    B = (lx(yb) + 12, yb)
    C = (lx(h), h)
    W = PAGE_W - A[0]
    slope = (C[0] - B[0]) / (C[1] - B[1])

    def edge(d):
        cy = h + d
        ccx = C[0] - d + slope * d
        return [(A[0] - d, 0), (B[0] - d, B[1]), (ccx, cy), (PAGE_W, cy)]

    def band(d0, d1):
        pts = edge(d1) + list(reversed(edge(d0)))
        return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)

    # penempatan foto (setara background-size:cover + background-position)
    path = os.path.join(HERE, "img", img + ".jpg")
    iw, ih = Image.open(path).size
    bx, bw, bh = A[0], W, h
    sc = max(bw / iw, bh / ih)
    w, hh = iw * sc, ih * sc
    ix = bx - (w - bw) * px
    iy = -(hh - bh) * py

    photo = f"{A[0]:.1f},0 {PAGE_W},0 {PAGE_W},{h:.1f} {C[0]:.1f},{h:.1f} {B[0]:.1f},{B[1]:.1f}"
    # panel kaca di kiri atas foto
    gy = 0.88 * B[1]
    gl = A[0] + (B[0] - A[0]) * gy / B[1]
    glass = f"{A[0]:.1f},0 {A[0]+0.426*W:.1f},0 {A[0]+0.295*W:.1f},{0.75*B[1]:.1f} {gl:.1f},{gy:.1f}"
    glass2 = f"{A[0]+0.426*W:.1f},0 {A[0]+0.54*W:.1f},0 {A[0]+0.40*W:.1f},{0.66*B[1]:.1f} {A[0]+0.295*W:.1f},{0.75*B[1]:.1f}"
    hexes_br = f'<polygon points="{_hex(PAGE_W-42*s, h-74*s, 30*s)}"/><polygon points="{_hex(PAGE_W-78*s, h-32*s, 17*s)}"/><polygon points="{_hex(PAGE_W-16*s, h-26*s, 15*s)}"/>'
    hexes_tr = f'<polygon points="{_hex(PAGE_W-72*s, 40*s, 26*s)}" opacity=".7"/><polygon points="{_hex(PAGE_W-24*s, 84*s, 14*s)}" opacity=".7"/>'
    gx0 = A[0] + 0.38 * W
    glints = (f'<path d="M{gx0:.0f},{h-86*s:.0f} L{gx0+58*s:.0f},{h:.0f}"/>'
              f'<path d="M{gx0+24*s:.0f},{h-122*s:.0f} L{gx0+94*s:.0f},{h:.0f}"/>'
              f'<path d="M{gx0+92*s:.0f},{h-54*s:.0f} L{gx0+134*s:.0f},{h:.0f}"/>')
    # halftone di kiri tepi foto (bagian bawah)
    dy0, dy1 = 0.60 * h, 0.96 * h
    dxr = lx((dy0 + dy1) / 2) - 28
    dot_rect = f"{dxr-52:.0f}"
    bottom_dots_x = PAGE_W - 114
    wedge_x = C[0] + 122 * s
    glowc = {"blue": "#2F8BDB", "amber": "#FDB813"}[glow]

    q = p
    svg = f'''  <svg class="a" style="left:0;top:0;pointer-events:none;overflow:visible" width="{PAGE_W}" height="{h+60:.0f}" viewBox="0 0 {PAGE_W} {h+60:.0f}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="{q}dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r="1.15" fill="#104674"/></pattern>
      <linearGradient id="{q}df" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="{q}dm"><rect x="{dxr-52:.0f}" y="{dy0:.0f}" width="62" height="{dy1-dy0:.0f}" fill="url(#{q}df)"/></mask>
      <mask id="{q}dm2"><rect x="{bottom_dots_x}" y="{h+14:.0f}" width="114" height="30" fill="url(#{q}df)"/></mask>
      <linearGradient id="{q}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#cfe4f7" stop-opacity=".06"/></linearGradient>
      <radialGradient id="{q}bg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{glowc}" stop-opacity=".55"/><stop offset="1" stop-color="{glowc}" stop-opacity="0"/></radialGradient>
      <linearGradient id="{q}gt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDB813" stop-opacity="0"/><stop offset=".5" stop-color="#FDB813" stop-opacity=".95"/><stop offset="1" stop-color="#FDB813" stop-opacity="0"/></linearGradient>
      <linearGradient id="{q}aw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F59A1B"/><stop offset="1" stop-color="#FDB813"/></linearGradient>
      <clipPath id="{q}cp"><polygon points="{photo}"/></clipPath>
    </defs>
    <g clip-path="url(#{q}cp)">
      <image href="img/{img}.jpg" x="{ix:.1f}" y="{iy:.1f}" width="{w:.1f}" height="{hh:.1f}" preserveAspectRatio="none"/>
      <rect x="{A[0]:.0f}" y="0" width="{W:.0f}" height="{h:.0f}" fill="#104674" opacity=".16"/>
      <circle cx="{PAGE_W-49*s:.0f}" cy="{h-32*s:.0f}" r="{150*s:.0f}" fill="url(#{q}bg)"/>
      <circle cx="{PAGE_W-4}" cy="10" r="{120*s:.0f}" fill="url(#{q}bg)" opacity=".7"/>
      <polygon points="{glass}" fill="url(#{q}gl)" stroke="rgba(255,255,255,.65)" stroke-width="1.3"/>
      <polygon points="{glass2}" fill="#fff" opacity=".10"/>
      <g fill="rgba(47,139,219,.14)" stroke="rgba(160,220,255,.7)" stroke-width="1.1">{hexes_br}{hexes_tr}</g>
      <g stroke="url(#{q}gt)" stroke-width="1.6" fill="none">{glints}</g>
    </g>
    <polygon points="{band(0,15)}" fill="#104674"/>
    <polygon points="{band(15,17)}" fill="#0A3055"/>
    <polygon points="{band(21,24)}" fill="#F59A1B"/>
    <polygon points="{band(30,31.5)}" fill="#FDB813" opacity=".8"/>
    <polygon points="{wedge_x:.0f},{h:.0f} {PAGE_W},{h-20*s:.0f} {PAGE_W},{h:.0f}" fill="url(#{q}aw)"/>
    {"" if ribbon != "1" else f'<polygon points="{PAGE_W-104},{h+18:.0f} {PAGE_W},{h+18:.0f} {PAGE_W},{h+36:.0f} {PAGE_W-82},{h+30:.0f}" fill="#104674"/><polygon points="{PAGE_W-104},{h+18:.0f} {PAGE_W-82},{h+30:.0f} {PAGE_W-94},{h+32:.0f}" fill="#0A3055"/>'}
    {"" if dots != "1" else f'<rect x="{dxr-52:.0f}" y="{dy0:.0f}" width="62" height="{dy1-dy0:.0f}" fill="url(#{q}dots)" mask="url(#{q}dm)" opacity=".7"/>'}
    {"" if ribbon != "1" else f'<rect x="{bottom_dots_x}" y="{h+14:.0f}" width="114" height="30" fill="url(#{q}dots)" mask="url(#{q}dm2)" opacity=".55"/>'}
  </svg>'''
    return svg
