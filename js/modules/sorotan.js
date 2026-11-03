/**
 * sorotan.js — slaid gambar bertindan untuk sorotan program di halaman utama.
 *
 * Tiga kad kelihatan pada satu masa. Kad hadapan bergerak keluar untuk
 * mendedahkan kad di belakang; keterangan gambar dipaparkan di bawah slaid.
 * Program sorotan bernombor diambil daripada data/aktiviti.json.
 */

import { getJSON, formatDate } from './utils.js';
import { siteHref } from '../paths.js';

const DEFAULT_INTERVAL = 7000;
const ANIMATION_MS = 560;
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3];
const DEFAULT_SPEED_INDEX = SPEEDS.indexOf(1);

function formatSpeed(value) {
  return `${value}×`;
}

function formatProgramDate(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(iso);
  const weekday = new Intl.DateTimeFormat('ms-MY', { weekday: 'long' }).format(date);
  return `${formatDate(iso)} (${weekday})`;
}

function setupSlideshow(root) {
  if (!root) return null;

  let slides = Array.from(root.querySelectorAll('[data-sorotan-slide]'));

  const stage = root.querySelector('[data-sorotan-stage]');
  const caption = root.querySelector('[data-sorotan-caption]');
  const count = root.querySelector('[data-sorotan-count]');
  const prevButton = root.querySelector('[data-sorotan-prev]');
  const nextButton = root.querySelector('[data-sorotan-next]');
  const playButton = root.querySelector('[data-sorotan-play]');
  const playIcon = root.querySelector('[data-sorotan-play-icon]');
  const speedButton = root.querySelector('[data-sorotan-speed]');
  const speedLabel = root.querySelector('[data-sorotan-speed-label]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const baseInterval = Number(root.dataset.interval) || DEFAULT_INTERVAL;

  let index = 0;
  let busy = false;
  let timer = 0;
  let hovered = false;
  let focused = false;
  let paused = reducedMotion.matches || root.dataset.autoplay === 'false';
  let pointer = null;
  let speedIndex = DEFAULT_SPEED_INDEX;
  let speed = SPEEDS[speedIndex];

  function currentSlide() {
    return slides[index];
  }

  function paint() {
    if (!slides.length) {
      if (caption) caption.textContent = '';
      if (count) count.textContent = '';
      return;
    }

    slides.forEach((slide, position) => {
      const offset = (position - index + slides.length) % slides.length;
      slide.classList.toggle('is-front', offset === 0);
      slide.classList.toggle('is-mid', offset === 1);
      slide.classList.toggle('is-back', offset === 2);
      slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
    });

    const slide = currentSlide();
    if (caption) {
      caption.textContent =
        slide?.dataset.caption || slide?.querySelector('img')?.alt || '';
    }
    if (count) count.textContent = `${index + 1} / ${slides.length}`;
  }

  function updatePlayButton() {
    const playing = !paused;
    playButton?.setAttribute('aria-pressed', String(playing));
    playButton?.setAttribute(
      'aria-label',
      playing ? 'Hentikan slaid automatik' : 'Mulakan slaid automatik'
    );
    if (playIcon) playIcon.textContent = playing ? '❚❚' : '▶';
  }

  function updateSpeedButton() {
    const label = formatSpeed(speed);
    if (speedLabel) speedLabel.textContent = label;
    speedButton?.setAttribute(
      'aria-label',
      `Kelajuan slaid ${label}. Tekan untuk tukar kelajuan.`
    );
    speedButton?.setAttribute('title', `Kelajuan slaid: ${label}`);
  }

  function schedule() {
    window.clearTimeout(timer);
    const focusPaused =
      focused && !document.activeElement?.closest('.sorotan__controls');
    if (paused || hovered || focusPaused || document.hidden || slides.length < 2) return;
    timer = window.setTimeout(() => go(1, true), baseInterval / speed);
  }

  function go(direction, automatic = false) {
    if (busy || slides.length < 2) return;

    busy = true;
    window.clearTimeout(timer);

    const outgoing = currentSlide();
    const nextIndex = (index + direction + slides.length) % slides.length;

    document.documentElement.style.setProperty('--sorotan-dir', String(direction));

    if (direction > 0 && slides.length > 3) {
      outgoing.classList.add('is-leaving');
    }

    index = nextIndex;
    paint();

    const finish = () => {
      outgoing.classList.remove('is-leaving');
      busy = false;
      paint();
      schedule();
    };

    window.setTimeout(finish, reducedMotion.matches ? 30 : ANIMATION_MS);

    if (automatic) {
      // Memastikan pembaca skrin tidak mengganggu slaid automatik.
      caption?.setAttribute('aria-live', 'off');
    } else {
      caption?.setAttribute('aria-live', 'polite');
    }
  }

  function setSlides(nextSlides) {
    slides = Array.isArray(nextSlides) ? nextSlides : [];
    if (stage) stage.replaceChildren(...slides);
    index = 0;
    busy = false;
    window.clearTimeout(timer);
    paint();
    schedule();
  }

  prevButton?.addEventListener('click', () => go(-1));
  nextButton?.addEventListener('click', () => go(1));

  playButton?.addEventListener('click', () => {
    paused = !paused;
    updatePlayButton();
    schedule();
  });

  speedButton?.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % SPEEDS.length;
    speed = SPEEDS[speedIndex];
    updateSpeedButton();
    schedule();
  });

  root.addEventListener('mouseenter', () => {
    hovered = true;
    schedule();
  });

  root.addEventListener('mouseleave', () => {
    hovered = false;
    schedule();
  });

  root.addEventListener('focusin', () => {
    focused = true;
    schedule();
  });

  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) {
      focused = false;
      schedule();
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  });

  stage?.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });

  stage?.addEventListener('pointerup', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer = null;

    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  });

  stage?.addEventListener('pointercancel', () => {
    pointer = null;
  });

  stage?.addEventListener('dragstart', (event) => event.preventDefault());

  document.addEventListener('visibilitychange', schedule);

  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      paused = true;
      updatePlayButton();
      schedule();
    }
  });

  updatePlayButton();
  updateSpeedButton();
  paint();
  schedule();

  return { setSlides };
}

