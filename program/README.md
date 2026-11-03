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

Cara menambah program:

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
