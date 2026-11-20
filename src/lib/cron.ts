// Parser cron 5-field: menit jam tanggal bulan hari-minggu. Mendukung *, a, a-b, a,b, */n, a-b/n.
export interface CronSpec { minutes: number[]; hours: number[]; dom: number[]; months: number[]; dow: number[]; domAny: boolean; dowAny: boolean }

function field(src: string, min: number, max: number): number[] {
  const out = new Set<number>();
  for (const part of src.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr ? parseInt(stepStr, 10) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`cron: step tidak valid "${part}"`);
    let lo = min, hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-");
      lo = parseInt(a, 10);
      hi = b !== undefined ? parseInt(b, 10) : stepStr ? max : lo;
    }
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) throw new Error(`cron: nilai di luar rentang "${part}"`);
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

export function parseCron(expr: string): CronSpec {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error("cron harus 5 field");
  const dow = field(f[4], 0, 7).map((d) => d % 7);
  return {
    minutes: field(f[0], 0, 59), hours: field(f[1], 0, 23), dom: field(f[2], 1, 31), months: field(f[3], 1, 12),
    dow: [...new Set(dow)].sort(), domAny: f[2] === "*", dowAny: f[4] === "*",
  };
}

function dayMatches(s: CronSpec, d: Date) {
  if (!s.months.includes(d.getMonth() + 1)) return false;
  const domOk = s.dom.includes(d.getDate());
  const dowOk = s.dow.includes(d.getDay());
  // aturan standar cron: bila tanggal DAN hari-minggu sama-sama dibatasi, cukup salah satu cocok
  if (!s.domAny && !s.dowAny) return domOk || dowOk;
  return domOk && dowOk;
}

/** Menit-dalam-hari (0..1439) eksekusi pada tanggal lokal `d`, terurut */
export function timesOnDay(s: CronSpec, d: Date): number[] {
  if (!dayMatches(s, d)) return [];
  const out: number[] = [];
  for (const h of s.hours) for (const m of s.minutes) out.push(h * 60 + m);
  return out;
}

/** Eksekusi berikutnya setelah `after` (maks. 366 hari ke depan) */
export function nextRun(s: CronSpec, after: Date): Date | null {
  const start = new Date(after.getFullYear(), after.getMonth(), after.getDate());
  const afterMin = after.getHours() * 60 + after.getMinutes();
  for (let i = 0; i <= 366; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const t = timesOnDay(s, day).find((m) => i > 0 || m > afterMin);
    if (t !== undefined) return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(t / 60), t % 60);
  }
  return null;
}
