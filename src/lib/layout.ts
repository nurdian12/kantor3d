import type { Pose } from "./types";

/** Koordinat dunia (x, z). Lantai 1 y=0, lantai 2 y=FLOOR_H. */
export const FLOOR_H = 4;
export const BUILDING = { minX: -8, maxX: 8, minZ: -4, maxZ: 4 };
/** Dek balkon yang menjorok keluar di lantai 2 */
export const BALCONY = { minX: 3.9, maxX: 8, minZ: -4, maxZ: 6 };

export interface Spot {
  pos: [number, number, number];
  rotY: number;
  pose: Pose;
  floor: 1 | 2;
  label: string;
}

/** 6 workstation di lantai 1 (2 baris x 3 kolom, menghadap -z / dinding belakang). */
const DESK_COLS = [-3.5, 0.5, 4.5];
const DESK_ROWS = [-1.3, 2.0];
export const DESKS: Spot[] = DESK_ROWS.flatMap((z, r) =>
  DESK_COLS.map((x, c): Spot => ({ pos: [x, 0, z], rotY: Math.PI, pose: "sit", floor: 1, label: `Workstation ${r * 3 + c + 1}` })),
);

/**
 * 6 spot istirahat di lantai 2. Urutan diselang-seling (lounge, kamar, balkon, ...)
 * agar 3 agen pertama tersebar di tiga area.
 */
export const IDLE_SPOTS: Spot[] = [
  { pos: [-4.2, FLOOR_H, -3.2], rotY: 0, pose: "sit", floor: 2, label: "Lounge" },
  { pos: [0.2, FLOOR_H, -1.7], rotY: 0, pose: "lie", floor: 2, label: "Kamar Tidur" },
  { pos: [5.4, FLOOR_H, 5.2], rotY: 0, pose: "stand", floor: 2, label: "Balkon" },
  { pos: [-2.6, FLOOR_H, -3.2], rotY: 0, pose: "sit", floor: 2, label: "Lounge" },
  { pos: [2.6, FLOOR_H, -1.7], rotY: 0, pose: "lie", floor: 2, label: "Kamar Tidur" },
  { pos: [6.8, FLOOR_H, 5.2], rotY: 0, pose: "stand", floor: 2, label: "Balkon" },
];

/** Kapasitas layout: agen ke-N memakai meja/spot (N mod kapasitas) */
export const CAPACITY = Math.min(DESKS.length, IDLE_SPOTS.length);

/** Tangga di sisi kiri: bawah (lantai 1) -> atas (lantai 2) */
export const STAIRS = {
  bottom: [-7, 0, 2.6] as [number, number, number],
  top: [-7, FLOOR_H, -2.6] as [number, number, number],
};
/** titik antara di depan tangga (lantai 1 / lantai 2) */
export const STAIR_APPROACH_1: [number, number, number] = [-5.6, 0, 2.6];
export const STAIR_APPROACH_2: [number, number, number] = [-5.2, FLOOR_H, -2.6];
