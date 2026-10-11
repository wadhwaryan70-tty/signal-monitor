// Single-user dashboard login. The password lives in DASHBOARD_PASSWORD; the session is an
// HMAC-signed cookie (AUTH_SECRET). Web Crypto only, so it runs in proxy.ts and route handlers.

export const SESSION_COOKIE = "signal_session";
export const SESSION_TTL_S = 60 * 60 * 12;

const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Buffer.from(sig).toString("base64url");
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters).");
  return s;
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function createSession(now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_TTL_S;
  return `${exp}.${await hmac(secret(), `signal:${exp}`)}`;
}

export async function verifySession(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig || exp * 1000 < now) return false;
  try {
    return safeEqual(sig, await hmac(secret(), `signal:${exp}`));
  } catch {
    return false;
  }
}

export function checkPassword(given: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  return safeEqual(given, expected);
}
