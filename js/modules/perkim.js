/**
 * perkim.js — memaparkan maklumat latar belakang PERKIM Kebangsaan
 * daripada data/perkim.json.
 *
 * Nota: halaman ini merujuk organisasi peringkat kebangsaan, bukan
 * cawangan Kuala Langat. Sumber dan tarikh pengambilan dipaparkan.
 */

import { esc, getJSON } from './utils.js';

const safeUrl = (url) => (/^https?:\/\//i.test(url) ? url : null);

const linkChip = (label, url) => {
  const safe = safeUrl(url);
  return safe
    ? `<a class="link-chip" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span aria-hidden="true"> ↗</span></a>`
    : `<span class="link-chip link-chip--plain">${esc(label)}</span>`;
};

export async function initPerkim() {
  const root = document.querySelector('#perkim-data');
  if (!root) return;

  let data;
  try {
    data = await getJSON('/data/perkim.json');
  } catch (error) {
    console.error(error);
    root.innerHTML = '<p class="empty">Data PERKIM tidak dapat dimuatkan.</p>';
    return;
  }

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value ?? '';
  };

  setText('#perkim-visi', data.visi);
  setText('#perkim-misi', data.misi);
  setText('#perkim-moto', data.organisasi?.moto);
  setText('#perkim-sumber', data.sumber);
  setText('#perkim-diambil', data.diambil);
  setText('#perkim-nama', data.organisasi?.nama);

  const sumberLink = document.querySelector('#perkim-sumber');
  if (sumberLink && safeUrl(data.sumber)) {
    const a = document.createElement('a');
    a.href = data.sumber;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = data.sumber.replace(/^https?:\/\//, '');
    sumberLink.replaceChildren(a);
  }

  // Sejarah ringkas
  setText('#perkim-pengasas', data.organisasi?.pengasas);
  setText('#perkim-tarikh', data.organisasi?.tarikh_daftar);
  setText('#perkim-sejarah', data.organisasi?.nota_sejarah);
  setText('#perkim-lambang', data.organisasi?.lambang);

  // Lima teras
  const teras = document.querySelector('#perkim-teras');
  if (teras) {
    teras.innerHTML = (data.lima_teras ?? [])
      .map(
        (item, i) => `
        <article class="card value-card">
          <div class="card__body">
            <span class="value-card__no">Teras ${String(i + 1).padStart(2, '0')}</span>
            <h3>${esc(item.nama)}</h3>
            <p>${esc(item.ringkas)}</p>
          </div>
        </article>`
      )
      .join('');
  }

  // Struktur
  const struktur = document.querySelector('#perkim-struktur');
  if (struktur) {
    struktur.innerHTML = (data.organisasi?.struktur ?? [])
      .map((line) => `<li>${esc(line)}</li>`)
      .join('');
  }

  // Ibu pejabat
  const hubungi = document.querySelector('#perkim-hubungi');
  if (hubungi) {
    const h = data.hubungi ?? {};
    const tels = (h.telefon ?? [])
      .map((t) => `<a href="tel:${esc(String(t).replace(/[^\d+]/g, ''))}">${esc(t)}</a>`)
      .join(' · ');

    hubungi.innerHTML = `
      <address>${esc(h.alamat ?? '')}</address>
      <dl>
        <dt>Telefon</dt><dd>${tels || '—'}</dd>
        <dt>Faks</dt><dd>${esc(h.faks ?? '—')}</dd>
        <dt>E-mel</dt><dd><a href="mailto:${esc(h.emel ?? '')}">${esc(h.emel ?? '')}</a></dd>
      </dl>`;
  }

  // Pautan luaran
  const gabungan = document.querySelector('#perkim-gabungan');
  if (gabungan) {
    gabungan.innerHTML = (data.badan_gabungan ?? [])
      .map((x) => linkChip(x.nama, x.url))
      .join('');
  }

  const pendidikan = document.querySelector('#perkim-pendidikan');
  if (pendidikan) {
    pendidikan.innerHTML = (data.pendidikan_institusi ?? [])
      .map((x) => linkChip(x.nama, x.url))
      .join('');
  }

  const program = document.querySelector('#perkim-program');
  if (program) {
    program.innerHTML = (data.program_luar ?? [])
      .map((x) => linkChip(x.nama, x.url))
      .join('');
  }

  const bahagian = document.querySelector('#perkim-bahagian');
  if (bahagian) {
    bahagian.innerHTML = Object.entries(data.bahagian_fb ?? {})
      .map(([nama, url]) => linkChip(nama, url))
      .join('');
  }

  const sosial = document.querySelector('#perkim-sosial');
  if (sosial) {
    const labels = { facebook: 'Facebook', x: 'X / Twitter', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok' };
    sosial.innerHTML = Object.entries(data.media_sosial ?? {})
      .map(([key, url]) => linkChip(labels[key] ?? key, url))
      .join('');
  }
}
