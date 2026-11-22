/**
 * Tim digital marketing: satu agen per divisi (14 divisi) — SATU-SATUNYA sumber nama/peran/warna/penempatan.
 * deskIndex = meja di lantai kerja (4 meja per lantai: L1 0-3 · L2 4-7 · L3 8-11 · L4 12-15); idleIndex = spot di lantai 5.
 * source "real" = status diturunkan dari data nyata (lihat lib/replizAgents.ts); "none" = belum ada sumber data, `why` menjelaskan alasannya.
 */
export interface AgentMeta {
  id: string; name: string; role: string; division: string; color: string; chartDark: string;
  deskIndex: number; idleIndex: number; source: "real" | "none"; why?: string;
}

// Enam warna pertama = slot kategorikal grafik yang sudah divalidasi (jangan diubah urutannya); `chartDark` = varian untuk permukaan gelap.
export const AGENT_META: AgentMeta[] = [
  { id: "manager", name: "Nova", division: "Strategi & Manajemen", role: "Strategi & Manajemen", color: "#6366f1", chartDark: "#6366f1", deskIndex: 12, idleIndex: 0, source: "real" },
  { id: "scraper", name: "Radar", division: "Riset & Social Listening", role: "Riset & Social Listening", color: "#10b981", chartDark: "#059669", deskIndex: 8, idleIndex: 1, source: "none", why: "riset/pemantau kata kunci di Repliz butuh upgrade plan" },
  { id: "creator", name: "Pixel", division: "Konten & Copywriting", role: "Konten & Copywriting", color: "#f59e0b", chartDark: "#d97706", deskIndex: 4, idleIndex: 2, source: "none", why: "template/konten di Repliz butuh upgrade plan" },
  { id: "scheduler", name: "Orbit", division: "Media Sosial & Penjadwalan", role: "Media Sosial & Penjadwalan", color: "#ec4899", chartDark: "#ec4899", deskIndex: 13, idleIndex: 3, source: "real" },
  { id: "community", name: "Sapa", division: "Komunitas & Engagement", role: "Komunitas & Engagement", color: "#06b6d4", chartDark: "#0891b2", deskIndex: 0, idleIndex: 4, source: "real" },
  { id: "analyst", name: "Kompas", division: "Analitik & Pelaporan", role: "Analitik & Pelaporan", color: "#8b5cf6", chartDark: "#8b5cf6", deskIndex: 10, idleIndex: 5, source: "real" },
  { id: "designer", name: "Lumi", division: "Desain & Video", role: "Desain & Video", color: "#d946ef", chartDark: "#c026d3", deskIndex: 5, idleIndex: 6, source: "real" },
  { id: "crm", name: "Vega", division: "CRM & Leads", role: "CRM & Leads", color: "#0ea5e9", chartDark: "#0284c7", deskIndex: 1, idleIndex: 7, source: "real" },
  { id: "seo", name: "Atlas", division: "SEO & Konten Organik", role: "SEO & Konten Organik", color: "#84cc16", chartDark: "#65a30d", deskIndex: 9, idleIndex: 8, source: "none", why: "belum ada sumber data (mis. Google Search Console)" },
  { id: "ads", name: "Roket", division: "Iklan Berbayar (Ads)", role: "Iklan Berbayar (Ads)", color: "#f97316", chartDark: "#ea580c", deskIndex: 14, idleIndex: 9, source: "none", why: "belum ada integrasi Ads Manager (Meta/Google)" },
  { id: "email", name: "Komet", division: "Email & WhatsApp Marketing", role: "Email & WhatsApp Marketing", color: "#14b8a6", chartDark: "#0d9488", deskIndex: 15, idleIndex: 10, source: "none", why: "belum ada akun WhatsApp/Telegram terhubung" },
  { id: "influencer", name: "Satelit", division: "Influencer & Afiliasi", role: "Influencer & Afiliasi", color: "#eab308", chartDark: "#ca8a04", deskIndex: 6, idleIndex: 11, source: "none", why: "belum ada sumber data influencer/afiliasi" },
  { id: "pr", name: "Aurora", division: "PR & Brand", role: "PR & Brand", color: "#a855f7", chartDark: "#9333ea", deskIndex: 2, idleIndex: 12, source: "none", why: "belum ada sumber data PR/brand" },
  { id: "market", name: "Bintang", division: "Marketplace & E-commerce", role: "Marketplace & E-commerce", color: "#64748b", chartDark: "#94a3b8", deskIndex: 3, idleIndex: 13, source: "none", why: "belum ada akun Shopee/marketplace terhubung" },
];

const byId = new Map(AGENT_META.map((a) => [a.id, a]));
export const agentMeta = (id: string): AgentMeta =>
  byId.get(id) ?? { id, name: id, role: "Agent", division: "Lainnya", color: "#64748b", chartDark: "#94a3b8", deskIndex: 0, idleIndex: 0, source: "none" };
export const chartColor = (id: string, theme: "light" | "dark") => (theme === "dark" ? agentMeta(id).chartDark : agentMeta(id).color);
/** Agen yang belum punya sumber data nyata */
export const NOT_CONNECTED_IDS: string[] = AGENT_META.filter((a) => a.source === "none").map((a) => a.id);
