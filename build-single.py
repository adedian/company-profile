"""Bundle the company profile into one self-contained HTML file.

Inlines fonts, scripts and every img/*.webp as data URIs so the result opens
offline by double-click, with no server and no folder next to it.

    python build-single.py            -> HME-Company-Profile.html
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "HME-Company-Profile.html"


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


imgs = {p.stem: data_uri(p, "image/webp") for p in sorted((ROOT / "img").glob("*.webp"))}


def inline_img_literals(text):
    return re.sub(r"img/([A-Za-z0-9_-]+)\.webp",
                  lambda m: imgs[m.group(1)] if m.group(1) in imgs else m.group(0), text)


def inline_js(src):
    # dynamic paths such as `img/${p.img}.webp` resolve through the __IMG map
    src = re.sub(r"img/\$\{([^}]+)\}\.webp", r"${window.__IMG[\1]}", src)
    return inline_img_literals(src).replace("</script", "<\\/script")


html = (ROOT / "index.html").read_text(encoding="utf-8")

# fonts: fonts.css with each woff2 embedded
fonts_css = (ROOT / "fonts" / "fonts.css").read_text(encoding="utf-8")
fonts_css = re.sub(r"url\(([^)]+\.woff2)\)",
                   lambda m: f"url({data_uri(ROOT / 'fonts' / m.group(1).strip(chr(39) + chr(34)), 'font/woff2')})",
                   fonts_css)
html = html.replace('<link rel="stylesheet" href="fonts/fonts.css">', f"<style>{fonts_css}</style>")

# scripts, in their original order; the image map goes first
img_map = "window.__IMG=" + repr(imgs).replace("'", '"') + ";"
first = True


def repl_script(m):
    global first
    js = inline_js((ROOT / m.group(1)).read_text(encoding="utf-8"))
    pre = f"<script>{img_map}</script>\n" if first else ""
    first = False
    return f"{pre}<script>\n{js}\n</script>"


html = re.sub(r'<script src="([^"]+\.js)"></script>', repl_script, html)

# the download button points at this very file; the bundle has nothing to offer there
html = re.sub(r'\s*<a class="dl-btn".*?</a>', "", html, flags=re.S)

html = inline_img_literals(html)

leftover = re.findall(r"(?:img|fonts)/[\w.${}-]+", html)
if leftover:
    raise SystemExit(f"unresolved asset paths: {sorted(set(leftover))}")

OUT.write_text(html, encoding="utf-8")
print(f"{OUT.name}: {OUT.stat().st_size / 1e6:.1f} MB, {len(imgs)} images inlined")
