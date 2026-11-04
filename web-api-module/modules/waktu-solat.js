/** Orkestrasi waktu solat: cache -> API e-Solat -> cache lama -> JSON fallback. */

import { binaKonfigurasi } from '../config.js';
import { bacaCache, binaKunciCache, tulisCache } from '../core/cache.js';
import { ambilJadualESolat } from '../providers/esolat.js';
import { muatJadualFallback } from '../providers/fallback-local.js';
import { tarikhISOMalaysia } from './masa-malaysia.js';

export const SUSUNAN_SOLAT_FARDU = Object.freeze([
  Object.freeze({ id: 'subuh', nama: 'Subuh' }),
  Object.freeze({ id: 'zohor', nama: 'Zohor' }),
  Object.freeze({ id: 'asar', nama: 'Asar' }),
  Object.freeze({ id: 'maghrib', nama: 'Maghrib' }),
  Object.freeze({ id: 'isyak', nama: 'Isyak' }),
]);

function minit(value, label) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new TypeError(`${label} mesti dalam format HH:mm.`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Tentukan solat fardu seterusnya tanpa membuat permintaan rangkaian. */
export function tentukanSolatSeterusnya(waktu, masaSemasa) {
  if (!waktu || typeof waktu !== 'object') return null;
  const sekarang = minit(masaSemasa, 'masaSemasa');

  for (const solat of SUSUNAN_SOLAT_FARDU) {
    if (!waktu[solat.id]) continue;
    if (sekarang <= minit(waktu[solat.id], solat.id)) {
      return { ...solat, waktu: waktu[solat.id], selesai: false };
    }
  }

  return { id: null, nama: null, waktu: null, selesai: true };
}

function mesejRalat(error) {
  return error instanceof Error ? error.message : String(error);
}

function cariRekod(jadual, tarikh) {
  return jadual?.rekod?.find((item) => item.tarikh === tarikh) || null;
}

function ringkaskan(jadual, rekod) {
  return {
    rekod,
    zon: jadual.zon,
    sumber: jadual.sumber,
    sumberUrl: jadual.sumberUrl,
    masaPelayan: jadual.masaPelayan,
    kiblat: jadual.kiblat,
    diperolehPada: jadual.diperolehPada,
    dijanaPada: jadual.dijanaPada || null,
  };
}

function hasil(payload, mod, amaran = [], ralat = []) {
  return {
    tersedia: true,
    tarikh: payload.rekod.tarikh,
    hijrah: payload.rekod.hijrah,
    hari: payload.rekod.hari,
    zon: payload.zon,
    waktu: { ...payload.rekod.waktu },
    kiblat: payload.kiblat || null,
    sumber: {
      nama: payload.sumber || 'e-Solat JAKIM',
      url: payload.sumberUrl || null,
      mod,
      diperolehPada: payload.diperolehPada || null,
      dijanaPada: payload.dijanaPada || null,
      masaPelayan: payload.masaPelayan || null,
    },
    amaran,
    ralat,
  };
}

export async function dapatkanWaktuSolat(pilihan = {}) {
  const config = binaKonfigurasi(pilihan.konfigurasi || {});
  const zon = pilihan.zon || config.eSolat.zon;
  const sekarang = pilihan.sekarang || new Date();
  const hariIni = tarikhISOMalaysia(sekarang, { zonMasa: config.zonMasa });
  const tarikh = pilihan.tarikh || hariIni;
  const kunci = binaKunciCache('waktu-solat', zon, tarikh);
  const ralat = [];

  if (!pilihan.paksaSegar) {
    const cache = bacaCache(kunci);
    if (cache?.nilai?.rekod?.tarikh === tarikh) return hasil(cache.nilai, 'cache');
  }

  // Endpoint "today" hanya sesuai untuk tarikh semasa Malaysia.
  if (pilihan.gunakanApi !== false && tarikh === hariIni) {
    try {
      const jadual = await ambilJadualESolat({
        endpoint: config.eSolat.endpoint,
        zon,
        tempoh: 'today',
        timeoutMs: config.eSolat.timeoutMs,
        percubaanSemula: config.eSolat.percubaanSemula,
        fetchImpl: pilihan.fetchImpl || globalThis.fetch,
        signal: pilihan.signal,
      });
      const rekod = cariRekod(jadual, tarikh);
      if (!rekod) throw new Error(`e-Solat tidak memulangkan rekod ${tarikh}.`);
      const payload = ringkaskan(jadual, rekod);
      tulisCache(kunci, payload, { ttlMs: config.eSolat.cacheMs });
      return hasil(payload, 'api');
    } catch (error) {
      ralat.push(mesejRalat(error));
    }
  }

  const cacheLama = bacaCache(kunci, { benarkanLuput: true });
  if (cacheLama?.nilai?.rekod?.tarikh === tarikh) {
    return hasil(
      cacheLama.nilai,
      'cache-luput',
      ['API langsung gagal; rekod e-Solat yang pernah disimpan digunakan.'],
      ralat
    );
  }

  if (pilihan.gunakanFallback !== false && config.fallbackUrl) {
    try {
      const jadual = await muatJadualFallback({
        url: config.fallbackUrl,
        fetchImpl: pilihan.fetchImplFallback || globalThis.fetch,
        signal: pilihan.signal,
      });
      if (jadual.zon !== zon) throw new Error(`Fallback tersedia untuk ${jadual.zon}, bukan ${zon}.`);
      const rekod = cariRekod(jadual, tarikh);
      if (!rekod) throw new Error(`Fallback tidak mempunyai rekod ${tarikh}.`);
      return hasil(
        ringkaskan(jadual, rekod),
        'fallback-json',
        ['Jadual JSON setempat digunakan; semak tarikh kemas kini sebelum penerbitan.'],
        ralat
      );
    } catch (error) {
      ralat.push(mesejRalat(error));
    }
  }

  return {
    tersedia: false,
    tarikh,
    hijrah: null,
    hari: null,
    zon,
    waktu: null,
    kiblat: null,
    sumber: null,
    amaran: ['Waktu solat tidak tersedia. Jangan anggarkan waktu secara manual.'],
    ralat,
  };
}
