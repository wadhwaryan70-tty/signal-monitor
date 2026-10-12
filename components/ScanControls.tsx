"use client";

// Manual "run now" controls. A scan takes about a minute, so we show progress while it runs,
// then refresh the page with the new data.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STAGES = [
  "Checking the latest news for every account",
  "Skipping stories you've already seen",
  "Picking out real buying triggers",
  "Ranking your accounts",
  "Updating your radar and alerts",
  "Preparing your Hot List",
];

interface Result {
  status: string;
  scanned: number;
  fetched: number;
  fresh: number;
  newSignals: number;
  manualUntouched: boolean;
  hotList: number;
  alerts: number;
  email: { status: string; detail: string };
  errors: string[];
}

export function ScanControls({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState<null | "scan" | "email">(null);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 9000);
    return () => clearInterval(t);
  }, [running]);

  async function go(sendEmail: boolean) {
    setStage(0);
    setRunning(sendEmail ? "email" : "scan");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sendEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setRunning(null);
    }
  }

  if (!signedIn)
    return (
      <a href="/login" className="inline-flex items-center gap-2 rounded-lg border border-line-2 px-4 py-2.5 text-sm text-mute transition hover:border-hot/50 hover:text-text">
        Sign in to run a scan now
      </a>
    );

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={!!running}
          onClick={() => go(false)}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-hot px-4 py-2.5 text-sm font-medium text-ink shadow-[0_0_24px_-4px_#ff5a36] transition hover:brightness-110 disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={running === "scan" ? "animate-spin" : ""}>
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
          </svg>
          {running === "scan" ? "Scanning…" : "Scan now"}
        </button>
        <button
          disabled={!!running}
          onClick={() => go(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-line-2 bg-panel-2 px-4 py-2.5 text-sm text-text transition hover:border-hot/50 disabled:opacity-60"
        >
          {running === "email" ? "Scanning + emailing…" : "Scan + email Hot List"}
        </button>
      </div>

      {running && (
        <div className="glass mt-3 rounded-lg p-3">
          <ol className="space-y-1.5">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 text-[12px] transition ${i < stage ? "text-mute" : i === stage ? "text-text" : "text-faint"}`}>
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${i < stage ? "bg-good/20 text-good" : i === stage ? "bg-hot/20 text-hot" : "bg-white/5"}`}>
                  {i < stage ? "✓" : i === stage ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hot" /> : ""}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <div className="shimmer mt-3 h-0.5 rounded" />
        </div>
      )}

      {result && (
        <div className="glass rise mt-3 rounded-lg p-3 text-[12px] text-mute">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><b className="text-text">{result.scanned}</b> accounts scanned</span>
            <span><b className="text-text">{result.fresh}</b> new stories checked</span>
            <span><b className="text-text">{result.newSignals}</b> new triggers</span>
            <span><b className="text-text">{result.hotList}</b> on the Hot List</span>
            <span><b className="text-text">{result.alerts}</b> new alerts</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4">
            <span className={result.manualUntouched ? "text-good" : "text-hot"}>
              {result.manualUntouched ? "✓ Your notes and contact dates unchanged" : "✗ Your notes changed during the scan"}
            </span>
            {result.email.status !== "skipped" && (
              <span className={result.email.status === "sent" ? "text-good" : "text-hot"}>
                {result.email.status === "sent" ? "✓ Hot List emailed" : `✗ Email: ${result.email.detail}`}
              </span>
            )}
          </div>
          {result.errors.length > 0 && <div className="mt-1.5 text-warm">{result.errors.length} account(s) couldn&apos;t be checked this time — they&apos;ll be retried on the next scan.</div>}
        </div>
      )}
      {error && <div className="mt-3 rounded-lg border border-hot/30 bg-hot/10 p-3 text-[12px] text-hot">{error}</div>}
    </div>
  );
}
