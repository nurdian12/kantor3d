import { NextResponse } from "next/server";
import { ReplizError, getStats } from "@/lib/repliz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    return NextResponse.json(await getStats(new URL(req.url).searchParams.get("refresh") === "1"), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ReplizError && e.status === 402) return NextResponse.json({ error: "plan", message: "Fitur ini membutuhkan upgrade plan Repliz." }, { status: 502 });
    return NextResponse.json({ error: "upstream", message: "Gagal menghubungi Repliz." }, { status: 502 });
  }
}
