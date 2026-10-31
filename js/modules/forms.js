/**
 * forms.js — pengendalian borang demo.
 * Tiada pelayan: data tidak dihantar ke mana-mana. Ganti dengan
 * endpoint sebenar (fetch/POST) apabila backend tersedia.
 */

export function initForms() {
  const form = document.querySelector('[data-demo-form]');
  if (!form) return;

  const status = form.querySelector('.form__status');
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const name = form.querySelector('[name="nama"]')?.value.trim() || 'saudara';
    const ref = `DEMO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    if (status) {
      status.innerHTML = `<strong>Terima kasih, ${esc(name)}.</strong>
        Ini borang draf — tiada data dihantar atau disimpan. Sila hubungi Setiausaha
        melalui e-mel rasmi untuk urusan sebenar. Rujukan: <code>${ref}</code>.`;
      status.classList.add('is-visible', 'form__status--ok');
    }

    form.reset();
    status?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
