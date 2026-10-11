import { safeEqual } from "@/lib/auth";
import { runScan } from "@/lib/pipeline";

// Vercel Cron: Monday and Thursday 02:00 UTC (07:30 IST) — see vercel.json.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is rejected.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(given, `Bearer ${secret}`)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await runScan({ trigger: "cron", sendEmail: true }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Scan failed" }, { status: 500 });
  }
}
