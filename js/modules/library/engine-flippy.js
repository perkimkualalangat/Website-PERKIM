/**
 * engine-flippy.js — adapter enjin flipbook PDF.
 *
 * Antara muka yang dijangka oleh library.js:
 *   open(container, url) -> Promise<{ destroy(), next(), prev(), goTo() }>
 *
 * Enjin: flippy-pdf v2.0.0 (MIT), disalin ke js/vendor/flippy.
 * API disahkan daripada sumber pakej: new Flipbook({ container }),
 * load(url), next(), prev(), goTo(page), destroy(), setWorkerSrc(url).
 *
 * Untuk menukar enjin, tulis fail engine-xxx.js dengan fungsi open() yang
 * sama dan tukar satu baris import dinamik dalam library.js.
 */

import { Flipbook, setWorkerSrc } from '../../vendor/flippy/index.js';
import { siteHref } from '../../paths.js';

// PDF.js memerlukan worker. Hos sendiri supaya tiada permintaan CDN.
setWorkerSrc(siteHref('js/vendor/pdfjs/pdf.worker.min.mjs'));

export async function open(container, url, options = {}) {
  const flipbook = new Flipbook({ container, ...options });

  try {
    await flipbook.load(url);
  } catch (error) {
    // Jangan tinggalkan DOM atau memori PDF yang separuh siap.
    try {
      flipbook.destroy();
    } catch {
      /* abaikan */
    }
    throw error;
  }

  return flipbook;
}
