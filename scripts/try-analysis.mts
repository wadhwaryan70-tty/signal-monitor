// Dev check without a database: live news + live Gemini for a few accounts.
import { analyseAccount, applyClassifications } from "../lib/analyse.ts";
import { fetchCompanyNews } from "../lib/news.ts";
import { summariseAccount } from "../lib/scoring.ts";

const names = process.argv.slice(2);
for (const name of names) {
  const t = Date.now();
  const news = await fetchCompanyNews(name, null);
  const acc = { company_name: name, industry: null, hq_city: null, stage: "outreach", key_contact: null, relationship_read: null, arjun_notes: null } as never;
  const a = await analyseAccount(acc, news, []);
  const scored = applyClassifications(news, a.classifications);
  const s = summariseAccount(scored);
  console.log(`\n=== ${name}: ${news.length} articles, score ${s.score} (${s.status}), ${s.events.length} events, ${((Date.now() - t) / 1000).toFixed(1)}s`);
  for (const x of scored.filter((x) => x.signal_type !== "none")) console.log(`  [${x.published_at?.slice(0, 10)}] ${x.signal_type}/${x.strength} ${x.about_company ? "" : "(OFF-TOPIC)"} ${x.event_key} — ${x.title.slice(0, 100)}`);
  console.log("  summary:", a.summary, "\n  why:", a.why_now, "\n  angle:", a.outreach_angle);
}
