import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { COOKIE, SESSION_TTL_S, authEnabled, signToken } from "@/lib/auth";

// Pembatas percobaan sederhana (in-memory, per IP): 5 gagal / menit
const fails = new Map<string, number[]>();
const WINDOW = 60_000, MAX = 5;

function same(a: string, b: string) {
  const h = (s: string) => createHmac("sha256", "cmp").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ error: "auth disabled" }, { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (fails.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= MAX) return NextResponse.json({ error: "Terlalu banyak percobaan, coba lagi sebentar." }, { status: 429 });

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !same(password, process.env.DASHBOARD_PASSWORD!)) {
    fails.set(ip, [...recent, now]);
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  fails.delete(ip);
  const token = await signToken({ aud: "session", exp: now + SESSION_TTL_S * 1000 }, process.env.AUTH_SECRET!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_S });
  return res;
}
