# PERKIM Kuala Langat — laman draf

Laman draf dalaman untuk semakan pihak cawangan. Dibina daripada templat projek MADANI, dengan
branding, menu dan kandungan baharu.

> **Bukan laman rasmi.** Tiada kelulusan penerbitan. Logo rasmi digunakan dalam konteks draf
> dalaman dan tertakluk pada kebenaran PERKIM. Semua halaman mempunyai `noindex, nofollow`.
> Jangan kongsikan pautan secara terbuka sehingga pengesahan diperoleh.

**Kemas kini 30 Oktober 2026:** header/footer dibina semula mengikut struktur laman
<https://www.perkim.net.my> — topbar, masthead logo + wordmark tiga baris, navigasi gelap,
carian, dan footer empat kolum. Data hubungan dan media sosial kini berpusat dalam
`data/site.json`.

**Kemas kini 2 November 2026:** halaman Aktiviti Cawangan ditambah sebagai arkib berkurasi
untuk laporan yang asalnya diterbitkan di Facebook. Setiap program disimpan dalam
`program/<slug>/` bersama `caption.md` dan gambarnya; `data/aktiviti.json` dijana daripada
sumber tersebut.

**Kemas kini 4 November 2026:** halaman **Tetapan** tempatan ditambah untuk mencipta program,
mengimport gambar dan menjana semula `data/aktiviti.json` tanpa perlu menaip arahan Python.
Menu Tetapan dalam dropdown **Lain-lain** hanya muncul pada `localhost`/`127.0.0.1`;
GitHub Pages kekal baca sahaja.

---

## 1. Entiti yang digunakan

Laman ini dibina untuk **PERKIM Cawangan Kuala Langat**, berdasarkan data kepimpinan dan alamat
yang diberikan. Ia **bukan** laman PERKIM Negeri Selangor.

Jika yang dimaksudkan ialah peringkat negeri, struktur jawatan dan kandungannya berbeza — jangan
gunakan data Kuala Langat untuk laman negeri tanpa pengesahan.

---

## 1a. Logo & warna

Logo rasmi PERKIM digunakan dalam header sebagai badge bulatan putih, dan sebagai favicon.

| Fail | Saiz | Kegunaan |
| --- | --- | --- |
| `assets/img/logo-perkim.png` | 802×850 | Sumber penuh |
| `assets/img/logo-perkim-512.png` | 512² | Penggunaan umum |
| `assets/img/logo-perkim-180.png` | 180² | `apple-touch-icon` |
| `assets/img/logo-perkim-128.png` | 128² | Header (dipaparkan 46px) |
| `assets/img/logo-perkim-64.png` | 64² | Favicon |

Fail yang diterima bernama `.png` tetapi sebenarnya **JPEG** berlatar putih. Ia telah
dikonversikan kepada PNG sebenar. Jana semula saiz dengan:

```powershell
python tools/prepare-logo.py
```

Warna tema diambil daripada logo: hijau `#28903b` dan kuning `#fff500`. Untuk teks putih pada
butang dan header, hijau digelapkan sedikit (`#1f7a34`, `#237a35`) supaya kontras memenuhi
WCAG AA. Kuning UI `#f2d600` digunakan untuk lencana dan garis aksen.

> **Cap dagangan.** Logo ialah lambang rasmi PERKIM. Penggunaan untuk latihan tempatan tidak
> menjadi masalah, tetapi penerbitan awam memerlukan kebenaran bertulis daripada
> <info@perkim.net.my>. Jangan gunakan logo pada laman yang kelihatan rasmi tetapi bukan milik
> PERKIM.

### Media sosial cawangan

| Saluran | Pautan |
| --- | --- |
| Facebook | <https://www.facebook.com/share/16Yvm8zzpv/?mibextid=wwXIfr> |
| Instagram | <https://www.instagram.com/perkimkualalangat> |
| YouTube | <https://youtube.com/@perkimkualalangat> |
| WhatsApp | <https://wa.me/60163536126> |
| Linktree | <https://linktr.ee/PERKIMKualaLangat> |

TikTok rasmi cawangan belum ditemui. Pautan TikTok dalam laman menjurus ke akaun
**PERKIM Kebangsaan** dan dilabel sedemikian. Kemas kini `data/site.json` apabila akaun
cawangan tersedia.

---

## 2. Jalankan projek

Cara paling mudah: **klik dua kali `start.bat`**. Pelayan akan bermula pada port 8081 dan
pelayar terbuka sendiri. Tekan `Ctrl+C` dalam tetingkap itu untuk berhenti.

```bat
start.bat            :: port 8081, buka pelayar
start.bat 8090       :: guna port lain
start.bat --no-open  :: jangan buka pelayar
```

