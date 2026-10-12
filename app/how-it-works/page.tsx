import { GuardTest } from "@/components/GuardTest";
import { Nav } from "@/components/Nav";
import { listRuns, type Run } from "@/lib/db";
import { COOLING_AT, HALF_LIFE_DAYS, HOT_AT, TYPE_WEIGHT, WARM_AT } from "@/lib/scoring";
import { SIGNAL_LABEL } from "@/lib/product";
import { isSignedIn } from "@/lib/session";
import { fmtIST } from "@/lib/ui";

export const dynamic = "force-dynamic";

const MAP = [
  {
    k: "Trigger",
    c: "#ff5a36",
    title: "Mon & Thu, 07:30 IST",
    lines: ["Vercel Cron → /api/cron (secret-protected)", "Manual “Scan now” for Arjun"],
  },
  {
    k: "Input",
    c: "#ffb020",
    title: "Accounts + live news",
    lines: ["Internal: Arjun's CRM in Supabase — stage, firmographics, last contact", "External: Google News RSS, India edition — 2 searches/account, last 14 days"],
  },
  {
    k: "Context",
    c: "#f4d35e",
    title: "What makes a trigger",
    lines: ["Arjun's product capabilities", "5 trigger types + strength rubric", "Account stage, contact, Arjun's read (read-only)", "Signals already found this fortnight"],
  },
  {
    k: "Processing",
    c: "#34d399",
    title: "Clean, dedupe, score",
    lines: ["Drop seen links & near-duplicate headlines", "Group same-event articles into one event", `Readiness = strength × weight × ½^(age/${HALF_LIFE_DAYS}d), top 3`, "Priority = readiness × fit × timing", "Fingerprint Arjun's columns before/after"],
  },
  {
    k: "AI",
    c: "#5b8def",
    title: "Gemini Flash",
    lines: ["Classify each new headline: type, strength 0–5, same-event key", "Name the buying committee: decision-makers, champions, influencers", "Write one-line summary + why now", "Draft outreach angle: trigger → capability, tuned to stage"],
  },
  {
    k: "Output",
    c: "#c084fc",
    title: "Hot List + radar",
    lines: ["CRM write-back: sig_ columns only, via apply_signal_update()", "CRM alert feed: became hot, strong signal, new person, went quiet", "Hot List email (Resend): top 10 by priority, last 3 days", "Dashboard, account pages, run log"],
  },
];

const STAGES: { n: string; title: string; color: string; points: string[]; not?: string }[] = [
  {
    n: "01",
    title: "Data collection",
    color: "#ffb020",
    points: [
      "Internal: Arjun's CRM (Supabase) — account stage, firmographics (frontline workforce, shift-based, sites), last-contact date, his read on the relationship.",
      "External: live Google News for every account, two searches each (plain + trigger words), India edition, last 14 days.",
    ],
    not: "website analytics and product-usage feeds — Arjun has none, and the system never invents data.",
  },
  {
    n: "02",
    title: "AI processing & grouping",
    color: "#5b8def",
    points: [
      "Gemini Flash classifies every new headline into one of five trigger types with a 0–5 strength — or rejects it as noise or a different company.",
      "Articles reporting the same event are merged into one account-level event, so ten outlets covering one funding round count once.",
      "The buying committee is pulled out of the news — named CHROs, ops heads, plant heads — and grouped into decision-makers, champions and influencers next to Arjun's CRM contact.",
    ],
    not: "unmasking anonymous web visitors — there's no website traffic to unmask, and reverse-IP identification needs paid data and privacy consent.",
  },
  {
    n: "03",
    title: "Scoring & prioritisation",
    color: "#ff5a36",
    points: [
      `Readiness: how strong and how fresh the triggers are — halves every ${HALF_LIFE_DAYS} days, so quiet accounts sink automatically.`,
      "Fit: how well the account matches the product — frontline scale, shift work, site count, core vertical.",
      "Priority = readiness × fit × timing (eased if Arjun spoke to them in the last few days). The Hot List is ranked by priority.",
    ],
  },
  {
    n: "04",
    title: "Automated action",
    color: "#34d399",
    points: [
      "Signal columns are written back into Arjun's CRM table on every scan — never his own columns.",
      "A CRM alert feed records what changed: became hot, strong new signal, new decision-maker named, went quiet.",
      "Mon & Thu 07:30 IST the Hot List email lands in his inbox: top 10 by priority, one-line signal, Gemini-drafted angle, who to approach.",
    ],
    not: "auto-sending outreach — Arjun decides and writes; the system only emails Arjun.",
  },
];

