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

## Manajemen kerja & monitoring
Navigasi tab di bawah header (data **mock**; kantor 3D tetap ter-mount saat berpindah tab):

| Tab | Isi | Kode |
|---|---|---|
| Tugas | Kanban To Do / In Progress / Ready / Done: drag & drop (atau tombol ← →), filter agen, tambah/hapus tugas | `views/TasksView.tsx` |
| Kalender | Kalender bulanan jadwal cron semua agen, detail per hari (terjadwal/berhasil/gagal), daftar job + saklar aktif, eksekusi berikutnya | `views/CalendarView.tsx`, `lib/cron.ts` |
| Token | Statistik + grafik batang bertumpuk per agen, rentang 24 jam / 7 hari / 30 hari, bandingkan dengan periode sebelumnya, rincian per agen, tampilan tabel | `views/UsageView.tsx` |
| Memori | Daftar memori per agen (fakta/preferensi/konteks/pembelajaran), pencarian, anggaran token, tambah/hapus | `views/MemoryView.tsx` |
| File | File explorer output agen + pratinjau & unduh | `views/FilesView.tsx` |
| Log | Terminal log real-time: filter level/sumber, cari, jeda, unduh, bersihkan | `views/LogsView.tsx` |

- Cron mendukung 5 field (`*`, `a-b`, `a,b`, `*/n`); aturan tanggal-ATAU-hari-minggu standar cron berlaku.
- Warna grafik mengikuti agen (bukan peringkat) dan sudah divalidasi untuk mode terang & gelap (varian gelap di `lib/agentsMeta.ts`).
- Log sistem mencerminkan log aktivitas agen dari WebSocket; tanpa WebSocket, baris sistem disimulasikan.
- Biaya token memakai asumsi $3 / $15 per 1M token (input / output) — ubah `PRICE_IN`/`PRICE_OUT` di `UsageView.tsx`.
- Data masih di memori browser (hilang saat reload). Untuk data nyata, ganti `lib/mockData.ts` dan `useWorkStore` dengan sumber server; protokol WebSocket belum memuat tugas/token/memori.
