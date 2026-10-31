"""
Jana PDF "Panduan Draf Laman Cawangan" + kulit buku.

Guna:
    python tools/generate-book.py

Dokumen ini menerangkan status draf laman, bukan kandungan rasmi PERKIM.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "books"
COVERS = OUT / "covers"

PAGE_W, PAGE_H = 1240, 1754
MARGIN = 110

INK = (29, 36, 51)
MUTED = (90, 100, 120)
PAPER = (255, 253, 247)
GREEN = (15, 81, 50)
GOLD = (224, 168, 0)
AMBER = (255, 241, 201)

FONT_BOLD = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONT_REG = [
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=fnt) > max_width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def paragraph(draw, text, fnt, x, y, width, lh, fill=INK):
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += lh
    return y


def bullet(draw, text, fnt, x, y, width, lh):
    draw.text((x, y), "•", font=fnt, fill=(180, 83, 9))
    for line in wrap(draw, text, fnt, width - 38):
        draw.text((x + 38, y), line, font=fnt, fill=INK)
        y += lh
    return y


def page(title: str, kicker: str, blocks, number: int, total: int) -> Image.Image:
    img = Image.new("RGB", (PAGE_W, PAGE_H), PAPER)
    draw = ImageDraw.Draw(img)

    band = 300
    draw.rectangle((0, 0, PAGE_W, band), fill=GREEN)
    draw.rectangle((0, band, PAGE_W, band + 14), fill=GOLD)

    draw.text((MARGIN, 62), kicker.upper(), font=font(FONT_BOLD, 26), fill=GOLD)

    title_font = font(FONT_BOLD, 62)
    ty = 118
    for line in wrap(draw, title, title_font, PAGE_W - MARGIN * 2)[:2]:
        draw.text((MARGIN, ty), line, font=title_font, fill=(255, 255, 255))
        ty += 74

    body = font(FONT_REG, 33)
    bold = font(FONT_BOLD, 33)
    heading = font(FONT_BOLD, 44)
    y = band + 92

    for kind, text in blocks:
        if kind == "h":
            y += 14
            draw.text((MARGIN, y), text, font=heading, fill=GREEN)
            y += 66
            draw.line((MARGIN, y - 22, MARGIN + 90, y - 22), fill=GOLD, width=5)
        elif kind == "li":
            y = bullet(draw, text, body, MARGIN, y, PAGE_W - MARGIN * 2, 50) + 12
        elif kind == "note":
            h = 104
            draw.rounded_rectangle((MARGIN, y, PAGE_W - MARGIN, y + h), radius=10,
                                   fill=AMBER, outline=(224, 182, 74), width=2)
            draw.text((MARGIN + 26, y + 34), text, font=bold, fill=(92, 68, 0))
            y += h + 26
        else:
            y = paragraph(draw, text, body, MARGIN, y, PAGE_W - MARGIN * 2, 50) + 20

    foot = font(FONT_REG, 22)
    draw.line((MARGIN, PAGE_H - 120, PAGE_W - MARGIN, PAGE_H - 120), fill=(219, 224, 236), width=2)
    draw.text((MARGIN, PAGE_H - 94), "Draf dalaman — bukan dokumen rasmi", font=foot, fill=MUTED)
    num = f"{number} / {total}"
    nw = draw.textlength(num, font=foot)
    draw.text((PAGE_W - MARGIN - nw, PAGE_H - 94), num, font=foot, fill=MUTED)

    return img


def cover() -> Image.Image:
    w, h = 600, 800
    img = Image.new("RGB", (w, h), GREEN)
    draw = ImageDraw.Draw(img)

    tint = (25, 105, 66)
    for i in range(5):
        r = 220 + i * 42
        draw.ellipse((w - r, -r // 2, w + r, r), outline=tint, width=2)

    draw.rectangle((0, h - 190, w, h), fill=(6, 40, 26))
    draw.rectangle((0, h - 198, w, h - 190), fill=GOLD)

    draw.text((52, 70), "DOKUMEN DRAF", font=font(FONT_BOLD, 22), fill=GOLD)

    title_font = font(FONT_BOLD, 58)
    y = 150
    for line in wrap(draw, "Panduan Draf Laman Cawangan", title_font, w - 104)[:4]:
        draw.text((52, y), line, font=title_font, fill=(255, 255, 255))
        y += 68

    draw.line((52, y + 22, 132, y + 22), fill=GOLD, width=6)

    sub = font(FONT_REG, 25)
    y += 56
    for line in wrap(draw, "Status, maklumat diperlukan dan senarai semak", sub, w - 104)[:3]:
        draw.text((52, y), line, font=sub, fill=(207, 224, 213))
        y += 36

    foot = font(FONT_REG, 21)
    draw.text((52, h - 110), "PERKIM Kuala Langat", font=foot, fill=(207, 224, 213))
    draw.text((52, h - 78), "Untuk semakan dalaman", font=foot, fill=(154, 183, 167))

    return img


def main() -> None:
    print("Menjana PDF draf…")
    total = 5

    pages = [
        page("Panduan Draf Laman Cawangan", "Pengenalan",
             [("p", "Dokumen ini menerangkan status laman draf, maklumat yang masih menunggu "
                    "pengesahan, dan langkah sebelum laman boleh diterbitkan."),
              ("note", "Laman ini bukan laman rasmi dan belum diluluskan."),
              ("h", "Prinsip"),
              ("li", "Nama hanya dipaparkan selepas disahkan."),
              ("li", "Jawatan tanpa nama dipaparkan sebagai “menunggu pengesahan”."),
              ("li", "Tiada logo rasmi digunakan sehingga kebenaran diperoleh.")],
             1, total),

        page("Status Semasa", "Ringkasan",
             [("p", "Laman telah dibina dengan struktur asas: Utama, Tentang, Kepimpinan, "
                    "Bahan Bacaan dan Hubungi."),
              ("h", "Sudah ada"),
              ("li", "Pengerusi, Timbalan Pengerusi 1 dan Setiausaha."),
              ("li", "Dua AJK Kanan mengikut rekod dalaman."),
              ("h", "Belum ada"),
              ("li", "Nama Timbalan Pengerusi 2 dan status Naib Pengerusi."),
              ("li", "11 AJK Cawangan Utama dan 3 AJK Sayap Belia.")],
             2, total),

        page("Maklumat Diperlukan", "Senarai",
             [("p", "Dapatkan maklumat berikut daripada Setiausaha Kehormat sebelum laman "
                    "dikemas kini."),
              ("li", "Nama penuh dan jawatan bagi 11 AJK Cawangan Utama."),
              ("li", "Nama penuh dan jawatan bagi 3 AJK Sayap Belia."),
              ("li", "Pengesahan Naib Pengerusi dan/atau Timbalan Pengerusi 2."),
              ("li", "Portfolio atau biro setiap AJK."),
              ("li", "Alamat, telefon dan e-mel rasmi yang terkini."),
              ("li", "Kebenaran bertulis penggunaan nama dan logo.")],
             3, total),

        page("Cara Mengemas Kini", "Teknikal",
             [("p", "Kandungan kepimpinan berada dalam satu fail data supaya mudah dikemas kini."),
              ("h", "Fail berkaitan"),
              ("li", "data/kepimpinan.json — jawatan, nama dan status."),
              ("li", "js/modules/kepimpinan.js — logik paparan."),
              ("li", "pages/kepimpinan.html — susun atur halaman."),
              ("h", "Peraturan"),
              ("li", "Tukar status kepada “disahkan” hanya selepas menerima pengesahan."),
              ("li", "Jangan letak nama dalam medan nota.")],
             4, total),

        page("Sebelum Terbit", "Senarai semak",
             [("p", "Pastikan semua perkara berikut selesai sebelum pautan dikongsi."),
              ("li", "Semua nama disahkan secara bertulis."),
              ("li", "Teks profil, visi dan misi diluluskan."),
              ("li", "Alamat dan telefon disemak."),
              ("li", "Kebenaran logo dan nama diperoleh."),
              ("li", "Laman diuji pada telefon dan komputer."),
              ("note", "Jika ada perkara belum selesai, kekalkan status draf.")],
             5, total),
    ]

    OUT.mkdir(parents=True, exist_ok=True)
    first, rest = pages[0], pages[1:]
    pdf_path = OUT / "panduan-draf.pdf"
    first.save(pdf_path, "PDF", resolution=150, save_all=True, append_images=rest, quality=86)
    print(f"  {pdf_path.relative_to(ROOT)}  ({len(pages)} halaman, {pdf_path.stat().st_size // 1024} KB)")

    COVERS.mkdir(parents=True, exist_ok=True)
    cover_path = COVERS / "panduan-draf.jpg"
    cover().save(cover_path, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"  {cover_path.relative_to(ROOT)}  ({cover_path.stat().st_size // 1024} KB)")
    print("Selesai.")


if __name__ == "__main__":
    main()
