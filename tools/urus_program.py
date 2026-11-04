#!/usr/bin/env python3
"""Urus folder program: cipta program baharu, imbas gambar dan simpan senarai gambar.

Semua arahan membaca satu objek JSON daripada stdin (--data -) atau fail, dan
mencetak satu objek JSON supaya mudah dipanggil oleh API Tetapan tempatan.

Guna:
    python tools/urus_program.py imbas --data - < input.json
    python tools/urus_program.py cipta --data - < input.json
    python tools/urus_program.py simpan-gambar --data - < input.json
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from bina_aktiviti import (
    IMAGE_SUFFIXES,
    PROGRAM_ROOT,
    SLUG,
    parse_caption,
)

DEFAULT_SOURCE = "Facebook PERKIM Kuala Langat"
FACEBOOK_DEFAULT = "https://www.facebook.com/people/Perkim-Kuala-Langat/61574216275902/"
STATUS_DRAF = "draf"

METADATA_ORDER = [
    "id",
    "slug",
    "tarikh",
    "tajuk",
    "kategori",
    "ringkas",
    "lokasi",
    "masa",
    "kehadiran",
    "laporan",
    "petikan",
    "petikan_oleh",
    "sorotan",
    "facebook_url",
    "status",
    "sumber",
    "disahkan_oleh",
    "disahkan_tarikh",
    "gambar",
    "gambar_alt",
    "gambar_kapsyen",
]

GALLERY_FIELDS = ["gambar", "gambar_alt", "gambar_kapsyen"]


class UrusError(Exception):
    """Ralat yang boleh dipaparkan terus kepada pengguna."""


def read_payload(path: str) -> dict:
    try:
        if path == "-":
            raw = sys.stdin.read()
        else:
            raw = Path(path).read_text(encoding="utf-8-sig")
        payload = json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        raise UrusError(f"input JSON tidak sah ({exc})") from exc
    if not isinstance(payload, dict):
        raise UrusError("input mesti satu objek JSON")
    return payload


def text_value(payload: dict, key: str, errors: list[str], required: bool = True) -> str | None:
    value = payload.get(key)
    if value is None:
        if required:
            errors.append(f"{key} diperlukan")
        return None
    if not isinstance(value, str):
        errors.append(f"{key} mesti teks")
        return None
    value = value.strip()
    if not value:
        if required:
            errors.append(f"{key} tidak boleh kosong")
        return None
    if "\n" in value or "\r" in value:
        errors.append(f"{key} mesti satu baris")
        return None
    return value


def optional_int(payload: dict, key: str, errors: list[str]) -> int | None:
    value = payload.get(key)
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        errors.append(f"{key} mesti integer positif")
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        errors.append(f"{key} mesti integer positif")
        return None
    if number < 1:
        errors.append(f"{key} mesti integer positif")
        return None
    return number


def validate_facebook(value: str, errors: list[str]) -> str:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not (host == "facebook.com" or host.endswith(".facebook.com")):
        errors.append("facebook_url mesti URL HTTPS facebook.com")
    return value


def quote_value(value) -> str:
    """Tulis nilai metadata dalam bentuk yang difahami oleh parse_value()."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    text = str(value)
    if (
        not text
        or text != text.strip()
        or text.startswith((" ", "-", "?", ":", "[", "{", '"', "'", "#"))
        or text.lower() in {"null", "~", "true", "false"}
        or "\n" in text
        or "\r" in text
    ):
        return json.dumps(text, ensure_ascii=False)
    return text


def front_matter(metadata: dict, caption: str) -> str:
    lines = ["---"]
    for key in METADATA_ORDER:
        lines.append(f"{key}: {quote_value(metadata.get(key))}")
    lines.append("---")
    lines.append("")
    lines.append(caption.strip())
    lines.append("")
    return "\n".join(lines)


def write_atomic(path: Path, payload: str) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(payload, encoding="utf-8", newline="\n")
    temporary.replace(path)


