import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  normalisasiResponsESolat,
  normalisasiTarikhESolat,
  sahkanJadualDinormalisasi,
} from '../core/validators.js';
import { padamCache } from '../core/cache.js';
import { formatTarikhHijrah } from '../modules/kalendar.js';
import {
  dapatkanMasaMalaysia,
  formatMasa12Jam,
  semakMasaPelayan,
  tarikhISOMalaysia,
} from '../modules/masa-malaysia.js';
import { dapatkanWaktuSolat, tentukanSolatSeterusnya } from '../modules/waktu-solat.js';
import { binaUrlESolat } from '../providers/esolat.js';

const CONTOH = {
  prayerTime: [
    {
      hijri: '1448-05-23',
      date: '03-Nov-2026',
      day: 'Tuesday',
      imsak: '05:38:00',
      fajr: '05:48:00',
      syuruk: '06:56:00',
      dhuha: '07:21:00',
      dhuhr: '13:00:00',
      asr: '16:20:00',
      maghrib: '18:59:00',
      isha: '20:10:00',
    },
  ],
  status: 'OK!',
  serverTime: '2026-11-03 20:10:40',
  periodType: 'today',
  zone: 'SGR03',
  bearing: '292&#176; 31&#8242; 16&#8243;',
};

test('normalisasi respons e-Solat kepada nama medan Melayu', () => {
  const data = normalisasiResponsESolat(CONTOH, { url: 'https://example.test' });
  assert.equal(data.zon, 'SGR03');
  assert.equal(data.rekod[0].tarikh, '2026-11-03');
  assert.equal(data.rekod[0].hari, 'Selasa');
  assert.equal(data.rekod[0].waktu.subuh, '05:48');
  assert.equal(data.rekod[0].waktu.zohor, '13:00');
  assert.equal(data.kiblat, '292° 31′ 16″');
});

test('singkatan bulan Melayu e-Solat diterima', () => {
  assert.equal(normalisasiTarikhESolat('31-Dis-2026'), '2026-12-31');
  assert.equal(normalisasiTarikhESolat('12-Ogos-2026'), '2026-08-12');
});

test('masa Malaysia kekal betul apabila tarikh UTC masih semalam', () => {
  const tarikh = new Date('2026-11-02T16:30:00.000Z');
  assert.equal(tarikhISOMalaysia(tarikh), '2026-11-03');
  assert.equal(dapatkanMasaMalaysia(tarikh).masa, '00:30:00');
  assert.equal(dapatkanMasaMalaysia(tarikh).labelMasa, '12:30:00 AM');
});

test('masa 24 jam diformat dengan AM/PM tanpa mengubah nilai sumber', () => {
  assert.equal(formatMasa12Jam('00:05'), '12:05 AM');
  assert.equal(formatMasa12Jam('05:48'), '5:48 AM');
  assert.equal(formatMasa12Jam('12:00'), '12:00 PM');
  assert.equal(formatMasa12Jam('13:07'), '1:07 PM');
  assert.equal(formatMasa12Jam('23:59:08', { saat: true }), '11:59:08 PM');
});

test('tarikh Hijrah diformat dalam Bahasa Melayu', () => {
  assert.equal(formatTarikhHijrah('1448-05-23'), '23 Jamadilawal 1448H');
});

test('URL e-Solat mengandungi zon dan tempoh', () => {
  const url = binaUrlESolat({ zon: 'SGR03', tempoh: 'today' });
  assert.equal(url.searchParams.get('zone'), 'SGR03');
  assert.equal(url.searchParams.get('period'), 'today');
});

test('orkestrasi API menghasilkan waktu solat yang tersedia', async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify(CONTOH), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  const hasil = await dapatkanWaktuSolat({
    sekarang: new Date('2026-11-03T04:00:00.000Z'),
    paksaSegar: true,
    gunakanFallback: false,
    fetchImpl,
  });
  assert.equal(hasil.tersedia, true);
  assert.equal(hasil.sumber.mod, 'api');
  assert.equal(hasil.waktu.subuh, '05:48');
});

test('permintaan kedua menggunakan cache pelayar', async () => {
  const kunci = 'waktu-solat:SGR03:2026-11-03';
  padamCache(kunci);
  let panggilan = 0;
  const fetchImpl = async () => {
    panggilan += 1;
    return new Response(JSON.stringify(CONTOH), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const pilihan = {
    sekarang: new Date('2026-11-03T04:00:00.000Z'),
    gunakanFallback: false,
    fetchImpl,
  };
  const pertama = await dapatkanWaktuSolat(pilihan);
  const kedua = await dapatkanWaktuSolat(pilihan);
  assert.equal(pertama.sumber.mod, 'api');
  assert.equal(kedua.sumber.mod, 'cache');
  assert.equal(panggilan, 1);
  padamCache(kunci);
});

test('fallback tahunan semasa lengkap dan tiada tarikh berulang', async () => {
  const teks = await readFile(new URL('../data/waktu-solat-fallback.json', import.meta.url), 'utf8');
  const fallback = JSON.parse(teks);
  assert.equal(fallback.schema, 1);
  const data = sahkanJadualDinormalisasi(fallback.data);
  const tahunSemasa = tarikhISOMalaysia().slice(0, 4);
  assert.equal(data.zon, 'SGR03');
  assert.equal(data.rekod[0].tarikh, `${tahunSemasa}-01-01`);
  assert.equal(data.rekod.at(-1).tarikh, `${tahunSemasa}-12-31`);
  assert.ok(data.rekod.length === 365 || data.rekod.length === 366);
  assert.equal(new Set(data.rekod.map((item) => item.tarikh)).size, data.rekod.length);
});

test('solat fardu seterusnya ditentukan menggunakan masa Malaysia', () => {
  const waktu = normalisasiResponsESolat(CONTOH).rekod[0].waktu;
  assert.equal(tentukanSolatSeterusnya(waktu, '05:00').id, 'subuh');
  assert.equal(tentukanSolatSeterusnya(waktu, '13:00').id, 'zohor');
  assert.equal(tentukanSolatSeterusnya(waktu, '16:21').id, 'maghrib');
  assert.equal(tentukanSolatSeterusnya(waktu, '20:11').selesai, true);
});

test('masa pelayan e-Solat boleh mengesan jam peranti tersasar', () => {
  const selaras = semakMasaPelayan('2026-11-03 20:10:40', {
    diperolehPada: new Date('2026-11-03T12:10:41.000Z'),
  });
  assert.equal(selaras.tersedia, true);
  assert.equal(selaras.berbeza, false);

  const tersasar = semakMasaPelayan('2026-11-03 20:10:40', {
    diperolehPada: new Date('2026-11-03T12:15:40.000Z'),
  });
  assert.equal(tersasar.berbeza, true);
  assert.equal(tersasar.sisihanSaat, -300);
});
