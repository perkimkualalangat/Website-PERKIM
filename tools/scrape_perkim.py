#!/usr/bin/env python3
"""
Ambil kandungan laman rasmi PERKIM untuk kegunaan projek latihan tempatan.

Perubahan daripada draf asal:
  * Tiada kebergantungan luar — guna urllib + html.parser (stdlib sahaja).
  * Hormati robots.txt dan jeda 1.5 saat antara permintaan.
  * Cuba REST API WordPress dahulu; jika tiada, rangkak mengikut data/sitemap.json.
  * Pilihan --dry-run untuk uji sambungan tanpa menyimpan apa-apa.

Guna:
    python tools/scrape_perkim.py --dry-run
    python tools/scrape_perkim.py
    python tools/scrape_perkim.py --limit 50

Hasil: data/perkim/posts.json, pages.json, videos.json

Notis: teks artikel hak cipta PERKIM. Simpan untuk rujukan peribadi sahaja;
jangan terbitkan semula tanpa kebenaran.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

BASE = "https://eng.perkim.net.my"
UA = "PERKIM-Draf-Local/1.0 (projek latihan tempatan; hubungi pemilik projek)"
DELAY = 1.5
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "perkim"
SITEMAP = ROOT / "data" / "sitemap.json"

_last_request = 0.0
ALLOWED: RobotFileParser | None = None


class TextExtractor(HTMLParser):
    """Tukar HTML kepada teks biasa, buang script/style/nav."""

    BLOCK = {
        "p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6",
        "section", "article", "header", "footer", "blockquote", "td", "th",
    }
    SKIP = {"script", "style", "noscript", "nav", "form", "svg"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip_depth += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self._skip_depth = max(0, self._skip_depth - 1)
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._skip_depth == 0:
            self.parts.append(data)

    def text(self) -> str:
        raw = "".join(self.parts)
        lines = [re.sub(r"\s+", " ", line).strip() for line in raw.splitlines()]
        return "\n".join(line for line in lines if line)


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.images: list[str] = []
        self.pdfs: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "img" and attrs.get("src"):
            self.images.append(attrs["src"])
        if tag == "a" and attrs.get("href", "").lower().endswith(".pdf"):
            self.pdfs.append(attrs["href"])


def strip_html(html: str) -> str:
    parser = TextExtractor()
    parser.feed(html)
    return parser.text()


def _wait() -> None:
    global _last_request
    elapsed = time.time() - _last_request
    if elapsed < DELAY:
        time.sleep(DELAY - elapsed)
    _last_request = time.time()


def fetch(url: str, accept: str = "text/html") -> str | None:
    """GET dengan had kadar, percubaan semula dan pengendalian ralat."""
    if ALLOWED is not None and not ALLOWED.can_fetch(UA, url):
        print(f"  robots.txt menyekat: {url}")
        return None

    request = Request(url, headers={"User-Agent": UA, "Accept": accept})

    for attempt in range(1, 4):
        _wait()
        try:
            with urlopen(request, timeout=30) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, "replace")
        except HTTPError as error:
            if error.code in (400, 404):
                return None
            if error.code in (429, 500, 502, 503, 504):
                time.sleep(DELAY * attempt * 2)
                continue
            print(f"  HTTP {error.code}: {url}")
            return None
        except (URLError, TimeoutError) as error:
            print(f"  ralat sambungan ({error}); cubaan {attempt}/3")
            time.sleep(DELAY * attempt * 2)

    return None


def load_robots() -> RobotFileParser:
    parser = RobotFileParser()
    try:
        _wait()
        request = Request(f"{BASE}/robots.txt", headers={"User-Agent": UA})
        with urlopen(request, timeout=20) as response:
            parser.parse(response.read().decode("utf-8", "replace").splitlines())
    except Exception:
        # Tiada robots.txt atau tidak dapat dibaca -> anggap dibenarkan,
        # tetapi kekalkan had kadar.
        parser.allow_all = True
    return parser


def rest(kind: str, limit: int | None = None, dry_run: bool = False) -> list[dict]:
    items: list[dict] = []
    page = 1
    per_page = 100

    while True:
        url = (
            f"{BASE}/wp-json/wp/v2/{kind}"
            f"?per_page={per_page}&page={page}"
            "&_fields=id,date,slug,link,title,content,categories"
        )
        raw = fetch(url, accept="application/json")
        if not raw:
            break

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            print("  respons bukan JSON; berhenti.")
            break

        if not isinstance(data, list) or not data:
            break

        for entry in data:
            items.append(
                {
                    "id": entry.get("id"),
                    "tarikh": entry.get("date"),
                    "slug": entry.get("slug"),
                    "url": entry.get("link"),
                    "tajuk": strip_html(entry.get("title", {}).get("rendered", "")),
                    "kategori_id": entry.get("categories", []),
                    "teks": strip_html(entry.get("content", {}).get("rendered", "")),
                }
            )

        print(f"  {kind}: halaman {page} — {len(data)} item")
        page += 1

        if dry_run or (limit and len(items) >= limit) or len(data) < per_page:
            break

    return items[:limit] if limit else items


def crawl(paths: list[str]) -> list[dict]:
    pages = []
    for path in paths:
        url = urljoin(BASE, path)
        html = fetch(url)
        if not html:
            continue

        text = strip_html(html)
        links = LinkExtractor()
        links.feed(html)

        title = ""
        match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        if match:
            title = re.sub(r"\s+", " ", strip_html(match.group(1))).strip()

        pages.append(
            {
                "url": url,
                "tajuk": title,
                "teks": text,
                "imej": [urljoin(BASE, src) for src in links.images],
                "pdf": [urljoin(BASE, href) for href in links.pdfs],
            }
        )
        print(f"  halaman: {path}")

    return pages


def video_ids(html: str) -> list[str]:
    pattern = r"(?:youtube\.com/embed/|youtu\.be/|watch\?v=)([\w-]{11})"
    return sorted(set(re.findall(pattern, html)))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="uji tanpa menyimpan")
    parser.add_argument("--limit", type=int, default=None, help="had item setiap jenis")
    args = parser.parse_args()

    global ALLOWED
    ALLOWED = load_robots()

    print(f"Mengambil data daripada {BASE}")
    print("Mod:", "dry-run" if args.dry_run else "simpan")

    posts = rest("posts", args.limit, args.dry_run)
    pages = rest("pages", args.limit, args.dry_run)

    if not pages and not args.dry_run:
        if SITEMAP.exists():
            sitemap = json.loads(SITEMAP.read_text(encoding="utf-8"))
            paths = [
                path
                for section in sitemap
                for path in section.get("halaman", [])
                if "/category/" not in path
            ]
            print(f"  REST tiada — merangkak {len(paths)} halaman.")
            pages = crawl(paths)
        else:
            print("  Amaran: data/sitemap.json tidak ditemui; halaman tidak diambil.")

    home = fetch(BASE + "/")
    videos = video_ids(home or "")

    print(f"\nRingkasan: {len(posts)} artikel, {len(pages)} halaman, {len(videos)} video")

    if args.dry_run:
        print("Dry-run selesai. Tiada fail ditulis.")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    for name, payload in (("posts", posts), ("pages", pages), ("videos", videos)):
        target = OUT / f"{name}.json"
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  {target.relative_to(ROOT)}")

    dates = sorted(post["tarikh"] for post in posts if post.get("tarikh"))
    summary = {
        "artikel": len(posts),
        "halaman": len(pages),
        "video": len(videos),
        "tarikh_awal": dates[0][:10] if dates else None,
        "tarikh_akhir": dates[-1][:10] if dates else None,
        "diambil": time.strftime("%Y-%m-%d"),
        "sumber": BASE + "/",
    }
    (OUT / "ringkasan.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  {(OUT / 'ringkasan.json').relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
