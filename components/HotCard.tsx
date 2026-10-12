import Link from "next/link";
import type { Account, HotListEntry } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/product";
import { ago, daysSince, fmtIST, sourceName } from "@/lib/ui";
import { bestApproach } from "@/lib/committee";
import { CommitteeChips } from "./Committee";
import { CopyButton } from "./CopyButton";
import { ArjunTag, ScoreRing, SignalChip, StatusPill } from "./ScoreRing";

function approachLine(entry: HotListEntry) {
  const m = bestApproach(entry.committee);
  if (!m) return null;
  return (
    <div className="mt-2 text-[12.5px] text-mute">
      <span className="label mr-2 !text-good">Approach</span>
      {m.source === "news" ? `${m.name}, ${m.title}` : `your contact — ${m.title}`}
    </div>
  );
}

export function HotCard({ entry, account, rank }: { entry: HotListEntry; account: Account | undefined; rank: number }) {
  const lastContact = daysSince(account?.last_contact_date);
  return (
    <article className="glass rise group grid overflow-hidden rounded-2xl lg:grid-cols-[1fr_280px]" style={{ animationDelay: `${rank * 60}ms` }}>
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-2 -top-6 select-none font-serif text-[120px] leading-none text-white/[0.035]">
          {String(rank).padStart(2, "0")}
        </div>
        <div className="relative flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={entry.priority} status={entry.status} />
            <span className="font-mono text-[9px] uppercase tracking-wider text-faint">priority</span>
          </div>
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
              {account?.sig_last_signal_at && <span className="text-[11px] text-faint">signal {ago(account.sig_last_signal_at)}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-mute">
              <span>signal <b className="text-text">{Math.round(entry.score)}</b></span>
              <span className="text-faint">·</span>
              <span>fit <b className="text-text">{entry.fit}</b></span>
              {lastContact !== null && lastContact <= 14 && <span className="text-faint">· spoke {lastContact}d ago</span>}
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
              <span className="label !text-hot">Suggested angle</span>
              <CopyButton text={entry.outreach_angle} />
            </div>
            <p className="text-[14px] leading-relaxed text-text/90">{entry.outreach_angle}</p>
          </div>
        )}

        {entry.committee.length > 0 && (
          <div className="relative mt-4">
            <div className="label mb-1.5">Buying committee</div>
            <CommitteeChips members={entry.committee} />
            {approachLine(entry)}
          </div>
        )}

        {entry.sources.length > 0 && (
          <ul className="relative mt-4 space-y-1">
            {entry.sources.map((s) => (
              <li key={s.url} className="truncate text-[12px]">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-faint transition hover:text-text">
                  <span className="font-mono text-mute">{sourceName(s.source)}</span> · {s.title}
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
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-ink/60">Your notebook</span>
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
        {account?.arjun_notes && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">Notes</div>
            <div className="hand line-clamp-6 text-[19px] leading-[26px] text-paper-ink/85">{account.arjun_notes}</div>
          </div>
        )}
        <Link href={`/accounts/${entry.account_id}`} className="mt-auto pt-2 font-mono text-[10.5px] uppercase tracking-wider text-paper-ink/50 hover:text-paper-ink">
          Open account →
        </Link>
      </aside>
    </article>
  );
}
