# AI Agent Mission Control

Dashboard kantor virtual 3D (Next.js App Router, TypeScript, Tailwind, React Three Fiber) dengan data mock.

```bash
npm install
npm run dev   # http://localhost:3000
```

- `src/store/useMissionStore.ts` – state agen (Working/Idle/Error), log, mode tampilan, tema, simulasi real-time
- `src/lib/layout.ts` – koordinat meja, area idle (lounge/kamar/balkon), tangga
- `src/components/` – `Office` (model 3D), `Character` (animasi jalan lewat tangga), `Overview2D`, `QuickPanel`, `Dashboard`

Working/Error → meja lantai 1 · Idle → lantai 2. Ganti status lewat Quick Panel atau biarkan simulasi "Live" berjalan.

## Data real-time via WebSocket

```bash
cp .env.local.example .env.local   # NEXT_PUBLIC_WS_URL=ws://localhost:8080
npm run ws                         # server mock (server/mock-server.mjs)
npm run dev
```

Tanpa `NEXT_PUBLIC_WS_URL`, dashboard memakai simulasi lokal. Kontrak pesan ada di `src/lib/protocol.ts`:
server mengirim `snapshot` (saat konek), `status`, dan `log`; klien dapat mengirim `set_status`.
Klien reconnect otomatis (exponential backoff). Agen dari server dipetakan ke 6 meja (2 baris x 3) dan 6 spot idle (2 sofa, 2 kasur, 2 posisi balkon)
(`CAPACITY` di `src/lib/layout.ts`); agen ke-7 dst. berbagi meja/spot. Server mock kini mengirim 6 agen.

## Fokus kamera
Tombol **Semua / Lantai 1 / Lantai 2** di pojok kiri atas tampilan 3D menganimasikan kamera ke preset (`PRESETS` di `Scene3D.tsx`).
Fokus Lantai 1 menyembunyikan lantai 2 dan karakter di dalamnya agar kedua baris meja terlihat penuh dari atas.

## Kamera mengikuti agen
Klik agen (di scene 3D atau di Quick Panel): kamera menghaluskan gerak ke agen tersebut, zoom otomatis sekali, lalu terus mengikuti
(termasuk saat naik/turun tangga) sambil tetap bisa diputar dan di-zoom. Chip di kiri atas bisa menjeda ("Mengikuti" / "Ikuti")
atau membatalkan pilihan (✕). Jika agen ada di lantai yang disembunyikan oleh fokus lantai, fokus dikembalikan ke "Semua".

## Autentikasi
Opsional; aktif bila `AUTH_SECRET` **dan** `DASHBOARD_PASSWORD` diisi (lihat `.env.local.example`). Tanpa keduanya, semuanya terbuka seperti sebelumnya (mode dev).

1. **Login** — `/login` memeriksa password (perbandingan constant-time, batas 5 gagal/menit/IP) lalu menaruh cookie sesi `httpOnly`, `SameSite=Strict`, berumur 8 jam, bertanda tangan HMAC. `middleware.ts` melindungi `/` dan `/api/ws-ticket`.
2. **Tiket WebSocket** — browser tidak bisa mengirim header pada WebSocket, dan `NEXT_PUBLIC_*` terlihat publik, jadi secret **tidak** ditaruh di klien. Klien meminta tiket ke `/api/ws-ticket` (butuh sesi), lalu konek dengan `?ticket=...`. Tiket berumur 30 detik dan sekali pakai.
3. **Server WS** (`server/mock-server.mjs`) memverifikasi tiket, menolak tiket kedaluwarsa/dipakai ulang (401), memeriksa `Origin` terhadap `WS_ALLOWED_ORIGINS` (403), membatasi ukuran pesan 4 KB, memvalidasi `set_status`, dan memutus koneksi mati (heartbeat).

Catatan produksi: gunakan HTTPS/`wss://` (tiket ada di query string), jalankan server WS dengan `AUTH_SECRET` yang sama, dan set env saat **build dan runtime**.
Batasan: pembatas login & daftar tiket terpakai berada di memori satu proses (gunakan Redis bila multi-instance); satu password untuk semua pengguna, belum ada peran viewer/operator.

