// One-off: rewrite summary / why-now / angle for accounts with live signals (e.g. after a prompt change).
// Scores are untouched; writes go through apply_signal_update like every other system write.
import { analyseAccount } from "../lib/analyse.ts";
import { applySignalUpdate, articlesFor, listAccounts, manualFingerprint } from "../lib/db.ts";

const before = await manualFingerprint();
const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
for (const a of await listAccounts()) {
  if (!a.sig_events_14d) continue;
  const prev = await articlesFor(a.id, since);
  const r = await analyseAccount(a, [], prev);
  await applySignalUpdate(
    a.id,
    {
      score: a.sig_score, fit: a.sig_fit_score, priority: a.sig_priority, status: a.sig_status,
      last_signal_at: a.sig_last_signal_at, events_14d: a.sig_events_14d, top_type: a.sig_top_type,
      ...(r.summary.trim() ? { summary: r.summary.trim() } : {}),
      ...(r.why_now.trim() ? { why_now: r.why_now.trim() } : {}),
      ...(r.outreach_angle.trim() ? { outreach_angle: r.outreach_angle.trim() } : {}),
    },
    a.sig_run_id ?? (null as never),
  );
  console.log(`✓ ${a.company_name}: ${r.outreach_angle.slice(0, 110)}…`);
}
console.log("Arjun's fields unchanged:", before === (await manualFingerprint()));
