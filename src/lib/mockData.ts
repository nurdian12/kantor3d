import type { FileEntry, MemoryItem, ScheduledJob, Task, UsageRecord } from "./workTypes";
import { AGENT_META } from "./agentsMeta";

const HOUR = 3_600_000, DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;

// Tugas lokal (mock) untuk peran yang tidak terwakili data Repliz: riset, pembuatan konten, analitik.
// Kartu dari Repliz (jadwal, gagal, komentar) ditambahkan terpisah di TasksView.
export const INITIAL_TASKS = (): Task[] => [
  { id: "t1", title: "Susun kalender konten minggu depan", agentId: "manager", status: "in_progress", priority: "high", createdAt: ago(5 * HOUR) },
  { id: "t2", title: "Briefing konten harian", agentId: "manager", status: "done", priority: "medium", createdAt: ago(1 * DAY) },
  { id: "t3", title: "Tentukan tema kampanye Desember", agentId: "manager", status: "todo", priority: "medium", createdAt: ago(3 * HOUR) },
  { id: "t4", title: "Scrape 50 video TikTok tren #psikologi", agentId: "scraper", status: "in_progress", priority: "high", createdAt: ago(2 * HOUR) },
  { id: "t5", title: "Pantau 5 akun kompetitor Instagram", agentId: "scraper", status: "todo", priority: "medium", createdAt: ago(8 * HOUR) },
  { id: "t6", title: "Rangkum hashtag naik daun minggu ini", agentId: "scraper", status: "ready", priority: "low", createdAt: ago(1 * DAY) },
  { id: "t7", title: "Tulis 10 caption Reels sejarah & geopolitik", agentId: "creator", status: "in_progress", priority: "high", createdAt: ago(6 * HOUR) },
  { id: "t8", title: "Naskah video 60 detik: love bombing", agentId: "creator", status: "ready", priority: "medium", createdAt: ago(12 * HOUR) },
  { id: "t9", title: "Carousel edukasi: gaslighting", agentId: "creator", status: "done", priority: "medium", createdAt: ago(2 * DAY) },
  { id: "t10", title: "Siapkan thumbnail seri 'Bretton Woods'", agentId: "creator", status: "todo", priority: "low", createdAt: ago(1 * DAY) },
  { id: "t11", title: "Susun template balasan komentar umum", agentId: "community", status: "todo", priority: "low", createdAt: ago(4 * HOUR) },
  { id: "t12", title: "Laporan performa mingguan", agentId: "analyst", status: "todo", priority: "high", createdAt: ago(3 * HOUR) },
  { id: "t13", title: "Bandingkan engagement Reels vs Carousel", agentId: "analyst", status: "in_progress", priority: "medium", createdAt: ago(9 * HOUR) },
  { id: "t14", title: "Rekap pertumbuhan pengikut November", agentId: "analyst", status: "done", priority: "medium", createdAt: ago(3 * DAY) },
];

export const SCHEDULES: ScheduledJob[] = [
  { id: "j1", agentId: "manager", name: "Briefing konten harian", cron: "0 8 * * *", description: "Tetapkan prioritas konten dan bagi tugas tim", enabled: true },
  { id: "j2", agentId: "manager", name: "Review kampanye mingguan", cron: "0 16 * * 5", description: "Evaluasi hasil kampanye tiap Jumat sore", enabled: true },
  { id: "j3", agentId: "scraper", name: "Scrape tren TikTok & Threads", cron: "0 */3 * * *", description: "Kumpulkan hashtag dan konten naik daun tiap 3 jam", enabled: true },
  { id: "j4", agentId: "scraper", name: "Pantau akun kompetitor", cron: "0 7 * * *", description: "Catat frekuensi dan format posting kompetitor", enabled: true },
  { id: "j5", agentId: "creator", name: "Generate draf konten harian", cron: "0 5 * * *", description: "Buat draf caption & naskah dari tren terbaru", enabled: true },
  { id: "j6", agentId: "creator", name: "Batch caption mingguan", cron: "0 10 * * 0", description: "Siapkan stok caption untuk satu minggu", enabled: true },
  { id: "j7", agentId: "scheduler", name: "Isi antrean posting Repliz", cron: "0 6 * * *", description: "Jadwalkan konten siap tayang ke semua akun", enabled: true },
  { id: "j8", agentId: "scheduler", name: "Coba ulang posting gagal", cron: "*/30 * * * *", description: "Periksa antrean error dan jadwalkan ulang", enabled: true },
  { id: "j9", agentId: "community", name: "Sinkron & balas komentar", cron: "*/15 8-22 * * *", description: "Tangani komentar baru di jam aktif", enabled: true },
  { id: "j10", agentId: "community", name: "Moderasi komentar spam", cron: "0 */6 * * *", description: "Sembunyikan spam dan komentar melanggar", enabled: false },
  { id: "j11", agentId: "analyst", name: "Laporan performa harian", cron: "0 23 * * *", description: "Rekap jangkauan, engagement, dan pengikut", enabled: true },
  { id: "j12", agentId: "analyst", name: "Rekap mingguan", cron: "0 9 * * 1", description: "Ringkasan tren performa tiap Senin", enabled: true },
];

