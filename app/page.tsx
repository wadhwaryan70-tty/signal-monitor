import Link from "next/link";
import { AccountTable } from "@/components/AccountTable";
import { HotCard } from "@/components/HotCard";
import { Nav } from "@/components/Nav";
import { Radar } from "@/components/Radar";
import { ScanControls } from "@/components/ScanControls";
import { listAccounts, listRuns, type Account, type Run } from "@/lib/db";
import { buildHotList } from "@/lib/pipeline";
import { isSignedIn } from "@/lib/session";
import { ago, fmtIST, nextScheduledRun, STATUS } from "@/lib/ui";

export const dynamic = "force-dynamic";

function Stat({ label, value, color, hint }: { label: string; value: string | number; color?: string; hint?: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <div className="label flex items-center gap-1.5">
        {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="mt-1 font-serif text-[32px] leading-none text-text">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </div>
  );
}

export default async function Home() {
  const signedIn = await isSignedIn();
  let accounts: Account[] = [];
  let runs: Run[] = [];
  let hot: Awaited<ReturnType<typeof buildHotList>> = [];
  let error: string | null = null;
  try {
    [accounts, runs, hot] = await Promise.all([listAccounts(), listRuns(5), buildHotList()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load data.";
  }
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const count = (s: Account["sig_status"]) => accounts.filter((a) => a.sig_status === s).length;
  const lastRun = runs.find((r) => r.status !== "running") ?? null;
  const next = nextScheduledRun();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

  return (
    <>
      <Nav active="radar" signedIn={signedIn} />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        {error && <div className="mt-6 rounded-xl border border-hot/30 bg-hot/10 p-4 text-sm text-hot">{error}</div>}

        {/* ── Hero ───────────────────────────────────────── */}
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.25fr_1fr] lg:py-14">
          <div className="rise">
            <div className="label flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hot" /> {today} · {accounts.length} accounts monitored
            </div>
            <h1 className="mt-4 font-serif text-[44px] leading-[1.02] tracking-tight text-text sm:text-[64px]">
              {hot.length ? (
                <>
                  <span className="italic text-hot">{hot.length} account{hot.length === 1 ? "" : "s"}</span> {hot.length === 1 ? "is" : "are"} worth
                  <br className="hidden sm:block" /> a call this week.
                </>
              ) : lastRun ? (
                <>Quiet week. <span className="italic text-mute">No fresh triggers.</span></>
              ) : (
                <>Which accounts are <span className="italic text-hot">warm</span> this week?</>
              )}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mute">
              Live news on every account, read by Gemini Flash for real trigger events — new people leaders, hiring and expansion,
              funding, workforce digitalisation, operational strain — scored, decayed and explained. Your notes stay exactly where you left them.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Hot" value={count("hot")} color={STATUS.hot.color} />
              <Stat label="Warm" value={count("warm")} color={STATUS.warm.color} />
              <Stat label="Cooling" value={count("cooling")} color={STATUS.cooling.color} />
              <Stat label="Quiet" value={count("quiet")} color={STATUS.quiet.color} />
            </div>

            <div className="mt-6">
              <ScanControls signedIn={signedIn} />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-mute">
              <span>
                Last scan: <b className="font-medium text-text">{lastRun ? ago(lastRun.finished_at ?? lastRun.started_at) : "never"}</b>
                {lastRun && <span className="text-faint"> ({lastRun.trigger})</span>}
              </span>
              <span>
                Next auto-scan + email: <b className="font-medium text-text">{fmtIST(next.toISOString())}</b> <span className="text-faint">IST · Mon & Thu</span>
              </span>
              {lastRun?.manual_untouched != null && (
                <Link href="/how-it-works#guarantee" className={lastRun.manual_untouched ? "text-good" : "text-hot"}>
                  {lastRun.manual_untouched ? "✓ Your fields untouched by last scan" : "✗ Fields changed — check"}
                </Link>
              )}
            </div>
          </div>

          <div className="glass rise relative rounded-3xl p-6" style={{ animationDelay: "120ms" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Account radar</span>
              <span className="font-mono text-[10px] text-faint">closer to centre = warmer</span>
            </div>
            <Radar blips={accounts.map((a) => ({ id: a.id, name: a.company_name, score: a.sig_score, status: a.sig_status, summary: a.sig_summary }))} />
            <div className="mt-3 flex justify-center gap-4 text-[11px] text-mute">
              {(["hot", "warm", "cooling", "quiet"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS[s].color }} /> {STATUS[s].label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Hot List ───────────────────────────────────── */}
        <section className="mt-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="label">This week&apos;s Hot List</div>
              <h2 className="mt-1 font-serif text-[34px] leading-none text-text">Strongest signals from the last 3 days</h2>
            </div>
            <Link href="/hot-list" className="text-[13px] text-mute transition hover:text-hot">Preview the email →</Link>
          </div>
          {hot.length ? (
            <div className="space-y-4">
              {hot.map((e, i) => (
                <HotCard key={e.account_id} entry={e} account={byId.get(e.account_id)} rank={i + 1} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-10 text-center">
              <div className="font-serif text-2xl text-text">{lastRun ? "Nothing fresh in the last 3 days." : "No scan has run yet."}</div>
              <p className="mt-2 text-sm text-mute">
                {lastRun
                  ? "No account had a new trigger event. Reaching out now would be noise — the radar will flag the moment something changes."
                  : "Run the first scan to pull live news for every account."}
              </p>
            </div>
          )}
        </section>

        {/* ── Full book ──────────────────────────────────── */}
        <section className="mt-14">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="label">All accounts · ranked by signal</div>
              <h2 className="mt-1 font-serif text-[34px] leading-none text-text">The whole book</h2>
            </div>
            <p className="max-w-md text-[12px] text-faint">
              Scores halve every 3 days without new signals, so accounts that go quiet sink on their own.
            </p>
          </div>
          <AccountTable accounts={accounts} />
        </section>
      </main>
    </>
  );
}
