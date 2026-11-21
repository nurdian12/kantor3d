/** Tim kantor media sosial. Metadata statis untuk tampilan manajemen/monitoring (selaras dengan server mock). */
export interface AgentMeta { id: string; name: string; role: string; color: string; chartDark: string }

// Urutan = urutan slot kategorikal grafik (tetap, tidak dirotasi). Varian `chartDark` sudah divalidasi
// terhadap permukaan gelap (lightness band) — tiga warna terang diturunkan agar lolos.
export const AGENT_META: AgentMeta[] = [
  { id: "manager", name: "Social Manager", role: "Orkestrator", color: "#6366f1", chartDark: "#6366f1" },
  { id: "scraper", name: "Social Scraper", role: "Riset & Scraping", color: "#10b981", chartDark: "#059669" },
  { id: "creator", name: "Content Creator", role: "Pembuatan Konten", color: "#f59e0b", chartDark: "#d97706" },
  { id: "scheduler", name: "Scheduler", role: "Penjadwalan (Repliz)", color: "#ec4899", chartDark: "#ec4899" },
  { id: "community", name: "Community Manager", role: "Komentar & Chat (Repliz)", color: "#06b6d4", chartDark: "#0891b2" },
  { id: "analyst", name: "Analyst", role: "Analitik Performa", color: "#8b5cf6", chartDark: "#8b5cf6" },
];

const byId = new Map(AGENT_META.map((a) => [a.id, a]));
export const agentMeta = (id: string): AgentMeta =>
  byId.get(id) ?? { id, name: id, role: "Agent", color: "#64748b", chartDark: "#94a3b8" };
export const chartColor = (id: string, theme: "light" | "dark") => (theme === "dark" ? agentMeta(id).chartDark : agentMeta(id).color);
