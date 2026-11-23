"use client";
import { useEffect } from "react";
import { useMissionStore } from "@/store/useMissionStore";
import { useWorkStore } from "@/store/useWorkStore";
import { AGENT_META } from "./agentsMeta";

const ORCH = "manager"; // Nova
const TICK_MS = 5_000;
const COOLDOWN_MS = 6 * 60_000;      // jangan mengulang instruksi yang sama dalam 6 menit
const VISIT_MS = 14_000;             // lama Nova berdiri di meja agen yang ditangani

/**
 * Orkestrator (Nova): memantau agen lain dan data jadwal, lalu mengkoordinasi:
 *  - agen Error  -> instruksi pemulihan + tugas Kanban + Nova mendatangi mejanya
 *  - posting gagal -> Orbit diminta menjadwalkan ulang (jeda lebih panjang)
 *  - komentar menunggu -> Sapa diminta membalas; kontak jatuh tempo -> Vega menindaklanjuti
 *  - agen pulih -> dicatat
 * Catatan: koordinasi ini hanya internal (log, tugas, gerak karakter). Tidak ada tulis ke Repliz.
 */
export function useOrchestrator() {
  useEffect(() => {
    const last = new Map<string, number>();
    const prev = new Map<string, string>();
    const due = (key: string, cd = COOLDOWN_MS) => {
      const now = Date.now(), t = last.get(key) ?? 0;
      if (now - t < cd) return false;
      last.set(key, now); return true;
    };
    const AGEN = (id: string) => AGENT_META.find((m) => m.id === id)?.name ?? id;
    const name = AGEN;

    const dispatch = (to: string, key: string, title: string, note: string, prio: "high" | "medium" | "low", log: string, visit = false) => {
      const m = useMissionStore.getState(), w = useWorkStore.getState();
      const exists = w.tasks.some((t) => t.title === title && t.status !== "done");
      if (!exists) w.addTask({ title, agentId: to, priority: prio, status: "in_progress", note, source: "orkestrator" });
      m.addLog(ORCH, "info", log);
      const nova = m.agents.find((a) => a.id === ORCH);
      if (visit && nova && nova.status !== "idle" && to !== ORCH) m.setVisiting({ agentId: to, until: Date.now() + VISIT_MS });
    };

    const tick = () => {
      const m = useMissionStore.getState(), w = useWorkStore.getState(), now = Date.now();
      if (m.visiting && now > m.visiting.until) m.setVisiting(null);

      // 1) agen Error / pulih
      for (const a of m.agents) {
        if (a.id === ORCH) continue;
        const before = prev.get(a.id); prev.set(a.id, a.status);
        if (a.status === "error" && due("err:" + a.id)) {
          dispatch(a.id, "err", `Pulihkan: ${a.task}`.slice(0, 90), `Ditugaskan oleh ${name(ORCH)} · ${AGEN(a.id)} berstatus Error`, "high",
            `${name(ORCH)} → ${AGEN(a.id)}: error terdeteksi ("${a.task.slice(0, 80)}"). Menugaskan pemulihan dan memeriksa langsung.`, true);
        } else if (before === "error" && a.status !== "error") {
          m.addLog(ORCH, "info", `${name(ORCH)}: ${AGEN(a.id)} sudah pulih dan kembali ke alur kerja.`);
        }
      }

      const s = w.social;
      if (!s) return;
      // 2) posting gagal -> jadwal ulang
      if (s.failed.length > 0 && due("resched"))
        dispatch("scheduler", "resched", `Jadwalkan ulang ${s.failed.length}+ posting gagal`, "Beri jeda ≥2 jam antar posting; periksa akun yang terputus", "high",
          `${name(ORCH)} → ${AGEN("scheduler")}: ${s.failed.length}+ posting gagal perlu dijadwalkan ulang dengan jeda lebih panjang.`, true);
      // 3) komentar menunggu -> Sapa
      if (s.comments.total > 0 && due("comments"))
        dispatch("community", "comments", `Balas ${s.comments.total} komentar menunggu`, "Prioritaskan komentar terbaru; eskalasi yang sensitif ke Nova", "medium",
          `${name(ORCH)} → ${AGEN("community")}: ${s.comments.total} komentar menunggu balasan.`);
      // 4) kontak jatuh tempo -> Vega
      if (s.crm && s.crm.due > 0 && due("crm"))
        dispatch("crm", "crm", `Tindak lanjuti ${s.crm.due} kontak jatuh tempo`, "Dari funnel CRM", "medium",
          `${name(ORCH)} → ${AGEN("crm")}: ${s.crm.due} kontak jatuh tempo tindak lanjut.`);
      // 5) antrean kosong -> perlu penjadwalan konten baru
      if (s.upcoming.length === 0 && due("queue", 30 * 60_000))
        dispatch("scheduler", "queue", "Isi antrean posting: tidak ada jadwal mendatang", "Antrean kosong", "medium",
          `${name(ORCH)} → ${AGEN("scheduler")}: antrean posting kosong, perlu penjadwalan konten baru.`);
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);
}
