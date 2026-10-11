-- B2B Account Signal Monitor — full database setup.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run (drops and recreates).
--
-- Ownership model (the core guarantee of the system):
--   • Arjun-owned columns  — company details & firmographics, stage, contact, arjun_notes, last_contact_date,
--                            relationship_read.
--   • System-owned columns — everything prefixed sig_ (signal-derived).
-- The app writes sig_ columns ONLY through apply_signal_update(), which marks the transaction as the
-- signal system. A trigger then rejects any change to an Arjun-owned column made by that writer —
-- so even a bug in the app cannot overwrite Arjun's notes. The reverse also holds: the dashboard and the
-- Supabase table editor cannot forge sig_ columns.

drop table if exists alerts cascade;
drop table if exists articles cascade;
drop table if exists runs cascade;
drop table if exists accounts cascade;

create extension if not exists pgcrypto;

create table accounts (
  id                    uuid primary key default gen_random_uuid(),
  -- ── Arjun-owned ──────────────────────────────────────────────
  company_name          text not null unique,
  news_query            text,              -- optional: override the search phrase used for news
  industry              text,
  hq_city               text,
  frontline_workforce   text check (frontline_workforce in ('<1k', '1k-5k', '5k-20k', '20k+')),
  shift_based           boolean not null default false,
  site_count            text check (site_count in ('1-10', '10-100', '100+')),
  stage                 text not null check (stage in ('outreach', 'pilot', 'expansion')),
  key_contact           text,
  arjun_notes           text,
  last_contact_date     date,
  relationship_read     text,
  created_at            timestamptz not null default now(),
  -- ── System-owned (signal-derived) ────────────────────────────
  sig_score             numeric(5,1) not null default 0,   -- readiness: how strong the recent triggers are
  sig_fit_score         numeric(5,1) not null default 0,   -- fit: how well the account matches the product
  sig_priority          numeric(5,1) not null default 0,   -- readiness × fit × contact timing
  sig_status            text not null default 'quiet' check (sig_status in ('hot', 'warm', 'cooling', 'quiet')),
  sig_top_type          text,
  sig_summary           text,
  sig_why_now           text,
  sig_outreach_angle    text,
  sig_last_signal_at    timestamptz,
  sig_events_14d        int not null default 0,
  sig_last_scanned_at   timestamptz,
  sig_run_id            uuid
);

create table runs (
  id                 uuid primary key default gen_random_uuid(),
  trigger            text not null check (trigger in ('cron', 'manual')),
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  status             text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  accounts_scanned   int not null default 0,
  articles_fetched   int not null default 0,
  articles_new       int not null default 0,
  signals_new        int not null default 0,
  manual_fp_before   text,
  manual_fp_after    text,
  manual_untouched   boolean,
  errors             jsonb not null default '[]'::jsonb,
  email_status       text,               -- sent | failed | skipped
  email_detail       text,
  hot_list           jsonb
);

create table articles (
  id               bigint generated always as identity primary key,
  account_id       uuid not null references accounts(id) on delete cascade,
  url              text not null,
  title            text not null,
  source           text,
  published_at     timestamptz,
  first_seen_at    timestamptz not null default now(),
  run_id           uuid references runs(id) on delete set null,
  about_company    boolean not null default false,
  signal_type      text not null default 'none' check (signal_type in
                     ('headcount_expansion', 'leadership_hire', 'digitalisation', 'funding', 'operational_challenge', 'none')),
  strength         int not null default 0 check (strength between 0 and 5),
  event_key        text,
  evidence         text,
  people           jsonb not null default '[]'::jsonb,   -- named people: [{name, title, persona}]
  unique (account_id, url)
);
create index articles_account_published on articles (account_id, published_at desc);

-- Alert feed: what changed on each scan, routed into the CRM for Arjun to act on.
create table alerts (
  id           bigint generated always as identity primary key,
  account_id   uuid not null references accounts(id) on delete cascade,
  run_id       uuid references runs(id) on delete set null,
  created_at   timestamptz not null default now(),
  kind         text not null check (kind in ('became_hot', 'warming', 'strong_signal', 'new_person', 'went_quiet')),
  message      text not null,
  priority     numeric(5,1) not null default 0,
  url          text
);
create index alerts_created on alerts (created_at desc);

