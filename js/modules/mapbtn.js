/**
 * mapbtn.js — butang premium "Buka Google Maps" dengan pratonton lokasi.
 *
 * Tanggungjawab:
 *   1. Membina pratonton mini-map (OpenStreetMap embed) bila diperlukan sahaja.
 *   2. Micro-interaction: hover/focus membuka pratonton, klik menukar label,
 *      tetingkap yang disekat menghasilkan mesej ralat + pautan sandaran.
 *   3. Semua gerakan dikawal oleh token css/motion.css.
 */

import { esc } from './utils.js';

const MAP_TILE = 'https://www.openstreetmap.org/export/embed.html';

const PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

const ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 12h14M13 6l6 6-6 6"/></svg>';

let toast = null;
let toastTimer = null;

function showToast(message, href) {
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'mapbtn-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.innerHTML = `${esc(message)} <a href="${esc(href)}" target="_blank" rel="noopener noreferrer">Buka terus</a>`;
  toast.classList.add('is-visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 6000);
}

/**
 * Bina pratonton untuk satu butang.
 *
 * Panel hanya dicipta apabila pengguna pertama kali hover/fokus supaya ia
 * tidak menambah lebar dokumen (overflow) sebelum diperlukan. Kedudukan
 * dikira semula supaya panel sentiasa berada dalam viewport.
 */
function buildPeek(button) {
  const wrap = document.createElement('span');
  wrap.className = 'btn-map-wrap';
  button.parentNode.insertBefore(wrap, button);
  wrap.appendChild(button);

  let peek = null;
  let loaded = false;

  const align = () => {
    if (!peek) return;
    const rect = wrap.getBoundingClientRect();
    const width = peek.offsetWidth || 300;
    const viewport = window.innerWidth;

    // Keutamaan: panel kekal di sebelah kanan jika ia muat dalam viewport.
    // Jika tidak, pusing ke kiri (is-flipped) supaya tidak keluar dari skrin.
    const fitsRight = rect.left + width <= viewport - 8;
    const fitsLeft = rect.right - width >= 8;
    const flip = !fitsRight && fitsLeft;

    peek.classList.toggle('is-flipped', flip);
  };

  const create = () => {
    if (peek) return peek;

    peek = document.createElement('span');
    peek.className = 'btn-map-peek';
    peek.setAttribute('aria-hidden', 'true');

    const map = document.createElement('span');
    map.className = 'btn-map-peek__map';

    const body = document.createElement('span');
    body.className = 'btn-map-peek__body';
    body.innerHTML =
      `<span class="btn-map-peek__pin">${PIN_SVG}</span>` +
      '<span class="btn-map-peek__text"><strong>Pejabat Cawangan Kuala Langat</strong>' +
      `${esc(button.dataset.mapAddress || 'Lot 2029, Jalan Haji Darini, 42700 Banting')}</span>`;

    peek.append(map, body);
    wrap.insertBefore(peek, button);
    align();
    return peek;
  };

  const loadMap = () => {
    if (loaded) return;
    loaded = true;

    const bbox = button.dataset.mapBbox;
    const marker = button.dataset.mapMarker;
    if (!bbox || !marker) return;

    const iframe = document.createElement('iframe');
    iframe.title = 'Pratonton lokasi pejabat (OpenStreetMap)';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src =
      `${MAP_TILE}?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
    peek?.querySelector('.btn-map-peek__map')?.appendChild(iframe);
  };

  const open = () => {
    const panel = create();
    align();
    loadMap();
    //-frame supaya animasi masuk boleh dimainkan.
    window.requestAnimationFrame(() => panel.classList.add('is-open'));
  };

  const close = () => {
    peek?.classList.remove('is-open');
  };

  wrap.addEventListener('pointerenter', open);
  wrap.addEventListener('focusin', open);
  wrap.addEventListener('pointerleave', close);
  wrap.addEventListener('focusout', close);
  window.addEventListener('resize', align, { passive: true });
  window.addEventListener('scroll', close, { passive: true });

  return { wrap, open, close, getPeek: () => peek };
}

function enhanceButton(button) {
  if (button.dataset.mapEnhanced === '1') return;
  button.dataset.mapEnhanced = '1';

  // Susun semula kandungan butang kepada struktur standard.
  button.innerHTML =
    `<span class="btn-map__icon">${PIN_SVG}</span>` +
    '<span class="btn-map__body">' +
    `<span class="btn-map__label">${esc(button.dataset.mapLabel || 'Buka Google Maps')}</span>` +
    `<span class="btn-map__hint">${esc(button.dataset.mapHint || 'Arahkan ke pejabat kami')}</span>` +
    '</span>' +
    `<span class="btn-map__arrow">${ARROW_SVG}</span>`;

  const label = button.querySelector('.btn-map__label');
  const originalLabel = label?.textContent || '';
  const href = button.getAttribute('href') || '';

  const peekCtl = buildPeek(button);

  button.addEventListener('click', (event) => {
    // Modifier atau klik tengah: biarkan pelayar urus sahaja.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    peekCtl.open();

    const win = window.open(href, '_blank', 'noopener,noreferrer');

    if (win) {
      button.classList.add('is-loading');
      if (label) label.textContent = 'Membuka Google Maps…';
      setTimeout(() => {
        button.classList.remove('is-loading');
        if (label) label.textContent = originalLabel;
      }, 1600);
      return;
    }

    // Popup disekat — beri jalan lain.
    button.classList.add('is-error');
    if (label) label.textContent = 'Popup disekat';
    showToast('Pelayar menyekat tetingkap baharu.', href);
    setTimeout(() => {
      button.classList.remove('is-error');
      if (label) label.textContent = originalLabel;
    }, 2400);
  });

  button.addEventListener('focus', () => peekCtl.open());
  button.addEventListener('blur', () => peekCtl.close());
}

export function initMapButtons() {
  document.querySelectorAll('.btn-map').forEach(enhanceButton);
}
