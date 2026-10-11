// Deterministic account scoring. Gemini only classifies articles; the score itself is plain arithmetic
// so Arjun can see exactly why an account ranks where it does.
//
//   event points = strength (1–5) × type weight × recency decay      (decay halves every 3 days)
//   score        = sum of the 3 strongest events, scaled to 0–100
//
// Several articles about the same event (same event_key) count once, at their strongest.
// Accounts with no fresh events decay toward 0 on every run, so quiet accounts sink on their own.

import type { SignalStatus, SignalType } from "./db";

export const HALF_LIFE_DAYS = 3;
export const HOT_WINDOW_DAYS = 3;
export const EVENT_WINDOW_DAYS = 14;

export const TYPE_WEIGHT: Record<Exclude<SignalType, "none">, number> = {
  leadership_hire: 1.2,
  headcount_expansion: 1.1,
  funding: 1.0,
  operational_challenge: 0.9,
  digitalisation: 0.8,
};

// Three fresh, strongest-possible leadership events would score 18; 15 points already maps to 100.
const SCALE = 100 / 15;

export interface ScoredArticle {
  url: string;
  title: string;
  source: string | null;
  published_at: string | null;
  first_seen_at?: string;
  about_company: boolean;
  signal_type: SignalType;
  strength: number;
  event_key: string | null;
  evidence: string | null;
}

export interface SignalEvent {
  key: string;
  type: Exclude<SignalType, "none">;
  strength: number;
  at: string;
  points: number;
  articles: ScoredArticle[];
}

export const ageDays = (iso: string, now: number) => Math.max(0, (now - Date.parse(iso)) / 86_400_000);
export const decay = (days: number) => Math.pow(0.5, days / HALF_LIFE_DAYS);

/** Groups signal articles into events and scores each one. Strongest first. */
export function buildEvents(articles: ScoredArticle[], now = Date.now()): SignalEvent[] {
  const byKey = new Map<string, SignalEvent>();
  for (const a of articles) {
    if (!a.about_company || a.signal_type === "none" || a.strength < 1) continue;
    const at = a.published_at ?? a.first_seen_at;
    if (!at || ageDays(at, now) > EVENT_WINDOW_DAYS) continue;
    const key = (a.event_key?.trim().toLowerCase() || a.url) + "|" + a.signal_type;
    const points = Math.min(5, a.strength) * TYPE_WEIGHT[a.signal_type] * decay(ageDays(at, now));
    const ev = byKey.get(key);
    if (!ev) {
      byKey.set(key, { key, type: a.signal_type, strength: a.strength, at, points, articles: [a] });
    } else {
      ev.articles.push(a);
      if (points > ev.points) Object.assign(ev, { strength: a.strength, at, points });
    }
  }
  return [...byKey.values()].sort((x, y) => y.points - x.points);
}

export function scoreEvents(events: SignalEvent[]): number {
  const raw = events.slice(0, 3).reduce((s, e) => s + e.points, 0);
  return Math.round(Math.min(100, raw * SCALE) * 10) / 10;
}

export function hasFreshEvent(events: SignalEvent[], now = Date.now()): boolean {
  return events.some((e) => ageDays(e.at, now) <= HOT_WINDOW_DAYS);
}

export function statusFor(score: number, fresh: boolean): SignalStatus {
  if (score >= 40 && fresh) return "hot";
  if (score >= 15) return "warm";
  if (score >= 3) return "cooling";
  return "quiet";
}

export function summariseAccount(articles: ScoredArticle[], now = Date.now()) {
  const events = buildEvents(articles, now);
  const score = scoreEvents(events);
  const fresh = hasFreshEvent(events, now);
  const lastSignalAt = events.reduce<string | null>((m, e) => (!m || e.at > m ? e.at : m), null);
  return {
    events,
    score,
    fresh,
    status: statusFor(score, fresh),
    lastSignalAt,
    topType: events[0]?.type ?? null,
  };
}
