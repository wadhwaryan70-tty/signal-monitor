import type { SignalStatus } from "@/lib/db";
import { fmtScore, STATUS } from "@/lib/ui";

export function ScoreRing({ score, status, size = 56 }: { score: number; status: SignalStatus; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const color = STATUS[status].color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2731" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(100, score)) / 100} ${c}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-[13px] font-semibold text-text">{fmtScore(score)}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: SignalStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.text} ${s.ring} ${s.bg}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color, boxShadow: status === "hot" ? `0 0 6px ${s.color}` : undefined }} />
      {s.label}
    </span>
  );
}

export function SignalChip({ type }: { type: string | null }) {
  if (!type || type === "none") return null;
  const labels: Record<string, string> = {
    headcount_expansion: "↗ Headcount expansion",
    leadership_hire: "◆ New people/ops leader",
    digitalisation: "⌁ Workforce digitalisation",
    funding: "₹ Funding round",
    operational_challenge: "⚠ Operational challenge",
  };
  return (
    <span className="inline-flex items-center rounded-md border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-mute">
      {labels[type] ?? type}
    </span>
  );
}

/** Small marker used on every system-written field. */
export function SystemTag() {
  return (
    <span title="Written by the signal system" className="rounded border border-line-2 px-1 font-mono text-[9px] tracking-wider text-faint">
      SYSTEM
    </span>
  );
}

/** Small marker used on every Arjun-owned field. */
export function ArjunTag({ dark = false }: { dark?: boolean }) {
  return (
    <span
      title="Arjun's own field — the system never writes here (enforced by the database)"
      className={`inline-flex items-center gap-1 rounded px-1 font-mono text-[9px] tracking-wider ${dark ? "bg-paper-ink/10 text-paper-ink/70" : "bg-paper/10 text-paper/80"}`}
    >
      <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor" aria-hidden>
        <path d="M2 4V2.6a2 2 0 1 1 4 0V4h.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 1 8.5v-4A.5.5 0 0 1 1.5 4H2Zm1 0h2V2.6a1 1 0 0 0-2 0V4Z" />
      </svg>
      ARJUN
    </span>
  );
}
