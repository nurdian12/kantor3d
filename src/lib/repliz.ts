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
  failed: Array<{ id: string; title: string; scheduleAt: string; platform: string; account: string; errorMessage: string }>;
  comments: { total: number; items: Array<{ id: string; text: string; platform: string; account: string; contentTitle: string; createdAt: string }> };
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
  const [me, accounts, count, pending, process, error, success, upcoming, failed, comments] = await Promise.all([
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
  ]);

  const data: SocialSummary = {
    fetchedAt: Date.now(),
    plan: me ? { name: me.plan, expiredAt: me.expiredAt } : null, // sengaja tidak menyertakan email/nama pemilik
    accounts: (accounts.docs ?? []).map((a: any) => ({ id: a.id, type: a.type, name: clip(a.name, 60), username: a.username, isConnected: !!a.isConnected })), // eslint-disable-line @typescript-eslint/no-explicit-any
    accountTotal: count?.total ?? accounts.totalDocs ?? 0,
    schedule: { pending: pending.totalDocs ?? 0, process: process.totalDocs ?? 0, error: error.totalDocs ?? 0, success: success.totalDocs ?? 0 },
    upcoming: (upcoming.docs ?? [])
      .sort((a: any, b: any) => +new Date(a.scheduleAt) - +new Date(b.scheduleAt)) // eslint-disable-line @typescript-eslint/no-explicit-any
      .slice(0, 10)
      .map((s: any) => ({ id: s.id, title: clip(s.title, 90), type: s.type, scheduleAt: s.scheduleAt, platform: s.account?.type ?? "", account: clip(s.account?.name, 40) })), // eslint-disable-line @typescript-eslint/no-explicit-any
    failed: (failed.docs ?? []).map((s: any) => ({ id: s.id, title: clip(s.title, 90), scheduleAt: s.scheduleAt, platform: s.account?.type ?? "", account: clip(s.account?.name, 40), errorMessage: clip(s.errorMessage, 200) })), // eslint-disable-line @typescript-eslint/no-explicit-any
    comments: {
      total: comments.totalDocs ?? 0,
      items: (comments.docs ?? []).map((c: any) => ({ id: c.id, text: clip(c.comment?.text, 200), platform: c.account?.type ?? "", account: clip(c.account?.name, 40), contentTitle: clip(c.content?.title, 70), createdAt: c.comment?.createdAt ?? c.createdAt })), // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  };
  cache = { at: Date.now(), data };
  return data;
}
