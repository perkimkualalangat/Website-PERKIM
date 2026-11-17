/**
 * nvidia-chat-worker.js — Cloudflare Worker untuk PERKIM BOT.
 *
 * Laluan:
 *   POST /api/chat             proksi streaming untuk widget laman
 *   POST /telegram/webhook     webhook Telegram Bot API
 *   GET  /health               semakan konfigurasi (tanpa rahsia)
 *
 * Rahsia (ditetapkan melalui `wrangler secret put`):
 *   NVIDIA_API_KEY
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET
 *
 * Pemboleh ubah biasa (wrangler.toml [vars]):
 *   SITE_ORIGIN        contoh: https://perkimkualalangat.github.io/Website-PERKIM
 *   ALLOWED_ORIGINS    origin pelayar yang dibenarkan, dipisah koma
 *   MODEL              lalai: nvidia/nemotron-3-ultra-550b-a55b
 *   TELEGRAM_ALLOWED_CHAT_IDS  pilihan; kosong bermaksud awam
 */
import { LIMITS, buildMessages } from './prompt.mjs';
import { completeChat, flattenKonteks, streamNvidia } from './chat-core.mjs';

const CACHE_LAMAN_MS = 5 * 60 * 1000;
const HAD_API_SEMINIT = 20;
const HAD_TELEGRAM_SEMINIT = 8;
const SEJARAH_TTL_MS = 60 * 60 * 1000;
const MODEL_LALAI = 'nvidia/nemotron-3-ultra-550b-a55b';

const cacheLaman = { masa: 0, konteks: '', menu: [], salam: '', nota: '' };
const hadApi = new Map();
const hadTelegram = new Map();
const memoriSejarah = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json(
        {
          ok: true,
          model: env.MODEL || MODEL_LALAI,
          nvidia: Boolean(env.NVIDIA_API_KEY),
          telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET),
          site_origin: Boolean(env.SITE_ORIGIN),
        },
        200
      );
    }

    if (url.pathname === '/api/chat') {
      return kendaliChat(request, env, ctx);
    }

    if (url.pathname === '/telegram/webhook') {
      return kendaliTelegram(request, env, ctx);
    }

    return json({ error: 'Laluan tidak dijumpai.' }, 404);
  },
};

/* ========================================================================== */
/*  CORS dan utiliti                                                          */
/* ========================================================================== */

function senaraiAsal(env) {
  const senarai = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (env.SITE_ORIGIN) {
    try {
      const asal = new URL(env.SITE_ORIGIN).origin;
      if (!senarai.includes(asal)) senarai.push(asal);
    } catch {
      // Abaikan SITE_ORIGIN yang tidak sah.
    }
  }
  return senarai;
}

function asalDibenarkan(origin, env) {
  if (!origin) return false;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;

  let hos;
  try {
    hos = new URL(origin).hostname;
  } catch {
    return false;
  }

  return senaraiAsal(env).some((peraturan) => {
    if (peraturan === origin) return true;
    if (peraturan.startsWith('*.')) return hos === peraturan.slice(2) || hos.endsWith(peraturan.slice(1));
    if (peraturan.startsWith('.')) return hos.endsWith(peraturan);
    return false;
  });
}

