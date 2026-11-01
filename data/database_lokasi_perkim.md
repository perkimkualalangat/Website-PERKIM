# Pangkalan data lokasi PERKIM

Fail ini ialah **sumber tunggal** untuk ibu pejabat, cawangan, infrastruktur/utiliti,
serta sejarah dan kolaborasi (dalam dan luar negara). Peta di laman dijana daripadanya.
Jangan sunting `perkim-network.json` secara manual.

## Cara guna

1. Tambah atau ubah rekod dalam blok ` ```rekod ` di bawah.
2. Semak: `python tools/bina_lokasi.py semak`
3. Jana untuk ujian: `python tools/bina_lokasi.py bina`
4. Jana untuk laman awam (hanya rekod `disahkan`): `python tools/bina_lokasi.py bina --awam`

## Aliran pengesahan

| status | maksud | dipaparkan di laman awam |
|---|---|---|
| draf | baru dimasukkan, belum dihantar | tidak |
| menunggu | sudah dihantar kepada Setiausaha/AJK | tidak |
| disahkan | ada bukti dan pengesah | ya |
| ditarik | tidak lagi sah (tutup, silap, ditamatkan) | tidak |

Rekod hanya boleh jadi `disahkan` jika ada `disahkan_oleh`, `tarikh_sah` dan sekurang-kurangnya
satu `sumber` (surat, minit mesyuarat, perjanjian atau dokumen lain yang boleh disemak).
Pengesah ialah individu yang diberi kuasa oleh pihak cawangan atau ibu pejabat, bukan penyunting fail.
Sejarah perubahan disimpan oleh Git: setiap perubahan status ialah satu commit dengan mesej yang jelas.

## Medan

| medan | wajib | keterangan |
|---|---|---|
| id | ya | huruf kecil, nombor, sengkang; unik |
| nama | ya | nama paparan |
| jenis | ya | `ibu_pejabat`, `negeri`, `daerah`, `antarabangsa`, `infra` |
| status | ya | `draf`, `menunggu`, `disahkan`, `ditarik` |
| negeri | untuk jenis Malaysia | contoh: `Selangor`, `Wilayah Persekutuan Labuan` |
| negara | untuk `antarabangsa` | contoh: `Indonesia` |
| lokasi | tidak | bandar atau tempat |
| lat, lon | untuk semua kecuali `infra` | darjah perpuluhan |
| alamat, telefon | tidak | maklumat hubungan |
| peranan | tidak | penerangan ringkas dipaparkan pada kad |
| sejarah | tidak | boleh berulang. Format: `tahun \| peristiwa` |
| kolaborasi | tidak | boleh berulang. Format: `tahun \| butiran` |
| sumber | wajib jika disahkan | boleh berulang. Dokumen bukti |
| disahkan_oleh, tarikh_sah | wajib jika disahkan | nama/jawatan dan `YYYY-MM-DD` |
| semakan_akhir | tidak | `YYYY-MM-DD`; amaran jika lebih setahun |
| induk | untuk `infra` | `id` cawangan pemilik |
| kategori | untuk `infra` | `bangunan`, `kenderaan`, `utiliti`, `peralatan`, `lain` |
| butiran | untuk `infra` | apa, di mana, status milikan |

## Contoh rekod yang lengkap (tidak dibaca oleh skrip)

```text
id: perkim-contoh
nama: PERKIM Contoh
jenis: negeri
status: disahkan
negeri: Perak
lokasi: Ipoh, Perak
lat: 4.597
lon: 101.090
peranan: Cawangan PERKIM peringkat negeri.
sejarah: 1999 | Cawangan ditubuhkan
sumber: Surat pengesahan Setiausaha Agung, Ruj. XXX, 2026-03-12
disahkan_oleh: Setiausaha Agung
tarikh_sah: 2026-03-12
semakan_akhir: 2026-03-12
```

## Rekod

Semua rekod di bawah masih `draf`. Nilai mereka hanyalah titik permulaan.

```rekod
id: ibu-pejabat
nama: Ibu Pejabat PERKIM
jenis: ibu_pejabat
status: draf
negeri: Kuala Lumpur
lokasi: Kuala Lumpur
lat: 3.139
lon: 101.687
peranan: Pusat penyelarasan cawangan dan jaringan antarabangsa.
```

```rekod
id: perkim-selangor
nama: PERKIM Selangor
jenis: negeri
status: draf
negeri: Selangor
lokasi: Shah Alam, Selangor
lat: 3.073
lon: 101.518
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: kuala-langat
nama: PERKIM Kuala Langat
jenis: daerah
status: draf
negeri: Selangor
lokasi: Banting, Selangor
lat: 2.816
lon: 101.500
alamat: Lot 2029, Jalan Haji Darini, Lorong 4, Kampung Sungai Lang Baru, 42700 Banting, Selangor
telefon: 016-353 6126
peranan: Pejabat pengurusan aktiviti dakwah, pendidikan, kebajikan dan kemasyarakatan di daerah Kuala Langat.
```

```rekod
id: kuala-langat-pejabat
nama: Pejabat cawangan Kuala Langat
jenis: infra
status: draf
induk: kuala-langat
kategori: bangunan
butiran: Pejabat pengurusan di alamat cawangan. Status milikan (milik/sewa/pinjam) belum diisi.
```

```rekod
id: rakan-jakarta
nama: Jakarta
jenis: antarabangsa
status: draf
negara: Indonesia
lokasi: Jakarta
lat: -6.209
lon: 106.846
peranan: CONTOH sahaja. Gantikan dengan rakan kolaborasi sebenar.
```

```rekod
id: perkim-perlis
nama: PERKIM Perlis
jenis: negeri
status: draf
negeri: Perlis
lokasi: Kangar, Perlis
lat: 6.443
lon: 100.204
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-kedah
nama: PERKIM Kedah
jenis: negeri
status: draf
negeri: Kedah
lokasi: Alor Setar, Kedah
lat: 6.121
lon: 100.367
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-pulau-pinang
nama: PERKIM Pulau Pinang
jenis: negeri
status: draf
negeri: Pulau Pinang
lokasi: George Town, Pulau Pinang
lat: 5.414
lon: 100.329
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-perak
nama: PERKIM Perak
jenis: negeri
status: draf
negeri: Perak
lokasi: Ipoh, Perak
lat: 4.597
lon: 101.09
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-putrajaya
nama: PERKIM Putrajaya
jenis: negeri
status: draf
negeri: Putrajaya
lokasi: Putrajaya
lat: 2.926
lon: 101.696
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-negeri-sembilan
nama: PERKIM Negeri Sembilan
jenis: negeri
status: draf
negeri: Negeri Sembilan
lokasi: Seremban, Negeri Sembilan
lat: 2.726
lon: 101.938
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-melaka
nama: PERKIM Melaka
jenis: negeri
status: draf
negeri: Melaka
lokasi: Melaka
lat: 2.196
lon: 102.25
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-johor
nama: PERKIM Johor
jenis: negeri
status: draf
negeri: Johor
lokasi: Johor Bahru, Johor
lat: 1.493
lon: 103.742
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-pahang
nama: PERKIM Pahang
jenis: negeri
status: draf
negeri: Pahang
lokasi: Kuantan, Pahang
lat: 3.807
lon: 103.326
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-terengganu
nama: PERKIM Terengganu
jenis: negeri
status: draf
negeri: Terengganu
lokasi: Kuala Terengganu, Terengganu
lat: 5.33
lon: 103.137
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-kelantan
nama: PERKIM Kelantan
jenis: negeri
status: draf
negeri: Kelantan
lokasi: Kota Bharu, Kelantan
lat: 6.126
lon: 102.238
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-sarawak
nama: PERKIM Sarawak
jenis: negeri
status: draf
negeri: Sarawak
lokasi: Kuching, Sarawak
lat: 1.553
lon: 110.359
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-sabah
nama: PERKIM Sabah
jenis: negeri
status: draf
negeri: Sabah
lokasi: Kota Kinabalu, Sabah
lat: 5.98
lon: 116.073
peranan: Cawangan PERKIM peringkat negeri.
```

```rekod
id: perkim-labuan
nama: PERKIM Labuan
jenis: negeri
status: draf
negeri: Wilayah Persekutuan Labuan
lokasi: Labuan
lat: 5.283
lon: 115.23
peranan: Cawangan PERKIM peringkat negeri.
```
