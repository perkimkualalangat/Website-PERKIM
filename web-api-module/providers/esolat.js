/** Penyesuai khusus untuk API takwim e-Solat JAKIM. */

import { DEFAULT_CONFIG } from '../config.js';
import { dapatkanJSON } from '../core/api-client.js';
import { normalisasiResponsESolat } from '../core/validators.js';

const TEMPOH = new Set(['today', 'week', 'month', 'year']);

export function binaUrlESolat({
  endpoint = DEFAULT_CONFIG.eSolat.endpoint,
  zon = DEFAULT_CONFIG.eSolat.zon,
  tempoh = DEFAULT_CONFIG.eSolat.tempoh,
} = {}) {
  if (!/^[A-Z]{3}\d{2}$/.test(zon)) throw new TypeError('Kod zon e-Solat tidak sah.');
  if (!TEMPOH.has(tempoh)) throw new TypeError(`Tempoh e-Solat tidak disokong: ${tempoh}`);
  const url = new URL(endpoint);
  url.searchParams.set('r', 'esolatApi/takwimsolat');
  url.searchParams.set('period', tempoh);
  url.searchParams.set('zone', zon);
  return url;
}

export async function ambilJadualESolat({
  endpoint = DEFAULT_CONFIG.eSolat.endpoint,
  zon = DEFAULT_CONFIG.eSolat.zon,
  tempoh = DEFAULT_CONFIG.eSolat.tempoh,
  timeoutMs = DEFAULT_CONFIG.eSolat.timeoutMs,
  percubaanSemula = DEFAULT_CONFIG.eSolat.percubaanSemula,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  const url = binaUrlESolat({ endpoint, zon, tempoh });
  const payload = await dapatkanJSON(url, {
    timeoutMs,
    percubaanSemula,
    fetchImpl,
    signal,
  });
  return normalisasiResponsESolat(payload, {
    url: url.href,
    diperolehPada: new Date().toISOString(),
  });
}
