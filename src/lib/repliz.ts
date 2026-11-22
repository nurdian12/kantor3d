// Klien Repliz sisi-server (BACA-SAJA). Kredensial hanya dibaca dari env server, tidak pernah dikirim ke browser.
//   REPLIZ_TOKEN                       -> Authorization: Bearer <token>
//   REPLIZ_BASIC_USER + REPLIZ_BASIC_PASS -> Authorization: Basic ...
//   REPLIZ_API_URL                     -> default https://api.repliz.com
// Hanya metode GET ke path /public/* yang diizinkan; tidak ada posting/balas/hapus dari aplikasi ini.

export interface SocialSummary {
  fetchedAt: number;
  plan: { name?: string; expiredAt?: string } | null;
  accounts: Array<{ id: string; type: string; name: string; username?: string; isConnected: boolean }>;
  accountTotal: number;
  schedule: Record<"pending" | "process" | "error" | "success", number>;
  upcoming: Array<{ id: string; title: string; type: string; scheduleAt: string; platform: string; account: string }>;
  /** posting yang berhasil tayang dalam 24 jam terakhir (terbaru dulu, maks. 5) */
  recentDone: Array<{ id: string; title: string; scheduleAt: string; platform: string; account: string }>;
  failed: Array<{ id: string; title: string; scheduleAt: string; platform: string; account: string; errorMessage: string }>;
  comments: { total: number; items: Array<{ id: string; text: string; platform: string; account: string; contentTitle: string; createdAt: string }> };
  /** jumlah akun terdaftar per platform (shopee, whatsapp, ... = 0 bila belum ada) */
  channels: Record<string, number>;
  /** funnel kontak (CRM) */
  crm: { all: number; new: number; contacted: number; interested: number; won: number; lost: number; due: number } | null;
  /** aset kreatif di storage */
  assets: { total: number; usedBytes: number; capacityBytes: number; latestAt: string | null; latestName: string | null } | null;
}

export class ReplizError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const BASE = () => (process.env.REPLIZ_API_URL ?? "https://api.repliz.com").replace(/\/$/, "");

