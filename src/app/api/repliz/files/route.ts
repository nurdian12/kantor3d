import { NextResponse } from "next/server";
import { ReplizError, getFiles } from "@/lib/repliz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "40", 10) || 40));
  const search = (sp.get("search") ?? "").slice(0, 80);
  try {
    return NextResponse.json(await getFiles(page, limit, search), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

function fail(e: unknown) {
  if (e instanceof ReplizError && (e.status === 401 || e.status === 403)) return NextResponse.json({ error: "auth", message: "Kredensial Repliz belum diset atau ditolak (REPLIZ_BASIC_USER/REPLIZ_BASIC_PASS)." }, { status: 502 });
  if (e instanceof ReplizError && e.status === 402) return NextResponse.json({ error: "plan", message: "Fitur ini membutuhkan upgrade plan Repliz." }, { status: 502 });
  return NextResponse.json({ error: "upstream", message: "Gagal menghubungi Repliz." }, { status: 502 });
}
