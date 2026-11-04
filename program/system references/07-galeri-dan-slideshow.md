# Galeri dan Slideshow Bertindan

## 1. Dua paparan gambar

Data gambar yang sama digunakan dalam dua konteks:

1. galeri grid pada butiran halaman Aktiviti;
2. slideshow bertindan pada Sorotan Program.

Urutan dalam medan `gambar` menentukan urutan kedua-dua paparan.

## 2. Model data gambar

Sumber `caption.md`:

```yaml
gambar: ["poster.jpg", "gambar-01.jpg", "gambar-02.jpg"]
gambar_alt: ["Alt poster.", "Alt gambar pertama.", "Alt gambar kedua."]
gambar_kapsyen: ["Poster rasmi.", "Sesi pembukaan.", null]
```

JSON janaan:

```json
{
  "src": "program/slug/poster.jpg",
  "alt": "Alt poster.",
  "kapsyen": "Poster rasmi."
}
```

## 3. Kad bertindan

Walaupun satu program boleh mempunyai banyak gambar, hanya tiga kedudukan visual utama
kelihatan serentak:

- `.is-front` — gambar aktif;
- `.is-mid` — gambar berikut di tengah;
- `.is-back` — gambar selepasnya di belakang.

Gambar lain kekal dalam DOM tetapi tersembunyi sehingga gilirannya. Stage menggunakan nisbah
`4 / 5`, dan gambar menggunakan `object-fit: cover`; imej dengan nisbah lain boleh dipotong
pada Sorotan tetapi dipaparkan `contain` dalam galeri Aktiviti.

## 4. Kawalan slideshow

| Kawalan | Hook | Tingkah laku |
| --- | --- | --- |
| Sebelumnya | `[data-sorotan-prev]` | Gambar sebelum, berpusing |
| Seterusnya | `[data-sorotan-next]` | Gambar selepas, berpusing |
| Main/jeda | `[data-sorotan-play]` | Togol autoplay |
| Kelajuan | `[data-sorotan-speed]` | Kitar kadar kelajuan |
| Kiraan | `[data-sorotan-count]` | Contoh `2 / 6` |
| Kapsyen | `[data-sorotan-caption]` | Kapsyen atau alt gambar aktif |

## 5. Autoplay dan kelajuan

Selang asas ialah 7000 ms pada `1x`.

```text
delay sebenar = 7000 / kelajuan
```

Urutan butang kelajuan:

```text
0.25x -> 0.5x -> 0.75x -> 1x -> 1.5x -> 2x -> 2.5x -> 3x -> ulang
```

Slideshow bermula pada `1x`. Contoh:

| Kelajuan | Anggaran sela |
| --- | ---: |
| `0.25x` | 28 saat |
| `0.5x` | 14 saat |
| `1x` | 7 saat |
| `2x` | 3.5 saat |
| `3x` | 2.33 saat |

Autoplay tidak berjalan jika gambar kurang daripada dua.

## 6. Keadaan jeda automatik

Pemasa tidak bergerak apabila:

- pengguna menekan jeda;
- tetikus berada di atas slideshow;
- fokus papan kekunci berada dalam slideshow selain kawalan;
- tab pelayar tersembunyi;
- `prefers-reduced-motion: reduce` aktif;
- set gambar mempunyai kurang daripada dua gambar.

Perubahan sistem kepada reduced motion juga menghentikan autoplay.

## 7. Papan kekunci dan sentuhan

Apabila region slideshow mempunyai fokus:

- `ArrowLeft` menuju gambar sebelumnya;
- `ArrowRight` menuju gambar seterusnya.

Gestur sentuh/pointer:

- leret mendatar sekurang-kurangnya 40 piksel;
- pergerakan mendatar mesti lebih besar daripada pergerakan menegak;
- leret kiri = seterusnya;
- leret kanan = sebelumnya;
- `touch-action: pan-y` mengekalkan skrol halaman menegak.

## 8. Animasi

- tempoh logik JavaScript: 560 ms;
- kad hadapan bergerak keluar untuk arah seterusnya;
- pemboleh ubah CSS `--sorotan-dir` menentukan arah transform;
- pada reduced motion, penyelesaian keadaan dipendekkan kepada kira-kira 30 ms;
- `busy` menghalang input bertindih semasa transisi.

## 9. Pemuatan imej

Apabila set dinamik dibina:

- gambar pertama menggunakan `fetchpriority="high"`;
- gambar seterusnya menggunakan `loading="lazy"`;
- semua menggunakan `decoding="async"`;
- atribut `draggable` dimatikan;
- URL diselesaikan melalui `siteHref()` untuk sokongan subfolder.

Nilai `width="1080"` dan `height="1350"` digunakan sebagai petunjuk nisbah DOM. CSS tetap
mengawal saiz sebenar dan imej sumber boleh mempunyai dimensi lain.

## 10. Kapsyen fallback

Teks bawah slideshow menggunakan urutan:

1. `gambar_kapsyen` jika ada;
2. `gambar_alt` jika kapsyen tiada;
3. teks kosong jika kedua-duanya tiada.

Alt tetap wajib di peringkat penjana, jadi keadaan ketiga tidak sepatutnya berlaku bagi data
yang sah.

## 11. Menukar set gambar

Apabila program lain dipilih:

1. semua `<figure>` baharu dibina;
2. stage menggunakan `replaceChildren()`;
3. indeks kembali ke sifar;
4. kelas tiga kedudukan dikira semula;
5. kapsyen dan kiraan dikemas kini;
6. pemasa autoplay dijadualkan semula.

## 12. Ujian minimum

- Cuba previous/next pada gambar pertama dan terakhir.
- Togol main/jeda.
- Kitar semua lapan kelajuan.
- Tukar program ketika slideshow berjalan.
- Uji arrow keys selepas fokus pada region.
- Uji leret pada telefon.
- Uji reduced motion.
- Pastikan alt dan kapsyen berubah bersama gambar.
