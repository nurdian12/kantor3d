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
