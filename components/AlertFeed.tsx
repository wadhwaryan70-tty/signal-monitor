import Link from "next/link";
import type { Alert } from "@/lib/db";
import { ago } from "@/lib/ui";

const KIND = {
  became_hot: { icon: "🔥", label: "Became hot", tone: "text-hot" },
  warming: { icon: "↑", label: "Warming", tone: "text-warm" },
  strong_signal: { icon: "◉", label: "Strong signal", tone: "text-hot" },
  new_person: { icon: "◆", label: "New person", tone: "text-cool" },
  went_quiet: { icon: "↓", label: "Went quiet", tone: "text-mute" },
} as const;

export function AlertFeed({ alerts }: { alerts: (Alert & { company_name: string })[] }) {
  return (
    <div className="glass flex h-full flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="label">CRM alert feed</span>
        <span className="font-mono text-[10px] text-faint">written to Supabase · alerts table</span>
      </div>
      {alerts.length ? (
        <ul className="divide-y divide-line/70 overflow-y-auto">
          {alerts.map((a) => {
            const k = KIND[a.kind];
            return (
              <li key={a.id} className="flex gap-3 px-5 py-3">
                <span className={`mt-0.5 w-4 shrink-0 text-center text-[13px] ${k.tone}`}>{k.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <span className={`font-mono uppercase tracking-wider ${k.tone}`}>{k.label}</span>
                    <span className="text-faint">· {ago(a.created_at)} · priority {a.priority}</span>
                  </div>
                  <Link href={`/accounts/${a.account_id}`} className="mt-0.5 line-clamp-2 block text-[13px] text-text/90 transition hover:text-hot">
                    {a.message}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid flex-1 place-items-center p-8 text-center text-[13px] text-faint">No alerts yet — they appear after each scan.</div>
      )}
    </div>
  );
}
