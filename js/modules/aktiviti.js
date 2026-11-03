/**
 * aktiviti.js - arkib laporan aktiviti cawangan yang dikurasi secara manual.
 */

import { siteHref } from '../paths.js';
import { esc, formatDate, getJSON } from './utils.js';

let itemsPromise;

function loadItems() {
  if (!itemsPromise) {
    itemsPromise = getJSON('/data/aktiviti.json').then((data) => {
      if (!Array.isArray(data)) {
        throw new Error('data/aktiviti.json mesti mengandungi senarai JSON.');
      }
      return data.filter((item) => item && item.status !== 'ditarik');
    });
  }
  return itemsPromise;
}

function safeFacebookUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || !/(^|\.)facebook\.com$/i.test(url.hostname)) {
      return '';
    }
    return url.href;
  } catch {
    return '';
  }
}

function detailUrl(item) {
  const url = new URL(siteHref('pages/aktiviti.html'));
  url.searchParams.set('slug', item.slug || item.id || '');
  return url.href;
}

function sorted(items) {
  return [...items].sort((a, b) => String(b.tarikh || '').localeCompare(String(a.tarikh || '')));
}

function statusMeta(item) {
  const confirmed = item.status === 'disahkan';
  return `<span class="status-pill status-pill--${confirmed ? 'disahkan' : 'draf'}">${
    confirmed ? 'Disahkan' : 'Draf'
  }</span>`;
}

function itemMeta(item) {
  const date = item.tarikh ? formatDate(item.tarikh) : 'Tarikh belum disahkan';
  return `<div class="activity-card__meta">
    ${
      item.tarikh
        ? `<time datetime="${esc(item.tarikh)}">${esc(date)}</time>`
        : `<span>${esc(date)}</span>`
    }
    ${item.kategori ? `<span class="card__tag">${esc(item.kategori)}</span>` : ''}
    ${statusMeta(item)}
  </div>`;
}

function imageItems(item) {
  return Array.isArray(item.gambar)
    ? item.gambar.filter(
        (image) =>
          image && typeof image.src === 'string' && typeof image.alt === 'string'
      )
    : [];
}

function localImageUrl(value) {
  const path = String(value || '').replaceAll('\\', '/');
  if (!path || path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path)) return '';
  if (path.split('/').includes('..')) return '';
  return siteHref(path);
}

function cardMedia(item) {
  const image = imageItems(item)[0];
  const src = image ? localImageUrl(image.src) : '';
  if (!image || !src) return '';
  return `<div class="card__media activity-card__media">
    <img src="${esc(src)}" alt="${esc(image.alt)}"
      loading="lazy" decoding="async">
  </div>`;
}

