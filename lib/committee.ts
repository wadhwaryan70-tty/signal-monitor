// Account-level buying committee: people named in the news (extracted by Gemini) plus the contact
// Arjun already has in his CRM. Individual mentions are merged into one entry per person.

import type { Account, Article, CommitteeMember, Persona } from "./db";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, " ").trim();

export function personaForTitle(title: string): Persona {
  if (/\b(chro|cpo|chief|ceo|coo|cfo|founder|md|managing director|president)\b/i.test(title)) return "decision_maker";
  if (/\b(vp|head|director|gm|general manager|plant|operations|ops|hr)\b/i.test(title)) return "champion";
  return "influencer";
}

export function buildCommittee(account: Pick<Account, "key_contact">, articles: Pick<Article, "people" | "url" | "published_at" | "about_company">[]): CommitteeMember[] {
  const byName = new Map<string, CommitteeMember>();
  for (const a of [...articles].sort((x, y) => (y.published_at ?? "").localeCompare(x.published_at ?? ""))) {
    if (!a.about_company) continue;
    for (const p of a.people ?? []) {
      const key = norm(p.name);
      if (!key || byName.has(key)) continue;
      byName.set(key, { ...p, source: "news", url: a.url, at: a.published_at });
    }
  }
  const order: Record<Persona, number> = { decision_maker: 0, champion: 1, influencer: 2 };
  const news = [...byName.values()].sort((x, y) => order[x.persona] - order[y.persona]);
  const crm: CommitteeMember[] = account.key_contact
    ? [{ name: "Your contact", title: account.key_contact, persona: personaForTitle(account.key_contact), source: "crm" }]
    : [];
  return [...news, ...crm];
}

export const PERSONA_LABEL: Record<Persona, string> = {
  decision_maker: "Decision-maker",
  champion: "Champion",
  influencer: "Influencer",
};
