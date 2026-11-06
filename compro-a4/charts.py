"""Generator grafik untuk halaman pembiayaan: pie 3D dan kurva arus kas kumulatif (SVG inline, vektor)."""
import math

AMB = ("#FFD25A", "#F59A1B", "#A8620A")   # terang, gelap, sisi
TEAL = ("#5BE0B4", "#1C9A68", "#0E5E41")
BLUE = ("#7CBBF7", "#2F8BDB", "#17497F")
COL = {"amb": AMB, "teal": TEAL, "blue": BLUE}

def _pt(cx, cy, r, a):
    return cx + r * math.sin(a), cy - r * math.cos(a)

def _slice(cx, cy, r, a0, a1, dx=0, dy=0):
    x0, y0 = _pt(cx + dx, cy + dy, r, a0)
    x1, y1 = _pt(cx + dx, cy + dy, r, a1)
    large = 1 if (a1 - a0) > math.pi else 0
    return f"M{cx+dx:.2f},{cy+dy:.2f} L{x0:.2f},{y0:.2f} A{r},{r} 0 {large} 1 {x1:.2f},{y1:.2f} Z"

def pie(uid, slices, explode=(), size=170):
    """slices: [(persen, kunci_warna, label_html|None)] searah jarum jam mulai pukul 12."""
    W, H, cx, cy, r, th = 170, 160, 85, 74, 64, 9
    total = sum(s[0] for s in slices)
    defs, shadow, sides, tops, labels, clip = [], [], [], [], [], []
    a = 0.0
    for i, (v, k, lab) in enumerate(slices):
        span = v / total * 2 * math.pi
        a0, a1 = a, a + span
        mid = (a0 + a1) / 2
        e = 6 if i in explode else 0
        dx, dy = e * math.sin(mid), -e * math.cos(mid)
        lt, dk, sd = COL[k]
        defs.append(f'<linearGradient id="{uid}g{i}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="{lt}"/><stop offset=".55" stop-color="{dk}"/><stop offset="1" stop-color="{sd}"/></linearGradient>')
        pth_top = _slice(cx, cy, r, a0, a1, dx, dy)
        sides.append(f'<path d="{_slice(cx, cy, r, a0, a1, dx, dy + th)}" fill="{sd}"/>')
        tops.append(f'<path d="{pth_top}" fill="url(#{uid}g{i})" stroke="rgba(7,28,48,.55)" stroke-width="1.4" stroke-linejoin="round"/>')
        clip.append(f'<path d="{pth_top}"/>')
        if lab:
            lx, ly = _pt(cx + dx, cy + dy, r * 0.58, mid)
            labels.append((lx, ly, lab))
        a = a1
    out = [f'<svg viewBox="0 0 {W} {H}" width="{size}" height="{size*H/W:.0f}" xmlns="http://www.w3.org/2000/svg" style="display:block">']
    out.append("<defs>" + "".join(defs) +
               f'<radialGradient id="{uid}sh"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
               f'<radialGradient id="{uid}hl" cx=".32" cy=".22" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
               f'<clipPath id="{uid}cp">' + "".join(clip) + "</clipPath></defs>")
    out.append(f'<ellipse cx="{cx}" cy="{cy+th+r*0.78:.1f}" rx="{r*0.95:.1f}" ry="{r*0.2:.1f}" fill="url(#{uid}sh)"/>')
    out += sides + tops
    out.append(f'<g clip-path="url(#{uid}cp)"><rect x="0" y="0" width="{W}" height="{H}" fill="url(#{uid}hl)"/></g>')
    for lx, ly, lab in labels:
        out.append(lab.replace("{x}", f"{lx:.1f}").replace("{y}", f"{ly:.1f}"))
    out.append("</svg>")
    return "".join(out)

def lab_blue(pct):
    return f'<text x="{{x}}" y="{{y}}" text-anchor="middle" dominant-baseline="middle" font-family="Figtree" font-weight="800" font-size="15" fill="#fff">{pct}</text>'

def lab_amb(pct):
    return (f'<text x="{{x}}" y="{{y}}" dy="-8" text-anchor="middle" font-family="Figtree" font-weight="600" font-size="7.5" fill="#071C30">up to</text>'
            f'<text x="{{x}}" y="{{y}}" dy="9" text-anchor="middle" font-family="Figtree" font-weight="800" font-size="19" fill="#071C30">{pct}</text>')

def lab_teal(pct):
    return f'<text x="{{x}}" y="{{y}}" text-anchor="middle" dominant-baseline="middle" font-family="Figtree" font-weight="800" font-size="14" fill="#fff">{pct}</text>'

def legend(rows, total_label="Tagihan tanpa surya", total="100%"):
    sq = {"amb": "#F59A1B", "teal": "#23A874", "blue": "#2F8BDB"}
    h = ['<div class="lgd">']
    for k, name, val in rows:
        h.append(f'<div class="lr"><i style="background:{sq[k]}"></i><span>{name}</span><b>{val}</b></div>')
    h.append(f'<div class="lr tot"><span>{total_label}</span><b>{total}</b></div></div>')
    return "".join(h)