`start.bat` menggunakan Node.js (`tools/serve.mjs`) jika ada, dan jatuh balik kepada Python
jika Node tiada. `tools/serve.mjs` menyokong `Range` (perlu untuk pembaca PDF), menetapkan
`Content-Type` yang betul untuk `.pdf`, `.mjs`, `.woff2` dan sebagainya, dan menyediakan API
Tetapan. Pelayan hanya mendengar pada `127.0.0.1` supaya alat pentadbiran tidak terdedah kepada
rangkaian. Jika Python tersedia, `start.bat` menjalankan `tools/bina_aktiviti.py` sebelum
pelayan dibuka supaya folder program dan `data/aktiviti.json` sentiasa segerak. Jika penjanaan
gagal, pelayan tetap dimulakan dan ralat boleh dilihat di halaman Tetapan.

> Halaman **Tetapan** memerlukan Node.js kerana API `/api/tetapan/*` hanya ada dalam
> `tools/serve.mjs`. Jika `start.bat` jatuh balik kepada Python, halaman Tetapan membuka dalam
> mod baca sahaja.

Secara manual:

```powershell
cd "C:\Users\user\Downloads\Website Madani\perkim-kuala-langat"
node tools\serve.mjs 8081
# atau, jika Node tiada:
python -m http.server 8081
```

Kemudian buka <http://localhost:8081>. Jangan buka `index.html` terus dari cakera (`file://`)
— modul JavaScript, `fetch('/data/...')` dan PDF.js tidak akan berfungsi.

Jangan jalankan pelayan dari folder induk (`Website Madani`) — laluan `/css/style.css` akan
menunjuk ke projek MADANI, bukan projek ini.

---

## 3. Struktur

```
perkim-web/
├── start.bat                   Pelayan pralihat (Node atau Python)
├── index.html                  Utama + status laman
├── pages/
│   ├── tentang.html            Profil cawangan (placeholder)
│   ├── latar-belakang.html     PERKIM Kebangsaan: sejarah, visi, teras
│   ├── kepimpinan.html         Jadual jawatan + status pengesahan
│   ├── berita.html             Indeks berita (tajuk + pautan sahaja)
│   ├── aktiviti.html           Laporan program cawangan daripada Facebook
│   ├── bahan-bacaan.html       Rak buku PDF
│   ├── jaringan.html           Peta dunia cawangan & jaringan antarabangsa
│   ├── hubungi.html            Alamat, e-mel, borang draf
│   └── tetapan.html            Alat tempatan: cipta program, import gambar, jana data
├── css/
│   ├── style.css               Import semua CSS
│   ├── variables.css           Tema hijau/emas (warna draf, bukan rasmi)
│   ├── motion.css              Token gerakan + utiliti .m-tactile/.m-focus/.m-rise
│   ├── base.css, layout.css, components.css
│   ├── masa-solat.css          Dwikalendar + bar waktu solat responsif
│   ├── mapbtn.css              Butang "Buka Google Maps" + pratonton peta
│   ├── aktiviti.css            Kad, penapis dan butiran laporan aktiviti
│   ├── kepimpinan.css          Kad jawatan & status
│   ├── library.css             Rak buku + pembaca PDF
│   ├── ascii-globe.css         Gaya peta bumi ASCII
│   ├── tetapan.css             Gaya halaman Tetapan (panel, tab, galeri)
│   └── vendor/flippy.css       Gaya enjin flippy-pdf
├── js/
│   ├── main.js
│   ├── modules/
│   │   ├── components.js       Topbar, masthead, nav (split button), footer
│   │   ├── nav.js              Menu mudah alih & submenu dropdown
│   │   ├── ticker.js           Pemutar berita rawak di topbar (prev/next)
│   │   ├── mapbtn.js           Butang peta: 7 keadaan + pratonton OSM
│   │   ├── masa-solat-ui.js    Dwikalendar + bar waktu solat semua halaman
│   │   ├── search.js           Carian halaman + bahan bacaan
│   │   ├── kepimpinan.js       Render jawatan daripada JSON
│   │   ├── perkim.js           Render maklumat kebangsaan
│   │   ├── berita.js           Indeks berita + penapis
│   │   ├── aktiviti.js         Senarai, butiran dan aktiviti terkini
│   │   ├── tetapan.js          Alat tempatan: cipta program + import gambar
│   │   ├── forms.js            Borang draf
│   │   ├── library/library.js  Rak buku
│   │   ├── library/engine-flippy.js
│   │   └── utils.js
│   ├── ascii-globe.js          Komponen peta (canvas, penanda, panel)
│   ├── ascii-globe-land.js     Data darat Natural Earth (dimuat dahulu)
│   └── vendor/                 flippy-pdf + PDF.js (MIT/Apache-2.0)
├── dev/
│   ├── motion-lab.html         Makmal gerakan (dalaman, noindex, tiada dalam nav)
│   └── web-api-module.html     Makmal masa, Hijrah dan waktu solat
├── web-api-module/
│   ├── index.js                API awam modul masa, kalendar dan waktu solat
│   ├── modules/                Masa Malaysia, kalendar dan orkestrasi solat
│   ├── providers/              Penyesuai e-Solat + fallback setempat
│   ├── data/                   Jadual tahunan SGR03 yang dijana
│   ├── scripts/                Penjana semula fallback tahunan
│   └── tests/                  Ujian unit tanpa kebergantungan luar
├── program/
│   ├── README.md               Aliran menambah program
│   ├── _template/caption.md    Templat metadata + caption penuh
│   └── <slug>/                 Satu subfolder bagi setiap program dan gambarnya
├── data/
│   ├── site.json               Alamat, telefon, waktu, media sosial
│   ├── search-index.json       Indeks carian
│   ├── motion.json             Inventori 35 komponen gerakan
│   ├── kepimpinan.json         Satu-satunya sumber nama & jawatan
│   ├── perkim.json             Maklumat PERKIM Kebangsaan
│   ├── sitemap.json            Struktur menu laman rasmi
│   ├── berita.json             Indeks 17 berita terpilih
│   ├── aktiviti.json           Dijana daripada program/*/caption.md
│   ├── books.json              Buku teks (5 kumpulan, 14 buku)
│   ├── database_lokasi_perkim.md  Sumber tunggal lokasi (sunting di sini)
│   └── perkim-network.json     Dijana oleh bina_lokasi.py (jangan sunting)
├── assets/
│   ├── img/                    Logo PERKIM (512/180/128/64/sumber)
│   ├── icons/favicon.svg       Ikon draf lama (tidak digunakan)
│   ├── fonts/                  Inter + Amiri (OFL, woff2)
│   └── books/                  PDF + kulit buku
│       ├── kelas-perkim/       14 buku teks PERKIM Kebangsaan
│       └── covers/             Kulit buku (jana daripada halaman 1 PDF)
└── tools/
    ├── serve.mjs               Pelayan statik tempatan + API /api/tetapan/*
    ├── check-motion.mjs        Audit inventori gerakan + fallback
    ├── generate-book.py        Jana semula PDF/kulit
    ├── prepare-logo.py         Jana saiz logo daripada sumber
    ├── create-letter.py        Jana surat DOCX
    ├── scrape_perkim.py        Ambil kandungan laman rasmi
    ├── bina_lokasi.py          Semak & jana peta daripada database_lokasi_perkim.md
    ├── bina_aktiviti.py        Jana aktiviti daripada folder program
    ├── urus_program.py         Cipta program, imbas gambar, simpan senarai gambar
    ├── check-aktiviti.py       Semak struktur, sumber dan imej aktiviti
    └── check-site.py           Semak pautan, aset, JSON, tag
```

