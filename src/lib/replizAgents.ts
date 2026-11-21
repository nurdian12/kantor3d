import type { AgentStatus } from "./types";
import type { SocialSummary } from "./repliz";

/** Agen yang statusnya diturunkan dari kondisi nyata Repliz */
export const REPLIZ_AGENTS = ["scheduler", "community"] as const;
/** Posting gagal dalam rentang ini dianggap "belum ditangani" -> Scheduler berstatus Error */
export const ERROR_WINDOW_MS = 72 * 3600_000;
/** Posting yang tayang dalam rentang ini dianggap sedang disiapkan -> Scheduler berstatus Working */
export const SOON_MS = 30 * 60_000;

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/**
 * Representasi alur kerja: Repliz bukan "agen", jadi kondisinya dipetakan ke peran:
 *  - Scheduler (publisher): Error bila ada posting gagal baru; Working bila sedang diproses / segera tayang; selain itu Idle.
 *  - Community Manager: Working selama ada komentar menunggu balasan; selain itu Idle.
 */
export function deriveAgentStates(s: SocialSummary, now = Date.now()): Record<string, { status: AgentStatus; task: string }> {
  const recentFail = s.failed.filter((f) => now - +new Date(f.scheduleAt) < ERROR_WINDOW_MS);
  const next = s.upcoming[0];
  const soon = next && +new Date(next.scheduleAt) - now < SOON_MS;
  const disconnected = s.accounts.filter((a) => !a.isConnected).length;

  const scheduler =
    recentFail.length > 0
      ? { status: "error" as const, task: `${recentFail.length}+ posting gagal perlu dijadwalkan ulang${disconnected ? ` · ${disconnected} akun terputus` : ""}` }
      : s.schedule.process > 0 || soon
        ? { status: "working" as const, task: s.schedule.process > 0 ? `Memublikasikan ${s.schedule.process} posting` : `Posting berikutnya ${hhmm(next.scheduleAt)} (${next.account})` }
        : { status: "idle" as const, task: next ? `Antrean ${s.schedule.pending} posting · berikutnya ${hhmm(next.scheduleAt)}` : "Antrean posting kosong" };

  const community =
    s.comments.total > 0
      ? { status: "working" as const, task: `Menangani ${s.comments.total} komentar menunggu balasan` }
      : { status: "idle" as const, task: "Tidak ada komentar menunggu" };

  return { scheduler, community };
}
