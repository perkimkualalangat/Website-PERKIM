# Rujukan Sistem Program PERKIM Kuala Langat

Dokumen dalam folder ini ialah rujukan teknikal dan operasi untuk sistem program di laman
PERKIM Kuala Langat. Ia menerangkan bagaimana satu folder program menjadi data JSON, kad
Aktiviti, hasil carian, item ticker dan Sorotan Program di halaman utama.

> Keadaan implementasi yang didokumenkan: 3 November 2026.

## Prinsip utama

1. `program/<slug>/caption.md` ialah sumber utama bagi satu program.
2. `data/aktiviti.json` ialah fail janaan; jangan sunting secara manual.
3. Setiap program disimpan secara bebas dalam satu folder.
4. `sorotan` menentukan sama ada program masuk ke Sorotan Program dan susunannya.
5. Status, sumber, kebenaran gambar dan pengesahan mesti dikawal sebelum penerbitan.
6. Semua laluan dalaman mesti berfungsi pada akar domain dan GitHub Pages dalam subfolder.

## Peta dokumen (18 fail)

| Fail | Kandungan |
| --- | --- |
| `00-README.md` | Indeks, peta sistem dan laluan bacaan |
| `01-seni-bina-sistem.md` | Komponen, sumber data dan aliran hujung-ke-hujung |
| `02-struktur-folder-dan-penamaan.md` | Struktur folder, slug dan fail yang dibenarkan |
| `03-skema-caption-metadata.md` | Spesifikasi lengkap semua medan `caption.md` |
| `04-aliran-menambah-program.md` | Prosedur menambah, mengemas kini dan menarik program |
| `05-kitar-hayat-status-dan-pengesahan.md` | `draf`, `disahkan`, `ditarik` dan kesannya |
| `06-sorotan-program-halaman-utama.md` | Pemilih nombor, kad maklumat dan navigasi program |
| `07-galeri-dan-slideshow.md` | Set gambar, kawalan, autoplay, kelajuan dan gestur |
| `08-halaman-aktiviti-dan-url.md` | Senarai Aktiviti, butiran dan URL berasaskan slug |
| `09-penjanaan-data-aktiviti.md` | Cara `bina_aktiviti.py` menghasilkan JSON |
| `10-validasi-dan-semak-tapak.md` | Semua pemeriksaan dan arahan validasi |
| `11-imej-alt-kapsyen-dan-aksesibiliti.md` | Polisi gambar, alt, kapsyen dan aksesibiliti |
| `12-laporan-caption-dan-sumber-facebook.md` | Laporan Markdown, caption dan sumber asal |
| `13-integrasi-carian-ticker-dan-modul.md` | Integrasi JavaScript lain yang menggunakan data program |
| `14-pembangunan-tempatan-dan-laluan-url.md` | Pelayan tempatan, cache dan URL subfolder |
| `15-git-penerbitan-dan-pemulihan.md` | Commit, push, semakan terbit dan pemulihan selamat |
| `16-penyelesaian-masalah.md` | Simptom lazim, sebab dan pembetulan |
| `17-senarai-semak-qa-dan-penyelenggaraan.md` | Checklist sebelum dan selepas penerbitan |

## Laluan bacaan mengikut peranan

### Penyunting kandungan

1. `02-struktur-folder-dan-penamaan.md`
2. `03-skema-caption-metadata.md`
3. `04-aliran-menambah-program.md`
4. `11-imej-alt-kapsyen-dan-aksesibiliti.md`
5. `17-senarai-semak-qa-dan-penyelenggaraan.md`

### Pembangun laman

1. `01-seni-bina-sistem.md`
2. `06-sorotan-program-halaman-utama.md`
3. `07-galeri-dan-slideshow.md`
4. `09-penjanaan-data-aktiviti.md`
5. `10-validasi-dan-semak-tapak.md`
6. `13-integrasi-carian-ticker-dan-modul.md`
7. `14-pembangunan-tempatan-dan-laluan-url.md`

### Penyemak atau pentadbir penerbitan

1. `05-kitar-hayat-status-dan-pengesahan.md`
2. `12-laporan-caption-dan-sumber-facebook.md`
3. `15-git-penerbitan-dan-pemulihan.md`
4. `17-senarai-semak-qa-dan-penyelenggaraan.md`

## Peta aliran ringkas

```text
program/<slug>/caption.md + gambar + laporan.md
                    |
                    v
          tools/bina_aktiviti.py
                    |
                    v
            data/aktiviti.json
          /         |          \
         v          v           v
  Halaman Aktiviti  Carian   Halaman utama
                              |- Sorotan Program
                              |- Aktiviti terkini
                              `- Ticker (disahkan sahaja)
```

## Fail kod autoritatif

Jika dokumentasi dan kod bercanggah, semak implementasi semasa dalam fail berikut:

- `tools/bina_aktiviti.py`
- `tools/check-aktiviti.py`
- `tools/check-site.py`
- `js/modules/aktiviti.js`
- `js/modules/sorotan.js`
- `js/modules/search.js`
- `js/modules/ticker.js`
- `index.html`
- `pages/aktiviti.html`
- `css/aktiviti.css`
- `css/sorotan.css`

Folder `program/system references/` dikecualikan secara eksplisit daripada pengimbas program.
Ia bukan rekod aktiviti dan tidak memerlukan `caption.md`.