> Arkib penuh (`data/perkim/`) dan surat dalaman (`surat/`) **tidak** disalin ke folder aktif
> ini. Kedua-duanya kekal dalam `_archive/perkim-kuala-langat/` supaya tidak terdedah semasa
> ujian pelayan.

---

## 3a. Pangkalan data lokasi & peta jaringan

Sumber tunggal lokasi ialah `data/database_lokasi_perkim.md`. Jangan sunting
`data/perkim-network.json` secara manual — fail itu dijana semula.

```powershell
python tools/bina_lokasi.py semak          # semak sahaja
python tools/bina_lokasi.py bina           # jana untuk ujian (kecuali "ditarik")
python tools/bina_lokasi.py bina --awam    # jana untuk laman awam (hanya "disahkan")
```

Setiap rekod ialah blok ` ```rekod ` dengan baris `kunci: nilai`. Jenis yang diterima:
`ibu_pejabat`, `negeri`, `daerah`, `antarabangsa` dan `infra` (paut ke cawangan melalui
`induk`). Sejarah dan kolaborasi ditulis sebagai `tahun | keterangan`.

Status bergerak `draf` → `menunggu` → `disahkan`, dan `ditarik` apabila tidak lagi sah.
Rekod hanya boleh `disahkan` jika ada `disahkan_oleh`, `tarikh_sah` dan sekurang-kurangnya
satu `sumber`. Dalam mod ujian, rekod belum disahkan ditanda `contoh: true`; pada laman
awam gunakan `--awam`. Komponen peta juga menyokong `data-hide-contoh` untuk menyembunyikan
entri contoh tanpa menjana semula JSON.

---

## 4. Mengemas kini kepimpinan

Semua nama berada dalam `data/kepimpinan.json`. Setiap baris mempunyai `status`:

- `"disahkan"` — nama dipaparkan dengan badge **Disahkan**.
- `"menunggu"` — nama **tidak** dipaparkan; kad menunjukkan **Menunggu pengesahan**.

```json
{
  "jawatan": "Timbalan Pengerusi 2",
  "nama": null,
  "status": "menunggu",
  "nota": "Ditetapkan dalam Mesyuarat Agung/AJK."
}
```

Selepas menerima pengesahan bertulis, isi `nama` dan tukar `status` kepada `"disahkan"`.
Jangan letak nama dalam medan `nota`.

Ringkasan “x disahkan / y menunggu” dikira secara automatik daripada fail ini.

### Perkara yang belum disahkan

- Nama Timbalan Pengerusi 2.
- Sama ada jawatan Naib Pengerusi wujud berasingan daripada Timbalan Pengerusi.
- 11 AJK Cawangan Utama dan 3 AJK Sayap Belia.
- Akaun TikTok rasmi cawangan.
- Teks profil/visi/misi.
- Kebenaran penggunaan nama dan logo.

Tuan Hamdan bin Yaacob dan Tuan Salim Yusof dipaparkan sebagai **AJK Kanan**, bukan Naib
Pengerusi, mengikut rekod dalaman.

> **Percanggahan rekod pihak ketiga.** Ringkasan Google Business/AI Overview menyebut
> `Tuan Haji Mohd Yunus Mansur` (Pengerusi) dan `Tuan Haji Abidin Basri` (Setiausaha). Rekod
> Linktree rasmi cawangan masih menyenaraikan **Cik Puan Faridah Hanim** sebagai Setiausaha
> Kehormat. Jangan gantikan rekod 2026–2028 berdasarkan ringkasan pihak ketiga; dapatkan
> pengesahan bertulis daripada cawangan.

### Maklumat hubungan

Semua alamat, telefon, e-mel, waktu dan media sosial berada dalam `data/site.json`. Ini
menjadi satu-satunya sumber untuk topbar, masthead dan footer:

```json
{
  "hubungi": {
    "alamat": ["Lot 2029, Jalan Haji Darini, Lorong 4,", "Kampung Sungai Lang Baru,", "42700 Banting, Selangor"],
    "telefon": "016-353 6126",
    "telefon_href": "+60163536126",
    "emel": "perkimkualalangat@gmail.com",
    "waktu": "Isnin–Khamis: 10:00 pagi – 4:00 petang"
  }
}
```

Waktu pejabat penuh (sumber: Google Business Profile, disemak 30 Oktober 2026):

| Hari | Waktu |
| --- | --- |
| Isnin – Khamis | 10:00 pagi – 4:00 petang |
| Jumaat | 9:00 pagi – 12:00 tengah hari |
| Sabtu & Ahad | Tutup |

Jika waktu di Google Business berubah, kemas kini `waktu`, `waktu_nota` dan `waktu_penuh`
dalam `data/site.json`, kemudian `index.html`, `pages/hubungi.html` dan `pages/tentang.html`.

Kemas kini fail ini sahaja; tidak perlu menyunting setiap halaman. Jika medan `nota` TikTok
dikosongkan, nota “akaun kebangsaan” di footer akan hilang secara automatik.

> **Alamat lama (disahkan).** `Lot 2176, Jalan Haji Idris, Kampung Jenjarom, 42600 Banting`
> ialah alamat lama cawangan dan **tidak lagi digunakan** — disahkan oleh pihak cawangan pada
> 30 Oktober 2026. Ia masih muncul dalam beberapa direktori pihak ketiga (contohnya InfaqPay)
> yang belum dikemas kini. Alamat rasmi yang digunakan di laman ini ialah
> `Lot 2029, Jalan Haji Darini, Lorong 4, Kampung Sungai Lang Baru, 42700 Banting`.
> Jangan tukar semula kepada alamat Jenjarom jika direktori lama ditemui.

---

## 5. PERKIM Kebangsaan & arkib berita

Halaman `pages/latar-belakang.html` memaparkan maklumat peringkat kebangsaan daripada
`data/perkim.json` — sejarah, visi, misi, lima teras, struktur, ibu pejabat dan pautan bahagian.
Halaman ini **bukan** profil cawangan; ia disediakan sebagai rujukan konteks.

Halaman `pages/berita.html` memaparkan 17 tajuk terpilih daripada `data/berita.json`. Hanya
tajuk, tarikh, kategori dan pautan disimpan; teks penuh tidak disalin.

### Mengambil arkib penuh

```powershell
python tools/scrape_perkim.py --dry-run   # uji sambungan
python tools/scrape_perkim.py             # ambil semua
```

Skrip menggunakan WordPress REST API, menghormati `robots.txt` dan berjeda 1.5 saat. Hasil
(sehingga 2026-10-30):

| Fail | Kandungan |
| --- | --- |
| `data/perkim/posts.json` | 263 artikel, 2006–2026, teks penuh |
| `data/perkim/pages.json` | 109 halaman, teks penuh |
| `data/perkim/videos.json` | 12 ID video YouTube |
| `data/perkim/ringkasan.json` | Ringkasan untuk halaman Berita |

**Amaran:** teks penuh ialah hak cipta PERKIM. Folder aktif ini **tidak** mengandungi
`data/perkim/`; arkib penuh kekal dalam `_archive/perkim-kuala-langat/data/perkim/`. Jangan
salin folder itu ke hosting awam dan jangan salin teks ke halaman laman.

---

## 5a. Aktiviti Cawangan daripada Facebook

`pages/aktiviti.html` ialah halaman berasingan daripada Berita Kebangsaan. Ia membaca fail
janaan `data/aktiviti.json`, menyediakan penapis kategori dan menggunakan URL
`pages/aktiviti.html?slug=<slug>` untuk paparan caption penuh serta galeri. Halaman utama
memaparkan program yang diberi nombor `sorotan` dalam bahagian Sorotan Program; halaman
Aktiviti turut memaparkan rekod `draf` dengan lencana yang jelas. Rekod `ditarik` tidak
dimasukkan ke JSON janaan. Modul carian menggabungkan rekod aktiviti secara automatik dengan
`data/search-index.json`.

Facebook kekal sebagai sumber asal. Laman ini tidak menggunakan scraping, embed langsung,
API atau token Facebook. Caption penuh hanya disimpan untuk post milik cawangan dan semua
gambar memerlukan kebenaran yang sesuai.

### Struktur satu program

```text
program/slug-program/
|-- caption.md
|-- gambar-01.jpg
`-- gambar-02.jpg
```