-- Lock everything down: only the server (service role) gets in, and only via these tables/functions.
alter table accounts enable row level security;
alter table runs     enable row level security;
alter table articles enable row level security;
alter table alerts   enable row level security;

-- ── The column-ownership guard ──────────────────────────────────
create or replace function guard_account_columns() returns trigger
language plpgsql as $$
declare
  writer text := coalesce(current_setting('app.writer', true), '');
begin
  if tg_op = 'INSERT' then
    if writer = 'signal_system' then
      raise exception 'Signal system may not create accounts' using errcode = '42501';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if writer = 'signal_system' then
      raise exception 'Signal system may not delete accounts' using errcode = '42501';
    end if;
    return old;
  end if;

  if writer = 'signal_system' then
    if (new.id, new.company_name, new.news_query, new.industry, new.hq_city, new.frontline_workforce, new.shift_based, new.site_count, new.stage, new.key_contact,
        new.arjun_notes, new.last_contact_date, new.relationship_read, new.created_at)
       is distinct from
       (old.id, old.company_name, old.news_query, old.industry, old.hq_city, old.frontline_workforce, old.shift_based, old.site_count, old.stage, old.key_contact,
        old.arjun_notes, old.last_contact_date, old.relationship_read, old.created_at) then
      raise exception 'Blocked: the signal system tried to modify an Arjun-owned column on "%"', old.company_name
        using errcode = '42501';
    end if;
  else
    if (new.sig_score, new.sig_fit_score, new.sig_priority, new.sig_status, new.sig_top_type, new.sig_summary, new.sig_why_now, new.sig_outreach_angle,
        new.sig_last_signal_at, new.sig_events_14d, new.sig_last_scanned_at, new.sig_run_id)
       is distinct from
       (old.sig_score, old.sig_fit_score, old.sig_priority, old.sig_status, old.sig_top_type, old.sig_summary, old.sig_why_now, old.sig_outreach_angle,
        old.sig_last_signal_at, old.sig_events_14d, old.sig_last_scanned_at, old.sig_run_id) then
      raise exception 'Blocked: sig_ columns are written only by the signal system' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger accounts_column_guard
  before insert or update or delete on accounts
  for each row execute function guard_account_columns();

