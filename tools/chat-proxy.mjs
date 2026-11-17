/**
 * chat-proxy.mjs — proksi tempatan untuk chatbot NVIDIA NIM.
 *
 * Mengapa proksi diperlukan:
 *   Laman ini statik (GitHub Pages). Kunci API tidak boleh diletakkan dalam
 *   JavaScript pelayar kerana sesiapa sahaja boleh membacanya. Proksi ini
 *   menyimpan kunci di pelayan dan hanya menghantar permintaan yang sah.
 *
 * Guna:
 *   node tools/chat-proxy.mjs
 *   Lalai: http://127.0.0.1:8788/api/chat
 *
 * Kunci dibaca daripada .env (NVIDIA_API_KEY). Fail .env tidak pernah disajikan
 * oleh tools/serve.mjs dan sudah disenaraikan dalam .gitignore.
 *
 * Produksi: gunakan worker/nvidia-chat-worker.js di Cloudflare Workers.
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIMITS, MODEL, buildMessages } from '../worker/prompt.mjs';
import { flattenKonteks, streamNvidia } from '../worker/chat-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Baca dan ratakan pangkalan pengetahuan pada setiap permintaan. */
function bacaKonteks() {
  try {
    const data = JSON.parse(
      readFileSync(path.join(ROOT, 'data', 'chatbot-kontekst.json'), 'utf8')
    );
    return flattenKonteks(data);
  } catch (error) {
    console.error('Chatbot: gagal membaca data/chatbot-kontekst.json:', error.message);
    return '';
  }
}

function bacaEnv() {
  try {
    const teks = readFileSync(path.join(ROOT, '.env'), 'utf8');
    const hasil = {};
    for (const baris of teks.split(/\r?\n/)) {
      const padanan = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(baris);
      if (!padanan || baris.trimStart().startsWith('#')) continue;
      let nilai = padanan[2].trim();
      if (
        (nilai.startsWith('"') && nilai.endsWith('"')) ||
        (nilai.startsWith("'") && nilai.endsWith("'"))
      ) {
        nilai = nilai.slice(1, -1);
      }
      hasil[padanan[1]] = nilai;
    }
    return hasil;
  } catch {
    return {};
  }
}

const env = { ...bacaEnv(), ...process.env };
const PORT = Number(env.CHAT_PROXY_PORT || 8788);
const HOST = env.CHAT_PROXY_HOST || '127.0.0.1';
const KUNCI = env.NVIDIA_API_KEY || '';
const MODEL_SEMASA = env.NVIDIA_MODEL || MODEL;
const ASAL_DIBENARKAN = String(env.CHAT_ALLOWED_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (!KUNCI) {
  console.error('\n  NVIDIA_API_KEY tiada dalam .env.');
  console.error('  Tambah baris ini ke .env:');
  console.error('  NVIDIA_API_KEY=nvapi-...\n');
  process.exitCode = 1;
}

/** Had kadar ringkas dalam memori: 12 permintaan seminit bagi setiap IP. */
const kadar = new Map();

function dibenarkanKadar(ip) {
  const sekarang = Date.now();
  const rekod = (kadar.get(ip) || []).filter((masa) => sekarang - masa < 60_000);
  if (rekod.length >= 12) {
    kadar.set(ip, rekod);
    return false;
  }
  rekod.push(sekarang);
  kadar.set(ip, rekod);
  return true;
}

setInterval(() => {
  const sekarang = Date.now();
  for (const [ip, rekod] of kadar) {
    if (!rekod.some((masa) => sekarang - masa < 60_000)) kadar.delete(ip);
  }
}, 5 * 60_000).unref();

function asalDibenarkan(origin) {
  if (!origin) return null;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return ASAL_DIBENARKAN.includes(origin) ? origin : null;
}

function headersCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function hantarJson(res, status, data, cors = {}) {
  const teks = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(teks),
    'Cache-Control': 'no-store',
    ...cors,
  });
  res.end(teks);
}

