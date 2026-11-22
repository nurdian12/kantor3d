import type { Pose } from "./types";

/** Koordinat dunia (x, z). Lantai n berada di y = (n-1) * FLOOR_H. */
export const FLOOR_H = 5.6;
export const FLOORS = 2;
export const BUILDING = { minX: -8, maxX: 8, minZ: -4, maxZ: 4 };
/** Dek balkon rooftop yang menjorok keluar di lantai 5 */
export const BALCONY = { minX: 3.9, maxX: 8, minZ: -4, maxZ: 6 };

export const floorY = (n: number) => (n - 1) * FLOOR_H;
export const floorOfY = (y: number) => Math.min(FLOORS, Math.max(1, Math.round(y / FLOOR_H) + 1));

/** Lantai 1 = area kerja semua divisi; lantai 2 = istirahat (lounge, kamar, rooftop). */
export const FLOOR_INFO: Array<{ n: number; name: string; short: string; accent: string }> = [
  { n: 1, name: "Area Kerja · 14 Divisi", short: "Kerja", accent: "#38bdf8" },
  { n: 2, name: "Istirahat & Rooftop", short: "Santai", accent: "#ec4899" },
];
/** Tiga baris meja di lantai 1 (dari belakang ke depan) = kelompok divisi */
export const DESK_ROW_NAMES = ["Kontrol & Iklan", "Riset & Kreatif", "Hubungan Pelanggan"];

export interface Spot {
  pos: [number, number, number];
  rotY: number;
  pose: Pose;
  floor: number;
  label: string;
}

/**
 * 15 workstation di lantai 1: 3 baris x 5 meja (bangku panjang putih), menghadap -z (dinding belakang).
 * Indeks = baris * 5 + kolom. Koridor di kiri (x < -4.6) dibiarkan kosong untuk akses tangga.
 */
export const DESK_COLS = [-3.45, -1.15, 1.15, 3.45, 5.75];
export const DESK_ROWS = [-2.2, 0.4, 3.0]; // posisi z orang yang duduk; meja digeser 1.1 ke belakang
export const DESKS: Spot[] = DESK_ROWS.flatMap((z, r) =>
  DESK_COLS.map((x, c): Spot => ({ pos: [x, 0, z], rotY: Math.PI, pose: "sit", floor: 1, label: `${DESK_ROW_NAMES[r]} · meja ${c + 1}` })),
);

/**
 * 14 spot istirahat di lantai istirahat (paling atas): 3 kursi sofa lounge, 2 kasur, 9 posisi di dek rooftop.
 * Urutan diselang-seling (lounge, kamar, rooftop, ...) agar agen pertama tersebar.
 */
const Y5 = floorY(FLOORS);
const sit = (x: number): Spot => ({ pos: [x, Y5, -3.2], rotY: 0, pose: "sit", floor: FLOORS, label: "Lounge" });
const bed = (x: number): Spot => ({ pos: [x, Y5, -1.7], rotY: 0, pose: "lie", floor: FLOORS, label: "Kamar Tidur" });
const roof = (x: number, z: number): Spot => ({ pos: [x, Y5, z], rotY: 0, pose: "stand", floor: FLOORS, label: "Rooftop" });
export const IDLE_SPOTS: Spot[] = [
  sit(-4.4), bed(0.2), roof(4.6, 5.3), sit(-3.4), bed(2.6), roof(5.4, 5.3), sit(-2.4),
  roof(6.2, 5.3), roof(7.0, 5.3), roof(7.8, 5.3), roof(5.0, 4.4), roof(5.8, 4.4), roof(6.6, 4.4), roof(7.4, 4.4),
];

/** Kapasitas spot istirahat; agen ke-N memakai spot (N mod kapasitas) */
export const CAPACITY = IDLE_SPOTS.length;

// ---------------- Tangga berkelok (switchback) di sisi kiri ----------------
// Tiap lantai punya satu "bordes" di pinggir; tangga k (lantai k -> k+1) naik dari depan ke belakang
// bila k ganjil, dan dari belakang ke depan bila k genap, sehingga titik tiba = titik berangkat tangga berikutnya.
export const STAIR_X = -7;
export const Z_FRONT = 2.6, Z_BACK = -2.6;
export const flightStartZ = (k: number) => (k % 2 === 1 ? Z_FRONT : Z_BACK);
export const flightEndZ = (k: number) => (k % 2 === 1 ? Z_BACK : Z_FRONT);

type V3 = [number, number, number];
const same = (a: V3, b: V3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** Titik jalan dari lantai `a` ke lantai `b` melewati semua tangga di antaranya (tanpa titik tujuan akhir). */
export function stairPath(a: number, b: number): V3[] {
  if (a === b) return [];
  const pts: V3[] = [];
  const push = (p: V3) => { if (!pts.length || !same(pts[pts.length - 1], p)) pts.push(p); };
  if (b > a) {
    push([-5.4, floorY(a), flightStartZ(a)]);
    for (let k = a; k < b; k++) { push([STAIR_X, floorY(k), flightStartZ(k)]); push([STAIR_X, floorY(k + 1), flightEndZ(k)]); }
    push([-5.4, floorY(b), flightEndZ(b - 1)]);
  } else {
    push([-5.4, floorY(a), flightEndZ(a - 1)]);
    for (let k = a - 1; k >= b; k--) { push([STAIR_X, floorY(k + 1), flightEndZ(k)]); push([STAIR_X, floorY(k), flightStartZ(k)]); }
    push([-5.4, floorY(b), flightStartZ(b)]);
  }
  return pts;
}

/** Sisi bordes (z tengah) tempat tangga tiba di lantai n (n >= 2) */
export const landingZ = (n: number) => (flightEndZ(n - 1) === Z_BACK ? -3 : 3);

/** Lantai n terlihat bila fokus "all" atau n <= lantai yang difokuskan (lantai di atasnya disembunyikan) */
export type Focus = "all" | "1" | "2";
export const floorVisible = (focus: Focus, n: number) => focus === "all" || n <= Number(focus);

/** Karakter (dan label namanya) hanya tampil di lantai yang difokuskan; label HTML tidak ter-oklusi lantai, jadi lantai lain disembunyikan */
export const agentVisible = (focus: Focus, y: number) => focus === "all" || floorOfY(y) === Number(focus);
