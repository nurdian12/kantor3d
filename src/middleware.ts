import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authEnabled, verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value, process.env.AUTH_SECRET!, "session");
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

// Lindungi halaman utama, endpoint tiket, dan data Repliz; /login & /api/login tetap publik
export const config = { matcher: ["/", "/api/ws-ticket", "/api/repliz/:path*"] };
