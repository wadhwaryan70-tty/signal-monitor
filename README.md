# Signal/Monitor — B2B Account Signal Monitor

**Which of Arjun's accounts are worth reaching out to this week — and why.**

Arjun sells a workforce-management SaaS to Indian mid-market and enterprise companies. His problem is timing:
outreach with no trigger is noise, outreach two weeks after the trigger is too late. Signal/Monitor reads live news
for every account, uses **Gemini Flash** to find real trigger events, scores and decays them, writes the results back
into his Supabase CRM **without ever touching his own notes**, and emails him a **Hot List every Monday and Thursday**.

- **Live app:** _added after deploy_
- **Stack:** Next.js 16 on Vercel · Supabase (Postgres) · Gemini Flash · Google News RSS · Resend · Vercel Cron

---

## Components Map

| | Component | What it is here |
|---|---|---|
| 1 | **Trigger** | Vercel Cron, **Mon & Thu 07:30 IST** (`0 2 * * 1,4` UTC) → `/api/cron` (secret-protected). Plus a manual “Scan now” for Arjun. |
| 2 | **Input** | *Internal:* Arjun's CRM table in Supabase — stage, firmographics, last-contact date, his read. *External:* live **Google News RSS** (India edition), two searches per account (plain + trigger words), last 14 days. |
| 3 | **Context** | Arjun's product capabilities · the 5 trigger types and a 0–5 strength rubric · the account's stage, contact and Arjun's read (read-only) · signals already found this fortnight. |
| 4 | **Processing** | Drop already-seen links and near-duplicate headlines → group same-event articles → **readiness** score with time decay → **fit** score from firmographics → **priority** = readiness × fit × timing → fingerprint Arjun's columns before/after. |
| 5 | **AI** | **Gemini Flash** (one call per account with new headlines): classify each headline (type, strength, same-event key), name the **buying committee**, write the one-line summary + why-now, draft the **outreach angle** (trigger → product capability, tuned to stage). |
| 6 | **Output** | Signal columns written back to the CRM via `apply_signal_update()` (never Arjun's columns) · **CRM alert feed** · **Hot List email** (top 10 by priority, last 3 days) · dashboard, account pages, run log. |

## The four stages

1. **Data collection** — internal CRM data + external live news.
2. **AI processing & grouping** — Gemini classifies every headline or rejects it as noise; articles about the same
   event merge into one account-level event; named people become a buying committee (decision-makers, champions,
   influencers) next to Arjun's CRM contact.
3. **Scoring & prioritisation** — deterministic and explainable (below). The Hot List is ranked by priority.
4. **Automated action** — CRM write-back + alert feed every scan; Hot List email Mon & Thu. **Arjun decides and reaches out.**

## Scoring

```
event points = strength (1–5) × type weight × ½^(age ÷ 3 days)
readiness    = top 3 events × 10, capped at 100        (several articles about one event count once)
fit          = frontline workforce (10–40) + shift-based (25) + sites (5–25) + core vertical (10)   → 0–100
priority     = readiness × (0.5 + fit/200) × timing     (timing ×0.75 if Arjun spoke to them ≤3 days ago, ×0.9 if ≤14)
```

Type weights: new people/ops leader 1.2 · headcount expansion 1.1 · funding 1.0 · operational challenge 0.9 · workforce
digitalisation 0.8. **Hot** = readiness ≥ 45 with a signal in the last 3 days · **Warm** ≥ 20 · **Cooling** ≥ 5 · **Quiet** below.

Gemini only classifies; the ranking is arithmetic. Because readiness halves every 3 days, accounts that go quiet
fall down the list on their own — no one has to touch them.

## The guarantee: the system never overwrites Arjun's judgment

Arjun's columns — `arjun_notes`, `last_contact_date`, `relationship_read`, stage, contact and firmographics — are his.
This is **enforced by Postgres, not just the app** (`supabase/setup.sql`):

1. The system writes only through `apply_signal_update()`, which touches `sig_*` columns and marks the transaction as the signal system.
2. A `BEFORE UPDATE` trigger **rejects** any change to an Arjun-owned column made by that writer (and blocks it from creating or deleting accounts).
3. Every scan fingerprints all Arjun-owned values before and after and records `manual_untouched` on the run.
4. The reverse holds: Arjun's edits (`update_arjun_fields()`) and the Supabase table editor can't forge `sig_*` columns.

The **How it works** page has a live button that makes the system attempt an overwrite and shows Postgres refusing it.

## The cuts — deliberately not built

- **LinkedIn posts** — no public API; scraping breaks its terms. The same trigger types reach news within a day.
- **Auto-sending outreach** — the system drafts angles; Arjun decides. The only email it sends goes to Arjun.
- **Unmasking anonymous web traffic** — Arjun has no visitor data, and reverse-IP identification needs paid data and consent (DPDP Act).
- **Website analytics / product-usage feeds** — none exist for Arjun; the system never invents data.
- **Salesforce / HubSpot / Outreach sync** — Arjun's CRM is his Supabase table, so alerts are written there.
- **Full-article reading** — headlines + source classify reliably and avoid paywalls; every claim links to its source.

## Data

The 20 accounts are **sample CRM data** (real Indian companies; Arjun's notes, contact dates and relationship reads
are assumed, as the brief allows). Everything the system finds — headlines, signals, people, scores — is **live**.

## Run it yourself

1. Create a Supabase project and run `supabase/setup.sql` in the SQL Editor.
2. Copy the env vars below into `.env.local` (and into Vercel → Settings → Environment Variables).
3. `npm install && npm run dev`, open http://localhost:3000, sign in, click **Scan now**.

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database (server-only) |
| `GEMINI_API_KEY` (`GEMINI_API_KEY_2` optional backup) | Gemini Flash |
| `RESEND_API_KEY`, `HOTLIST_TO`, `EMAIL_FROM` | Hot List email |
| `DASHBOARD_PASSWORD`, `AUTH_SECRET` | Arjun's sign-in (viewing is open; scans, email and edits need it) |
| `CRON_SECRET` | Protects `/api/cron`; Vercel Cron sends it automatically |

`npm test` runs the scoring, fit/priority and buying-committee tests. `/api/health` reports configuration and database status.
