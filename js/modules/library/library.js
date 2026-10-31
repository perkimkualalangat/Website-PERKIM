/**
 * library.js — rak buku PDF dan lapisan pembaca skrin penuh.
 *
 * Enjin flipbook dimuatkan secara lazy (dynamic import) supaya halaman
 * Pantas dibuka; 1.7 MB PDF.js hanya dimuatkan apabila buku pertama dibuka.
 *
 * Antara muka enjin: open(container, url) -> { destroy(), next(), prev(), goTo() }
 * Tukar enjin dengan menyunting SATU baris import dinamik dalam loadEngine().
 */

import { esc, getJSON } from '../utils.js';

const ENGINE_PATH = './engine-flippy.js';

let enginePromise = null;

function loadEngine() {
  if (!enginePromise) {
    enginePromise = import(ENGINE_PATH).catch((error) => {
      enginePromise = null; // benarkan cubaan semula selepas gagal
      throw error;
    });
  }
  return enginePromise;
}

export async function initLibrary() {
  const shelf = document.getElementById('bookshelf');
  if (!shelf) return;

  let data;
  try {
    data = await getJSON('/data/books.json');
  } catch (error) {
    console.error(error);
    shelf.innerHTML = `<p class="empty">Rak buku tidak dapat dimuatkan.
      Semak <code>data/books.json</code> dan pastikan pelayan tempatan berjalan.</p>`;
    return;
  }

  // Normalisasi: terima struktur berkumpulan { kumpulan: [...] } atau
  // senarai rata lama [ { ...buku } ].
  const groups = Array.isArray(data)
    ? [{ id: 'semua', tajuk: 'Semua bahan', keterangan: '', buku: data }]
    : (Array.isArray(data?.kumpulan) ? data.kumpulan : []).filter(
        (group) => Array.isArray(group.buku) && group.buku.length > 0
      );

  const books = groups.flatMap((group) => group.buku);

  if (books.length === 0) {
    shelf.innerHTML = '<p class="empty">Tiada buku dalam rak lagi.</p>';
    return;
  }

  const card = (book) => `
      <button class="book-card" type="button" data-id="${esc(book.id)}">
        <span class="book-card__cover">
          <img src="${esc(book.cover)}" alt="Kulit buku ${esc(book.tajuk)}"
               loading="lazy" width="600" height="800">
          <span class="book-card__badge">PDF</span>
        </span>
        <span class="book-card__title">${esc(book.tajuk)}</span>
        <span class="book-card__meta">${esc(book.keterangan ?? '')}</span>
      </button>`;

  shelf.innerHTML = groups
    .map((group) => {
      const meta = [group.keterangan, `${group.buku.length} buku`]
        .filter(Boolean)
        .join(' · ');
      const headingId = `kumpulan-${esc(group.id)}`;
      return `
      <section class="book-group" aria-labelledby="${headingId}">
        <div class="book-group__head">
          <h2 class="book-group__title" id="${headingId}">${esc(group.tajuk)}</h2>
          <p class="book-group__meta">${esc(meta)}</p>
        </div>
        <div class="bookshelf">${group.buku.map(card).join('')}</div>
      </section>`;
    })
    .join('');

  shelf.setAttribute('aria-busy', 'false');

  // ---------- Lapisan pembaca (satu sahaja, dikongsi) ----------

  const option = (b) => `<option value="${esc(b.id)}">${esc(b.tajuk)}</option>`;
  const selectOptions =
    groups.length === 1
      ? books.map(option).join('')
      : groups
          .map((group) => `<optgroup label="${esc(group.tajuk)}">${group.buku.map(option).join('')}</optgroup>`)
          .join('');

  const overlay = document.createElement('div');
  overlay.className = 'book-overlay';
  overlay.id = 'book-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'book-overlay-title');
  overlay.innerHTML = `
    <header class="book-overlay__bar">
      <div class="book-overlay__meta">
        <span class="book-overlay__eyebrow">Bahan bacaan</span>
        <h2 class="book-overlay__title" id="book-overlay-title">Buku</h2>
      </div>
      <div class="book-overlay__actions">
        <label class="visually-hidden" for="ov-select">Pilih buku</label>
        <select id="ov-select" class="book-overlay__select">
          ${selectOptions}
        </select>
        <button id="ov-full" class="btn btn--ghost btn--sm" type="button">Skrin penuh</button>
        <button id="ov-close" class="btn btn--sm" type="button">Tutup ✕</button>
      </div>
    </header>
    <div id="ov-viewer" class="book-overlay__viewer"></div>
    <p id="ov-status" class="book-overlay__status" role="status" aria-live="polite" hidden></p>`;
  document.body.appendChild(overlay);

  const viewer = overlay.querySelector('#ov-viewer');
  const select = overlay.querySelector('#ov-select');
  const title = overlay.querySelector('#book-overlay-title');
  const status = overlay.querySelector('#ov-status');
  const fullBtn = overlay.querySelector('#ov-full');
  const closeBtn = overlay.querySelector('#ov-close');

  let current = null;
  let token = 0;
  let lastTrigger = null;

  const setStatus = (message) => {
    status.textContent = message;
    status.hidden = !message;
  };

  const findBook = (id) => books.find((book) => book.id === id);

  async function show(id) {
    const book = findBook(id);
    if (!book) return;

    const myToken = ++token;

    current?.destroy?.();
    current = null;
    viewer.innerHTML = '';
    select.value = book.id;
    title.textContent = book.tajuk;
    setStatus(`Memuatkan “${book.tajuk}”…`);

    try {
      const { open } = await loadEngine();
      if (myToken !== token) return;

      const instance = await open(viewer, book.pdf);
      if (myToken !== token) {
        instance.destroy?.();
        return;
      }

      current = instance;
      setStatus('');
    } catch (error) {
      if (myToken !== token) return;
      console.error(error);
      setStatus('');
      viewer.innerHTML = `
        <div class="book-error">
          <p><strong>Buku tidak dapat dimuatkan.</strong></p>
          <p>Pastikan fail <code>${esc(book.pdf)}</code> wujud dan pelayan menyajikan
             fail <code>.mjs</code> sebagai JavaScript.</p>
          <button class="btn btn--sm" type="button" data-retry>Cuba lagi</button>
        </div>`;
      viewer.querySelector('[data-retry]')?.addEventListener('click', () => show(book.id));
    }
  }

  function openOverlay(id, trigger) {
    lastTrigger = trigger ?? null;
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    show(id);
    closeBtn.focus();
  }

  function closeOverlay() {
    token++;
    current?.destroy?.();
    current = null;
    viewer.innerHTML = '';
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setStatus('');

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    lastTrigger?.focus();
    lastTrigger = null;
  }

  shelf.addEventListener('click', (event) => {
    const card = event.target.closest('.book-card');
    if (!card) return;
    openOverlay(card.dataset.id, card);
  });

  // Muatkan enjin lebih awal apabila pengguna menghampiri rak.
  shelf.addEventListener(
    'pointerenter',
    () => {
      loadEngine().catch(() => {});
    },
    { once: true }
  );

  select.addEventListener('change', () => show(select.value));
  closeBtn.addEventListener('click', closeOverlay);

  fullBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      overlay.requestFullscreen().catch(() => {});
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullBtn.textContent = document.fullscreenElement ? 'Keluar skrin penuh' : 'Skrin penuh';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!overlay.classList.contains('is-open')) return;
    if (document.fullscreenElement) return; // biar pelayar keluar skrin penuh dahulu
    closeOverlay();
  });

  // Perangkap fokus mudah di dalam dialog
  overlay.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    const focusable = [...overlay.querySelectorAll(
      'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.getClientRects().length > 0);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Pautan mendalam daripada carian: ?buku=<id> terus membuka pembaca.
  const requested = new URLSearchParams(location.search).get('buku');
  if (requested && findBook(requested)) {
    const trigger = shelf.querySelector(`.book-card[data-id="${CSS.escape(requested)}"]`);
    openOverlay(requested, trigger);
  }
}