Salin `program/_template/` untuk memulakan rekod. `caption.md` mengandungi metadata di antara
dua baris `---`, kemudian caption penuh di bawahnya:

```markdown
---
id: slug-program
slug: slug-program
tarikh: 2026-11-02
tajuk: Tajuk program yang telah disemak
kategori: Kebajikan
ringkas: Ringkasan pendek untuk kad aktiviti.
lokasi: null
masa: null
kehadiran: null
laporan: null
petikan: null
petikan_oleh: null
sorotan: null
facebook_url: https://www.facebook.com/.../posts/...
status: draf
sumber: Facebook PERKIM Kuala Langat
disahkan_oleh: null
disahkan_tarikh: null
gambar: ["gambar-01.jpg", "gambar-02.jpg"]
gambar_alt: ["Penerangan gambar pertama", "Penerangan gambar kedua"]
gambar_kapsyen: [null, null]
---

Caption lengkap post Facebook diletakkan di sini.
```

Nama folder mesti sama dengan `slug`. Susunan `gambar_alt` mesti sepadan dengan `gambar`;
`gambar_kapsyen` boleh kosong atau mempunyai bilangan item yang sama. Caption dipaparkan
sebagai teks selamat dengan pecahan baris asal, bukan sebagai HTML.

Medan `masa`, `kehadiran`, `laporan`, `petikan` dan `petikan_oleh` mengisi kad Sorotan
Program di halaman utama. `laporan` ialah laluan relatif kepada fail Markdown dalam folder
program. `sorotan` ialah nombor unik; program bernombor dipaparkan dalam pemilih `01`, `02`
dan seterusnya, dan nombor yang dipilih menentukan set gambar slaid. Biarkan `null` jika
program tidak perlu dipaparkan sebagai sorotan.

