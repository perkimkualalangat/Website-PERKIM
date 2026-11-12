/**
 * paths.js — asas URL laman.
 *
 * Laman mesti berfungsi di dua tempat:
 *   1. Akar domain  — http://localhost:8081/ , https://domain rasmi/
 *   2. Subfolder    — https://perkimkualalangat.github.io/Website-PERKIM/
 *
 * Semua rujukan dalaman disimpan tanpa "/" di hadapan (contoh: "data/site.json")
 * dan diselesaikan melalui pembantu di sini. Jangan guna fetch('/data/...') terus.
 */

/** URL akar laman, dikira daripada lokasi fail ini (js/paths.js). */
export const SITE_ROOT = new URL('../', import.meta.url);

/**
 * Selesaikan laluan dalaman terhadap akar laman.
 * @param {string} path contoh: "data/site.json", "/pages/berita.html#arkib"
 * @returns {URL}
 */
export function siteUrl(path = '') {
  const value = String(path);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) {
    // Pautan luar (https:, mailto:, tel:, //cdn/...) — biar seperti asal.
    // Base hanya digunakan untuk URL protokol-relatif (//host/...).
    return new URL(value, SITE_ROOT);
  }
  return new URL(value.replace(/^\/+/, ''), SITE_ROOT);
}

/** Sama seperti siteUrl, tetapi memulangkan rentetan untuk atribut href/src. */
export function siteHref(path = '') {
  return siteUrl(path).href;
}
