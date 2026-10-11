import "server-only";

// Live news via Google News RSS (free, no key, India edition). Two searches per company: a plain one
// and one biased toward trigger words, merged and de-duplicated. LinkedIn is deliberately out of scope —
// it has no public feed and scraping it breaks its terms; press and news cover the same trigger types.

import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  url: string;
  title: string;
  source: string | null;
  published_at: string | null;
}

export const LOOKBACK_DAYS = 14;
const MAX_PER_ACCOUNT = 25;
const TRIGGER_WORDS =
  "hiring OR hires OR appoints OR appointed OR CHRO OR \"chief people officer\" OR funding OR raises OR expansion OR expands OR workforce OR jobs OR layoffs OR attrition OR warehouse OR plant OR digital OR automation OR strike";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export function feedUrl(query: string): string {
  const q = encodeURIComponent(`${query} when:${LOOKBACK_DAYS}d`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
}

/** "Headline text - Publisher" → "Headline text" when the publisher matches the source tag. */
export function cleanTitle(title: string, source: string | null): string {
  const t = title.trim();
  if (source && t.endsWith(` - ${source}`)) return t.slice(0, -(source.length + 3)).trim();
  return t;
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function parseFeed(xml: string): NewsItem[] {
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } } };
  const raw = doc.rss?.channel?.item;
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Record<string, unknown>[];
  return items
    .map((it) => {
      const src = it.source as { "#text"?: string } | string | undefined;
      const source = (typeof src === "string" ? src : src?.["#text"])?.trim() || null;
      const pub = typeof it.pubDate === "string" ? new Date(it.pubDate) : null;
      return {
        url: String(it.link ?? "").trim(),
        title: cleanTitle(String(it.title ?? ""), source),
        source,
        published_at: pub && !Number.isNaN(pub.getTime()) ? pub.toISOString() : null,
      };
    })
    .filter((i) => i.url && i.title);
}

async function fetchFeed(query: string): Promise<NewsItem[]> {
  const res = await fetch(feedUrl(query), {
    headers: { "user-agent": "Mozilla/5.0 (compatible; AccountSignalMonitor/1.0)" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google News returned HTTP ${res.status}`);
  return parseFeed(await res.text());
}

/** Merges both searches, drops duplicate links and near-identical headlines, newest first. */
export function mergeItems(lists: NewsItem[][], now = Date.now()): NewsItem[] {
  const cutoff = now - LOOKBACK_DAYS * 86_400_000;
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of lists.flat()) {
    const key = normalise(item.title);
    if (seenUrl.has(item.url) || seenTitle.has(key)) continue;
    if (item.published_at && Date.parse(item.published_at) < cutoff) continue;
    seenUrl.add(item.url);
    seenTitle.add(key);
    out.push(item);
  }
  out.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  return out.slice(0, MAX_PER_ACCOUNT);
}

export async function fetchCompanyNews(companyName: string, override: string | null): Promise<NewsItem[]> {
  const base = override?.trim() || `"${companyName}"`;
  const settled = await Promise.allSettled([fetchFeed(base), fetchFeed(`${base} (${TRIGGER_WORDS})`)]);
  const ok = settled.filter((s): s is PromiseFulfilledResult<NewsItem[]> => s.status === "fulfilled");
  if (!ok.length) throw (settled[0] as PromiseRejectedResult).reason;
  return mergeItems(ok.map((s) => s.value));
}
