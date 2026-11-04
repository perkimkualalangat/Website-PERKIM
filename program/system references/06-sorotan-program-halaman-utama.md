# Sorotan Program di Halaman Utama

## 1. Fail yang terlibat

- `index.html` — struktur fallback dan semua `data-*` hook.
- `js/modules/sorotan.js` — pemuatan data, pemilihan program dan slideshow.
- `css/sorotan.css` — kad maklumat, pemilih, panel butiran dan responsif.
- `data/aktiviti.json` — data janaan yang dibaca oleh modul.
- `js/main.js` — memanggil `initSorotan()` selepas DOM siap.

## 2. Syarat program layak

`setupFeatured()` memilih rekod yang memenuhi semua syarat:

1. objek rekod wujud;
2. status bukan `ditarik`;
3. `sorotan` ialah integer positif;
4. `gambar` ialah senarai;
5. senarai gambar tidak kosong.

Rekod kemudian disusun menaik mengikut nombor `sorotan`.

```text
sorotan: 1 -> pertama/default
sorotan: 2 -> kedua
sorotan: 3 -> ketiga
```

Nombor mesti unik; penjana dan validator akan menolak pendua.

## 3. Fallback HTML

`index.html` mengandungi kandungan Sorotan pertama secara statik. Tujuannya:

- mengelakkan ruang kosong sebelum `fetch` selesai;
- menyediakan kandungan asas jika JavaScript gagal;
- menyediakan struktur DOM dan hook data.

Selepas `data/aktiviti.json` berjaya dimuat, JavaScript mengaktifkan rekod bernombor paling
kecil dan menggantikan kandungan fallback.

Apabila Sorotan pertama berubah secara kekal, kemas kini fallback HTML juga supaya pengalaman
tanpa JavaScript tidak ketinggalan.

## 4. Pemetaan data kepada paparan

| Elemen paparan | Sumber JSON | Hook DOM |
| --- | --- | --- |
| Tajuk | `tajuk` | `[data-sorotan-title]` |
| Tarikh | `tarikh` + hari tempatan | `[data-sorotan-date]` |
| Masa | `masa` | `[data-sorotan-time]` |
| Tempat | `lokasi` | `[data-sorotan-place]` |
| Kehadiran | `kehadiran` | `[data-sorotan-attendance]` |
| Lead butiran | `ringkas` | `[data-sorotan-lead]` |
| Teks butiran | perenggan 2 dan 3 `caption` | `[data-sorotan-text]` |
| Petikan | `petikan` | `[data-sorotan-quote-text]` |
| Kredit petikan | `petikan_oleh` | `[data-sorotan-quote-cite]` |
| Pautan laporan | `laporan` | `[data-sorotan-report]` |
| Set gambar | `gambar[]` | `[data-sorotan-stage]` |

Fakta pilihan disembunyikan jika nilainya kosong. Petikan dan pautan laporan juga disembunyikan
jika medan berkaitan tiada.

## 5. Pemilih nombor

Untuk setiap program, modul mencipta butang:

```html
<button class="sorotan__pick" data-sorotan="3" aria-pressed="false">03</button>
```

Perincian:

- nombor satu digit dipaparkan dengan sifar awal (`01`);
- tajuk digunakan sebagai `title` dan sebahagian `aria-label`;
- program aktif mempunyai `aria-pressed="true"`;
- menekan nombor menukar maklumat dan keseluruhan set gambar.

## 6. Butang program sebelumnya/seterusnya

Butang di sebelah `Butiran program` menggunakan:

- `[data-sorotan-program-prev]`;
- `[data-sorotan-program-next]`.

Ia berbeza daripada anak panah di bawah gambar:

| Kawalan | Fungsi |
| --- | --- |
| Anak panah pada kad maklumat | Tukar seluruh program |
| Anak panah bawah slideshow | Tukar gambar dalam program semasa |

Navigasi program berpusing. Dari program pertama, `sebelumnya` menuju program terakhir; dari
program terakhir, `seterusnya` kembali ke pertama. Pager hanya muncul jika ada lebih daripada
satu program layak.

## 7. Panel Butiran Program

`setupProgramPanel()` mengawal keadaan buka/tutup:

- `aria-expanded` pada butang;
- `aria-hidden` dan `inert` pada panel;
- label bertukar antara `Butiran program` dan `Sembunyikan butiran`;
- `Escape` menutup panel dan memulangkan fokus ke butang;
- pertukaran program sentiasa menutup panel.

## 8. Pertukaran program

`applyProgram()` melakukan urutan berikut:

1. ganti tajuk dan fakta;
2. bina teks butiran;
3. papar/sembunyi petikan;
4. papar/sembunyi laporan;
5. cipta semua elemen slaid program;
6. ganti kandungan stage;
7. kemas kini label galeri;
8. tutup panel butiran;
9. reset indeks gambar kepada `1 / jumlah`.

## 9. Banyak program Sorotan

Sistem boleh menerima `1, 2, 3...`, tetapi semua nombor menghasilkan butang pemilih. Untuk
halaman utama yang kemas:

- gunakan Sorotan hanya untuk program pilihan;
- gunakan `sorotan: null` bagi arkib biasa;
- jika jumlah melebihi kira-kira enam hingga lapan, pertimbangkan dasar menghadkan Sorotan
  atau reka bentuk pemilih kompak.

## 10. Kegagalan data

Jika JSON gagal dimuat:

- fallback HTML kekal;
- ralat dicatat pada Console sebagai `Sorotan: gagal memuat data`;
- butang nombor dinamik dan pager program tidak dibina;
- slideshow fallback masih boleh berfungsi kerana slaid asal berada dalam HTML.
