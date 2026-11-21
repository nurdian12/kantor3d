"use client";
import { useEffect } from "react";
import { useMissionStore } from "@/store/useMissionStore";
import { useWorkStore } from "@/store/useWorkStore";
import { deriveAgentStates } from "./replizAgents";

/**
 * Sinkron Repliz -> aplikasi (semua data nyata):
 *  - ringkasan (jadwal/komentar/akun) tiap 60 dtk, statistik akun tiap 10 mnt (server juga meng-cache)
 *  - kondisi dipetakan ke status agen (replizAgents.ts) — dilewati saat WebSocket `live` (server = sumber kebenaran)
 *  - peristiwa penting ditulis ke Log sistem
 */
export function useReplizSync() {
  useEffect(() => {
    const work = useWorkStore.getState();
    work.fetchSocial();
    work.fetchStats();
    const t1 = setInterval(() => useWorkStore.getState().fetchSocial(), 60_000);
    const t2 = setInterval(() => useWorkStore.getState().fetchStats(), 10 * 60_000);

    const apply = () => {
      const w = useWorkStore.getState(), m = useMissionStore.getState();
      if (m.connection === "live") return;
      const derived = w.social
        ? deriveAgentStates(w.social, w.stats, w.statsError)
        : w.socialError ? { manager: { status: "error" as const, task: `Sinkron jadwal gagal: ${w.socialError}` } } : {};
      for (const [agentId, d] of Object.entries(derived)) {
        const cur = m.agents.find((a) => a.id === agentId);
        if (!cur || (cur.status === d.status && cur.task === d.task)) continue;
        const changed = cur.status !== d.status;
        m.applyStatus(agentId, d.status, d.task);
        if (changed) m.addLog(agentId, d.status === "error" ? "error" : d.status === "idle" ? "warn" : "info", d.task);
      }
    };

    let lastDisc = -1;
    const unsub = useWorkStore.subscribe((s, prev) => {
      const log = useWorkStore.getState().pushSys;
      if (s.social && s.social !== prev.social) {
        const sc = s.social;
        log("info", "jadwal", `sinkron: ${sc.schedule.pending} terjadwal · ${sc.schedule.error} gagal · ${sc.comments.total} komentar menunggu`);
        const disc = sc.accounts.filter((a) => !a.isConnected).length;
        if (disc !== lastDisc && disc > 0) log("warn", "jadwal", `${disc} akun terputus — perlu dihubungkan ulang di layanan jadwal`);
        lastDisc = disc;
      }
      if (s.socialError && s.socialError !== prev.socialError) log("error", "jadwal", s.socialError);
      if (s.stats && s.stats !== prev.stats) log("info", "jadwal", `statistik dimuat: ${s.stats.accounts.length} akun${s.stats.failed ? `, ${s.stats.failed} gagal` : ""}`);
      if (s.statsError && s.statsError !== prev.statsError) log("error", "jadwal", s.statsError);
      if (s.social !== prev.social || s.stats !== prev.stats || s.statsError !== prev.statsError || s.socialError !== prev.socialError) apply();
    });
    return () => { clearInterval(t1); clearInterval(t2); unsub(); };
  }, []);
}
