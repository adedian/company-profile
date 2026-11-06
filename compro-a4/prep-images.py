# Menyiapkan foto compro A4: konversi ke JPEG, koreksi warna ringan, batasi resolusi.
import glob, os
from PIL import Image, ImageEnhance
SRC = os.path.join(os.path.dirname(__file__), "..", "img")
DST = os.path.join(os.path.dirname(__file__), "img")
for f in sorted(glob.glob(os.path.join(SRC, "*.webp"))):
    n = os.path.basename(f)[:-5]
    im = Image.open(f)
    if n == "hme-logo" or n.startswith("b-") or (n.startswith("c-") and im.mode == "RGBA"):
        im.save(os.path.join(DST, n + ".png")); continue
    if n.startswith("c-"):
        im.convert("RGB").save(os.path.join(DST, n + ".png")); continue
    im = im.convert("RGB")
    im.thumbnail((1800, 1800), Image.LANCZOS)
    if not n.startswith("dash"):
        im = ImageEnhance.Contrast(im).enhance(1.07)
        im = ImageEnhance.Color(im).enhance(1.12)
        im = ImageEnhance.Sharpness(im).enhance(1.15)
    im.save(os.path.join(DST, n + ".jpg"), quality=90, optimize=True)
print("ok", len(os.listdir(DST)))
