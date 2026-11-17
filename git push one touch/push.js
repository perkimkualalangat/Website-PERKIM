/* push.js — push projek ke GitHub menggunakan token dalam .env
   Generik: tiada pakej luar. Perlu Node.js 18+ dan Git.
   Token TIDAK disimpan dalam .git/config.

   Guna:
     node push.js                        commit automatik + push
     node push.js "mesej commit"         commit dengan mesej sendiri
     node push.js --dry-run              tunjuk apa yang akan berlaku (tiada tulis/commit/push)
     node push.js --root "C:\laluan"     paksa akar projek lain

   Akar projek dikesan automatik: folder skrip ini, atau ibu bapa terdekat
   yang mempunyai .git (jadi skrip boleh duduk dalam subfolder).
   .env dibaca daripada akar projek dahulu, kemudian folder skrip ini.
*/
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;

function die(m) {
  console.error('\n❌ ' + m);
  process.exit(1);
}

/* ---------- 0. Argumen ---------- */
function usage() {
  console.log(`
Push satu sentuhan — PERKIM Kuala Langat

  node push.js [pilihan] [mesej commit]

Pilihan:
  --dry-run, -n     Semak sahaja: tiada .gitignore ditulis, tiada commit, tiada push.
  --verify          Uji token & akses repo sahaja (tiada commit/push).
  --root <folder>   Paksa akar projek (lalai: dikesan automatik).
  --help, -h        Tunjuk bantuan ini.

Contoh:
  node push.js "Betulkan menu mudah alih"
  node push.js --dry-run
  node push.js --verify
`);
}

const argv = process.argv.slice(2);
const msgParts = [];
let DRY = false;
let VERIFY = false;
let ROOT_OVERRIDE = process.env.GIT_ROOT || '';

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];

  if (a === '--dry-run' || a === '-n') {
    DRY = true;
  } else if (a === '--verify') {
    VERIFY = true;
  } else if (a === '--help' || a === '-h') {
    usage();
    process.exit(0);
  } else if (a === '--root') {
    ROOT_OVERRIDE = argv[++i] || '';
    if (!ROOT_OVERRIDE) die('--root perlukan laluan folder.');
  } else if (a.startsWith('--root=')) {
    ROOT_OVERRIDE = a.slice('--root='.length);
  } else {
    msgParts.push(a);
  }
}

/* ---------- 1. Cari akar projek ---------- */
function hasGit(dir) {
  const g = path.join(dir, '.git');
  return fs.existsSync(g); // folder (.git/) atau fail (.git untuk worktree)
}

function findRoot(start) {
  let dir = path.resolve(start);

  for (;;) {
    if (hasGit(dir)) return dir;

    const up = path.dirname(dir);
    if (up === dir) return null; // sudah sampai ke akar pemacu
    dir = up;
  }
}

const ROOT = ROOT_OVERRIDE
  ? path.resolve(ROOT_OVERRIDE)
  : (findRoot(HERE) || HERE);

if (!fs.existsSync(ROOT)) die('Akar projek tidak wujud: ' + ROOT);

/* ---------- 2. Baca .env ---------- */
function loadEnv(file) {
  const o = {};

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;

    const m = s.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;

    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    o[m[1]] = v;
  }
  return o;
}

const ENV_CANDIDATES = [path.join(ROOT, '.env'), path.join(HERE, '.env')];
const ENV_FILE = ENV_CANDIDATES.find(f => fs.existsSync(f));

if (!ENV_FILE) {
  die(
    'Fail .env tiada. Salin .env.example kepada .env (dalam "'
    + path.relative(process.cwd(), HERE) + '" atau akar projek) dan isi token.'
  );
}

const E = loadEnv(ENV_FILE);

for (const k of ['GITHUB_USER', 'GITHUB_REPO']) {
  if (!E[k] || /^ISI_/.test(E[k])) {
    die(`${k} belum diisi dalam ${path.basename(ENV_FILE)}`);
  }
}

if (!DRY && !(E.GITHUB_TOKEN && !/^ISI_/i.test(E.GITHUB_TOKEN))) {
  die(`GITHUB_TOKEN belum diisi dalam ${path.basename(ENV_FILE)}`);
}

