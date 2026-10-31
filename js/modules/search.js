/**
 * search.js — carian ringkas merentas halaman dan bahan bacaan.
 * Indeks statik: /data/search-index.json
 */

let indexPromise;

function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch('/data/search-index.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`search-index.json ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        console.error('Gagal memuatkan indeks carian:', error);
        return [];
      });
  }
  return indexPromise;
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function score(item, terms) {
  const title = (item.tajuk || '').toLowerCase();
  const keywords = (item.kata_kunci || '').toLowerCase();
  const description = (item.keterangan || '').toLowerCase();
  let total = 0;

  for (const term of terms) {
    if (!title.includes(term) && !keywords.includes(term) && !description.includes(term)) {
      return 0;
    }
    if (title.includes(term)) total += 6;
    if (keywords.includes(term)) total += 3;
    if (description.includes(term)) total += 1;
  }

  return total;
}

export function initSearch() {
  const openButton = document.getElementById('search-open');
  const dialog = document.getElementById('site-search');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const status = document.getElementById('search-status');

  if (!openButton || !dialog || !input || !results || !status) return;

  let items = [];

  const render = (query) => {
    const value = query.trim().toLowerCase();
    results.innerHTML = '';

    if (!value) {
      status.textContent = 'Taip kata kunci untuk mula mencari.';
      return;
    }

    const terms = value.split(/\s+/).filter(Boolean);
    const matches = items
      .map((item) => ({ item, value: score(item, terms) }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    if (!matches.length) {
      status.textContent = `Tiada hasil untuk “${query.trim()}”.`;
      return;
    }

    status.textContent = `${matches.length} hasil ditemui.`;
    results.innerHTML = matches
      .map(
        ({ item }) => `<li>
          <a class="search-result" href="${esc(item.url)}">
            <span class="search-result__type">${esc(item.jenis || 'Halaman')}</span>
            <strong>${esc(item.tajuk || '')}</strong>
            <span>${esc(item.keterangan || '')}</span>
          </a>
        </li>`
      )
      .join('');
  };

  openButton.addEventListener('click', async () => {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    openButton.setAttribute('aria-expanded', 'true');
    input.focus();
    items = await loadIndex();
    render(input.value);
  });

  input.addEventListener('input', () => render(input.value));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    input.value = '';
    results.innerHTML = '';
    status.textContent = '';
    openButton.setAttribute('aria-expanded', 'false');
    openButton.focus();
  });
}
