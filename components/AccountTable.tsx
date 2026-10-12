import Link from "next/link";
import type { Account } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/product";
import { fitScore, livePriority } from "@/lib/scoring";
import { ago, daysSince, fmtIST, fmtScore, STATUS } from "@/lib/ui";
import { ArjunTag, SignalChip, StatusPill, SystemTag } from "./ScoreRing";

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, value)}%`, background: color }} />
    </div>
  );
}

export function AccountTable({ accounts }: { accounts: Account[] }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[10.5px]">
              <th colSpan={6} className="border-b border-line px-4 pb-2 pt-4">
                <span className="flex items-center gap-2"><span className="label">What the system found</span><SystemTag /></span>
              </th>
              <th colSpan={2} className="paper-flat border-b border-paper-line px-4 pb-2 pt-4">
                <span className="flex items-center gap-2">
                  <span className="font-mono uppercase tracking-[0.14em] text-paper-ink/60">Arjun&apos;s notebook · never written by the system</span>
                  <ArjunTag dark />
                </span>
              </th>
            </tr>
            <tr className="label border-b border-line">
              <th className="w-10 px-4 py-2 font-normal">#</th>
              <th className="px-2 py-2 font-normal">Account</th>
              <th className="px-2 py-2 font-normal">Priority</th>
              <th className="px-2 py-2 font-normal">Readiness · Fit</th>
              <th className="px-2 py-2 font-normal">What changed</th>
              <th className="px-2 py-2 font-normal">Last signal</th>
              <th className="paper-flat px-4 py-2 font-normal !text-paper-ink/50">Last contact</th>
              <th className="paper-flat px-4 py-2 font-normal !text-paper-ink/50">My read</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => {
              const s = STATUS[a.sig_status];
              const contactDays = daysSince(a.last_contact_date);
              return (
                <tr key={a.id} className={`group border-b border-line/70 transition hover:bg-white/[0.025] ${a.sig_status === "quiet" ? "[&>td:not(.paper-flat)]:opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-mono text-[12px] text-faint">{i + 1}</td>
                  <td className="px-2 py-3">
                    <Link href={`/accounts/${a.id}`} className="font-medium text-text transition group-hover:text-hot">
                      {a.company_name}
                    </Link>
                    <div className="text-[11px] text-faint">{STAGE_LABEL[a.stage]} · {a.industry}</div>
                  </td>
                  <td className="w-32 px-2 py-3">
                    <div className="font-serif text-[26px] leading-none" style={{ color: a.sig_status === "quiet" ? undefined : s.color }}>
                      {fmtScore(livePriority(a))}
                    </div>
                    <div className="mt-1"><StatusPill status={a.sig_status} /></div>
                  </td>
                  <td className="w-36 px-2 py-3 font-mono text-[11px] text-mute">
                    <div className="flex justify-between"><span>readiness</span><span className="text-text">{fmtScore(a.sig_score)}</span></div>
                    <Bar value={a.sig_score} color={s.color} />
                    <div className="mt-1.5 flex justify-between"><span>fit</span><span className="text-text">{fitScore(a)}</span></div>
                    <Bar value={fitScore(a)} color="#c084fc" />
                  </td>
                  <td className="max-w-[340px] px-2 py-3">
                    {a.sig_summary ? (
                      <>
                        <div className="line-clamp-2 text-text/90">{a.sig_summary}</div>
                        <div className="mt-1"><SignalChip type={a.sig_top_type} /></div>
                      </>
                    ) : (
                      <span className="text-faint">No trigger in the last 14 days</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-[12px] text-mute">
                    {a.sig_last_signal_at ? ago(a.sig_last_signal_at) : "—"}
                    {a.sig_events_14d > 0 && <div className="text-[11px] text-faint">{a.sig_events_14d} event{a.sig_events_14d > 1 ? "s" : ""} / 14d</div>}
                  </td>
                  <td className="paper-flat whitespace-nowrap border-b border-paper-line/60 px-4 py-3">
                    <div className="hand text-[19px] leading-none">{a.last_contact_date ? fmtIST(a.last_contact_date, false) : "—"}</div>
                    {contactDays !== null && <div className={`text-[10.5px] ${contactDays > 30 ? "text-[#b4441f]" : "text-paper-ink/50"}`}>{contactDays}d ago</div>}
                  </td>
                  <td className="paper-flat max-w-[260px] border-b border-paper-line/60 px-4 py-3">
                    <div className="hand line-clamp-2 text-[18px] leading-[20px]">{a.relationship_read ?? "—"}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