/* Terima nama biasa ATAU URL penuh:
   https://github.com/user/repo.git
   git@github.com:user/repo.git
   user/repo
*/
(function normalizeRemote() {
  const strip = s => String(s).trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/\.git\/?$/i, '')
    .replace(/^\/+|\/+$/g, '');

  let u = strip(E.GITHUB_USER);
  let r = strip(E.GITHUB_REPO);

  if (r.includes('/')) {
    const p = r.split('/');
    u = p[0];
    r = p[1];
  } else if (u.includes('/')) {
    u = u.split('/')[0];
  }

  if (!/^[\w.-]+$/.test(u) || !/^[\w.-]+$/.test(r)) {
    die(`Nama pengguna/repo tidak sah: "${u}" / "${r}"`);
  }

  E.GITHUB_USER = u;
  E.GITHUB_REPO = r;
})();

const BRANCH = E.GITHUB_BRANCH || 'main';
const TOKEN = E.GITHUB_TOKEN || '';
const TOKEN_SAH = !!TOKEN && !/^ISI_/i.test(TOKEN);
const REMOTE = `https://github.com/${E.GITHUB_USER}/${E.GITHUB_REPO}.git`;
const AUTH = 'Authorization: Basic '
  + Buffer.from('x-access-token:' + TOKEN).toString('base64');
const AUTH_B64 = AUTH.split(' ').pop();

/* ---------- 3. Pembantu git (token disorok daripada output) ---------- */
function mask(s) {
  if (!TOKEN_SAH) return String(s);

  return String(s)
    .split(TOKEN).join('***')
    .split(AUTH_B64).join('***');
}

function git(args, { auth = false, soft = false, env = null } = {}) {
  // Token disalurkan sebagai header; credential helper dimatikan supaya git
  // tidak pernah membuka prompt (yang boleh menggantung push.bat).
  const base = ['-c', 'credential.helper=', '-c', 'core.askPass='];
  const a = auth
    ? [...base, '-c', 'http.extraheader=' + AUTH, ...args]
    : [...base, ...args];

  try {
    return execFileSync('git', a, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GCM_INTERACTIVE: 'never',
        GIT_ASKPASS: 'echo',
        SSH_ASKPASS: 'echo',
        ...(env || {})
      }
    }).trim();
  } catch (e) {
    if (soft) return null;

    const err = mask((e.stderr || '') + (e.stdout || '') || e.message);
    const x = new Error(err);
    x.stderr = err;
    throw x;
  }
}

try {
  git(['--version']);
} catch {
  die('Git tidak dipasang. Muat turun di https://git-scm.com');
}

/* ---------- 3b. Uji token sahaja (--verify) ---------- */
if (VERIFY) {
  console.log('🔑 Menguji token terhadap ' + REMOTE + ' …');

  try {
    const out = git(['ls-remote', '--heads', REMOTE, 'refs/heads/' + BRANCH], { auth: true });

    console.log('✅ Token sah & akses berjaya.');
    console.log(out
      ? '   ' + out.split('\n')[0]
      : `   (repo kosong — belum ada commit pada ${BRANCH})`);
    console.log('   Token ini boleh guna dengan push.bat.');
  } catch (e) {
    die(
      'Token ditolak atau tiada akses ke repo:\n'
      + e.stderr
      + '\nSemak: token belum luput, repo betul, Contents = Read and write.'
    );
  }

  process.exit(0);
}

/* ---------- 4. Pengesahan awal ---------- */
const GIT_DIR = path.join(ROOT, '.git');
const isRepo = fs.existsSync(GIT_DIR);

if (isRepo) {
  for (const f of ['MERGE_HEAD', 'rebase-merge', 'rebase-apply']) {
    if (fs.existsSync(path.join(GIT_DIR, f))) {
      die('Repo sedang dalam proses merge/rebase. Selesaikan dahulu (git status), kemudian cuba lagi.');
    }
  }
  if (fs.existsSync(path.join(GIT_DIR, 'index.lock'))) {
    die('Ada .git/index.lock. Tutup Git/editor lain, atau padam fail itu jika tiada proses git berjalan.');
  }
}

console.log('📦 Akar projek : ' + ROOT);
console.log('🌿 Cawangan    : ' + BRANCH);
console.log('🔗 Remote      : ' + REMOTE);
console.log('🔑 .env        : ' + ENV_FILE);
if (DRY) console.log('🧪 Mod         : dry-run (tiada perubahan ditulis)');

