/** Titik masuk awam web-api-module. Tiada permintaan rangkaian pada waktu import. */

import { MODUL_VERSION } from './config.js';
import { dapatkanKalendarHariIni } from './modules/kalendar.js';
import { dapatkanMasaMalaysia, semakMasaPelayan } from './modules/masa-malaysia.js';
import { dapatkanWaktuSolat } from './modules/waktu-solat.js';

export { MODUL_VERSION, DEFAULT_CONFIG, binaKonfigurasi } from './config.js';
export { RalatApi, dapatkanJSON } from './core/api-client.js';
export { padamCache } from './core/cache.js';
export { binaUrlESolat, ambilJadualESolat } from './providers/esolat.js';
export { muatJadualFallback } from './providers/fallback-local.js';
export {
  dapatkanMasaMalaysia,
  formatMasa12Jam,
  mulakanJamMalaysia,
  semakMasaPelayan,
  tarikhISOMalaysia,
} from './modules/masa-malaysia.js';
export {
  SUSUNAN_SOLAT_FARDU,
  dapatkanWaktuSolat,
  tentukanSolatSeterusnya,
} from './modules/waktu-solat.js';
export {
  NAMA_BULAN_HIJRAH,
  anggarTarikhHijrah,
  dapatkanKalendarHariIni,
  formatTarikhHijrah,
} from './modules/kalendar.js';

/** Ambil satu snapshot konsisten tanpa menggandakan permintaan e-Solat. */
export async function dapatkanRingkasanHariIni(pilihan = {}) {
  const sekarang = pilihan.sekarang || new Date();
  const masa = dapatkanMasaMalaysia(sekarang, {
    zonMasa: pilihan.konfigurasi?.zonMasa,
    locale: pilihan.konfigurasi?.locale,
  });
  const waktuSolat = await dapatkanWaktuSolat({ ...pilihan, sekarang });
  const kalendar = await dapatkanKalendarHariIni({
    ...pilihan,
    sekarang,
    waktuSolat,
  });
  const semakanMasa =
    waktuSolat.sumber?.mod === 'api'
      ? semakMasaPelayan(waktuSolat.sumber.masaPelayan, {
          diperolehPada: waktuSolat.sumber.diperolehPada,
        })
      : null;

  return {
    versi: MODUL_VERSION,
    masa,
    semakanMasa,
    kalendar,
    waktuSolat,
  };
}
