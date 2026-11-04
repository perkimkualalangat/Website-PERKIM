/** Klien JSON kecil dengan timeout, pembatalan dan percubaan semula terkawal. */

export class RalatApi extends Error {
  constructor(message, { kod = 'API_ERROR', status = null, url = null, sebab = null } = {}) {
    super(message);
    this.name = 'RalatApi';
    this.kod = kod;
    this.status = status;
    this.url = url;
    if (sebab) this.cause = sebab;
  }
}

const tunggu = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function bolehCubaSemula(error) {
  return (
    error instanceof RalatApi &&
    (error.kod === 'RANGKAIAN' || error.kod === 'TIMEOUT' || (error.status || 0) >= 500)
  );
}

async function satuPermintaan(url, { timeoutMs, fetchImpl, headers, signal }) {
  const controller = new AbortController();
  let tamatMasa = false;
  let batalDariLuar = false;

  const batalkan = () => {
    batalDariLuar = true;
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) batalkan();
  else signal?.addEventListener('abort', batalkan, { once: true });

  const timer = setTimeout(() => {
    tamatMasa = true;
    controller.abort();
  }, timeoutMs);

  try {
    const respons = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });

    const teks = await respons.text();
    if (!respons.ok) {
      throw new RalatApi(`Permintaan API gagal (${respons.status}).`, {
        kod: 'HTTP',
        status: respons.status,
        url: String(url),
      });
    }

    try {
      return JSON.parse(teks);
    } catch (error) {
      throw new RalatApi('Respons API bukan JSON yang sah.', {
        kod: 'JSON_TIDAK_SAH',
        status: respons.status,
        url: String(url),
        sebab: error,
      });
    }
  } catch (error) {
    if (error instanceof RalatApi) throw error;
    if (tamatMasa) {
      throw new RalatApi(`API tidak menjawab dalam ${timeoutMs} ms.`, {
        kod: 'TIMEOUT',
        url: String(url),
        sebab: error,
      });
    }
    if (batalDariLuar) {
      throw new RalatApi('Permintaan API dibatalkan.', {
        kod: 'DIBATALKAN',
        url: String(url),
        sebab: error,
      });
    }
    throw new RalatApi('API tidak dapat dihubungi.', {
      kod: 'RANGKAIAN',
      url: String(url),
      sebab: error,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', batalkan);
  }
}

/**
 * Ambil dan parse JSON. Fungsi fetch boleh disuntik untuk ujian.
 */
export async function dapatkanJSON(
  url,
  {
    timeoutMs = 5000,
    percubaanSemula = 0,
    fetchImpl = globalThis.fetch,
    headers = {},
    signal,
  } = {}
) {
  if (typeof fetchImpl !== 'function') {
    throw new RalatApi('Fungsi fetch tidak tersedia.', { kod: 'FETCH_TIADA', url: String(url) });
  }

  let cubaan = 0;
  while (true) {
    try {
      return await satuPermintaan(url, { timeoutMs, fetchImpl, headers, signal });
    } catch (error) {
      if (cubaan >= percubaanSemula || !bolehCubaSemula(error) || signal?.aborted) throw error;
      await tunggu(Math.min(250 * 2 ** cubaan, 1000));
      cubaan += 1;
    }
  }
}
