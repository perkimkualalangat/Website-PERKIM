#!/usr/bin/env node
/**
 * check-motion.mjs — audit sistem gerakan.
 *
 * Guna: node tools/check-motion.mjs
 *
 * Menyemak:
 *   1. data/motion.json sah dan tiada id berganda
 *   2. setiap komponen ada fallback reduced-motion dan sasaran sentuh
 *   3. setiap pemilih wujud dalam CSS projek
 *   4. tiada `transition: all`
 *   5. tiada durasi > 400ms (kecuali token)
 *   6. tiada animasi sifat bukan GPU (amaran)
 *   7. kelas orphan dalam CSS (amaran)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const errors = [];
const warnings = [];

/* ---------- 1. Inventori ---------- */

let motion;
try {
  motion = JSON.parse(read('data/motion.json'));
} catch (error) {
  console.error('GAGAL: data/motion.json tidak sah —', error.message);
  process.exit(1);
}

const entries = Array.isArray(motion.komponen) ? motion.komponen : [];
if (entries.length === 0) errors.push('data/motion.json: tiada komponen didaftarkan');

const seen = new Set();
for (const entry of entries) {
  const label = entry.id || '(tanpa id)';
  if (!entry.id) errors.push(`${label}: medan "id" tiada`);
  if (seen.has(entry.id)) errors.push(`${label}: id berganda`);
  seen.add(entry.id);
  if (!entry.kurang_gerakan) errors.push(`${label}: tiada fallback "kurang_gerakan"`);
  if (typeof entry.sasaran_px !== 'number') errors.push(`${label}: "sasaran_px" mesti nombor`);
  if (!Array.isArray(entry.picu) || entry.picu.length === 0) {
    errors.push(`${label}: tiada senarai "picu"`);
  }
}

/* ---------- Kumpul CSS projek ---------- */

const cssFiles = [];
function collectCss(dir) {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, item.name).replace(/\\/g, '/');
    if (item.isDirectory()) {
      if (item.name === 'vendor' || item.name === 'node_modules') continue;
      collectCss(rel);
    } else if (item.name.endsWith('.css')) {
      cssFiles.push(rel);
    }
  }
}
collectCss('css');
if (fs.existsSync(path.join(root, 'dev'))) collectCss('dev');

const css = cssFiles.map((f) => ({ file: f, text: read(f).replace(/\/\*[\s\S]*?\*\//g, '') }));

/* ---------- 2. Pemilih wujud ---------- */

const allCss = css.map((c) => c.text).join('\n');
for (const entry of entries) {
  const selector = entry.pemilih || '';
  const classes = [...selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
  if (classes.length === 0) {
    warnings.push(`${entry.id}: pemilih "${selector}" tiada kelas`);
    continue;
  }
  for (const cls of classes) {
    if (!new RegExp(`\\.${cls}(?![a-zA-Z0-9_-])`).test(allCss)) {
      errors.push(`${entry.id}: kelas .${cls} tidak dijumpai dalam CSS`);
    }
  }
}

/* ---------- 3–5. Kebersihan CSS ---------- */

const MAX_MS = 400;

for (const { file, text } of css) {
  if (file.includes('vendor')) continue;

  if (/transition\s*:\s*all\b/.test(text)) {
    errors.push(`${file}: transition: all dijumpai`);
  }

  for (const decl of text.matchAll(/(transition|animation)(?:-[a-z]+)?\s*:\s*([^;}]+)/g)) {
    const value = decl[2].trim();
    if (value.includes('var(') || value.includes('calc(')) continue;

    for (const dur of value.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
      const ms = dur[2] === 's' ? parseFloat(dur[1]) * 1000 : parseFloat(dur[1]);
      if (ms > MAX_MS) {
        errors.push(`${file}: durasi ${dur[0]} melebihi ${MAX_MS}ms (${value.slice(0, 60)})`);
      }
    }

    if (/\b(height|width|top|left|right|bottom|margin|padding)\b/.test(value)) {
      warnings.push(`${file}: transisi sifat bukan GPU (${decl[1]}: ${value.slice(0, 50)})`);
    }

    // `overlay`/`display` hanya dibenarkan bersama `allow-discrete`
    // (corak penutupan semula CSS untuk <dialog>).
    if (/\b(overlay|display)\b/.test(value) && !/allow-discrete/.test(value)) {
      errors.push(`${file}: "${decl[1]}" bagi overlay/display mesti guna allow-discrete`);
    }
  }
}

/* ---------- 6. Kelas orphan ---------- */

const sources = [];
function collectSource(dir) {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, item.name).replace(/\\/g, '/');
    if (item.isDirectory()) {
      if (['vendor', 'node_modules', '.git', 'assets'].includes(item.name)) continue;
      collectSource(rel);
    } else if (/\.(html|js)$/.test(item.name)) {
      sources.push(read(rel));
    }
  }
}
for (const dir of ['.', 'pages', 'js', 'dev']) {
  if (fs.existsSync(path.join(root, dir))) collectSource(dir);
}
const sourceText = sources.join('\n');

/** Buang blok pengisytiharan supaya hanya pemilih yang tinggal. */
function selectorsOnly(text) {
  return text
    .replace(/url\([^)]*\)/g, '')
    .replace(/@[a-zA-Z-]+[^;{]*\{[^{}]*\}/g, '')
    .replace(/\{[^{}]*\}/g, '')
    .replace(/@[a-zA-Z-]+[^;{]*;/g, '');
}

const declared = new Set();
for (const { text } of css) {
  for (const m of selectorsOnly(text).matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]+)/g)) declared.add(m[1]);
}
const registered = new Set();
for (const entry of entries) {
  for (const m of (entry.pemilih || '').matchAll(/\.([a-zA-Z0-9_-]+)/g)) registered.add(m[1]);
}

const orphans = [...declared].filter(
  (cls) => !sourceText.includes(cls) && !registered.has(cls)
);

/* ---------- Laporan ---------- */

const siap = entries.filter((e) => e.status === 'siap').length;
const menunggu = entries.filter((e) => e.status === 'menunggu').length;

console.log('\n  Audit gerakan — PERKIM Kuala Langat');
console.log('  ' + '-'.repeat(44));
console.log(`  Inventori   : ${entries.length} komponen (${siap} siap, ${menunggu} menunggu)`);
console.log(`  Fail CSS    : ${css.length}`);
console.log(`  Fallback    : ${entries.filter((e) => e.kurang_gerakan).length}/${entries.length}`);
console.log(`  Ralat       : ${errors.length}`);
console.log(`  Amaran      : ${warnings.length}`);

if (warnings.length) {
  console.log('\n  Amaran:');
  for (const w of warnings.slice(0, 12)) console.log(`   - ${w}`);
  if (warnings.length > 12) console.log(`   ... dan ${warnings.length - 12} lagi`);
}

if (orphans.length) {
  console.log(`\n  Kelas tanpa rujukan (${orphans.length}):`);
  console.log('   ' + orphans.slice(0, 14).join(', ') + (orphans.length > 14 ? ', ...' : ''));
}

if (errors.length) {
  console.log('\n  Ralat:');
  for (const e of errors) console.log(`   x ${e}`);
  console.log('');
  process.exit(1);
}

console.log('\n  Lulus: tiada ralat.\n');
