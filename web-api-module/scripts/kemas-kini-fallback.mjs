/**
 * Jana semula JSON fallback tahunan daripada e-Solat.
 * Guna: node web-api-module/scripts/kemas-kini-fallback.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZON_ESOLAT_KUALA_LANGAT } from '../config.js';
import { ambilJadualESolat } from '../providers/esolat.js';

function nilaiArgumen(nama, nilaiLalai) {
  const index = process.argv.indexOf(nama);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : nilaiLalai;
}

const zon = nilaiArgumen('--zon', ZON_ESOLAT_KUALA_LANGAT);
const tempoh = nilaiArgumen('--tempoh', 'year');
const sasaranUrl = new URL('../data/waktu-solat-fallback.json', import.meta.url);
const sasaran = fileURLToPath(sasaranUrl);

try {
  const data = await ambilJadualESolat({
    zon,
    tempoh,
    timeoutMs: 30000,
    percubaanSemula: 1,
  });
  if (tempoh === 'year' && data.rekod.length < 365) {
    throw new Error(`Jadual tahunan tidak lengkap (${data.rekod.length} rekod).`);
  }

  const output = {
    schema: 1,
    dijanaPada: new Date().toISOString(),
    nota: 'Janaan e-Solat JAKIM untuk kegunaan fallback; jangan sunting secara manual.',
    data,
  };
  await mkdir(dirname(sasaran), { recursive: true });
  await writeFile(sasaran, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Fallback ${zon}/${tempoh}: ${data.rekod.length} rekod -> ${sasaran}`);
} catch (error) {
  console.error('Gagal menjana fallback:', error.message);
  process.exitCode = 1;
}
