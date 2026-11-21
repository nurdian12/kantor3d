import { NextResponse } from "next/server";
import { ReplizError, getSocialSummary } from "@/lib/repliz";

export const dynamic = "force-dynamic";

// Ringkasan Repliz (baca-saja). Dilindungi middleware bila autentikasi aktif.
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    return NextResponse.json(await getSocialSummary(force), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ReplizError && (e.status === 401 || e.status === 403))
      return NextResponse.json({ error: "auth", message: "Kredensial layanan jadwal belum diset atau ditolak. Isi REPLIZ_BASIC_USER (Access Key) dan REPLIZ_BASIC_PASS (Secret Key) di .env.local." }, { status: 502 });
    return NextResponse.json({ error: "upstream", message: "Gagal menghubungi layanan jadwal. Coba lagi sebentar." }, { status: 502 });
  }
}