Aliran kemas kini:

1. Salin `_template`, namakan folder mengikut slug dan masukkan URL post Facebook kanonik.
2. Letakkan caption penuh, ringkasan, tarikh, masa, kehadiran dan lokasi tanpa mereka
   maklumat. Isi `laporan` jika fail laporan disimpan dalam folder program.
3. Letakkan gambar yang dibenarkan dalam folder program yang sama dan lengkapkan teks
   alternatif. Jangan guna gambar kanak-kanak atau individu rentan tanpa kebenaran.
4. Kekalkan `status: draf`, `disahkan_oleh: null` dan `disahkan_tarikh: null` semasa semakan.
5. Jana dan semak laman:

```powershell
python tools\bina_aktiviti.py
python tools\check-site.py
```

6. Tukar kepada `disahkan` hanya selepas mengisi peranan pengesah dan tarikh sebenar. Jangan
   gunakan nama peribadi sebagai pengesah.

Jangan sunting `data/aktiviti.json` secara manual. `check-site.py` menjalankan
`bina_aktiviti.py --semak` dan `check-aktiviti.py`, termasuk memastikan JSON segerak dengan
folder sumber. URL `/share/` menghasilkan amaran supaya diganti dengan URL post kanonik.

---

## 5b. Halaman Tetapan tempatan

Halaman `pages/tetapan.html` menyediakan aliran tanpa terminal untuk kerja harian program:

1. **Program** — senarai semua folder yang dibaca penjana, dengan status, bilangan gambar,
   nombor sorotan serta ralat atau amaran.
2. **Cipta Program** — mencipta `program/<slug>/caption.md` dengan metadata asas, status
   `draf` dan sumber lalai `Facebook PERKIM Kuala Langat`.
3. **Import Gambar** — muat naik atau seret gambar ke dalam folder program, imbas fail yang
   sudah ada, isi alt text dan kapsyen, susun urutan, kemudian simpan senarai ke `caption.md`.

Butang **Kemaskini Program** menjalankan `tools/bina_aktiviti.py` dan menulis semula
`data/aktiviti.json` secara atomik. Butang **Semak Tapak** menjalankan `tools/check-site.py`.