function headersCors(origin, env) {
  if (!origin || !asalDibenarkan(origin, env)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function dibenarkanHad(peta, kunci, had) {
  const sekarang = Date.now();
  const rekod = (peta.get(kunci) || []).filter((masa) => sekarang - masa < 60_000);
  if (rekod.length >= had) {
    peta.set(kunci, rekod);
    return false;
  }
  rekod.push(sekarang);
  peta.set(kunci, rekod);
  return true;
}

function bacaJson(request, maxBytes) {
  return request.text().then((teks) => {
    if (teks.length > maxBytes) {
      const ralat = new Error('Badan permintaan terlalu besar.');
      ralat.status = 413;
      throw ralat;
    }
    try {
      return JSON.parse(teks || '{}');
    } catch {
      const ralat = new Error('JSON tidak sah.');
      ralat.status = 400;
      throw ralat;
    }
  });
}

function ralatNvidia(status) {
  if (status === 401 || status === 403) {
    return { status: 502, mesej: 'Kunci API NVIDIA tidak sah atau tiada akses kepada model.' };
  }
  if (status === 429) {
    return { status: 429, mesej: 'Had permintaan AI dicapai. Cuba sebentar lagi.' };
  }
  return { status: 502, mesej: 'Perkhidmatan AI tidak dapat dihubungi. Cuba lagi.' };
}

/* ========================================================================== */
/*  Muatkan data laman (konteks + menu)                                       */
/* ========================================================================== */

async function muatDataLaman(env) {
  const baru = Date.now() - cacheLaman.masa < CACHE_LAMAN_MS;
  if (baru && cacheLaman.konteks) return cacheLaman;

  const asas = String(env.SITE_ORIGIN || '').replace(/\/+$/, '');
  if (!asas) throw new Error('SITE_ORIGIN belum ditetapkan pada Worker.');

  try {
    const [responsKonteks, responsConfig] = await Promise.all([
      fetch(`${asas}/data/chatbot-kontekst.json`, {
        cf: { cacheTtl: 300, cacheEverything: true },
      }),
      fetch(`${asas}/data/chatbot.json`, {
        cf: { cacheTtl: 300, cacheEverything: true },
      }),
    ]);

    if (!responsKonteks.ok) throw new Error(`konteks ${responsKonteks.status}`);

    const dataKonteks = await responsKonteks.json();
    const config = responsConfig.ok ? await responsConfig.json() : {};

    cacheLaman.masa = Date.now();
    cacheLaman.konteks = flattenKonteks(dataKonteks);
    cacheLaman.menu = Array.isArray(config.menu) ? config.menu.filter((i) => i?.id && i?.soalan) : [];
    cacheLaman.salam = String(config.salam || 'Assalamualaikum! Ada yang boleh saya bantu?');
    cacheLaman.nota = String(config.nota || '');
    return cacheLaman;
  } catch (error) {
    if (cacheLaman.konteks) {
      console.error('Guna cache konteks lama:', error.message);
      return cacheLaman;
    }
    throw error;
  }
}

/* ========================================================================== */
/*  /api/chat                                                                 */
/* ========================================================================== */

async function kendaliChat(request, env, ctx) {
  const origin = request.headers.get('Origin');
  const cors = headersCors(origin, env);

  if (request.method === 'OPTIONS') {
    if (origin && !asalDibenarkan(origin, env)) {
      return json({ error: 'Asal tidak dibenarkan.' }, 403);
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Guna POST.' }, 405, cors);
  }

  if (!env.NVIDIA_API_KEY) {
    return json({ error: 'Worker belum dikonfigurasikan.' }, 503, cors);
  }

  if (origin && !asalDibenarkan(origin, env)) {
    return json({ error: 'Asal tidak dibenarkan.' }, 403);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'tanpa-ip';
  if (!dibenarkanHad(hadApi, ip, HAD_API_SEMINIT)) {
    return json({ error: 'Terlalu banyak permintaan. Cuba sebentar lagi.' }, 429, cors);
  }

  let messages;
  try {
    const badan = await bacaJson(request, LIMITS.maxBodyBytes);
    const data = await muatDataLaman(env);
    messages = buildMessages({ messages: badan.messages, konteks: data.konteks });
  } catch (error) {
    return json({ error: error.message || 'Permintaan tidak sah.' }, error.status || 400, cors);
  }

  const pengawal = new AbortController();
  const pemasa = setTimeout(() => pengawal.abort(), LIMITS.timeoutMs);

  try {
    const upstream = await streamNvidia({
      apiKey: env.NVIDIA_API_KEY,
      model: env.MODEL || MODEL_LALAI,
      messages,
      signal: pengawal.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const butiran = await upstream.text().catch(() => '');
      console.error(`NVIDIA ${upstream.status}: ${butiran.slice(0, 300)}`);
      const { status, mesej } = ralatNvidia(upstream.status);
      return json({ error: mesej }, status, cors);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        ...cors,
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return json({ error: 'Permintaan AI tamat masa.' }, 504, cors);
    }
    console.error('Ralat /api/chat:', error.message);
    return json({ error: 'Ralat dalaman Worker.' }, 500, cors);
  } finally {
    clearTimeout(pemasa);
  }
}

/* ========================================================================== */
/*  Telegram                                                                  */
/* ========================================================================== */

function samaAman(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let hasil = 0;
  for (let i = 0; i < a.length; i += 1) hasil |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return hasil === 0;
}

async function kendaliTelegram(request, env, ctx) {
  if (request.method !== 'POST') return json({ error: 'Guna POST.' }, 405);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ error: 'Telegram belum dikonfigurasikan.' }, 503);
  }

  const rahsia = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
  if (!samaAman(rahsia, env.TELEGRAM_WEBHOOK_SECRET)) {
    return json({ error: 'Rahsia webhook tidak sah.' }, 401);
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return json({ error: 'JSON tidak sah.' }, 400);
  }

  ctx.waitUntil(prosesTelegram(update, env).catch((error) => console.error('Telegram:', error)));
  return json({ ok: true });
}

function chatDibenarkan(chatId, env) {
  const senarai = String(env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!senarai.length) return true;
  return senarai.includes(String(chatId));
}

function papanMenu(menu) {
  const rows = [];
  for (const item of menu) {
    if (rows.length >= 20) break;
    const data = `q:${item.id}`;
    if (data.length > 64) continue;
    rows.push([
      {
        text: String(item.label || item.soalan).slice(0, 60),
        callback_data: data,
      },
    ]);
  }
  rows.push([{ text: '↻ Menu soalan', callback_data: 'menu' }]);
  return { inline_keyboard: rows };
}

function teksTelegram(teks, env) {
  const asas = String(env.SITE_ORIGIN || '').replace(/\/+$/, '');

  return String(teks || '')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (padanan, label, url) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
        return `${label} (${url})`;
      }
      const bersih = url.replace(/^\/+/, '');
      return asas ? `${label} (${asas}/${bersih})` : `${label} (${bersih})`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pecahTeks(teks, had = 3900) {
  const bahagian = [];
  let baki = teks;
  while (baki.length > had) {
    let potong = baki.lastIndexOf('\n', had);
    if (potong < had * 0.5) potong = had;
    bahagian.push(baki.slice(0, potong));
    baki = baki.slice(potong).trimStart();
  }
  if (baki) bahagian.push(baki);
  return bahagian;
}

async function panggilTelegram(env, kaedah, badan) {
  const respons = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${kaedah}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badan),
    }
  );
  if (!respons.ok) {
    const teks = await respons.text().catch(() => '');
    console.error(`Telegram ${kaedah} ${respons.status}: ${teks.slice(0, 300)}`);
  }
  return respons;
}

