#!/usr/bin/env python3
"""
bina_lokasi.py
Semak dan jana data peta daripada data/database_lokasi_perkim.md.

  python tools/bina_lokasi.py semak              semak sahaja
  python tools/bina_lokasi.py bina               jana data/perkim-network.json (semua kecuali 'ditarik')
  python tools/bina_lokasi.py bina --awam         hanya rekod 'disahkan' (untuk laman awam)

Hanya perpustakaan standard Python. Kod keluar 1 jika ada ralat.
"""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_DEFAULT = ROOT / "data" / "database_lokasi_perkim.md"
JSON_DEFAULT = ROOT / "data" / "perkim-network.json"

JENIS = {"ibu_pejabat", "negeri", "daerah", "antarabangsa", "infra"}
JENIS_MY = {"ibu_pejabat", "negeri", "daerah"}
STATUS = {"draf", "menunggu", "disahkan", "ditarik"}
KATEGORI_INFRA = {"bangunan", "kenderaan", "utiliti", "peralatan", "lain"}
NEGERI = {
    "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
    "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu",
    "Kuala Lumpur", "Putrajaya", "Wilayah Persekutuan Labuan", "Labuan",
}
LIST_KEYS = {"sumber", "sejarah", "kolaborasi"}
KNOWN = {
    "id", "nama", "jenis", "status", "negeri", "negara", "lokasi", "lat", "lon", "alamat",
    "telefon", "peranan", "sejarah", "kolaborasi", "sumber", "disahkan_oleh", "tarikh_sah",
    "semakan_akhir", "induk", "kategori", "butiran",
}
# Kotak sempadan kasar Malaysia (Semenanjung, Sabah, Sarawak)
MY_LAT = (0.8, 7.5)
MY_LON = (99.5, 119.5)
STALE_DAYS = 365

SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TAHUN_ITEM = re.compile(r"^(\d{4})\s*\|\s*(.+)$")

RINGKASAN = {
    "dunia": "Jaringan kolaborasi PERKIM dengan negara luar. Pilih lokasi untuk lihat peranannya.",
    "malaysia": "Cawangan PERKIM di setiap negeri. Pilih lokasi untuk zum dan lihat butirannya.",
}


def parse(text):
    recs = []
    for m in re.finditer(r"^```rekod[^\n]*\n(.*?)^```[ \t]*$", text, re.S | re.M):
        r = {"_baris": text.count("\n", 0, m.start()) + 1, "_ralat": []}
        for raw in m.group(1).splitlines():
            s = raw.strip()
            if not s or s.startswith("#"):
                continue
            if ":" not in s:
                r["_ralat"].append("baris tanpa 'kunci: nilai': " + s)
                continue
            k, v = s.split(":", 1)
            k, v = k.strip().lower(), v.strip()
            if k in LIST_KEYS:
                r.setdefault(k, []).append(v)
            elif k in r:
                r["_ralat"].append("medan berganda: " + k)
            else:
                r[k] = v
        recs.append(r)
    return recs


def num(r, key, lo, hi, errs):
    try:
        v = float(r[key])
    except (KeyError, ValueError):
        errs.append("%s mesti nombor" % key)
        return None
    if not lo <= v <= hi:
        errs.append("%s di luar julat (%s)" % (key, v))
        return None
    return v


def parse_date(s, label, errs):
    try:
        d = date.fromisoformat(s)
    except (ValueError, TypeError):
        errs.append("%s mesti YYYY-MM-DD" % label)
        return None
    if d > date.today():
        errs.append("%s di masa hadapan" % label)
    return d


