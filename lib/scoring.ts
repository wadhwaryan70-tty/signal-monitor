// Deterministic account scoring. Gemini only classifies articles; the score itself is plain arithmetic
// so Arjun can see exactly why an account ranks where it does.
//
//   event points = strength (1–5) × type weight × recency decay      (decay halves every 3 days)
//   score        = sum of the 3 strongest events × 10, capped at 100
//
// Several articles about the same event (same event_key) count once, at their strongest.
// Accounts with no fresh events decay toward 0 on every run, so quiet accounts sink on their own.

import type { Person, SignalStatus, SignalType } from "./db";

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

// One fresh, strongest-possible trigger (a new CHRO today: 5 × 1.2 = 6 points) scores 60 — hot on its own.
// Two or three strong fresh events reach 100.
const SCALE = 100 / 10;
export const HOT_AT = 45;
export const WARM_AT = 20;
export const COOLING_AT = 5;

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
  people?: Person[];
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
  if (score >= HOT_AT && fresh) return "hot";
  if (score >= WARM_AT) return "warm";
  if (score >= COOLING_AT) return "cooling";
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

// ── Fit (how well the account matches the product) ─────────────────────────────
// From Arjun's own CRM firmographics. Max 100.

export type Workforce = "<1k" | "1k-5k" | "5k-20k" | "20k+";
export type Sites = "1-10" | "10-100" | "100+";

export const FIT_POINTS = {
  workforce: { "<1k": 10, "1k-5k": 20, "5k-20k": 30, "20k+": 40 } as Record<Workforce, number>,
  shift: 25,
  sites: { "1-10": 5, "10-100": 15, "100+": 25 } as Record<Sites, number>,
  coreVertical: 10,
};

/** Industries where frontline, shift-based work is the norm. */
const CORE_VERTICALS = /logistic|commerce|delivery|retail|grocery|health|hospital|manufactur|staffing|facilit|food|warehous/i;

export interface FitInputs {
  frontline_workforce: Workforce | null;
  shift_based: boolean;
  site_count: Sites | null;
  industry: string | null;
}

export function fitBreakdown(a: FitInputs) {
  const parts = {
    workforce: a.frontline_workforce ? FIT_POINTS.workforce[a.frontline_workforce] : 0,
    shift: a.shift_based ? FIT_POINTS.shift : 0,
    sites: a.site_count ? FIT_POINTS.sites[a.site_count] : 0,
    vertical: a.industry && CORE_VERTICALS.test(a.industry) ? FIT_POINTS.coreVertical : 0,
  };
  return { ...parts, total: parts.workforce + parts.shift + parts.sites + parts.vertical };
}

export const fitScore = (a: FitInputs) => fitBreakdown(a).total;

// ── Priority (who to contact first) ────────────────────────────────────────────
//   priority = readiness × fit factor × timing factor
//   fit factor    = 0.5 + 0.5 × fit/100        → a perfect-fit account keeps its full readiness, a poor fit loses up to half
//   timing factor = from Arjun's last-contact date: he just spoke to them → less urgent to act on the signal

export function timingFactor(daysSinceContact: number | null): number {
  if (daysSinceContact === null) return 1;
  if (daysSinceContact <= 3) return 0.75;
  if (daysSinceContact <= 14) return 0.9;
  return 1;
}

export function priorityScore(readiness: number, fit: number, daysSinceContact: number | null): number {
  const p = readiness * (0.5 + 0.5 * Math.min(100, fit) / 100) * timingFactor(daysSinceContact);
  return Math.round(Math.min(100, p) * 10) / 10;
}

export function daysSinceDate(date: string | null, now = Date.now()): number | null {
  return date ? Math.max(0, Math.floor((now - Date.parse(date)) / 86_400_000)) : null;
}

/** Live priority: readiness × fit × timing, using Arjun's current last-contact date. */
export const livePriority = (a: FitInputs & { sig_score: number; last_contact_date: string | null }, now = Date.now()) =>
  priorityScore(a.sig_score, fitScore(a), daysSinceDate(a.last_contact_date, now));
