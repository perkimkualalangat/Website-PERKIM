# Skema Lengkap `caption.md`

## 1. Format fail

`caption.md` mempunyai dua bahagian:

```markdown
---
kunci: nilai
---

Caption penuh program.
```

Fail dibaca sebagai UTF-8. BOM UTF-8 diterima. Baris pertama mesti `---` dan mesti ada
penutup `---`.

Parser ini menyerupai front matter YAML tetapi **bukan parser YAML penuh**:

- satu medan bagi setiap baris;
- format `kunci: nilai`;
- senarai mesti sintaks JSON `[...]`;
- objek mesti sintaks JSON `{...}`;
- rentetan JSON boleh menggunakan petik dua;
- `null` atau `~` menjadi nilai kosong;
- `true`/`false` menjadi boolean;
- nombor bulat dibaca sebagai integer;
- metadata berbilang baris tidak disokong;
- komen bermula `#` pada baris sendiri boleh digunakan.

## 2. Contoh lengkap

```yaml
---
id: ziarah-kebajikan-2027
slug: ziarah-kebajikan-2027
tarikh: 2027-01-20
tajuk: Program Ziarah Kebajikan PERKIM Kuala Langat 2027
kategori: Kebajikan
ringkas: Delegasi PERKIM menziarahi keluarga yang memerlukan sokongan.
lokasi: Kampung Contoh, Kuala Langat
masa: 9.00 pagi – 12.00 tengah hari
kehadiran: 12 sukarelawan · 3 keluarga
laporan: laporan.md
petikan: “Kebajikan menyatukan masyarakat.”
petikan_oleh: Wakil program
sorotan: 3
facebook_url: https://www.facebook.com/example/posts/123456
status: draf
sumber: Facebook PERKIM Kuala Langat dan laporan program
disahkan_oleh: null
disahkan_tarikh: null
gambar: ["poster.jpg", "gambar-01.jpg"]
gambar_alt: ["Poster rasmi program ziarah kebajikan.", "Sukarelawan menyampaikan bantuan kepada penerima."]
gambar_kapsyen: ["Poster rasmi program.", "Penyerahan bantuan."]
---

Caption penuh program diletakkan di sini.
```

## 3. Medan wajib

| Medan | Jenis | Peraturan | Digunakan oleh |
| --- | --- | --- | --- |
| `id` | teks | Slug sah dan unik | Identiti rekod/fallback URL |
| `slug` | teks | Slug sah, unik, sama dengan folder | URL butiran Aktiviti |
| `tarikh` | teks tarikh | `YYYY-MM-DD` | Susunan, kad, ticker, Sorotan |
| `tajuk` | teks | Tidak kosong; disaran <=140 aksara | Semua paparan |
| `kategori` | teks | Tidak kosong | Penapis dan label |
| `ringkas` | teks | Tidak kosong; disaran <=400 aksara | Kad dan lead Sorotan |
| `facebook_url` | URL | HTTPS pada `facebook.com` | Pautan sumber/ticker |
| `status` | enum | `draf`, `disahkan`, `ditarik` | Keterlihatan dan label |
| `sumber` | teks | Tidak kosong | Nota sumber Aktiviti |

Caption selepas metadata juga wajib dan mesti mengandungi teks.

## 4. Medan pilihan umum

| Medan | Jenis | Nilai kosong | Catatan |
| --- | --- | --- | --- |
| `lokasi` | teks | `null` | Dipaparkan pada kad/butiran dan Sorotan |
| `masa` | teks | `null` | Dipaparkan pada fakta Sorotan |
| `kehadiran` | teks | `null` | Dipaparkan pada fakta Sorotan |
| `laporan` | teks laluan | `null` | Fail `.md` dalam folder program |
| `petikan` | teks | `null` | Blok petikan Sorotan |
| `petikan_oleh` | teks | `null` | Kredit petikan; amaran jika petikan tiada |
| `sorotan` | integer | `null` | Integer positif unik |

Jangan gunakan rentetan kosong. Pilih teks bukan kosong atau `null`.

## 5. Medan pengesahan

| Medan | Untuk draf/ditarik | Untuk disahkan |
| --- | --- | --- |
| `disahkan_oleh` | mesti `null` | peranan/jawatan bukan kosong |
| `disahkan_tarikh` | mesti `null` | `YYYY-MM-DD`, bukan tarikh masa depan |

Amalan projek: gunakan jawatan/peranan, bukan nama peribadi, jika polisi organisasi
memerlukannya.

Contoh:

```yaml
status: disahkan
disahkan_oleh: Setiausaha PERKIM Kuala Langat
disahkan_tarikh: 2027-01-22
```

## 6. Medan gambar

Ketiga-tiga medan menggunakan senarai JSON:

```yaml
gambar: ["gambar-01.jpg", "gambar-02.jpg"]
gambar_alt: ["Penerangan gambar pertama.", "Penerangan gambar kedua."]
gambar_kapsyen: ["Sesi pembukaan.", null]
```

Peraturan:

- `gambar_alt` mesti sama bilangan dengan `gambar`;
- setiap alt mesti teks bukan kosong;
- `gambar_kapsyen` boleh `[]` atau sama bilangan dengan `gambar`;
- setiap kapsyen boleh teks atau `null`;
- fail mesti wujud dalam folder program;
- format: JPG/JPEG, PNG, WebP atau AVIF;
- laluan mutlak dan `..` dilarang;
- gambar dalam folder tetapi tidak disenaraikan menghasilkan amaran.

Program tanpa gambar:

```yaml
gambar: []
gambar_alt: []
gambar_kapsyen: []
```

Program tanpa gambar masih boleh berada di Aktiviti tetapi tidak layak menjadi Sorotan.

## 7. Medan yang tidak dikenali

Medan di luar skema menghasilkan amaran dan tidak dimasukkan ke JSON. Jika medan baharu
diperlukan, kemas kini penjana, validator, template, paparan dan dokumentasi secara serentak.

## 8. Hasil dalam JSON

Penjana menukar data sumber kepada bentuk berikut:

```json
{
  "id": "ziarah-kebajikan-2027",
  "slug": "ziarah-kebajikan-2027",
  "tarikh": "2027-01-20",
  "tajuk": "Program Ziarah Kebajikan PERKIM Kuala Langat 2027",
  "kategori": "Kebajikan",
  "ringkas": "...",
  "caption": "...",
  "lokasi": "...",
  "masa": "...",
  "kehadiran": "...",
  "laporan": "program/ziarah-kebajikan-2027/laporan.md",
  "petikan": null,
  "petikan_oleh": null,
  "sorotan": 3,
  "facebook_url": "https://www.facebook.com/...",
  "gambar": [{"src": "program/.../gambar-01.jpg", "alt": "...", "kapsyen": null}],
  "status": "draf",
  "sumber": "...",
  "disahkan": {"oleh": null, "tarikh": null}
}
```