def validate(recs):
    """Pulangkan (ralat, amaran) sebagai senarai (id, baris, mesej)."""
    E, W = [], []
    ids = {}
    for r in recs:
        rid = r.get("id", "?")
        if rid in ids:
            E.append((rid, r["_baris"], "id berganda (juga baris %d)" % ids[rid]))
        ids[rid] = r["_baris"]
    by_id = {r.get("id"): r for r in recs}
    seen_negeri, seen_coord = {}, {}

    for r in recs:
        rid, ln = r.get("id", "?"), r["_baris"]
        errs, warns = list(r["_ralat"]), []

        for k in ("id", "nama", "jenis", "status"):
            if not r.get(k):
                errs.append("medan wajib tiada: " + k)
        if errs and not r.get("jenis"):
            E.extend((rid, ln, e) for e in errs)
            continue

        if r.get("id") and not SLUG.match(r["id"]):
            errs.append("id mesti huruf kecil/nombor/sengkang")
        jenis, status = r.get("jenis"), r.get("status")
        if jenis not in JENIS:
            errs.append("jenis tidak sah: %s" % jenis)
        if status not in STATUS:
            errs.append("status tidak sah: %s" % status)
        for k in r:
            if k not in KNOWN and not k.startswith("_"):
                warns.append("medan tidak dikenali: " + k)

        # lokasi
        if jenis in JENIS_MY | {"antarabangsa"}:
            lat = num(r, "lat", -90, 90, errs)
            lon = num(r, "lon", -180, 180, errs)
            if lat is not None and lon is not None:
                if jenis in JENIS_MY and not (MY_LAT[0] <= lat <= MY_LAT[1] and MY_LON[0] <= lon <= MY_LON[1]):
                    errs.append("koordinat di luar Malaysia (semak lat/lon tertukar)")
                key = (round(lat, 3), round(lon, 3))
                if key in seen_coord and r.get("status") != "ditarik":
                    warns.append("koordinat sama dengan " + seen_coord[key])
                seen_coord[key] = rid
        if jenis in JENIS_MY:
            if r.get("negeri") not in NEGERI:
                errs.append("negeri tidak sah atau tiada: %s" % r.get("negeri"))
            elif jenis == "negeri" and status != "ditarik":
                if r["negeri"] in seen_negeri:
                    errs.append("negeri '%s' sudah ada rekod negeri: %s" % (r["negeri"], seen_negeri[r["negeri"]]))
                seen_negeri[r["negeri"]] = rid
        if jenis == "antarabangsa":
            if not r.get("negara"):
                errs.append("negara wajib untuk antarabangsa")
            elif r["negara"].strip().lower() == "malaysia":
                errs.append("negara bukan Malaysia untuk jenis antarabangsa")

        # infra
        if jenis == "infra":
            p = by_id.get(r.get("induk"))
            if p is None:
                errs.append("induk tidak wujud: %s" % r.get("induk"))
            elif p.get("jenis") == "infra":
                errs.append("induk tidak boleh jenis infra")
            elif status == "disahkan" and p.get("status") != "disahkan":
                warns.append("induk belum disahkan; infra tidak akan dipaparkan awam")
            if r.get("kategori") not in KATEGORI_INFRA:
                errs.append("kategori infra tidak sah: %s" % r.get("kategori"))
            if not r.get("butiran"):
                errs.append("butiran wajib untuk infra")

        # sejarah / kolaborasi
        for key in ("sejarah", "kolaborasi"):
            for item in r.get(key, []):
                m = TAHUN_ITEM.match(item)
                if not m:
                    errs.append("%s mesti 'tahun | keterangan': %s" % (key, item))
                elif int(m.group(1)) > date.today().year:
                    errs.append("%s tahun di masa hadapan: %s" % (key, item))

        # pengesahan
        if status == "disahkan":
            if not r.get("disahkan_oleh"):
                errs.append("disahkan tanpa disahkan_oleh")
            if not r.get("sumber"):
                errs.append("disahkan tanpa sumber bukti")
            if not r.get("tarikh_sah"):
                errs.append("disahkan tanpa tarikh_sah")
            else:
                parse_date(r["tarikh_sah"], "tarikh_sah", errs)
            if jenis == "antarabangsa" and not r.get("kolaborasi"):
                warns.append("antarabangsa disahkan tanpa butiran kolaborasi")
            sa = r.get("semakan_akhir") or r.get("tarikh_sah")
            if sa:
                try:
                    d = date.fromisoformat(sa)
                    if (date.today() - d).days > STALE_DAYS:
                        warns.append("lebih %d hari sejak semakan terakhir (%s)" % (STALE_DAYS, sa))
                except ValueError:
                    errs.append("semakan_akhir mesti YYYY-MM-DD")
        else:
            if r.get("tarikh_sah") or r.get("disahkan_oleh"):
                warns.append("ada maklumat pengesah tetapi status bukan 'disahkan'")

        E.extend((rid, ln, e) for e in errs)
        W.extend((rid, ln, w) for w in warns)

    hq = [r for r in recs if r.get("jenis") == "ibu_pejabat" and r.get("status") != "ditarik"]
    if len(hq) == 0:
        W.append(("-", 0, "tiada rekod ibu_pejabat"))
    elif len(hq) > 1:
        E.append(("-", 0, "lebih satu ibu_pejabat aktif: " + ", ".join(r["id"] for r in hq)))
    return E, W


