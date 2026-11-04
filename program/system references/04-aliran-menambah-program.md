# Aliran Menambah dan Mengemas Kini Program

## 1. Prasyarat

- Fakta program tersedia daripada sumber yang dibenarkan.
- URL Facebook asal diketahui.
- Gambar mempunyai kebenaran penggunaan.
- Python tersedia untuk menjana dan menyemak data.
- Kerja dilakukan dari akar repositori `perkim-web`.

## 2. Cipta folder daripada template

```powershell
cd C:\Users\rafee\Downloads\PERKIM\perkim-web\program
Copy-Item .\_template .\ziarah-kebajikan-2027 -Recurse
```

Gunakan slug sebenar. Jangan gunakan `program-3` jika tajuk boleh dikenal pasti dengan lebih
jelas.

## 3. Lengkapkan `caption.md`

1. Samakan `id` dan `slug` dengan nama folder.
2. Isi tarikh ISO `YYYY-MM-DD`.
3. Isi tajuk, kategori dan ringkasan.
4. Isi lokasi, masa dan kehadiran jika diketahui.
5. Gunakan URL Facebook HTTPS kanonik.
6. Kekalkan `status: draf` semasa penyediaan.
7. Kekalkan kedua-dua medan pengesahan sebagai `null`.
8. Letakkan caption penuh selepas penutup metadata.

Jangan mereka fakta untuk mengisi medan kosong; gunakan `null` pada medan pilihan.

## 4. Tambah laporan

Jika ada laporan:

```text
program/ziarah-kebajikan-2027/laporan.md
```

dan metadata:

```yaml
laporan: laporan.md
```

Jika tiada:

```yaml
laporan: null
```

## 5. Tambah gambar

Salin gambar ke folder program dan senaraikan mengikut urutan paparan:

```yaml
gambar: ["poster.jpg", "gambar-01.jpg", "gambar-02.jpg"]
gambar_alt: ["...", "...", "..."]
gambar_kapsyen: ["Poster rasmi.", "Sesi pembukaan.", "Gambar kenangan."]
```

Imej pertama menjadi gambar kad Aktiviti dan slaid pertama Sorotan.

## 6. Tentukan Sorotan

Untuk masuk halaman Aktiviti sahaja:

```yaml
sorotan: null
```

Untuk masuk Sorotan Program:

```yaml
sorotan: 3
```

Nombor mesti unik. Program Sorotan juga mesti mempunyai sekurang-kurangnya satu gambar.

## 7. Jana JSON

Dari akar projek:

```powershell
python tools\bina_aktiviti.py
```

Jangkaan output:

```text
Dijana: data\aktiviti.json
Aktiviti: <n> dijana, <n> ditarik, 0 ralat, <n> amaran.
```

Betulkan semua ralat. Semak setiap amaran dan hanya terima jika disengajakan.

## 8. Jalankan validasi penuh

```powershell
python tools\check-site.py
node --check js\modules\sorotan.js
git diff --check
```

Untuk perubahan kandungan biasa, semakan Python adalah wajib. Semakan JavaScript diperlukan
jika kod Sorotan turut berubah.

## 9. Pralihat tempatan

```powershell
.\start.bat 8081
```

Semak:

- `http://localhost:8081/index.html`;
- `http://localhost:8081/pages/aktiviti.html`;
- `http://localhost:8081/pages/aktiviti.html?slug=ziarah-kebajikan-2027`;
- carian laman;
- paparan mudah alih.

Jangan uji melalui `file://`.

## 10. Pengesahan kandungan

Selepas semakan rasmi:

```yaml
status: disahkan
disahkan_oleh: Setiausaha PERKIM Kuala Langat
disahkan_tarikh: 2027-01-22
```

Jana JSON dan jalankan semua semakan sekali lagi.

## 11. Commit dan push

Pastikan sumber dan JSON dimasukkan bersama:

```powershell
git status --short
git add -- program/ziarah-kebajikan-2027 data/aktiviti.json
git commit -m "Tambah program ziarah kebajikan 2027"
git push origin main
```

Jika template atau dokumentasi berubah, stage fail tersebut juga.

## 12. Mengemas kini program sedia ada

1. Edit fail dalam folder program, bukan JSON.
2. Jika nama slug perlu berubah, namakan semula folder dan ubah `id`/`slug`; sedar bahawa URL
   lama akan terputus.
3. Jana semula JSON.
4. Semak pautan, Sorotan, Aktiviti dan carian.
5. Commit perubahan sumber bersama JSON.

## 13. Menarik balik program

Jangan padam sejarah secara tergesa-gesa. Tetapkan:

```yaml
status: ditarik
disahkan_oleh: null
disahkan_tarikh: null
```

Selepas JSON dijana, rekod tidak dimasukkan ke `data/aktiviti.json` dan hilang daripada semua
paparan berasaskan data. Folder sumber kekal untuk audit dalaman.
