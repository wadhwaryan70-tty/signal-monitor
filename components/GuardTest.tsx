"use client";

// Live proof of the core guarantee: ask the database to let the signal system overwrite one of
// Arjun's notes, and show it being refused. Runs in a rolled-back sub-transaction.

import { useState } from "react";

interface R { company?: string; blocked?: boolean; message?: string; code?: string; unchanged?: boolean; error?: string }

export function GuardTest() {
  const [r, setR] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        onClick={async () => {
          setBusy(true);
          setR(null);
          const res = await fetch("/api/guard-test", { method: "POST" });
          setR(await res.json().catch(() => ({ error: "Request failed" })));
          setBusy(false);
        }}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-hot/40 bg-hot/10 px-4 py-2.5 text-sm text-text transition hover:bg-hot/20 disabled:opacity-60"
      >
        {busy ? "Attempting overwrite…" : "▶ Make the system try to overwrite Arjun's notes"}
      </button>
      {r && (
        <div className="rise mt-3 overflow-hidden rounded-xl border border-line-2 bg-black/60 font-mono text-[12px] leading-relaxed">
          <div className="border-b border-line px-3 py-1.5 text-faint">postgres · writer = signal_system</div>
          <div className="space-y-1 p-3">
            {r.error ? (
              <div className="text-hot">{r.error}</div>
            ) : (
              <>
                <div className="text-mute">&gt; UPDATE accounts SET arjun_notes = … WHERE company_name = &apos;{r.company}&apos;;</div>
                <div className={r.blocked ? "text-hot" : "text-warm"}>
                  {r.blocked ? `ERROR ${r.code}: ${r.message}` : r.message}
                </div>
                <div className={r.blocked && r.unchanged ? "text-good" : "text-warm"}>
                  {r.blocked && r.unchanged ? "✓ Blocked by the database. Arjun's fields fingerprint unchanged." : "⚠ Check the guard."}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