-- The ONLY path the signal system uses to write to accounts. Touches sig_ columns only.
create or replace function apply_signal_update(p_account_id uuid, p jsonb, p_run_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('app.writer', 'signal_system', true);
  update accounts set
    sig_score           = coalesce((p->>'score')::numeric, 0),
    sig_fit_score       = coalesce((p->>'fit')::numeric, 0),
    sig_priority        = coalesce((p->>'priority')::numeric, 0),
    sig_status          = coalesce(p->>'status', 'quiet'),
    sig_top_type        = case when p ? 'top_type'       then p->>'top_type'       else sig_top_type end,
    sig_summary         = case when p ? 'summary'        then p->>'summary'        else sig_summary end,
    sig_why_now         = case when p ? 'why_now'        then p->>'why_now'        else sig_why_now end,
    sig_outreach_angle  = case when p ? 'outreach_angle' then p->>'outreach_angle' else sig_outreach_angle end,
    sig_last_signal_at  = (p->>'last_signal_at')::timestamptz,
    sig_events_14d      = coalesce((p->>'events_14d')::int, 0),
    sig_last_scanned_at = now(),
    sig_run_id          = p_run_id
  where id = p_account_id;
end $$;

-- Arjun's dashboard edits. Touches Arjun-owned columns only.
create or replace function update_arjun_fields(p_account_id uuid, p_notes text, p_last_contact date, p_relationship text)
returns void language plpgsql as $$
begin
  perform set_config('app.writer', 'arjun', true);
  update accounts set arjun_notes = p_notes, last_contact_date = p_last_contact, relationship_read = p_relationship
  where id = p_account_id;
end $$;

-- Fingerprint of every Arjun-owned value. Taken before and after each run to prove nothing changed.
create or replace function manual_fingerprint() returns text
language sql stable as $$
  select md5(coalesce(string_agg(
    concat_ws('|', id, company_name, news_query, industry, hq_city, frontline_workforce, shift_based, site_count, stage, key_contact,
              arjun_notes, last_contact_date, relationship_read, created_at), E'\n' order by id), ''))
  from accounts;
$$;

-- Live proof for the dashboard: the signal system attempts to overwrite a note; the guard must block it.
-- Runs in a sub-transaction, so nothing is ever changed either way.
create or replace function prove_write_guard(p_account_id uuid) returns jsonb
language plpgsql as $$
begin
  perform set_config('app.writer', 'signal_system', true);
  begin
    update accounts set arjun_notes = coalesce(arjun_notes, '') || ' [system overwrite attempt]' where id = p_account_id;
    raise exception 'GUARD_MISSING';
  exception when others then
    if sqlerrm = 'GUARD_MISSING' then
      return jsonb_build_object('blocked', false, 'message', 'Update went through — guard is NOT active (rolled back).');
    end if;
    return jsonb_build_object('blocked', true, 'code', sqlstate, 'message', sqlerrm);
  end;
end $$;

-- Note: alerts are inserted by the server directly (system-only table).
revoke all on function apply_signal_update(uuid, jsonb, uuid), update_arjun_fields(uuid, text, date, text),
  manual_fingerprint(), prove_write_guard(uuid) from public, anon, authenticated;
grant execute on function apply_signal_update(uuid, jsonb, uuid), update_arjun_fields(uuid, text, date, text),
  manual_fingerprint(), prove_write_guard(uuid) to service_role;

-- ── Arjun's book of accounts (sample CRM data; Arjun-owned columns only) ──
insert into accounts (company_name, news_query, industry, hq_city, frontline_workforce, shift_based, site_count, stage, key_contact, arjun_notes, last_contact_date, relationship_read) values
('Delhivery', null, 'Logistics', 'Gurugram', '20k+', true, '100+', 'pilot', 'Head of Hub Operations',
 'Pilot live at 3 hubs (Bhiwandi, Tauru, Hoskote) for shift rostering. Ops team likes geo-fenced attendance; finance wants overtime numbers before rollout.', '2026-09-30', 'Warm. Champion is ops, blocker is finance. Need an ROI story on overtime leakage.'),
('Zepto', null, 'Quick commerce', 'Mumbai', '20k+', true, '100+', 'outreach', 'VP People Operations',
 'Cold email sent twice, no reply. Dark-store staffing is their obvious pain — thousands of shift workers.', '2026-09-12', 'Cold. Need a trigger to justify a third touch.'),
('Swiggy', null, 'Food delivery & quick commerce', 'Bengaluru', '20k+', true, '100+', 'outreach', 'Director, Instamart Ops',
 'Met at a SaaSBOOMi meetup. Said rostering for Instamart is "held together by spreadsheets".', '2026-08-28', 'Lukewarm. Interested but busy; revisit with a concrete angle.'),
('Lenskart', null, 'Omnichannel retail', 'Gurugram', '5k-20k', true, '100+', 'expansion', 'CHRO office',
 'Signed customer — 600 stores on attendance + leave. Expansion target: add scheduling module + factory workforce at Bhiwadi.', '2026-10-01', 'Strong. Happy customer; upsell depends on store expansion pace.'),
('Apollo Hospitals', 'Apollo Hospitals', 'Healthcare', 'Chennai', '20k+', true, '100+', 'outreach', 'Group Head HR',
 'Nurse rostering and 24x7 shift compliance is a real problem. Intro requested via an ex-colleague, pending.', '2026-09-05', 'Cold but high-value. Long sales cycle expected.'),
('TeamLease', 'TeamLease Services', 'Staffing', 'Bengaluru', '20k+', true, '100+', 'pilot', 'VP Associate Experience',
 'Pilot for 2,000 deployed associates — attendance + timesheet approval for clients. Integration with their payroll pending.', '2026-09-25', 'Warm. Decision expected after Q3 results.'),
('Quess Corp', null, 'Staffing & facilities', 'Bengaluru', '20k+', true, '100+', 'outreach', 'Head of Workforce Tech',
 'Shared deck in August. They are evaluating build vs buy.', '2026-08-20', 'Neutral. Competitor demo likely already done.'),
('Mahindra Logistics', null, 'Logistics', 'Mumbai', '20k+', true, '100+', 'expansion', 'Head of Warehousing',
 'Customer for 18 warehouses. Expansion: new multi-client warehouses + contract labour compliance module.', '2026-09-18', 'Strong. Procurement is slow; time the pitch to new site announcements.'),
('Ola Electric', null, 'EV manufacturing', 'Bengaluru', '1k-5k', true, '1-10', 'outreach', 'Plant HR Head, Futurefactory',
 'Futurefactory shift workforce is large and mostly women — scheduling + compliance angle. No contact yet beyond LinkedIn connect.', null, 'Unknown. Need a reason to reach out.'),
('Rapido', 'Rapido bike taxi', 'Mobility', 'Bengaluru', '1k-5k', false, '10-100', 'outreach', 'COO office',
 'Captain (driver) community is gig, not our core — but their support centres and city ops teams fit.', '2026-07-30', 'Cold. Low priority unless something changes.'),
('Urban Company', null, 'Home services', 'Gurugram', '1k-5k', false, '10-100', 'pilot', 'Director, Partner Operations',
 'Pilot: training-centre staff scheduling in Delhi NCR. Positive early feedback.', '2026-10-03', 'Warm. They move fast; keep momentum.'),
('Licious', null, 'D2C food', 'Bengaluru', '1k-5k', true, '10-100', 'outreach', 'Head of Supply Chain',
 'Processing centres + delivery hubs, multi-shift. Spoke once in July; asked to come back "after the busy season".', '2026-07-15', 'Lukewarm. Busy season is ending — good time soon.'),
('Nykaa', null, 'Beauty retail', 'Mumbai', '1k-5k', true, '100+', 'outreach', 'VP Retail Operations',
 'Store staff + warehouse. Sent one email after their store expansion news in June.', '2026-06-22', 'Cold. Haven''t followed up in months.'),
('Shadowfax', 'Shadowfax Technologies', 'Logistics', 'Bengaluru', '5k-20k', true, '100+', 'pilot', 'Head of First-Mile Ops',
 'Pilot in 2 cities for hub staff attendance. They raised questions on offline mode.', '2026-09-22', 'Warm. Fix offline-mode concern before next check-in.'),
('Ather Energy', null, 'EV manufacturing', 'Bengaluru', '1k-5k', true, '1-10', 'outreach', 'HR Business Partner, Hosur',
 'New plant capacity means shift workforce growth. Connected with HRBP, no meeting yet.', '2026-09-08', 'Neutral. Plant expansion news would be the opener.'),
('Max Healthcare', null, 'Healthcare', 'New Delhi', '5k-20k', true, '10-100', 'outreach', 'Chief People Officer',
 'Hospital expansion pipeline in NCR. Nurse and support-staff rostering.', null, 'Unknown. Haven''t made contact.'),
('Blue Dart', 'Blue Dart Express', 'Logistics', 'Mumbai', '5k-20k', true, '100+', 'expansion', 'GM HR Operations',
 'Customer for ground ops attendance in West region. Expansion: national rollout + festive-season surge staffing.', '2026-09-27', 'Strong but bureaucratic. Festive peak is when pain is most visible.'),
('BigBasket', null, 'Grocery e-commerce', 'Bengaluru', '20k+', true, '100+', 'outreach', 'Head of Dark Store Ops',
 'Tata-owned; procurement via group process. Ops head is open to a conversation.', '2026-08-11', 'Lukewarm. Need an urgent trigger to get on the calendar.'),
('PhysicsWallah', null, 'Edtech', 'Noida', '5k-20k', false, '100+', 'outreach', 'VP HR',
 'Offline centres expanding fast — faculty + centre staff scheduling and attendance across cities.', '2026-09-01', 'Neutral. Fast-growing; HR stretched.'),
('Meesho', null, 'E-commerce', 'Bengaluru', '1k-5k', false, '1-10', 'outreach', 'Head of Fulfilment',
 'Mostly asset-light, but seller-support and fulfilment partners staffing. Weak fit, keep watching.', null, 'Unknown. Low fit unless they build own ops.');
