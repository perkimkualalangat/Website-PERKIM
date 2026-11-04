# Kitar Hayat Status dan Pengesahan

## 1. Nilai status yang sah

Sistem menerima tepat tiga nilai:

```yaml
status: draf
status: disahkan
status: ditarik
```

Nilai lain menyebabkan penjana gagal.

## 2. Matriks keterlihatan sebenar

| Komponen | `draf` | `disahkan` | `ditarik` |
| --- | --- | --- | --- |
| Masuk `data/aktiviti.json` | Ya | Ya | Tidak |
| Senarai Aktiviti | Ya, lencana Draf | Ya, lencana Disahkan | Tidak |
| Butiran Aktiviti | Ya | Ya | Tidak |
| Carian laman | Ya, jenis `Aktiviti (draf)` | Ya, jenis `Aktiviti` | Tidak |
| Sorotan Program | Ya jika `sorotan` + gambar | Ya jika `sorotan` + gambar | Tidak |
| Aktiviti terkini | Tidak | Ya, maksimum tiga | Tidak |
| Ticker atas | Tidak | Ya jika URL Facebook sah | Tidak |

**Penting:** `status: draf` sahaja tidak menyembunyikan program daripada Sorotan. Jika tidak
mahu draf muncul di Sorotan, gunakan `sorotan: null` sehingga kandungan diluluskan.

## 3. Fasa draf

Gunakan semasa kandungan sedang disusun atau belum mendapat pengesahan rasmi:

```yaml
status: draf
disahkan_oleh: null
disahkan_tarikh: null
sorotan: null
```

Tindakan yang sesuai:

- semak fakta dengan sumber asal;
- semak ejaan nama dan jawatan;
- semak tarikh, masa, tempat dan kehadiran;
- sahkan hak penggunaan gambar;
- semak URL Facebook;
- buat pralihat tempatan.

## 4. Fasa disahkan

Selepas kandungan disahkan:

```yaml
status: disahkan
disahkan_oleh: Setiausaha PERKIM Kuala Langat
disahkan_tarikh: 2027-01-22
```

Peraturan:

- `disahkan_oleh` mesti teks bukan kosong;
- `disahkan_tarikh` mesti `YYYY-MM-DD`;
- tarikh pengesahan tidak boleh pada masa hadapan;
- jana semula JSON selepas perubahan;
- semak paparan ticker dan Aktiviti terkini kerana program kini layak untuk kedua-duanya.

Tarikh program (`tarikh`) boleh berada pada masa hadapan kerana sistem juga boleh menyimpan
program akan datang. Tarikh pengesahan tidak boleh pada masa hadapan.

## 5. Fasa ditarik

Gunakan apabila rekod perlu dikeluarkan daripada laman tetapi sumber dalaman hendak dikekalkan:

```yaml
status: ditarik
disahkan_oleh: null
disahkan_tarikh: null
```

Selepas `python tools\bina_aktiviti.py`:

- rekod tidak ditulis ke JSON;
- URL butiran lama tidak lagi menemui rekod;
- rekod hilang daripada carian, ticker, Aktiviti dan Sorotan;
- folder sumber kekal dalam Git.

Jika perlu merekod sebab penarikan, gunakan rekod organisasi yang tidak diterbitkan; medan
tambahan tanpa sokongan hanya menghasilkan amaran dan tidak masuk JSON.

## 6. Peralihan status yang dibenarkan

```text
draf ------> disahkan
  |              |
  |              v
  +----------> ditarik
                 |
                 v
              draf/disahkan (jika dipulihkan dan disemak semula)
```

Setiap peralihan mesti diikuti oleh:

1. kemas kini medan pengesahan;
2. jana semula JSON;
3. validasi penuh;
4. pralihat;
5. commit dengan mesej yang menerangkan perubahan status.

## 7. Kesilapan lazim

### Status disahkan tetapi pengesah kosong

```text
disahkan_oleh diperlukan bagi rekod disahkan
```

Isi peranan pengesah dan tarikh sebenar.

### Draf mempunyai maklumat pengesahan

```text
medan pengesahan mesti null selagi status bukan disahkan
```

Kembalikan kedua-dua medan kepada `null`.

### Draf muncul di halaman utama

Ini kelakuan semasa jika `sorotan` bernombor. Tetapkan `sorotan: null`, jana JSON dan muat
semula halaman.

## 8. Polisi penerbitan yang disyorkan

1. Cipta sebagai draf tanpa Sorotan.
2. Semak kandungan dan media.
3. Dapatkan pengesahan.
4. Tukar kepada disahkan.
5. Beri nombor Sorotan hanya jika program patut berada di halaman utama.
6. Jana, semak, commit dan push.
