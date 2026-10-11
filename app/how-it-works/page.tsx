import { GuardTest } from "@/components/GuardTest";
import { Nav } from "@/components/Nav";
import { listRuns, type Run } from "@/lib/db";
import { HALF_LIFE_DAYS, TYPE_WEIGHT } from "@/lib/scoring";
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
    lines: ["Arjun's accounts table (Supabase)", "Google News RSS, India edition — 2 searches/account, last 14 days"],
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
    lines: ["Drop seen links & near-duplicate headlines", "Group same-event articles", `Score = strength × weight × ½^(age/${HALF_LIFE_DAYS}d), top 3`, "Fingerprint Arjun's columns before/after"],
  },
  {
    k: "AI",
    c: "#5b8def",
    title: "Gemini Flash",
    lines: ["Classify each new headline: type, strength 0–5, same-event key", "Write one-line summary + why now", "Draft outreach angle: trigger → capability, tuned to stage"],
  },
  {
    k: "Output",
    c: "#c084fc",
    title: "Hot List + radar",
    lines: ["sig_ columns only, via apply_signal_update()", "Hot List email (Resend): top 10, last 3 days", "Dashboard, account pages, run log"],
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

        {/* Components Map */}
        <section className="mt-12">
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
              <br />score&nbsp; = sum of top 3 events, scaled 0–100
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
              <li><span className="text-hot">Hot</span> — score ≥ 40 and a signal in the last 3 days</li>
              <li><span className="text-warm">Warm</span> — score ≥ 15 · <span className="text-cool">Cooling</span> — ≥ 3 · <span className="text-faint">Quiet</span> — below</li>
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
