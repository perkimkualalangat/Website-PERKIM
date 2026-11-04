import {
  dapatkanRingkasanHariIni,
  formatMasa12Jam,
  mulakanJamMalaysia,
} from '../web-api-module/index.js';

const elem = (id) => document.getElementById(id);
const setText = (target, value) => {
  if (target) target.textContent = value ?? '—';
};

const berhentiJam = mulakanJamMalaysia((masa) => {
  setText(elem('api-clock'), masa.labelMasa);
  setText(elem('api-gregorian'), masa.labelTarikh);
});

async function muat(paksaSegar = false) {
  const status = elem('api-status');
  status.dataset.state = '';
  setText(status, 'Memuatkan data…');
  elem('api-refresh').disabled = true;

  try {
    const data = await dapatkanRingkasanHariIni({ paksaSegar });
    setText(elem('api-gregorian'), data.kalendar.gregorian.label);
    setText(elem('api-hijrah'), data.kalendar.hijrah?.label);
    setText(
      elem('api-hijrah-source'),
      data.kalendar.hijrah
        ? `Sumber: ${data.kalendar.hijrah.sumber}${data.kalendar.hijrah.anggaran ? ' (anggaran)' : ''}`
        : 'Tarikh Hijrah tidak tersedia'
    );

    const solat = data.waktuSolat;
    setText(elem('api-source'), solat.sumber ? `${solat.sumber.nama} · ${solat.sumber.mod}` : 'Tidak tersedia');
    setText(elem('api-zone'), `${solat.zon}${solat.kiblat ? ` · Kiblat ${solat.kiblat}` : ''}`);
    for (const cell of document.querySelectorAll('[data-prayer]')) {
      const waktu = solat.waktu?.[cell.dataset.prayer];
      setText(cell, waktu ? formatMasa12Jam(waktu) : null);
    }

    const mesej = [...(solat.amaran || []), ...(data.kalendar.amaran || [])];
    status.dataset.state = solat.tersedia ? 'ok' : 'error';
    setText(
      status,
      solat.tersedia
        ? `Data tersedia melalui ${solat.sumber.mod}.${mesej.length ? ` ${mesej.join(' ')}` : ''}`
        : `Data gagal dimuatkan. ${solat.ralat.join(' ')}`
    );
    setText(elem('api-debug'), JSON.stringify(data, null, 2));
  } catch (error) {
    status.dataset.state = 'error';
    setText(status, `Ralat modul: ${error.message}`);
  } finally {
    elem('api-refresh').disabled = false;
  }
}

elem('api-refresh').addEventListener('click', () => muat(true));
window.addEventListener('pagehide', berhentiJam, { once: true });
muat();
