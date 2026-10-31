/**
 * main.js — titik masuk halaman draf PERKIM Kuala Langat.
 */

import { mountHeaderFooter } from './modules/components.js';
import { initNav } from './modules/nav.js';
import { initKepimpinan } from './modules/kepimpinan.js';
import { initPerkim } from './modules/perkim.js';
import { initBerita } from './modules/berita.js';
import { initLibrary } from './modules/library/library.js';
import { initSearch } from './modules/search.js';
import { initForms } from './modules/forms.js';
import { initMapButtons } from './modules/mapbtn.js';
import { initTicker } from './modules/ticker.js';

document.addEventListener('DOMContentLoaded', async () => {
  await mountHeaderFooter();
  initNav();
  initSearch();
  initForms();
  initMapButtons();
  initTicker();

  if (document.querySelector('#kepimpinan-grid')) await initKepimpinan();
  if (document.querySelector('#perkim-data')) await initPerkim();
  if (document.querySelector('#berita-list')) await initBerita();
  if (document.querySelector('#bookshelf')) await initLibrary();

  document.documentElement.classList.add('js-ready');
});