function createSlide(image, index) {
  const figure = document.createElement('figure');
  figure.className = 'sorotan__slide';
  if (index === 0) figure.classList.add('is-front');
  else if (index === 1) figure.classList.add('is-mid');
  else if (index === 2) figure.classList.add('is-back');
  figure.dataset.sorotanSlide = '';
  figure.dataset.caption = image.kapsyen || image.alt || '';
  figure.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');

  const img = document.createElement('img');
  img.src = siteHref(image.src);
  img.alt = image.alt || '';
  img.width = 1080;
  img.height = 1350;
  img.decoding = 'async';
  img.draggable = false;
  if (index === 0) {
    img.setAttribute('fetchpriority', 'high');
  } else {
    img.loading = 'lazy';
  }

  figure.appendChild(img);
  return figure;
}

function applyProgram(section, slideshow, panel, record) {
  const setText = (selector, value) => {
    const element = section.querySelector(selector);
    if (element) element.textContent = value || '';
  };

  setText('[data-sorotan-title]', record.tajuk);

  const date = section.querySelector('[data-sorotan-date]');
  if (date) {
    date.textContent = formatProgramDate(record.tarikh);
    if (record.tarikh) date.setAttribute('datetime', record.tarikh);
    else date.removeAttribute('datetime');
  }
  const dateFact = section.querySelector('[data-sorotan-fact="tarikh"]');
  if (dateFact) dateFact.hidden = !record.tarikh;

  const factValues = {
    masa: record.masa,
    tempat: record.lokasi,
    kehadiran: record.kehadiran,
  };
  const factSelectors = {
    masa: '[data-sorotan-time]',
    tempat: '[data-sorotan-place]',
    kehadiran: '[data-sorotan-attendance]',
  };

  Object.entries(factValues).forEach(([key, value]) => {
    setText(factSelectors[key], value);
    const fact = section.querySelector(`[data-sorotan-fact="${key}"]`);
    if (fact) fact.hidden = !value;
  });

  const captionText = String(record.caption || '').trim();
  const paragraphs = captionText
    ? captionText.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
    : [];

  setText('[data-sorotan-lead]', record.ringkas || paragraphs[0] || '');
  const detailsText = paragraphs.slice(1, 3).join('\n\n');
  const details = section.querySelector('[data-sorotan-text]');
  if (details) {
    details.textContent = detailsText;
    details.hidden = !detailsText;
  }

  const quote = section.querySelector('[data-sorotan-quote]');
  if (quote) {
    quote.hidden = !record.petikan;
    setText('[data-sorotan-quote-text]', record.petikan);
    setText('[data-sorotan-quote-cite]', record.petikan_oleh);
  }

  const reportRow = section.querySelector('[data-sorotan-report-row]');
  const reportLink = section.querySelector('[data-sorotan-report]');
  if (reportRow && reportLink) {
    if (record.laporan) {
      reportLink.href = siteHref(record.laporan);
      reportRow.hidden = false;
    } else {
      reportRow.hidden = true;
    }
  }

  const gallery = Array.isArray(record.gambar)
    ? record.gambar.filter((image) => image && image.src)
    : [];
  slideshow.setSlides(gallery.map(createSlide));

  const region = section.querySelector('[data-sorotan-slideshow]');
  if (region) region.setAttribute('aria-label', `Galeri gambar ${record.tajuk || ''}`);

  panel.setOpen(false);
}

