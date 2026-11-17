/**
 * chat-core.mjs — logik teras chatbot yang dikongsi oleh proksi tempatan,
 * Cloudflare Worker dan sambungan Telegram.
 *
 * Tiada kunci API di sini. Pemanggil mesti menghantar apiKey daripada
 * pemboleh ubah persekitaran pelayan.
 */
import { API_URL, LIMITS, MODEL } from './prompt.mjs';

/**
 * Tukar data/chatbot-kontekst.json kepada teks ringkas untuk prompt.
 * @param {{fakta?: Array<{tajuk?: string, teks?: string, sumber?: string}>, halaman?: Array<{tajuk?: string, url?: string, keterangan?: string}>, nota?: string}} data
 */
export function flattenKonteks(data = {}) {
  const baris = [];

  if (data.nota) baris.push(`NOTA: ${data.nota}`, '');

  for (const item of data.fakta || []) {
    if (!item?.teks) continue;
    const tajuk = item.tajuk ? `${item.tajuk}: ` : '';
    const sumber = item.sumber ? ` (sumber: ${item.sumber})` : '';
    baris.push(`- ${tajuk}${item.teks}${sumber}`);
  }

  if (Array.isArray(data.halaman) && data.halaman.length) {
    baris.push('', 'HALAMAN LAMAN:');
    for (const item of data.halaman) {
      baris.push(`- ${item.tajuk || ''} — ${item.keterangan || ''} [${item.url || ''}]`);
    }
  }

  return baris.join('\n').trim();
}

/**
 * Panggil NVIDIA NIM dalam mod streaming.
 * @param {{apiKey: string, model?: string, messages: Array<object>, signal?: AbortSignal}} pilihan
 * @returns {Promise<Response>} Respons SSE mentah daripada NVIDIA.
 */
export async function streamNvidia({ apiKey, model = MODEL, messages, signal }) {
  return fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: LIMITS.temperature,
      top_p: LIMITS.topP,
      max_tokens: LIMITS.maxTokens,
      stream: true,
    }),
    signal,
  });
}

/**
 * Panggil NVIDIA NIM tanpa streaming (untuk Telegram).
 * @param {{apiKey: string, model?: string, messages: Array<object>, signal?: AbortSignal}} pilihan
 * @returns {Promise<{text: string, usage?: object}>}
 */
export async function completeChat({ apiKey, model = MODEL, messages, signal }) {
  const respons = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: LIMITS.temperature,
      top_p: LIMITS.topP,
      max_tokens: LIMITS.maxTokens,
      stream: false,
    }),
    signal,
  });

  if (!respons.ok) {
    const butiran = await respons.text().catch(() => '');
    const ralat = new Error(`NVIDIA ${respons.status}`);
    ralat.status = respons.status;
    ralat.butiran = butiran.slice(0, 500);
    throw ralat;
  }

  const data = await respons.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Respons AI kosong.');
  }
  return { text: text.trim(), usage: data.usage };
}

/**
 * Baca respons SSE NVIDIA dan pulangkan teks penuh.
 * Digunakan oleh ujian dan sambungan Telegram jika perlu.
 * @param {Response} respons
 * @param {(delta: string) => void} [onDelta]
 */
export async function bacaStream(respons, onDelta) {
  if (!respons.body) throw new Error('Respons AI tiada badan.');
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
        // Abaikan baris SSE yang tidak lengkap atau bukan JSON.
      }
    }
  }

  return penuh;
}
