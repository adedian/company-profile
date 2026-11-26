"""Gabungkan pages/*.html menjadi index.html lalu render ke PDF A4 (Edge headless) + PNG preview."""
import glob, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import charts, hero
here = os.path.dirname(os.path.abspath(__file__))
sprite = open(os.path.join(here, "pages", "_sprite.html"), encoding="utf8").read()
pages = [open(f, encoding="utf8").read() for f in sorted(glob.glob(os.path.join(here, "pages", "p[0-9]*.html")))]
body = "\n".join(pages)
# <i-x> shorthand -> svg use
body = re.sub(r'<ic:([a-z0-9]+)\s*/>', r'<svg class="i"><use href="#\1"/></svg>', body)
body = re.sub(r'<hero:svg\s+([^>]*?)/>', lambda m: hero.render(**dict(re.findall(r'([a-z0-9]+)="([^"]*)"', m.group(1)))), body)
body = re.sub(r'<chart:([a-z0-9_]+)\s*/>', lambda m: charts.render(m.group(1)), body)
html = f"""<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<title>PT Hexa Multi Energi — Company Profile (A4)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="styles.css">
</head><body>
{sprite}
{body}
</body></html>"""
open(os.path.join(here, "index.html"), "w", encoding="utf8").write(html)
print("index.html:", len(pages), "halaman")
if "--pdf" in sys.argv:
    out = os.path.join(here, "HME-Company-Profile-A4.pdf")
    edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    url = "file:///" + os.path.join(here, "index.html").replace("\\", "/").replace(" ", "%20")
    import tempfile
    ud = tempfile.mkdtemp(prefix="hme_edge_")
    if os.path.exists(out): os.remove(out)
    subprocess.run([edge, "--headless=new", f"--user-data-dir={ud}", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files",
                    "--virtual-time-budget=8000", f"--print-to-pdf={out}", url], check=True, timeout=180)
    import time, pymupdf
    last, stable, t0 = -1, 0, time.time()
    while time.time() - t0 < 240:           # Edge melepas proses anak; tunggu sampai file selesai ditulis
        sz = os.path.getsize(out) if os.path.exists(out) else -1
        stable = stable + 1 if (sz == last and sz > 1000) else 0
        last = sz
        if stable >= 3: break
        time.sleep(1.5)
    assert os.path.exists(out), 'PDF tidak terbentuk'
    d = pymupdf.open(out); print("PDF:", len(d), "hal", d[0].rect)
    os.makedirs(os.path.join(here, "_preview"), exist_ok=True)
    for i, p in enumerate(d):
        p.get_pixmap(dpi=96).save(os.path.join(here, "_preview", f"p{i+1:02d}.png"))