function setupProgramPanel(section) {
  const toggle = section.querySelector('[data-sorotan-toggle]');
  const details = section.querySelector('[data-sorotan-details]');
  const label = section.querySelector('[data-sorotan-toggle-label]');
  if (!toggle || !details) return { setOpen() {} };

  function setOpen(open) {
    section.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    details.toggleAttribute('inert', !open);
    details.setAttribute('aria-hidden', String(!open));
    if (label) label.textContent = open ? 'Sembunyikan butiran' : 'Butiran program';
  }

  toggle.addEventListener('click', () => {
    setOpen(!section.classList.contains('is-open'));
  });

  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && section.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  setOpen(section.classList.contains('is-open'));

  return { setOpen };
}

function setupFeatured(section, slideshow, panel) {
  const picker = section.querySelector('[data-sorotan-picker]');
  if (!picker) return;

  const pager = section.querySelector('[data-sorotan-pager]');
  const prevProgram = section.querySelector('[data-sorotan-program-prev]');
  const nextProgram = section.querySelector('[data-sorotan-program-next]');
  let currentIndex = 0;

  getJSON('/data/aktiviti.json')
    .then((items) => {
      if (!Array.isArray(items)) return;

      const featured = items
        .filter(
          (item) =>
            item &&
            item.status !== 'ditarik' &&
            Number.isInteger(item.sorotan) &&
            item.sorotan > 0 &&
            Array.isArray(item.gambar) &&
            item.gambar.length
        )
        .sort((a, b) => a.sorotan - b.sorotan);

      if (!featured.length) return;

      picker.replaceChildren();
      featured.forEach((record) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sorotan__pick';
        button.dataset.sorotan = String(record.sorotan);
        button.textContent = String(record.sorotan).padStart(2, '0');
        button.title = record.tajuk || '';
        button.setAttribute(
          'aria-label',
          `Sorotan ${record.sorotan}: ${record.tajuk || ''}`
        );
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => activate(record));
        picker.appendChild(button);
      });

      function activate(record) {
        const index = featured.indexOf(record);
        if (index !== -1) currentIndex = index;

        picker.querySelectorAll('button').forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            String(button.dataset.sorotan === String(record.sorotan))
          );
        });
        applyProgram(section, slideshow, panel, record);
      }

      function step(direction) {
        currentIndex = (currentIndex + direction + featured.length) % featured.length;
        activate(featured[currentIndex]);
      }

      if (featured.length > 1) {
        pager?.removeAttribute('hidden');
        prevProgram?.addEventListener('click', () => step(-1));
        nextProgram?.addEventListener('click', () => step(1));
      }

      activate(featured[0]);
    })
    .catch((error) => {
      console.error('Sorotan: gagal memuat data -', error.message);
    });
}

export function initSorotan() {
  const section = document.querySelector('[data-sorotan]');
  if (!section) return;

  const slideshow = setupSlideshow(section.querySelector('[data-sorotan-slideshow]'));
  const panel = setupProgramPanel(section);
  if (!slideshow) return;

  setupFeatured(section, slideshow, panel);
}
