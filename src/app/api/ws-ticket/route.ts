import { NextResponse } from "next/server";
import { TICKET_TTL_S, authEnabled, signToken } from "@/lib/auth";

// Tiket WebSocket berumur pendek (30 dtk) & sekali pakai (jti dicek server WS).
// Middleware sudah memastikan sesi valid sebelum sampai sini.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!authEnabled()) return NextResponse.json({ ticket: null }, { headers });
  const jti = crypto.randomUUID();
  const ticket = await signToken({ aud: "ws", jti, exp: Date.now() + TICKET_TTL_S * 1000 }, process.env.AUTH_SECRET!);
  return NextResponse.json({ ticket }, { headers });
}