function bacaBadan(req) {
  return new Promise((resolve, reject) => {
    let saiz = 0;
    const bahagian = [];
    req.on('data', (chunk) => {
      saiz += chunk.length;
      if (saiz > LIMITS.maxBodyBytes) {
        reject(Object.assign(new Error('Badan permintaan terlalu besar.'), { status: 413 }));
        req.destroy();
        return;
      }
      bahagian.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(bahagian).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('JSON tidak sah.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const cors = asalDibenarkan(origin) ? headersCors(origin) : {};

  if (req.method === 'OPTIONS') {
    if (!origin || !asalDibenarkan(origin)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 - asal tidak dibenarkan');
    }
    res.writeHead(204, cors);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    return hantarJson(res, 200, {
      ok: true,
      model: MODEL_SEMASA,
      kunci: Boolean(KUNCI),
    }, cors);
  }

  if (url.pathname !== '/api/chat') {
    return hantarJson(res, 404, { error: 'Laluan tidak dijumpai.' }, cors);
  }

  if (req.method !== 'POST') {
    return hantarJson(res, 405, { error: 'Guna POST.' }, cors);
  }

  if (!KUNCI) {
    return hantarJson(res, 503, { error: 'Proksi belum dikonfigurasikan.' }, cors);
  }

  if (origin && !asalDibenarkan(origin)) {
    return hantarJson(res, 403, { error: 'Asal tidak dibenarkan.' });
  }

  const ip = req.socket.remoteAddress || 'tanpa-ip';
  if (!dibenarkanKadar(ip)) {
    return hantarJson(res, 429, { error: 'Terlalu banyak permintaan. Cuba sebentar lagi.' }, cors);
  }

  let messages;
  try {
    const badan = await bacaBadan(req);
    messages = buildMessages({ messages: badan.messages, konteks: bacaKonteks() });
  } catch (error) {
    return hantarJson(res, error.status || 400, { error: error.message }, cors);
  }

  const pengawal = new AbortController();
  const pemasa = setTimeout(() => pengawal.abort(), LIMITS.timeoutMs);
  res.on('close', () => {
    if (!res.writableEnded) pengawal.abort();
  });

  try {
    const upstream = await streamNvidia({
      apiKey: KUNCI,
      model: MODEL_SEMASA,
      messages,
      signal: pengawal.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const butiran = await upstream.text().catch(() => '');
      console.error(`NVIDIA ${upstream.status}: ${butiran.slice(0, 500)}`);
      const mesej =
        upstream.status === 401 || upstream.status === 403
          ? 'Kunci API NVIDIA tidak sah atau tiada akses kepada model.'
          : upstream.status === 429
            ? 'Had permintaan NVIDIA dicapai. Cuba sebentar lagi.'
            : 'Perkhidmatan AI tidak dapat dihubungi.';
      return hantarJson(res, 502, { error: mesej }, cors);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...cors,
    });

    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    if (
      error.name === 'AbortError' ||
      error.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
      error.code === 'ERR_STREAM_DESTROYED'
    ) {
      if (!res.headersSent) {
        return hantarJson(res, 504, { error: 'Permintaan AI tamat masa.' }, cors);
      }
      if (!res.writableEnded && !res.destroyed) res.end();
      return;
    }
    console.error('Ralat proksi:', error.message);
    if (!res.headersSent) {
      return hantarJson(res, 500, { error: 'Ralat dalaman proksi.' }, cors);
    }
    if (!res.writableEnded && !res.destroyed) res.end();
  } finally {
    clearTimeout(pemasa);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} sudah digunakan. Tukar CHAT_PROXY_PORT dalam .env.\n`);
  } else {
    console.error('\n  Proksi gagal dimulakan:', error.message, '\n');
  }
  process.exitCode = 1;
});

if (KUNCI) {
  server.listen(PORT, HOST, () => {
    console.log(`\n  Proksi chatbot: http://${HOST}:${PORT}/api/chat`);
    console.log(`  Model: ${MODEL_SEMASA}`);
    console.log(`  Kunci: ${KUNCI.slice(0, 8)}… (disembunyikan)`);
    console.log('  Tekan Ctrl+C untuk berhenti.\n');
  });
}
