import Link from "next/link";
import { Nav } from "@/components/Nav";
import { isSignedIn } from "@/lib/session";
import { fmtIST, nextScheduledRun, STATUS } from "@/lib/ui";

export const dynamic = "force-dynamic";

// A guide for Arjun: how to use Signal Monitor week to week.

const STEPS = [
  {
    n: "01",
    title: "Check your Hot List",
    when: "Mon & Thu · 7:30 am",
    color: "#ff5a36",
    body: "Twice a week an email lands with the accounts that had a real trigger in the last three days — strongest first. Each one says what changed, why it's the right moment, and a suggested angle. No email worth opening? It'll say so, and you can skip a round of noise.",
    cta: { href: "/hot-list", label: "See this week's Hot List" },
  },
  {
    n: "02",
    title: "Glance at the radar",
    when: "Any time",
    color: "#ffb020",
    body: "Every account is a dot. The closer to the centre, the warmer it is right now. Hot and warm accounts are named; quiet ones sit at the edge. The table below ranks your whole book, with your own notes alongside.",
    cta: { href: "/", label: "Open the radar" },
  },
  {
    n: "03",
    title: "Open an account",
    when: "Before you reach out",
    color: "#5b8def",
    body: "See what changed, why now, the people named in recent news, and the stories behind it. Click a source to read it yourself — always worth a 30-second check before you send anything.",
  },
  {
    n: "04",
    title: "Reach out — your way",
    when: "You decide",
    color: "#34d399",
    body: "Copy the suggested angle as a starting point and write the message in your own voice. Signal Monitor never contacts an account; every message is yours.",
  },
  {
    n: "05",
    title: "Update your notebook",
    when: "After every touch",
    color: "#c084fc",
    body: "Sign in, open the account, and log the date you spoke, your read on the relationship and any notes. Only you can change these. Logging a call also tells the radar you've just been in touch, so that account eases down the list for a bit.",
  },
  {
    n: "06",
    title: "Need it now? Scan any time",
    when: "Between emails",
    color: "#e8edf2",
    body: "Signed in, press “Scan now” on the radar to check the latest news for every account in about a minute — or “Scan + email Hot List” to also send yourself a fresh email.",
  },
];

const TRIGGERS = [
  { icon: "◆", name: "New people or ops leader", meaning: "A new CHRO, HR head, COO or plant/warehouse head. New leaders review tools in their first 90 days — the best moment to get on their list." },
  { icon: "↗", name: "Headcount expansion", meaning: "Hiring drives, new stores, hubs, plants, hospitals or city launches. More frontline staff means more scheduling and attendance pain." },
  { icon: "₹", name: "Funding round", meaning: "Fresh capital usually comes before hiring and new sites. Get in before the team scales." },
  { icon: "⌁", name: "Workforce digitalisation", meaning: "Public talk about HR tech, automating attendance or payroll, or a new HR system. They're already shopping." },
  { icon: "⚠", name: "Operational challenge", meaning: "Attrition, staff shortages, strikes, compliance trouble or peak-season crunch — a problem your product solves." },
];

const ALERTS = [
  { icon: "🔥", name: "Became hot", meaning: "A strong, fresh trigger — top of the list." },
  { icon: "↑", name: "Warming", meaning: "Something relevant happened; worth keeping an eye on." },
  { icon: "◉", name: "Strong signal", meaning: "A single story that's a clear reason to reach out." },
  { icon: "◆", name: "New person", meaning: "A named decision-maker or champion appeared in the news." },
  { icon: "↓", name: "Went quiet", meaning: "Nothing new for a while — it has dropped down the list." },
];

const FAQ = [
  {
    q: "Why did an account drop down the list?",
    a: "Triggers fade over a few days. If nothing new happens, an account slowly sinks on its own — that's on purpose, so last fortnight's news doesn't crowd out this week's.",
  },
  {
    q: "An account I care about says “Quiet”. Is something wrong?",
    a: "Quiet just means no buying trigger in the last two weeks — open the account to see the other news that was checked and set aside. Your notes on it are untouched; reach out whenever your own judgment says so.",
  },
  {
    q: "Will Signal Monitor ever change my notes?",
    a: "No. Your notes, last-contact dates and your read on each relationship are only ever changed by you. After every scan the radar confirms they're untouched.",
  },
  {
    q: "Why is an account I just spoke to ranked lower?",
    a: "If you logged a conversation in the last couple of weeks, the account eases down a little so the list favours accounts you haven't reached yet. The trigger is still shown.",
  },
  {
    q: "How do I add or remove an account?",
    a: "Your account list lives in your CRM. Add or remove a company there and it shows up (or disappears) on the next scan.",
  },
  {
    q: "Does it read LinkedIn?",
    a: "No — it follows news and press coverage, which picks up the same leadership moves, hiring drives and funding rounds, usually within a day.",
  },
];

