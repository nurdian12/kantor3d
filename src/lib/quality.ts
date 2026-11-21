export type Quality = "high" | "medium" | "low";

export interface QualityProfile {
  label: string;
  dpr: [number, number];
  shadows: boolean;
  shadowMap: number;
  antialias: boolean;
  /** batas FPS (0 = tanpa batas); >0 memakai frameloop "demand" + ticker sehingga GPU/CPU istirahat di antara frame */
  fps: number;
  pointLights: boolean;
  /** perabot dekoratif (rak, sofa, layar dinding, dll.); false = hanya lantai, meja, tangga, karakter */
  decor: boolean;
}

export const QUALITY: Record<Quality, QualityProfile> = {
  high: { label: "Tinggi", dpr: [1, 2], shadows: true, shadowMap: 2048, antialias: true, fps: 0, pointLights: true, decor: true },
  medium: { label: "Sedang", dpr: [1, 1.5], shadows: true, shadowMap: 1024, antialias: true, fps: 30, pointLights: false, decor: true },
  low: { label: "Ringan", dpr: [1, 1], shadows: false, shadowMap: 0, antialias: false, fps: 24, pointLights: false, decor: false },
};
export const QUALITY_ORDER: Quality[] = ["high", "medium", "low"];
/** FPS di bawah ambang ini (terukur) memicu penurunan otomatis satu tingkat */
export const DOWNGRADE_BELOW: Record<Quality, number> = { high: 24, medium: 20, low: 0 };
