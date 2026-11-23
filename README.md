# AI Agent Mission Control

Dashboard kantor virtual 3D **5 lantai** (Next.js App Router, TypeScript, Tailwind, React Three Fiber).

```bash
npm install
npm run dev   # http://localhost:3000
```

- `src/store/useMissionStore.ts` – state agen (Working/Idle/Error), log, mode tampilan, tema, simulasi real-time
- `src/lib/layout.ts` – koordinat meja, area idle (lounge/kamar/balkon), tangga
- `src/components/` – `Office` (model 3D), `Character` (animasi jalan lewat tangga), `Overview2D`, `QuickPanel`, `Dashboard`

Working/Error → meja di lantai kerja masing-masing (1–4) · Idle → lantai 5 (lounge, kamar, rooftop). Ganti status lewat Quick Panel atau biarkan simulasi "Live" berjalan.

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
Tombol **Semua / L1–L5** di pojok kiri atas tampilan 3D menganimasikan kamera ke lantai terpilih (`presetFor` di `Scene3D.tsx`). Fokus lantai n menyembunyikan lantai di atasnya, dan hanya karakter di lantai n yang tampil.

## Kamera mengikuti agen
Klik agen (di scene 3D atau di Quick Panel): kamera menghaluskan gerak ke agen tersebut, zoom otomatis sekali, lalu terus mengikuti
(termasuk saat naik/turun tangga) sambil tetap bisa diputar dan di-zoom. Chip di kiri atas bisa menjeda ("Mengikuti" / "Ikuti")
atau membatalkan pilihan (✕). Jika agen ada di lantai yang disembunyikan oleh fokus lantai, fokus dikembalikan ke "Semua".

## Autentikasi
Opsional; aktif bila `AUTH_SECRET` **dan** `DASHBOARD_PASSWORD` diisi (lihat `.env.local.example`). Tanpa keduanya, semuanya terbuka seperti sebelumnya (mode dev).

1. **Login** — `/login` memeriksa password (perbandingan constant-time, batas 5 gagal/menit/IP) lalu menaruh cookie sesi `httpOnly`, `SameSite=Strict`, berumur 8 jam, bertanda tangan HMAC. `middleware.ts` melindungi `/` dan `/api/ws-ticket`.
2. **Tiket WebSocket** — browser tidak bisa mengirim header pada WebSocket, dan `NEXT_PUBLIC_*` terlihat publik, jadi secret **tidak** ditaruh di klien. Klien meminta tiket ke `/api/ws-ticket` (butuh sesi), lalu konek dengan `?ticket=...`. Tiket berumur 30 detik dan sekali pakai.
3. **Server WS** (`server/mock-server.mjs`) memverifikasi tiket, menolak tiket kedaluwarsa/dipakai ulang (401), memeriksa `Origin` terhadap `WS_ALLOWED_ORIGINS` (403), membatasi ukuran pesan 4 KB, memvalidasi `set_status`, dan memutus koneksi mati (heartbeat).

Catatan produksi: gunakan HTTPS/`wss://` (tiket ada di query string), jalankan server WS dengan `AUTH_SECRET` yang sama, dan env aplikasi cukup tersedia saat **runtime** (`.env.local` di folder aplikasi; sudah diuji, termasuk middleware login), kecuali `NEXT_PUBLIC_*` yang ikut tertanam saat build.
Batasan: pembatas login & daftar tiket terpakai berada di memori satu proses (gunakan Redis bila multi-instance); satu password untuk semua pengguna, belum ada peran viewer/operator.

## Kantor media sosial — semua data dari Repliz
Tim 6 agen (`src/lib/agentsMeta.ts`): **Nova** (Social Manager), **Radar** (Social Scraper), **Pixel** (Content Creator), **Orbit** (Scheduler), **Sapa** (Community Manager), **Kompas** (Analyst). Ganti nama/peran cukup di satu tempat: `src/lib/agentsMeta.ts` (+ `server/mock-server.mjs` bila memakai server mock).
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
- Dipanggil dari server lewat `/api/repliz/*`; kredensial (**Access Key + Secret Key** Repliz sebagai `REPLIZ_BASIC_USER`/`REPLIZ_BASIC_PASS`; `REPLIZ_TOKEN` hanya untuk bearer OAuth 1 jam) hanya dari env server. Hanya `GET /public/*` yang diizinkan (`src/lib/repliz.ts`). Respons tidak memuat email/nama pemilik.
- Route dilindungi middleware login bila autentikasi aktif; ringkasan di-cache 30 dtk, jadwal 60 dtk, statistik 10 menit.
- Di jaringan yang memakai proxy keluar, jalankan Node dengan `NODE_USE_ENV_PROXY=1`.
- Spesifikasi API: `https://api.repliz.com/public` (Swagger).