export default async function HowItWorks() {
  const signedIn = await isSignedIn();
  const next = nextScheduledRun();
  return (
    <>
      <Nav active="how" signedIn={signedIn} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <div className="label">How it works</div>
        <h1 className="mt-2 max-w-3xl font-serif text-[48px] leading-[1.05] text-text sm:text-[60px]">
          Know who to call <span className="italic text-hot">this week</span> — and what to say.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
          Signal Monitor watches the news on every account for moments that make your product relevant, and tells you twice a week
          which accounts are worth a call. Next Hot List: <b className="text-text">{fmtIST(next.toISOString())} IST</b>.
        </p>

        {/* Steps */}
        <section className="mt-12">
          <div className="label mb-4">Your week in six steps</div>
          <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-line-2 sm:before:left-[31px]">
            {STEPS.map((s, i) => (
              <li key={s.n} className="glass rise relative flex gap-4 rounded-2xl p-5 sm:gap-6 sm:p-6" style={{ animationDelay: `${i * 60}ms` }}>
                <div
                  className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-[11px] sm:h-9 sm:w-9"
                  style={{ borderColor: `${s.color}66`, background: `${s.color}1a`, color: s.color }}
                >
                  {s.n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-[26px] leading-none text-text">{s.title}</h2>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: s.color }}>{s.when}</span>
                  </div>
                  <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-mute">{s.body}</p>
                  {s.cta && (
                    <Link href={s.cta.href} className="mt-3 inline-block text-[13px] text-text transition hover:text-hot">
                      {s.cta.label} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Status legend */}
        <section className="mt-16">
          <div className="label mb-4">What the colours mean</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["hot", "A strong trigger in the last three days. Call this week."],
                ["warm", "Something relevant happened recently. A good moment to reach out."],
                ["cooling", "The trigger is getting older. Still worth a look if it fits your plans."],
                ["quiet", "No buying trigger in the last two weeks. Outreach now is likely noise."],
              ] as const
            ).map(([k, text]) => (
              <div key={k} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[k].color, boxShadow: k === "hot" ? `0 0 8px ${STATUS[k].color}` : undefined }} />
                  <span className={`font-serif text-[24px] leading-none ${STATUS[k].text}`}>{STATUS[k].label}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Triggers + alerts */}
        <section className="mt-16 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass rounded-2xl p-6">
            <div className="label">The triggers it looks for</div>
            <ul className="mt-4 divide-y divide-line/70">
              {TRIGGERS.map((t) => (
                <li key={t.name} className="flex gap-3 py-3">
                  <span className="mt-0.5 w-5 shrink-0 text-center font-mono text-hot">{t.icon}</span>
                  <div>
                    <div className="text-[14px] font-medium text-text">{t.name}</div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-mute">{t.meaning}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="label">Alerts on the radar</div>
            <ul className="mt-4 divide-y divide-line/70">
              {ALERTS.map((a) => (
                <li key={a.name} className="flex gap-3 py-3">
                  <span className="mt-0.5 w-5 shrink-0 text-center">{a.icon}</span>
                  <div>
                    <div className="text-[14px] font-medium text-text">{a.name}</div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-mute">{a.meaning}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Notebook explainer */}
        <section className="mt-16 grid items-center gap-6 lg:grid-cols-2">
          <div>
            <div className="label">Your notebook</div>
            <h2 className="mt-2 font-serif text-[36px] leading-tight text-text">Your judgment stays yours.</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-mute">
              Anything on cream paper is yours: when you last spoke, your read on the relationship, your notes. Signal Monitor reads them to
              tailor its suggestions — a cold account gets an opener, a live pilot gets a nudge toward rollout — but it never edits them.
            </p>
          </div>
          <div className="paper rounded-2xl p-6 pl-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-ink/60">Example</div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">Last contact</div>
            <div className="hand text-[22px] leading-tight">30 Sept · after the pilot review</div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">My read</div>
            <div className="hand text-[21px] leading-[26px]">Warm. Champion is ops, blocker is finance — need an ROI story on overtime.</div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <div className="label mb-4">Questions</div>
          <div className="grid gap-3 md:grid-cols-2">
            {FAQ.map((f) => (
              <details key={f.q} className="glass group rounded-2xl p-5 open:pb-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[15px] text-text">
                  {f.q}
                  <span className="mt-0.5 shrink-0 font-mono text-faint transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[13.5px] leading-relaxed text-mute">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
