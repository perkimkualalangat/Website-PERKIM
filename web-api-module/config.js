/**
 * Konfigurasi pusat untuk modul masa, kalendar dan waktu solat.
 *
 * Fail ini tidak mengandungi token atau rahsia. Semua nilai dihantar kepada
 * pelayar dan oleh itu mestilah selamat untuk diterbitkan di GitHub Pages.
 */

export const MODUL_VERSION = '1.2.0';
export const ZON_MASA_MALAYSIA = 'Asia/Kuala_Lumpur';
export const ZON_ESOLAT_KUALA_LANGAT = 'SGR03';

const FALLBACK_URL = new URL('./data/waktu-solat-fallback.json', import.meta.url).href;

export const DEFAULT_CONFIG = Object.freeze({
  locale: 'ms-MY',
  zonMasa: ZON_MASA_MALAYSIA,
  fallbackUrl: FALLBACK_URL,
  eSolat: Object.freeze({
    endpoint: 'https://www.e-solat.gov.my/index.php',
    zon: ZON_ESOLAT_KUALA_LANGAT,
    tempoh: 'today',
    timeoutMs: 5000,
    percubaanSemula: 0,
    cacheMs: 6 * 60 * 60 * 1000,
  }),
});

function nomborBukanNegatif(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} mesti nombor bukan negatif.`);
  }
  return value;
}

/**
 * Gabungkan konfigurasi pengguna tanpa mengubah objek lalai.
 *
 * @param {object} [pilihan]
 * @returns {Readonly<object>}
 */
export function binaKonfigurasi(pilihan = {}) {
  const eSolat = {
    ...DEFAULT_CONFIG.eSolat,
    ...(pilihan.eSolat || {}),
  };

  if (!/^[A-Z]{3}\d{2}$/.test(eSolat.zon)) {
    throw new TypeError('Kod zon e-Solat mesti dalam format seperti SGR03.');
  }

  nomborBukanNegatif(eSolat.timeoutMs, 'timeoutMs');
  nomborBukanNegatif(eSolat.percubaanSemula, 'percubaanSemula');
  nomborBukanNegatif(eSolat.cacheMs, 'cacheMs');

  const config = {
    ...DEFAULT_CONFIG,
    ...pilihan,
    eSolat: Object.freeze(eSolat),
  };

  // Uji nama zon lebih awal supaya kesilapan konfigurasi mudah dikesan.
  new Intl.DateTimeFormat(config.locale, { timeZone: config.zonMasa }).format(new Date());

  return Object.freeze(config);
}
