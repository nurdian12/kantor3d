"use client";
import { useCallback, useEffect, useState } from "react";
import type { SocialSummary } from "@/lib/repliz";
import { card } from "./ui";

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

export default function SocialView() {
  const [data, setData] = useState<SocialSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/repliz${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.message ?? "Gagal memuat data Repliz."); setData(null); } else { setData(j); setErr(null); }
    } catch { setErr("Tidak dapat menghubungi server."); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); const id = setInterval(() => load(), 60_000); return () => clearInterval(id); }, [load]);

  if (err) return (
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
