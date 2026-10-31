/**
 * berita.js — indeks berita PERKIM Kebangsaan.
 *
 * Hanya tajuk, tarikh, kategori dan pautan disimpan. Teks penuh artikel
 * tidak disalin; pautan membuka laman rasmi dalam tab baharu.
 */

import { esc, formatDate, getJSON } from './utils.js';

export async function initBerita() {
  const list = document.querySelector('#berita-list');
  if (!list) return;

  const filter = document.querySelector('#berita-filter');
  const count = document.querySelector('[data-berita-count]');

  let items;
  try {
    items = await getJSON('/data/berita.json');
  } catch (error) {
    console.error(error);
    list.innerHTML = '<p class="empty">Indeks berita tidak dapat dimuatkan.</p>';
    return;
  }

  const categories = ['Semua', ...new Set(items.map((i) => i.kategori).filter(Boolean))];
  let active = 'Semua';

  const render = () => {
    const shown = items
      .filter((i) => active === 'Semua' || i.kategori === active)
      .sort((a, b) => String(b.tarikh).localeCompare(String(a.tarikh)));

    list.innerHTML = shown
      .map(
        (item) => `
        <li class="news-item">
          <div class="news-item__meta">
            <time datetime="${esc(item.tarikh)}">${esc(formatDate(item.tarikh))}</time>
            <span class="card__tag">${esc(item.kategori)}</span>
          </div>
          <h3 class="news-item__title">
            <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.tajuk)}</a>
          </h3>
        </li>`
      )
      .join('');

    if (count) {
      count.textContent = `${shown.length} daripada ${items.length} item dipaparkan.`;
    }
  };

  if (filter) {
    filter.innerHTML = categories
      .map(
        (cat) => `<button type="button" class="chip" data-cat="${esc(cat)}"
          aria-pressed="${cat === active}">${esc(cat)}</button>`
      )
      .join('');

    filter.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        active = chip.dataset.cat;
        filter.querySelectorAll('.chip').forEach((c) => {
          c.setAttribute('aria-pressed', String(c === chip));
        });
        render();
      });
    });
  }

  render();

  // Ringkasan arkib tempatan (jika skrip scrape telah dijalankan)
  const summaryEl = document.querySelector('#arkib-ringkasan');
  if (summaryEl) {
    try {
      const s = await getJSON('/data/perkim/ringkasan.json');
      // Placeholder bermaksud arkib belum diambil — jangan tunjuk apa-apa.
      if (!s || s.arkib === false || !s.artikel) {
        summaryEl.remove();
        return;
      }
      summaryEl.textContent =
        `Arkib tempatan: ${s.artikel} artikel (${s.tarikh_awal} – ${s.tarikh_akhir}), ` +
        `${s.halaman} halaman dan ${s.video} video. Teks penuh disimpan dalam ` +
        `data/perkim/ dan tidak dipaparkan di laman ini.`;
      summaryEl.hidden = false;
    } catch {
      // Arkib belum diambil — buang elemen quietly (tanpa ralat konsol).
      summaryEl.remove();
    }
  }
}
