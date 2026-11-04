/** Normalisasi dan pengesahan respons e-Solat JAKIM. */

const BULAN = {
  jan: '01',
  feb: '02',
  mac: '03',
  mar: '03',
  apr: '04',
  mei: '05',
  may: '05',
  jun: '06',
  jul: '07',
  ogos: '08',
  aug: '08',
  sep: '09',
  okt: '10',
  oct: '10',
  nov: '11',
  dis: '12',
  dec: '12',
};

const HARI = {
  Sunday: 'Ahad',
  Monday: 'Isnin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Khamis',
  Friday: 'Jumaat',
  Saturday: 'Sabtu',
};

const MEDAN_WAKTU = {
  imsak: 'imsak',
  fajr: 'subuh',
  syuruk: 'syuruk',
  dhuha: 'dhuha',
  dhuhr: 'zohor',
  asr: 'asar',
  maghrib: 'maghrib',
  isha: 'isyak',
};

function objek(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalisasiTarikhESolat(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const match = /^(\d{2})-([A-Za-z]+)-(\d{4})$/.exec(String(value));
  if (!match) throw new TypeError(`Tarikh e-Solat tidak sah: ${value}`);
  const bulan = BULAN[match[2].toLowerCase()];
  if (!bulan) throw new TypeError(`Bulan e-Solat tidak dikenali: ${match[2]}`);
  return `${match[3]}-${bulan}-${match[1]}`;
}

function normalisasiWaktu(value, field) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new TypeError(`Waktu ${field} tidak sah: ${value}`);
  }
  return `${match[1]}:${match[2]}`;
}

export function normalisasiRekodESolat(rekod) {
  if (!objek(rekod)) throw new TypeError('Rekod waktu solat mesti objek.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(rekod.hijri))) {
    throw new TypeError(`Tarikh Hijrah tidak sah: ${rekod.hijri}`);
  }

  const waktu = {};
  for (const [asal, nama] of Object.entries(MEDAN_WAKTU)) {
    waktu[nama] = normalisasiWaktu(rekod[asal], asal);
  }

  return {
    tarikh: normalisasiTarikhESolat(rekod.date),
    hijrah: String(rekod.hijri),
    hari: HARI[rekod.day] || String(rekod.day || ''),
    waktu,
  };
}

function normalisasiKiblat(value) {
  if (!value) return null;
  return String(value)
    .replaceAll('&#176;', '°')
    .replaceAll('&#8242;', '′')
    .replaceAll('&#8243;', '″');
}

export function normalisasiResponsESolat(payload, { url = null, diperolehPada = null } = {}) {
  if (!objek(payload) || payload.status !== 'OK!' || !Array.isArray(payload.prayerTime)) {
    throw new TypeError('Respons e-Solat tidak mempunyai struktur yang dijangka.');
  }
  if (!/^[A-Z]{3}\d{2}$/.test(String(payload.zone))) {
    throw new TypeError('Respons e-Solat tidak mempunyai kod zon yang sah.');
  }

  const rekod = payload.prayerTime.map(normalisasiRekodESolat);
  if (!rekod.length) throw new TypeError('Respons e-Solat tidak mengandungi rekod.');

  return {
    pembekal: 'e-solat-jakim',
    sumber: 'e-Solat JAKIM',
    sumberUrl: url,
    zon: String(payload.zone),
    tempoh: String(payload.periodType || ''),
    masaPelayan: payload.serverTime || null,
    kiblat: normalisasiKiblat(payload.bearing),
    diperolehPada,
    rekod,
  };
}

/** Sahkan semula data yang telah dinormalisasi sebelum fallback digunakan. */
export function sahkanJadualDinormalisasi(data) {
  if (!objek(data) || data.pembekal !== 'e-solat-jakim' || !Array.isArray(data.rekod)) {
    throw new TypeError('Fail fallback tidak mempunyai jadual e-Solat yang sah.');
  }
  if (!/^[A-Z]{3}\d{2}$/.test(String(data.zon)) || data.rekod.length === 0) {
    throw new TypeError('Zon atau rekod fallback tidak sah.');
  }

  const rekod = data.rekod.map((item) => {
    if (!objek(item) || !/^\d{4}-\d{2}-\d{2}$/.test(String(item.tarikh))) {
      throw new TypeError('Tarikh rekod fallback tidak sah.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.hijrah)) || !objek(item.waktu)) {
      throw new TypeError('Tarikh Hijrah atau waktu fallback tidak sah.');
    }
    const waktu = {};
    for (const nama of Object.values(MEDAN_WAKTU)) {
      waktu[nama] = normalisasiWaktu(item.waktu[nama], nama);
    }
    return { tarikh: item.tarikh, hijrah: item.hijrah, hari: String(item.hari || ''), waktu };
  });

  return { ...data, rekod };
}