function renderCard(item) {
  const facebook = safeFacebookUrl(item.facebook_url);
  const localUrl = detailUrl(item);

  return `<article class="card activity-card">
    ${cardMedia(item)}
    <div class="card__body">
      ${itemMeta(item)}
      <h3 class="activity-card__title"><a href="${esc(localUrl)}">${esc(
        item.tajuk || ''
      )}</a></h3>
      <p class="activity-card__summary">${esc(item.ringkas || '')}</p>
      ${item.lokasi ? `<p class="activity-card__place">Lokasi: ${esc(item.lokasi)}</p>` : ''}
      <div class="activity-card__actions">
        <a class="card__link" href="${esc(localUrl)}">Lihat laporan</a>
        ${
          facebook
            ? `<a class="activity-card__external" href="${esc(
                facebook
              )}" target="_blank" rel="noopener noreferrer">Post asal Facebook</a>`
            : ''
        }
      </div>
    </div>
  </article>`;
}

function detailGallery(item) {
  const images = imageItems(item)
    .map((image) => ({ ...image, url: localImageUrl(image.src) }))
    .filter((image) => image.url);
  if (!images.length) return '';

  return `<section class="activity-detail__gallery" aria-labelledby="activity-gallery-title">
    <h3 id="activity-gallery-title">Gambar program</h3>
    <div class="activity-gallery">
      ${images
        .map(
          (image, index) => `<figure>
            <img src="${esc(image.url)}" alt="${esc(image.alt)}"
              loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
            ${image.kapsyen ? `<figcaption>${esc(image.kapsyen)}</figcaption>` : ''}
          </figure>`
        )
        .join('')}
    </div>
  </section>`;
}

function fullCaption(item) {
  const caption = typeof item.caption === 'string' ? item.caption.trim() : '';
  if (!caption) return '';
  return `<section class="activity-detail__caption" aria-labelledby="activity-caption-title">
    <h3 id="activity-caption-title">Caption penuh</h3>
    <div class="activity-caption">${esc(caption)}</div>
  </section>`;
}

function renderDetail(item) {
  const facebook = safeFacebookUrl(item.facebook_url);

  return `<article class="activity-detail">
    <p class="activity-detail__back"><a href="${esc(
      siteHref('pages/aktiviti.html')
    )}">Kembali ke semua aktiviti</a></p>
    ${itemMeta(item)}
    <h2 class="activity-detail__title" tabindex="-1">${esc(item.tajuk || '')}</h2>
    <p class="activity-detail__lead">${esc(item.ringkas || '')}</p>
    ${item.lokasi ? `<p class="activity-detail__place"><strong>Lokasi:</strong> ${esc(item.lokasi)}</p>` : ''}
    ${detailGallery(item)}
    ${fullCaption(item)}
    ${
      facebook
        ? `<p class="activity-detail__action"><a class="btn btn--ghost" href="${esc(
            facebook
          )}" target="_blank" rel="noopener noreferrer">Baca post asal di Facebook</a></p>`
        : ''
    }
    <div class="source-note">
      <p><strong>Sumber:</strong> ${esc(
        item.sumber || 'Facebook PERKIM Kuala Langat'
      )}. Paparan ini tidak menggantikan post asal.</p>
    </div>
  </article>`;
}

function renderList(items, list, filter, count) {
  const categories = ['Semua', ...new Set(items.map((item) => item.kategori).filter(Boolean))];
  let active = 'Semua';

  const paint = () => {
    const shown = sorted(
      items.filter((item) => active === 'Semua' || item.kategori === active)
    );

    list.innerHTML = shown.length
      ? shown.map(renderCard).join('')
      : '<p class="empty">Belum ada laporan aktiviti untuk dipaparkan.</p>';

    if (count) {
      count.textContent = `${shown.length} daripada ${items.length} laporan dipaparkan.`;
    }
  };

  if (filter && items.length) {
    filter.innerHTML = categories
      .map(
        (category) => `<button type="button" class="chip" data-category="${esc(category)}"
          aria-pressed="${category === active}">${esc(category)}</button>`
      )
      .join('');

    filter.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        active = chip.dataset.category || 'Semua';
        filter.querySelectorAll('.chip').forEach((entry) => {
          entry.setAttribute('aria-pressed', String(entry === chip));
        });
        paint();
      });
    });
  }

  paint();
}

export async function initAktiviti() {
  const list = document.querySelector('#aktiviti-list');
  const index = document.querySelector('#aktiviti-index');
  const detail = document.querySelector('#aktiviti-detail');
  if (!list || !index || !detail) return;

  let items;
  try {
    items = await loadItems();
  } catch (error) {
    console.error('Aktiviti: gagal memuat data -', error.message);
    list.innerHTML = '<p class="empty">Data aktiviti tidak dapat dimuatkan.</p>';
    return;
  }

  const requestedSlug = new URLSearchParams(location.search).get('slug');
  if (requestedSlug) {
    const item = items.find(
      (entry) => entry.slug === requestedSlug || entry.id === requestedSlug
    );
    index.hidden = true;
    detail.hidden = false;

    if (!item) {
      detail.innerHTML = `<div class="empty">
        <p>Laporan aktiviti yang diminta tidak ditemui.</p>
        <p><a href="${esc(siteHref('pages/aktiviti.html'))}">Kembali ke semua aktiviti</a></p>
      </div>`;
      return;
    }

    detail.innerHTML = renderDetail(item);
    document.title = `${item.tajuk} | Aktiviti | PERKIM Kuala Langat (draf)`;
    detail.querySelector('.activity-detail__title')?.focus();
    return;
  }

  renderList(
    items,
    list,
    document.querySelector('#aktiviti-filter'),
    document.querySelector('[data-aktiviti-count]')
  );
}

export async function initAktivitiTerkini() {
  const host = document.querySelector('#aktiviti-terkini');
  if (!host) return;

  try {
    const latest = sorted((await loadItems()).filter((item) => item.status === 'disahkan')).slice(
      0,
      3
    );
    if (latest.length) host.innerHTML = latest.map(renderCard).join('');
  } catch (error) {
    console.error('Aktiviti terkini: gagal memuat data -', error.message);
  }
}
