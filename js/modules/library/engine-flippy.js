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
 * Opsyen tambahan `pdfOptions` dihantar terus ke pdfjsLib.getDocument()
 * (sokongan ditambah dalam js/vendor/flippy/flipbook.js).
 *
 * Untuk menukar enjin, tulis fail engine-xxx.js dengan fungsi open() yang
 * sama dan tukar satu baris import dinamik dalam library.js.
 */

import { Flipbook, setWorkerSrc } from '../../vendor/flippy/index.js';
import { siteHref } from '../../paths.js';

// PDF.js memerlukan worker. Hos sendiri supaya tiada permintaan CDN.
// Cache-buster ?v= memastikan worker sepadan dengan pdf.min.mjs yang
// di-vendor, mengelak cache lama menyebabkan API/worker bercanggah.
const PDFJS_VERSION = '4.10.38';
setWorkerSrc(siteHref(`js/vendor/pdfjs/pdf.worker.min.mjs?v=${PDFJS_VERSION}`));

// Elak permintaan HTTP Range yang tersekat pada "Loading PDF… 101%" apabila
// fail dihoskan di URL awam R2 (r2.dev). PDF.js akan memuat turun keseluruhan
// fail sekali gus. Boleh dibuang semula apabila custom domain R2 digunakan.
const PDF_OPTIONS = {
  disableRange: true,
  disableAutoFetch: true,
};

export async function open(container, url, options = {}) {
  const { pdfOptions, ...flipbookOptions } = options;
  const flipbook = new Flipbook({
    container,
    ...flipbookOptions,
    pdfOptions: { ...PDF_OPTIONS, ...pdfOptions },
  });

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
