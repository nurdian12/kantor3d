import { NextResponse } from "next/server";
import { ReplizError, getKnowledge } from "@/lib/repliz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ items: await getKnowledge() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ReplizError && e.status === 402) return NextResponse.json({ error: "plan", message: "Fitur ini membutuhkan upgrade plan layanan jadwal." }, { status: 502 });
    return NextResponse.json({ error: "upstream", message: "Gagal menghubungi layanan jadwal." }, { status: 502 });
  }
}
