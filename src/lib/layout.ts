import type { IdleSpotId, Pose } from "./types";

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

/** 3 workstation di lantai 1 (menghadap -z / dinding belakang). */
export const DESKS: Spot[] = [
  { pos: [-3.5, 0, -1.3], rotY: Math.PI, pose: "sit", floor: 1, label: "Workstation 1" },
  { pos: [0.5, 0, -1.3], rotY: Math.PI, pose: "sit", floor: 1, label: "Workstation 2" },
  { pos: [4.5, 0, -1.3], rotY: Math.PI, pose: "sit", floor: 1, label: "Workstation 3" },
];

export const IDLE_SPOTS: Record<IdleSpotId, Spot> = {
  lounge: { pos: [-3.4, FLOOR_H, -3.2], rotY: 0, pose: "sit", floor: 2, label: "Lounge" },
  bedroom: { pos: [1.4, FLOOR_H, -1.7], rotY: 0, pose: "lie", floor: 2, label: "Kamar Tidur" },
  balcony: { pos: [6, FLOOR_H, 5.2], rotY: 0, pose: "stand", floor: 2, label: "Balkon" },
};

/** Tangga di sisi kiri: bawah (lantai 1) -> atas (lantai 2) */
export const STAIRS = {
  bottom: [-7, 0, 2.6] as [number, number, number],
  top: [-7, FLOOR_H, -2.6] as [number, number, number],
};
/** titik antara di depan tangga (lantai 1 / lantai 2) */
export const STAIR_APPROACH_1: [number, number, number] = [-5.6, 0, 2.6];
export const STAIR_APPROACH_2: [number, number, number] = [-5.2, FLOOR_H, -2.6];
