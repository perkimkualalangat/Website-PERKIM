/**
 * components.js — topbar, masthead, navigasi dan footer dikongsi semua halaman.
 * Data hubungan dan media sosial diambil daripada data/site.json.
 */

import { siteHref, siteUrl } from '../paths.js';

export const MENU = [
  { label: 'Utama', href: '/' },
  {
    label: 'Tentang',
    href: '/pages/tentang.html',
    sub: [
      { label: 'Profil Cawangan Kuala Langat', href: '/pages/tentang.html' },
      { label: 'PERKIM Kebangsaan', href: '/pages/latar-belakang.html' },
    ],
  },
  {
    label: 'Jaringan',
    href: '/pages/jaringan.html',
  },
  {
    label: 'Kepimpinan',
    href: '/pages/kepimpinan.html',
    sub: [
      { label: 'Senarai penuh AJK', href: '/pages/kepimpinan.html' },
      { label: 'Ringkasan jawatan', href: '/pages/kepimpinan.html#kepimpinan-summary' },
      { label: 'Sesi kepimpinan 2026–2028', href: '/pages/kepimpinan.html#kepimpinan-sesi' },
      { label: 'Menunggu pengesahan', href: '/pages/kepimpinan.html#menunggu-title' },
    ],
  },
  {
    label: 'Berita',
    href: '/pages/berita.html',
    sub: [
      { label: 'Semua berita', href: '/pages/berita.html' },
      { label: 'Tapis mengikut kategori', href: '/pages/berita.html#berita-filter' },
      { label: 'Arkib ringkasan', href: '/pages/berita.html#arkib-ringkasan' },
    ],
  },
  {
    label: 'Bahan Bacaan',
    href: '/pages/bahan-bacaan.html',
    sub: [
      { label: 'Rak buku PDF', href: '/pages/bahan-bacaan.html' },
      { label: 'Dokumen tersedia', href: '/pages/bahan-bacaan.html#bookshelf' },
    ],
  },
  {
    label: 'Hubungi',
    href: '/pages/hubungi.html',
    sub: [
      { label: 'Maklumat pejabat', href: '/pages/hubungi.html' },
      { label: 'Borang mesej', href: '/pages/hubungi.html#mesej' },
      { label: 'Lokasi di peta', href: '/pages/hubungi.html#lokasi' },
      { label: 'Media sosial rasmi', href: '/pages/hubungi.html#media-sosial' },
    ],
  },
];

const FOOTER_LINKS = [
  { label: 'Utama', href: '/' },
  { label: 'Tentang cawangan', href: '/pages/tentang.html' },
  { label: 'PERKIM Kebangsaan', href: '/pages/latar-belakang.html' },
  { label: 'Jaringan', href: '/pages/jaringan.html' },
  { label: 'Kepimpinan', href: '/pages/kepimpinan.html' },
  { label: 'Berita', href: '/pages/berita.html' },
  { label: 'Bahan Bacaan', href: '/pages/bahan-bacaan.html' },
  { label: 'Hubungi', href: '/pages/hubungi.html' },
];

const FALLBACK = {
  organisasi: {
    nama: 'PERKIM Cawangan Kuala Langat',
    nama_penuh: 'Pertubuhan Kebajikan Islam Malaysia',
    nama_inggeris: 'Muslim Welfare Organisation Malaysia',
    nama_arab: 'الجمعية الخيرية الإسلامية بماليزيا',
    cawangan: 'Cawangan Kuala Langat',
    ringkas:
      'Pejabat pengurusan organisasi bukan kerajaan yang menjalankan aktiviti dakwah, pendidikan, kebajikan dan kemasyarakatan di Kuala Langat.',
  },
  hubungi: {
    alamat: [
      'Lot 2029, Jalan Haji Darini, Lorong 4,',
      'Kampung Sungai Lang Baru,',
      '42700 Banting, Selangor',
    ],
    telefon: '016-353 6126',
    telefon_href: '+60163536126',
    whatsapp: 'https://wa.me/60163536126',
    emel: 'perkimkualalangat@gmail.com',
    waktu: 'Isnin–Khamis: 10:00 pagi – 4:00 petang',
    waktu_nota: 'Jumaat: 9:00 pagi – 12:00 tengah hari · Sabtu & Ahad tutup',
    peta: 'https://www.google.com/maps/search/?api=1&query=PERKIM+Kuala+Langat',
  },
  media_sosial: {},
  pautan_lain: {},
  pengumuman: 'Maklumat cawangan, kepimpinan dan bahan bacaan PERKIM Kuala Langat.',
  status: 'draf',
};

const ICON = {
  facebook:
    '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
  instagram:
    '<path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>',
  youtube:
    '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
  tiktok:
    '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  whatsapp:
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
  search:
    '<path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>',
};

const CONTACT_ICON = {
  pin: '<path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>',
  phone:
    '<path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>',
  clock:
    '<path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>',
  mail:
    '<path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/>',
};

