import { appUrl, hotListHtml, hotListSubject } from "@/lib/email";
import { buildHotList } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/** Renders the Hot List email exactly as it would be sent right now. */
export async function GET() {
  try {
    const list = await buildHotList();
    const html = `<!doctype html><meta charset="utf-8"><title>${hotListSubject(list)}</title><body style="margin:24px;background:#fff">
<div style="font:12px system-ui;color:#78716c;margin-bottom:12px">Preview · Subject: <b>${hotListSubject(list).replace(/</g, "&lt;")}</b></div>${hotListHtml(list, appUrl())}</body>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Could not build the Hot List", { status: 500 });
  }
}
