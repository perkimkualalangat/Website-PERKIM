/**
 * serve.mjs - pelayan statik kecil tanpa kebergantungan luar.
 *
 * Guna: node tools/serve.mjs [port]
 * Lalai: 8081. Akar laman ialah folder induk fail ini.
 *
 * Pelayan ini juga menyediakan API /api/tetapan/* untuk halaman Tetapan.
 * Ia hanya mendengar pada 127.0.0.1 supaya alat tempatan tidak terdedah
 * kepada rangkaian.
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8081);
const host = '127.0.0.1';

const MAX_JSON_BODY = 2 * 1024 * 1024;
const MAX_IMAGE_BODY = 30 * 1024 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const NOT_FOUND = `<!DOCTYPE html>
<html lang="ms"><head><meta charset="utf-8"><title>404</title>
<style>body{font-family:system-ui,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.5rem;color:#1f2933}
a{color:#0b6b3a}</style></head>
<body><h1>404 - Halaman tidak dijumpai</h1>
<p>Fail yang diminta tiada dalam folder laman ini.</p>
<p><a href="/">Kembali ke laman utama</a></p></body></html>`;

function resolvePython() {
  if (process.env.PYTHON) return process.env.PYTHON;
  if (process.platform === 'win32') {
    const probe = spawnSync('py', ['-3', '--version'], { stdio: 'ignore', windowsHide: true });
    if (!probe.error && probe.status === 0) return 'py';
  }
  return 'python';
}

const PYTHON = resolvePython();
let busy = false;

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  let start;
  let end;
  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { start, end };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        reject(Object.assign(new Error('Saiz permintaan terlalu besar.'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!tooLarge) resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function runPython(script, args = [], input = null, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const child = spawn(PYTHON, [path.join('tools', script), ...args], {
      cwd: root,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ code: -1, stdout, stderr: `${stderr}\nProses melebihi had masa.`.trim() });
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      finish({ code: -1, stdout, stderr: error.message });
    });
    child.on('close', (code) => {
      finish({ code, stdout, stderr });
    });
    if (input !== null) child.stdin.end(input);
    else child.stdin.end();
  });
}

function parseScriptJson(result, fallbackMessage) {
  const text = result.stdout.trim();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      // Teruskan ke ralat di bawah.
    }
  }
  return {
    ok: false,
    ralat: [fallbackMessage || 'Skrip tidak memulangkan JSON yang sah.'],
    amaran: [],
    stderr: result.stderr.trim(),
    kod: result.code,
  };
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function cleanImageName(rawName, extension) {
  const base = String(rawName || '').replace(/\\/g, '/').split('/').pop() || '';
  const withoutExtension = base.replace(/\.[^.]+$/, '');
  const stem = withoutExtension
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  return `${stem || 'gambar'}${extension}`;
}

function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return '.png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return '.webp';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 4, 8) === 'ftyp' &&
    ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12))
  ) {
    return '.avif';
  }
  return null;
}

async function writeUniqueImage(folder, name, buffer) {
  const extension = path.extname(name);
  const stem = name.slice(0, -extension.length);
  for (let index = 1; index < 1000; index += 1) {
    const candidate = index === 1 ? name : `${stem}-${index}${extension}`;
    const target = path.join(folder, candidate);
    try {
      await writeFile(target, buffer, { flag: 'wx' });
      return { target, name: candidate };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Tidak dapat memilih nama fail unik.');
}

async function handleApi(req, res, url, pathname) {
  if (pathname === '/api/tetapan/status' && req.method === 'GET') {
    const result = await runPython('bina_aktiviti.py', ['--status', '--json']);
    return sendJson(res, 200, parseScriptJson(result, 'Gagal membaca status program.'));
  }

  if (!pathname.startsWith('/api/tetapan/')) {
    sendJson(res, 404, { ok: false, ralat: ['Endpoint tidak ditemui.'] });
    return;
  }

  const action = pathname.slice('/api/tetapan/'.length);

  // Imbas gambar hanya membaca fail; GET dibenarkan tanpa semakan Origin.
  if (action === 'program' && (req.method === 'GET' || req.method === 'POST')) {
    const slug = url.searchParams.get('slug') || '';
    if (!SLUG.test(slug)) {
      sendJson(res, 400, { ok: false, ralat: ['Slug tidak sah.'] });
      return;
    }
    const result = await runPython('urus_program.py', ['imbas', '--slug', slug]);
    sendJson(res, 200, parseScriptJson(result, 'Gagal mengimbas gambar program.'));
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { ok: false, ralat: ['Gunakan POST untuk endpoint ini.'] });
    return;
  }

  if (!checkOrigin(req)) {
    sendJson(res, 403, { ok: false, ralat: ['Origin tidak dibenarkan.'] });
    return;
  }

  if (action === 'kemaskini') {
    if (busy) {
      sendJson(res, 409, { ok: false, ralat: ['Proses lain sedang berjalan. Cuba sebentar.'] });
      return;
    }
    busy = true;
    try {
      const result = await runPython('bina_aktiviti.py', ['--json']);
      sendJson(res, 200, parseScriptJson(result, 'Gagal menjana data aktiviti.'));
    } finally {
      busy = false;
    }
    return;
  }

  if (action === 'semak') {
    const result = await runPython('bina_aktiviti.py', ['--semak', '--json']);
    sendJson(res, 200, parseScriptJson(result, 'Gagal menyemak data aktiviti.'));
    return;
  }

  if (action === 'semak-tapak') {
    const result = await runPython('check-site.py', []);
    sendJson(res, 200, {
      ok: result.code === 0,
      output: [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n'),
      kod: result.code,
    });
    return;
  }

  if (action === 'cipta') {
    if (busy) {
      sendJson(res, 409, { ok: false, ralat: ['Proses lain sedang berjalan. Cuba sebentar.'] });
      return;
    }
    let payload;
    try {
      payload = JSON.parse((await readBody(req, MAX_JSON_BODY)).toString('utf8'));
    } catch (error) {
      sendJson(res, error.status || 400, {
        ok: false,
        ralat: [error.status === 413 ? 'Data terlalu besar.' : 'JSON tidak sah.'],
      });
      return;
    }
    busy = true;
    try {
      const result = await runPython(
        'urus_program.py',
        ['cipta', '--data', '-'],
        JSON.stringify(payload)
      );
      sendJson(res, 200, parseScriptJson(result, 'Gagal mencipta program.'));
    } finally {
      busy = false;
    }
    return;
  }

  if (action === 'simpan-gambar') {
    if (busy) {
      sendJson(res, 409, { ok: false, ralat: ['Proses lain sedang berjalan. Cuba sebentar.'] });
      return;
    }
    let payload;
    try {
      payload = JSON.parse((await readBody(req, MAX_JSON_BODY)).toString('utf8'));
    } catch (error) {
      sendJson(res, error.status || 400, {
        ok: false,
        ralat: [error.status === 413 ? 'Data terlalu besar.' : 'JSON tidak sah.'],
      });
      return;
    }
    busy = true;
    try {
      const result = await runPython(
        'urus_program.py',
        ['simpan-gambar', '--data', '-'],
        JSON.stringify(payload)
      );
      sendJson(res, 200, parseScriptJson(result, 'Gagal menyimpan senarai gambar.'));
    } finally {
      busy = false;
    }
    return;
  }

  if (action === 'upload') {
    const slug = url.searchParams.get('slug') || '';
    const requestedName = url.searchParams.get('nama') || '';
    if (!SLUG.test(slug)) {
      sendJson(res, 400, { ok: false, ralat: ['Slug tidak sah.'] });
      return;
    }
    if (busy) {
      sendJson(res, 409, { ok: false, ralat: ['Proses lain sedang berjalan. Cuba sebentar.'] });
      return;
    }

    let buffer;
    try {
      buffer = await readBody(req, MAX_IMAGE_BODY);
    } catch (error) {
      sendJson(res, error.status || 400, {
        ok: false,
        ralat: [error.status === 413 ? 'Saiz gambar melebihi 30 MB.' : 'Gagal membaca gambar.'],
      });
      return;
    }

    const extension = detectImage(buffer);
    if (!extension) {
      sendJson(res, 415, {
        ok: false,
        ralat: ['Format gambar tidak disokong. Guna JPG, PNG, WebP atau AVIF.'],
      });
      return;
    }

    const folder = path.join(root, 'program', slug);
    const folderInfo = await stat(folder).catch(() => null);
    if (!folderInfo || !folderInfo.isDirectory()) {
      sendJson(res, 404, { ok: false, ralat: [`Folder program/${slug} tidak ditemui.`] });
      return;
    }

    busy = true;
    try {
      const name = cleanImageName(requestedName, extension);
      const { name: finalName } = await writeUniqueImage(folder, name, buffer);
      sendJson(res, 200, {
        ok: true,
        nama: finalName,
        src: `program/${slug}/${finalName}`,
        saiz: buffer.length,
      });
    } catch (error) {
      sendJson(res, 500, { ok: false, ralat: [`Gagal menyimpan gambar: ${error.message}`] });
    } finally {
      busy = false;
    }
    return;
  }

  sendJson(res, 404, { ok: false, ralat: ['Endpoint Tetapan tidak ditemui.'] });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, url, pathname);
      return;
    }

    // Fail tersembunyi (.git, .env, dsb.) dan sandaran tidak pernah disajikan.
    if (
      pathname.split('/').some((segment) => segment.startsWith('.')) ||
      pathname.endsWith('.bak') ||
      pathname.endsWith('.tmp')
    ) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(NOT_FOUND);
    }

    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 - akses ditolak');
    }

    const info = await stat(file).catch(() => null);
    if (!info) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(NOT_FOUND);
    }
    if (info.isDirectory()) {
      res.writeHead(301, { Location: pathname.replace(/\/?$/, '/') });
      return res.end();
    }

    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };

    const range = req.headers.range ? parseRange(req.headers.range, info.size) : null;
    if (req.headers.range && !range) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }

    if (range) {
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${range.start}-${range.end}/${info.size}`,
        'Content-Length': range.end - range.start + 1,
      });
      if (req.method === 'HEAD') return res.end();
      return createReadStream(file, { start: range.start, end: range.end }).pipe(res);
    }

    res.writeHead(200, { ...headers, 'Content-Length': info.size });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  } catch (error) {
    console.error('Ralat pelayan:', error.message);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, ralat: [`Ralat pelayan: ${error.message}`] });
      return;
    }
    res.end();
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  Port ${port} sudah digunakan.`);
    console.error(`  Tutup pelayan lain, atau jalankan: start.bat ${port + 1}\n`);
  } else {
    console.error('\n  Pelayan gagal dimulakan:', error.message, '\n');
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`\n  Pelayan berjalan: http://${host}:${port}`);
  console.log(`  Folder: ${root}`);
  console.log(`  Python: ${PYTHON}`);
  console.log('  Tekan Ctrl+C untuk berhenti.\n');
});
