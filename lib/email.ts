import "server-only";

// The Monday/Thursday Hot List email, sent through Resend.

import type { HotListEntry } from "./db";
import { bestApproach } from "./committee";
import { STAGE_LABEL } from "./product";
import { sourceName } from "./ui";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Who to approach: an HR/ops person named in the news, else the CRM contact. */
function approach(e: HotListEntry): string | null {
  const m = bestApproach(e.committee);
  if (!m) return null;
  return m.source === "news" ? `${m.name} (${m.title})` : `your contact — ${m.title}`;
}

const istDate = (d = new Date()) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function hotListSubject(list: HotListEntry[], now = new Date()): string {
  if (!list.length) return `Hot List — ${istDate(now)}: no fresh triggers this time`;
  return `Hot List — ${istDate(now)}: ${list.length} account${list.length === 1 ? "" : "s"} worth reaching out to`;
}

export function hotListText(list: HotListEntry[], appUrl: string): string {
  if (!list.length)
    return `No account on your list had a new trigger event in the last 3 days. Nothing to chase — good week to deepen live pilots.\n\nDashboard: ${appUrl}`;
  const lines = list.map(
    (e, i) =>
      `${i + 1}. ${e.company_name} (${STAGE_LABEL[e.stage]}) — priority ${e.priority} (readiness ${e.score}, fit ${e.fit})\n   Signal: ${e.summary}\n   Angle: ${e.outreach_angle || "—"}${approach(e) ? `\n   Approach: ${approach(e)}` : ""}\n   Source: ${e.sources[0]?.url ?? "—"}`,
  );
  return `Accounts with the strongest trigger signals from the last 3 days:\n\n${lines.join("\n\n")}\n\nThese are drafts for your judgment — nothing has been sent to any account.\nDashboard: ${appUrl}`;
}

export function hotListHtml(list: HotListEntry[], appUrl: string): string {
  const rows = list
    .map(
      (e, i) => `
  <tr><td style="padding:16px 0;border-top:1px solid #e7e5e4">
    <div style="font-size:16px;font-weight:600;color:#1c1917">${i + 1}. ${esc(e.company_name)}
      <span style="font-weight:400;color:#78716c;font-size:13px">&nbsp;·&nbsp;${STAGE_LABEL[e.stage]}</span>
      <span style="float:right;font-size:12px;font-weight:600;color:#fff;background:#ea580c;border-radius:999px;padding:2px 9px">${e.priority}</span></div>
    <div style="margin-top:2px;font-size:11px;color:#a8a29e;font-family:ui-monospace,monospace">priority ${e.priority} · readiness ${e.score} · fit ${e.fit}</div>
    <div style="margin-top:6px;color:#1c1917"><b>Signal:</b> ${esc(e.summary)}</div>
    ${e.why_now ? `<div style="margin-top:4px;color:#44403c"><b>Why now:</b> ${esc(e.why_now)}</div>` : ""}
    <div style="margin-top:8px;padding:10px 12px;background:#fff7ed;border-left:3px solid #ea580c;color:#431407"><b>Outreach angle:</b> ${esc(e.outreach_angle || "—")}</div>
    ${approach(e) ? `<div style="margin-top:6px;color:#44403c"><b>Approach:</b> ${esc(approach(e)!)}</div>` : ""}
    <div style="margin-top:6px;font-size:12px;color:#78716c">${e.sources
      .map((s) => `<a href="${esc(s.url)}" style="color:#57534e">${esc(sourceName(s.source))}: ${esc(s.title.slice(0, 90))}</a>`)
      .join("<br>")}</div>
  </td></tr>`,
    )
    .join("");
  const body = list.length
    ? `<p style="color:#44403c">Accounts with the strongest trigger signals from the last 3 days, ranked by priority (readiness × fit × timing).</p><table width="100%" cellspacing="0" cellpadding="0">${rows}</table>`
    : `<p style="color:#44403c">No account on your list had a new trigger event in the last 3 days. Nothing to chase — a good week to deepen live pilots.</p>`;
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;max-width:640px">
  <h2 style="margin:0 0 4px;color:#1c1917">🔥 Hot List — ${istDate()}</h2>
  ${body}
  <p style="margin-top:20px;font-size:12px;color:#78716c">Angles are drafts for your judgment — nothing has been sent to any account. Your notes and contact records were not changed.<br><a href="${esc(appUrl)}" style="color:#57534e">Open the dashboard</a></p>
</div>`;
}

export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "http://localhost:3300";
}

export async function sendHotList(
  list: HotListEntry[],
  idempotencyKey: string,
): Promise<{ ok: true; id: string; to: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Account Signal Monitor <onboarding@resend.dev>";
  const to = process.env.HOTLIST_TO?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set on the server." };
  if (!to) return { ok: false, error: "HOTLIST_TO (Arjun's email) is not set on the server." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": `hotlist-${idempotencyKey}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject: hotListSubject(list),
        text: hotListText(list, appUrl()),
        html: hotListHtml(list, appUrl()),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok || !data.id) return { ok: false, error: `Resend ${res.status}: ${data.message ?? data.name ?? "unknown error"}` };
    return { ok: true, id: data.id, to };
  } catch (e) {
    return { ok: false, error: `Could not reach Resend: ${e instanceof Error ? e.message : "network error"}` };
  }
}
