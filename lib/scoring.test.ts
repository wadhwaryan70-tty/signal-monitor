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
    expect(fresh.status).toBe("warm");
    expect(later.status).toBe("cooling");
  });

  it("marks hot only with a strong signal from the last three days", () => {
    const strong = [
      art({ signal_type: "leadership_hire", strength: 5, published_at: daysAgo(0.5), event_key: "chro" }),
      art({ signal_type: "headcount_expansion", strength: 4, published_at: daysAgo(1), event_key: "hiring" }),
    ];
    const s = summariseAccount(strong, NOW);
    expect(s.status).toBe("hot");
    expect(statusFor(90, false)).toBe("warm");
    expect(scoreEvents([])).toBe(0);
  });
});