def items(lst):
    out = []
    for s in lst or []:
        m = TAHUN_ITEM.match(s)
        if m:
            out.append({"tahun": int(m.group(1)), "teks": m.group(2).strip()})
    return out


def build(recs, awam):
    def included(r):
        s = r.get("status")
        return s == "disahkan" if awam else s != "ditarik"

    pub = {r["id"]: r for r in recs if included(r)}
    lokasi = []
    for r in recs:
        if r["id"] not in pub or r["jenis"] == "infra":
            continue
        infra = [
            {"kategori": i["kategori"], "butiran": i["butiran"]}
            for i in recs
            if i.get("jenis") == "infra" and i.get("induk") == r["id"] and i["id"] in pub
        ]
        entry = {
            "id": r["id"],
            "nama": r["nama"],
            "jenis": r["jenis"],
            "negara": r.get("negara") if r["jenis"] == "antarabangsa" else r.get("lokasi", r.get("negeri", "")),
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "peranan": r.get("peranan", ""),
            "contoh": r["status"] != "disahkan",
        }
        if r.get("alamat"): entry["alamat"] = r["alamat"]
        if r.get("telefon"): entry["telefon"] = r["telefon"]
        if r.get("sejarah"): entry["sejarah"] = items(r["sejarah"])
        if r.get("kolaborasi"): entry["kolaborasi"] = items(r["kolaborasi"])
        if infra: entry["infra"] = infra
        if r["status"] == "disahkan":
            entry["disahkan"] = {"oleh": r["disahkan_oleh"], "tarikh": r["tarikh_sah"]}
        lokasi.append(entry)
    return {"ringkasan": RINGKASAN, "lokasi": lokasi}


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("perintah", choices=["semak", "bina"])
    ap.add_argument("--awam", action="store_true", help="hanya rekod berstatus disahkan")
    ap.add_argument("--md", default=str(MD_DEFAULT))
    ap.add_argument("--keluar", default=str(JSON_DEFAULT))
    a = ap.parse_args()

    recs = parse(Path(a.md).read_text(encoding="utf-8"))
    E, W = validate(recs)

    print("%d rekod dibaca daripada %s" % (len(recs), a.md))
    counts = {}
    for r in recs:
        k = (r.get("jenis", "?"), r.get("status", "?"))
        counts[k] = counts.get(k, 0) + 1
    for (j, s), n in sorted(counts.items()):
        print("  %-13s %-9s %d" % (j, s, n))
    for rid, ln, msg in W:
        print("AMARAN  [%s, baris %s] %s" % (rid, ln, msg))
    for rid, ln, msg in E:
        print("RALAT   [%s, baris %s] %s" % (rid, ln, msg))

    if E:
        print("\n%d ralat. Tiada fail dijana." % len(E))
        sys.exit(1)
    if a.perintah == "bina":
        out = build(recs, a.awam)
        Path(a.keluar).write_text(
            json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
        )
        print("\nDijana %s: %d lokasi (%s)" % (a.keluar, len(out["lokasi"]), "awam" if a.awam else "semua kecuali ditarik"))
    else:
        print("\nSemakan lulus (%d amaran)." % len(W))


if __name__ == "__main__":
    main()
