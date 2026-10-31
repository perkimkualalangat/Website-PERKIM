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
jika Node tiada. `tools/serve.mjs` menyokong `Range` (perlu untuk pembaca PDF) dan menetapkan
`Content-Type` yang betul untuk `.pdf`, `.mjs`, `.woff2` dan sebagainya.

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
perkim-kuala-langat/
├── start.bat                   Pelayan pralihat (Node atau Python)
├── index.html                  Utama + status laman
├── pages/
│   ├── tentang.html            Profil cawangan (placeholder)
│   ├── latar-belakang.html     PERKIM Kebangsaan: sejarah, visi, teras
│   ├── kepimpinan.html         Jadual jawatan + status pengesahan
│   ├── berita.html             Indeks berita (tajuk + pautan sahaja)
│   ├── bahan-bacaan.html       Rak buku PDF
│   └── hubungi.html            Alamat, e-mel, borang draf
├── css/
│   ├── style.css               Import semua CSS
│   ├── variables.css           Tema hijau/emas (warna draf, bukan rasmi)
│   ├── motion.css              Token gerakan + utiliti .m-tactile/.m-focus/.m-rise
│   ├── base.css, layout.css, components.css
│   ├── mapbtn.css              Butang "Buka Google Maps" + pratonton peta
│   ├── kepimpinan.css          Kad jawatan & status
│   ├── library.css             Rak buku + pembaca PDF
│   └── vendor/flippy.css       Gaya enjin flippy-pdf
├── js/
│   ├── main.js
│   ├── modules/
│   │   ├── components.js       Topbar, masthead, nav (split button), footer
│   │   ├── nav.js              Menu mudah alih & submenu dropdown
│   │   ├── ticker.js           Pemutar berita rawak di topbar (prev/next)
│   │   ├── mapbtn.js           Butang peta: 7 keadaan + pratonton OSM
│   │   ├── search.js           Carian halaman + bahan bacaan
│   │   ├── kepimpinan.js       Render jawatan daripada JSON
│   │   ├── perkim.js           Render maklumat kebangsaan
│   │   ├── berita.js           Indeks berita + penapis
│   │   ├── forms.js            Borang draf
│   │   ├── library/library.js  Rak buku
│   │   ├── library/engine-flippy.js
│   │   └── utils.js
│   └── vendor/                 flippy-pdf + PDF.js (MIT/Apache-2.0)
├── dev/
│   └── motion-lab.html         Makmal gerakan (dalaman, noindex, tiada dalam nav)
├── data/
│   ├── site.json               Alamat, telefon, waktu, media sosial
│   ├── search-index.json       Indeks carian
│   ├── motion.json             Inventori 33 komponen gerakan
│   ├── kepimpinan.json         Satu-satunya sumber nama & jawatan
│   ├── perkim.json             Maklumat PERKIM Kebangsaan
│   ├── sitemap.json            Struktur menu laman rasmi
│   ├── berita.json             Indeks 17 berita terpilih
│   └── books.json              Buku teks (5 kumpulan, 14 buku)
├── assets/
│   ├── img/                    Logo PERKIM (512/180/128/64/sumber)
│   ├── icons/favicon.svg       Ikon draf lama (tidak digunakan)
│   ├── fonts/                  Inter + Amiri (OFL, woff2)
│   └── books/                  PDF + kulit buku
│       ├── kelas-perkim/       14 buku teks PERKIM Kebangsaan
│       └── covers/             Kulit buku (jana daripada halaman 1 PDF)
└── tools/
    ├── serve.mjs               Pelayan statik tempatan (tanpa kebergantungan)
    ├── check-motion.mjs        Audit inventori gerakan + fallback
    ├── generate-book.py        Jana semula PDF/kulit
    ├── prepare-logo.py         Jana saiz logo daripada sumber
    ├── create-letter.py        Jana surat DOCX
    ├── scrape_perkim.py        Ambil kandungan laman rasmi
    └── check-site.py           Semak pautan, aset, JSON, tag
```

> Arkib penuh (`data/perkim/`) dan surat dalaman (`surat/`) **tidak** disalin ke folder aktif
> ini. Kedua-duanya kekal dalam `_archive/perkim-kuala-langat/` supaya tidak terdedah semasa
> ujian pelayan.

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

`data/motion.json` menyenaraikan **33 komponen** interaktif: pemilih, pencetus, gerakan,
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

Setiap item menu (Tentang, Kepimpinan, Berita, Bahan Bacaan, Hubungi) guna corak **split
button**: label menuju terus ke halaman, anak panah membuka submenu. Latar hijau ialah satu
unit — tiada jurang antara label dan anak panah. Pada skrin ≤880px submenu dibuka *inline*
(`position: static`) di dalam menu mudah alih.

### Pemutar berita (topbar)

`js/modules/ticker.js` mengocok kesemua 17 item `data/berita.json` dan bertukar secara rawak
setiap 6 saat. Butang **sebelum / seterusnya** menggantikan togol jeda. Pemutar berhenti
semasa hover, fokus atau tab tersembunyi. Tiada `aria-live` supaya pembaca skrin tidak
terganggu; senarai penuh ada di `/pages/berita.html`.

### Butang peta

`js/modules/mapbtn.js` + `css/mapbtn.css` — butang "Buka Google Maps" dengan pratonton
OpenStreetMap (tiada API key). Tujuh keadaan: rehat, hover, tekan, fokus, memuat, ralat dan
popup disekat. Panel pratonton dicipta malas pada hover/fokus pertama dan berpusing ke kiri
(`.is-flipped`) apabila berdekatan tepi kanan supaya tidak melimpah keluar viewport.

---

## 7. Sebelum terbit

1. Semua nama dan jawatan disahkan secara bertulis.
2. Teks profil, visi dan misi diluluskan.
3. Alamat, telefon, e-mel dan waktu pejabat disemak. *(Alamat dan waktu sudah disahkan
   30 Oktober 2026; sahkan semula jika ada perubahan.)*
4. Pautan Facebook, Instagram, YouTube dan TikTok cawangan disemak.
5. Kebenaran nama dan logo diperoleh.
6. Tukar warna/tema jika panduan korporat rasmi berbeza.
7. Uji pada telefon dan komputer, termasuk carian dan menu mudah alih.
8. Barulah buang banner draf dan `noindex` — dengan kebenaran pihak cawangan.

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
