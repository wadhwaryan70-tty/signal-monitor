import { cookies } from "next/headers";
import { checkPassword, createSession, SESSION_COOKIE, SESSION_TTL_S } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!process.env.DASHBOARD_PASSWORD || !process.env.AUTH_SECRET)
    return Response.json({ error: "Login is not configured on the server." }, { status: 500 });
  if (typeof password !== "string" || !checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  return Response.json({ ok: true });
}
