import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { NotebookForm } from "@/components/NotebookForm";
import { ScoreRing, SignalChip, StatusPill } from "@/components/ScoreRing";
import { CopyButton } from "@/components/CopyButton";
import { CommitteePanel } from "@/components/Committee";
import { buildCommittee } from "@/lib/committee";
import { articlesFor, getAccount, peopleArticles } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/product";
import { ageDays, buildEvents, daysSinceDate, fitBreakdown, priorityScore, timingFactor } from "@/lib/scoring";
import { isSignedIn } from "@/lib/session";
import { ago, fmtIST, sourceName, STATUS } from "@/lib/ui";

export const dynamic = "force-dynamic";

async function loadArticles(id: string) {
  const now = Date.now();
  const [articles, people] = await Promise.all([articlesFor(id, new Date(now - 14 * 86_400_000).toISOString()), peopleArticles([id])]);
  return { articles, people, now };
}

export default async function AccountPage({ params }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [account, signedIn] = await Promise.all([getAccount(id), isSignedIn()]);
  if (!account) notFound();
  const { articles, people, now } = await loadArticles(id);
  const fit = fitBreakdown(account);
  const contactDays = daysSinceDate(account.last_contact_date, now);
  const priority = priorityScore(account.sig_score, fit.total, contactDays);
  const committee = buildCommittee(account, people);
  const events = buildEvents(articles, now);
  const noise = articles.filter((a) => !a.about_company || a.signal_type === "none");
  const color = STATUS[account.sig_status].color;

  return (
    <>
      <Nav active="account" signedIn={signedIn} />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <Link href="/" className="text-[13px] text-mute transition hover:text-text">← Back to radar</Link>

        <header className="rise mt-4 flex flex-wrap items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={priority} status={account.sig_status} size={76} />
            <span className="font-mono text-[9px] uppercase tracking-wider text-faint">priority</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-[48px] leading-none text-text">{account.company_name}</h1>
              <StatusPill status={account.sig_status} />
            </div>
            <div className="mt-2 text-[13px] text-mute">
              {STAGE_LABEL[account.stage]} · {account.industry} · {account.hq_city} · contact: {account.key_contact ?? "—"}
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* System's read */}
            <section className="glass rounded-2xl p-6">
              <div className="label">What changed</div>
              {account.sig_summary ? (
                <>
                  <p className="mt-3 font-serif text-[26px] leading-tight text-text">{account.sig_summary}</p>
                  {account.sig_why_now && <p className="mt-3 text-[14px] leading-relaxed text-mute"><span className="label mr-2 !text-warm">Why now</span>{account.sig_why_now}</p>}
                  {account.sig_outreach_angle && (
                    <div className="mt-4 rounded-xl border border-hot/25 bg-gradient-to-br from-hot/[0.10] to-transparent p-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="label !text-hot">Suggested angle</span>
                        <CopyButton text={account.sig_outreach_angle} />
                      </div>
                      <p className="text-[14px] leading-relaxed text-text/90">{account.sig_outreach_angle}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 font-serif text-[24px] text-mute">No trigger events in the last 14 days. This account has gone quiet — not a moment to reach out.</p>
              )}
              <div className="mt-4 text-[11.5px] text-faint">Last checked {ago(account.sig_last_scanned_at)}</div>
            </section>

            {/* Why it ranks here */}
            <section className="glass rounded-2xl p-6">
              <div className="label">Why it ranks here</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-line bg-panel-2/50 p-3 text-center">
                  <div className="label">Signal</div>
                  <div className="mt-1 font-serif text-[30px] leading-none" style={{ color }}>{Math.round(account.sig_score)}</div>
                  <div className="mt-1 text-[10.5px] text-faint">how strong &amp; recent</div>
                </div>
                <div className="rounded-xl border border-line bg-panel-2/50 p-3 text-center">
                  <div className="label">Fit</div>
                  <div className="mt-1 font-serif text-[30px] leading-none text-[#c084fc]">{fit.total}</div>
                  <div className="mt-1 text-[10.5px] text-faint">match for your product</div>
                </div>
                <div className="rounded-xl border border-line bg-panel-2/50 p-3 text-center">
                  <div className="label">Last spoke</div>
                  <div className="mt-1 font-serif text-[30px] leading-none text-text">{contactDays === null ? "—" : `${contactDays}d`}</div>
                  <div className="mt-1 text-[10.5px] text-faint">{contactDays === null ? "not contacted yet" : timingFactor(contactDays) < 1 ? "recent — slightly lower" : "long enough ago"}</div>
                </div>
                <div className="rounded-xl border border-hot/30 bg-hot/10 p-3 text-center">
                  <div className="label !text-hot">Priority</div>
                  <div className="mt-1 font-serif text-[30px] leading-none text-text">{Math.round(priority)}</div>
                  <div className="mt-1 text-[10.5px] text-faint">who to call first</div>
                </div>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-mute">
                Fit reflects {account.frontline_workforce ? `a ${account.frontline_workforce} frontline workforce` : "workforce size"}
                {account.shift_based ? ", shift-based work" : ""}{account.site_count ? `, ${account.site_count} sites` : ""}
                {fit.vertical ? " and a core industry for you" : ""}. Signals fade over a few days, so an account drops on its own if nothing new happens.
                Accounts you spoke to in the last couple of weeks rank a little lower.
              </p>
            </section>

            {/* Buying committee */}
            <section className="glass rounded-2xl p-6">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div className="label">Buying committee</div>
                <span className="text-[11px] text-faint">People named in recent news, plus your contact</span>
              </div>
              <CommitteePanel members={committee} />
            </section>

            {/* Score breakdown */}
            <section className="glass rounded-2xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="label">Recent triggers</span>
                <span className="text-[11px] text-faint">Strongest first · stories about the same event are grouped</span>
              </div>
              {events.length ? (
                <ol className="mt-4 space-y-3">
                  {events.map((e, i) => {
                    const age = ageDays(e.at, now);
                    return (
                      <li key={e.key} className={`rounded-xl border p-4 ${i < 3 ? "border-line-2 bg-panel-2/60" : "border-line opacity-60"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <SignalChip type={e.type} />
                          <span className="flex gap-0.5" aria-label={`strength ${e.strength} of 5`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} className="h-2 w-2 rounded-sm" style={{ background: n <= e.strength ? color : "#1f2731" }} />
                            ))}
                          </span>
                          <span className="ml-auto text-[11.5px] text-mute">{age < 1 ? "today" : age < 2 ? "yesterday" : `${Math.floor(age)} days ago`}</span>
                        </div>
                        <div className="mt-2 text-[14px] text-text">{e.articles[0].evidence ?? e.articles[0].title}</div>
                        <ul className="mt-2 space-y-0.5">
                          {e.articles.map((a) => (
                            <li key={a.url} className="truncate text-[12px]">
                              <a href={a.url} target="_blank" rel="noreferrer" className="text-faint transition hover:text-text">
                                <span className="font-mono text-mute">{sourceName(a.source)}</span> · {a.title} · {fmtIST(a.published_at, false)} ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                        {e.articles.length > 1 && <div className="mt-1 text-[11px] text-faint">{e.articles.length} stories about this</div>}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-[13px] text-mute">Nothing in the last two weeks.</p>
              )}
            </section>

            {/* Filtered out */}
            <details className="glass group rounded-2xl p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="label">Other news · {noise.length} stories</span>
                <span className="text-[12px] text-faint group-open:hidden">show</span>
              </summary>
              <p className="mt-2 text-[12px] text-faint">Checked and set aside — not a reason to reach out (stock tips, marketing, complaints, other companies…).</p>
              <ul className="mt-3 space-y-1">
                {noise.map((a) => (
                  <li key={a.url} className="truncate text-[12px]">
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-faint hover:text-mute">
                      {fmtIST(a.published_at, false)} · {a.title} <span className="font-mono">— {sourceName(a.source)}</span>
                      {!a.about_company && <span className="text-warm"> (different company)</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <NotebookForm
              id={account.id}
              signedIn={signedIn}
              initial={{ arjun_notes: account.arjun_notes, last_contact_date: account.last_contact_date, relationship_read: account.relationship_read }}
            />
          </div>
        </div>
      </main>
    </>
  );
}
