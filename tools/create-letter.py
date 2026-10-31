"""
Hasilkan draf surat permohonan senarai AJK (DOCX).

Guna:
    python tools/create-letter.py

Ruang yang perlu diisi ditanda dengan [ ] dan di-highlight kuning.
"""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "surat" / "draf-surat-permohonan-ajk.docx"

FONT = "Arial"
BODY_PT = 11


def base_style(document: Document) -> None:
    style = document.styles["Normal"]
    style.font.name = FONT
    style.font.size = Pt(BODY_PT)
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.line_spacing = 1.15

    for section in document.sections:
        section.top_margin = Cm(2.2)
        section.bottom_margin = Cm(2.2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.2)


def para(
    document: Document,
    text: str = "",
    *,
    bold: bool = False,
    align=WD_ALIGN_PARAGRAPH.LEFT,
    space_before: int = 0,
    space_after: int = 6,
    indent: float = 0,
    hanging: float = 0,
    size: int | None = None,
    color: RGBColor | None = None,
    italic: bool = False,
    highlight_blanks: bool = True,
    prefix: str = "",
):
    text = f"{prefix}{text}"
    p = document.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    if hanging:
        p.paragraph_format.first_line_indent = Cm(-hanging)

    # Pecahkan teks pada token [ ] supaya ruang kosong di-highlight.
    if highlight_blanks and "[" in text and "]" in text:
        import re

        parts = re.split(r"(\[[^\]]+\])", text)
        for part in parts:
            if not part:
                continue
            run = p.add_run(part)
            run.bold = bold
            run.italic = italic
            if size:
                run.font.size = Pt(size)
            if color:
                run.font.color.rgb = color
            if part.startswith("[") and part.endswith("]"):
                run.font.highlight_color = WD_COLOR_INDEX.YELLOW
    else:
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        if size:
            run.font.size = Pt(size)
        if color:
            run.font.color.rgb = color

    return p


