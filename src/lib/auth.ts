// Token bertanda tangan HMAC-SHA256: base64url(JSON).base64url(sig). Memakai Web Crypto (Edge & Node).
// Format yang sama diverifikasi oleh server/mock-server.mjs (node:crypto).
export const COOKIE = "mc_session";
export const SESSION_TTL_S = 8 * 3600;
export const TICKET_TTL_S = 30;

const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** Auth aktif hanya bila kedua env diset (agar pengembangan lokal tetap mudah) */
export const authEnabled = () => !!process.env.AUTH_SECRET && !!process.env.DASHBOARD_PASSWORD;

const key = (secret: string, usage: KeyUsage) =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await key(secret, "sign"), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}

/** Return payload bila tanda tangan valid, belum kedaluwarsa, dan `aud` cocok; selain itu null */
export async function verifyToken(token: string | undefined, secret: string, aud: string): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret, "verify"), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if (p.aud !== aud || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}