## Kantor media sosial — semua data dari Repliz
Tim 6 agen (`src/lib/agentsMeta.ts`): **Social Manager**, **Social Scraper**, **Content Creator**, **Scheduler**, **Community Manager**, **Analyst**.
Aplikasi **tidak memakai data contoh/mock**: setiap tampilan berasal dari Repliz (baca-saja) atau dari runtime agen lewat WebSocket, dan bila sumbernya belum ada, tampilan memberi tahu dengan jelas.

| Tab | Sumber nyata | Catatan |
|---|---|---|
| Kantor | status agen dari Repliz (`lib/replizAgents.ts`) | Manager/Scheduler/Community/Analyst diturunkan dari Repliz; Scraper & Creator "belum terhubung" |
| Tugas | kartu "Alur Repliz": posting gagal, komentar menunggu, sedang tayang, antrean, tayang 24 jam | read-only; tugas manual (tombol Tambah) hanya di browser |
| Kalender | jadwal posting Repliz (`/api/repliz/schedule`, 6 minggu terlihat) | ringkasan status per hari, filter status & platform, detail + pesan error |
| Analitik | statistik akun Repliz (pengikut, views/jangkauan harian) | di-cache server 10 menit |
| Token | pesan WebSocket `usage` dari runtime agen | Repliz tidak mencatat token; kosong bila belum ada (format di tab) |
| Memori | knowledge base Repliz | saat ini kosong di akun ini |
| File | storage Repliz (pencarian, filter, paginasi) | thumbnail dimuat dari `storage.repliz.com` |
| Sosial | ringkasan + strip alur kerja 6 tahap | |
| Log | peristiwa nyata: sinkron Repliz, WebSocket, perubahan status agen | |

**Status agen dari Repliz** (polling 60 dtk; dilewati saat WebSocket `live`): Scheduler = *Error* bila ada posting gagal dalam 72 jam, *Working* bila sedang diproses/tayang <30 menit lagi; Community = *Working* selama ada komentar menunggu; Analyst = ringkasan statistik; Manager = *Working* bila ada antrean/komentar, *Error* bila sinkron Repliz gagal.

**Keterbatasan akun Repliz saat ini** (HTTP 402 *upgrade plan*): `content`, `chat`, `template`, `automation`, `watcher`, `listener`, `report`, dan `research` TikTok/Threads. Karena itu Scraper & Creator belum bisa dihubungkan; setelah plan naik, endpoint tersebut bisa disambungkan.

### Integrasi Repliz (server, baca-saja)
- Dipanggil dari server lewat `/api/repliz/*`; kredensial (`REPLIZ_TOKEN` atau `REPLIZ_BASIC_USER`/`REPLIZ_BASIC_PASS`) hanya dari env server. Hanya `GET /public/*` yang diizinkan (`src/lib/repliz.ts`). Respons tidak memuat email/nama pemilik.
- Route dilindungi middleware login bila autentikasi aktif; ringkasan di-cache 30 dtk, jadwal 60 dtk, statistik 10 menit.
- Di jaringan yang memakai proxy keluar, jalankan Node dengan `NODE_USE_ENV_PROXY=1`.
- Spesifikasi API: `https://api.repliz.com/public` (Swagger).

## Performa 3D
Tombol **Kualitas** (Tinggi / Sedang / Ringan) di kanan atas tampilan 3D (`src/lib/quality.ts`): mengatur resolusi (DPR), bayangan, batas FPS (render hanya sesuai kebutuhan di mode Sedang/Ringan), dan lampu titik. Bila FPS terukur rendah, kualitas turun otomatis satu tingkat (pilihan manual mematikan ini dan disimpan). Di uji render software, Ringan ±2× lebih cepat. Server/VPS tidak mempercepat rendering 3D — itu dikerjakan GPU perangkat yang membuka halaman.
