import Link from "next/link";
import type { Account, HotListEntry } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/product";
import { ago, daysSince, fmtIST } from "@/lib/ui";
import { CopyButton } from "./CopyButton";
import { ArjunTag, ScoreRing, SignalChip, StatusPill, SystemTag } from "./ScoreRing";

export function HotCard({ entry, account, rank }: { entry: HotListEntry; account: Account | undefined; rank: number }) {
  const lastContact = daysSince(account?.last_contact_date);
  return (
    <article className="glass rise group grid overflow-hidden rounded-2xl lg:grid-cols-[1fr_280px]" style={{ animationDelay: `${rank * 60}ms` }}>
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-2 -top-6 select-none font-serif text-[120px] leading-none text-white/[0.035]">
          {String(rank).padStart(2, "0")}
        </div>
        <div className="relative flex items-start gap-4">
          <ScoreRing score={entry.score} status={entry.status} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/accounts/${entry.account_id}`} className="font-serif text-[26px] leading-none text-text transition hover:text-hot">
                {entry.company_name}
              </Link>
              <StatusPill status={entry.status} />
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-faint">{STAGE_LABEL[entry.stage]}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SignalChip type={account?.sig_top_type ?? null} />
              <SystemTag />
              {account?.sig_last_signal_at && <span className="text-[11px] text-faint">signal {ago(account.sig_last_signal_at)}</span>}
            </div>
          </div>
        </div>

        <p className="relative mt-4 text-[17px] leading-snug text-text">{entry.summary}</p>
        {entry.why_now && (
          <p className="relative mt-2 text-[13.5px] leading-relaxed text-mute">
            <span className="label mr-2 !text-warm">Why now</span>
            {entry.why_now}
          </p>
        )}

        {entry.outreach_angle && (
          <div className="relative mt-4 rounded-xl border border-hot/25 bg-gradient-to-br from-hot/[0.10] to-transparent p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label !text-hot">Outreach angle · drafted by Gemini</span>
              <CopyButton text={entry.outreach_angle} />
            </div>
            <p className="text-[14px] leading-relaxed text-text/90">{entry.outreach_angle}</p>
          </div>
        )}

        {entry.sources.length > 0 && (
          <ul className="relative mt-4 space-y-1">
            {entry.sources.map((s) => (
              <li key={s.url} className="truncate text-[12px]">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-faint transition hover:text-text">
                  <span className="font-mono text-mute">{s.source ?? "source"}</span> · {s.title}
                  <span className="text-faint"> · {fmtIST(s.published_at, false)}</span> ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Arjun's own view of the account, side by side with what the system found. */}
      <aside className="paper relative flex flex-col gap-3 p-5 pl-10 lg:border-l lg:border-black/10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-ink/60">Arjun&apos;s notebook</span>
          <ArjunTag dark />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">Last contact</div>
          <div className="hand text-[22px] leading-tight">
            {account?.last_contact_date ? `${fmtIST(account.last_contact_date, false)} · ${lastContact}d ago` : "not contacted yet"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">My read</div>
          <div className="hand text-[20px] leading-[26px]">{account?.relationship_read ?? "—"}</div>
        </div>
      </aside>
    </article>
  );
}