const mem = (id: string, agentId: string, kind: MemoryItem["kind"], title: string, content: string, h: number): MemoryItem =>
  ({ id, agentId, kind, title, content, updatedAt: ago(h * HOUR), tokens: Math.ceil(content.length / 3.6) });

export const INITIAL_MEMORIES = (): MemoryItem[] => [
  mem("m1", "manager", "konteks", "Tujuan kuartal", "Naikkan pengikut 20% dan engagement rate ke 4% lewat konten edukasi pendek (Reels/Shorts) di 14 akun.", 5),
  mem("m2", "manager", "preferensi", "Gaya merek", "Bahasa Indonesia santai namun faktual, hook kuat di 3 detik pertama, tanpa klaim berlebihan.", 30),
  mem("m3", "scraper", "fakta", "Sumber riset", "Pantau TikTok hashtag, Threads search, dan 5 akun kompetitor. Jangan scraping konten privat.", 12),
  mem("m4", "scraper", "pembelajaran", "Hashtag efektif", "#psikologi, #sejarah, #geopolitik memberi jangkauan tertinggi di Reels dua minggu terakhir.", 20),
  mem("m5", "creator", "preferensi", "Format unggulan", "Reels 30–45 detik dan carousel 7 slide berkinerja terbaik. Hindari caption >300 karakter.", 8),
  mem("m6", "creator", "konteks", "Seri aktif", "Seri 'Bretton Woods', 'Love bombing', dan 'Gaslighting' sedang berjalan; jaga kesinambungan hook.", 10),
  mem("m7", "scheduler", "fakta", "Jam tayang", "Jam terbaik: 07:00, 12:00, 19:00 WIB. Maksimal 3 posting/hari per akun Instagram.", 6),
  mem("m8", "scheduler", "pembelajaran", "Pembatasan Instagram", "Pesan 'We restrict certain activity' muncul saat posting terlalu rapat; beri jeda ≥2 jam antar posting.", 4),
  mem("m9", "community", "preferensi", "Gaya balasan", "Ramah, singkat, sebut nama pengguna, arahkan pertanyaan lanjutan ke DM.", 15),
  mem("m10", "community", "fakta", "Eskalasi", "Komentar kritis atau sensitif diteruskan ke Social Manager, bukan dibalas otomatis.", 40),
  mem("m11", "analyst", "fakta", "Metrik utama", "Pantau jangkauan, engagement rate, pertumbuhan pengikut, dan rasio posting berhasil/gagal.", 24),
  mem("m12", "analyst", "konteks", "Periode analisis", "Bandingkan 7 hari terakhir dengan 7 hari sebelumnya per platform.", 7),
];

// ---------- File output agen ----------
const f = (path: string, content: string, h: number): FileEntry => ({ path, agentId: path.split("/")[0], content, modified: ago(h * HOUR) });
export const FILES: FileEntry[] = [
  f("manager/reports/kalender-konten-minggu-47.md", "# Kalender Konten Minggu 47\n\n- Sen: Seri Bretton Woods (Reels)\n- Rab: Carousel gaslighting\n- Jum: Thread geopolitik\n\n## Catatan\nJeda ≥2 jam antar posting Instagram.\n", 5),
  f("manager/reports/briefing-2026-11-21.md", "# Briefing 21 Nov\n\n- Scraper: tren #psikologi\n- Creator: 10 caption Reels\n- Scheduler: isi antrean 7 hari\n", 3),
  f("scraper/outputs/hashtag-tren.csv", "hashtag,platform,volume_24j,tren\n#psikologi,tiktok,1200000,naik\n#sejarah,tiktok,860000,naik\n#geopolitik,threads,310000,stabil\n", 4),
  f("scraper/outputs/kompetitor.csv", "akun,platform,posting_per_hari,format_utama\n@kompetitor_a,instagram,3,reels\n@kompetitor_b,tiktok,5,video\n", 18),
  f("creator/drafts/caption-love-bombing.md", "# Caption: Love Bombing\n\nTerlalu manis di awal bisa jadi umpan. Lihat konsistensinya, bukan intensitasnya.\n\n#psikologi #lovebombing #shorts\n", 6),
  f("creator/drafts/naskah-bretton-woods.md", "# Naskah 60 detik: Bretton Woods\n\n[0-3s] Hook: Kenapa dolar jadi raja?\n[3-25s] Konferensi 1944, 44 negara.\n[25-50s] Dampak ke IMF dan Bank Dunia.\n[50-60s] CTA: komentar topik berikutnya.\n", 10),
  f("scheduler/queue/antrean-7-hari.json", JSON.stringify({ akun: 14, terjadwal: 330, jeda_minimum_jam: 2, jam_tayang: ["07:00", "12:00", "19:00"] }, null, 2), 2),
  f("scheduler/reports/posting-gagal.md", "# Posting gagal\nPenyebab dominan: pembatasan aktivitas Instagram.\nTindakan: perlebar jeda, jadwalkan ulang bertahap.\n", 9),
  f("community/replies/template-balasan.md", "# Template balasan\n- Terima kasih, {nama}! Senang kontennya membantu 🙏\n- Pertanyaan bagus, {nama}. Kami bahas di konten berikutnya.\n", 15),
  f("community/logs/moderasi.log", "[10:00] sembunyikan 3 komentar spam\n[10:15] eskalasi 1 komentar kritis ke manager\n", 1),
  f("analyst/reports/performa-harian.csv", "tanggal,jangkauan,engagement,pengikut_baru\n2026-11-19,412000,18400,320\n2026-11-20,455000,20100,365\n", 9),
  f("analyst/reports/rekap-mingguan.md", "# Rekap Minggu 46\n- Jangkauan +12%\n- Engagement rate 3.8%\n- Rasio berhasil/gagal 76/24\n", 60),
];

