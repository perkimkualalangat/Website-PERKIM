# Folder program

Setiap program atau acara mempunyai satu subfolder sendiri:

```text
program/
|-- _template/
|   `-- caption.md
`-- slug-program/
    |-- caption.md
    |-- gambar-01.jpg
    `-- gambar-02.jpg
```

Program boleh ditambah melalui halaman **Tetapan** atau secara manual. Halaman Tetapan hanya
tersedia pada `localhost`/`127.0.0.1` melalui `start.bat` dengan Node.js; GitHub Pages kekal
baca sahaja.

## Aliran melalui halaman Tetapan

1. Jalankan `start.bat`, kemudian buka
   <http://127.0.0.1:8081/pages/tetapan.html>.
2. Tab **Cipta Program**: isi slug, tarikh, tajuk, kategori, ringkasan, URL Facebook dan
   caption penuh. Sistem mencipta `program/<slug>/caption.md` dengan status `draf`.
3. Tab **Import Gambar**: pilih program, kemudian muat naik atau seret gambar. Format yang
   diterima ialah JPG, PNG, WebP dan AVIF, maksimum 30 MB setiap fail.
4. Isi **alt text** untuk setiap gambar. Kapsyen adalah pilihan. Gunakan butang naik/turun
   untuk menyusun urutan.
5. Gambar pertama menjadi gambar kad Aktiviti dan slaid pertama Sorotan.
6. Tekan **Simpan Senarai Gambar**. Salinan sandaran `caption.md.bak` diwujudkan sebelum
   fail diubah.
7. Tekan **Kemaskini Program** untuk menjana semula `data/aktiviti.json`.
8. Semak halaman Aktiviti dan Sorotan sebelum menukar status kepada `disahkan`.

Jika gambar disalin terus ke folder program, tekan **Imbas Gambar Dalam Folder** di halaman
Tetapan supaya fail baharu muncul dalam senarai.

## Aliran manual

1. Salin folder `_template` dan namakan folder baharu menggunakan slug huruf kecil, nombor
   dan sengkang, contohnya `ziarah-kebajikan-2026`.
2. Lengkapkan metadata dan caption sebenar dalam `caption.md`.
3. Letakkan gambar yang dibenarkan dalam subfolder yang sama.
4. Senaraikan nama gambar dan teks alternatif dalam metadata `caption.md`.
5. Kekalkan `status: draf` sehingga rekod disahkan.
6. Jalankan:

```powershell
python tools\bina_aktiviti.py
python tools\check-site.py
```

`data/aktiviti.json` ialah fail janaan. Jangan sunting fail itu secara manual.

## Arahan CLI sandaran

Skrip `tools/urus_program.py` melakukan operasi yang sama seperti halaman Tetapan. Ia membaca
satu objek JSON dan mencetak satu objek JSON.

Contoh `payload.json` untuk mencipta program:

```json
{
  "slug": "ziarah-kebajikan-2026",
  "tajuk": "Ziarah Kebajikan 2026",
  "tarikh": "2026-11-15",
  "kategori": "Kebajikan",
  "ringkas": "Ringkasan pendek untuk kad aktiviti.",
  "facebook_url": "https://www.facebook.com/.../posts/...",
  "lokasi": "Kampung Contoh",
  "masa": "9.00 pagi - 11.00 pagi",
  "kehadiran": "8 peserta",
  "sorotan": null,
  "caption": "Caption penuh post Facebook."
}
```

Contoh `galeri.json` untuk menyimpan senarai gambar:

```json
{
  "slug": "ziarah-kebajikan-2026",
  "gambar": [
    {
      "nama": "gambar-01.jpg",
      "alt": "Penerangan gambar pertama.",
      "kapsyen": "Kapsyen ringkas."
    }
  ]
}
```

```powershell
python tools\urus_program.py cipta --data payload.json
python tools\urus_program.py imbas --slug ziarah-kebajikan-2026
python tools\urus_program.py simpan-gambar --data galeri.json
python tools\bina_aktiviti.py
```

## Medan pilihan untuk paparan sorotan

Medan berikut mengawal paparan kad di halaman utama dan butiran program:

- `masa` — contoh: `10.00 pagi – 12.00 tengah hari`
- `kehadiran` — contoh: `8 peserta baharu · 4 orang AJK`
- `laporan` — nama fail laporan dalam folder yang sama, contoh: `laporan.md`
- `petikan` — petikan ringkas untuk blok petikan (pilihan)
- `petikan_oleh` — nama dan jawatan penyumbang petikan
- `sorotan` — nombor integer positif untuk menjadikan program sebagai sorotan di halaman
  utama. Nombor mesti unik. Nombor lebih kecil dipaparkan dahulu, dan setiap nombor
  menentukan set gambar yang dipaparkan dalam slaid.

Jika `sorotan` dibiarkan `null`, program hanya muncul di halaman Aktiviti dan carian, bukan
sebagai sorotan di halaman utama.

Program tanpa gambar boleh menggunakan `gambar: []`, `gambar_alt: []` dan
`gambar_kapsyen: []`. Jika gambar digunakan, setiap item `gambar` wajib mempunyai item
`gambar_alt` pada kedudukan yang sama.

Jangan simpan nama peribadi, nombor telefon, data sulit atau gambar individu rentan tanpa
kebenaran. Gunakan URL post Facebook kanonik, bukan pautan sementara `/share/` jika boleh.
