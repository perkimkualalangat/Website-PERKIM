"""Semak struktur data/aktiviti.json tanpa kebergantungan luar."""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "aktiviti.json"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
STATUS = {"draf", "disahkan", "ditarik"}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        items = json.loads(DATA.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"RALAT: gagal membaca {DATA}: {exc}")
        return 1

    if not isinstance(items, list):
        print("RALAT: data/aktiviti.json mesti mengandungi senarai JSON.")
        return 1

    ids: set[str] = set()
    slugs: set[str] = set()
    sorotan_seen: set[int] = set()

    for position, item in enumerate(items, start=1):
        label = f"rekod {position}"
        if not isinstance(item, dict):
            errors.append(f"{label}: mesti objek JSON")
            continue

        item_id = item.get("id")
        slug = item.get("slug")
        title = item.get("tajuk")
        status = item.get("status")

        for field in (
            "id",
            "slug",
            "tarikh",
            "tajuk",
            "kategori",
            "ringkas",
            "caption",
            "status",
            "facebook_url",
            "sumber",
        ):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"{label}: {field} mesti teks bukan kosong")

        if isinstance(item_id, str):
            if item_id in ids:
                errors.append(f"{label}: id berulang ({item_id})")
            ids.add(item_id)

        if isinstance(slug, str):
            if not SLUG.fullmatch(slug):
                errors.append(f"{label}: slug tidak sah ({slug})")
            if slug in slugs:
                errors.append(f"{label}: slug berulang ({slug})")
            slugs.add(slug)

        try:
            date.fromisoformat(str(item.get("tarikh", "")))
        except ValueError:
            errors.append(f"{label}: tarikh mesti YYYY-MM-DD")

        if status not in STATUS:
            errors.append(f"{label}: status mesti salah satu {sorted(STATUS)}")

        sorotan = item.get("sorotan")
        if sorotan is not None:
            if not isinstance(sorotan, int) or isinstance(sorotan, bool) or sorotan < 1:
                errors.append(f"{label}: sorotan mesti integer positif")
            elif sorotan in sorotan_seen:
                errors.append(f"{label}: nombor sorotan berulang ({sorotan})")
            else:
                sorotan_seen.add(sorotan)

        for field in ("masa", "kehadiran", "laporan", "petikan", "petikan_oleh"):
            value = item.get(field)
            if value is not None and (not isinstance(value, str) or not value.strip()):
                errors.append(f"{label}: {field} mesti teks bukan kosong atau null")

        laporan = item.get("laporan")
        if isinstance(laporan, str) and laporan.strip():
            laporan_path = Path(laporan)
            target = (ROOT / laporan_path).resolve()
            if laporan_path.is_absolute() or ".." in laporan_path.parts:
                errors.append(f"{label}: laporan mesti laluan relatif")
            elif target.suffix.lower() != ".md":
                errors.append(f"{label}: laporan mesti fail Markdown (.md)")
            elif not target.is_file():
                errors.append(f"{label}: fail laporan tidak ditemui ({laporan})")

        confirmation = item.get("disahkan")
        if not isinstance(confirmation, dict):
            errors.append(f"{label}: disahkan mesti objek dengan medan oleh dan tarikh")
        elif "oleh" not in confirmation or "tarikh" not in confirmation:
            errors.append(f"{label}: disahkan mesti mempunyai medan oleh dan tarikh")
        elif status == "disahkan":
            role = confirmation.get("oleh")
            confirmed_date = confirmation.get("tarikh")
            if not isinstance(role, str) or not role.strip():
                errors.append(f"{label}: disahkan.oleh diperlukan bagi rekod disahkan")
            try:
                parsed_confirmation = date.fromisoformat(str(confirmed_date))
                if parsed_confirmation > date.today():
                    errors.append(f"{label}: disahkan.tarikh tidak boleh pada masa hadapan")
            except ValueError:
                errors.append(f"{label}: disahkan.tarikh mesti YYYY-MM-DD")
        elif confirmation.get("oleh") is not None or confirmation.get("tarikh") is not None:
            errors.append(f"{label}: medan disahkan mesti null selagi status bukan disahkan")

        for field in ("tajuk", "ringkas", "lokasi", "sumber"):
            value = item.get(field)
            if isinstance(value, str) and ("<" in value or ">" in value):
                errors.append(f"{label}: {field} tidak boleh mengandungi HTML")

        if isinstance(title, str) and len(title) > 140:
            warnings.append(f"{label}: tajuk melebihi 140 aksara")
        if isinstance(item.get("ringkas"), str) and len(item["ringkas"]) > 400:
            warnings.append(f"{label}: ringkas melebihi 400 aksara")

        facebook_url = item.get("facebook_url")
        if facebook_url is not None:
            parsed = urlparse(str(facebook_url))
            host = (parsed.hostname or "").lower()
            if parsed.scheme != "https" or not (host == "facebook.com" or host.endswith(".facebook.com")):
                errors.append(f"{label}: facebook_url mesti URL HTTPS facebook.com")
            elif "/share/" in parsed.path:
                warnings.append(f"{label}: guna URL post kanonik, bukan pautan /share/")

        images = item.get("gambar")
        if not isinstance(images, list):
            errors.append(f"{label}: gambar mesti senarai")
            images = []
        for image_number, image in enumerate(images, start=1):
            image_label = f"{label}: gambar {image_number}"
            if not isinstance(image, dict):
                errors.append(f"{image_label} mesti objek")
                continue
            src = image.get("src")
            alt = image.get("alt")
            caption = image.get("kapsyen")
            if not isinstance(src, str) or not src.strip():
                errors.append(f"{image_label}: src mesti teks bukan kosong")
                continue
            if not isinstance(alt, str) or not alt.strip():
                errors.append(f"{image_label}: alt mesti teks bukan kosong")
            if caption is not None and not isinstance(caption, str):
                errors.append(f"{image_label}: kapsyen mesti teks atau null")

            image_path = Path(src)
            if image_path.is_absolute() or ".." in image_path.parts:
                errors.append(f"{image_label}: src mesti laluan tempatan relatif")
                continue
            target = (ROOT / image_path).resolve()
            if not target.is_relative_to(ROOT):
                errors.append(f"{image_label}: fail berada di luar projek")
            elif target.suffix.lower() not in IMAGE_SUFFIXES:
                errors.append(f"{image_label}: format tidak disokong ({target.suffix})")
            elif not target.is_file():
                errors.append(f"{image_label}: fail tidak ditemui ({src})")

    print(f"Aktiviti: {len(items)} rekod, {len(errors)} ralat, {len(warnings)} amaran.")
    for warning in warnings:
        print(f"AMARAN: {warning}")
    for error in errors:
        print(f"RALAT: {error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
