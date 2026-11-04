/**
 * tetapan.js — alat pentadbiran tempatan untuk program, gambar dan data aktiviti.
 *
 * Halaman ini hanya berfungsi melalui tools/serve.mjs pada localhost. Semua
 * operasi menulis fail dilakukan oleh skrip Python melalui API /api/tetapan/*.
 */

import { siteUrl } from '../paths.js';
import { esc, formatDate } from './utils.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const DEFAULT_FACEBOOK =
  'https://www.facebook.com/people/Perkim-Kuala-Langat/61574216275902/';

const state = {
  local: false,
  ready: false,
  processing: false,
  programs: [],
  images: [],
  slug: '',
  log: [],
  slugTouched: false,
};

let el = {};

function todayISO() {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
    );
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function clockLabel() {
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString('ms-MY');
  }
}

function log(message, tone = 'info') {
  const prefix = tone === 'error' ? 'RALAT' : tone === 'warn' ? 'AMARAN' : 'INFO';
  state.log.push(`[${clockLabel()}] ${prefix}: ${message}`);
  if (el.log) {
    el.log.textContent = state.log.join('\n\n');
    el.log.scrollTop = el.log.scrollHeight;
  }
  updateControls();
}

function setStatus(message, tone = '') {
  if (!el.status) return;
  el.status.textContent = message;
  if (tone) el.status.dataset.tone = tone;
  else delete el.status.dataset.tone;
}

function setGalleryStatus(message, tone = '') {
  if (!el.galleryStatus) return;
  el.galleryStatus.textContent = message;
  if (tone) el.galleryStatus.dataset.tone = tone;
  else delete el.galleryStatus.dataset.tone;
}

function setFormStatus(message, tone = '') {
  if (!el.formStatus) return;
  el.formStatus.textContent = message;
  el.formStatus.classList.toggle('is-visible', Boolean(message));
  el.formStatus.classList.toggle('form__status--ok', tone === 'ok');
  el.formStatus.classList.toggle('form__status--ralat', tone === 'error');
}

function setProcessing(value) {
  state.processing = value;
  updateControls();
}

function updateControls() {
  if (!el.app) return;
  const blocked = state.processing || !state.ready;
  [el.kemaskini, el.semakTapak, el.muat].forEach((button) => {
    if (button) button.disabled = blocked;
  });
  if (el.submitCipta) el.submitCipta.disabled = blocked;
  if (el.programSelect) {
    el.programSelect.disabled = blocked || state.programs.length === 0;
  }
  if (el.fileInput) el.fileInput.disabled = blocked || !state.slug;
  if (el.scanButton) el.scanButton.disabled = blocked || !state.slug;
  if (el.saveButton) {
    const missingAlt = state.images.some((image) => image.wujud && !image.alt.trim());
    const missingFile = state.images.some((image) => !image.wujud);
    el.saveButton.disabled =
      blocked || !state.slug || state.images.length === 0 || missingAlt || missingFile;
  }
  if (el.clearLog) el.clearLog.disabled = blocked || state.log.length === 0;
  if (el.programList) {
    el.programList.querySelectorAll('[data-program-gambar]').forEach((button) => {
      button.disabled = blocked;
    });
  }
  if (el.dropzone) {
    const disabled = blocked || !state.slug;
    el.dropzone.classList.toggle('is-disabled', disabled);
    el.dropzone.setAttribute('aria-disabled', String(disabled));
  }
}

