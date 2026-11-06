#!/usr/bin/env python3
"""Erzeugt kleine Fassungen der Rasterlogos für die Galerie-Kacheln.

    python3 bin/gen_thumbs.py          fehlende Fassungen erzeugen
    python3 bin/gen_thumbs.py --all    alle neu erzeugen

Ergebnis: src/assets/img/200/<name>.webp und src/assets/img/400/<name>.webp,
wird eingecheckt. Die Logos in den Kacheln sind höchstens rund 190 CSS-Pixel
breit; mit srcset wählt der Browser je nach Bildschirm die passende Fassung. SVGs brauchen
keine kleine Fassung. Benötigt Pillow (pip install pillow), der Build nicht.
"""
import io
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "img")
WIDTHS = (200, 400)
RASTER = (".png", ".jpg", ".jpeg", ".webp", ".gif")


def encode(im):
    buf = io.BytesIO()
    im.save(buf, "WEBP", method=6, quality=82, alpha_quality=85)
    return buf.getvalue()


def main(args):
    made = 0
    for width in WIDTHS:
        out = os.path.join(ROOT, str(width))
        os.makedirs(out, exist_ok=True)
        for name in sorted(os.listdir(ROOT)):
            if not name.lower().endswith(RASTER):
                continue
            target = os.path.join(out, os.path.splitext(name)[0] + ".webp")
            if os.path.exists(target) and "--all" not in args:
                continue
            im = Image.open(os.path.join(ROOT, name))
            im.load()
            if im.width <= width * 1.2:
                continue
            has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
            im = im.convert("RGBA" if has_alpha else "RGB")
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
            data = encode(im)
            # Nur behalten, wenn die kleine Fassung spürbar spart
            if len(data) > 0.75 * os.path.getsize(os.path.join(ROOT, name)):
                if os.path.exists(target):
                    os.remove(target)
                continue
            with open(target, "wb") as f:
                f.write(data)
            made += 1
            print(f"{width}/{os.path.basename(target)}  {os.path.getsize(target) // 1024} KB")
    print(f"{made} kleine Fassungen erzeugt.")


if __name__ == "__main__":
    main(sys.argv[1:])
