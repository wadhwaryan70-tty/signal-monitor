import "server-only";

// One scan: fetch live news for every account → classify new headlines with Gemini → score
// deterministically → write sig_ columns only → build the Hot List → (optionally) email it.
// Arjun's columns are fingerprinted before and after, and the result is recorded on the run.

import { analyseAccount, applyClassifications, type Analysis } from "./analyse";
import {
  applySignalUpdate,
  articlesFor,
  insertArticles,
  knownUrls,
  listAccounts,
  manualFingerprint,
  signalArticlesSince,
  startRun,
  updateRun,
  type Account,
  type HotListEntry,
  type Run,
  type SignalPatch,
} from "./db";
import { sendHotList } from "./email";
import { fetchCompanyNews, type NewsItem } from "./news";
import { SIGNAL_LABEL } from "./product";
import { EVENT_WINDOW_DAYS, HOT_WINDOW_DAYS, summariseAccount, type ScoredArticle } from "./scoring";

const CONCURRENCY = 3;
export const HOT_LIST_SIZE = 10;

const daysAgoIso = (d: number, now = Date.now()) => new Date(now - d * 86_400_000).toISOString();

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  }));
}

interface AccountResult {
  fetched: number;
  fresh: number;
  newSignals: number;
}

async function scanAccount(account: Account, runId: string, errors: string[]): Promise<AccountResult> {
  let news: NewsItem[] = [];
  try {
    news = await fetchCompanyNews(account.company_name, account.news_query);
  } catch (e) {
    errors.push(`${account.company_name}: news fetch failed — ${e instanceof Error ? e.message : "unknown"}`);
  }
  const known = await knownUrls(account.id);
  const fresh = news.filter((n) => !known.has(n.url));
  const previous: ScoredArticle[] = await articlesFor(account.id, daysAgoIso(EVENT_WINDOW_DAYS));

  let analysis: Analysis | null = null;
  let classified: ScoredArticle[] = [];
  if (fresh.length) {
    try {
      analysis = await analyseAccount(account, fresh, previous);
      classified = applyClassifications(fresh, analysis.classifications);
      await insertArticles(
        classified.map((c) => ({ ...c, account_id: account.id })),
        runId,
      );
    } catch (e) {
      // Not saved, so these headlines are retried on the next run.
      errors.push(`${account.company_name}: ${e instanceof Error ? e.message : "analysis failed"}`);
    }
  }

  // Re-score from everything known — this is what makes quiet accounts decay even with no new news.
  const s = summariseAccount([...previous, ...classified]);
  const patch: SignalPatch = {
    score: s.score,
    status: s.status,
    last_signal_at: s.lastSignalAt,
    events_14d: s.events.length,
    top_type: s.topType,
  };
  if (!s.events.length) {
    Object.assign(patch, { summary: null, why_now: null, outreach_angle: null });
  } else if (analysis) {
    const top = s.events[0];
    patch.summary = analysis.summary.trim() || `${SIGNAL_LABEL[top.type]}: ${top.articles[0].evidence ?? top.articles[0].title}`;
    if (analysis.why_now.trim()) patch.why_now = analysis.why_now.trim();
    if (analysis.outreach_angle.trim()) patch.outreach_angle = analysis.outreach_angle.trim();
  }
  await applySignalUpdate(account.id, patch, runId);

  return {
    fetched: news.length,
    fresh: classified.length,
    newSignals: classified.filter((c) => c.about_company && c.signal_type !== "none").length,
  };
}

/** Top accounts with a real signal in the last three days, strongest first. Quiet accounts are left out. */
export async function buildHotList(now = Date.now()): Promise<HotListEntry[]> {
  const [accounts, recent] = await Promise.all([listAccounts(), signalArticlesSince(daysAgoIso(HOT_WINDOW_DAYS, now))]);
  const byAccount = new Map<string, typeof recent>();
  for (const a of recent) byAccount.set(a.account_id, [...(byAccount.get(a.account_id) ?? []), a]);
  return accounts
    .filter((a) => byAccount.has(a.id) && a.sig_score > 0)
    .sort((a, b) => b.sig_score - a.sig_score)
    .slice(0, HOT_LIST_SIZE)
    .map((a) => {
      const arts = byAccount.get(a.id)!.sort((x, y) => y.strength - x.strength);
      return {
        account_id: a.id,
        company_name: a.company_name,
        stage: a.stage,
        score: a.sig_score,
        status: a.sig_status,
        summary: a.sig_summary ?? arts[0].evidence ?? arts[0].title,
        why_now: a.sig_why_now,
        outreach_angle: a.sig_outreach_angle ?? "",
        sources: arts.slice(0, 3).map((x) => ({ title: x.title, url: x.url, source: x.source, published_at: x.published_at })),
      };
    });
}

export async function runScan(opts: { trigger: Run["trigger"]; sendEmail: boolean }) {
  const before = await manualFingerprint();
  const runId = await startRun(opts.trigger, before);
  const errors: string[] = [];
  const totals = { scanned: 0, fetched: 0, fresh: 0, newSignals: 0 };
  try {
    const accounts = await listAccounts();
    await pool(accounts, CONCURRENCY, async (account) => {
      try {
        const r = await scanAccount(account, runId, errors);
        totals.scanned++;
        totals.fetched += r.fetched;
        totals.fresh += r.fresh;
        totals.newSignals += r.newSignals;
      } catch (e) {
        errors.push(`${account.company_name}: ${e instanceof Error ? e.message : "scan failed"}`);
      }
    });

    const after = await manualFingerprint();
    const hotList = await buildHotList();
    let email: { status: string; detail: string } = { status: "skipped", detail: "Scan only — no email requested." };
    if (opts.sendEmail) {
      const sent = await sendHotList(hotList, runId);
      email = sent.ok ? { status: "sent", detail: `Resend id ${sent.id} → ${sent.to}` } : { status: "failed", detail: sent.error };
    }
    const status = totals.scanned === 0 ? "failed" : errors.length ? "partial" : "ok";
    await updateRun(runId, {
      finished_at: new Date().toISOString(),
      status,
      accounts_scanned: totals.scanned,
      articles_fetched: totals.fetched,
      articles_new: totals.fresh,
      signals_new: totals.newSignals,
      manual_fp_after: after,
      manual_untouched: after === before,
      errors,
      email_status: email.status,
      email_detail: email.detail,
      hot_list: hotList,
    });
    return { runId, status, ...totals, manualUntouched: after === before, hotList: hotList.length, email, errors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Scan failed";
    await updateRun(runId, { finished_at: new Date().toISOString(), status: "failed", errors: [...errors, msg] }).catch(() => {});
    throw e;
  }
}
