/** Tarikh Gregorian Malaysia dan tarikh Hijrah dengan sumber yang dinyatakan. */

import { DEFAULT_CONFIG } from '../config.js';
import { dapatkanMasaMalaysia } from './masa-malaysia.js';
import { dapatkanWaktuSolat } from './waktu-solat.js';

export const NAMA_BULAN_HIJRAH = Object.freeze([
  'Muharam',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jamadilawal',
  'Jamadilakhir',
  'Rejab',
  'Syaaban',
  'Ramadan',
  'Syawal',
  'Zulkaedah',
  'Zulhijah',
]);

export function formatTarikhHijrah(isoHijrah) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoHijrah));
  if (!match) throw new TypeError('Tarikh Hijrah mesti dalam format YYYY-MM-DD.');
  const bulan = NAMA_BULAN_HIJRAH[Number(match[2]) - 1];
  if (!bulan) throw new TypeError('Bulan Hijrah tidak sah.');
  return `${Number(match[3])} ${bulan} ${match[1]}H`;
}

/** Fallback pengiraan pelayar; bukan pengganti takwim rasmi Malaysia. */
export function anggarTarikhHijrah(
  tarikh = new Date(),
  { zonMasa = DEFAULT_CONFIG.zonMasa } = {}
) {
  const calendars = ['islamic-umalqura', 'islamic-civil', 'islamic'];
  for (const calendar of calendars) {
    try {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: zonMasa,
        calendar,
        numberingSystem: 'latn',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const parts = Object.fromEntries(
        formatter
          .formatToParts(tarikh)
          .filter((part) => ['year', 'month', 'day'].includes(part.type))
          .map((part) => [part.type, part.value])
      );
      if (!parts.year || !parts.month || !parts.day) continue;
      const iso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
      return {
        iso,
        label: formatTarikhHijrah(iso),
        sumber: `Intl ${formatter.resolvedOptions().calendar}`,
        anggaran: true,
      };
    } catch {
      // Cuba kalendar seterusnya.
    }
  }
  return null;
}

export async function dapatkanKalendarHariIni(pilihan = {}) {
  const config = pilihan.konfigurasi || {};
  const zonMasa = config.zonMasa || DEFAULT_CONFIG.zonMasa;
  const locale = config.locale || DEFAULT_CONFIG.locale;
  const sekarang = pilihan.sekarang || new Date();
  const masa = dapatkanMasaMalaysia(sekarang, { zonMasa, locale });
  let waktuSolat = pilihan.waktuSolat;

  if (!waktuSolat && pilihan.gunakanApi !== false) {
    waktuSolat = await dapatkanWaktuSolat({ ...pilihan, sekarang });
  }

  let hijrah;
  if (waktuSolat?.tersedia && waktuSolat.tarikh === masa.tarikh && waktuSolat.hijrah) {
    hijrah = {
      iso: waktuSolat.hijrah,
      label: formatTarikhHijrah(waktuSolat.hijrah),
      sumber: waktuSolat.sumber?.nama || 'e-Solat JAKIM',
      mod: waktuSolat.sumber?.mod || null,
      anggaran: false,
    };
  } else {
    hijrah = anggarTarikhHijrah(sekarang, { zonMasa });
  }

  return {
    gregorian: {
      iso: masa.tarikh,
      label: masa.labelTarikh,
      zonMasa,
      sumber: 'Intl / jam peranti',
    },
    hijrah,
    amaran: hijrah?.anggaran
      ? ['Tarikh Hijrah ialah fallback pengiraan pelayar dan mungkin berbeza daripada takwim rasmi.']
      : [],
  };
}
