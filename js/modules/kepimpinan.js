/**
 * kepimpinan.js — memaparkan struktur jawatan daripada data JSON.
 *
 * Prinsip: nama hanya dipaparkan jika `status` ialah "disahkan".
 * Jawatan tanpa nama yang disahkan dipaparkan sebagai "Menunggu pengesahan",
 * bukan dengan nama tekaan.
 */

import { esc, getJSON } from './utils.js';

const initials = (name) =>
  name
    .replace(/^(Ustaz|Ustazah|Encik|Cik|Tuan|Puan|Haji|Hajah|Dr\.?)\s+/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

function card(item) {
  const confirmed = item.status === 'disahkan' && item.nama;
  const name = confirmed ? item.nama : 'Menunggu pengesahan';
  const badge = confirmed ? 'Disahkan' : 'Perlu pengesahan';
  const badgeClass = confirmed ? 'lead-card__status--ok' : 'lead-card__status--pending';

  return `
    <article class="lead-card ${confirmed ? '' : 'lead-card--pending'}">
      <span class="lead-card__initials" aria-hidden="true">${
        confirmed ? esc(initials(item.nama)) : '?'
      }</span>
      <span class="lead-card__role">${esc(item.jawatan)}</span>
      <h3 class="lead-card__name">${esc(name)}</h3>
      <span class="lead-card__status ${badgeClass}">${badge}</span>
      ${item.nota ? `<p class="lead-card__note">${esc(item.nota)}</p>` : ''}
    </article>`;
}

export async function initKepimpinan() {
  const grid = document.querySelector('#kepimpinan-grid');
  if (!grid) return;

  const summary = document.querySelector('#kepimpinan-summary');
  const sesi = document.querySelector('#kepimpinan-sesi');
  const dikemaskini = document.querySelector('#kepimpinan-tarikh');

  let data;
  try {
    data = await getJSON('/data/kepimpinan.json');
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="empty">Data kepimpinan tidak dapat dimuatkan.</p>';
    return;
  }

  const items = Array.isArray(data.jawatan) ? data.jawatan : [];
  const confirmed = items.filter((i) => i.status === 'disahkan' && i.nama).length;
  const pending = items.length - confirmed;

  grid.innerHTML = items.map(card).join('');

  if (summary) {
    summary.innerHTML = `
      <span class="lead-stat lead-stat--ok"><strong>${confirmed}</strong> jawatan disahkan</span>
      <span class="lead-stat lead-stat--pending"><strong>${pending}</strong> menunggu pengesahan</span>
      <span class="lead-stat"><strong>${items.length}</strong> jumlah baris</span>`;
  }

  if (sesi) sesi.textContent = data.sesi ?? '';
  if (dikemaskini) dikemaskini.textContent = data.dikemaskini ?? '';
}