function RunRow({ r }: { r: Run }) {
  const tone = r.status === "ok" ? "text-good" : r.status === "partial" ? "text-warm" : r.status === "running" ? "text-cool" : "text-hot";
  return (
    <tr className="border-b border-line/70 text-[12.5px]">
      <td className="px-4 py-2.5 text-mute">{fmtIST(r.started_at)}</td>
      <td className="px-2 py-2.5 font-mono text-[11px] text-faint">{r.trigger}</td>
      <td className={`px-2 py-2.5 ${tone}`}>{r.status}</td>
      <td className="px-2 py-2.5 text-mute">{r.accounts_scanned} accts · {r.articles_fetched} headlines · {r.articles_new} new · <b className="text-text">{r.signals_new}</b> signals</td>
      <td className="px-2 py-2.5">{r.manual_untouched == null ? "—" : r.manual_untouched ? <span className="text-good">✓ untouched</span> : <span className="text-hot">✗ changed</span>}</td>
      <td className="px-2 py-2.5 text-mute" title={r.email_detail ?? ""}>{r.email_status ?? "—"}</td>
      <td className="px-4 py-2.5 text-mute">{r.hot_list?.length ?? 0}</td>
    </tr>
  );
}

export default async function HowItWorks() {
  const signedIn = await isSignedIn();
  const runs = await listRuns(12).catch(() => [] as Run[]);
  return (
    <>
      <Nav active="how" signedIn={signedIn} />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        <div className="label">How it works</div>
        <h1 className="mt-2 max-w-3xl font-serif text-[48px] leading-[1.05] text-text sm:text-[58px]">
          Timing is the product. <span className="italic text-mute">Here is how the system finds the moment.</span>
        </h1>

        {/* Four stages */}
        <section className="mt-12">
          <div className="label mb-4">The four stages</div>
          <div className="grid gap-3 md:grid-cols-2">
            {STAGES.map((st) => (
              <div key={st.n} className="glass relative overflow-hidden rounded-2xl p-6">
                <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: st.color, boxShadow: `0 0 16px ${st.color}` }} />
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[12px]" style={{ color: st.color }}>{st.n}</span>
                  <h3 className="font-serif text-[26px] leading-none text-text">{st.title}</h3>
                </div>
                <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-mute">
                  {st.points.map((pt) => <li key={pt} className="flex gap-2"><span style={{ color: st.color }}>›</span><span>{pt}</span></li>)}
                </ul>
                {st.not && <p className="mt-3 border-t border-line pt-3 text-[12px] text-faint"><span className="text-mute">Not built:</span> {st.not}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Components Map */}
        <section className="mt-16">
          <div className="label mb-4">Components map</div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {MAP.map((m, i) => (
              <div key={m.k} className="glass rise relative rounded-2xl p-5" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl" style={{ background: m.c, boxShadow: `0 0 16px ${m.c}` }} />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: m.c }}>{m.k}</span>
                  <span className="font-mono text-[10px] text-faint">0{i + 1}</span>
                </div>
                <div className="mt-2 font-serif text-[21px] leading-tight text-text">{m.title}</div>
                <ul className="mt-3 space-y-1.5 text-[12px] leading-snug text-mute">
                  {m.lines.map((l) => <li key={l} className="flex gap-1.5"><span style={{ color: m.c }}>›</span>{l}</li>)}
                </ul>
                {i < MAP.length - 1 && <div className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-faint xl:block">→</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee */}
        <section id="guarantee" className="mt-16 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="label">The guarantee</div>
            <h2 className="mt-2 font-serif text-[36px] leading-tight text-text">The system updates only what it found.</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-mute">
              Arjun&apos;s notes, last-contact dates and his read on each relationship are his. This isn&apos;t a promise in the app code — it&apos;s enforced
              by Postgres:
            </p>
            <ol className="mt-4 space-y-3 text-[13.5px] text-mute">
              <li className="flex gap-3"><span className="font-mono text-hot">01</span><span>Every system write goes through <code className="text-text">apply_signal_update()</code>, which touches only <code className="text-text">sig_*</code> columns and marks the transaction as the signal system.</span></li>
              <li className="flex gap-3"><span className="font-mono text-hot">02</span><span>A trigger on the table <b className="text-text">rejects</b> any change to an Arjun-owned column made by that writer — so even a bug could not overwrite a note. The system can&apos;t create or delete accounts either.</span></li>
              <li className="flex gap-3"><span className="font-mono text-hot">03</span><span>Every scan fingerprints all of Arjun&apos;s columns before and after, and records the result in the run log below.</span></li>
              <li className="flex gap-3"><span className="font-mono text-hot">04</span><span>The reverse holds too: Arjun&apos;s edits can&apos;t forge signal columns.</span></li>
            </ol>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="label mb-3">Try it live</div>
            <p className="mb-4 text-[13px] text-mute">This asks the database — as the signal system — to append text to the top account&apos;s notes. Safe: it runs in a rolled-back sub-transaction.</p>
            <GuardTest />
          </div>
        </section>

        {/* Scoring + Cuts */}
        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <div className="label">Scoring — deterministic, explainable</div>
            <div className="mt-4 rounded-xl bg-black/40 p-4 font-mono text-[13px] text-text">
              points = strength<span className="text-faint">(1–5)</span> × weight × ½<sup>age ÷ {HALF_LIFE_DAYS} days</sup>
              <br />readiness = top 3 events × 10, capped at 100
              <br />fit&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= workforce + shift + sites + vertical <span className="text-faint">(0–100)</span>
              <br />priority&nbsp; = readiness × (0.5 + fit/200) × timing
            </div>
            <table className="mt-4 w-full text-[12.5px]">
              <tbody>
                {Object.entries(TYPE_WEIGHT).map(([k, w]) => (
                  <tr key={k} className="border-b border-line/60">
                    <td className="py-1.5 text-mute">{SIGNAL_LABEL[k]}</td>
                    <td className="py-1.5 text-right font-mono text-text">× {w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-4 space-y-1 text-[12.5px] text-mute">
              <li><span className="text-hot">Hot</span> — readiness ≥ {HOT_AT} and a signal in the last 3 days</li>
              <li><span className="text-warm">Warm</span> — ≥ {WARM_AT} · <span className="text-cool">Cooling</span> — ≥ {COOLING_AT} · <span className="text-faint">Quiet</span> — below</li>
              <li>Gemini only classifies; the ranking is arithmetic. A 4-day-old signal is worth half a fresh one — quiet accounts sink without anyone touching them.</li>
            </ul>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="label">The cuts — what we deliberately didn&apos;t build</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="font-serif text-[22px] text-text">✂ LinkedIn posts</div>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">No public API or feed; scraping breaks LinkedIn&apos;s terms and breaks often. Leadership moves, hiring drives and funding reach press and news within a day — Google News covers the same trigger types legally and reliably.</p>
              </div>
              <div>
                <div className="font-serif text-[22px] text-text">✂ Auto-sending outreach</div>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">The system drafts the angle; Arjun decides and writes. Relationship judgment — and the risk of a tone-deaf AI email to a CHRO — stays with the human. The only email the system sends goes to Arjun.</p>
              </div>
              <div>
                <div className="font-serif text-[22px] text-text">✂ Unmasking anonymous web traffic</div>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">Intent platforms de-anonymise website visitors by IP. Arjun has no visitor data to unmask, and doing it needs paid providers and consent under India&apos;s DPDP Act. Named people in public news give the buying-committee view without surveillance.</p>
              </div>
              <div>
                <div className="font-serif text-[22px] text-text">✂ Salesforce / HubSpot / Outreach sync</div>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">Arjun&apos;s CRM is his Supabase table, so alerts and signals are written there. A connector to another CRM would be the same write behind a different API.</p>
              </div>
              <div>
                <div className="font-serif text-[22px] text-text">✂ Reading full articles</div>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">Headlines + source are enough to classify a trigger and avoid paywalls. Every claim links back to its source so Arjun can verify before he reaches out.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Run log */}
        <section className="mt-16">
          <div className="label mb-4">Run log</div>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="label border-b border-line">
                  <th className="px-4 py-2.5 font-normal">Started (IST)</th>
                  <th className="px-2 py-2.5 font-normal">Trigger</th>
                  <th className="px-2 py-2.5 font-normal">Status</th>
                  <th className="px-2 py-2.5 font-normal">Work</th>
                  <th className="px-2 py-2.5 font-normal">Arjun&apos;s fields</th>
                  <th className="px-2 py-2.5 font-normal">Email</th>
                  <th className="px-4 py-2.5 font-normal">Hot List</th>
                </tr>
              </thead>
              <tbody>
                {runs.length ? runs.map((r) => <RunRow key={r.id} r={r} />) : (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-[13px] text-faint">No runs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