### Syarat dan batasan

- Item **Tetapan** dalam dropdown **Lain-lain** hanya dijana apabila hos ialah `localhost`
  atau `127.0.0.1`. Di hos lain halaman memaparkan mod baca sahaja dan tidak memanggil API.
- API `/api/tetapan/*` hanya wujud dalam `tools/serve.mjs`. Pelayan mesti dimulakan dengan
  `start.bat` (Node.js) dan hanya mendengar pada `127.0.0.1`.
- Permintaan POST mesti datang daripada origin pelayan yang sama. Unggahan gambar dihadkan
  kepada 30 MB setiap fail dan hanya JPG, PNG, WebP atau AVIF yang sah dari segi magic bytes.
- Alt text wajib untuk setiap gambar. Gambar pertama dalam senarai menjadi gambar kad
  Aktiviti dan slaid pertama Sorotan.
- Muat naik menyimpan fail ke `program/<slug>/` menggunakan nama fail yang dibersihkan dan
  unik. Fail sedia ada tidak ditimpa.
- `caption.md` disandarkan sebagai `caption.md.bak` sebelum senarai gambar disimpan.
- Halaman ini tidak diterbitkan sebagai alat awam. GitHub Pages kekal baca sahaja kerana
  tiada Python, Node atau akses tulis.

### Aliran kerja

1. Jalankan `start.bat` dan buka `http://127.0.0.1:8081/pages/tetapan.html`.
2. Cipta program dalam tab **Cipta Program**.
3. Pilih program dalam tab **Import Gambar**, muat naik gambar dan isi alt text.
4. Tekan **Simpan Senarai Gambar**.
5. Tekan **Kemaskini Program** untuk menjana `data/aktiviti.json`.
6. Semak halaman Aktiviti dan Sorotan sebelum menukar status kepada `disahkan`.

Jika perlu bekerja tanpa pelayar, arahan CLI yang setara ialah:

```powershell
python tools\urus_program.py cipta --data payload.json
python tools\urus_program.py imbas --slug slug-program
python tools\urus_program.py simpan-gambar --data galeri.json
python tools\bina_aktiviti.py
```

---

## 6. Bahan bacaan PDF

Rak buku menggunakan `flippy-pdf` + PDF.js yang dihoskan sendiri dalam `js/vendor/`.

**Kandungan semasa:** *Buku Teks Kelas Pengajian Islam PERKIM Kebangsaan* — 14 buku dalam
lima kumpulan, disalin ke `assets/books/kelas-perkim/`:

| Kumpulan | Buku |
| --- | --- |
| Bimbingan Asas Fardhu ‘Ain | 1 |
| Kelas Pra Asas | 1 |
| Kelas Asas | Akhlak, Akidah, Fekah, Sirah |
| Kelas Pertengahan | Akhlak, Akidah, Fekah, Sirah |
| Kelas Lanjutan | Akhlak, Akidah, Fekah, Sirah |

`data/books.json` menyimpan struktur berkumpulan:

```json
{
  "tajuk": "Buku Teks Kelas Pengajian Islam PERKIM",
  "sumber": "PERKIM Kebangsaan · Edisi Pertama",
  "kumpulan": [
    {
      "id": "asas",
      "tajuk": "Kelas Asas",
      "keterangan": "Empat subjek teras pada tahap permulaan.",
      "buku": [
        {
          "id": "asas-akhlak",
          "tajuk": "Akhlak — Tahap Asas",
          "keterangan": "66 halaman · Edisi Pertama",
          "cover": "/assets/books/covers/asas-akhlak.jpg",
          "pdf": "/assets/books/kelas-perkim/asas-akhlak.pdf"
        }
      ]
    }
  ]
}
```

`library.js` juga menerima senarai rata lama (`[ { ...buku } ]`) dan akan memaparkannya sebagai
satu kumpulan. Setiap kumpulan dirender sebagai `<section class="book-group">` dengan tajuk
peringkat, kiraan buku dan grid `.bookshelf` sendiri; dropdown pembaca dikumpulkan dengan
`<optgroup>` mengikut kumpulan.

**Pautan mendalam:** `/pages/bahan-bacaan.html?buku=asas-akhlak` terus membuka pembaca buku
tersebut. Semua entri buku dalam `data/search-index.json` menggunakan format ini.

**Kulit buku:** dijana daripada halaman 1 setiap PDF (bukan fail berasingan). Jana semula
dengan mana-mana alat PDF.js — skrip `tools/generate-book.py` memerlukan Python yang tidak
dipasang pada mesin ini.

`assets/books/panduan-draf.pdf` masih ada pada cakera tetapi **tidak** disenaraikan dalam
`books.json`, jadi ia tidak dipaparkan di laman.

---

## 6a. Sistem gerakan (motion)

