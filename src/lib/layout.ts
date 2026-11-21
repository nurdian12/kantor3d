import type { Pose } from "./types";

/** Koordinat dunia (x, z). Lantai n berada di y = (n-1) * FLOOR_H. */
export const FLOOR_H = 4;
export const FLOORS = 5;
export const BUILDING = { minX: -8, maxX: 8, minZ: -4, maxZ: 4 };
/** Dek balkon rooftop yang menjorok keluar di lantai 5 */
export const BALCONY = { minX: 3.9, maxX: 8, minZ: -4, maxZ: 6 };

export const floorY = (n: number) => (n - 1) * FLOOR_H;
export const floorOfY = (y: number) => Math.min(FLOORS, Math.max(1, Math.round(y / FLOOR_H) + 1));

/** Fungsi tiap lantai (dipakai label 3D dan denah 2D). Lantai 1-4 = area kerja, lantai 5 = istirahat. */
export const FLOOR_INFO: Array<{ n: number; name: string; short: string; accent: string }> = [
  { n: 1, name: "Lobi & Komunitas", short: "Lobi", accent: "#06b6d4" },
  { n: 2, name: "Studio Konten", short: "Studio", accent: "#f59e0b" },
  { n: 3, name: "Riset & Analitik", short: "Riset", accent: "#10b981" },
  { n: 4, name: "Ruang Kontrol", short: "Kontrol", accent: "#6366f1" },
  { n: 5, name: "Santai & Rooftop", short: "Santai", accent: "#ec4899" },
];

export interface Spot {
  pos: [number, number, number];
  rotY: number;
  pose: Pose;
  floor: number;
  label: string;
}

/**
 * 12 workstation: 3 meja di tiap lantai kerja (1-4), menghadap -z (dinding belakang).
 * Urutan indeks: lantai 1 (0-2), lantai 2 (3-5), lantai 3 (6-8), lantai 4 (9-11).
 */
export const DESK_COLS = [-3.5, 0.5, 4.5];
export const DESKS: Spot[] = [1, 2, 3, 4].flatMap((n) =>
  DESK_COLS.map((x, c): Spot => ({ pos: [x, floorY(n), -1.3], rotY: Math.PI, pose: "sit", floor: n, label: `${FLOOR_INFO[n - 1].short} · meja ${c + 1}` })),
);

/**
 * 6 spot istirahat di lantai 5. Urutan diselang-seling (lounge, kamar, balkon, ...)
 * agar agen pertama tersebar di tiga area.
 */
const Y5 = floorY(5);
export const IDLE_SPOTS: Spot[] = [
  { pos: [-4.2, Y5, -3.2], rotY: 0, pose: "sit", floor: 5, label: "Lounge" },
  { pos: [0.2, Y5, -1.7], rotY: 0, pose: "lie", floor: 5, label: "Kamar Tidur" },
  { pos: [5.4, Y5, 5.2], rotY: 0, pose: "stand", floor: 5, label: "Balkon" },
  { pos: [-2.6, Y5, -3.2], rotY: 0, pose: "sit", floor: 5, label: "Lounge" },
  { pos: [2.6, Y5, -1.7], rotY: 0, pose: "lie", floor: 5, label: "Kamar Tidur" },
  { pos: [6.8, Y5, 5.2], rotY: 0, pose: "stand", floor: 5, label: "Balkon" },
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
export type Focus = "all" | "1" | "2" | "3" | "4" | "5";
export const floorVisible = (focus: Focus, n: number) => focus === "all" || n <= Number(focus);

/** Karakter (dan label namanya) hanya tampil di lantai yang difokuskan; label HTML tidak ter-oklusi lantai, jadi lantai lain disembunyikan */
export const agentVisible = (focus: Focus, y: number) => focus === "all" || floorOfY(y) === Number(focus);