/* ---------- 5. Fail/pattern sulit ----------
   .env sentiasa dilindungi.
   Boleh tambah melalui GIT_SECRET_FILES dalam .env:
   GIT_SECRET_FILES=*.sqlite,config.local.json,*.pem
*/
const defaultSecret = ['.env'];
const envSecret = (E.GIT_SECRET_FILES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const SECRET = [...new Set([...defaultSecret, ...envSecret])];

const extraIgnore = (E.GIT_IGNORE_EXTRA || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ignorePatterns = [...new Set([...SECRET, ...extraIgnore])];

/* Padanan ringkas (glob) untuk semakan keselamatan staging. */
function globToRegExp(g) {
  const esc = g
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + esc + '$', 'i');
}

function isSecretFile(file, patterns) {
  const f = file.replace(/\\/g, '/');
  const base = f.split('/').pop();

  return patterns.some(raw => {
    const g = String(raw)
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .replace(/^\/+|\/+$/g, '');

    if (!g) return false;
    if (!/[*?]/.test(g)) {
      return f === g || base === g || f.startsWith(g + '/');
    }

    return globToRegExp(g).test(base) || globToRegExp(g).test(f);
  });
}

const GI_FILE = path.join(ROOT, '.gitignore');
let gi = fs.existsSync(GI_FILE) ? fs.readFileSync(GI_FILE, 'utf8') : '';

const existing = new Set(gi.split(/\r?\n/).map(x => x.trim()));
const tambah = ignorePatterns.filter(p => !existing.has(p));

if (tambah.length) {
  if (DRY) {
    console.log('🔒 (dry-run) .gitignore akan ditambah: ' + tambah.join(', '));
  } else {
    gi += (gi && !gi.endsWith('\n') ? '\n' : '')
      + '# ditambah oleh push.js\n'
      + tambah.join('\n')
      + '\n';

    fs.writeFileSync(GI_FILE, gi);
    console.log('🔒 .gitignore dikemas kini: ' + tambah.join(', '));
  }
}

/* ---------- 6. Sediakan repo ---------- */
if (!isRepo) {
  if (DRY) {
    console.log('📁 (dry-run) git init akan dijalankan');
    console.log('\n🧪 Repo git belum wujud — jalankan tanpa --dry-run untuk mula dari awal.');
    process.exit(0);
  }

  git(['init']);
  console.log('📁 Repo git dicipta');
}

if (!DRY) {
  git(['checkout', '-B', BRANCH], { soft: true });

  // Fallback untuk repo kosong yang belum ada commit.
  if (!git(['rev-parse', '--verify', 'HEAD'], { soft: true })) {
    git(['symbolic-ref', 'HEAD', 'refs/heads/' + BRANCH], { soft: true });
  }

  if (E.GIT_NAME) git(['config', 'user.name', E.GIT_NAME]);
  if (E.GIT_EMAIL) git(['config', 'user.email', E.GIT_EMAIL]);
}

if (
  !git(['config', 'user.name'], { soft: true }) ||
  !git(['config', 'user.email'], { soft: true })
) {
  die('Isi GIT_NAME dan GIT_EMAIL dalam .env, atau set git config --global user.name/user.email.');
}

const oldRemote = git(['remote', 'get-url', 'origin'], { soft: true });

if (oldRemote !== REMOTE) {
  if (oldRemote) console.log('🔁 Remote origin dikemas kini: ' + oldRemote + ' → ' + REMOTE);
  if (!DRY) {
    git(['remote', 'remove', 'origin'], { soft: true });
    git(['remote', 'add', 'origin', REMOTE]);
  }
}

/* Pastikan fail/pattern sulit tidak sedang dijejak */
for (const pattern of SECRET) {
  const tracked = git(['ls-files', '--', pattern], { soft: true });

  if (tracked) {
    const files = tracked.split('\n').filter(Boolean);

    if (files.length) {
      if (!DRY) git(['rm', '--cached', '-q', '--', ...files], { soft: true });
      console.log(`⚠️  ${files.join(', ')} dibuang daripada penjejakan (fail asal kekal).`);
      console.log('   Jika pernah di-push, ia MASIH ada dalam sejarah GitHub — tukar token / buang sejarah.');
    }
  }
}

/* ---------- 7. Commit ---------- */
const msg = msgParts.join(' ')
  || 'Kemas kini ' + new Date().toLocaleString('sv-SE').slice(0, 16);

const hasHead = !!git(['rev-parse', '--verify', 'HEAD'], { soft: true });

let staged;
let idxEnv = null;
let tmpIdx = null;

if (DRY) {
  // Pratonton tepat: guna index sementara, index sebenar tidak disentuh.
  const os = require('os');
  tmpIdx = path.join(os.tmpdir(), `pushjs-index-${process.pid}`);
  idxEnv = { GIT_INDEX_FILE: tmpIdx };

  const realIdx = path.join(GIT_DIR, 'index');
  if (fs.existsSync(realIdx)) fs.copyFileSync(realIdx, tmpIdx);

  git(['add', '-A'], { env: idxEnv });
  staged = ((git(['diff', '--cached', '--name-only'], { env: idxEnv }) || ''))
    .split('\n').filter(Boolean);
} else {
  git(['add', '-A']);
  staged = ((git(['diff', '--cached', '--name-only']) || '')).split('\n').filter(Boolean);
}

function buangIndexSementara() {
  if (!tmpIdx) return;

  for (const f of [tmpIdx, tmpIdx + '.lock']) {
    try { fs.unlinkSync(f); } catch { /* tiada */ }
  }
}

const leak = staged.filter(f => isSecretFile(f, SECRET));

if (leak.length) {
  if (DRY) {
    console.log('🔒 Akan di-ignore (tidak dikomit): ' + leak.join(', '));
    staged = staged.filter(f => !leak.includes(f));
  } else {
    git(['rm', '--cached', '-q', '--', ...leak], { soft: true });
    die(
      'Fail sulit dikesan dalam staging dan TIDAK akan dikomit:\n   '
      + leak.join('\n   ')
      + '\nSemak .gitignore / GIT_SECRET_FILES. Jika fail ini pernah di-push, tukar token sekarang.'
    );
  }
}

/* Jangan sesekali hantar token sendiri ke GitHub. */
if (TOKEN_SAH && staged.length) {
  const hit = git(['grep', '--cached', '-l', '-F', '-e', TOKEN], { soft: true, env: idxEnv });
  const bocor = (hit || '').split('\n').filter(Boolean)
    .filter(f => !isSecretFile(f, SECRET));

  if (bocor.length) {
    buangIndexSementara();
    die(
      'Nilai GITHUB_TOKEN ditemui dalam fail yang akan dikomit:\n   '
      + bocor.join('\n   ')
      + '\nBuang token daripada fail itu, kemudian tukar token di GitHub.'
    );
  }
}

if (DRY) {
  console.log(staged.length
    ? '📝 Fail yang AKAN dikomit (' + staged.length + '):\n   ' + staged.join('\n   ')
    : 'ℹ️  Tiada perubahan baharu untuk dikomit.');
  console.log('\n🧪 Dry-run selesai — tiada commit, tiada push.');
  buangIndexSementara();
  process.exit(0);
}

buangIndexSementara();

if (staged.length) {
  console.log('📝 Fail berubah:\n   ' + staged.join('\n   '));
  git(['commit', '-m', msg]);
  console.log('✅ Commit: ' + msg);
} else if (!hasHead) {
  die('Tiada fail untuk di-commit. Pastikan projek mempunyai fail selain .gitignore.');
} else {
  console.log('ℹ️  Tiada perubahan baharu untuk di-commit.');
}

/* ---------- 8. Push ---------- */
function push() {
  return git(['push', '-u', 'origin', BRANCH], { auth: true });
}

try {
  push();
} catch (e) {
  if (/rejected|fetch first|non-fast-forward/i.test(e.stderr)) {
    console.log('↻ Remote ada commit lain — cuba tarik (rebase) dahulu…');

    try {
      git(['pull', '--rebase', 'origin', BRANCH], { auth: true });
      push();
    } catch (e2) {
      die('Gagal selepas rebase:\n' + e2.stderr + '\nSelesaikan konflik secara manual.');
    }
  } else if (/401|403|Authentication|denied|not found|Repository not found/i.test(e.stderr)) {
    die(
      'Pengesahan gagal atau repo tiada. Semak token (Contents: Read and write), nama pengguna & repo.\n'
      + e.stderr
    );
  } else {
    die(e.stderr);
  }
}

console.log(`\n🚀 Berjaya push ke ${E.GITHUB_USER}/${E.GITHUB_REPO} (${BRANCH})`);
console.log(`🔗 https://github.com/${E.GITHUB_USER}/${E.GITHUB_REPO}`);

if (String(E.GITHUB_PAGES).toLowerCase() === 'true') {
  console.log(`🌐 https://${E.GITHUB_USER.toLowerCase()}.github.io/${E.GITHUB_REPO}/ (tunggu ~1 minit untuk Pages)`);
}