Semua interaksi menggunakan satu set token yang sama supaya rasa gerakan konsisten di seluruh
laman — halus dan terkawal, bukan animasi hiasan.

| Perkara | Nilai |
| --- | --- |
| Fail token | `css/motion.css` |
| Tempoh | `--t-press` 90ms · `--t-hover` 160ms · `--t-base` 240ms · `--t-slow` 380ms |
| Pelega | `--ease-out`, `--ease-in-out`, `--ease-press` |
| Skala tekan | `--press-scale` 0.97 (kecil: 0.98) |
| Animasikan | `transform` dan `opacity` sahaja (elak layout thrash) |
| Kurang gerakan | `@media (prefers-reduced-motion: reduce)` mematikan semua gerakan |

Utiliti tersedia: `.m-tactile` (hover/tekan), `.m-focus` (cincin fokus), `.m-rise` (masuk
ke atas). Komponen baharu hendaklah guna token ini, bukan nilai ms bertaburan.

### Inventori & audit

`data/motion.json` menyenaraikan **35 komponen** interaktif: pemilih, pencetus, gerakan,
fallback kurang-gerakan, saiz sasaran dan status. Semak dengan:

```powershell
node tools/check-motion.mjs
```

Skrip ini juga melaporkan kelas CSS yang tidak dirujuk dalam HTML.

### Makmal gerakan (dalaman)

`dev/motion-lab.html` — `noindex`, tiada dalam navigasi, tiada dalam `sitemap`. Buka terus
di `http://localhost:8081/dev/motion-lab.html`. Ia menyediakan slider kelajuan
(0.25×/0.5×/1×), togol `prefers-reduced-motion`, contoh komponen hidup dan jadual skor.
Kekal sebagai alat dalaman untuk menguji komponen baharu.

### Navigasi dropdown

Setiap item menu (Tentang, Kepimpinan, Berita, Aktiviti, Bahan Bacaan, Hubungi) guna corak **split
button**: label menuju terus ke halaman, anak panah membuka submenu. Latar hijau ialah satu
unit — tiada jurang antara label dan anak panah. Pada skrin ≤880px submenu dibuka *inline*
(`position: static`) di dalam menu mudah alih.

### Pemutar berita (topbar)

`js/modules/ticker.js` mengocok kesemua 17 item `data/berita.json` bersama laporan cawangan
berstatus `disahkan` daripada `data/aktiviti.json`, kemudian bertukar secara rawak setiap 6
saat. Butang **sebelum / seterusnya** menggantikan togol jeda. Pemutar berhenti semasa hover,
fokus atau tab tersembunyi. Tiada `aria-live` supaya pembaca skrin tidak terganggu; senarai
penuh ada di `/pages/berita.html` dan `/pages/aktiviti.html`.

### Butang peta

`js/modules/mapbtn.js` + `css/mapbtn.css` — butang "Buka Google Maps" dengan pratonton
OpenStreetMap (tiada API key). Tujuh keadaan: rehat, hover, tekan, fokus, memuat, ralat dan
popup disekat. Panel pratonton dicipta malas pada hover/fokus pertama dan berpusing ke kiri
(`.is-flipped`) apabila berdekatan tepi kanan supaya tidak melimpah keluar viewport.

---

## 6b. Modul masa, kalendar Hijrah dan waktu solat

`web-api-module/` ialah pustaka ES module kendiri untuk tarikh Gregorian, tarikh Hijrah,
masa Malaysia dan waktu solat. Masa menggunakan `Asia/Kuala_Lumpur` tanpa rangkaian;
waktu solat serta tarikh Hijrah rasmi dibaca daripada e-Solat JAKIM bagi zon
**SGR03 — Klang, Kuala Langat**. Cache pelayar dan jadual tahunan setempat memastikan laman
tidak bergantung sepenuhnya pada API langsung.

`js/modules/masa-solat-ui.js` memasang modul ini pada shell bersama semua halaman. Topbar
memaparkan tarikh Gregorian dan Hijrah; bar di bawah navigasi menunjukkan waktu sistem
(Asia/Kuala_Lumpur) serta solat seterusnya dengan waktu azan dan kiraan jam, minit dan saat,
serta senarai lapan waktu yang boleh dikembangkan. Pada telefon, tarikh dipindahkan ke bar waktu solat supaya topbar kekal
lapang. Makmal berasingan masih tersedia di `dev/web-api-module.html`. Semua waktu dipaparkan
dalam format 12 jam `AM/PM`; nilai dalaman dan atribut HTML `datetime` kekal dalam format
24 jam untuk pengiraan.

Kad waktu menggunakan Inter berubah berat yang dihoskan sendiri, grid `auto-fit` fluid,
angka tabular, label AM/PM berhierarki, permukaan kaca lembut dan penanda khas bagi solat
seterusnya. Kemunculan berturutan, hover bertactile dan penukaran keadaan hanya menggerakkan
`transform`/`opacity`, dengan fallback penuh untuk `prefers-reduced-motion`.

