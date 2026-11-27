// Notifikasi & perintah Telegram untuk Mission Control (baca-saja ke Repliz).
//   node server/notifier.mjs            -> jalankan bot (polling)
//   node server/notifier.mjs --whoami   -> cetak chat id dari pesan terakhir yang dikirim ke bot (untuk TELEGRAM_CHAT_ID)
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, REPLIZ_BASIC_USER/REPLIZ_BASIC_PASS (atau REPLIZ_TOKEN),
//      opsional: REPLIZ_API_URL, TELEGRAM_API_URL, POLL_SECONDS (120), COMMENT_ALERT_MIN (10), SUMMARY_HOUR (8, -1 = nonaktif), STATE_FILE
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const env = process.env;
const TG = (env.TELEGRAM_API_URL ?? "https://api.telegram.org").replace(/\/$/, "");
const TOKEN = env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT = String(env.TELEGRAM_CHAT_ID ?? "");
const RZ = (env.REPLIZ_API_URL ?? "https://api.repliz.com").replace(/\/$/, "");
const POLL = Math.max(30, Number(env.POLL_SECONDS ?? 120)) * 1000;
const COMMENT_MIN = Number(env.COMMENT_ALERT_MIN ?? 10);
const SUMMARY_HOUR = Number(env.SUMMARY_HOUR ?? 8);
const STATE_FILE = env.STATE_FILE ?? new URL("../.notifier-state.json", import.meta.url).pathname;
const HOUR = 3_600_000;

if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN belum diisi."); process.exit(1); }
const log = (...a) => console.log(new Date().toISOString(), ...a); // token tidak pernah dicetak

// ---------- Telegram ----------
async function tg(method, body, timeoutMs = 15_000) {
  const r = await fetch(`${TG}/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(timeoutMs) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(`Telegram ${method}: ${j.description ?? r.status}`);
  return j.result;
}
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s, n = 90) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
async function send(text) {
  if (!CHAT) return log("TELEGRAM_CHAT_ID kosong, pesan tidak dikirim");
  try { await tg("sendMessage", { chat_id: CHAT, text: text.slice(0, 3900), parse_mode: "HTML", disable_web_page_preview: true }); }
  catch (e) { log("gagal kirim:", e.message); }
}

if (process.argv.includes("--whoami")) {
  let ups;
  try { ups = await tg("getUpdates", { limit: 20 }); }
  catch (e) { console.error("Gagal: " + e.message + "\nPeriksa TELEGRAM_BOT_TOKEN (salin utuh dari @BotFather)."); process.exit(1); }
  const chats = new Map(ups.map((u) => u.message ?? u.channel_post).filter(Boolean).map((m) => [m.chat.id, `${m.chat.type} ${m.chat.title ?? m.chat.first_name ?? ""}`.trim()]));
  if (!chats.size) console.log("Belum ada pesan. Kirim pesan apa saja ke bot Anda di Telegram, lalu jalankan ulang.");
  for (const [id, label] of chats) console.log(`TELEGRAM_CHAT_ID=${id}   (${label})`);
  process.exit(0);
}

// ---------- Repliz (hanya GET) ----------
function auth() {
  if (env.REPLIZ_TOKEN) return { Authorization: `Bearer ${env.REPLIZ_TOKEN}` };
  if (env.REPLIZ_BASIC_USER && env.REPLIZ_BASIC_PASS) return { Authorization: "Basic " + Buffer.from(`${env.REPLIZ_BASIC_USER}:${env.REPLIZ_BASIC_PASS}`).toString("base64") };
  return {};
}
async function rz(path, params = {}) {
  const u = new URL(RZ + path); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const r = await fetch(u, { headers: { Accept: "application/json", ...auth() }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Repliz ${path} -> HTTP ${r.status}`);
  return r.json();
}
async function snapshot() {
  const now = Date.now();
  const [accounts, pending, failed, comments, upcoming, crm] = await Promise.all([
    rz("/public/account", { page: 1, limit: 100 }),
    rz("/public/schedule", { page: 1, limit: 1, status: "pending" }),
    rz("/public/schedule", { page: 1, limit: 30, status: "error", fromDate: new Date(now - 72 * HOUR).toISOString() }),
    rz("/public/comment", { page: 1, limit: 1, status: "pending" }),
    rz("/public/schedule", { page: 1, limit: 1, status: "pending", fromDate: new Date(now).toISOString() }),
    rz("/public/contact/count").catch(() => null),
  ]);
  return {
    accounts: (accounts.docs ?? []).map((a) => ({ id: a.id, name: a.name, type: a.type, ok: !!a.isConnected })),
    pending: pending.totalDocs ?? 0,
    failed: (failed.docs ?? []).map((s) => ({ id: s.id, title: s.title, platform: s.account?.type, account: s.account?.name, at: s.scheduleAt, err: s.errorMessage })),
    comments: comments.totalDocs ?? 0,
    upcoming: upcoming.totalDocs ?? 0,
    crmDue: crm?.due ?? 0,
  };
}

// ---------- state ----------
let state = { seenFailed: [], down: [], lastComment: 0, lastQueue: 0, lastSummary: "", lastUpdate: 0, started: false };
if (existsSync(STATE_FILE)) { try { state = { ...state, ...JSON.parse(readFileSync(STATE_FILE, "utf8")) }; } catch { /* mulai baru */ } }
const save = () => { try { writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) { log("gagal simpan state:", e.message); } };

