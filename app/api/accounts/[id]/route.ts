import { updateArjunFields } from "@/lib/db";
import { apiAuthError } from "@/lib/session";

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Arjun's own edits: notes, last-contact date and relationship read. Never touches sig_ columns. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/accounts/[id]">) {
  const denied = await apiAuthError();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const date = clean(body.last_contact_date, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Use a YYYY-MM-DD date." }, { status: 400 });
  try {
    await updateArjunFields(id, {
      arjun_notes: clean(body.arjun_notes, 4000),
      last_contact_date: date,
      relationship_read: clean(body.relationship_read, 1000),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Save failed" }, { status: 500 });
  }
}
