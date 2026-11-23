import type { Pose } from "./types";

/**
 * Satu lantai lebar (semua ruangan di L1). Koordinat dunia (x, z); lantai di y=0.
 * Barat → timur: [Ruang Rapat / Lobi] [Area Kerja] [Ruang Duduk / Pantry] [Billiard / Kamar Tidur]
 */
export const FLOOR_H = 4; // tinggi dinding
export const BUILDING = { minX: -16, maxX: 30, minZ: -7, maxZ: 7 };
export const B_CX = (BUILDING.minX + BUILDING.maxX) / 2, B_W = BUILDING.maxX - BUILDING.minX;
export const B_D = BUILDING.maxZ - BUILDING.minZ;

export type ZoneId = "work" | "meet" | "lobby" | "lounge" | "pantry" | "pool" | "bed";
export type Focus = "all" | ZoneId;
export interface Zone { id: ZoneId; name: string; short: string; x0: number; x1: number; z0: number; z1: number; accent: string; tint: string }
export const ZONES: Zone[] = [
  { id: "work", name: "Area Kerja · 14 Divisi", short: "Kerja", x0: -10.4, x1: 10.4, z0: -7, z1: 7, accent: "#38bdf8", tint: "bg-sky-100/50 dark:bg-sky-400/10" },
  { id: "meet", name: "Ruang Rapat", short: "Rapat", x0: -16, x1: -10.4, z0: -7, z1: -0.4, accent: "#6366f1", tint: "bg-indigo-100/50 dark:bg-indigo-400/10" },
  { id: "lobby", name: "Lobi & Resepsionis", short: "Lobi", x0: -16, x1: -10.4, z0: 0, z1: 7, accent: "#06b6d4", tint: "bg-cyan-100/50 dark:bg-cyan-400/10" },
  { id: "lounge", name: "Ruang Duduk", short: "Duduk", x0: 10.8, x1: 20, z0: -7, z1: -0.4, accent: "#a855f7", tint: "bg-violet-100/50 dark:bg-violet-400/10" },
  { id: "pantry", name: "Pantry & Kafe", short: "Pantry", x0: 10.8, x1: 20, z0: 0, z1: 7, accent: "#f59e0b", tint: "bg-amber-100/50 dark:bg-amber-400/10" },
  { id: "pool", name: "Ruang Billiard", short: "Billiard", x0: 20.4, x1: 30, z0: -7, z1: -0.4, accent: "#22c55e", tint: "bg-emerald-100/50 dark:bg-emerald-400/10" },
  { id: "bed", name: "Kamar Tidur", short: "Tidur", x0: 20.4, x1: 30, z0: 0, z1: 7, accent: "#ec4899", tint: "bg-rose-100/50 dark:bg-rose-400/10" },
];
export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

type V3 = [number, number, number];
export interface Spot {
  pos: V3;
  rotY: number;
  pose: Pose;
  label: string;
  /** titik antara menuju spot (setelah jalur utama) */
  via?: V3[];
  /** bila ada: agen berkeliling melewati titik-titik ini (berhenti sebentar di tiap titik) */
  wander?: V3[];
}

/** 15 workstation: 3 baris x 5 meja, jarak lapang (lorong di antara baris), menghadap -z. Indeks = baris*5 + kolom. */
export const DESK_COLS = [-6, -2.6, 0.8, 4.2, 7.6];
export const DESK_ROWS = [-3.8, 0.4, 4.6]; // z orang yang duduk; meja digeser 1.1 ke belakang
export const DESK_ROW_NAMES = ["Kontrol & Iklan", "Riset & Kreatif", "Hubungan Pelanggan"];
export const DESKS: Spot[] = DESK_ROWS.flatMap((z, r) =>
  DESK_COLS.map((x, c): Spot => ({ pos: [x, 0, z], rotY: Math.PI, pose: "sit", label: `${DESK_ROW_NAMES[r]} · meja ${c + 1}` })),
);

/** Lorong utama (z) yang dilalui agen antar-zona */
export const LANE_Z = -1.85;

const at = (x: number, z: number): V3 => [x, 0, z];
const sit = (x: number, z: number, rotY: number, label: string, via?: V3[]): Spot => ({ pos: at(x, z), rotY, pose: "sit", label, via });
const lie = (x: number, z: number, label: string): Spot => ({ pos: at(x, z), rotY: 0, pose: "lie", label, via: [at(x + 1.35, 2.0), at(x + 1.35, z)] });
const stand = (x: number, z: number, rotY: number, label: string): Spot => ({ pos: at(x, z), rotY, pose: "stand", label });
const walk = (label: string, pts: Array<[number, number]>): Spot => ({ pos: at(...pts[0]), rotY: 0, pose: "stand", label, wander: pts.map(([x, z]) => at(x, z)) });

/**
 * 14 spot istirahat dengan perilaku berbeda: tidur, duduk (ruang duduk/pantry/rapat/lobi), main billiard, dan berkeliling.
 */
export const BED_X = [22.4, 25.2, 28.0];
export const BED_Z = 3.6;
export const POOL = { x: 25.2, z: -3.7 };
export const IDLE_SPOTS: Spot[] = [
  lie(BED_X[0], BED_Z + 0.7, "Tidur"),                                   // 0
  lie(BED_X[1], BED_Z + 0.7, "Tidur"),                                   // 1
  sit(14.45, -3.0, Math.PI, "Ruang Duduk"),                              // 2
  sit(16.35, -3.0, Math.PI, "Ruang Duduk"),                              // 3
  stand(POOL.x, -2.0, Math.PI, "Billiard"),                              // 4
  stand(POOL.x + 2.4, POOL.z, -Math.PI / 2, "Billiard"),                 // 5
  walk("Berkeliling", [[-8, LANE_Z], [8.5, LANE_Z], [12.5, LANE_Z], [16, -1.0], [16.5, 2.2], [8.5, 2.2], [-8, 2.2]]), // 6
  walk("Berkeliling", [[-13, 2.8], [-9, 1.9], [-8, LANE_Z], [-9.5, -1.4], [-12.5, -1.2], [-9.5, -1.4]]),             // 7
  sit(13.6, 3.4, 0, "Pantry"),                                           // 8
  sit(-14.3, -2.2, Math.PI, "Ruang Rapat"),                              // 9
  sit(-13.5, 1.4, 0, "Lobi", [at(-9.5, 1.4)]),                           // 10
  walk("Berkeliling", [[12.5, 3.0], [18.5, 2.4], [21.5, 1.2], [24, -1.0], [19.5, -1.2], [14, -1.5]]),                // 11
  stand(POOL.x - 2.4, POOL.z, Math.PI / 2, "Billiard"),                  // 12
  walk("Berkeliling", [[-8, 6.2], [8, 6.2], [14, 6.4], [22, 6.2], [14, 6.4], [8, 6.2]]),                             // 13
];
export const CAPACITY = IDLE_SPOTS.length;

/** Jalur dari posisi sekarang ke spot: turun ke lorong, geser sejajar x, lalu naik ke tujuan (lewat titik `via` bila ada) */
export function routeTo(from: V3, to: Spot): V3[] {
  const pts: V3[] = [];
  const push = (p: V3) => { const l = pts[pts.length - 1]; if (!l || Math.hypot(l[0] - p[0], l[2] - p[2]) > 0.05) pts.push(p); };
  const via = to.via ?? [];
  const firstX = via.length ? via[0][0] : to.pos[0];
  push(at(from[0], LANE_Z));
  push(at(firstX, LANE_Z));
  via.forEach(push);
  push(to.pos);
  return pts;
}