const statusText = (s) =>
  `<b>Status Mission Control</b>\n` +
  `📅 Terjadwal: ${s.pending} (mendatang ${s.upcoming})\n` +
  `⚠️ Posting gagal 72 jam: ${s.failed.length}\n` +
  `💬 Komentar menunggu: ${s.comments}\n` +
  `👥 Kontak jatuh tempo: ${s.crmDue}\n` +
  `🔌 Akun terputus: ${s.accounts.filter((a) => !a.ok).length}/${s.accounts.length}`;

// ---------- aturan peringatan (dipanggil tiap siklus) ----------
async function check({ quiet = false } = {}) {
  const s = await snapshot(), now = Date.now(), out = [];
  const seen = new Set(state.seenFailed);
  const fresh = s.failed.filter((f) => !seen.has(f.id));
  if (fresh.length && !quiet) {
    out.push(`⚠️ <b>Nova:</b> ${fresh.length} posting baru gagal tayang\n` + fresh.slice(0, 5).map((f) => `• ${esc(clip(f.title))} (${esc(f.platform)} · ${esc(clip(f.account, 30))})${f.err ? `\n   ↳ ${esc(clip(f.err, 120))}` : ""}`).join("\n") +
      (fresh.length > 5 ? `\n…dan ${fresh.length - 5} lainnya` : "") + `\n➡️ Orbit diminta menjadwalkan ulang dengan jeda lebih panjang.`);
  }
  state.seenFailed = [...new Set([...s.failed.map((f) => f.id), ...state.seenFailed])].slice(0, 300);

  const down = s.accounts.filter((a) => !a.ok).map((a) => a.id), was = new Set(state.down);
  const newlyDown = s.accounts.filter((a) => !a.ok && !was.has(a.id));
  if (newlyDown.length && !quiet) out.push(`🔌 <b>Akun terputus:</b> ${newlyDown.map((a) => `${esc(a.name)} (${esc(a.type)})`).join(", ")}\nHubungkan ulang di dashboard.`);
  const recovered = [...was].filter((id) => !down.includes(id));
  if (recovered.length && !quiet) out.push(`✅ ${recovered.length} akun tersambung kembali.`);
  state.down = down;

  if (s.comments >= COMMENT_MIN && now - state.lastComment > 6 * HOUR && !quiet) { out.push(`💬 <b>${s.comments} komentar</b> menunggu balasan. Sapa ditugaskan membalas.`); state.lastComment = now; }
  if (s.upcoming === 0 && now - state.lastQueue > 12 * HOUR && !quiet) { out.push(`📭 Antrean posting kosong. Orbit perlu mengisi jadwal baru.`); state.lastQueue = now; }

  const d = new Date(), today = d.toISOString().slice(0, 10);
  if (SUMMARY_HOUR >= 0 && d.getHours() >= SUMMARY_HOUR && state.lastSummary !== today && !quiet) { out.push("🗓️ " + statusText(s)); state.lastSummary = today; }
  save();
  for (const m of out) await send(m);
  return s;
}

// ---------- perintah ----------
async function handle(msg) {
  const text = (msg.text ?? "").trim().split(/\s+/)[0].replace(/@.*$/, "").toLowerCase();
  if (String(msg.chat.id) !== CHAT) { log("pesan dari chat tak dikenal diabaikan"); return; }
  try {
    if (text === "/start" || text === "/bantuan" || text === "/help") return send("<b>Perintah</b>\n/status — ringkasan\n/gagal — posting gagal 72 jam\n/komentar — jumlah komentar menunggu\n/akun — akun terputus");
    const s = await snapshot();
    if (text === "/status") return send(statusText(s));
    if (text === "/gagal") return send(s.failed.length ? `⚠️ <b>${s.failed.length} posting gagal</b>\n` + s.failed.slice(0, 10).map((f) => `• ${esc(clip(f.title))} (${esc(f.platform)})${f.err ? ` — ${esc(clip(f.err, 80))}` : ""}`).join("\n") : "✅ Tidak ada posting gagal dalam 72 jam.");
    if (text === "/komentar") return send(`💬 ${s.comments} komentar menunggu balasan.`);
    if (text === "/akun") { const d = s.accounts.filter((a) => !a.ok); return send(d.length ? `🔌 Terputus:\n` + d.map((a) => `• ${esc(a.name)} (${esc(a.type)})`).join("\n") : "✅ Semua akun tersambung."); }
    return send("Perintah tidak dikenal. Ketik /bantuan.");
  } catch (e) { log("perintah gagal:", e.message); return send("Maaf, gagal mengambil data jadwal. Coba lagi sebentar."); }
}

async function pollCommands() {
  for (;;) {
    try {
      const ups = await tg("getUpdates", { offset: state.lastUpdate + 1, timeout: 25, allowed_updates: ["message"] }, 40_000);
      for (const u of ups) { state.lastUpdate = u.update_id; if (u.message?.text?.startsWith("/")) await handle(u.message); }
      if (ups.length) save();
    } catch (e) { log("polling:", e.message); await new Promise((r) => setTimeout(r, 10_000)); }
  }
}

// ---------- mulai ----------
log("notifier mulai");
try {
  const first = !state.started;
  const s = await check({ quiet: first });                 // run pertama: catat kondisi sekarang, jangan banjiri pesan lama
  if (first) { state.started = true; save(); await send("🤖 <b>Nova (orkestrator) aktif.</b> Saya akan mengabari kalau ada posting gagal, akun terputus, atau komentar menumpuk.\n\n" + statusText(s) + "\n\nKetik /bantuan untuk perintah."); }
} catch (e) { log("siklus awal gagal:", e.message); }
setInterval(() => check().catch((e) => log("siklus gagal:", e.message)), POLL);
pollCommands();
