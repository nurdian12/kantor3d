import { NextResponse } from "next/server";
import { ReplizError, getScheduleRange } from "@/lib/repliz";

export const dynamic = "force-dynamic";
const MAX_SPAN_MS = 62 * 24 * 3600_000;

// Jadwal posting Repliz untuk rentang tanggal (baca-saja). ?from=ISO&to=ISO (maks. 62 hari)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const from = new Date(sp.get("from") ?? ""), to = new Date(sp.get("to") ?? "");
  if (isNaN(+from) || isNaN(+to) || to <= from || +to - +from > MAX_SPAN_MS)
    return NextResponse.json({ error: "bad_request", message: "Parameter from/to tidak valid (ISO, maksimal 62 hari)." }, { status: 400 });
  try {
    return NextResponse.json(await getScheduleRange(from.toISOString(), to.toISOString()), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ReplizError && (e.status === 401 || e.status === 403))
      return NextResponse.json({ error: "auth", message: "Kredensial Repliz belum diset atau ditolak (REPLIZ_BASIC_USER/REPLIZ_BASIC_PASS di .env.local)." }, { status: 502 });
    return NextResponse.json({ error: "upstream", message: "Gagal menghubungi Repliz." }, { status: 502 });
  }
}
