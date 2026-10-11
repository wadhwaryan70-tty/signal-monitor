import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { NotebookForm } from "@/components/NotebookForm";
import { ScoreRing, SignalChip, StatusPill, SystemTag } from "@/components/ScoreRing";
import { CopyButton } from "@/components/CopyButton";
import { articlesFor, getAccount } from "@/lib/db";
import { SIGNAL_LABEL, STAGE_LABEL } from "@/lib/product";
import { ageDays, buildEvents, decay, HALF_LIFE_DAYS, TYPE_WEIGHT } from "@/lib/scoring";
import { isSignedIn } from "@/lib/session";
import { ago, fmtIST, STATUS } from "@/lib/ui";

export const dynamic = "force-dynamic";

async function loadArticles(id: string) {
  const now = Date.now();
  return { articles: await articlesFor(id, new Date(now - 14 * 86_400_000).toISOString()), now };
}

export default async function AccountPage({ params }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [account, signedIn] = await Promise.all([getAccount(id), isSignedIn()]);
  if (!account) notFound();
  const { articles, now } = await loadArticles(id);
  const events = buildEvents(articles, now);
  const noise = articles.filter((a) => !a.about_company || a.signal_type === "none");
  const color = STATUS[account.sig_status].color;

  return (
    <>
      <Nav active="account" signedIn={signedIn} />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <Link href="/" className="text-[13px] text-mute transition hover:text-text">← Back to radar</Link>

        <header className="rise mt-4 flex flex-wrap items-center gap-5">
          <ScoreRing score={account.sig_score} status={account.sig_status} size={76} />
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
              <div className="flex items-center gap-2"><span className="label">What changed</span><SystemTag /></div>
              {account.sig_summary ? (
                <>
                  <p className="mt-3 font-serif text-[26px] leading-tight text-text">{account.sig_summary}</p>
                  {account.sig_why_now && <p className="mt-3 text-[14px] leading-relaxed text-mute"><span className="label mr-2 !text-warm">Why now</span>{account.sig_why_now}</p>}
                  {account.sig_outreach_angle && (
                    <div className="mt-4 rounded-xl border border-hot/25 bg-gradient-to-br from-hot/[0.10] to-transparent p-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="label !text-hot">Outreach angle · drafted by Gemini</span>
                        <CopyButton text={account.sig_outreach_angle} />
                      </div>
                      <p className="text-[14px] leading-relaxed text-text/90">{account.sig_outreach_angle}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 font-serif text-[24px] text-mute">No trigger events in the last 14 days. This account has gone quiet — not a moment to reach out.</p>
              )}
              <div className="mt-4 text-[11.5px] text-faint">Last scanned {ago(account.sig_last_scanned_at)}</div>
            </section>

            {/* Score breakdown */}
            <section className="glass rounded-2xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="label">Why the score is {account.sig_score}</span>
                <span className="font-mono text-[11px] text-faint">points = strength × type weight × ½^(age ÷ {HALF_LIFE_DAYS}d) · top 3 events · scaled to 100</span>
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
                          <span className="ml-auto font-mono text-[11.5px] text-mute">
                            {e.strength} × {TYPE_WEIGHT[e.type]} × {decay(age).toFixed(2)} = <b className="text-text">{e.points.toFixed(2)}</b>
                            {i >= 3 && <span className="text-faint"> (not counted)</span>}
                          </span>
                        </div>
                        <div className="mt-2 text-[14px] text-text">{e.articles[0].evidence ?? e.articles[0].title}</div>
                        <ul className="mt-2 space-y-0.5">
                          {e.articles.map((a) => (
                            <li key={a.url} className="truncate text-[12px]">
                              <a href={a.url} target="_blank" rel="noreferrer" className="text-faint transition hover:text-text">
                                <span className="font-mono text-mute">{a.source}</span> · {a.title} · {fmtIST(a.published_at, false)} ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-1 text-[11px] text-faint">{SIGNAL_LABEL[e.type]} · {age < 1 ? "today" : `${age.toFixed(1)} days old`}</div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-[13px] text-mute">No signal events → score 0.</p>
              )}
            </section>

            {/* Filtered out */}
            <details className="glass group rounded-2xl p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="label">Filtered out as noise · {noise.length} headlines</span>
                <span className="text-[12px] text-faint group-open:hidden">show</span>
              </summary>
              <p className="mt-2 text-[12px] text-faint">Read by Gemini and judged not to be a trigger (stock tips, marketing, complaints, other companies…).</p>
              <ul className="mt-3 space-y-1">
                {noise.map((a) => (
                  <li key={a.url} className="truncate text-[12px]">
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-faint hover:text-mute">
                      {fmtIST(a.published_at, false)} · {a.title} <span className="font-mono">— {a.source}</span>
                      {!a.about_company && <span className="text-warm"> (not about this company)</span>}
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