function authHeader(): Record<string, string> {
  if (process.env.REPLIZ_TOKEN) return { Authorization: `Bearer ${process.env.REPLIZ_TOKEN}` };
  if (process.env.REPLIZ_BASIC_USER && process.env.REPLIZ_BASIC_PASS)
    return { Authorization: "Basic " + Buffer.from(`${process.env.REPLIZ_BASIC_USER}:${process.env.REPLIZ_BASIC_PASS}`).toString("base64") };
  return {}; // mis. lingkungan dengan proxy yang menyuntikkan kredensial
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(path: string, params: Record<string, string | number> = {}): Promise<any> {
  if (!path.startsWith("/public/")) throw new Error("path tidak diizinkan");
  const url = new URL(BASE() + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Accept: "application/json", ...authHeader() }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new ReplizError(res.status, `Repliz ${path} -> HTTP ${res.status}`);
  return res.json();
}

const clip = (s: unknown, n = 160) => (typeof s === "string" ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "");

let cache: { at: number; data: SocialSummary } | null = null;
const TTL = 30_000; // hindari membanjiri API upstream (satu ringkasan = ~10 panggilan)

export async function getSocialSummary(force = false): Promise<SocialSummary> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.data;
  const nowIso = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [me, accounts, count, pending, process, error, success, upcoming, failed, comments, done, crm, latestFile, storageStat] = await Promise.all([
    get("/public/me"),
    get("/public/account", { page: 1, limit: 100 }),
    get("/public/account/count").catch(() => null),
    get("/public/schedule", { page: 1, limit: 1, status: "pending" }),
    get("/public/schedule", { page: 1, limit: 1, status: "process" }),
    get("/public/schedule", { page: 1, limit: 1, status: "error" }),
    get("/public/schedule", { page: 1, limit: 1, status: "success" }),
    get("/public/schedule", { page: 1, limit: 100, status: "pending", fromDate: nowIso }),
    get("/public/schedule", { page: 1, limit: 8, status: "error" }),
    get("/public/comment", { page: 1, limit: 10, status: "pending" }),
    get("/public/schedule", { page: 1, limit: 100, status: "success", fromDate: dayAgo }),
    get("/public/contact/count").catch(() => null),
    get("/public/storage/file", { page: 1, limit: 1 }).catch(() => null),
    get("/public/storage/statistic").catch(() => null),
  ]);

  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
  const { total: _t, limit: _l, operator: _o, ...perType } = (count ?? {}) as Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
  const data: SocialSummary = {
    channels: Object.fromEntries(Object.entries(perType).map(([k, v]) => [k, num(v)])),
    crm: crm ? { all: num(crm.all), new: num(crm.new), contacted: num(crm.contacted), interested: num(crm.interested), won: num(crm.won), lost: num(crm.lost), due: num(crm.due) } : null,
    assets: latestFile && storageStat ? { total: num(latestFile.totalDocs), usedBytes: num(storageStat.usage?.used), capacityBytes: num(storageStat.usage?.total), latestAt: latestFile.docs?.[0]?.createdAt ?? null, latestName: clip(latestFile.docs?.[0]?.filename, 60) || null } : null,
    fetchedAt: Date.now(),
    plan: me ? { name: me.plan, expiredAt: me.expiredAt } : null, // sengaja tidak menyertakan email/nama pemilik
    accounts: (accounts.docs ?? []).map((a: any) => ({ id: a.id, type: a.type, name: clip(a.name, 60), username: a.username, isConnected: !!a.isConnected })), // eslint-disable-line @typescript-eslint/no-explicit-any
    accountTotal: count?.total ?? accounts.totalDocs ?? 0,
    schedule: { pending: pending.totalDocs ?? 0, process: process.totalDocs ?? 0, error: error.totalDocs ?? 0, success: success.totalDocs ?? 0 },
    upcoming: (upcoming.docs ?? [])
      .sort((a: any, b: any) => +new Date(a.scheduleAt) - +new Date(b.scheduleAt)) // eslint-disable-line @typescript-eslint/no-explicit-any
      .slice(0, 10)
      .map((s: any) => ({ id: s.id, title: clip(s.title, 90), type: s.type, scheduleAt: s.scheduleAt, platform: s.account?.type ?? "", account: clip(s.account?.name, 40) })), // eslint-disable-line @typescript-eslint/no-explicit-any
    recentDone: (done.docs ?? [])
      .sort((a: any, b: any) => +new Date(b.scheduleAt) - +new Date(a.scheduleAt)) // eslint-disable-line @typescript-eslint/no-explicit-any
      .slice(0, 5)
      .map((s: any) => ({ id: s.id, title: clip(s.title, 90), scheduleAt: s.scheduleAt, platform: s.account?.type ?? "", account: clip(s.account?.name, 40) })), // eslint-disable-line @typescript-eslint/no-explicit-any
    failed: (failed.docs ?? []).map((s: any) => ({ id: s.id, title: clip(s.title, 90), scheduleAt: s.scheduleAt, platform: s.account?.type ?? "", account: clip(s.account?.name, 40), errorMessage: clip(s.errorMessage, 200) })), // eslint-disable-line @typescript-eslint/no-explicit-any
    comments: {
      total: comments.totalDocs ?? 0,
      items: (comments.docs ?? []).map((c: any) => ({ id: c.id, text: clip(c.comment?.text, 200), platform: c.account?.type ?? "", account: clip(c.account?.name, 40), contentTitle: clip(c.content?.title, 70), createdAt: c.comment?.createdAt ?? c.createdAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  };
  cache = { at: Date.now(), data };
  return data;
}

// ---------- Jadwal per rentang tanggal (untuk Kalender) ----------
export interface SchedulePost { id: string; title: string; type: string; status: string; scheduleAt: string; platform: string; account: string; errorMessage?: string }
export interface ScheduleRange { from: string; to: string; total: number; truncated: boolean; posts: SchedulePost[] }

const rangeCache = new Map<string, { at: number; data: ScheduleRange }>();
const MAX_PAGES = 6; // 6 x 100 = 600 posting per rentang (cukup untuk 6 minggu)

export async function getScheduleRange(from: string, to: string): Promise<ScheduleRange> {
  const key = `${from}|${to}`;
  const hit = rangeCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.data;
  const first = await get("/public/schedule", { page: 1, limit: 100, fromDate: from, toDate: to });
  const pages = Math.min(first.totalPages ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => get("/public/schedule", { page: i + 2, limit: 100, fromDate: from, toDate: to })));
  const docs = [first, ...rest].flatMap((r) => r.docs ?? []);
  const data: ScheduleRange = {
    from, to, total: first.totalDocs ?? docs.length, truncated: (first.totalPages ?? 1) > MAX_PAGES,
    posts: docs.map((d: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: d.id, title: clip(d.title, 90), type: d.type, status: d.status, scheduleAt: d.scheduleAt,
      platform: d.account?.type ?? "", account: clip(d.account?.name, 40), ...(d.errorMessage ? { errorMessage: clip(d.errorMessage, 160) } : {}),
    })),
  };
  rangeCache.set(key, { at: Date.now(), data });
  if (rangeCache.size > 20) rangeCache.delete(rangeCache.keys().next().value as string);
  return data;
}

// ---------- File storage (tab File) ----------
export interface FileItem { id: string; filename: string; mimetype: string; size: number; createdAt: string; url: string }
export interface FilePage { page: number; totalPages: number; total: number; items: FileItem[]; storage: { used: number; total: number; files: number } | null }

const STORAGE_HOST = "https://storage.repliz.com";
export async function getFiles(page: number, limit: number, search: string): Promise<FilePage> {
  const [files, stat] = await Promise.all([
    get("/public/storage/file", { page, limit, ...(search ? { search } : {}) }),
    get("/public/storage/statistic").catch(() => null),
  ]);
  return {
    page: files.page ?? page, totalPages: files.totalPages ?? 1, total: files.totalDocs ?? 0,
    items: (files.docs ?? []).map((f: any) => ({ id: f.id, filename: clip(f.filename, 120), mimetype: f.mimetype ?? "", size: f.size ?? 0, createdAt: f.createdAt, url: f.key ? `${STORAGE_HOST}/${f.key}` : "" })), // eslint-disable-line @typescript-eslint/no-explicit-any
    storage: stat ? { used: stat.usage?.used ?? 0, total: stat.usage?.total ?? 0, files: stat.file?.total ?? 0 } : null,
  };
}

// ---------- Knowledge base (tab Memori) ----------
export interface KnowledgeItem { id: string; name: string; description: string; sources: number; updatedAt?: string }
export async function getKnowledge(): Promise<KnowledgeItem[]> {
  const r = await get("/public/knowledge");
  return (r.docs ?? []).map((k: any) => ({ id: k.id ?? k._id, name: clip(k.name, 100), description: clip(k.description, 300), sources: Array.isArray(k.sources) ? k.sources.length : (k.sourceCount ?? 0), updatedAt: k.updatedAt })); // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ---------- Statistik akun (tab Analitik) ----------
export interface AccountStat {
  id: string; type: string; name: string;
  followers: number | null;
  metricLabel: string; metricTotal: number | null;
  series: Array<{ date: string; value: number }>;
  extras: Array<{ label: string; value: number }>;
}
export interface StatsSummary { fetchedAt: number; accounts: AccountStat[]; failed: number }

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
const sum = (a: Array<{ value: number }>) => a.reduce((s, x) => s + x.value, 0);
const day = (iso: string) => String(iso).slice(0, 10);

/** Bentuk statistik berbeda per platform -> disamakan ke {pengikut, metrik utama, deret harian, ekstra} */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStat(acc: { id: string; type: string; name: string }, r: any): AccountStat {
  const base = { id: acc.id, type: acc.type, name: acc.name };
  const series = (arr: any[] | undefined, key: string) => (arr ?? []).map((m) => ({ date: day(m.date), value: num(m[key]) })); // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (acc.type) {
    case "instagram": { const s = series(r.metrics, "reach"); return { ...base, followers: num(r.followersCount), metricLabel: "Jangkauan", metricTotal: sum(s), series: s, extras: [{ label: "Interaksi", value: num(r.totalInteractions) }, { label: "Suka", value: num(r.likes) }, { label: "Komentar", value: num(r.comments) }] }; }
    case "facebook": { const s = series(r.metrics, "views"); return { ...base, followers: num(r.followersCount), metricLabel: "Views", metricTotal: num(r.summary?.views) || sum(s), series: s, extras: [{ label: "Jangkauan", value: num(r.summary?.reach) }, { label: "Engagement", value: num(r.summary?.engagement) }, { label: "Tayangan video", value: num(r.summary?.videoViews) }] }; }
    case "youtube": { const s = series(r.metrics, "views"); return { ...base, followers: num(r.subscribersCount), metricLabel: "Views", metricTotal: num(r.summary?.views) || sum(s), series: s, extras: [{ label: "Menit ditonton", value: num(r.summary?.estimatedMinutesWatched) }, { label: "Suka", value: num(r.summary?.likes) }, { label: "Komentar", value: num(r.summary?.comments) }] }; }
    case "tiktok": { const s = series(r.metrics, "videoViews"); return { ...base, followers: num(r.followersCount), metricLabel: "Views video", metricTotal: sum(s), series: s, extras: [{ label: "Total suka", value: num(r.totalLikes) }, { label: "Video", value: num(r.videosCount) }] }; }
    case "threads": { const s = (r.views?.graphs ?? []).map((g: any) => ({ date: day(g.date), value: num(g.value) })); return { ...base, followers: num(r.followersCount), metricLabel: "Views", metricTotal: num(r.views?.total) || sum(s), series: s, extras: [{ label: "Suka", value: num(r.likes) }, { label: "Balasan", value: num(r.replies) }] }; } // eslint-disable-line @typescript-eslint/no-explicit-any
    default: return { ...base, followers: r.followersCount ?? r.subscribersCount ?? null, metricLabel: "—", metricTotal: null, series: [], extras: [] };
  }
}

let statsCache: { at: number; data: StatsSummary } | null = null;
const STATS_TTL = 10 * 60_000; // statistik berubah lambat & mahal (1 panggilan per akun)

export async function getStats(force = false): Promise<StatsSummary> {
  if (!force && statsCache && Date.now() - statsCache.at < STATS_TTL) return statsCache.data;
  const accs = await get("/public/account", { page: 1, limit: 100 });
  const connected = (accs.docs ?? []).filter((a: any) => a.isConnected).slice(0, 30); // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: AccountStat[] = [];
  let failed = 0;
  for (let i = 0; i < connected.length; i += 4) { // maks. 4 paralel agar tidak membebani API
    const batch = connected.slice(i, i + 4);
    const res = await Promise.allSettled(batch.map((a: any) => get(`/public/account/${a.id}/statistic`))); // eslint-disable-line @typescript-eslint/no-explicit-any
    res.forEach((r, k) => {
      const a = batch[k];
      if (r.status === "fulfilled") out.push(normalizeStat({ id: a.id, type: a.type, name: clip(a.name, 60) }, r.value));
      else failed++;
    });
  }
  const data = { fetchedAt: Date.now(), accounts: out, failed };
  statsCache = { at: Date.now(), data };
  return data;
}
