/** Cache selamat: localStorage jika ada, memori jika akses storan disekat. */

const AWALAN = 'perkim:web-api:v1:';
const memori = new Map();

function storan() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = `${AWALAN}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function nama(kunci) {
  return `${AWALAN}${kunci}`;
}

export function tulisCache(kunci, nilai, { ttlMs = 0, sekarang = Date.now() } = {}) {
  const rekod = {
    versi: 1,
    disimpanPada: sekarang,
    luputPada: ttlMs > 0 ? sekarang + ttlMs : null,
    nilai,
  };
  const teks = JSON.stringify(rekod);
  memori.set(nama(kunci), teks);
  try {
    storan()?.setItem(nama(kunci), teks);
  } catch {
    // Cache memori masih boleh digunakan.
  }
  return rekod;
}

export function bacaCache(
  kunci,
  { benarkanLuput = false, sekarang = Date.now() } = {}
) {
  const key = nama(kunci);
  let teks = null;
  try {
    teks = storan()?.getItem(key) || null;
  } catch {
    // Jatuh balik kepada memori.
  }
  if (!teks) teks = memori.get(key) || null;
  if (!teks) return null;

  try {
    const rekod = JSON.parse(teks);
    if (rekod.versi !== 1 || !Object.hasOwn(rekod, 'nilai')) throw new Error('format');
    const luput = Number.isFinite(rekod.luputPada) && sekarang >= rekod.luputPada;
    if (luput && !benarkanLuput) return null;
    return { ...rekod, luput };
  } catch {
    padamCache(kunci);
    return null;
  }
}

export function padamCache(kunci) {
  const key = nama(kunci);
  memori.delete(key);
  try {
    storan()?.removeItem(key);
  } catch {
    // Tiada tindakan diperlukan.
  }
}

export function binaKunciCache(...bahagian) {
  return bahagian.map((item) => encodeURIComponent(String(item))).join(':');
}
