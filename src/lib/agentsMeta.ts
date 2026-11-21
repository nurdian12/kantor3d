/** Tim kantor media sosial. deskIndex = meja di lantai kerja sesuai peran (L1 Sapa · L2 Pixel · L3 Radar+Kompas · L4 Nova+Orbit); idleIndex = spot di lantai 5.
 * Metadata statis untuk tampilan manajemen/monitoring (selaras dengan server mock). */
export interface AgentMeta { id: string; name: string; role: string; color: string; chartDark: string; deskIndex: number; idleIndex: number }

// Urutan = urutan slot kategorikal grafik (tetap, tidak dirotasi). Varian `chartDark` sudah divalidasi
// terhadap permukaan gelap (lightness band) — tiga warna terang diturunkan agar lolos.
export const AGENT_META: AgentMeta[] = [
  { id: "manager", deskIndex: 9, idleIndex: 0, name: "Nova", role: "Social Manager · Orkestrator", color: "#6366f1", chartDark: "#6366f1" },
  { id: "scraper", deskIndex: 6, idleIndex: 1, name: "Radar", role: "Social Scraper · Riset & Scraping", color: "#10b981", chartDark: "#059669" },
  { id: "creator", deskIndex: 3, idleIndex: 2, name: "Pixel", role: "Content Creator · Pembuatan Konten", color: "#f59e0b", chartDark: "#d97706" },
  { id: "scheduler", deskIndex: 10, idleIndex: 3, name: "Orbit", role: "Scheduler · Penjadwalan (Repliz)", color: "#ec4899", chartDark: "#ec4899" },
  { id: "community", deskIndex: 0, idleIndex: 4, name: "Sapa", role: "Community Manager · Komentar & Chat (Repliz)", color: "#06b6d4", chartDark: "#0891b2" },
  { id: "analyst", deskIndex: 7, idleIndex: 5, name: "Kompas", role: "Analyst · Analitik Performa", color: "#8b5cf6", chartDark: "#8b5cf6" },
];

const byId = new Map(AGENT_META.map((a) => [a.id, a]));
export const agentMeta = (id: string): AgentMeta =>
  byId.get(id) ?? { id, name: id, role: "Agent", color: "#64748b", chartDark: "#94a3b8", deskIndex: 0, idleIndex: 0 };
export const chartColor = (id: string, theme: "light" | "dark") => (theme === "dark" ? agentMeta(id).chartDark : agentMeta(id).color);
