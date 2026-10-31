/**
 * motion-lab.js — alat dalaman untuk menyemak micro-interaction.
 *
 * Tidak dipautkan dari mana-mana halaman awam.
 */
import { esc } from '../js/modules/utils.js';
import { siteUrl } from '../js/paths.js';

/* ---------- Kawalan ---------- */

const speedGroup = document.getElementById('speed');
const reduceSwitch = document.getElementById('reduce');

speedGroup?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-speed]');
  if (!button) return;

  const factor = Number(button.dataset.speed);
  document.documentElement.style.setProperty('--motion-move', String(factor));

  speedGroup.querySelectorAll('button').forEach((other) => {
    other.setAttribute('aria-checked', String(other === button));
  });
});

reduceSwitch?.addEventListener('click', () => {
  const active = reduceSwitch.getAttribute('aria-checked') === 'true';
  reduceSwitch.setAttribute('aria-checked', String(!active));
  reduceSwitch.querySelector('.lab__switch-text').textContent = !active ? 'On' : 'Mati';
  document.documentElement.classList.toggle('reduce-motion', !active);
});

/* ---------- Demo komponen ---------- */

const DEMOS = [
  {
    id: 'butang-utama',
    title: 'Butang utama',
    body: 'Hover, tekan, dan fokus papan kekunci.',
    html: '<button type="button" class="btn">Mula sekarang</button>',
  },
  {
    id: 'butang-hantu',
    title: 'Butang garis',
    body: 'Varian tanpa latar penuh.',
    html: '<button type="button" class="btn btn--ghost">Lihat lanjut</button>',
  },
  {
    id: 'kad-status',
    title: 'Kad status',
    body: 'Angkat 2px dan bayang meluas.',
    html: '<div class="lab__demo-card"><h4>Status laman</h4><p>Bahagian atas.</p></div>',
  },
  {
    id: 'penapis-chip',
    title: 'Cip penapis',
    body: 'Keadaan aktif dan hover.',
    html:
      '<div class="lab__demo-row">' +
      '<button type="button" class="chip" aria-pressed="true">Semua</button>' +
      '<button type="button" class="chip" aria-pressed="false">Berita</button>' +
      '<button type="button" class="chip" aria-pressed="false">Kebajikan</button>' +
      '</div>',
  },
  {
    id: 'borang-medan',
    title: 'Medan borang',
    body: 'Fokus danTecno keadaan tidak sah.',
    html:
      '<div class="field" style="gap:.35rem">' +
      '<label for="lab-nama">Nama</label>' +
      '<input id="lab-nama" type="text" placeholder="Nama penuh" style="width:100%;padding:.6rem .75rem;border:1px solid var(--c-border);border-radius:8px;font:inherit">' +
      '</div>',
  },
  {
    id: 'pautan-sosial',
    title: 'Ikon sosial',
    body: 'Bulatan menyala dan ikon naik.',
    html:
      '<div class="lab__demo-row social-links">' +
      '<a class="social-link" href="#" aria-label="Facebook"><span class="icon" aria-hidden="true">f</span></a>' +
      '<a class="social-link" href="#" aria-label="Instagram"><span class="icon" aria-hidden="true">◎</span></a>' +
      '<a class="social-link" href="#" aria-label="WhatsApp"><span class="icon" aria-hidden="true">w</span></a>' +
      '</div>',
  },
  {
    id: 'cip-pautan',
    title: 'Cip pautan',
    body: 'Sempadan hijau dan naik 1px.',
    html:
      '<div class="lab__demo-row">' +
      '<a class="link-chip" href="#" onclick="return false">PERKIM Kebangsaan ↗</a>' +
      '</div>',
  },
  {
    id: 'nav-pautan',
    title: 'Pautan navigasi',
    body: 'Garis bawah berkembang dari tengah.',
    html:
      '<div class="lab__demo-row" style="gap:1.25rem">' +
      '<a class="mainnav" href="#" onclick="return false" style="display:inline-block;color:#fff;background:#1a1a1a;padding:.45rem .9rem;border-radius:8px">Tentang</a>' +
      '</div>',
  },
  {
    id: 'kad-buku',
    title: 'Kad buku',
    body: 'Kulit condong dan naik.',
    html:
      '<div class="lab__demo-row">' +
      '<button type="button" class="book-card" style="max-width:130px">' +
      '<span class="book-card__cover" style="display:block;aspect-ratio:3/4;border-radius:6px 10px 10px 6px;background:linear-gradient(150deg,#e8f3ea,#cfd9f0);box-shadow:0 2px 4px rgba(16,26,61,.16),0 14px 26px rgba(16,26,61,.18);transition:transform var(--t-base) var(--ease-out),box-shadow var(--t-base) var(--ease-out)"></span>' +
      '<span class="book-card__title">Panduan Draf</span>' +
      '</button>' +
      '</div>',
  },
];

const componentsHost = document.getElementById('components');

if (componentsHost) {
  componentsHost.innerHTML = DEMOS.map(
    (demo) => `
      <article class="lab__card" data-demo="${demo.id}">
        <div class="lab__demo">
          <h4>${esc(demo.title)}</h4>
          <p>${esc(demo.body)}</p>
          <div class="lab__demo-row">${demo.html}</div>
        </div>
        <p class="lab__meta"><code>${esc(demo.id)}</code></p>
      </article>`
  ).join('');
}

/* ---------- Papan skor ---------- */

const summary = document.getElementById('score-summary');
const body = document.getElementById('score-body');

try {
  const res = await fetch(siteUrl('data/motion.json'), { headers: { Accept: 'application/json' } });
  const data = await res.json();
  const items = Array.isArray(data.komponen) ? data.komponen : [];

  const siap = items.filter((item) => item.status === 'siap').length;
  const menunggu = items.length - siap;
  const fallback = items.filter((item) => item.kurang_gerakan).length;

  if (summary) {
    summary.innerHTML =
      `<strong>${items.length}</strong> komponen · ` +
      `<strong>${siap}</strong> siap · <strong>${menunggu}</strong> menunggu · ` +
      `<strong>${fallback}/${items.length}</strong> mempunyai fallback kurang gerakan.`;
  }

  if (body) {
    body.innerHTML = items
      .map(
        (item) => `
        <tr>
          <td><strong>${esc(item.komponen || item.id)}</strong><br><code>${esc(item.id)}</code></td>
          <td>${esc(item.keluarga || '')}</td>
          <td>${esc((item.picu || []).join(', '))}</td>
          <td>${esc(item.kurang_kanan || item.kurang_gerakan || '')}</td>
          <td><span class="lab__badge lab__badge--${item.status === 'siap' ? 'siap' : 'menunggu'}">${esc(item.status || '')}</span></td>
        </tr>`
      )
      .join('');
  }
} catch (error) {
  if (summary) summary.textContent = `Gagal memuatkan inventori: ${error.message}`;
}
