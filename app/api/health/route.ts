import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: reports configuration state and counts only.
export async function GET() {
  const vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "RESEND_API_KEY", "HOTLIST_TO", "DASHBOARD_PASSWORD", "AUTH_SECRET", "CRON_SECRET"];
  const env = Object.fromEntries(vars.map((v) => [v, Boolean(process.env[v]?.trim())]));
  let database: Record<string, unknown> = { ok: false };
  try {
    const [acc, art, fp] = await Promise.all([
      db().from("accounts").select("id", { head: true, count: "exact" }),
      db().from("articles").select("id", { head: true, count: "exact" }),
      db().rpc("manual_fingerprint"),
    ]);
    const err = acc.error ?? art.error ?? fp.error;
    database = err ? { ok: false, error: err.message } : { ok: true, accounts: acc.count, articles: art.count };
  } catch (e) {
    database = { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
  return Response.json({ ok: database.ok === true && Object.values(env).every(Boolean), env, database });
}
