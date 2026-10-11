// Presentation helpers shared by server and client components.

import type { SignalStatus } from "./db";

export const STATUS: Record<SignalStatus, { label: string; color: string; text: string; ring: string; bg: string }> = {
  hot: { label: "Hot", color: "#ff5a36", text: "text-hot", ring: "ring-hot/40", bg: "bg-hot/12" },
  warm: { label: "Warm", color: "#ffb020", text: "text-warm", ring: "ring-warm/40", bg: "bg-warm/12" },
  cooling: { label: "Cooling", color: "#5b8def", text: "text-cool", ring: "ring-cool/40", bg: "bg-cool/12" },
  quiet: { label: "Quiet", color: "#4b5563", text: "text-mute", ring: "ring-line-2", bg: "bg-white/[0.03]" },
};

export const SIGNAL_ICON: Record<string, string> = {
  headcount_expansion: "↗",
  leadership_hire: "◆",
  digitalisation: "⌁",
  funding: "₹",
  operational_challenge: "⚠",
  none: "·",
};

const IST = "Asia/Kolkata";

export function fmtIST(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function daysSince(date: string | null | undefined, now = Date.now()): number | null {
  if (!date) return null;
  return Math.floor((now - Date.parse(date)) / 86_400_000);
}

/** Next Monday/Thursday 07:30 IST (02:00 UTC), matching vercel.json. */
export function nextScheduledRun(now = new Date()): Date {
  for (let i = 0; i < 8; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, 2, 0, 0));
    const dow = d.getUTCDay();
    if ((dow === 1 || dow === 4) && d.getTime() > now.getTime()) return d;
  }
  return now;
}

export const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