def program_folder(slug: str) -> Path:
    if not SLUG.fullmatch(slug):
        raise UrusError("slug tidak sah; guna huruf kecil, nombor dan sengkang sahaja")
    folder = PROGRAM_ROOT / slug
    if not folder.is_dir():
        raise UrusError(f"folder program/{slug} tidak ditemui")
    if not (folder / "caption.md").is_file():
        raise UrusError(f"program/{slug}/caption.md tidak ditemui")
    return folder


def existing_sorotan(except_slug: str = "") -> dict[int, str]:
    found: dict[int, str] = {}
    if not PROGRAM_ROOT.is_dir():
        return found
    for folder in sorted(PROGRAM_ROOT.iterdir()):
        if folder.name == except_slug or not folder.is_dir():
            continue
        source = folder / "caption.md"
        if not source.is_file():
            continue
        metadata, _, _ = parse_caption(source)
        value = metadata.get("sorotan")
        if isinstance(value, int) and not isinstance(value, bool):
            found[value] = folder.name
    return found


def actual_images(folder: Path) -> list[Path]:
    return sorted(
        path
        for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )


def imbas_data(slug: str) -> dict:
    folder = program_folder(slug)
    metadata, _, errors = parse_caption(folder / "caption.md")
    warnings: list[str] = []

    listed = metadata.get("gambar")
    alts = metadata.get("gambar_alt")
    captions = metadata.get("gambar_kapsyen")
    if not isinstance(listed, list):
        listed = []
        errors.append("medan gambar mesti senarai JSON")
    if not isinstance(alts, list):
        alts = []
    if not isinstance(captions, list):
        captions = []

    files = {path.relative_to(folder).as_posix(): path for path in actual_images(folder)}
    images: list[dict] = []
    seen: set[str] = set()

    for index, name in enumerate(listed):
        if not isinstance(name, str) or not name.strip():
            errors.append(f"gambar item {index + 1} mesti nama fail")
            continue
        name = name.strip()
        if name in seen:
            errors.append(f"gambar berulang dalam caption.md ({name})")
            continue
        seen.add(name)
        alt = alts[index] if index < len(alts) and isinstance(alts[index], str) else ""
        caption = captions[index] if index < len(captions) and isinstance(captions[index], str) else None
        path = files.get(name)
        images.append(
            {
                "nama": name,
                "src": f"program/{slug}/{name}",
                "alt": alt,
                "kapsyen": caption,
                "disenaraikan": True,
                "wujud": path is not None,
                "saiz": path.stat().st_size if path else None,
            }
        )
        if path is None:
            warnings.append(f"gambar disenaraikan tetapi tiada dalam folder ({name})")

    for name in sorted(set(files) - seen):
        images.append(
            {
                "nama": name,
                "src": f"program/{slug}/{name}",
                "alt": "",
                "kapsyen": None,
                "disenaraikan": False,
                "wujud": True,
                "saiz": files[name].stat().st_size,
            }
        )
        warnings.append(f"gambar belum disenaraikan ({name})")

    tajuk = metadata.get("tajuk")
    status = metadata.get("status")
    return {
        "ok": not errors,
        "arahan": "imbas",
        "slug": slug,
        "program": {
            "slug": slug,
            "tajuk": tajuk if isinstance(tajuk, str) else slug,
            "status": status if isinstance(status, str) else None,
            "tarikh": metadata.get("tarikh") if isinstance(metadata.get("tarikh"), str) else None,
            "sorotan": metadata.get("sorotan")
            if isinstance(metadata.get("sorotan"), int)
            and not isinstance(metadata.get("sorotan"), bool)
            else None,
        },
        "gambar": images,
        "ralat": errors,
        "amaran": warnings,
    }


