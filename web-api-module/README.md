# Web API Module — masa, kalendar dan waktu solat

Modul ES (`type="module"`) tanpa kebergantungan luar untuk laman statik PERKIM Kuala Langat.
Ia berfungsi pada `localhost` dan GitHub Pages dalam subfolder `/Website-PERKIM/`.

## Sumber dan dasar

- **Masa Malaysia:** `Intl.DateTimeFormat` dengan `Asia/Kuala_Lumpur`; tiada rangkaian.
- **Gregorian:** jam peranti yang diformat dalam zon Malaysia.
- **Hijrah:** tarikh yang dihantar bersama jadual e-Solat; `Intl` hanya fallback anggaran.
- **Waktu solat:** API takwim [e-Solat JAKIM](https://www.e-solat.gov.my/).
- **Zon lalai:** `SGR03 — Klang, Kuala Langat`, berdasarkan senarai zon e-Solat.

Modul ini ialah **klien API dalam pelayar**, bukan pelayan REST. GitHub Pages tidak boleh
menjalankan endpoint sisi pelayan atau menyimpan rahsia.

## Penggunaan ringkas

```js
import {
  dapatkanRingkasanHariIni,
  mulakanJamMalaysia,
  tentukanSolatSeterusnya,
} from './web-api-module/index.js';

const ringkasan = await dapatkanRingkasanHariIni();
console.log(ringkasan.kalendar.hijrah.label);
console.log(ringkasan.waktuSolat.waktu.subuh);
console.log(
  tentukanSolatSeterusnya(ringkasan.waktuSolat.waktu, ringkasan.masa.masa)
);

const berhenti = mulakanJamMalaysia((masa) => {
  document.querySelector('#jam').textContent = masa.labelMasa;
});
// berhenti();
```

Nilai `masa` dan `waktuSolat.waktu` kekal sebagai `HH:mm`/`HH:mm:ss` supaya selamat untuk
pengiraan. Gunakan `formatMasa12Jam('13:00')` untuk paparan `1:00 PM`. Antara muka laman
menggunakan format 12 jam ini tetapi mengekalkan nilai 24 jam dalam atribut `datetime`.

`ringkasan.semakanMasa` membandingkan jam peranti dengan `serverTime` e-Solat apabila data
datang terus daripada API. Data cache/fallback tidak digunakan sebagai rujukan masa semasa.

Tiada permintaan rangkaian dibuat hanya dengan mengimport `index.js`. Permintaan e-Solat
berlaku apabila `dapatkanWaktuSolat()`, `dapatkanKalendarHariIni()` atau
`dapatkanRingkasanHariIni()` dipanggil.

## Urutan fallback

1. Cache segar dalam `localStorage` (lalai enam jam).
2. API e-Solat bagi hari semasa.
3. Cache hari sama yang telah luput, jika API gagal.
4. `data/waktu-solat-fallback.json` bagi tahun yang dijana.
5. Waktu solat ditanda tidak tersedia — waktu tidak pernah direka atau dianggarkan.

Tarikh Hijrah menggunakan `Intl` sebagai pilihan terakhir dan akan mempunyai
`anggaran: true`. Antara muka pengguna perlu memaparkan amarannya.

## Konfigurasi

```js
const hasil = await dapatkanRingkasanHariIni({
  konfigurasi: {
    zonMasa: 'Asia/Kuala_Lumpur',
    eSolat: {
      zon: 'SGR03',
      timeoutMs: 5000,
      cacheMs: 6 * 60 * 60 * 1000,
    },
  },
});
```

Gunakan `paksaSegar: true` untuk melangkau cache segar, atau `gunakanApi: false` untuk
ujian fallback sahaja. Jangan letakkan token API dalam konfigurasi ini kerana semua kod
dihantar kepada pelayar.

## Kemas kini fallback

Jana semula sekurang-kurangnya pada awal setiap tahun:

```powershell
node web-api-module/scripts/kemas-kini-fallback.mjs
```

Skrip mengambil jadual tahunan `SGR03`, mengesahkan sekurang-kurangnya 365 rekod, kemudian
menulis `data/waktu-solat-fallback.json`. Fail itu ialah data janaan dan tidak patut disunting
secara manual.

## Ujian

```powershell
node --test web-api-module/tests/web-api-module.test.mjs
```

Demo pelayar tersedia di `http://localhost:8081/dev/web-api-module.html` selepas menjalankan
`start.bat`.

Paparan produksi dikendalikan oleh `js/modules/masa-solat-ui.js`: dwikalendar pada topbar dan
bar waktu solat yang boleh dikembangkan di bawah navigasi pada setiap halaman.

## Privasi dan ketepatan

Permintaan API langsung mendedahkan alamat IP pelawat kepada pelayan e-Solat. Tiada nama,
e-mel atau data peribadi dihantar. API luar boleh berubah atau terhenti tanpa notis; sebab itu
modul mengekalkan cache dan jadual setempat. Label sumber dan mod (`api`, `cache`,
`cache-luput`, `fallback-json`) hendaklah dikekalkan pada paparan awam.
