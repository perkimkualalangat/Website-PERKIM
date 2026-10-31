/**
 * serve.mjs - pelayan statik kecil tanpa kebergantungan luar.
 *
 * Guna: node tools/serve.mjs [port]
 * Lalai: 8081. Akar laman ialah folder induk fail ini.
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8081);

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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    // Fail tersembunyi (.git, .env, dsb.) tidak pernah disajikan.
    if (pathname.split('/').some((segment) => segment.startsWith('.'))) {
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
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 - ralat pelayan');
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

server.listen(port, () => {
  console.log(`\n  Pelayan berjalan: http://localhost:${port}`);
  console.log(`  Folder: ${root}`);
  console.log('  Tekan Ctrl+C untuk berhenti.\n');
});