def cipta(payload: dict) -> dict:
    errors: list[str] = []
    warnings: list[str] = []

    slug = text_value(payload, "slug", errors)
    tajuk = text_value(payload, "tajuk", errors)
    tarikh = text_value(payload, "tarikh", errors)
    kategori = text_value(payload, "kategori", errors)
    ringkas = text_value(payload, "ringkas", errors)
    facebook_url = text_value(payload, "facebook_url", errors)
    caption = payload.get("caption")

    if slug:
        if not SLUG.fullmatch(slug):
            errors.append("slug tidak sah; guna huruf kecil, nombor dan sengkang sahaja")
        elif (PROGRAM_ROOT / slug).exists():
            errors.append(f"folder program/{slug} sudah wujud")

    if tarikh:
        try:
            date.fromisoformat(tarikh)
        except ValueError:
            errors.append("tarikh mesti format YYYY-MM-DD")

    if ringkas and len(ringkas) > 400:
        warnings.append("ringkas melebihi 400 aksara")

    if facebook_url:
        validate_facebook(facebook_url, errors)

    if not isinstance(caption, str) or not caption.strip():
        errors.append("caption penuh diperlukan")

    sorotan = optional_int(payload, "sorotan", errors)
    if sorotan is not None:
        used = existing_sorotan(except_slug=slug or "")
        if sorotan in used:
            errors.append(f"nombor sorotan {sorotan} sudah digunakan oleh {used[sorotan]}")

    lokasi = text_value(payload, "lokasi", errors, required=False)
    masa = text_value(payload, "masa", errors, required=False)
    kehadiran = text_value(payload, "kehadiran", errors, required=False)
    sumber = text_value(payload, "sumber", errors, required=False) or DEFAULT_SOURCE

    if errors:
        return {
            "ok": False,
            "arahan": "cipta",
            "slug": slug,
            "ralat": errors,
            "amaran": warnings,
        }

    metadata = {
        "id": slug,
        "slug": slug,
        "tarikh": tarikh,
        "tajuk": tajuk,
        "kategori": kategori,
        "ringkas": ringkas,
        "lokasi": lokasi,
        "masa": masa,
        "kehadiran": kehadiran,
        "laporan": None,
        "petikan": None,
        "petikan_oleh": None,
        "sorotan": sorotan,
        "facebook_url": facebook_url,
        "status": STATUS_DRAF,
        "sumber": sumber,
        "disahkan_oleh": None,
        "disahkan_tarikh": None,
        "gambar": [],
        "gambar_alt": [],
        "gambar_kapsyen": [],
    }

    folder = PROGRAM_ROOT / slug
    try:
        folder.mkdir(parents=True, exist_ok=False)
        write_atomic(folder / "caption.md", front_matter(metadata, caption))
    except OSError as exc:
        errors.append(f"gagal mencipta program ({exc})")
        return {
            "ok": False,
            "arahan": "cipta",
            "slug": slug,
            "ralat": errors,
            "amaran": warnings,
        }

    return {
        "ok": True,
        "arahan": "cipta",
        "slug": slug,
        "folder": f"program/{slug}",
        "fail": f"program/{slug}/caption.md",
        "ralat": [],
        "amaran": warnings,
        "program": {
            "slug": slug,
            "tajuk": tajuk,
            "status": STATUS_DRAF,
            "tarikh": tarikh,
            "sorotan": sorotan,
        },
    }


