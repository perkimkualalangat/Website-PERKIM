# PERKIM BOT — Worker NVIDIA + Telegram

Modul chatbot untuk laman statik PERKIM Cawangan Kuala Langat. Kunci API NVIDIA
hanya disimpan di pelayan (Cloudflare Worker), tidak pernah dihantar ke pelayar.

## Seni bina

```text
Pelayar (GitHub Pages)
   └── widget PERKIM BOT
         └── POST /api/chat  ──┐
                               ├── Cloudflare Worker ── NVIDIA NIM
Telegram (webhook)             │        └── data/chatbot-kontekst.json
   └── POST /telegram/webhook ─┘
```

| Fail | Fungsi |
|---|---|
| `worker/prompt.mjs` | Prompt sistem, had token dan pengesahan mesej |
| `worker/chat-core.mjs` | Panggilan NVIDIA, streaming dan perataan konteks |
| `worker/nvidia-chat-worker.js` | Laluan `/api/chat`, `/telegram/webhook`, `/health` |
| `worker/wrangler.toml` | Konfigurasi deploy Cloudflare |
| `tools/chat-proxy.mjs` | Proksi tempatan untuk pembangunan |
| `data/chatbot.json` | Nama, salam, endpoint dan **menu soalan** |
| `data/chatbot-kontekst.json` | Pangkalan pengetahuan PERKIM Kuala Langat |

## 1. Jalankan secara tempatan

Dua terminal:

```powershell
node tools/serve.mjs
```

```powershell
node tools/chat-proxy.mjs
```

Buka `http://127.0.0.1:8081/`. Butang **PERKIM BOT** muncul di bawah kanan.
Endpoint tempatan sudah ditetapkan dalam `data/chatbot.json`:

```json
"localhost": "http://127.0.0.1:8788/api/chat"
```

Kunci dibaca daripada `.env` di akar projek:

```dotenv
NVIDIA_API_KEY=nvapi-...
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
CHAT_PROXY_PORT=8788
```

Semak proksi:

```powershell
Invoke-RestMethod http://127.0.0.1:8788/health
```

## 2. Deploy Worker ke Cloudflare

Dari folder `worker/`:

```powershell
npx wrangler login
npx wrangler secret put NVIDIA_API_KEY
npx wrangler deploy
```

Sebelum deploy, semak `wrangler.toml`:

```toml
SITE_ORIGIN = "https://perkimkualalangat.github.io/Website-PERKIM"
ALLOWED_ORIGINS = "https://perkimkualalangat.github.io"
```

`SITE_ORIGIN` mesti boleh diakses secara awam kerana Worker mengambil
`data/chatbot.json` dan `data/chatbot-kontekst.json` daripadanya setiap lima minit.

Selepas deploy, salin URL Worker ke `data/chatbot.json`:

```json
"produksi": "https://perkim-bot.<subdomain>.workers.dev/api/chat"
```

**Status semasa:** `https://perkim-bot.asyariff-kafa.workers.dev/api/chat`.

Uji:

```powershell
Invoke-RestMethod https://perkim-bot.<subdomain>.workers.dev/health
```

## 3. Sambungan Telegram

### 3.1 Cipta bot

1. Buka Telegram, cari **@BotFather**.
2. Hantar `/newbot`.
3. Pilih nama paparan (contoh: `PERKIM BOT`) dan username yang berakhir
   dengan `bot` (contoh: `perkim_kualalangat_bot`).
4. Simpan token daripada BotFather.

### 3.2 Tetapkan rahsia Worker

Jana rahsia webhook:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

Kemudian:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler deploy
```

### 3.3 Daftar webhook

```powershell
$TOKEN  = "<token BotFather>"
$SECRET = "<rahsia yang dijana tadi>"
$URL    = "https://perkim-bot.<subdomain>.workers.dev/telegram/webhook"

Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/setWebhook" -Method Post -Body @{
  url                  = $URL
  secret_token         = $SECRET
  allowed_updates      = '["message","callback_query"]'
}
```

Semak:

```powershell
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

### 3.4 Arahan bot

| Arahan | Fungsi |
|---|---|
| `/start` | Salam + menu soalan |
| `/menu` | Papar semula menu |
| `/reset` | Kosongkan sejarah perbualan |
| `/help` | Bantuan dan nombor telefon pejabat |

Menu Telegram dibaca daripada `data/chatbot.json` yang sama dengan widget web.
Tambah atau buang item dalam array `menu`; kedua-dua saluran akan mengikut
selepas cache lima minit tamat.

### 3.5 Pilihan

Hadkan kepada chat ID tertentu:

```toml
TELEGRAM_ALLOWED_CHAT_IDS = "123456789,987654321"
```

Simpan sejarah merentas isolate Worker (disyorkan untuk produksi):

```powershell
npx wrangler kv namespace create CHAT_KV
```

Kemudian buka komen `[kv_namespaces]` dalam `wrangler.toml` dan masukkan `id`.

## 4. Tambah atau buang menu

Edit sahaja `data/chatbot.json`:

```json
{
  "id": "keahlian",
  "label": "Keahlian",
  "soalan": "Bagaimana cara menyertai PERKIM Kuala Langat?"
}
```

- `label` dipaparkan pada butang.
- `soalan` dihantar kepada AI apabila butang ditekan.
- `id` mesti unik dan pendek (had `callback_data` Telegram: 64 bait).
- Jika `menu` kosong, bahagian menu disembunyikan.

Jawapan tetap bergantung pada `data/chatbot-kontekst.json`. Jika fakta tiada,
bot diarahkan berkata maklumat belum disahkan dan merujuk kepada pejabat.

## 5. Keselamatan dan kos

- **Jangan** letak `NVIDIA_API_KEY` dalam HTML/JS atau `data/chatbot.json`.
- Kunci yang pernah ditampal dalam sembang atau commit mesti dijana semula.
- Worker menyekat saiz badan, bilangan mesej, panjang konteks dan kadar permintaan.
- `ALLOWED_ORIGINS` menghalang laman lain menggunakan proksi anda.
- Sejarah Telegram disimpan satu jam sahaja dan tidak menyimpan data peribadi.
- Untuk kos, pantau penggunaan di NVIDIA dan hadkan `max_tokens` dalam
  `worker/prompt.mjs` jika perlu.

## 6. Penyelesaian masalah

| Gejala | Semakan |
|---|---|
| Butang muncul, jawapan gagal | Proksi/Worker tidak berjalan atau endpoint salah |
| `401`/`403` | Kunci NVIDIA salah, tamat, atau tiada akses model |
| `429` | Had kadar NVIDIA atau had Worker dicapai |
| CORS | `ALLOWED_ORIGINS` mesti mengandungi origin laman |
| Telegram senyap | `getWebhookInfo`, `wrangler tail`, semak secret token |
| Data lama | Cache lima minit; tunggu atau deploy semula |

Log produksi:

```powershell
npx wrangler tail
```