def main() -> None:
    document = Document()
    base_style(document)
    document.core_properties.title = "Draf surat permohonan senarai AJK PERKIM Kuala Langat"
    document.core_properties.author = "Draf dalaman"

    # Nota draf
    para(
        document,
        "DRAF DALAMAN — semak dan isi ruang bertanda sebelum dicetak.",
        bold=True,
        size=9,
        color=RGBColor(0x9A, 0x6B, 0x00),
        space_after=2,
    )
    para(
        document,
        "Surat ini belum ditandatangani dan belum dihantar.",
        italic=True,
        size=9,
        color=RGBColor(0x66, 0x66, 0x66),
        space_after=14,
    )

    # Kepala surat
    para(
        document,
        "[KEPALA SURAT / LOGO ORGANISASI, JIKA ADA]",
        size=9,
        color=RGBColor(0x88, 0x88, 0x88),
        space_after=14,
    )

    para(document, "Rujukan Kami: [RUJUKAN KAMI]", space_after=2)
    para(document, "Tarikh: [TARIKH]", space_after=16)

    # Penerima
    para(document, "Kepada:", space_after=2)
    para(document, "Cik Puan Faridah Hanim binti Mohd Ayub", bold=True, space_after=0)
    para(document, "Setiausaha Kehormat", space_after=0)
    para(document, "PERKIM Cawangan Kuala Langat", space_after=0)
    para(document, "Lot 2029, Jalan Haji Darini, Lorong 4,", space_after=0)
    para(document, "Kampung Sungai Lang Baru,", space_after=0)
    para(document, "42700 Banting, Selangor", space_after=10)

    para(document, "Melalui: perkimkualalangat@gmail.com", italic=True, space_after=16)

    para(document, "Tuan/Puan,", space_after=14)

    # Tajuk
    para(
        document,
        "PERMOHONAN SALINAN RASMI SENARAI PENUH AHLI JAWATANKUASA "
        "PERKIM CAWANGAN KUALA LANGAT SESI 2026–2028",
        bold=True,
        space_after=14,
    )

    body = WD_ALIGN_PARAGRAPH.JUSTIFY

    para(
        document,
        "Dengan segala hormatnya perkara di atas adalah dirujuk.",
        align=body,
        indent=0.75,
        hanging=0.75,
        prefix="1. ",
    )

    para(
        document,
        "Sukacita dimaklumkan bahawa pihak kami sedang mengemas kini kandungan laman web "
        "rasmi / bahan penerbitan organisasi yang memerlukan maklumat kepimpinan PERKIM "
        "Cawangan Kuala Langat bagi sesi 2026–2028. Maklumat yang tepat amat penting bagi "
        "memastikan paparan kepada orang awam adalah selaras dengan rekod rasmi cawangan.",
        align=body,
        indent=0.75,
        hanging=0.75,
        prefix="2. ",
    )

    para(
        document,
        "Sehubungan itu, kami memohon kerjasama pihak tuan/puan untuk mengemukakan salinan "
        "rasmi senarai penuh Ahli Jawatankuasa (AJK) bagi sesi berkenaan, merangkumi "
        "perkara berikut:",
        align=body,
        indent=0.75,
        hanging=0.75,
        prefix="3. ",
    )

    items = [
        "Nama penuh dan jawatan bagi 11 wakil AJK Cawangan Utama;",
        "Nama penuh dan jawatan bagi 3 wakil AJK Sayap Belia PERKIM Kuala Langat;",
        "Pengesahan jawatan Naib Pengerusi dan/atau Timbalan Pengerusi 2;",
        "Portfolio/biro yang dipegang oleh setiap AJK (Dakwah, Kebajikan, Pendidikan Mualaf, "
        "Belia, dan lain-lain);",
        "Nombor ahli (jika dibenarkan untuk tujuan rekod); dan",
        "Pengesahan alamat pejabat rasmi serta nombor telefon dan e-mel yang terkini.",
    ]
    for label, text in zip("abcdef", items):
        para(
            document,
            f"({label}) {text}",
            align=body,
            indent=1.5,
            hanging=0.6,
            space_after=3,
        )

    para(
        document,
        "Kami juga memohon kebenaran bertulis bagi penggunaan logo dan nama PERKIM Cawangan "
        "Kuala Langat dalam laman web/bahan penerbitan tersebut, serta panduan penulisan "
        "nama rasmi organisasi yang betul.",
        align=body,
        indent=0.75,
        hanging=0.75,
        space_before=8,
        prefix="4. ",
    )

    para(
        document,
        "Maklumat yang diterima akan digunakan semata-mata untuk tujuan penerangan organisasi "
        "dan tidak akan diedarkan kepada pihak ketiga tanpa kebenaran. Kami sedia menandatangani "
        "sebarang borang pengesahan atau akuan penerimaan maklumat jika diperlukan.",
        align=body,
        indent=0.75,
        hanging=0.75,
        prefix="5. ",
    )

    para(
        document,
        "Kerjasama dan perhatian pihak tuan/puan dalam perkara ini amatlah dihargai. Sebarang "
        "pertanyaan boleh dikemukakan kepada [NAMA & NO. TELEFON/E-MEL WAKIL ANDA].",
        align=body,
        indent=0.75,
        hanging=0.75,
        prefix="6. ",
    )

    para(document, "Sekian, terima kasih.", align=body, indent=0.75, hanging=0.75, space_after=18)

    para(document, "Yang benar,", space_after=36)

    para(document, "_________________________", space_after=2)
    para(document, "[NAMA PENUH]", bold=True, space_after=0)
    para(document, "[JAWATAN]", space_after=0)
    para(document, "[NAMA ORGANISASI]", space_after=0)
    para(document, "[NO. TELEFON]", space_after=0)
    para(document, "[E-MEL]", space_after=18)

    para(document, "s.k.:", bold=True, size=9, space_after=2)
    para(document, "1. Pengerusi, PERKIM Cawangan Kuala Langat", size=9, space_after=0)
    para(document, "2. Fail", size=9, space_after=0)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUT)
    print(f"Siap: {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
