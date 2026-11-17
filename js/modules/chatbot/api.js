/**
 * api.js — lapisan komunikasi chatbot.
 *
 * Tanggungjawab:
 *   - memuatkan konfigurasi UI (data/chatbot.json)
 *   - menentukan endpoint proksi yang betul
 *   - menghantar mesej dan membaca respons SSE
 *
 * Kunci API NVIDIA TIDAK pernah melalui modul ini. Kunci hanya ada di
 * tools/chat-proxy.mjs (tempatan) atau Worker secret (produksi).
 */
import { siteUrl } from '../../paths.js';

let janjiKonfigurasi;

export class ChatError extends Error {
  constructor(message, { status = 0, kod = 'RALAT' } = {}) {
    super(message);
    this.name = 'ChatError';
    this.status = status;
    this.kod = kod;
  }
}

/** Muatkan data/chatbot.json sekali sahaja. */
export function muatKonfigurasi() {
  if (!janjiKonfigurasi) {
    janjiKonfigurasi = fetch(siteUrl('data/chatbot.json'), { cache: 'no-store' })
      .then((respons) => {
        if (!respons.ok) throw new Error(`data/chatbot.json ${respons.status}`);
        return respons.json();
      })
      .catch((error) => {
        console.error('Chatbot: gagal memuatkan konfigurasi.', error);
        return null;
      });
  }
  return janjiKonfigurasi;
}

/**
 * Pilih endpoint mengikut hos semasa.
 * Boleh ditindih dengan window.PERKIM_CHAT_ENDPOINT untuk ujian.
 */
export function tentukanEndpoint(konfigurasi) {
  if (typeof window !== 'undefined' && typeof window.PERKIM_CHAT_ENDPOINT === 'string') {
    return window.PERKIM_CHAT_ENDPOINT.trim();
  }

  const hos = location.hostname;
  const tempatan =
    hos === 'localhost' ||
    hos === '127.0.0.1' ||
    hos === '[::1]' ||
    hos === '::1' ||
    hos.endsWith('.localhost');

  const endpoint = tempatan
    ? konfigurasi?.endpoint?.localhost
    : konfigurasi?.endpoint?.produksi;

  return typeof endpoint === 'string' ? endpoint.trim() : '';
}

/**
 * Hantar mesej dan alirkan jawapan.
 * @param {{
 *   endpoint: string,
 *   messages: Array<{role: 'user'|'assistant', content: string}>,
 *   onDelta?: (teks: string) => void,
 *   signal?: AbortSignal
 * }} pilihan
 * @returns {Promise<string>} Jawapan penuh.
 */
export async function hantarMesej({ endpoint, messages, onDelta, signal }) {
  let respons;
  try {
    respons = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ChatError(
      'Tidak dapat menghubungi perkhidmatan AI. Pastikan proksi chatbot berjalan.',
      { kod: 'RANGKAIAN' }
    );
  }

  if (!respons.ok) {
    let butiran = '';
    try {
      const data = await respons.json();
      butiran = data?.error || '';
    } catch {
      // Abaikan respons bukan JSON.
    }

    if (respons.status === 429) {
      throw new ChatError('Terlalu banyak permintaan. Sila cuba sebentar lagi.', {
        status: 429,
        kod: 'HAD',
      });
    }
    if (respons.status === 401 || respons.status === 403) {
      throw new ChatError('Perkhidmatan AI tidak sah. Sila hubungi pentadbir laman.', {
        status: respons.status,
        kod: 'KUNCI',
      });
    }
    throw new ChatError(butiran || 'Perkhidmatan AI tidak dapat dihubungi. Cuba lagi.', {
      status: respons.status,
      kod: 'PELAYAN',
    });
  }

  const jenis = respons.headers.get('content-type') || '';

  if (!jenis.includes('text/event-stream') || !respons.body) {
    const data = await respons.json().catch(() => null);
    const teks = data?.reply || data?.text || '';
    if (!teks) throw new ChatError('Jawapan AI kosong. Cuba lagi.', { kod: 'KOSONG' });
    onDelta?.(teks);
    return teks;
  }

  const pembaca = respons.body.getReader();
  const dekoder = new TextDecoder();
  let penimbal = '';
  let penuh = '';

  while (true) {
    const { done, value } = await pembaca.read();
    if (done) break;

    penimbal += dekoder.decode(value, { stream: true });
    const baris = penimbal.split('\n');
    penimbal = baris.pop() || '';

    for (const mentah of baris) {
      const barisBersih = mentah.trim();
      if (!barisBersih.startsWith('data:')) continue;
      const data = barisBersih.slice(5).trim();
      if (!data || data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          penuh += delta;
          onDelta?.(delta);
        }
      } catch {
        // Abaikan baris SSE yang tidak lengkap.
      }
    }
  }

  if (!penuh.trim()) throw new ChatError('Jawapan AI kosong. Cuba lagi.', { kod: 'KOSONG' });
  return penuh;
}
