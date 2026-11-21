"use client";
import { useCallback, useEffect, useState } from "react";
import type { FileItem, FilePage } from "@/lib/repliz";
import { card, relTime } from "./ui";

const size = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : n >= 1e3 ? Math.round(n / 1e3) + " KB" : n + " B");
const kind = (m: string) => (m.startsWith("image/") ? "image" : m.startsWith("video/") ? "video" : "other");
const icon = (m: string) => (kind(m) === "image" ? "🖼️" : kind(m) === "video" ? "🎬" : "📄");

function Thumb({ f }: { f: FileItem }) {
  const [bad, setBad] = useState(false);
  if (kind(f.mimetype) === "image" && f.url && !bad)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={f.url} alt={f.filename} loading="lazy" onError={() => setBad(true)} className="h-full w-full object-cover" />;
  if (kind(f.mimetype) === "video" && f.url && !bad)
    return <video src={f.url + "#t=0.5"} preload="metadata" muted onError={() => setBad(true)} className="h-full w-full object-cover" />;
  return <span className="text-3xl">{icon(f.mimetype)}</span>;
}

export default function FilesView() {
  const [data, setData] = useState<FilePage | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "image" | "video">("all");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/repliz/files?page=${page}&limit=40${search ? `&search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok) { setData(j); setErr(null); } else setErr(j.message ?? "Gagal memuat file.");
    } catch { setErr("Tidak dapat menghubungi server."); }
    setLoading(false);
  }, [page, search]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setTimeout(() => { setSearch(q.trim()); setPage(1); }, 400); return () => clearTimeout(id); }, [q]);

  if (err && !data) return <div className="p-4"><div className={`${card} max-w-xl space-y-2 p-5`}><h2 className="text-sm font-semibold">File Repliz belum tersedia</h2><p className="text-sm text-slate-600 dark:text-slate-300">{err}</p><button onClick={load} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Coba lagi</button></div></div>;

  const items = (data?.items ?? []).filter((f) => type === "all" || kind(f.mimetype) === type);
  const st = data?.storage;
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama file…" aria-label="Cari file" className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-800" />
        {(["all", "image", "video"] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={`rounded-full px-3 py-1 text-xs font-medium ${type === t ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{t === "all" ? "Semua" : t === "image" ? "🖼️ Gambar" : "🎬 Video"}</button>
        ))}
        <p className="ml-auto text-xs text-slate-500">Sumber: Repliz storage · {data ? `${data.total.toLocaleString("id-ID")} file` : "…"}{st ? ` · ${size(st.used)} / ${size(st.total)}` : ""}</p>
      </div>
      {st && <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" aria-label="Pemakaian penyimpanan"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (st.used / Math.max(st.total, 1)) * 100)}%` }} /></div>}

      <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-auto sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" aria-label="Daftar file">
        {items.map((f) => (
          <li key={f.id} className={`${card} overflow-hidden`}>
            <a href={f.url} target="_blank" rel="noreferrer noopener" className="block">
              <div className="flex aspect-square items-center justify-center bg-slate-100 dark:bg-slate-800"><Thumb f={f} /></div>
              <div className="p-2"><p className="truncate text-xs font-medium" title={f.filename}>{f.filename}</p><p className="text-[10px] text-slate-500">{size(f.size)} · {relTime(+new Date(f.createdAt))}</p></div>
            </a>
          </li>
        ))}
        {items.length === 0 && <li className="col-span-full text-sm text-slate-500">{loading ? "Memuat…" : "Tidak ada file yang cocok."}</li>}
      </ul>

      <div className="flex items-center justify-center gap-3 text-sm">
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-slate-100 px-3 py-1.5 disabled:opacity-40 dark:bg-slate-800">← Sebelumnya</button>
        <span className="text-xs text-slate-500">Halaman {page} / {data?.totalPages ?? 1}</span>
        <button disabled={!data || page >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-slate-100 px-3 py-1.5 disabled:opacity-40 dark:bg-slate-800">Berikutnya →</button>
      </div>
    </div>
  );
}