```powershell
node --test web-api-module/tests/web-api-module.test.mjs
node web-api-module/scripts/kemas-kini-fallback.mjs
```

Fail fallback perlu dijana semula pada awal setiap tahun. Lihat
`web-api-module/README.md` untuk kontrak API, urutan fallback, privasi dan konfigurasi.

---

## 7. Sebelum terbit

1. Semua nama dan jawatan disahkan secara bertulis.
2. Teks profil, visi dan misi diluluskan.
3. Alamat, telefon, e-mel dan waktu pejabat disemak. *(Alamat dan waktu sudah disahkan
   30 Oktober 2026; sahkan semula jika ada perubahan.)*
4. Pautan Facebook, Instagram, YouTube dan TikTok cawangan disemak.
5. Semua laporan aktiviti, URL post, imej dan kebenaran subjek disemak; tiada rekod `draf`
   diterbitkan.
6. Kebenaran nama dan logo diperoleh.
7. Tukar warna/tema jika panduan korporat rasmi berbeza.
8. Uji pada telefon dan komputer, termasuk carian dan menu mudah alih.
9. Barulah buang banner draf dan `noindex` — dengan kebenaran pihak cawangan.

---

## 7a. Git (kawalan versi)

Repo git setempat disediakan 31 Oktober 2026. Skop: folder ini sahaja — termasuk 15 PDF dalam
`assets/books/` (~22 MB). Folder induk (`assets/pdf/lain`, 634 MB) dan `_archive/` **tidak**
dimasukkan.

| Perkara | Nilai |
| --- | --- |
| Alat | MinGit 2.56.0 mudah alih — `%LOCALAPPDATA%\Programs\MinGit` |
| Cawangan | `main` |
| Identiti komit | PERKIM Kuala Langat `<perkimkualalangat@gmail.com>` (setempat sahaja) |
| `.git/` | Tidak disajikan oleh `tools/serve.mjs` (pulangan 404) |

Arahan harian:

```powershell
git status
git diff
git add -A
git commit -m "Kemas kini ..."
git log --oneline
git restore <fail>                 # buang perubahan yang belum dikomit
git checkout <hash> -- <fail>      # pulihkan versi lama satu fail
```

Sandaran di luar cakera (repo ini tiada remote):

```powershell
git bundle create ..\perkim-2026-10-31.bundle --all
```

Nota: `git` hanya muncul dalam terminal **baharu** selepas PATH dikemas kini. Jika belum,
gunakan laluan penuh `%LOCALAPPDATA%\Programs\MinGit\cmd\git.exe`.

---

## 7b. Hos GitHub Pages

Pratonton dalaman: <https://perkimkualalangat.github.io/Website-PERKIM/>

Repo dihoskan sebagai **project site**, iaitu laman berada dalam subfolder `/Website-PERKIM/`,
bukan di akar domain. Kerana itu **semua rujukan dalaman mesti relatif**:

| Salah | Betul |
| --- | --- |
| `href="/css/style.css"` | `href="css/style.css"` (akar) atau `../css/style.css` (subfolder) |
| `fetch('/data/site.json')` | `fetch(siteUrl('data/site.json'))` |
| `"cover": "/assets/x.jpg"` dalam JSON | `"cover": "assets/x.jpg"` |

Pembantu di `js/paths.js` mengira akar laman daripada lokasi modul itu sendiri, jadi kod yang
sama berfungsi di `localhost:8081/` dan di `/Website-PERKIM/`:

```js
import { siteHref, siteUrl } from '../paths.js';
img.src = siteHref('assets/img/logo.png');   // -> .../Website-PERKIM/assets/img/logo.png
await fetch(siteUrl('data/site.json'));      // -> .../Website-PERKIM/data/site.json
```

Fail `.nojekyll` di akar repo mematikan pemprosesan Jekyll GitHub Pages.

**Pratonton subfolder secara tempatan** (meniru keadaan GitHub Pages):

```powershell
$site = "$PWD"
$prev = "$env:TEMP\opencode\preview"
New-Item -ItemType Directory -Force -Path "$prev\tools" | Out-Null
New-Item -ItemType Junction -Path "$prev\Website-PERKIM" -Target $site
Copy-Item "$site\tools\serve.mjs" "$prev\tools\serve.mjs"
Set-Location $prev; node tools\serve.mjs 8082
# buka http://localhost:8082/Website-PERKIM/
```

Jangan simpan token GitHub dalam repo atau dalam `.git/config`.

---

## 8. Lesen

Kod templat ditulis untuk projek ini. Pustaka pihak ketiga:

| Pustaka | Lesen | Lokasi |
| --- | --- | --- |
| flippy-pdf 2.0.0 | MIT | `js/vendor/flippy/` |
| PDF.js 4.10.38 | Apache-2.0 | `js/vendor/pdfjs/` |

Fail lesen asal disertakan. Logo, nama dan maklumat PERKIM tertakluk pada hak organisasi.