// ---------- Penggunaan token (deterministik) ----------
// mulberry32: seed berurutan tetap menghasilkan keluaran yang tidak berkorelasi
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BASE: Record<string, number> = { manager: 40_000, scraper: 110_000, creator: 125_000, scheduler: 35_000, community: 70_000, analyst: 55_000 };
const NIGHT = new Set(["scraper", "scheduler"]); // job dini hari

/** Rekaman per jam untuk 60 hari terakhir (30 hari terkini + 30 hari pembanding) */
export function generateUsage(nowMs = Date.now()): UsageRecord[] {
  const hourNow = Math.floor(nowMs / HOUR) * HOUR;
  const out: UsageRecord[] = [];
  for (let i = 60 * 24 - 1; i >= 0; i--) {
    const t = hourNow - i * HOUR;
    const d = new Date(t);
    const h = d.getHours(), dow = d.getDay();
    const work = h >= 8 && h <= 19 ? 1 : h >= 20 || h <= 1 ? 0.45 : 0.15;
    const weekend = dow === 0 || dow === 6 ? 0.45 : 1;
    for (const a of AGENT_META) {
      const r = rng(Math.floor(t / HOUR) * 31 + a.id.charCodeAt(0) * 97 + a.id.length);
      const night = NIGHT.has(a.id) ? (h < 6 ? 0.9 : 0) : 0;
      const f = Math.max(work * weekend, night) * (0.55 + r() * 0.9);
      const input = Math.round(BASE[a.id] * f);
      out.push({ t, agentId: a.id, input, output: Math.round(input * (0.2 + r() * 0.12)) });
    }
  }
  return out;
}

// ---------- Generator baris log sistem ----------
const SOURCES = ["scheduler", "ws-server", "auth", "agent-runtime", "tool-runner", "repliz"];
const TEMPLATES: Array<[("debug" | "info" | "warn" | "error"), string, string]> = [
  ["debug", "ws-server", "heartbeat ping/pong ok (6 klien)"],
  ["info", "scheduler", "job 'Scrape tren TikTok & Threads' dijalankan"],
  ["info", "agent-runtime", "agent creator memulai tugas: tulis caption Reels"],
  ["info", "repliz", "sinkron jadwal Repliz: 330 posting menunggu"],
  ["debug", "repliz", "GET /public/comment?status=pending 200 (84ms)"],
  ["warn", "tool-runner", "tool 'tiktok_search' lambat (4.2s)"],
  ["warn", "repliz", "akun Instagram terputus, perlu hubungkan ulang"],
  ["error", "repliz", "posting gagal: We restrict certain activity to protect our community"],
  ["error", "tool-runner", "tool call gagal: timeout setelah 30s (agent scraper)"],
  ["info", "scheduler", "job 'Coba ulang posting gagal' selesai"],
  ["info", "ws-server", "klien baru terhubung dari 127.0.0.1"],
  ["debug", "agent-runtime", "menyimpan memori baru untuk agen manager (214 token)"],
];
export function randomSysLine(): { level: "debug" | "info" | "warn" | "error"; source: string; message: string } {
  const r = Math.random();
  const pool = r < 0.08 ? TEMPLATES.filter((t) => t[0] === "error") : r < 0.25 ? TEMPLATES.filter((t) => t[0] === "warn") : TEMPLATES.filter((t) => t[0] === "info" || t[0] === "debug");
  const [level, source, message] = pool[Math.floor(Math.random() * pool.length)];
  return { level, source, message };
}
export { SOURCES };
