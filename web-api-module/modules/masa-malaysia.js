/** Masa dan tarikh Malaysia tanpa kebergantungan rangkaian. */

import { DEFAULT_CONFIG } from '../config.js';

function sahkanTarikh(value) {
  const tarikh = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(tarikh.getTime())) throw new TypeError('Nilai tarikh tidak sah.');
  return tarikh;
}

function bahagianTarikh(tarikh, zonMasa) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zonMasa,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(tarikh);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

/** Tukar HH:mm atau HH:mm:ss kepada format 12 jam dengan AM/PM. */
export function formatMasa12Jam(value, { saat = false } = {}) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ''));
  if (
    !match ||
    Number(match[1]) > 23 ||
    Number(match[2]) > 59 ||
    (match[3] !== undefined && Number(match[3]) > 59)
  ) {
    throw new TypeError('Masa mesti dalam format HH:mm atau HH:mm:ss.');
  }
  const jam24 = Number(match[1]);
  const jam12 = jam24 % 12 || 12;
  const akhiran = jam24 < 12 ? 'AM' : 'PM';
  const bahagianSaat = saat && match[3] !== undefined ? `:${match[3]}` : '';
  return `${jam12}:${match[2]}${bahagianSaat} ${akhiran}`;
}

export function tarikhISOMalaysia(
  tarikh = new Date(),
  { zonMasa = DEFAULT_CONFIG.zonMasa } = {}
) {
  const nilai = bahagianTarikh(sahkanTarikh(tarikh), zonMasa);
  return `${nilai.year}-${nilai.month}-${nilai.day}`;
}

export function dapatkanMasaMalaysia(
  tarikh = new Date(),
  { zonMasa = DEFAULT_CONFIG.zonMasa, locale = DEFAULT_CONFIG.locale } = {}
) {
  const nilaiTarikh = sahkanTarikh(tarikh);
  const parts = bahagianTarikh(nilaiTarikh, zonMasa);
  const tarikhISO = `${parts.year}-${parts.month}-${parts.day}`;
  const masa = `${parts.hour}:${parts.minute}:${parts.second}`;

  return {
    tarikh: tarikhISO,
    masa,
    labelTarikh: new Intl.DateTimeFormat(locale, {
      timeZone: zonMasa,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(nilaiTarikh),
    labelMasa: formatMasa12Jam(masa, { saat: true }),
    zonMasa,
    sumber: 'jam-peranti',
    tepatPada: nilaiTarikh.toISOString(),
  };
}

/**
 * Bandingkan jam peranti dengan `serverTime` daripada respons e-Solat.
 * Gunakan hanya bagi respons langsung; masa pelayan dalam fallback sudah lama.
 */
export function semakMasaPelayan(
  masaPelayan,
  { diperolehPada = new Date(), ambangMs = 2 * 60 * 1000 } = {}
) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(
    String(masaPelayan || '')
  );
  if (!match) return { tersedia: false, sebab: 'Format masa pelayan tidak sah.' };

  const pelayan = new Date(`${match[1]}T${match[2]}+08:00`);
  const peranti = sahkanTarikh(diperolehPada);
  if (Number.isNaN(pelayan.getTime())) {
    return { tersedia: false, sebab: 'Masa pelayan tidak dapat dibaca.' };
  }

  const sisihanMs = pelayan.getTime() - peranti.getTime();
  return {
    tersedia: true,
    masaPelayan: `${match[1]}T${match[2]}+08:00`,
    diperolehPada: peranti.toISOString(),
    sisihanMs,
    sisihanSaat: Math.round(sisihanMs / 1000),
    ambangMs,
    berbeza: Math.abs(sisihanMs) > ambangMs,
  };
}

/** Jalankan callback setiap saat; pulangkan fungsi untuk menghentikannya. */
export function mulakanJamMalaysia(callback, pilihan = {}) {
  if (typeof callback !== 'function') throw new TypeError('callback mesti fungsi.');
  const kemasKini = () => callback(dapatkanMasaMalaysia(new Date(), pilihan));
  kemasKini();
  const id = setInterval(kemasKini, pilihan.selangMs || 1000);
  return () => clearInterval(id);
}
