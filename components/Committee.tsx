import type { CommitteeMember } from "@/lib/db";
import { PERSONA_LABEL } from "@/lib/committee";

const TONE = {
  decision_maker: "border-hot/40 bg-hot/10 text-hot",
  champion: "border-warm/40 bg-warm/10 text-warm",
  influencer: "border-cool/40 bg-cool/10 text-cool",
} as const;

export function CommitteeChips({ members, max = 4 }: { members: CommitteeMember[]; max?: number }) {
  if (!members.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.slice(0, max).map((m) => (
        <span key={`${m.source}-${m.name}-${m.title}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${TONE[m.persona]}`} title={`${PERSONA_LABEL[m.persona]} · ${m.source === "news" ? "named in the news" : "from your CRM"}`}>
          <span className="font-medium">{m.name}</span>
          <span className="text-text/60">{m.title}</span>
          {m.source === "crm" && <span className="font-mono text-[9px] opacity-70">CRM</span>}
        </span>
      ))}
    </div>
  );
}

export function CommitteePanel({ members }: { members: CommitteeMember[] }) {
  const groups = (["decision_maker", "champion", "influencer"] as const).map((p) => ({ p, list: members.filter((m) => m.persona === p) }));
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {groups.map(({ p, list }) => (
        <div key={p} className="rounded-xl border border-line bg-panel-2/50 p-3">
          <div className={`font-mono text-[10px] uppercase tracking-[0.14em] ${TONE[p].split(" ").pop()}`}>{PERSONA_LABEL[p]}</div>
          {list.length ? (
            <ul className="mt-2 space-y-2">
              {list.map((m) => (
                <li key={`${m.name}-${m.title}`} className="text-[13px]">
                  <div className="text-text">{m.name}</div>
                  <div className="text-[11.5px] text-mute">{m.title}</div>
                  <div className="text-[10.5px] text-faint">
                    {m.source === "crm" ? "From your CRM" : m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="hover:text-mute">Named in the news ↗</a> : "Named in the news"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 text-[12px] text-faint">Not identified yet</div>
          )}
        </div>
      ))}
    </div>
  );
}
