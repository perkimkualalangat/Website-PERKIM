"""
Semakan pautan dan aset projek (tiada kebergantungan luar).

Guna:
    python tools/check-site.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent

HTML_ATTR = re.compile(r'(?:href|src)="([^"]+)"', re.IGNORECASE)
CSS_IMPORT = re.compile(r'@import\s+"([^"]+)"')
CSS_URL = re.compile(r'url\(([^)]+)\)')

VOID = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'source', 'track', 'wbr',
}

errors: list[str] = []
checked = 0


class Balance(HTMLParser):
    """Semakan mudah: padanan tag buka/tutup."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.problems: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag: str, attrs) -> None:
        pass

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID:
            return
        line = self.getpos()[0]
        if not self.stack:
            self.problems.append(f"</{tag}> tanpa pembuka (baris {line})")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
            return
        names = [t for t, _ in self.stack]
        if tag not in names:
            self.problems.append(f"</{tag}> tidak sepadan (baris {line})")
            return
        while self.stack and self.stack[-1][0] != tag:
            open_tag, open_line = self.stack.pop()
            self.problems.append(f"<{open_tag}> (baris {open_line}) tidak ditutup sebelum </{tag}>")

    def finalize(self) -> list[str]:
        for tag, line in self.stack:
            self.problems.append(f"<{tag}> (baris {line}) tidak ditutup")
        return self.problems


def resolve_local(url: str, base: Path) -> Path | None:
    """Tukar URL dalaman kepada laluan fail. None jika luar/abai."""
    if url.startswith(('http://', 'https://', 'mailto:', 'tel:', 'data:', '#')):
        return None
    path = urlparse(url).path
    if not path:
        return None
    if path.endswith('/'):
        path += 'index.html'
    if path.startswith('/'):
        return ROOT / unquote(path).lstrip('/')
    return (base.parent / unquote(path)).resolve()


def check(target: Path, label: str) -> None:
    global checked
    checked += 1
    if not target.exists():
        errors.append(f"MISSING  {label} -> {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}")
    elif target.is_file() and target.stat().st_size == 0:
        errors.append(f"EMPTY    {label} -> {target.relative_to(ROOT)}")


print("Menyemak fail HTML…")
for html in sorted(ROOT.rglob('*.html')):
    text = html.read_text(encoding='utf-8')

    parser = Balance()
    parser.feed(text)
    for problem in parser.finalize():
        errors.append(f"TAG      {html.relative_to(ROOT)}: {problem}")

    for attr in HTML_ATTR.findall(text):
        target = resolve_local(attr, html)
        if target:
            check(target, f"{html.relative_to(ROOT)} [{attr}]")

    # Alat dalam dev/ berdiri sendiri; halaman laman utama menggunakan shell dikongsi.
    relative = html.relative_to(ROOT)
    if relative.parts[0] == 'dev':
        if '<main' not in text:
            errors.append(f"STRUKTUR {relative} tiada elemen main")
    else:
        for required in ('id="site-header"', 'id="site-footer"', 'id="main"'):
            if required not in text:
                errors.append(f"STRUKTUR {relative} tiada {required}")

    if '<html lang="ms"' not in text:
        errors.append(f"STRUKTUR {html.relative_to(ROOT)} tiada lang=\"ms\"")
    if 'noindex' not in text:
        errors.append(f"STRUKTUR {html.relative_to(ROOT)} tiada meta noindex")

print("Menyemak fail CSS…")
for css in sorted(ROOT.rglob('*.css')):
    text = css.read_text(encoding='utf-8')
    for imp in CSS_IMPORT.findall(text):
        target = (css.parent / imp).resolve()
        check(target, f"{css.relative_to(ROOT)} [@import {imp}]")
    for raw in CSS_URL.findall(text):
        value = raw.strip().strip('\'"')
        if value.startswith(('data:', '#')):
            continue
        target = (css.parent / value).resolve()
        check(target, f"{css.relative_to(ROOT)} [url({value})]")

print("Menyemak fail JSON…")
for js in sorted(ROOT.rglob('*.json')):
    try:
        data = json.loads(js.read_text(encoding='utf-8'))
        count = len(data) if isinstance(data, (list, dict)) else '?'
        print(f"  OK  {js.relative_to(ROOT)} ({count} entri)")
    except json.JSONDecodeError as exc:
        errors.append(f"JSON     {js.relative_to(ROOT)}: {exc}")

print("Menyemak sumber program…")
source_check = subprocess.run(
    [sys.executable, str(ROOT / 'tools' / 'bina_aktiviti.py'), '--semak'],
    cwd=ROOT,
    capture_output=True,
    text=True,
    check=False,
)
if source_check.stdout.strip():
    print("  " + source_check.stdout.strip().replace("\n", "\n  "))
if source_check.stderr.strip():
    print("  " + source_check.stderr.strip().replace("\n", "\n  "))
if source_check.returncode:
    errors.append("PROGRAM semakan sumber gagal; lihat butiran di atas")

print("Menyemak data aktiviti…")
activity_check = subprocess.run(
    [sys.executable, str(ROOT / 'tools' / 'check-aktiviti.py')],
    cwd=ROOT,
    capture_output=True,
    text=True,
    check=False,
)
if activity_check.stdout.strip():
    print("  " + activity_check.stdout.strip().replace("\n", "\n  "))
if activity_check.stderr.strip():
    print("  " + activity_check.stderr.strip().replace("\n", "\n  "))
if activity_check.returncode:
    errors.append("AKTIVITI semakan data gagal; lihat butiran di atas")

print(f"\n{checked} rujukan disemak.")

if errors:
    print(f"\n{len(errors)} masalah ditemui:")
    for item in errors:
        print("  -", item)
    sys.exit(1)

print("Tiada pautan atau aset yang hilang.")
