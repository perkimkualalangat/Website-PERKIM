/**
 * render.js — pemaparan teks jawapan AI dengan selamat.
 *
 * Jawapan model dianggap teks tidak dipercayai. Semua kandungan ditulis melalui
 * createTextNode / textContent; hanya pautan http(s), mailto, tel dan pautan
 * dalaman laman dibenarkan. Tiada innerHTML digunakan untuk jawapan AI.
 */
import { siteUrl } from '../../paths.js';

/** Cipta elemen ringkas. */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pautanSelamat(mentah) {
  const url = String(mentah || '').trim();
  if (!url) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
  try {
    return siteUrl(url).href;
  } catch {
    return null;
  }
}

const INLINE_RE =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s<)\]]+)/g;

function tulisInline(sasaran, teks) {
  let akhir = 0;
  let padanan;

  INLINE_RE.lastIndex = 0;
  while ((padanan = INLINE_RE.exec(teks)) !== null) {
    if (padanan.index > akhir) {
      sasaran.append(document.createTextNode(teks.slice(akhir, padanan.index)));
    }

    if (padanan[1] !== undefined) {
      const label = padanan[1];
      const href = pautanSelamat(padanan[2]);
      if (!href) {
        sasaran.append(document.createTextNode(label));
      } else {
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.textContent = label;
        if (/^https?:\/\//i.test(href)) {
          try {
            if (new URL(href).origin !== location.origin) {
              anchor.target = '_blank';
              anchor.rel = 'noopener noreferrer';
            }
          } catch {
            // Biarkan pautan tanpa target jika URL tidak dapat dihurai.
          }
        }
        sasaran.append(anchor);
      }
    } else if (padanan[3] !== undefined) {
      const kuat = document.createElement('strong');
      kuat.textContent = padanan[3];
      sasaran.append(kuat);
    } else if (padanan[4] !== undefined) {
      let url = padanan[4];
      let ekor = '';
      const tanda = /[.,;:!?]+$/.exec(url);
      if (tanda) {
        ekor = tanda[0];
        url = url.slice(0, -ekor.length);
      }
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.textContent = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      sasaran.append(anchor);
      if (ekor) sasaran.append(document.createTextNode(ekor));
    }

    akhir = INLINE_RE.lastIndex;
  }

  if (akhir < teks.length) {
    sasaran.append(document.createTextNode(teks.slice(akhir)));
  }
}

/**
 * Paparkan teks jawapan AI sebagai perenggan, senarai dan pautan.
 * @param {HTMLElement} sasaran
 * @param {string} teks
 */
export function renderRichText(sasaran, teks) {
  sasaran.replaceChildren();
  const baris = String(teks || '').replace(/\r\n/g, '\n').split('\n');

  let senarai = null;
  let jenisSenarai = '';

  const tutupSenarai = () => {
    senarai = null;
    jenisSenarai = '';
  };

  for (const mentah of baris) {
    const barisBersih = mentah.trim();

    if (!barisBersih || /^```/.test(barisBersih)) {
      if (!barisBersih) tutupSenarai();
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(barisBersih);
    const nombor = /^(\d+)[.)]\s+(.*)$/.exec(barisBersih);

    if (bullet) {
      if (!senarai || jenisSenarai !== 'ul') {
        senarai = document.createElement('ul');
        jenisSenarai = 'ul';
        sasaran.append(senarai);
      }
      const item = document.createElement('li');
      tulisInline(item, bullet[1]);
      senarai.append(item);
      continue;
    }

    if (nombor) {
      if (!senarai || jenisSenarai !== 'ol') {
        senarai = document.createElement('ol');
        jenisSenarai = 'ol';
        sasaran.append(senarai);
      }
      const item = document.createElement('li');
      tulisInline(item, nombor[2]);
      senarai.append(item);
      continue;
    }

    tutupSenarai();

    const tajuk = /^#{1,6}\s+(.*)$/.exec(barisBersih);
    const petikan = /^>\s?(.*)$/.exec(barisBersih);
    const isi = tajuk ? tajuk[1] : petikan ? petikan[1] : barisBersih;

    const perenggan = document.createElement('p');
    if (tajuk) {
      const kuat = document.createElement('strong');
      tulisInline(kuat, isi);
      perenggan.append(kuat);
    } else {
      tulisInline(perenggan, isi);
    }
    if (petikan) perenggan.className = 'perkimbot__quote';
    sasaran.append(perenggan);
  }
}

/** Tukar markdown ringkas kepada teks biasa (untuk pratonton / salin). */
export function teksBiasa(teks) {
  return String(teks || '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}
