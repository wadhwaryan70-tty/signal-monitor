// The four stages of the system, with live numbers from the database.

const STAGES = [
  {
    n: "01",
    title: "Collect",
    color: "#ffb020",
    body: "Internal CRM (stage, firmographics, last contact) + external live news for every account.",
  },
  {
    n: "02",
    title: "Identify & group",
    color: "#5b8def",
    body: "Gemini Flash reads each headline, merges duplicates into account-level events and names the buying committee.",
  },
  {
    n: "03",
    title: "Score & prioritise",
    color: "#ff5a36",
    body: "Readiness (fresh triggers) × fit (frontline scale) × timing (your last contact) = who to call first.",
  },
  {
    n: "04",
    title: "Act",
    color: "#34d399",
    body: "Alerts land in your CRM; the Hot List email goes out Mon & Thu. You decide and reach out.",
  },
] as const;

export function PipelineStrip({ stats }: { stats: { metric: string; label: string }[] }) {
  return (
    <div className="glass relative grid overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((s, i) => (
        <div key={s.n} className={`relative p-5 ${i > 0 ? "border-t border-line sm:border-t-0 lg:border-l" : ""} ${i === 2 ? "sm:border-t lg:border-t-0" : ""} ${i === 3 ? "sm:border-l sm:border-t lg:border-t-0" : ""} ${i === 1 ? "sm:border-l" : ""}`}>
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: s.color }}>
              {s.n} · {s.title}
            </span>
          </div>
          <div className="mt-3 font-serif text-[34px] leading-none text-text">{stats[i]?.metric}</div>
          <div className="mt-1 text-[11.5px] text-mute">{stats[i]?.label}</div>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">{s.body}</p>
          {i < 3 && <div className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-r border-t border-line-2 bg-panel lg:block" />}
        </div>
      ))}
    </div>
  );
}
