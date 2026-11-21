"use client";
import type { SocialSummary } from "@/lib/repliz";
import { agentMeta } from "@/lib/agentsMeta";
import { useMissionStore } from "@/store/useMissionStore";
import { useWorkStore } from "@/store/useWorkStore";
import { card, fmtTokens } from "./ui";

const PLATFORM: Record<string, { icon: string; name: string }> = {
  instagram: { icon: "📸", name: "Instagram" }, youtube: { icon: "▶️", name: "YouTube" }, facebook: { icon: "👍", name: "Facebook" },
  tiktok: { icon: "🎵", name: "TikTok" }, threads: { icon: "🧵", name: "Threads" }, linkedin: { icon: "💼", name: "LinkedIn" },
  twitter: { icon: "🐦", name: "X / Twitter" }, whatsapp: { icon: "💬", name: "WhatsApp" }, telegram: { icon: "✈️", name: "Telegram" },
  pinterest: { icon: "📌", name: "Pinterest" }, shopee: { icon: "🛍️", name: "Shopee" },
};
const plat = (t: string) => PLATFORM[t] ?? { icon: "🌐", name: t || "—" };
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Stat({ title, value, sub, tone }: { title: string; value: number | string; sub?: string; tone?: "bad" }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === "bad" && Number(value) > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-50"}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

const STAGE_DOT = { working: "bg-emerald-500", idle: "bg-sky-500", error: "bg-red-500 animate-pulse" } as const;

/** Alur kerja kantor: tiap tahap dipegang satu agen; angka Repliz bila tahap terkait Repliz, selain itu dari Kanban lokal */
function WorkflowStrip({ data }: { data: SocialSummary }) {
  const agents = useMissionStore((s) => s.agents);
  const stats = useWorkStore((s) => s.stats);
  const followers = stats?.accounts.reduce((a, x) => a + (x.followers ?? 0), 0) ?? 0;
  type Src = "Repliz" | "Belum terhubung";
  const stages: Array<{ agentId: string; stage: string; metric: string; src: Src }> = [
    { agentId: "scraper", stage: "Riset", metric: "research Repliz butuh upgrade plan", src: "Belum terhubung" },
    { agentId: "creator", stage: "Konten", metric: "template/content Repliz butuh upgrade plan", src: "Belum terhubung" },
    { agentId: "scheduler", stage: "Jadwal", metric: `${data.schedule.pending} dalam antrean`, src: "Repliz" },
    { agentId: "scheduler", stage: "Publikasi", metric: `${data.schedule.success} tayang · ${data.schedule.error} gagal`, src: "Repliz" },
    { agentId: "community", stage: "Interaksi", metric: `${data.comments.total} komentar menunggu`, src: "Repliz" },
    { agentId: "analyst", stage: "Analitik", metric: stats ? `${stats.accounts.length} akun · ${fmtTokens(followers)} pengikut` : "memuat statistik…", src: "Repliz" },
  ];
  return (
    <section className={`${card} p-4`} aria-label="Alur kerja">
      <h2 className="mb-3 text-sm font-semibold">Alur kerja kantor</h2>
      <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stages.map((st, i) => {
          const ag = agents.find((a) => a.id === st.agentId);
          const off = st.src === "Belum terhubung";
          return (
            <li key={st.stage} className={`relative rounded-xl border p-3 text-xs ${off ? "border-dashed border-slate-300 opacity-70 dark:border-slate-600" : "border-slate-200 dark:border-slate-700"}`}>
              <p className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500"><span>{i + 1}. {st.stage}</span><span className={off ? "" : "text-indigo-500"}>{st.src}</span></p>
              <p className="mt-1 flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                {ag && !off && <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_DOT[ag.status]}`} title={ag.status} />}<span className="truncate">{agentMeta(st.agentId).name}</span>
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">{st.metric}</p>
              {i < stages.length - 1 && <span aria-hidden className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-400 xl:block">→</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function SocialView() {
  const data = useWorkStore((s) => s.social);
  const err = useWorkStore((s) => s.socialError);
  const loading = useWorkStore((s) => s.socialLoading);
  const fetchSocial = useWorkStore((s) => s.fetchSocial);
  const load = (force = false) => fetchSocial(force);

  if (err && !data) return (
    <div className="p-4"><div className={`${card} max-w-xl space-y-2 p-5`}>
      <h2 className="text-sm font-semibold">Repliz belum terhubung</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{err}</p>
      <button onClick={() => load(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Coba lagi</button>
    </div></div>
  );
  if (!data) return <p className="p-6 text-sm text-slate-500">{loading ? "Memuat data Repliz…" : ""}</p>;

  const connected = data.accounts.filter((a) => a.isConnected).length;
  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Sumber: Repliz (baca-saja) · plan {data.plan?.name ?? "—"} · diperbarui {new Date(data.fetchedAt).toLocaleTimeString("id-ID")}</p>
        <button onClick={() => load(true)} disabled={loading} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:bg-slate-800">{loading ? "Memuat…" : "↻ Segarkan"}</button>
      </div>

      <WorkflowStrip data={data} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat title="Akun terhubung" value={`${connected}/${data.accounts.length}`} sub={`${data.accountTotal} akun terdaftar`} />
        <Stat title="Terjadwal" value={data.schedule.pending} sub="menunggu waktu tayang" />
        <Stat title="Diproses" value={data.schedule.process} />
        <Stat title="Berhasil" value={data.schedule.success} />
        <Stat title="Gagal" value={data.schedule.error} sub={`${data.comments.total} komentar menunggu`} tone="bad" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Posting berikutnya</h2>
          <ul className="space-y-1.5">
            {data.upcoming.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                <span title={plat(s.platform).name}>{plat(s.platform).icon}</span>
                <span className="min-w-0 flex-1 truncate">{s.title || "(tanpa judul)"}<span className="text-slate-500"> · {s.account}</span></span>
                <span className="shrink-0 font-mono text-slate-500">{when(s.scheduleAt)}</span>
              </li>
            ))}
            {data.upcoming.length === 0 && <li className="text-xs text-slate-500">Tidak ada posting terjadwal.</li>}
          </ul>
        </section>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Posting gagal terbaru ({data.schedule.error})</h2>
          <ul className="space-y-1.5">
            {data.failed.map((s) => (
              <li key={s.id} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs">
                <p className="flex items-center gap-2"><span>{plat(s.platform).icon}</span><span className="min-w-0 flex-1 truncate font-medium">{s.title || "(tanpa judul)"}</span><span className="shrink-0 font-mono text-slate-500">{when(s.scheduleAt)}</span></p>
                {s.errorMessage && <p className="mt-1 text-red-700 dark:text-red-300">⚠ {s.errorMessage}</p>}
              </li>
            ))}
            {data.failed.length === 0 && <li className="text-xs text-slate-500">Tidak ada kegagalan 🎉</li>}
          </ul>
        </section>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Komentar menunggu balasan ({data.comments.total})</h2>
          <ul className="space-y-1.5">
            {data.comments.items.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                <p className="text-slate-700 dark:text-slate-200">{c.text || "(tanpa teks)"}</p>
                <p className="mt-1 text-[11px] text-slate-500">{plat(c.platform).icon} {c.account} · di “{c.contentTitle}” · {when(c.createdAt)}</p>
              </li>
            ))}
            {data.comments.items.length === 0 && <li className="text-xs text-slate-500">Tidak ada komentar yang menunggu.</li>}
          </ul>
        </section>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Akun ({data.accounts.length})</h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {data.accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                <span>{plat(a.type).icon}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{a.name}</span><span className="block truncate text-slate-500">{plat(a.type).name}{a.username ? ` · ${a.username}` : ""}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.isConnected ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>{a.isConnected ? "Terhubung" : "Terputus"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
