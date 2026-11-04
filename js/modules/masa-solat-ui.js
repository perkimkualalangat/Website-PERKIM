/**
 * Penyesuai paparan bagi web-api-module.
 *
 * Masa tempatan dirender serta-merta. Permintaan e-Solat berjalan selepas
 * header siap supaya navigasi dan kandungan tidak disekat oleh rangkaian.
 */

import {
  dapatkanMasaMalaysia,
  dapatkanRingkasanHariIni,
  dapatkanWaktuSolat,
  formatMasa12Jam,
  mulakanJamMalaysia,
  tentukanSolatSeterusnya,
} from '../../web-api-module/index.js';

const MODE_SUMBER = {
  api: 'Data langsung',
  cache: 'Cache pelayar',
  'cache-luput': 'Rekod terdahulu',
  'fallback-json': 'Jadual setempat',
};

const all = (selector) => [...document.querySelectorAll(selector)];

function tambahSatuHari(iso) {
  const tarikh = new Date(`${iso}T00:00:00Z`);
  tarikh.setUTCDate(tarikh.getUTCDate() + 1);
  return tarikh.toISOString().slice(0, 10);
}

function tarikhRingkas(iso) {
  const tarikh = new Date(`${iso}T00:00:00+08:00`);
  return new Intl.DateTimeFormat('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(tarikh);
}

function renderMasa(masa) {
  for (const elem of all('[data-gregorian-date]')) {
    elem.dateTime = masa.tarikh;
    elem.textContent = elem.closest('.prayerbar__mobile-date')
      ? tarikhRingkas(masa.tarikh)
      : masa.labelTarikh;
  }

  const ringkas = masa.masa.slice(0, 5);
  for (const elem of all('[data-malaysia-time]')) {
    elem.dateTime = ringkas;
    elem.textContent = `${formatMasa12Jam(ringkas)} MYT`;
  }
  for (const elem of all('[data-system-time]')) {
    elem.dateTime = ringkas;
    elem.textContent = formatMasa12Jam(ringkas);
  }
}

function renderHijrah(hijrah) {
  const label = hijrah
    ? `${hijrah.label}${hijrah.anggaran ? ' (anggaran)' : ''}`
    : 'Hijrah tidak tersedia';

  for (const elem of all('[data-hijrah-date]')) {
    elem.textContent = label;
    if (hijrah?.iso) elem.dataset.hijri = hijrah.iso;
    else delete elem.dataset.hijri;
    if (hijrah?.anggaran) {
      elem.title = 'Anggaran pelayar; mungkin berbeza daripada takwim rasmi Malaysia.';
    } else {
      elem.removeAttribute('title');
    }
  }
}

function setButiranTerbuka(host, terbuka) {
  const button = host.querySelector('[data-prayer-toggle]');
  const details = host.querySelector('[data-prayer-details]');
  const label = host.querySelector('[data-prayer-toggle-label]');
  if (!button || !details) return;
  button.setAttribute('aria-expanded', String(terbuka));
  details.hidden = !terbuka;
  host.classList.toggle('is-open', terbuka);
  if (label) label.textContent = terbuka ? 'Tutup' : 'Lihat semua';
  const tindakan = terbuka ? 'Tutup senarai waktu solat.' : 'Buka senarai waktu solat.';
  button.setAttribute('aria-label', `${tindakan} ${host.dataset.nextAria || ''}`.trim());
}

function kosongkanWaktu(host) {
  for (const elem of host.querySelectorAll('[data-prayer-time]')) {
    elem.textContent = '—';
    elem.removeAttribute('datetime');
    elem.removeAttribute('aria-label');
  }
  for (const item of host.querySelectorAll('[data-prayer-item]')) {
    item.classList.remove('is-next');
    item.removeAttribute('aria-current');
  }
}

function renderWaktu12Jam(elem, nilai) {
  const label = formatMasa12Jam(nilai);
  const [jam, tempoh] = label.split(' ');
  const clock = document.createElement('span');
  const period = document.createElement('span');
  clock.className = 'prayerbar__time-clock';
  period.className = 'prayerbar__time-period';
  clock.textContent = jam;
  period.textContent = tempoh;
  elem.replaceChildren(clock, document.createTextNode(' '), period);
  elem.setAttribute('datetime', nilai);
  elem.setAttribute('aria-label', label);
}

function renderRingkasanSolat(host, nama, waktu = '') {
  const name = host.querySelector('[data-prayer-next-name]');
  const azan = host.querySelector('[data-prayer-next-azan]');
  if (name) name.textContent = nama;
  if (azan) {
    azan.hidden = !waktu;
    azan.textContent = waktu ? `(${waktu})` : '';
  }
}

function renderCountdown(host, sekarang = new Date()) {
  const countdown = host.querySelector('[data-prayer-countdown]');
  const label = countdown?.querySelector('span');
  const value = countdown?.querySelector('strong');
  const sasaran = host.dataset.prayerTarget;
  if (!countdown || !label || !value || !sasaran) {
    if (countdown) countdown.hidden = true;
    return;
  }

  const bakiMs = new Date(sasaran).getTime() - sekarang.getTime();
  countdown.hidden = false;
  if (!Number.isFinite(bakiMs) || bakiMs <= 0) {
    label.textContent = '';
    value.textContent = 'sekarang';
    return;
  }

  const jumlahSaat = Math.floor(bakiMs / 1000);
  const jam = Math.floor(jumlahSaat / 3600);
  const minit = Math.floor((jumlahSaat % 3600) / 60);
  const saat = jumlahSaat % 60;
  const bahagian = [];
  if (jam > 0) bahagian.push(`${jam} jam`);
  if (jam > 0 || minit > 0) bahagian.push(`${minit} minit`);
  bahagian.push(`${saat} saat`);
  label.textContent = 'lagi';
  value.textContent = bahagian.join(' ');
}

function renderSolatSeterusnya(host, waktu, masa, solatEsok = null) {
  const output = host.querySelector('[data-prayer-next]');
  const button = host.querySelector('[data-prayer-toggle]');
  for (const item of host.querySelectorAll('[data-prayer-item]')) {
    item.classList.remove('is-next');
    item.removeAttribute('aria-current');
  }
  if (!output || !waktu) return;

  let seterusnya = tentukanSolatSeterusnya(waktu, masa.masa);
  let tarikhSasaran = masa.tarikh;
  let esok = false;
  if (seterusnya?.selesai && solatEsok?.tersedia && solatEsok.waktu?.subuh) {
    seterusnya = {
      id: 'subuh',
      nama: 'Subuh',
      waktu: solatEsok.waktu.subuh,
      selesai: false,
    };
    tarikhSasaran = solatEsok.tarikh;
    esok = true;
  }

  if (!seterusnya || seterusnya.selesai) {
    renderRingkasanSolat(host, 'Semua waktu solat hari ini telah selesai');
    delete host.dataset.prayerTarget;
    host.dataset.nextAria = 'Semua waktu solat hari ini telah selesai.';
    renderCountdown(host);
    if (button) {
      const terbuka = button.getAttribute('aria-expanded') === 'true';
      setButiranTerbuka(host, terbuka);
    }
    return;
  }

  const nama = `${seterusnya.nama}${esok ? ' esok' : ''}`;
  const waktuLabel = formatMasa12Jam(seterusnya.waktu);
  renderRingkasanSolat(host, nama, waktuLabel);
  host.dataset.prayerTarget = `${tarikhSasaran}T${seterusnya.waktu}:00+08:00`;
  host.dataset.nextAria = `Solat ${nama} pada ${waktuLabel}.`;
  renderCountdown(host);

  if (!esok) {
    const item = host.querySelector(`[data-prayer-item="${seterusnya.id}"]`);
    item?.classList.add('is-next');
    item?.setAttribute('aria-current', 'time');
  }
  if (button) {
    const terbuka = button.getAttribute('aria-expanded') === 'true';
    setButiranTerbuka(host, terbuka);
  }
}

function labelSumber(solat) {
  if (!solat.sumber) return 'Tidak tersedia';
  const mode = MODE_SUMBER[solat.sumber.mod] || solat.sumber.mod;
  const tahun = solat.sumber.mod === 'fallback-json' ? ` ${solat.tarikh.slice(0, 4)}` : '';
  return `${mode}${tahun}`;
}

function mesejAmaran(data) {
  const senarai = [
    ...(data.waktuSolat.amaran || []),
    ...(data.kalendar.amaran || []),
  ];
  if (data.semakanMasa?.berbeza) {
    const minit = Math.max(1, Math.round(Math.abs(data.semakanMasa.sisihanSaat) / 60));
    senarai.push(`Jam peranti mungkin tersasar kira-kira ${minit} minit.`);
  }
  return [...new Set(senarai)];
}

function renderData(host, data, masaSemasa, solatEsok = null) {
  renderMasa(masaSemasa);
  renderHijrah(data.kalendar.hijrah);

  const solat = data.waktuSolat;
  const source = host.querySelector('[data-prayer-source]');
  const status = host.querySelector('[data-prayer-status]');

  if (!solat.tersedia || !solat.waktu) {
    host.dataset.state = 'error';
    kosongkanWaktu(host);
    renderRingkasanSolat(host, 'Waktu solat tidak tersedia');
    delete host.dataset.prayerTarget;
    host.dataset.nextAria = 'Waktu solat tidak tersedia.';
    renderCountdown(host);
    if (source) source.textContent = 'Tidak tersedia';
    if (status) {
      status.hidden = false;
      status.textContent = 'Data tidak dapat dimuatkan. Semak sambungan dan cuba semula.';
    }
    setButiranTerbuka(host, true);
    if (solat.ralat?.length) console.error('Waktu solat:', solat.ralat.join(' | '));
    return;
  }

  for (const [nama, nilai] of Object.entries(solat.waktu)) {
    const elem = host.querySelector(`[data-prayer-time="${nama}"]`);
    if (!elem) continue;
    renderWaktu12Jam(elem, nilai);
  }
  renderSolatSeterusnya(host, solat.waktu, masaSemasa, solatEsok);
  if (source) source.textContent = labelSumber(solat);

  const amaran = mesejAmaran(data);
  host.dataset.state = amaran.length ? 'warning' : 'ok';
  if (status) {
    status.hidden = amaran.length === 0;
    status.textContent = amaran.join(' ');
  }
}

export function initMasaSolatUI() {
  const host = document.querySelector('[data-prayerbar]');
  if (!host) return () => {};

  const toggle = host.querySelector('[data-prayer-toggle]');
  const refresh = host.querySelector('[data-prayer-refresh]');
  let dataSemasa = null;
  let solatEsok = null;
  let tarikhData = null;
  let tarikhEsokDicuba = null;
  let dimuatPada = 0;
  let permintaan = null;
  let permintaanEsok = null;
  let minitTerakhir = null;

  async function muatSolatEsok(masa) {
    if (permintaanEsok || tarikhEsokDicuba === masa.tarikh) return permintaanEsok;
    tarikhEsokDicuba = masa.tarikh;
    const tarikhEsok = tambahSatuHari(masa.tarikh);
    permintaanEsok = (async () => {
      try {
        const hasil = await dapatkanWaktuSolat({
          tarikh: tarikhEsok,
          gunakanApi: false,
        });
        if (tarikhData !== masa.tarikh || !hasil.tersedia) return;
        solatEsok = hasil;
        renderSolatSeterusnya(host, dataSemasa.waktuSolat.waktu, dapatkanMasaMalaysia(), solatEsok);
      } catch (error) {
        console.warn('Waktu solat esok tidak tersedia:', error.message);
      } finally {
        permintaanEsok = null;
      }
    })();
    return permintaanEsok;
  }

  const kemasKiniMasa = (masa) => {
    const minitSemasa = masa.masa.slice(0, 5);
    if (minitTerakhir !== minitSemasa) {
      minitTerakhir = minitSemasa;
      renderMasa(masa);
      if (dataSemasa?.waktuSolat?.tersedia && tarikhData === masa.tarikh) {
        const seterusnya = tentukanSolatSeterusnya(dataSemasa.waktuSolat.waktu, masa.masa);
        renderSolatSeterusnya(host, dataSemasa.waktuSolat.waktu, masa, solatEsok);
        if (seterusnya?.selesai && !solatEsok) void muatSolatEsok(masa);
      }
    }
    renderCountdown(host, new Date(masa.tepatPada));
    if (tarikhData && tarikhData !== masa.tarikh && !permintaan) void muatData(false);
  };

  const hentikanJam = mulakanJamMalaysia(kemasKiniMasa, { selangMs: 1000 });

  async function muatData(paksaSegar) {
    if (permintaan) return permintaan;
    host.dataset.state = 'loading';
    host.setAttribute('aria-busy', 'true');
    if (!dataSemasa) {
      renderRingkasanSolat(host, 'Memuatkan waktu solat…');
    }
    if (refresh) refresh.disabled = true;

    permintaan = (async () => {
      try {
        solatEsok = null;
        tarikhEsokDicuba = null;
        const data = await dapatkanRingkasanHariIni({ paksaSegar });
        const masa = dapatkanMasaMalaysia();
        dataSemasa = data;
        tarikhData = data.masa.tarikh;
        dimuatPada = Date.now();
        renderData(host, data, masa, solatEsok);
        const seterusnya = data.waktuSolat.tersedia
          ? tentukanSolatSeterusnya(data.waktuSolat.waktu, masa.masa)
          : null;
        if (seterusnya?.selesai) await muatSolatEsok(masa);
      } catch (error) {
        host.dataset.state = 'error';
        const status = host.querySelector('[data-prayer-status]');
        renderRingkasanSolat(host, 'Waktu solat tidak tersedia');
        delete host.dataset.prayerTarget;
        host.dataset.nextAria = 'Waktu solat tidak tersedia.';
        renderCountdown(host);
        if (status) {
          status.hidden = false;
          status.textContent = 'Modul masa dan waktu solat gagal dimulakan.';
        }
        setButiranTerbuka(host, true);
        console.error('Modul masa/solat:', error);
      } finally {
        if (refresh) refresh.disabled = false;
        host.setAttribute('aria-busy', 'false');
        permintaan = null;
      }
    })();

    return permintaan;
  }

  toggle?.addEventListener('click', () => {
    setButiranTerbuka(host, toggle.getAttribute('aria-expanded') !== 'true');
  });
  refresh?.addEventListener('click', () => void muatData(true));

  const semakApabilaAktif = () => {
    if (
      document.visibilityState === 'visible' &&
      dimuatPada &&
      Date.now() - dimuatPada >= 6 * 60 * 60 * 1000
    ) {
      void muatData(false);
    }
  };
  document.addEventListener('visibilitychange', semakApabilaAktif);

  void muatData(false);

  const bersihkan = () => {
    hentikanJam();
    document.removeEventListener('visibilitychange', semakApabilaAktif);
  };
  window.addEventListener('pagehide', bersihkan, { once: true });
  return bersihkan;
}