## Performa 3D
Tombol **Kualitas** (Tinggi / Sedang / Ringan) di kanan atas tampilan 3D (`src/lib/quality.ts`): mengatur resolusi (DPR), bayangan, batas FPS (render hanya sesuai kebutuhan di mode Sedang/Ringan), dan lampu titik. Bila FPS terukur rendah, kualitas turun otomatis satu tingkat (pilihan manual mematikan ini dan disimpan). Di uji render software, Ringan ±2× lebih cepat. Server/VPS tidak mempercepat rendering 3D — itu dikerjakan GPU perangkat yang membuka halaman.

## Deploy ke VPS tanpa Docker (Ubuntu/Debian)
File contoh ada di `deploy/` (`mission-control.service`, `Caddyfile`, `deploy.sh`). Ringkasan langkah:
1. Pasang Node.js 22 LTS, git, dan Caddy; buat user `missioncontrol`; `git clone -b <branch> ... /opt/kantor3d`; `npm ci && npm run build`.
2. Buat `/opt/kantor3d/.env.local` (chmod 600): `REPLIZ_BASIC_USER/PASS`, **wajib** `AUTH_SECRET` + `DASHBOARD_PASSWORD` (tanpa ini siapa pun yang tahu alamatnya bisa melihat data Repliz Anda).
3. Pasang `mission-control.service` ke systemd; pasang `Caddyfile` dengan domain Anda (HTTPS wajib: cookie login bertanda Secure).
4. Firewall: buka hanya 22, 80, 443; aplikasi mendengarkan di `127.0.0.1:3000`.
5. Update: `deploy/deploy.sh`.
Server WebSocket (`server/mock-server.mjs`) hanya mock untuk pengembangan — jangan dideploy; tanpa runtime agen sungguhan, biarkan `NEXT_PUBLIC_WS_URL` kosong.

## Kantor satu lantai lebar & 14 divisi digital marketing
Semua ruangan ada di lantai 1 (46 × 14 satuan), dengan gaya isometrik modern (dinding putih, LED neon, meja putih, monitor lengkung). Tombol fokus: Semua · Kerja · Rapat · Lobi · Duduk · Pantry · Billiard · Tidur.

| Zona (barat → timur) | Isi |
|---|---|
| Ruang Rapat, Lobi & Resepsionis | meja rapat 6 kursi + layar, resepsionis, sofa tunggu |
| Area Kerja | 15 meja (3 baris × 5) berjarak lapang dengan lorong di antara baris, 3 layar dinding, meja berdiri kolaboratif |
| Ruang Duduk, Pantry & Kafe | sofa + TV + rak buku; meja makan 4 kursi, bar kopi |
| Ruang Billiard, Kamar Tidur | meja biliar, dart, bar mini; 3 tempat tidur |

- **Agen Idle tersebar** (`IDLE_SPOTS` di `src/lib/layout.ts`): tidur, duduk di ruang duduk/pantry/rapat/lobi, main billiard, atau **berkeliling** (4 rute, berhenti beberapa detik di tiap titik). Working/Error duduk di meja; perpindahan lewat lorong utama (`routeTo`).
- **Orkestrator = Nova** (`src/lib/useOrchestrator.ts`): tiap 5 dtk memantau agen dan data jadwal, lalu: agen Error → instruksi pemulihan + tugas Kanban + Nova berjalan ke meja agen itu; posting gagal → Orbit menjadwalkan ulang; komentar menunggu → Sapa; kontak jatuh tempo → Vega; antrean kosong → Orbit mengisi jadwal; agen pulih → dicatat. Instruksi muncul di Log, panel kru, dan Kanban (kartu "Ditugaskan oleh Nova"). **Koordinasi ini internal** (log, tugas, gerak karakter): tidak menulis apa pun ke Repliz.
- Nama/peran/warna/meja/spot istirahat tiap agen: `src/lib/agentsMeta.ts`. Data nyata vs belum terhubung: lihat tabel divisi di atas.
- Kualitas: **Ringan** menghapus bayangan, lampu, halo LED, dan semua dekorasi zona selain area kerja.

## Deploy otomatis dari GitHub (opsional)
`.github/workflows/deploy.yml` menjalankan `deploy/deploy.sh` di VPS lewat SSH setiap ada push ke cabang `claude/nice-babbage-mkytfe` (atau manual dari tab Actions). Butuh 4 *secret* di GitHub (Settings → Secrets and variables → Actions): `VPS_HOST` (IP publik), `VPS_USER` (`missioncontrol`), `VPS_SSH_KEY` (kunci privat khusus deploy), `VPS_KNOWN_HOSTS` (hasil `ssh-keyscan IP`). Di VPS, user itu hanya perlu izin `sudo systemctl restart/status mission-control` (lihat langkah di percakapan/README deploy).
