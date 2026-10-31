"""
Sediakan saiz logo PERKIM daripada fail penuh.

Guna:
    python tools/prepare-logo.py

Input:  assets/img/logo-perkim.png (logo penuh)
Output: logo-perkim-512.png, -180.png, -128.png, -64.png

Nota: fail asal yang diterima bernama .png tetapi sebenarnya JPEG.
Skrip ini menyimpan semula sebagai PNG sebenar dan menghasilkan saiz kecil.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
SOURCE = IMG / "logo-perkim.png"

SIZES = (512, 180, 128, 64)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Logo tidak ditemui: {SOURCE}")

    with Image.open(SOURCE) as raw:
        image = raw.convert("RGB")
        print(f"Sumber: {SOURCE.name} — {image.width}x{image.height}, {raw.format}")

        # Simpan semula sebagai PNG sebenar (membetulkan sambungan yang salah).
        image.save(SOURCE, "PNG", optimize=True)

        for size in SIZES:
            target = IMG / f"logo-perkim-{size}.png"
            image.resize((size, size), Image.Resampling.LANCZOS).save(
                target, "PNG", optimize=True
            )
            print(f"  {target.name}: {target.stat().st_size // 1024} KB")

    print("Selesai.")


if __name__ == "__main__":
    main()
