// The course's Nine Checks — "Does this deserve to be built?" — answered for this build.
// Kill switches: any No → don't build. Sizing: any No → build smaller. Boundary: any No → a human goes exactly here.

type Verdict = "yes" | "cut" | "human";

interface Check {
  n: string;
  q: string;
  verdict: Verdict;
  answer: string;
  evidence: string;
}

export interface LiveCounts {
  total: number;
  fresh: number;
  quiet: number;
}

const groups = (live: LiveCounts): { title: string; icon: string; rule: string; color: string; checks: Check[] }[] => [
  {
    title: "Kill switches",
    icon: "⚡",
    rule: "Any No → don't build it",
    color: "#ff5a36",
    checks: [
      {
        n: "01",
        q: "Problem real?",
        verdict: "yes",
        answer: "Timing decides Arjun's deals: no trigger = noise, two weeks late = too late. Signals are scattered across dozens of sources for every account, every day — impossible to watch by hand.",
        evidence: `Right now: ${live.fresh} of ${live.total} accounts have a fresh trigger and ${live.quiet} are quiet. Without the system he'd chase all ${live.total} or guess.`,
      },
      {
        n: "02",
        q: "Workflow repeated?",
        verdict: "yes",
        answer: "The same scan, every account, twice a week, forever — Monday and Thursday mornings.",
        evidence: "Vercel Cron 0 2 * * 1,4 (07:30 IST) → scan + Hot List. Every run is in the run log.",
      },
      {
        n: "03",
        q: "Input available?",
        verdict: "cut",
        answer: "Yes for news & press (Google News RSS, live, free) and for his CRM (Supabase). No for LinkedIn posts — no public API, scraping breaks its terms.",
        evidence: "The Cut: LinkedIn dropped. The same trigger types (new CHRO, hiring, funding) reach news within a day.",
      },
    ],
  },
  {
    title: "Sizing",
    icon: "📊",
    rule: "Any No → build something smaller",
    color: "#ffb020",
    checks: [
      {
        n: "04",
        q: "Output valuable?",
        verdict: "yes",
        answer: "Not a news feed — a ranked decision: who to call, what changed, why now, the angle, and who to approach.",
        evidence: "Hot List cards and email: one-line signal + why now + Gemini angle + buying committee + sources.",
      },
      {
        n: "05",
        q: "Impact measurable?",
        verdict: "yes",
        answer: "Trigger-to-contact lag (signal date vs Arjun's last-contact date), reply/meeting rate on Hot List accounts vs cold ones, and signals caught per run.",
        evidence: "Every account stores sig_last_signal_at next to Arjun's last_contact_date; every run logs headlines, signals and the Hot List.",
      },
      {
        n: "08",
        q: "ROI worth it?",
        verdict: "yes",
        answer: "Runs on free tiers: ~20 Gemini Flash calls a scan (only for new headlines), free news feed, Supabase/Vercel/Resend free plans. One extra enterprise meeting pays for years of it.",
        evidence: "Sized down to fit: headlines only (no full-article scraping), 2 scans a week, already-seen headlines never re-sent to Gemini.",
      },
    ],
  },
  {
    title: "Boundary",
    icon: "🚧",
    rule: "Any No → put a human exactly here",
    color: "#34d399",
    checks: [
      {
        n: "06",
        q: "Failure risk OK?",
        verdict: "human",
        answer: "A misread headline costs little — Arjun sees the source before acting. A wrong AI email to a new CHRO costs the relationship. So: No for sending.",
        evidence: "Human here: the system drafts the angle; Arjun writes and sends. The only email it sends goes to Arjun.",
      },
      {
        n: "07",
        q: "Judgment protected?",
        verdict: "yes",
        answer: "Arjun's notes, last-contact dates and his read on each relationship are his. The system may read them for tone but can never write them.",
        evidence: "Enforced by a Postgres trigger, fingerprinted on every run — try the live overwrite test below.",
      },
      {
        n: "09",
        q: "Owner clear?",
        verdict: "yes",
        answer: "Arjun owns the account list, his columns and every outreach decision. The system owns only the sig_ columns, the alert feed and the Hot List.",
        evidence: "Two writers, two column sets, enforced in the database: apply_signal_update() vs update_arjun_fields().",
      },
    ],
  },
];

const VERDICT: Record<Verdict, { label: string; cls: string }> = {
  yes: { label: "Yes", cls: "bg-good/15 text-good ring-good/30" },
  cut: { label: "Partly · Cut", cls: "bg-warm/15 text-warm ring-warm/30" },
  human: { label: "No → human here", cls: "bg-hot/15 text-hot ring-hot/30" },
};

export function NineChecks({ live }: { live: LiveCounts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {groups(live).map((g) => (
        <div key={g.title} className="glass relative overflow-hidden rounded-2xl">
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: g.color, boxShadow: `0 0 16px ${g.color}` }} />
          <div className="border-b border-line px-5 py-4">
            <div className="font-serif text-[24px] leading-none text-text">
              <span className="mr-2 text-[18px]">{g.icon}</span>
              {g.title}
            </div>
            <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: g.color }}>
              {g.rule}
            </div>
          </div>
          <ol className="divide-y divide-line/70">
            {g.checks.map((c) => (
              <li key={c.n} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-faint">{c.n}</span>
                    <span className="font-medium text-text">{c.q}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ${VERDICT[c.verdict].cls}`}>{VERDICT[c.verdict].label}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-mute">{c.answer}</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
                  <span className="text-mute">→ </span>
                  {c.evidence}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
