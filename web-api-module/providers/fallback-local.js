/** Muat jadual setempat apabila API langsung tidak tersedia. */

import { DEFAULT_CONFIG } from '../config.js';
import { dapatkanJSON } from '../core/api-client.js';
import { sahkanJadualDinormalisasi } from '../core/validators.js';

export async function muatJadualFallback({
  url = DEFAULT_CONFIG.fallbackUrl,
  timeoutMs = 3000,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  const payload = await dapatkanJSON(url, { timeoutMs, fetchImpl, signal });
  if (payload?.schema !== 1 || !payload.data) {
    throw new TypeError('Skema fail fallback tidak disokong.');
  }
  const data = sahkanJadualDinormalisasi(payload.data);
  return {
    ...data,
    dijanaPada: payload.dijanaPada || null,
    mod: 'fallback-json',
  };
}
