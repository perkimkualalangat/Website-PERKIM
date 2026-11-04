# Struktur Folder dan Penamaan

## 1. Struktur akar `program/`

```text
program/
|-- README.md
|-- _template/
|   `-- caption.md
|-- system references/
|   `-- 18 fail dokumentasi .md
|-- volunteer-gathering-2026/
|   |-- caption.md
|   |-- laporan.md
|   `-- gambar program
`-- <slug-program-baharu>/
    |-- caption.md
    |-- laporan.md            # pilihan
    `-- gambar                # sifar atau lebih
```

Folder yang namanya bermula `_` atau `.` tidak diimbas sebagai program. Folder
`system references` turut dikecualikan secara eksplisit dalam `tools/bina_aktiviti.py`.

## 2. Peraturan nama folder program

Nama folder ialah slug dan mesti mematuhi pola:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Maksudnya:

- huruf kecil `a-z`;
- nombor `0-9` dibenarkan;
- perkataan dipisahkan dengan satu sengkang `-`;
- tiada ruang, garis bawah, aksara Melayu beraksen atau simbol;
- tiada sengkang pada awal/akhir atau dua sengkang berturut-turut.

Contoh sah:

```text
ziarah-kebajikan-2027
townhall-zon-5-2027
kelas-asas-siri-2
```

Contoh tidak sah:

```text
Ziarah Kebajikan 2027
ziarah_kebajikan_2027
-ziarah-kebajikan
ziarah--kebajikan
```

## 3. Hubungan folder, `slug` dan `id`

Medan `slug` wajib sama tepat dengan nama folder:

```text
program/ziarah-kebajikan-2027/
```

```yaml
id: ziarah-kebajikan-2027
slug: ziarah-kebajikan-2027
```

Kod tidak mewajibkan `id` sama dengan `slug`, tetapi amalan rasmi sistem ialah menyamakan
keduanya supaya URL, carian dan penyelenggaraan tidak mengelirukan. Kedua-duanya mesti unik.

## 4. Nama tajuk bukan nama folder

Nama folder kekal teknikal. Tajuk manusia diletakkan dalam metadata:

```yaml
tajuk: Program Ziarah Kebajikan PERKIM Kuala Langat 2027
```

Jangan menamakan folder dengan tajuk penuh, ruang atau tanda baca.

## 5. Fail wajib dan pilihan

### Wajib

- `caption.md` — metadata dan caption penuh.

### Pilihan

- `laporan.md` — laporan lengkap jika medan `laporan` merujuknya.
- `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` — format gambar yang disokong.
- fail kerja lain boleh disimpan, tetapi jangan dedahkan data sulit.

## 6. Nama fail gambar

Gunakan nama yang stabil dan mudah dibaca:

```text
poster-program.jpg
gambar-01.jpg
gambar-02.jpg
```

Nama di `caption.md` mesti sama, termasuk sambungan dan huruf besar/kecil. Hosting Linux
seperti GitHub Pages peka huruf besar/kecil walaupun Windows tidak.

Contoh risiko:

```yaml
gambar: ["gambar-01.jpg"]
```

tetapi fail sebenar ialah `Gambar-01.JPG`. Ia mungkin kelihatan berfungsi di Windows tetapi
gagal selepas diterbitkan. Gunakan ejaan tepat dan konsisten.

## 7. Subfolder gambar

Penjana membenarkan laluan relatif di dalam folder program, contohnya:

```text
program/ziarah-kebajikan-2027/images/gambar-01.webp
```

```yaml
gambar: ["images/gambar-01.webp"]
```

Walau bagaimanapun, struktur rata lebih mudah untuk program kecil. Laluan mutlak dan `..`
dilarang.

## 8. Folder program belum siap

Setiap subfolder biasa yang tidak dikecualikan mesti mempunyai `caption.md`. Folder kosong
akan menyebabkan:

```text
program/<folder>: caption.md tidak ditemui
```

Jika kandungan belum siap, salin `_template`, sediakan `caption.md`, gunakan `status: draf`
dan lengkapkan semua medan wajib.