def save_gallery(folder: Path, entries) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(entries, list):
        return ["gambar mesti senarai"], warnings

    names: list[str] = []
    alts: list[str] = []
    captions: list[str | None] = []
    seen: set[str] = set()

    for index, entry in enumerate(entries):
        label = f"gambar item {index + 1}"
        if not isinstance(entry, dict):
            errors.append(f"{label} mesti objek")
            continue
        raw_name = entry.get("nama")
        if not isinstance(raw_name, str) or not raw_name.strip():
            errors.append(f"{label} tiada nama fail")
            continue
        name = raw_name.strip()
        relative = Path(name)
        if (
            relative.is_absolute()
            or len(relative.parts) != 1
            or name in {".", ".."}
            or "/" in name
            or "\\" in name
            or relative.suffix.lower() not in IMAGE_SUFFIXES
        ):
            errors.append(f"{label}: nama fail tidak sah ({name})")
            continue
        target = (folder / name).resolve()
        if not target.is_relative_to(folder.resolve()) or not target.is_file():
            errors.append(f"{label}: fail tidak ditemui ({name})")
            continue
        if name in seen:
            errors.append(f"{label}: gambar berulang ({name})")
            continue
        seen.add(name)

        alt = entry.get("alt")
        if not isinstance(alt, str) or not alt.strip():
            errors.append(f"{label}: alt text diperlukan")
            alt = ""
        caption = entry.get("kapsyen")
        if caption is not None and not isinstance(caption, str):
            errors.append(f"{label}: kapsyen mesti teks atau null")
            caption = None
        if isinstance(caption, str) and not caption.strip():
            caption = None

        names.append(name)
        alts.append(alt.strip())
        captions.append(caption.strip() if isinstance(caption, str) else None)

    if errors:
        return errors, warnings

    source = folder / "caption.md"
    try:
        text = source.read_text(encoding="utf-8-sig")
    except OSError as exc:
        return [f"gagal membaca caption.md ({exc})"], warnings

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return ["caption.md mesti bermula dengan ---"], warnings
    try:
        closing = next(
            index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---"
        )
    except StopIteration:
        return ["penutup metadata --- tidak ditemui"], warnings

    values = {
        "gambar": quote_value(names),
        "gambar_alt": quote_value(alts),
        "gambar_kapsyen": quote_value(captions),
    }

    new_lines = list(lines)
    found: set[str] = set()
    for index in range(1, closing):
        raw = lines[index]
        if ":" not in raw:
            continue
        key = raw.split(":", 1)[0].strip().lower()
        if key in GALLERY_FIELDS:
            new_lines[index] = f"{key}: {values[key]}"
            found.add(key)

    missing = [f"{key}: {values[key]}" for key in GALLERY_FIELDS if key not in found]
    if missing:
        new_lines[closing:closing] = missing

    payload = "\n".join(new_lines)
    if text.endswith("\n"):
        payload += "\n"

    try:
        if source.exists():
            shutil.copy2(source, source.with_name(source.name + ".bak"))
        write_atomic(source, payload)
    except OSError as exc:
        return [f"gagal menyimpan caption.md ({exc})"], warnings

    if not names:
        warnings.append("senarai gambar kini kosong")
    return [], warnings


def simpan_gambar(payload: dict) -> dict:
    slug = text_value(payload, "slug", [])
    if not slug:
        return {
            "ok": False,
            "arahan": "simpan-gambar",
            "ralat": ["slug diperlukan"],
            "amaran": [],
        }
    try:
        folder = program_folder(slug)
    except UrusError as exc:
        return {
            "ok": False,
            "arahan": "simpan-gambar",
            "slug": slug,
            "ralat": [str(exc)],
            "amaran": [],
        }

    errors, warnings = save_gallery(folder, payload.get("gambar"))
    if errors:
        return {
            "ok": False,
            "arahan": "simpan-gambar",
            "slug": slug,
            "ralat": errors,
            "amaran": warnings,
        }

    result = imbas_data(slug)
    result.update(
        {
            "ok": True,
            "arahan": "simpan-gambar",
            "ralat": [],
            "amaran": warnings + result.get("amaran", []),
            "fail": f"program/{slug}/caption.md",
            "sandaran": f"program/{slug}/caption.md.bak",
        }
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arahan", choices=["cipta", "imbas", "simpan-gambar"])
    parser.add_argument("--data", default="-", help="laluan input JSON, atau - untuk stdin")
    parser.add_argument("--slug", help="slug program bagi arahan imbas")
    args = parser.parse_args()

    try:
        if args.arahan == "imbas":
            slug = args.slug or ""
            if not slug:
                payload = read_payload(args.data)
                slug = str(payload.get("slug", ""))
            result = imbas_data(slug)
        else:
            result = (
                cipta(read_payload(args.data))
                if args.arahan == "cipta"
                else simpan_gambar(read_payload(args.data))
            )
    except UrusError as exc:
        result = {"ok": False, "arahan": args.arahan, "ralat": [str(exc)], "amaran": []}
    except Exception as exc:  # noqa: BLE001 - pulangkan ralat kepada API
        result = {
            "ok": False,
            "arahan": args.arahan,
            "ralat": [f"ralat tidak dijangka: {exc}"],
            "amaran": [],
        }

    print(json.dumps(result, ensure_ascii=False))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