def cashflow(w=392, h=182):
    """Arus kas kumulatif (kelipatan tagihan tahun 1): investasi awal 2,7x, hemat 48%/thn, tarif naik 3%/thn."""
    left, right, top, bot = 36, w - 14, 14, h - 40
    ymin, ymax = -5, 20
    def X(t): return left + (right - left) * t / 30
    def Y(v): return top + (bot - top) * (ymax - v) / (ymax - ymin)
    def cum(t): return -2.7 + 0.48 * (1.03 ** t - 1) / 0.03
    pts = [(t / 2, cum(t / 2)) for t in range(0, 61)]
    line = "M" + " L".join(f"{X(t):.1f},{Y(v):.1f}" for t, v in pts)
    # titik impas
    be = next(t for t, v in pts if v >= 0)
    be_x = X(be)
    pos = [(t, v) for t, v in pts if v >= 0]
    area_pos = f"M{X(pos[0][0]):.1f},{Y(0):.1f} " + " ".join(f"L{X(t):.1f},{Y(v):.1f}" for t, v in pos) + f" L{X(30):.1f},{Y(0):.1f} Z"
    neg = [(t, v) for t, v in pts if v <= 0]
    area_neg = f"M{X(0):.1f},{Y(0):.1f} " + " ".join(f"L{X(t):.1f},{Y(v):.1f}" for t, v in neg) + f" L{X(neg[-1][0]):.1f},{Y(0):.1f} Z"
    s = [f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:Figtree">']
    s.append('<defs><linearGradient id="cfa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDB813" stop-opacity=".42"/><stop offset="1" stop-color="#F59A1B" stop-opacity=".10"/></linearGradient>'
             '<linearGradient id="cfn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7A6B" stop-opacity=".10"/><stop offset="1" stop-color="#FF7A6B" stop-opacity=".38"/></linearGradient></defs>')
    for v in (-5, 0, 5, 10, 15, 20):
        y = Y(v)
        s.append(f'<line x1="{left}" y1="{y:.1f}" x2="{right}" y2="{y:.1f}" stroke="rgba(255,255,255,{.34 if v == 0 else .10})" stroke-width="1"/>')
        s.append(f'<text x="{left-6}" y="{y+2.6:.1f}" text-anchor="end" font-size="7.4" fill="#9BB2C6">{v}{"×" if v else ""}</text>')
    for t in range(0, 31, 5):
        s.append(f'<text x="{X(t):.1f}" y="{bot+14}" text-anchor="middle" font-size="7.4" fill="#9BB2C6">{t}</text>')
    s.append(f'<text x="{(left+right)/2:.0f}" y="{bot+27}" text-anchor="middle" font-size="7.4" fill="#9BB2C6">Tahun</text>')
    s.append(f'<path d="{area_neg}" fill="url(#cfn)"/><path d="{area_pos}" fill="url(#cfa)"/>')
    s.append(f'<path d="{line}" fill="none" stroke="#F59A1B" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
    for (t, v) in ((0, cum(0)), (be, 0), (30, cum(30))):
        s.append(f'<circle cx="{X(t):.1f}" cy="{Y(v):.1f}" r="3.3" fill="#F59A1B" stroke="#FFD25A" stroke-width="1"/>')
    s.append(f'<text x="{X(0)+3:.1f}" y="{Y(cum(0))+13:.1f}" font-size="7.8" font-weight="700" fill="#fff">Investasi awal −2,7×</text>')
    s.append(f'<text x="{be_x+8:.1f}" y="{Y(0)+14:.1f}" font-size="7.8" font-weight="700" fill="#fff">Balik modal ± tahun ke-5</text>')
    s.append(f'<text x="{X(30)-4:.1f}" y="{Y(cum(30))-8:.1f}" text-anchor="end" font-size="7.8" font-weight="700" fill="#fff">+20,1× di tahun ke-30</text>')
    s.append("</svg>")
    return "".join(s)

def render(name):
    if name == "pie_buy":
        return pie("pb", [(48, "amb", lab_amb("48%")), (2, "teal", None), (50, "blue", lab_blue("50%"))], explode=(0, 1), size=160)
    if name == "leg_buy":
        return legend([("amb", "Penghematan", "up to 48%"), ("teal", "Biaya O&amp;M", "2%"), ("blue", "Tagihan PLN", "50%")])
    if name == "cash_buy":
        return cashflow(w=356, h=182)
    if name == "pie_rent1":
        return pie("pr1", [(18, "amb", lab_amb("18%")), (32, "teal", lab_teal("32%")), (50, "blue", lab_blue("50%"))], explode=(0, 1), size=160)
    if name == "leg_rent1":
        return legend([("amb", "Penghematan", "up to 18%"), ("teal", "Tagihan sewa", "32%"), ("blue", "Tagihan PLN", "50%")])
    if name == "pie_rent2":
        return pie("pr2", [(50, "amb", lab_amb("50%")), (50, "blue", lab_blue("50%"))], explode=(0,), size=160)
    if name == "leg_rent2":
        return legend([("amb", "Penghematan", "up to 50%"), ("blue", "Tagihan PLN", "50%")])
    raise KeyError(name)