async function apiFetch(action, options = {}) {
  const response = await fetch(siteUrl(`api/tetapan/${action}`), {
    cache: 'no-store',
    ...options,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respons tidak sah daripada pelayan (HTTP ${response.status}).`);
  }
  if (!response.ok && !Array.isArray(data.ralat)) {
    throw new Error(`Permintaan gagal (HTTP ${response.status}).`);
  }
  return data;
}

function statusBadge(program) {
  if (!program.sah) {
    return '<span class="tetapan-badge tetapan-badge--ralat">Perlu betulkan</span>';
  }
  if (program.status === 'disahkan') {
    return '<span class="tetapan-badge tetapan-badge--ok">Disahkan</span>';
  }
  if (program.status === 'ditarik') {
    return '<span class="tetapan-badge tetapan-badge--muted">Ditarik</span>';
  }
  return '<span class="tetapan-badge tetapan-badge--warn">Draf</span>';
}

function renderSummary() {
  const total = state.programs.length;
  const draf = state.programs.filter((program) => program.status === 'draf').length;
  const disahkan = state.programs.filter((program) => program.status === 'disahkan').length;
  const sorotan = state.programs.filter((program) => program.sorotan !== null).length;
  const gambar = state.programs.reduce((sum, program) => sum + (Number(program.gambar) || 0), 0);
  el.statProgram.textContent = String(total);
  el.statDraf.textContent = String(draf);
  el.statDisahkan.textContent = String(disahkan);
  el.statSorotan.textContent = String(sorotan);
  el.statGambar.textContent = String(gambar);
}

function messageList(items, className) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `<ul class="${className}">${items
    .map((item) => `<li>${esc(item)}</li>`)
    .join('')}</ul>`;
}

function renderPrograms() {
  if (!el.programList) return;
  if (state.programs.length === 0) {
    el.programList.innerHTML =
      '<p class="tetapan-kosong">Tiada folder program ditemui. Cipta program pertama dalam tab Cipta Program.</p>';
    return;
  }

  el.programList.innerHTML = state.programs
    .map((program) => {
      const errors = Array.isArray(program.mesej_ralat) ? program.mesej_ralat : [];
      const warnings = Array.isArray(program.mesej_amaran) ? program.mesej_amaran : [];
      const tarikh = program.tarikh ? formatDate(program.tarikh) : '—';
      return `<article class="tetapan-program${program.sah ? '' : ' is-error'}">
        <div class="tetapan-program__main">
          <h3>${esc(program.tajuk)}</h3>
          <p class="tetapan-program__slug"><code>program/${esc(program.folder)}</code></p>
          ${statusBadge(program)}
          ${errors.length ? `<div class="tetapan-program__messages">
            <strong>${errors.length} ralat</strong>
            ${messageList(errors, 'tetapan-program__list')}
          </div>` : ''}
          ${warnings.length ? `<div class="tetapan-program__messages tetapan-program__messages--warn">
            <strong>${warnings.length} amaran</strong>
            ${messageList(warnings, 'tetapan-program__list')}
          </div>` : ''}
        </div>
        <dl class="tetapan-program__facts">
          <div><dt>Tarikh</dt><dd>${esc(tarikh)}</dd></div>
          <div><dt>Status</dt><dd>${program.status ? esc(program.status) : '—'}</dd></div>
          <div><dt>Gambar</dt><dd>${Number(program.gambar) || 0} / ${Number(program.gambar_tersedia) || 0}</dd></div>
          <div><dt>Sorotan</dt><dd>${program.sorotan === null || program.sorotan === undefined ? '—' : esc(String(program.sorotan))}</dd></div>
        </dl>
        <div class="tetapan-program__actions">
          <button class="btn btn--sm" type="button" data-program-gambar="${esc(program.folder)}"
                  ${state.processing || !state.ready ? 'disabled' : ''}>Urus gambar</button>
        </div>
      </article>`;
    })
    .join('');
}

function populateProgramSelect() {
  if (!el.programSelect) return;
  const current = state.slug || el.programSelect.value;
  el.programSelect.replaceChildren(new Option('Pilih program…', ''));
  state.programs.forEach((program) => {
    el.programSelect.append(new Option(`${program.tajuk} — ${program.folder}`, program.folder));
  });
  if (current && state.programs.some((program) => program.folder === current)) {
    el.programSelect.value = current;
  }
}

function setTab(name) {
  el.tabs.forEach((tab) => {
    const active = tab.id === `tab-${name}`;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    if (panel) panel.hidden = !active;
  });
}

function bindTabs() {
  el.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setTab(tab.id.replace('tab-', '')));
    tab.addEventListener('keydown', (event) => {
      let target = -1;
      if (event.key === 'ArrowRight') target = (index + 1) % el.tabs.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + el.tabs.length) % el.tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = el.tabs.length - 1;
      if (target < 0) return;
      event.preventDefault();
      el.tabs[target].focus();
      setTab(el.tabs[target].id.replace('tab-', ''));
    });
  });
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function setDefaults() {
  if (el.inputTarikh && !el.inputTarikh.value) el.inputTarikh.value = todayISO();
  if (el.inputFacebook && !el.inputFacebook.value) el.inputFacebook.value = DEFAULT_FACEBOOK;
}

async function refreshStatus({ logSuccess = false } = {}) {
  if (!state.local || state.processing) return false;
  setProcessing(true);
  setStatus('Membaca status program…');
  let ok = false;
  try {
    const data = await apiFetch('status');
    state.ready = true;
    state.programs = Array.isArray(data.program) ? data.program : [];
    state.programs.sort((a, b) => String(b.tarikh || '').localeCompare(String(a.tarikh || '')));
    renderSummary();
    renderPrograms();
    populateProgramSelect();
    el.mod.hidden = true;
    ok = Boolean(data.ok);
    if (ok) {
      setStatus(`Status sedia: ${data.rekod ?? state.programs.length} program.`, 'ok');
      if (logSuccess) log(`Status dibaca: ${data.rekod ?? state.programs.length} program sah.`);
    } else {
      const errors = Array.isArray(data.ralat) ? data.ralat : [];
      setStatus(`${errors.length} ralat ditemui. Semak senarai program.`, 'error');
      log(`Status dibaca dengan ralat:\n${errors.join('\n')}`, 'error');
    }
    if (Array.isArray(data.amaran) && data.amaran.length) {
      log(`Amaran status:\n${data.amaran.join('\n')}`, 'warn');
    }
  } catch (error) {
    state.ready = false;
    el.mod.hidden = false;
    el.modText.textContent = `API tidak dapat dihubungi: ${error.message} Pastikan start.bat dijalankan dengan Node.js.`;
    setStatus('API Tetapan tidak tersedia.', 'error');
    log(`API Tetapan gagal: ${error.message}`, 'error');
  } finally {
    setProcessing(false);
    updateControls();
  }
  return ok;
}

function galleryItemMarkup(image, index) {
  const thumb = image.wujud
    ? `<img src="${esc(siteUrl(image.src).href)}" alt="" decoding="async">`
    : '<span class="tetapan-gambar__missing">Fail tiada</span>';
  return `<article class="tetapan-gambar${image.wujud ? '' : ' is-missing'}"
                   data-gambar-index="${index}">
    <div class="tetapan-gambar__thumb">${thumb}</div>
    <div class="tetapan-gambar__body">
      <p class="tetapan-gambar__name">
        <strong>${esc(image.nama)}</strong>
        ${
          image.disenaraikan
            ? '<span class="tetapan-badge tetapan-badge--ok">Disenaraikan</span>'
            : '<span class="tetapan-badge tetapan-badge--warn">Belum disenaraikan</span>'
        }
        ${image.wujud ? '' : '<span class="tetapan-badge tetapan-badge--ralat">Fail tiada</span>'}
      </p>
      <div class="tetapan-gambar__fields">
        <div class="field">
          <label for="gambar-alt-${index}">Alt text <span class="req" aria-hidden="true">*</span></label>
          <input id="gambar-alt-${index}" data-gambar-alt type="text" value="${esc(image.alt)}"
                 placeholder="Huraikan gambar untuk pembaca skrin">
        </div>
        <div class="field">
          <label for="gambar-kapsyen-${index}">Kapsyen (pilihan)</label>
          <input id="gambar-kapsyen-${index}" data-gambar-kapsyen type="text"
                 value="${esc(image.kapsyen)}" placeholder="Kapsyen ringkas">
        </div>
      </div>
    </div>
    <div class="tetapan-gambar__actions">
      <button class="tetapan-iconbtn" type="button" data-gambar-naik
              aria-label="Naikkan ${esc(image.nama)}" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button class="tetapan-iconbtn" type="button" data-gambar-turun
              aria-label="Turunkan ${esc(image.nama)}"
              ${index === state.images.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="tetapan-iconbtn tetapan-iconbtn--danger" type="button" data-gambar-buang
              aria-label="Buang ${esc(image.nama)} daripada senarai">Buang</button>
    </div>
  </article>`;
}

function renderImages() {
  if (!el.galleryList) return;
  if (!state.slug) {
    el.galleryList.innerHTML =
      '<p class="tetapan-kosong">Pilih program untuk mengimbas gambar.</p>';
    updateControls();
    return;
  }
  if (state.images.length === 0) {
    el.galleryList.innerHTML =
      '<p class="tetapan-kosong">Tiada gambar dalam folder ini. Muat naik atau salin gambar ke folder program, kemudian tekan Imbas Gambar.</p>';
    updateControls();
    return;
  }
  el.galleryList.innerHTML = state.images.map(galleryItemMarkup).join('');
  updateControls();
}

async function scanProgram(slug) {
  if (!slug || state.processing) return;
  state.slug = slug;
  setProcessing(true);
  setStatus(`Mengimbas gambar ${slug}…`);
  setGalleryStatus('Mengimbas gambar…');
  try {
    const data = await apiFetch(`program?slug=${encodeURIComponent(slug)}`);
    if (state.slug !== slug) return;
    state.images = (Array.isArray(data.gambar) ? data.gambar : []).map((image) => ({
      ...image,
      alt: image.alt || '',
      kapsyen: image.kapsyen || '',
    }));
    renderImages();
    if (data.ok) {
      setStatus(`Gambar ${slug} dibaca.`, 'ok');
      setGalleryStatus(
        state.images.length
          ? `${state.images.length} gambar ditemui. Isi alt text sebelum menyimpan.`
          : 'Tiada gambar dalam folder ini.'
      );
    } else {
      const errors = Array.isArray(data.ralat) ? data.ralat : [];
      setStatus(`Ralat pada ${slug}.`, 'error');
      setGalleryStatus(errors.join(' ') || 'Gagal mengimbas gambar.', 'error');
      log(`Ralat imbas ${slug}:\n${errors.join('\n')}`, 'error');
    }
    if (Array.isArray(data.amaran) && data.amaran.length) {
      log(`Imbas ${slug}:\n${data.amaran.join('\n')}`, 'warn');
    }
  } catch (error) {
    setStatus('Gagal mengimbas gambar.', 'error');
    setGalleryStatus(`Gagal mengimbas: ${error.message}`, 'error');
    log(`Gagal mengimbas ${slug}: ${error.message}`, 'error');
  } finally {
    setProcessing(false);
  }
}

function openGallery(slug) {
  if (!slug) return;
  state.slug = slug;
  if (el.programSelect) el.programSelect.value = slug;
  setTab('gambar');
  scanProgram(slug);
}

function moveImage(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.images.length) return;
  [state.images[index], state.images[target]] = [state.images[target], state.images[index]];
  renderImages();
  const selector = delta === -1 ? '[data-gambar-naik]' : '[data-gambar-turun]';
  el.galleryList
    .querySelector(`[data-gambar-index="${target}"] ${selector}`)
    ?.focus();
}

async function uploadFiles(fileList) {
  if (!state.slug || state.processing) return;
  const files = Array.from(fileList || []).filter((file) =>
    /^image\/(jpeg|png|webp|avif)$/i.test(file.type)
  );
  if (files.length === 0) {
    setGalleryStatus('Pilih fail JPG, PNG, WebP atau AVIF.', 'warn');
    return;
  }

  setProcessing(true);
  let success = 0;
  const errors = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setGalleryStatus(`Memuat naik ${index + 1}/${files.length}: ${file.name}…`);
      const url = new URL(siteUrl('api/tetapan/upload'));
      url.searchParams.set('slug', state.slug);
      url.searchParams.set('nama', file.name);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          errors.push(
            `${file.name}: ${(data.ralat || []).join(' ') || `HTTP ${response.status}`}`
          );
        } else {
          success += 1;
        }
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }
  } finally {
    setProcessing(false);
  }

  if (success) {
    log(`${success} gambar dimuat naik ke program/${state.slug}.`);
    setGalleryStatus(`${success} gambar dimuat naik. Mengimbas semula…`, 'ok');
    await scanProgram(state.slug);
  }
  if (errors.length) {
    log(`Gagal memuat naik:\n${errors.join('\n')}`, 'error');
    setGalleryStatus(errors.join(' '), 'error');
  }
}

async function saveGallery() {
  if (!state.slug || state.processing) return;
  const entries = state.images
    .filter((image) => image.wujud)
    .map((image) => ({
      nama: image.nama,
      alt: image.alt.trim(),
      kapsyen: image.kapsyen.trim() || null,
    }));

  const emptyAlt = entries.findIndex((entry) => !entry.alt);
  if (emptyAlt >= 0) {
    setGalleryStatus('Alt text diperlukan untuk setiap gambar.', 'error');
    el.galleryList.querySelector(`[data-gambar-index="${emptyAlt}"] [data-gambar-alt]`)?.focus();
    return;
  }
  if (entries.length === 0) {
    setGalleryStatus('Tiada gambar untuk disimpan.', 'warn');
    return;
  }

  setProcessing(true);
  setStatus('Menyimpan senarai gambar…');
  let saved = false;
  try {
    const data = await apiFetch('simpan-gambar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: state.slug, gambar: entries }),
    });
    if (!data.ok) {
      const errors = Array.isArray(data.ralat) ? data.ralat : [];
      setStatus('Gagal menyimpan gambar.', 'error');
      setGalleryStatus(errors.join(' ') || 'Gagal menyimpan senarai gambar.', 'error');
      log(`Gagal menyimpan gambar:\n${errors.join('\n')}`, 'error');
      return;
    }
    state.images = (Array.isArray(data.gambar) ? data.gambar : []).map((image) => ({
      ...image,
      alt: image.alt || '',
      kapsyen: image.kapsyen || '',
    }));
    renderImages();
    saved = true;
    setStatus('Senarai gambar disimpan.', 'ok');
    setGalleryStatus(
      `${entries.length} gambar disimpan. Tekan Kemaskini Program untuk menjana data aktiviti.`,
      'ok'
    );
    log(`Senarai gambar disimpan: program/${state.slug}/caption.md (${entries.length} gambar).`);
    if (Array.isArray(data.amaran) && data.amaran.length) {
      log(`Amaran simpan gambar:\n${data.amaran.join('\n')}`, 'warn');
    }
  } catch (error) {
    setStatus('Gagal menyimpan gambar.', 'error');
    setGalleryStatus(error.message, 'error');
    log(`Gagal menyimpan gambar: ${error.message}`, 'error');
  } finally {
    setProcessing(false);
  }
  if (saved) await refreshStatus();
}

async function createProgram(event) {
  event.preventDefault();
  if (!state.ready || state.processing) return;
  if (!el.form.reportValidity()) return;

  const payload = {
    slug: el.inputSlug.value.trim(),
    tajuk: el.inputTajuk.value.trim(),
    tarikh: el.inputTarikh.value,
    kategori: el.inputKategori.value.trim(),
    ringkas: el.inputRingkas.value.trim(),
    facebook_url: el.inputFacebook.value.trim(),
    lokasi: el.inputLokasi.value.trim(),
    masa: el.inputMasa.value.trim(),
    kehadiran: el.inputKehadiran.value.trim(),
    sorotan: el.inputSorotan.value ? Number(el.inputSorotan.value) : null,
    caption: el.inputCaption.value.trim(),
  };

  setProcessing(true);
  setStatus('Mencipta program…');
  setFormStatus('Mencipta folder dan caption.md…');
  let created = null;
  try {
    const data = await apiFetch('cipta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!data.ok) {
      const errors = Array.isArray(data.ralat) ? data.ralat : [];
      setStatus('Cipta program gagal.', 'error');
      setFormStatus(errors.join(' ') || 'Cipta program gagal.', 'error');
      log(`Cipta program gagal:\n${errors.join('\n')}`, 'error');
      return;
    }
    created = data.slug;
    setStatus(`Program ${created} dicipta.`, 'ok');
    setFormStatus(`Program ${created} dicipta. Seterusnya import gambar.`, 'ok');
    log(`Program dicipta: program/${created}/caption.md`);
    if (Array.isArray(data.amaran) && data.amaran.length) {
      log(`Amaran cipta program:\n${data.amaran.join('\n')}`, 'warn');
    }
  } catch (error) {
    setStatus('Cipta program gagal.', 'error');
    setFormStatus(error.message, 'error');
    log(`Cipta program gagal: ${error.message}`, 'error');
  } finally {
    setProcessing(false);
  }

  if (created) {
    el.form.reset();
    state.slugTouched = false;
    setDefaults();
    await refreshStatus();
    openGallery(created);
  }
}

async function updatePrograms() {
  if (!state.ready || state.processing) return;
  setProcessing(true);
  setStatus('Menjana semula data aktiviti…');
  let ok = false;
  let rekod = 0;
  try {
    const data = await apiFetch('kemaskini', { method: 'POST' });
    if (data.ok) {
      ok = true;
      rekod = Number(data.rekod) || 0;
      setStatus(`Data aktiviti dijana: ${rekod} rekod.`, 'ok');
      log(`data/aktiviti.json dijana semula: ${rekod} rekod, ${data.ditarik ?? 0} ditarik.`);
      if (Array.isArray(data.amaran) && data.amaran.length) {
        log(`Amaran penjanaan:\n${data.amaran.join('\n')}`, 'warn');
      }
    } else {
      const errors = Array.isArray(data.ralat) ? data.ralat : [];
      setStatus('Penjanaan data gagal.', 'error');
      log(`Penjanaan data gagal:\n${errors.join('\n')}`, 'error');
    }
  } catch (error) {
    setStatus('Penjanaan data gagal.', 'error');
    log(`Penjanaan data gagal: ${error.message}`, 'error');
  } finally {
    setProcessing(false);
  }
  if (ok) {
    await refreshStatus();
    setStatus(`Data aktiviti dijana: ${rekod} rekod.`, 'ok');
  }
}

async function checkSite() {
  if (!state.ready || state.processing) return;
  setProcessing(true);
  setStatus('Menyemak pautan dan aset…');
  try {
    const data = await apiFetch('semak-tapak', { method: 'POST' });
    const output = data.output || 'Tiada output.';
    log(`Semak tapak (${data.ok ? 'lulus' : 'gagal'}):\n${output}`, data.ok ? 'info' : 'error');
    setStatus(data.ok ? 'Semakan tapak lulus.' : 'Semakan tapak menemui masalah.', data.ok ? 'ok' : 'error');
  } catch (error) {
    setStatus('Semakan tapak gagal.', 'error');
    log(`Semakan tapak gagal: ${error.message}`, 'error');
  } finally {
    setProcessing(false);
  }
}

function bindEvents() {
  bindTabs();

  el.kemaskini.addEventListener('click', updatePrograms);
  el.semakTapak.addEventListener('click', checkSite);
  el.muat.addEventListener('click', () => refreshStatus({ logSuccess: true }));

  el.programList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-program-gambar]');
    if (button) openGallery(button.dataset.programGambar);
  });

  el.inputTajuk.addEventListener('input', () => {
    if (!state.slugTouched) el.inputSlug.value = slugify(el.inputTajuk.value);
  });
  el.inputSlug.addEventListener('input', () => {
    state.slugTouched = el.inputSlug.value.trim() !== '';
  });
  el.form.addEventListener('submit', createProgram);
  el.form.addEventListener('reset', () => {
    window.setTimeout(() => {
      state.slugTouched = false;
      setDefaults();
      setFormStatus('');
    }, 0);
  });

  el.programSelect.addEventListener('change', () => {
    state.slug = el.programSelect.value;
    if (state.slug) scanProgram(state.slug);
    else {
      state.images = [];
      renderImages();
      setGalleryStatus('');
    }
  });

  el.fileInput.addEventListener('change', () => {
    uploadFiles(el.fileInput.files);
    el.fileInput.value = '';
  });

  el.scanButton.addEventListener('click', () => scanProgram(state.slug));
  el.saveButton.addEventListener('click', saveGallery);

  el.dropzone.addEventListener('click', () => {
    if (!state.processing && state.ready && state.slug) el.fileInput.click();
  });
  el.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!state.processing && state.ready && state.slug) el.fileInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach((type) => {
    el.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      if (state.slug && !state.processing) el.dropzone.classList.add('is-over');
    });
  });
  ['dragleave', 'drop'].forEach((type) => {
    el.dropzone.addEventListener(type, () => el.dropzone.classList.remove('is-over'));
  });
  el.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    if (state.slug && !state.processing) uploadFiles(event.dataTransfer?.files);
  });

  el.galleryList.addEventListener('input', (event) => {
    const row = event.target.closest('[data-gambar-index]');
    if (!row) return;
    const index = Number(row.dataset.gambarIndex);
    const image = state.images[index];
    if (!image) return;
    if (event.target.matches('[data-gambar-alt]')) image.alt = event.target.value;
    if (event.target.matches('[data-gambar-kapsyen]')) image.kapsyen = event.target.value;
    updateControls();
  });

  el.galleryList.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('[data-gambar-index]');
    if (!row) return;
    const index = Number(row.dataset.gambarIndex);
    if (button.matches('[data-gambar-naik]')) moveImage(index, -1);
    if (button.matches('[data-gambar-turun]')) moveImage(index, 1);
    if (button.matches('[data-gambar-buang]')) {
      const [removed] = state.images.splice(index, 1);
      renderImages();
      if (removed) setGalleryStatus(`${removed.nama} dibuang daripada senarai. Simpan untuk kekalkan perubahan.`);
    }
  });

  el.clearLog.addEventListener('click', () => {
    state.log = [];
    el.log.textContent = 'Belum ada tindakan.';
    updateControls();
  });
}

function showReadOnly() {
  el.asing.hidden = false;
  el.mod.hidden = true;
  setStatus('Mod baca sahaja di hos awam.');
  el.app
    .querySelectorAll('button:not(.tetapan-tab), input, select, textarea')
    .forEach((control) => {
      control.disabled = true;
    });
  el.dropzone.classList.add('is-disabled');
  el.dropzone.setAttribute('aria-disabled', 'true');
}

export function initTetapan() {
  const app = document.querySelector('[data-tetapan]');
  if (!app) return;

  el = {
    app,
    asing: document.getElementById('tetapan-asing'),
    mod: document.getElementById('tetapan-mod'),
    modText: document.getElementById('tetapan-mod-teks'),
    kemaskini: document.getElementById('tetapan-kemaskini'),
    semakTapak: document.getElementById('tetapan-semak-tapak'),
    muat: document.getElementById('tetapan-muat'),
    status: document.getElementById('tetapan-status'),
    statProgram: document.getElementById('stat-program'),
    statDraf: document.getElementById('stat-draf'),
    statDisahkan: document.getElementById('stat-disahkan'),
    statSorotan: document.getElementById('stat-sorotan'),
    statGambar: document.getElementById('stat-gambar'),
    tabs: Array.from(document.querySelectorAll('.tetapan-tab')),
    programList: document.getElementById('tetapan-program-list'),
    form: document.getElementById('form-cipta'),
    formStatus: document.getElementById('cipta-status'),
    inputSlug: document.getElementById('cipta-slug'),
    inputTajuk: document.getElementById('cipta-tajuk'),
    inputTarikh: document.getElementById('cipta-tarikh'),
    inputKategori: document.getElementById('cipta-kategori'),
    inputRingkas: document.getElementById('cipta-ringkas'),
    inputFacebook: document.getElementById('cipta-facebook'),
    inputLokasi: document.getElementById('cipta-lokasi'),
    inputMasa: document.getElementById('cipta-masa'),
    inputKehadiran: document.getElementById('cipta-kehadiran'),
    inputSorotan: document.getElementById('cipta-sorotan'),
    inputCaption: document.getElementById('cipta-caption'),
    submitCipta: document.getElementById('cipta-hantar'),
    programSelect: document.getElementById('gambar-program'),
    fileInput: document.getElementById('gambar-fail'),
    dropzone: document.getElementById('gambar-dropzone'),
    scanButton: document.getElementById('gambar-imbas'),
    saveButton: document.getElementById('gambar-simpan'),
    galleryStatus: document.getElementById('gambar-status'),
    galleryList: document.getElementById('gambar-senarai'),
    log: document.getElementById('tetapan-log'),
    clearLog: document.getElementById('tetapan-kosong-log'),
  };

  state.local = LOCAL_HOSTS.has(location.hostname);
  bindEvents();

  if (!state.local) {
    showReadOnly();
    return;
  }

  setDefaults();
  updateControls();
  refreshStatus();
}
