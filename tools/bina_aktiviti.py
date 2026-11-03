#!/usr/bin/env python3
"""Jana data/aktiviti.json daripada program/*/caption.md."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
PROGRAM_ROOT = ROOT / "program"
OUTPUT = ROOT / "data" / "aktiviti.json"

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
STATUS = {"draf", "disahkan", "ditarik"}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
REQUIRED_TEXT = {
    "id",
    "slug",
    "tarikh",
    "tajuk",
    "kategori",
    "ringkas",
    "facebook_url",
    "status",
    "sumber",
}
KNOWN = REQUIRED_TEXT | {
    "lokasi",
    "disahkan_oleh",
    "disahkan_tarikh",
    "gambar",
    "gambar_alt",
    "gambar_kapsyen",
}


def parse_value(raw: str, label: str, errors: list[str]):
    value = raw.strip()
    if value in {"null", "~"}:
        return None
    if value in {"true", "false"}:
        return value == "true"
    if value.startswith(("[", "{", '"')):
        try:
            return json.loads(value)
        except json.JSONDecodeError as exc:
            errors.append(f"{label}: nilai JSON tidak sah ({exc.msg})")
            return None
    return value


def parse_caption(path: Path) -> tuple[dict, str, list[str]]:
    path = path.resolve()
    errors: list[str] = []
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        return {}, "", [f"{path.relative_to(ROOT)}: gagal dibaca ({exc})"]

    lines = text.splitlines()
    label = str(path.relative_to(ROOT))
    if not lines or lines[0].strip() != "---":
        return {}, "", [f"{label}: mesti bermula dengan ---"]

    try:
        closing = next(index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration:
        return {}, "", [f"{label}: penutup metadata --- tidak ditemui"]

    metadata: dict = {}
    for line_number, raw in enumerate(lines[1:closing], start=2):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            errors.append(f"{label}:{line_number}: gunakan format kunci: nilai")
            continue
        key, value = line.split(":", 1)
        key = key.strip().lower()
        if not key:
            errors.append(f"{label}:{line_number}: kunci kosong")
            continue
        if key in metadata:
            errors.append(f"{label}:{line_number}: medan berganda ({key})")
            continue
        metadata[key] = parse_value(value, f"{label}:{line_number}", errors)

    caption = "\n".join(lines[closing + 1 :]).strip()
    return metadata, caption, errors


def valid_date(value, label: str, errors: list[str], future_allowed: bool = True):
    try:
        parsed = date.fromisoformat(str(value))
    except ValueError:
        errors.append(f"{label}: mesti YYYY-MM-DD")
        return None
    if not future_allowed and parsed > date.today():
        errors.append(f"{label}: tidak boleh pada masa hadapan")
    return parsed


def list_value(metadata: dict, key: str, label: str, errors: list[str]) -> list:
    value = metadata.get(key, [])
    if not isinstance(value, list):
        errors.append(f"{label}: {key} mesti senarai JSON [...]")
        return []
    return value


def build_record(folder: Path) -> tuple[dict | None, list[str], list[str]]:
    source = folder / "caption.md"
    metadata, caption, errors = parse_caption(source)
    warnings: list[str] = []
    label = str(source.relative_to(ROOT))

    if errors and not metadata:
        return None, errors, warnings

    unknown = sorted(set(metadata) - KNOWN)
    for key in unknown:
        warnings.append(f"{label}: medan tidak dikenali ({key})")

    for key in sorted(REQUIRED_TEXT):
        value = metadata.get(key)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{label}: {key} mesti teks bukan kosong")

    item_id = metadata.get("id")
    slug = metadata.get("slug")
    status = metadata.get("status")

    if isinstance(item_id, str) and not SLUG.fullmatch(item_id):
        errors.append(f"{label}: id tidak sah ({item_id})")
    if isinstance(slug, str):
        if not SLUG.fullmatch(slug):
            errors.append(f"{label}: slug tidak sah ({slug})")
        if slug != folder.name:
            errors.append(f"{label}: slug mesti sama dengan nama folder ({folder.name})")

    valid_date(metadata.get("tarikh"), f"{label}: tarikh", errors)

    if status not in STATUS:
        errors.append(f"{label}: status mesti salah satu {sorted(STATUS)}")

    facebook_url = metadata.get("facebook_url")
    if isinstance(facebook_url, str):
        parsed_url = urlparse(facebook_url)
        host = (parsed_url.hostname or "").lower()
        if parsed_url.scheme != "https" or not (
            host == "facebook.com" or host.endswith(".facebook.com")
        ):
            errors.append(f"{label}: facebook_url mesti URL HTTPS facebook.com")
        elif "/share/" in parsed_url.path:
            warnings.append(f"{label}: ganti pautan /share/ dengan URL post kanonik")

    if not caption:
        errors.append(f"{label}: caption penuh diperlukan selepas metadata")

    if isinstance(metadata.get("ringkas"), str) and len(metadata["ringkas"]) > 400:
        warnings.append(f"{label}: ringkas melebihi 400 aksara")

    confirmed_by = metadata.get("disahkan_oleh")
    confirmed_date = metadata.get("disahkan_tarikh")
    if status == "disahkan":
        if not isinstance(confirmed_by, str) or not confirmed_by.strip():
            errors.append(f"{label}: disahkan_oleh diperlukan bagi rekod disahkan")
        valid_date(
            confirmed_date,
            f"{label}: disahkan_tarikh",
            errors,
            future_allowed=False,
        )
    elif confirmed_by is not None or confirmed_date is not None:
        errors.append(f"{label}: medan pengesahan mesti null selagi status bukan disahkan")

    images = list_value(metadata, "gambar", label, errors)
    image_alts = list_value(metadata, "gambar_alt", label, errors)
    image_captions = list_value(metadata, "gambar_kapsyen", label, errors)
    if len(image_alts) != len(images):
        errors.append(f"{label}: gambar_alt mesti mempunyai {len(images)} item")
    if len(image_captions) not in {0, len(images)}:
        errors.append(f"{label}: gambar_kapsyen mesti kosong atau mempunyai {len(images)} item")

    gallery: list[dict] = []
    listed_images: set[str] = set()
    for index, image in enumerate(images):
        if not isinstance(image, str) or not image.strip():
            errors.append(f"{label}: gambar item {index + 1} mesti nama fail")
            continue
        relative = Path(image)
        target = (folder / relative).resolve()
        if relative.is_absolute() or ".." in relative.parts or not target.is_relative_to(folder.resolve()):
            errors.append(f"{label}: laluan gambar tidak sah ({image})")
            continue
        if target.suffix.lower() not in IMAGE_SUFFIXES:
            errors.append(f"{label}: format gambar tidak disokong ({image})")
            continue
        if not target.is_file():
            errors.append(f"{label}: gambar tidak ditemui ({image})")
            continue

        alt = image_alts[index] if index < len(image_alts) else None
        if not isinstance(alt, str) or not alt.strip():
            errors.append(f"{label}: gambar_alt item {index + 1} mesti teks bukan kosong")
            alt = ""
        image_caption = image_captions[index] if index < len(image_captions) else None
        if image_caption is not None and not isinstance(image_caption, str):
            errors.append(f"{label}: gambar_kapsyen item {index + 1} mesti teks atau null")
            image_caption = None

        listed_images.add(relative.as_posix())
        gallery.append(
            {
                "src": target.relative_to(ROOT).as_posix(),
                "alt": alt.strip() if isinstance(alt, str) else "",
                "kapsyen": image_caption.strip() if isinstance(image_caption, str) else None,
            }
        )

    actual_images = {
        path.relative_to(folder).as_posix()
        for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    }
    for unlisted in sorted(actual_images - listed_images):
        warnings.append(f"{label}: gambar belum disenaraikan ({unlisted})")

    if errors:
        return None, errors, warnings

    record = {
        "id": item_id,
        "slug": slug,
        "tarikh": metadata["tarikh"],
        "tajuk": metadata["tajuk"],
        "kategori": metadata["kategori"],
        "ringkas": metadata["ringkas"],
        "caption": caption,
        "lokasi": metadata.get("lokasi"),
        "facebook_url": facebook_url,
        "gambar": gallery,
        "status": status,
        "sumber": metadata["sumber"],
        "disahkan": {"oleh": confirmed_by, "tarikh": confirmed_date},
    }
    return record, errors, warnings


def collect() -> tuple[list[dict], list[str], list[str], int]:
    records: list[dict] = []
    errors: list[str] = []
    warnings: list[str] = []
    withdrawn = 0

    if not PROGRAM_ROOT.is_dir():
        return [], ["folder program/ tidak ditemui"], [], 0

    folders = sorted(
        folder
        for folder in PROGRAM_ROOT.iterdir()
        if folder.is_dir() and not folder.name.startswith(("_", "."))
    )
    seen_ids: set[str] = set()
    seen_slugs: set[str] = set()

    for folder in folders:
        if not (folder / "caption.md").is_file():
            errors.append(f"program/{folder.name}: caption.md tidak ditemui")
            continue
        record, record_errors, record_warnings = build_record(folder)
        errors.extend(record_errors)
        warnings.extend(record_warnings)
        if not record:
            continue
        if record["id"] in seen_ids:
            errors.append(f"program/{folder.name}: id berulang ({record['id']})")
        if record["slug"] in seen_slugs:
            errors.append(f"program/{folder.name}: slug berulang ({record['slug']})")
        seen_ids.add(record["id"])
        seen_slugs.add(record["slug"])
        if record["status"] == "ditarik":
            withdrawn += 1
        else:
            records.append(record)

    records.sort(key=lambda item: (item["tarikh"], item["slug"]), reverse=True)
    return records, errors, warnings, withdrawn


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--semak",
        action="store_true",
        help="semak sumber dan pastikan data/aktiviti.json telah dijana semula",
    )
    args = parser.parse_args()

    records, errors, warnings, withdrawn = collect()
    if not errors and args.semak:
        try:
            current = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"gagal membaca {OUTPUT.relative_to(ROOT)} ({exc})")
        else:
            if current != records:
                errors.append(
                    "data/aktiviti.json tidak segerak; jalankan python tools\\bina_aktiviti.py"
                )

    for warning in warnings:
        print(f"AMARAN: {warning}")
    for error in errors:
        print(f"RALAT: {error}")

    if errors:
        print(f"Aktiviti: {len(records)} sah, {len(errors)} ralat, {len(warnings)} amaran.")
        return 1

    if not args.semak:
        OUTPUT.write_text(
            json.dumps(records, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Dijana: {OUTPUT.relative_to(ROOT)}")

    action = "disemak" if args.semak else "dijana"
    print(
        f"Aktiviti: {len(records)} {action}, {withdrawn} ditarik, "
        f"0 ralat, {len(warnings)} amaran."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
