import type { AgentStatus } from "./types";
import type { SocialSummary, StatsSummary } from "./repliz";

/** Agen yang statusnya diturunkan dari kondisi nyata Repliz */
export const REPLIZ_AGENTS = ["manager", "scheduler", "community", "analyst", "crm", "designer", "market", "email"] as const;
/** Posting gagal dalam rentang ini dianggap "belum ditangani" -> Scheduler berstatus Error */
export const ERROR_WINDOW_MS = 72 * 3600_000;
/** Posting yang tayang dalam rentang ini dianggap sedang disiapkan -> Scheduler berstatus Working */
export const SOON_MS = 30 * 60_000;

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const k = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n));

type State = { status: AgentStatus; task: string };

/**
 * Representasi alur kerja: Repliz bukan "agen", jadi kondisinya dipetakan ke peran (semua data nyata):
 *  - Scheduler: Error bila ada posting gagal dalam 72 jam; Working bila sedang diproses / tayang <30 menit; selain itu Idle.
 *  - Community Manager: Working selama ada komentar menunggu balasan.
 *  - Analyst: ringkasan statistik akun (Idle); Error bila statistik gagal dimuat.
 *  - Social Manager: memantau seluruh alur; Working bila ada antrean/komentar; Error bila sinkron Repliz gagal.
 *  - CRM & Leads (Vega): Working bila ada kontak jatuh tempo tindak lanjut; selain itu ringkasan funnel kontak.
 *  - Desain & Video (Lumi): Working bila ada aset baru <30 menit di storage; selain itu ringkasan aset.
 *  - Marketplace (Bintang) & Email/WhatsApp (Komet): hanya melaporkan kenyataan jumlah akun terhubung; belum ada data kerja.
 * Scraper & Creator belum punya sumber data nyata -> tidak diturunkan di sini.
 */
export function deriveAgentStates(s: SocialSummary, stats: StatsSummary | null, statsError: string | null, now = Date.now()): Record<string, State> {
  const recentFail = s.failed.filter((f) => now - +new Date(f.scheduleAt) < ERROR_WINDOW_MS);
  const next = s.upcoming[0];
  const soon = next && +new Date(next.scheduleAt) - now < SOON_MS;
  const disconnected = s.accounts.filter((a) => !a.isConnected).length;

  const scheduler: State =
    recentFail.length > 0
      ? { status: "error", task: `${recentFail.length}+ posting gagal perlu dijadwalkan ulang${disconnected ? ` · ${disconnected} akun terputus` : ""}` }
      : s.schedule.process > 0 || soon
        ? { status: "working", task: s.schedule.process > 0 ? `Memublikasikan ${s.schedule.process} posting` : `Posting berikutnya ${hhmm(next.scheduleAt)} (${next.account})` }
        : { status: "idle", task: next ? `Antrean ${s.schedule.pending} posting · berikutnya ${hhmm(next.scheduleAt)}` : "Antrean posting kosong" };

  const community: State =
    s.comments.total > 0
      ? { status: "working", task: `Menangani ${s.comments.total} komentar menunggu balasan` }
      : { status: "idle", task: "Tidak ada komentar menunggu" };

  const followers = stats?.accounts.reduce((a, x) => a + (x.followers ?? 0), 0) ?? 0;
  const analyst: State = statsError
    ? { status: "error", task: "Gagal memuat statistik akun dari Repliz" }
    : stats
      ? { status: "idle", task: `${stats.accounts.length} akun dipantau · ${k(followers)} pengikut/subscriber` }
      : { status: "idle", task: "Memuat statistik akun…" };

  const busy = s.schedule.pending > 0 || s.comments.total > 0 || s.failed.length > 0;
  const manager: State = {
    status: busy ? "working" : "idle",
    task: `Memantau alur: ${s.schedule.pending} terjadwal · ${s.schedule.error} gagal · ${s.comments.total} komentar menunggu`,
  };

  const c = s.crm;
  const crm: State = !c
    ? { status: "idle", task: "Data kontak belum tersedia" }
    : c.due > 0
      ? { status: "working", task: `Menindaklanjuti ${c.due} kontak jatuh tempo` }
      : { status: "idle", task: `${c.all} kontak · ${c.new} baru · ${c.won} berhasil` };

  const a = s.assets;
  const fresh = a?.latestAt && now - +new Date(a.latestAt) < 30 * 60_000;
  const mb = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(1) + " GB" : Math.round(n / 1e6) + " MB");
  const designer: State = !a
    ? { status: "idle", task: "Data aset belum tersedia" }
    : fresh
      ? { status: "working", task: `Aset baru: ${a.latestName ?? "file"}` }
      : { status: "idle", task: `${a.total.toLocaleString("id-ID")} aset · ${mb(a.usedBytes)} terpakai` };

  const shopee = s.channels?.shopee ?? 0;
  const market: State = { status: "idle", task: shopee > 0 ? `${shopee} akun Shopee ada di Repliz, data penjualan belum diintegrasikan` : "Belum ada akun Shopee terhubung di Repliz" };
  const chat = (s.channels?.whatsapp ?? 0) + (s.channels?.telegram ?? 0);
  const email: State = { status: "idle", task: chat > 0 ? `${chat} akun WhatsApp/Telegram ada di Repliz, data kampanye belum diintegrasikan` : "Belum ada akun WhatsApp/Telegram terhubung di Repliz" };

  return { manager, scheduler, community, analyst, crm, designer, market, email };
}
