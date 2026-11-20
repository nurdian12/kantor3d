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
Klien reconnect otomatis (exponential backoff). Agen baru dari server dipetakan ke 3 meja dan 3 spot idle yang ada
(layout saat ini mendukung 3 agen; lebih dari itu akan berbagi meja).
