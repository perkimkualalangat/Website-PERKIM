/**
 * sorotan.js — slaid gambar bertindan untuk sorotan program di halaman utama.
 *
 * Tiga kad kelihatan pada satu masa. Kad hadapan bergerak keluar untuk
 * mendedahkan kad di belakang; keterangan gambar dipaparkan di bawah slaid.
 */

const DEFAULT_INTERVAL = 7000;
const ANIMATION_MS = 560;
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3];
const DEFAULT_SPEED_INDEX = SPEEDS.indexOf(1);

function formatSpeed(value) {
  return `${value}×`;
}

function setupSlideshow(root) {
  const slides = Array.from(root.querySelectorAll('[data-sorotan-slide]'));
  if (!slides.length) return;

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
}

function setupProgramPanel(section) {
  const toggle = section.querySelector('[data-sorotan-toggle]');
  const details = section.querySelector('[data-sorotan-details]');
  const label = section.querySelector('[data-sorotan-toggle-label]');
  if (!toggle || !details) return;

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
}

export function initSorotan() {
  document.querySelectorAll('[data-sorotan-slideshow]').forEach(setupSlideshow);
  document.querySelectorAll('[data-sorotan]').forEach(setupProgramPanel);
}
