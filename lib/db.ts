import "server-only";

// All database access. Uses the Supabase service-role key, which exists only on the server.
// RLS denies the public roles everything, so this module is the only way in.
// Accounts are never updated with a plain .update(): signal writes go through apply_signal_update(),
// Arjun's edits through update_arjun_fields(). See supabase/setup.sql for the column guard.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Sites, Workforce } from "./scoring";

let client: SupabaseClient | null = null;

/** Accepts a URL pasted with a path (e.g. .../rest/v1) and keeps only the origin. */
export function normaliseSupabaseUrl(raw: string): string {
  return new URL(raw.trim()).origin;
}

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server.");
  client = createClient(normaliseSupabaseUrl(url), key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export type Stage = "outreach" | "pilot" | "expansion";
export type SignalStatus = "hot" | "warm" | "cooling" | "quiet";
export type SignalType =
  | "headcount_expansion"
  | "leadership_hire"
  | "digitalisation"
  | "funding"
  | "operational_challenge"
  | "none";

export interface Account {
  id: string;
  company_name: string;
  news_query: string | null;
  industry: string | null;
  hq_city: string | null;
  frontline_workforce: Workforce | null;
  shift_based: boolean;
  site_count: Sites | null;
  stage: Stage;
  key_contact: string | null;
  arjun_notes: string | null;
  last_contact_date: string | null;
  relationship_read: string | null;
  sig_score: number;
  sig_fit_score: number;
  sig_priority: number;
  sig_status: SignalStatus;
  sig_top_type: SignalType | null;
  sig_summary: string | null;
  sig_why_now: string | null;
  sig_outreach_angle: string | null;
  sig_last_signal_at: string | null;
  sig_events_14d: number;
  sig_last_scanned_at: string | null;
}

export interface Article {
  id: number;
  account_id: string;
  url: string;
  title: string;
  source: string | null;
  published_at: string | null;
  first_seen_at: string;
  about_company: boolean;
  signal_type: SignalType;
  strength: number;
  event_key: string | null;
  evidence: string | null;
  people: Person[];
}

export type Persona = "decision_maker" | "champion" | "influencer";
export interface Person {
  name: string;
  title: string;
  persona: Persona;
}

export interface CommitteeMember extends Person {
  source: "news" | "crm";
  url?: string;
  at?: string | null;
}

export interface HotListEntry {
  account_id: string;
  company_name: string;
  stage: Stage;
  score: number;       // readiness
  fit: number;
  priority: number;
  status: SignalStatus;
  summary: string;
  why_now: string | null;
  outreach_angle: string;
  sources: { title: string; url: string; source: string | null; published_at: string | null }[];
  committee: CommitteeMember[];
  last_contact_date: string | null;
}

export type AlertKind = "became_hot" | "warming" | "strong_signal" | "new_person" | "went_quiet";
export interface Alert {
  id: number;
  account_id: string;
  run_id: string | null;
  created_at: string;
  kind: AlertKind;
  message: string;
  priority: number;
  url: string | null;
}

export interface Run {
  id: string;
  trigger: "cron" | "manual";
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "partial" | "failed";
  accounts_scanned: number;
  articles_fetched: number;
  articles_new: number;
  signals_new: number;
  manual_untouched: boolean | null;
  errors: string[];
  email_status: string | null;
  email_detail: string | null;
  hot_list: HotListEntry[] | null;
}

// ---------- reads ----------

const numeric = (r: Account): Account => ({
  ...r,
  sig_score: Number(r.sig_score),
  sig_fit_score: Number(r.sig_fit_score),
  sig_priority: Number(r.sig_priority),
});

export async function listAccounts(): Promise<Account[]> {
  const rows = check(
    await db().from("accounts").select("*").order("sig_priority", { ascending: false }).order("sig_score", { ascending: false }).order("company_name"),
    "Load accounts",
  ) as Account[];
  return rows.map(numeric);
}

export async function getAccount(id: string): Promise<Account | null> {
  const row = check(await db().from("accounts").select("*").eq("id", id).maybeSingle(), "Load account") as Account | null;
  return row ? numeric(row) : null;
}

export async function articlesFor(accountId: string, sinceIso: string): Promise<Article[]> {
  return check(
    await db()
      .from("articles")
      .select("*")
      .eq("account_id", accountId)
      .gte("published_at", sinceIso)
      .order("published_at", { ascending: false }),
    "Load articles",
  ) as Article[];
}

export async function signalArticlesSince(sinceIso: string): Promise<Article[]> {
  return check(
    await db()
      .from("articles")
      .select("*")
      .neq("signal_type", "none")
      .eq("about_company", true)
      .gte("published_at", sinceIso)
      .order("published_at", { ascending: false }),
    "Load signal articles",
  ) as Article[];
}

export async function peopleArticles(accountIds: string[]): Promise<Article[]> {
  if (!accountIds.length) return [];
  return check(
    await db().from("articles").select("*").in("account_id", accountIds).eq("about_company", true).neq("people", "[]"),
    "Load named people",
  ) as Article[];
}

export async function knownUrls(accountId: string): Promise<Set<string>> {
  const rows = check(
    await db().from("articles").select("url").eq("account_id", accountId),
    "Load known articles",
  ) as { url: string }[];
  return new Set(rows.map((r) => r.url));
}

export async function listAlerts(limit = 12): Promise<(Alert & { company_name: string })[]> {
  const rows = check(
    await db().from("alerts").select("*, accounts(company_name)").order("created_at", { ascending: false }).limit(limit),
    "Load alerts",
  ) as (Alert & { accounts: { company_name: string } | null })[];
  return rows.map(({ accounts, ...a }) => ({ ...a, priority: Number(a.priority), company_name: accounts?.company_name ?? "?" }));
}

export async function insertAlerts(rows: Omit<Alert, "id" | "created_at">[]) {
  if (!rows.length) return;
  check(await db().from("alerts").insert(rows), "Save alerts");
}

/** Counts for the pipeline strip on the dashboard. */
export async function pipelineStats(sinceIso: string) {
  const head = { head: true, count: "exact" as const };
  const [headlines, signals, people, alerts] = await Promise.all([
    db().from("articles").select("id", head).gte("first_seen_at", sinceIso),
    db().from("articles").select("id", head).gte("published_at", sinceIso).eq("about_company", true).neq("signal_type", "none"),
    db().from("articles").select("id", head).eq("about_company", true).neq("people", "[]"),
    db().from("alerts").select("id", head).gte("created_at", sinceIso),
  ]);
  return {
    headlines: headlines.count ?? 0,
    signals: signals.count ?? 0,
    peopleMentions: people.count ?? 0,
    alerts: alerts.count ?? 0,
  };
}

export async function listRuns(limit = 10): Promise<Run[]> {
  return check(
    await db().from("runs").select("*").order("started_at", { ascending: false }).limit(limit),
    "Load runs",
  ) as Run[];
}

export async function latestRunWithHotList(): Promise<Run | null> {
  return check(
    await db()
      .from("runs")
      .select("*")
      .not("hot_list", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Load latest hot list",
  ) as Run | null;
}

// ---------- system writes ----------

export async function manualFingerprint(): Promise<string> {
  return check(await db().rpc("manual_fingerprint"), "Fingerprint Arjun's columns") as string;
}

export async function startRun(trigger: Run["trigger"], fingerprint: string): Promise<string> {
  // One run at a time: refuse if another started in the last 10 minutes and has not finished.
  const busy = check(
    await db()
      .from("runs")
      .select("id")
      .eq("status", "running")
      .gte("started_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .limit(1),
    "Check running scans",
  ) as { id: string }[];
  if (busy.length) throw new Error("A scan is already running. Try again in a few minutes.");
  const row = check(
    await db().from("runs").insert({ trigger, manual_fp_before: fingerprint }).select("id").single(),
    "Start run",
  ) as { id: string };
  return row.id;
}

export async function updateRun(id: string, patch: Record<string, unknown>) {
  check(await db().from("runs").update(patch).eq("id", id), "Update run");
}

export async function insertArticles(rows: Omit<Article, "id" | "first_seen_at">[], runId: string) {
  if (!rows.length) return;
  check(
    await db()
      .from("articles")
      .upsert(
        rows.map((r) => ({ ...r, run_id: runId })),
        { onConflict: "account_id,url", ignoreDuplicates: true },
      ),
    "Save articles",
  );
}

export interface SignalPatch {
  score: number;
  fit: number;
  priority: number;
  status: SignalStatus;
  last_signal_at: string | null;
  events_14d: number;
  top_type?: SignalType | null;
  summary?: string | null;
  why_now?: string | null;
  outreach_angle?: string | null;
}

/** The only way the system writes to accounts. Arjun-owned columns are untouchable here (DB-enforced). */
export async function applySignalUpdate(accountId: string, patch: SignalPatch, runId: string) {
  check(
    await db().rpc("apply_signal_update", { p_account_id: accountId, p: patch, p_run_id: runId }),
    "Write signal columns",
  );
}

// ---------- Arjun's edits ----------

export async function updateArjunFields(
  accountId: string,
  f: { arjun_notes: string | null; last_contact_date: string | null; relationship_read: string | null },
) {
  check(
    await db().rpc("update_arjun_fields", {
      p_account_id: accountId,
      p_notes: f.arjun_notes,
      p_last_contact: f.last_contact_date,
      p_relationship: f.relationship_read,
    }),
    "Save your fields",
  );
}

export async function proveWriteGuard(accountId: string): Promise<{ blocked: boolean; message: string; code?: string }> {
  return check(
    await db().rpc("prove_write_guard", { p_account_id: accountId }),
    "Run guard test",
  ) as { blocked: boolean; message: string; code?: string };
}
