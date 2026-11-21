"use client";
import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@/lib/repliz";
import { card, relTime } from "./ui";

/** Memori agen = knowledge base Repliz (baca-saja). Isi/ubah knowledge dilakukan di dashboard Repliz. */
export default function MemoryView() {
  const [items, setItems] = useState<KnowledgeItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = () => {
    setErr(null);
    fetch("/api/repliz/knowledge", { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => (ok ? setItems(j.items) : setErr(j.message ?? "Gagal memuat knowledge.")))
      .catch(() => setErr("Tidak dapat menghubungi server."));
  };
  useEffect(load, []);

  if (err) return <div className="p-4"><div className={`${card} max-w-xl space-y-2 p-5`}><h2 className="text-sm font-semibold">Knowledge Repliz belum tersedia</h2><p className="text-sm text-slate-600 dark:text-slate-300">{err}</p><button onClick={load} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Coba lagi</button></div></div>;
  if (!items) return <p className="p-6 text-sm text-slate-500">Memuat knowledge base…</p>;
  const shown = items.filter((k) => (k.name + " " + k.description).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari knowledge…" aria-label="Cari knowledge" className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800" />
        <p className="text-xs text-slate-500">Sumber: knowledge base Repliz (baca-saja) · {items.length} knowledge</p>
      </div>
      {items.length === 0 ? (
        <div className={`${card} max-w-2xl space-y-2 p-5`}>
          <h2 className="text-sm font-semibold">Knowledge base Repliz masih kosong</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Memori/konteks agen di aplikasi ini berasal dari knowledge base Repliz (FAQ, teks, URL, atau file). Tambahkan knowledge di dashboard Repliz, lalu muncul di sini setelah dimuat ulang.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((k) => (
            <li key={k.id} className={`${card} p-4`}>
              <p className="text-sm font-semibold">{k.name}</p>
              {k.description && <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{k.description}</p>}
              <p className="mt-3 text-[11px] text-slate-500">{k.sources} sumber{k.updatedAt ? ` · diperbarui ${relTime(+new Date(k.updatedAt))}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
