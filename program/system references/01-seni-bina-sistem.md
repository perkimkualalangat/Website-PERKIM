# Seni Bina Sistem Program

## 1. Tujuan

Sistem program menukar kandungan yang disusun secara manual kepada satu set paparan statik
yang boleh digunakan tanpa pangkalan data pelayan, API Facebook atau rangka kerja JavaScript.
Semua data diterbitkan sebagai fail dalam repositori.

## 2. Lapisan sistem

### 2.1 Lapisan sumber

Setiap program berada di:

```text
program/<slug>/
```

Sumber minimum ialah `caption.md`. Folder yang sama boleh mengandungi gambar dan
`laporan.md`.

### 2.2 Lapisan binaan

`tools/bina_aktiviti.py`:

1. mengimbas subfolder program;
2. membaca metadata dan caption;
3. mengesahkan medan, gambar dan laporan;
4. menolak rekod yang tidak sah;
5. mengecualikan status `ditarik`;
6. menyusun rekod mengikut tarikh menurun;
7. menulis `data/aktiviti.json`.

### 2.3 Lapisan validasi

- `tools/bina_aktiviti.py --semak` membina rekod dalam memori dan membandingkannya dengan
  JSON sedia ada.
- `tools/check-aktiviti.py` menyemak struktur fail JSON yang telah dijana.
- `tools/check-site.py` memanggil kedua-duanya serta menyemak HTML, CSS, JSON, pautan dan
  aset tempatan.

### 2.4 Lapisan paparan

| Komponen | Fail utama | Rekod yang digunakan |
| --- | --- | --- |
| Arkib Aktiviti | `pages/aktiviti.html`, `js/modules/aktiviti.js` | Semua kecuali `ditarik` |
| Butiran Aktiviti | `pages/aktiviti.html?slug=<slug>` | Rekod slug sepadan |
| Sorotan Program | `index.html`, `js/modules/sorotan.js` | `sorotan` positif + sekurang-kurangnya satu gambar |
| Aktiviti terkini | `js/modules/aktiviti.js` | Tiga rekod `disahkan` terkini |
| Carian | `js/modules/search.js` | Semua kecuali `ditarik` |
| Ticker | `js/modules/ticker.js` | `disahkan` + URL Facebook yang sah |

### 2.5 Lapisan gaya

- `css/aktiviti.css` mengawal grid kad, status, butiran dan galeri Aktiviti.
- `css/sorotan.css` mengawal kad fakta, pemilih program, panel butiran dan slideshow
  bertindan.
- `css/style.css` mengimport helaian gaya komponen laman.

## 3. Aliran data hujung-ke-hujung

```text
caption.md
  |- metadata satu baris
  `- caption penuh selepas ---
          |
          v
parse_caption()
          |
          v
build_record()
  |- normalisasi laluan gambar
  |- normalisasi laluan laporan
  |- bina objek disahkan
  `- bina galeri [{src, alt, kapsyen}]
          |
          v
collect()
  |- semak id/slug/sorotan berulang
  |- buang rekod ditarik
  `- susun tarikh menurun
          |
          v
data/aktiviti.json
          |
          v
fetch melalui getJSON() -> render DOM dengan data selamat
```

## 4. Sumber kebenaran

Urutan autoriti ialah:

1. bukti/sumber program dan pengesahan cawangan;
2. `program/<slug>/caption.md`, gambar dan laporan;
3. `data/aktiviti.json` yang dijana;
4. DOM yang dirender dalam pelayar.

JSON dan HTML dinamik bukan tempat mengedit fakta program. Pembetulan mesti bermula di
folder program, kemudian JSON dijana semula.

## 5. Model keselamatan

- Nilai teks Aktiviti dimasukkan melalui fungsi `esc()` sebelum `innerHTML`.
- Sorotan menggunakan `textContent` untuk data program.
- URL Facebook diperiksa sebagai HTTPS pada domain `facebook.com`.
- Laluan gambar dan laporan mesti relatif dan tidak boleh mengandungi `..`.
- Gambar mesti berada di dalam folder program semasa penjanaan.
- Caption tidak dirender sebagai HTML atau Markdown aktif.

## 6. Ketahanan tanpa JavaScript

`index.html` mengandungi fallback statik Sorotan pertama. Apabila JavaScript berjaya memuat
JSON, fallback itu diganti dengan data janaan. Halaman Aktiviti pula memerlukan JavaScript dan
menyediakan mesej `<noscript>`.

## 7. Had seni bina semasa

- Tiada CMS atau borang pentadbir.
- Tiada pemproses Markdown untuk `laporan.md`; pautan membuka fail Markdown secara terus.
- Tiada pengoptimum imej automatik.
- Sorotan memaparkan semua rekod bernombor; terlalu banyak nombor boleh memenuhi ruang.
- Medan masa dan kehadiran digunakan oleh Sorotan tetapi belum dipaparkan pada butiran
  halaman Aktiviti.
- Tiada workflow GitHub dalam `.github/`; proses penerbitan bergantung pada tetapan hosting
  repositori.

## 8. Prinsip sambungan

Apabila menambah medan baharu:

1. tambah medan kepada `KNOWN` dalam penjana;
2. sahkan jenis dan nilai;
3. masukkan ke objek `record`;
4. tambah semakan setara pada `check-aktiviti.py`;
5. kemas kini template;
6. kemas kini modul paparan yang memerlukannya;
7. tambah dokumentasi dan ujian regresi.
