/**
 * nav.js — menu mudah alih, submenu boleh lipat, dan pengendalian papan kekunci.
 */

const MOBILE_QUERY = '(max-width: 880px)';

export function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!nav) return;

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Buka menu');
    nav.style.removeProperty('top');
    nav.style.removeProperty('max-height');
    document.body.classList.remove('nav-open');
  };

  const openMenu = () => {
    const bar = nav.closest('.mainnav');
    if (bar) {
      const bottom = Math.round(bar.getBoundingClientRect().bottom);
      nav.style.top = `${bottom}px`;
      nav.style.maxHeight = `calc(100dvh - ${bottom}px)`;
    }
    nav.classList.add('is-open');
    toggle?.classList.add('is-open');
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.setAttribute('aria-label', 'Tutup menu');
    document.body.classList.add('nav-open');
  };

  toggle?.addEventListener('click', () => {
    nav.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  // Submenu: butang buka/tutup (desktop guna hover, tetapi klik juga berfungsi)
  nav.querySelectorAll('.has-sub > .nav__split > .nav__caret-btn').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const parent = btn.closest('.has-sub');
      const willOpen = !parent.classList.contains('open');

      // Tutup submenu lain supaya panel tidak berterabur
      nav.querySelectorAll('.has-sub.open').forEach((other) => {
        if (other !== parent) {
          other.classList.remove('open');
          other
            .querySelector('.nav__caret-btn')
            ?.setAttribute('aria-expanded', 'false');
        }
      });

      parent.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  // Tutup submenu bila fokus leaving item (Escape atau Tab keluar)
  nav.querySelectorAll('.has-sub').forEach((li) => {
    li.addEventListener('focusout', (event) => {
      if (li.contains(event.relatedTarget)) return;
      li.classList.remove('open');
      li.querySelector('.nav__caret-btn')?.setAttribute('aria-expanded', 'false');
    });
  });

  // Tutup menu selepas memilih pautan (mobile)
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia(MOBILE_QUERY).matches) closeMenu();
    });
  });

  // Escape menutup menu dan submenu
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeMenu();
    nav.querySelectorAll('.has-sub.open').forEach((li) => {
      li.classList.remove('open');
      li.querySelector('.nav__caret-btn')?.setAttribute('aria-expanded', 'false');
    });
  });

  // Klik di luar kawasan navigasi
  document.addEventListener('click', (event) => {
    if (nav.contains(event.target) || toggle?.contains(event.target)) return;

    nav.querySelectorAll('.has-sub.open').forEach((li) => {
      li.classList.remove('open');
      li.querySelector('.nav__caret-btn')?.setAttribute('aria-expanded', 'false');
    });

    if (!nav.classList.contains('is-open')) return;
    closeMenu();
  });

  // Kembali ke desktop: bersihkan keadaan mudah alih
  window.matchMedia(MOBILE_QUERY).addEventListener('change', (event) => {
    if (!event.matches) {
      closeMenu();
      nav.querySelectorAll('.has-sub.open').forEach((li) => li.classList.remove('open'));
    }
  });
}
