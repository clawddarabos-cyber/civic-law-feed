create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  home_state text,
  home_county text,
  congressional_district integer,
  state_senate_district integer,
  state_house_district integer,
  theme_preference text check (theme_preference in ('light', 'dark')),
  jurisdiction_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id text primary key,
  name text not null,
  level text not null check (level in ('Federal', 'State', 'County', 'City')),
  jurisdiction text not null,
  homepage_url text not null,
  api_url text,
  source_type text not null,
  last_checked_at timestamptz,
  freshness_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.civic_items (
  id text primary key,
  source_id text references public.sources(id),
  title text not null,
  chamber text,
  jurisdiction text not null,
  level text not null check (level in ('Federal', 'State', 'County', 'City')),
  status text,
  category text,
  summary text,
  detail text,
  source_url text not null,
  official_text_url text,
  introduced_at date,
  latest_action_at date,
  updated_at timestamptz,
  imported_at timestamptz not null default now(),
  imported_metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.officials (
  id text primary key,
  source_id text references public.sources(id),
  name text not null,
  office text not null,
  jurisdiction text not null,
  party text,
  state text,
  district text,
  source_url text not null,
  claim_status text not null default 'unclaimed',
  imported_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.civic_item_officials (
  civic_item_id text not null references public.civic_items(id) on delete cascade,
  official_id text not null references public.officials(id) on delete cascade,
  relationship text not null check (relationship in ('sponsor', 'cosponsor', 'committee', 'recorded_vote')),
  vote text,
  source_url text,
  created_at timestamptz not null default now(),
  primary key (civic_item_id, official_id, relationship)
);

create table if not exists public.roll_calls (
  id text primary key,
  civic_item_id text references public.civic_items(id) on delete set null,
  bill_number text not null,
  title text not null,
  chamber text not null,
  vote_date date not null,
  yea_count integer not null default 0,
  nay_count integer not null default 0,
  source_url text not null,
  validation_status text not null default 'pending',
  imported_at timestamptz not null default now()
);

create table if not exists public.official_votes (
  roll_call_id text not null references public.roll_calls(id) on delete cascade,
  official_id text not null references public.officials(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no')),
  source_url text not null,
  created_at timestamptz not null default now(),
  primary key (roll_call_id, official_id)
);

create table if not exists public.source_checks (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.sources(id),
  civic_item_id text references public.civic_items(id),
  checked_at timestamptz not null default now(),
  status text not null,
  message text,
  raw_metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.user_votes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  civic_item_id text not null references public.civic_items(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, civic_item_id)
);

create table if not exists public.saved_items (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  civic_item_id text not null references public.civic_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, civic_item_id)
);

create table if not exists public.follows (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('source', 'official', 'level', 'topic')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, target_type, target_id)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  civic_item_id text not null references public.civic_items(id) on delete cascade,
  remind_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  civic_item_id text not null references public.civic_items(id) on delete cascade,
  body text not null,
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.source_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  civic_item_id text references public.civic_items(id) on delete cascade,
  report_type text not null,
  body text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  official_id text not null references public.officials(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  claimant_email text not null,
  evidence_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists civic_items_level_idx on public.civic_items(level);
create index if not exists civic_items_latest_action_idx on public.civic_items(latest_action_at desc);
create index if not exists officials_jurisdiction_idx on public.officials(jurisdiction);
create index if not exists source_checks_checked_at_idx on public.source_checks(checked_at desc);
create index if not exists comments_civic_item_idx on public.comments(civic_item_id, created_at desc);
create index if not exists roll_calls_vote_date_idx on public.roll_calls(vote_date desc);
create index if not exists official_votes_official_idx on public.official_votes(official_id, roll_call_id);
create unique index if not exists reminders_profile_item_idx on public.reminders(profile_id, civic_item_id);

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.civic_items enable row level security;
alter table public.officials enable row level security;
alter table public.civic_item_officials enable row level security;
alter table public.roll_calls enable row level security;
alter table public.official_votes enable row level security;
alter table public.source_checks enable row level security;
alter table public.user_votes enable row level security;
alter table public.saved_items enable row level security;
alter table public.follows enable row level security;
alter table public.reminders enable row level security;
alter table public.comments enable row level security;
alter table public.source_reports enable row level security;
alter table public.claim_requests enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.sources to anon, authenticated;
grant select on public.civic_items to anon, authenticated;
grant select on public.officials to anon, authenticated;
grant select on public.civic_item_officials to anon, authenticated;
grant select on public.roll_calls to anon, authenticated;
grant select on public.official_votes to anon, authenticated;
grant select on public.source_checks to anon, authenticated;
revoke all on public.profiles, public.user_votes, public.saved_items, public.follows, public.reminders from anon;
grant select, insert, update on public.profiles to authenticated;
revoke insert, update, delete on public.civic_items from anon, authenticated;
grant select, insert, update, delete on public.user_votes to authenticated;
grant select, insert, delete on public.saved_items to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select on public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
grant insert on public.source_reports to authenticated;
grant insert on public.claim_requests to authenticated;

drop policy if exists "Public can read sources" on public.sources;
create policy "Public can read sources"
  on public.sources for select
  using (true);

drop policy if exists "Public can read civic items" on public.civic_items;
create policy "Public can read civic items"
  on public.civic_items for select
  using (true);

drop policy if exists "Authenticated users can stage known civic items" on public.civic_items;
drop policy if exists "Guest sync can stage civic items" on public.civic_items;
drop policy if exists "Authenticated jobs can update civic items" on public.civic_items;

drop policy if exists "Public can read officials" on public.officials;
create policy "Public can read officials"
  on public.officials for select
  using (true);

drop policy if exists "Public can read civic item officials" on public.civic_item_officials;
create policy "Public can read civic item officials"
  on public.civic_item_officials for select
  using (true);

drop policy if exists "Public can read roll calls" on public.roll_calls;
create policy "Public can read roll calls" on public.roll_calls for select using (true);

drop policy if exists "Public can read official votes" on public.official_votes;
create policy "Public can read official votes" on public.official_votes for select using (true);

drop policy if exists "Public can read source checks" on public.source_checks;
create policy "Public can read source checks"
  on public.source_checks for select
  using (true);

drop policy if exists "Guest profiles can be created" on public.profiles;
drop policy if exists "Guest profiles can be refreshed" on public.profiles;
drop policy if exists "Users manage their profile" on public.profiles;
create policy "Users manage their profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and email = (auth.jwt() ->> 'email'));

drop policy if exists "Guest votes can be synced" on public.user_votes;
drop policy if exists "Users manage their votes" on public.user_votes;
create policy "Users manage their votes" on public.user_votes for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and vote in ('yes', 'no'));

drop policy if exists "Guest saved items can be synced" on public.saved_items;
drop policy if exists "Users manage their saved items" on public.saved_items;
create policy "Users manage their saved items" on public.saved_items for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "Guest follows can be synced" on public.follows;
drop policy if exists "Users manage their follows" on public.follows;
create policy "Users manage their follows" on public.follows for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "Guest reminders can be synced" on public.reminders;
drop policy if exists "Users manage their reminders" on public.reminders;
create policy "Users manage their reminders" on public.reminders for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and status in ('active', 'dismissed', 'completed'));

drop policy if exists "Public can read approved comments" on public.comments;
create policy "Public can read approved comments"
  on public.comments for select
  using (moderation_status = 'approved');

drop policy if exists "Guest comments enter moderation" on public.comments;
drop policy if exists "Authenticated comments enter moderation" on public.comments;
create policy "Authenticated comments enter moderation"
  on public.comments for insert
  to authenticated
  with check (profile_id = auth.uid() and moderation_status = 'pending');

drop policy if exists "Guest source reports can be queued" on public.source_reports;
drop policy if exists "Authenticated source reports can be queued" on public.source_reports;
create policy "Authenticated source reports can be queued"
  on public.source_reports for insert
  to authenticated
  with check (profile_id = auth.uid() and status = 'queued');

drop policy if exists "Guest claim requests can be queued" on public.claim_requests;
drop policy if exists "Authenticated claim requests can be queued" on public.claim_requests;
create policy "Authenticated claim requests can be queued"
  on public.claim_requests for insert
  to authenticated
  with check (profile_id = auth.uid() and claimant_email = (auth.jwt() ->> 'email') and status = 'pending');