function svg(path, viewBox = '0 0 24 24', className = 'icon') {
  return `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${path}</svg>`;
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function isCurrent(href) {
  const path = location.pathname.replace(/\/index\.html$/, '/');
  const [raw, hash] = String(href).split('#');
  const target = siteUrl(raw || 'index.html').pathname.replace(/\/index\.html$/, '/');
  if (path !== target) return false;
  // Pautan dengan #: aktif hanya jika bahagian itu sedang dipaparkan.
  if (!hash) return true;
  return location.hash === `#${hash}`;
}

const caret = '<span class="nav__caret" aria-hidden="true"></span>';

function menuItem(item) {
  if (!item.sub) {
    const current = isCurrent(item.href);
    return `<li${current ? ' class="is-current"' : ''}>
      <a href="${siteHref(item.href)}"${current ? ' aria-current="page"' : ''}>${item.label}</a>
    </li>`;
  }

  const children = item.sub
    .map(
      (child) =>
        `<li><a href="${siteHref(child.href)}"${
          isCurrent(child.href) ? ' aria-current="page"' : ''
        }>${child.label}</a></li>`
    )
    .join('');

  const active = item.sub.some((child) => isCurrent(child.href));
  const current = isCurrent(item.href);

  // Corak "split button": label ialah pautan ke halaman, anak panah membuka
  // submenu. Jadi pengguna tetap boleh terus ke halaman tanpa mencari menu.
  return `<li class="has-sub${active ? ' is-current' : ''}">
    <div class="nav__split">
      <a href="${siteHref(item.href)}"${current ? ' aria-current="page"' : ''}>${item.label}</a>
      <button type="button" class="nav__caret-btn" aria-expanded="false"
              aria-label="Tunjuk submenu ${esc(item.label)}" aria-haspopup="true">
        ${caret}
      </button>
    </div>
    <ul class="sub">${children}</ul>
  </li>`;
}

function todayLabel() {
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('ms-MY');
  }
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function socialItems(site, className = 'social-link') {
  const social = site.media_sosial || {};
  return Object.entries(social)
    .filter(([, value]) => value && value.url)
    .map(([key, value]) => {
      const icon = ICON[key];
      if (!icon) return '';
      return `<li><a class="${className}" href="${esc(value.url)}" target="_blank"
        rel="noopener noreferrer" aria-label="${esc(value.label)}" title="${esc(
          value.label
        )}">${svg(icon)}<span class="social-link__text">${esc(
          value.ringkas || value.label
        )}</span></a></li>`;
    })
    .join('');
}

function mastheadContact(site) {
  const c = site.hubungi || {};
  const address = (c.alamat || []).map(esc).join('<br>');
  return `
    <div class="masthead__contact" aria-label="Maklumat pejabat">
      <p class="masthead__contact-row">
        <span class="masthead__contact-icon">${svg(CONTACT_ICON.pin, '0 0 16 16')}</span>
        <span>${address}</span>
      </p>
      <p class="masthead__contact-row">
        <span class="masthead__contact-icon">${svg(CONTACT_ICON.phone, '0 0 16 16')}</span>
        <a href="tel:${esc(c.telefon_href || '')}">${esc(c.telefon || '')}</a>
      </p>
    </div>`;
}

function footerContact(site) {
  const c = site.hubungi || {};
  const address = (c.alamat || []).map(esc).join('<br>');
  return `
    <ul class="footer__contact">
      <li>${svg(CONTACT_ICON.pin, '0 0 16 16', 'icon icon--footer')}<span>${address}</span></li>
      <li>${svg(CONTACT_ICON.phone, '0 0 16 16', 'icon icon--footer')}<a href="tel:${esc(
        c.telefon_href || ''
      )}">${esc(c.telefon || '')}</a></li>
      <li>${svg(CONTACT_ICON.mail, '0 0 16 16', 'icon icon--footer')}<a href="mailto:${esc(
        c.emel || ''
      )}">${esc(c.emel || '')}</a></li>
      <li>${svg(CONTACT_ICON.clock, '0 0 16 16', 'icon icon--footer')}<span>${esc(
        c.waktu || ''
      )}<br><small>${esc(c.waktu_nota || '')}</small></span></li>
    </ul>`;
}

async function loadSite() {
  try {
    const response = await fetch(siteUrl('data/site.json'), { cache: 'no-store' });
    if (!response.ok) throw new Error(`site.json ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Gagal memuatkan data/site.json:', error);
    return FALLBACK;
  }
}

export async function mountHeaderFooter() {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (!header && !footer) return;

  const site = await loadSite();
  const org = site.organisasi || FALLBACK.organisasi;
  const contact = site.hubungi || FALLBACK.hubungi;

  if (header) {
    header.innerHTML = `
      <div class="topbar">
        <div class="container topbar__inner">
          <p class="topbar__date"><time datetime="${todayISO()}">${esc(todayLabel())}</time></p>
          <div class="topbar__announce" data-ticker>
            <p class="topbar__announce-fallback">${esc(site.pengumuman || '')}</p>
          </div>
          <ul class="topbar__social social-links" aria-label="Media sosial">
            ${socialItems(site)}
          </ul>
        </div>
      </div>

      <header class="masthead">
        <div class="container masthead__inner">
          <a class="masthead__brand" href="${siteHref('index.html')}" aria-label="${esc(org.nama)} — Utama">
            <img class="masthead__logo" src="${siteHref('assets/img/logo-perkim-180.png')}"
                 alt="Logo PERKIM" width="82" height="82" decoding="async">
            <span class="masthead__wordmark">
              <span class="masthead__org">${esc(org.nama_penuh)}</span>
              <span class="masthead__arabic" lang="ar" dir="rtl">${esc(org.nama_arab)}</span>
              <span class="masthead__eng">${esc(org.nama_inggeris)}</span>
              <span class="masthead__branch">${esc(org.cawangan)}</span>
            </span>
          </a>
          ${mastheadContact(site)}
        </div>
      </header>

      <nav class="mainnav" aria-label="Navigasi utama">
        <div class="container mainnav__inner">
          <button type="button" class="nav-toggle" id="nav-toggle"
                  aria-expanded="false" aria-controls="primary-nav" aria-label="Buka menu">
            <span class="nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="nav-toggle__text">Menu</span>
          </button>
          <ul class="nav" id="primary-nav">
            ${MENU.map(menuItem).join('')}
          </ul>
          <button type="button" class="nav-search" id="search-open"
                  aria-haspopup="dialog" aria-controls="site-search" aria-expanded="false"
                  aria-label="Cari di laman ini">
            ${svg(ICON.search, '0 0 24 24', 'icon icon--search')}
            <span class="nav-search__text">Cari</span>
          </button>
        </div>
      </nav>

      <dialog class="search-dialog" id="site-search" aria-labelledby="search-title">
        <form method="dialog" class="search-dialog__head">
          <h2 id="search-title">Cari di laman ini</h2>
          <button class="search-dialog__close" value="close" aria-label="Tutup carian">×</button>
        </form>
        <div class="search-dialog__field">
          <label class="visually-hidden" for="search-input">Kata kunci</label>
          <input id="search-input" type="search" name="q" autocomplete="off"
                 placeholder="Cari halaman, buku atau maklumat…">
        </div>
        <p class="search-dialog__hint">Contoh: kepimpinan, alamat, bahan bacaan, telefon.</p>
        <ul class="search-results" id="search-results"></ul>
        <p class="search-dialog__status" id="search-status" role="status" aria-live="polite"></p>
      </dialog>`;
  }

  if (footer) {
    const year = new Date().getFullYear();
    const social = socialItems(site, 'social-link social-link--footer');
    const linktree = site.pautan_lain?.linktree;
    const tiktokNote = site.media_sosial?.tiktok?.nota;

    footer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer__top">
            <div class="footer__brand">
              <a class="footer__brand-link" href="${siteHref('index.html')}">
                <img src="${siteHref('assets/img/logo-perkim-128.png')}" alt="" width="54" height="54">
                <span>
                  <strong>${esc(org.nama_penuh)}</strong>
                  <span>${esc(org.nama_inggeris)}</span>
                  <em>${esc(org.cawangan)}</em>
                </span>
              </a>
              <p>${esc(org.ringkas || '')}</p>
              ${
                linktree
                  ? `<a class="footer__linktree" href="${esc(
                      linktree
                    )}" target="_blank" rel="noopener noreferrer">Semua pautan rasmi (Linktree) ↗</a>`
                  : ''
              }
            </div>

            <div class="footer__col">
              <h2 class="footer__title">Pautan</h2>
              <ul class="footer__links">
                ${FOOTER_LINKS.map(
                  (item) => `<li><a href="${siteHref(item.href)}">${item.label}</a></li>`
                ).join('')}
              </ul>
            </div>

            <div class="footer__col">
              <h2 class="footer__title">Hubungi</h2>
              ${footerContact(site)}
              <p class="footer__map">
                <a href="${esc(contact.peta || '#')}" target="_blank" rel="noopener noreferrer">Lihat lokasi di Google Maps ↗</a>
              </p>
              <a class="btn-map btn-map--compact"
                 href="${esc(contact.peta || '#')}"
                 target="_blank" rel="noopener noreferrer"
                 data-map-label="Buka Google Maps"
                 data-map-hint="Pejabat Cawangan Kuala Langat"
                 data-map-address="${esc(contact.alamat_satu_baris || '')}"
                 data-map-bbox="101.5024,2.7926,101.5075,2.7964"
                 data-map-marker="2.7945,101.5049">Buka Google Maps</a>
            </div>

            <div class="footer__col">
              <h2 class="footer__title">Ikuti Kami</h2>
              <ul class="footer__social social-links">${social}</ul>
              ${
                tiktokNote
                  ? `<p class="footer__social-note">${esc(tiktokNote)}</p>`
                  : ''
              }
            </div>
          </div>

          <div class="footer__bottom">
            <p>© <span id="footer-year">${year}</span> ${esc(org.nama)}. Hak cipta terpelihara.</p>
            <p class="footer__draft">Draf dalaman · Belum disahkan untuk penerbitan.</p>
          </div>
        </div>
      </footer>`;
  }
}