async function hantarTelegram(env, chatId, teks, replyMarkup) {
  const bahagian = pecahTeks(teks || '');
  for (let i = 0; i < bahagian.length; i += 1) {
    await panggilTelegram(env, 'sendMessage', {
      chat_id: chatId,
      text: bahagian[i],
      disable_web_page_preview: true,
      ...(i === bahagian.length - 1 && replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }
}

async function taipTelegram(env, chatId) {
  await panggilTelegram(env, 'sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function bacaSejarah(env, chatId) {
  if (env.CHAT_KV) {
    const mentah = await env.CHAT_KV.get(`tg:${chatId}`);
    if (!mentah) return [];
    try {
      const data = JSON.parse(mentah);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  const rekod = memoriSejarah.get(chatId);
  if (!rekod || Date.now() - rekod.masa > SEJARAH_TTL_MS) return [];
  return rekod.messages;
}

async function tulisSejarah(env, chatId, messages) {
  const bersih = messages.slice(-6);
  if (env.CHAT_KV) {
    await env.CHAT_KV.put(`tg:${chatId}`, JSON.stringify(bersih), {
      expirationTtl: 3600,
    });
    return;
  }
  memoriSejarah.set(chatId, { messages: bersih, masa: Date.now() });
}

async function prosesTelegram(update, env) {
  const callback = update.callback_query;
  const mesej = update.message;
  const chatId = mesej?.chat?.id ?? callback?.message?.chat?.id;
  if (!chatId) return;

  if (!chatDibenarkan(chatId, env)) {
    await hantarTelegram(env, chatId, 'Maaf, bot ini terhad kepada pengguna yang dibenarkan.');
    return;
  }

  if (!dibenarkanHad(hadTelegram, chatId, HAD_TELEGRAM_SEMINIT)) {
    await hantarTelegram(env, chatId, 'Terlalu banyak mesej. Sila cuba sebentar lagi.');
    return;
  }

  if (callback) {
    await panggilTelegram(env, 'answerCallbackQuery', { callback_query_id: callback.id });
  }

  let dataLaman;
  try {
    dataLaman = await muatDataLaman(env);
  } catch (error) {
    console.error('Telegram data laman:', error.message);
    await hantarTelegram(
      env,
      chatId,
      'Maaf, pangkalan maklumat PERKIM tidak dapat dimuatkan sekarang. Sila cuba sebentar lagi.'
    );
    return;
  }

  const dataCallback = String(callback?.data || '');
  if (dataCallback === 'menu') {
    await hantarTelegram(env, chatId, 'Pilih soalan:', papanMenu(dataLaman.menu));
    return;
  }

  let teks = String(mesej?.text || '').trim();

  if (dataCallback.startsWith('q:')) {
    const id = dataCallback.slice(2);
    const item = dataLaman.menu.find((calon) => String(calon.id) === id);
    if (!item) {
      await hantarTelegram(env, chatId, 'Soalan itu tiada dalam menu semasa.', papanMenu(dataLaman.menu));
      return;
    }
    teks = String(item.soalan || '').trim();
  }

  if (!teks) {
    await hantarTelegram(env, chatId, 'Sila hantar soalan dalam bentuk teks.', papanMenu(dataLaman.menu));
    return;
  }

  const arahan = teks.split(/\s+/)[0].toLowerCase().split('@')[0];

  if (arahan === '/start') {
    await hantarTelegram(
      env,
      chatId,
      `${dataLaman.salam}\n\n${dataLaman.nota}\n\nArahan: /menu · /reset · /help`,
      papanMenu(dataLaman.menu)
    );
    return;
  }

  if (arahan === '/menu') {
    await hantarTelegram(env, chatId, 'Pilih soalan:', papanMenu(dataLaman.menu));
    return;
  }

  if (arahan === '/reset') {
    await tulisSejarah(env, chatId, []);
    await hantarTelegram(env, chatId, 'Perbualan telah direset. Apa yang boleh saya bantu?');
    return;
  }

  if (arahan === '/help') {
    await hantarTelegram(
      env,
      chatId,
      'Saya PERKIM BOT, pembantu maya PERKIM Cawangan Kuala Langat.\n\n' +
        '/menu — senarai soalan pantas\n/reset — mula perbualan baharu\n/help — bantuan ini\n\n' +
        'Jangan hantar data peribadi murid. Untuk urusan rasmi, hubungi pejabat PERKIM Kuala Langat: 016-353 6126.'
    );
    return;
  }

  if (teks.startsWith('/')) {
    await hantarTelegram(env, chatId, 'Arahan tidak dikenali. Guna /menu, /reset atau /help.');
    return;
  }

  if (!env.NVIDIA_API_KEY) {
    await hantarTelegram(env, chatId, 'Perkhidmatan AI belum dikonfigurasikan pada bot ini.');
    return;
  }

  await taipTelegram(env, chatId);

  const pengawal = new AbortController();
  const pemasa = setTimeout(() => pengawal.abort(), 60_000);

  try {
    const sejarah = await bacaSejarah(env, chatId);
    const messages = [...sejarah, { role: 'user', content: teks.slice(0, LIMITS.maxCharsPerMessage) }];
    const { text } = await completeChat({
      apiKey: env.NVIDIA_API_KEY,
      model: env.MODEL || MODEL_LALAI,
      messages: buildMessages({ messages, konteks: dataLaman.konteks }),
      signal: pengawal.signal,
    });

    await tulisSejarah(env, chatId, [...messages, { role: 'assistant', content: text }]);
    await hantarTelegram(env, chatId, teksTelegram(text, env), papanMenu(dataLaman.menu));
  } catch (error) {
    console.error('Telegram AI:', error.message);
    await hantarTelegram(
      env,
      chatId,
      'Maaf, perkhidmatan AI tidak dapat dihubungi sekarang. Sila cuba lagi atau hubungi pejabat PERKIM Kuala Langat: 016-353 6126.'
    );
  } finally {
    clearTimeout(pemasa);
  }
}
