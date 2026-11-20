"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) { window.location.href = "/"; return; }
    setErr((await r.json().catch(() => ({}))).error ?? "Gagal masuk.");
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-lg font-bold">🛰️ Mission Control</h1>
        <p className="text-sm text-slate-400">Masukkan password dashboard untuk melanjutkan.</p>
        <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <button disabled={busy || !pw} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Memeriksa…" : "Masuk"}</button>
      </form>
    </main>
  );
}
