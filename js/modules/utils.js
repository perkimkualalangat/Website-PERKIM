/** utils.js — pembantu kecil yang dikongsi antara modul. */

import { siteUrl } from '../paths.js';

export async function getJSON(url) {
  // Laluan dalaman diselesaikan terhadap akar laman supaya berfungsi juga
  // apabila laman dihoskan dalam subfolder (cth. GitHub Pages /Website-PERKIM/).
  const res = await fetch(siteUrl(url), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Gagal memuatkan ${url} (${res.status})`);
  return res.json();
}

/** Escape teks sebelum dimasukkan ke innerHTML. */
export const esc = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
  );

/** Tarikh ISO (YYYY-MM-DD) -> "30 Oktober 2026". */
export function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return esc(iso);
  return new Intl.DateTimeFormat('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
