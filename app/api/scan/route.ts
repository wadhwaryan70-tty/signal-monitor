import { runScan } from "@/lib/pipeline";
import { apiAuthError } from "@/lib/session";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await apiAuthError();
  if (denied) return denied;
  const { sendEmail } = (await req.json().catch(() => ({}))) as { sendEmail?: boolean };
  try {
    return Response.json(await runScan({ trigger: "manual", sendEmail: sendEmail === true }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Scan failed" }, { status: 500 });
  }
}
