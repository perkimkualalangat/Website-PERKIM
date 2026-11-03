/**
 * ticker.js — pemutar maklumat rawak di bar atas (topbar).
 *
 * Memuat berita kebangsaan dan laporan aktiviti cawangan yang disahkan,
 * kemudian mengesyut susunan supaya
 * setiap paparan menunjukkan item berbeza, kemudian bertukar secara rawak
 * setiap 6 saat. Pengguna boleh melompat ke tajuk sebelum atau selepas
 * melalui butang navigasi.
 *
 * Aksesibiliti:
 *   - Auto-putar berhenti apabila tetikus di atas atau fokus di dalam.
 *   - Pemutar tidak menggunakan aria-live supaya pembaca skrin tidak
 *     diinterrupt setiap 6 saat; senarai penuh ada pada halaman Berita dan Aktiviti.
 *   - Pemutar berhenti apabila tab disembunyikan.
 *   - Butang navigasi mempunyai label yang jelas untuk pembaca skrin.
 */

import { getJSON, formatDate, esc } from './utils.js';

const ROTATE_MS = 6000;
const SWAP_MS = 240;

const PREV_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

const NEXT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

/** Fisher-Yates: susunan rawak tanpa item berulang. */
function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function renderItem(item) {
  const date = item.tarikh ? formatDate(item.tarikh) : '';
  return (
    `<span class="ticker__cat">${esc(item.kategori || 'Berita')}</span>` +
    `<span class="ticker__title">${esc(item.tajuk || '')}</span>` +
    (date ? `<span class="ticker__date">${esc(date)}</span>` : '')
  );
}

export async function initTicker() {
  const host = document.querySelector('[data-ticker]');
  if (!host) return;

  const fallbackText =
    host.querySelector('.topbar__announce-fallback')?.textContent?.trim() || '';
  let items = [];

  const [news, activities] = await Promise.all([
    getJSON('/data/berita.json').catch((error) => {
      console.error('Ticker: gagal memuat berita -', error.message);
      return [];
    }),
    getJSON('/data/aktiviti.json').catch((error) => {
      console.error('Ticker: gagal memuat aktiviti -', error.message);
      return [];
    }),
  ]);

  const localActivities = Array.isArray(activities)
    ? activities
        .filter(
          (item) =>
            item?.status === 'disahkan' &&
            typeof item.facebook_url === 'string' &&
            /^https:\/\/(?:[^/]+\.)?facebook\.com\//i.test(item.facebook_url)
        )
        .map((item) => ({
          tarikh: item.tarikh,
          kategori: 'Aktiviti',
          tajuk: item.tajuk,
          url: item.facebook_url,
        }))
    : [];

  items = shuffle([...(Array.isArray(news) ? news : []), ...localActivities]);

  // Tiada berita: kekalkan teks asal.
  if (items.length === 0) {
    if (fallbackText) {
      host.innerHTML = `<p class="topbar__announce-fallback">${esc(fallbackText)}</p>`;
    }
    return;
  }

  host.innerHTML =
    '<div class="ticker">' +
    `<a class="ticker__item" href="${esc(items[0].url || '#')}" target="_blank" rel="noopener noreferrer">${renderItem(items[0])}</a>` +
    '</div>' +
    '<div class="ticker__nav">' +
    `<button class="ticker__btn" type="button" data-ticker-prev aria-label="Maklumat sebelumnya">${PREV_ICON}</button>` +
    `<button class="ticker__btn" type="button" data-ticker-next aria-label="Maklumat seterusnya">${NEXT_ICON}</button>` +
    '</div>';

  const link = host.querySelector('.ticker__item');
  const prevBtn = host.querySelector('[data-ticker-prev]');
  const nextBtn = host.querySelector('[data-ticker-next]');

  let index = 0;
  let timer = null;
  let hovering = false;
  let focused = false;

  const isPaused = () => hovering || focused || document.hidden;

  const paint = (item) => {
    link.href = item.url || '#';
    link.innerHTML = renderItem(item);
  };

  /** Tukar ke indeks tertentu dengan animator pudar. */
  const goTo = (target, direction = 1) => {
    const nextIndex = (target + items.length) % items.length;
    if (nextIndex === index) return;

    link.classList.add(direction > 0 ? 'is-out' : 'is-out-back');
    window.setTimeout(() => {
      index = nextIndex;
      paint(items[index]);
      link.classList.remove('is-out', 'is-out-back');
      link.classList.add(direction > 0 ? 'is-in' : 'is-in-back');
      // Buang kelas "masuk" selepas satu frame supaya animasi seterusnya normal.
      window.requestAnimationFrame(() => link.classList.remove('is-in', 'is-in-back'));
    }, SWAP_MS);
  };

  const advance = () => {
    // Seterusnya secara rawak, tetapi jangan ulang tajuk yang sama.
    let target = index;
    if (items.length > 1) {
      while (target === index) {
        target = Math.floor(Math.random() * items.length);
      }
    }
    goTo(target, 1);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const start = () => {
    stop();
    if (isPaused() || items.length < 2) return;
    timer = window.setInterval(advance, ROTATE_MS);
  };

  /** Lompat manual — set semula pemasa supaya lompatan tidak digandakan. */
  const step = (direction) => {
    goTo(index + direction, direction);
    start();
  };

  prevBtn?.addEventListener('click', () => step(-1));
  nextBtn?.addEventListener('click', () => step(1));

  host.addEventListener('pointerenter', () => {
    hovering = true;
    stop();
  });

  host.addEventListener('pointerleave', () => {
    hovering = false;
    start();
  });

  host.addEventListener('focusin', () => {
    focused = true;
    stop();
  });

  host.addEventListener('focusout', () => {
    focused = false;
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}
