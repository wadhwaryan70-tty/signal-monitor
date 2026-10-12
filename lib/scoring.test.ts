import { describe, expect, it } from "vitest";
import { buildEvents, decay, scoreEvents, statusFor, summariseAccount, type ScoredArticle } from "./scoring";

const NOW = Date.parse("2026-10-12T02:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const art = (p: Partial<ScoredArticle>): ScoredArticle => ({
  url: Math.random().toString(36),
  title: "t",
  source: null,
  published_at: daysAgo(0),
  about_company: true,
  signal_type: "funding",
  strength: 4,
  event_key: null,
  evidence: null,
  ...p,
});

describe("scoring", () => {
  it("halves every three days", () => {
    expect(decay(0)).toBe(1);
    expect(decay(3)).toBeCloseTo(0.5);
    expect(decay(6)).toBeCloseTo(0.25);
  });

  it("counts several articles about one event once", () => {
    const evs = buildEvents(
      [art({ event_key: "series-c", strength: 3 }), art({ event_key: "series-c", strength: 5 }), art({ event_key: "Series-C" })],
      NOW,
    );
    expect(evs).toHaveLength(1);
    expect(evs[0].strength).toBe(5);
    expect(evs[0].articles).toHaveLength(3);
  });

  it("ignores non-signals, off-topic articles and anything older than 14 days", () => {
    const evs = buildEvents(
      [
        art({ signal_type: "none" }),
        art({ about_company: false }),
        art({ published_at: daysAgo(15) }),
        art({ strength: 0 }),
      ],
      NOW,
    );
    expect(evs).toHaveLength(0);
  });

  it("lets a quiet account decay down the list without new news", () => {
    const a = [art({ signal_type: "leadership_hire", strength: 5, published_at: daysAgo(1) })];
    const fresh = summariseAccount(a, NOW);
    const later = summariseAccount(a, NOW + 7 * 86_400_000);
    expect(fresh.score).toBeGreaterThan(later.score);
    expect(fresh.status).toBe("hot");
    expect(later.status).toBe("cooling");
    expect(summariseAccount(a, NOW + 14 * 86_400_000).status).toBe("quiet");
  });

  it("marks hot only with a strong signal from the last three days", () => {
    const strong = [
      art({ signal_type: "leadership_hire", strength: 5, published_at: daysAgo(0.5), event_key: "chro" }),
      art({ signal_type: "headcount_expansion", strength: 4, published_at: daysAgo(1), event_key: "hiring" }),
    ];
    const s = summariseAccount(strong, NOW);
    expect(s.status).toBe("hot");
    expect(statusFor(90, false)).toBe("warm");
    // a single new HR head appointed yesterday is hot on its own
    expect(summariseAccount([art({ signal_type: "leadership_hire", strength: 5, published_at: daysAgo(1) })], NOW).status).toBe("hot");
    expect(scoreEvents([])).toBe(0);
  });
});

import { fitScore, priorityScore, timingFactor } from "./scoring";

describe("fit and priority", () => {
  it("scores a big multi-site shift workforce in a core vertical as a perfect fit", () => {
    expect(fitScore({ frontline_workforce: "20k+", shift_based: true, site_count: "100+", industry: "Logistics" })).toBe(100);
    expect(fitScore({ frontline_workforce: "1k-5k", shift_based: false, site_count: "1-10", industry: "E-commerce" })).toBe(35);
    expect(fitScore({ frontline_workforce: null, shift_based: false, site_count: null, industry: null })).toBe(0);
  });

  it("lets a strong-fit account outrank a slightly hotter weak-fit one", () => {
    expect(priorityScore(50, 100, null)).toBeGreaterThan(priorityScore(60, 30, null));
  });

  it("discounts accounts Arjun has just spoken to", () => {
    expect(timingFactor(1)).toBe(0.75);
    expect(timingFactor(10)).toBe(0.9);
    expect(timingFactor(40)).toBe(1);
    expect(timingFactor(null)).toBe(1);
    expect(priorityScore(80, 100, 2)).toBe(60);
  });
});
