create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  home_state text,
  home_county text,
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

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.civic_items enable row level security;
alter table public.officials enable row level security;
alter table public.civic_item_officials enable row level security;
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
grant select on public.source_checks to anon, authenticated;
grant insert, update on public.profiles to anon, authenticated;
grant insert on public.civic_items to anon, authenticated;
grant update on public.civic_items to authenticated;
grant select, insert, update, delete on public.user_votes to anon, authenticated;
grant select, insert, delete on public.saved_items to anon, authenticated;
grant select, insert, delete on public.follows to anon, authenticated;
grant select, insert, update, delete on public.reminders to anon, authenticated;
grant select, insert on public.comments to anon, authenticated;
grant insert on public.source_reports to anon, authenticated;
grant insert on public.claim_requests to anon, authenticated;

drop policy if exists "Public can read sources" on public.sources;
create policy "Public can read sources"
  on public.sources for select
  using (true);

drop policy if exists "Public can read civic items" on public.civic_items;
create policy "Public can read civic items"
  on public.civic_items for select
  using (true);

drop policy if exists "Guest sync can stage civic items" on public.civic_items;
create policy "Guest sync can stage civic items"
  on public.civic_items for insert
  with check (true);

drop policy if exists "Authenticated jobs can update civic items" on public.civic_items;
create policy "Authenticated jobs can update civic items"
  on public.civic_items for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read officials" on public.officials;
create policy "Public can read officials"
  on public.officials for select
  using (true);

drop policy if exists "Public can read civic item officials" on public.civic_item_officials;
create policy "Public can read civic item officials"
  on public.civic_item_officials for select
  using (true);

drop policy if exists "Public can read source checks" on public.source_checks;
create policy "Public can read source checks"
  on public.source_checks for select
  using (true);

drop policy if exists "Guest profiles can be created" on public.profiles;
create policy "Guest profiles can be created"
  on public.profiles for insert
  with check (email is null);

drop policy if exists "Guest profiles can be refreshed" on public.profiles;
create policy "Guest profiles can be refreshed"
  on public.profiles for update
  using (email is null)
  with check (email is null);

drop policy if exists "Guest votes can be synced" on public.user_votes;
create policy "Guest votes can be synced"
  on public.user_votes for all
  using (true)
  with check (vote in ('yes', 'no'));

drop policy if exists "Guest saved items can be synced" on public.saved_items;
create policy "Guest saved items can be synced"
  on public.saved_items for all
  using (true)
  with check (true);

drop policy if exists "Guest follows can be synced" on public.follows;
create policy "Guest follows can be synced"
  on public.follows for all
  using (true)
  with check (true);

drop policy if exists "Guest reminders can be synced" on public.reminders;
create policy "Guest reminders can be synced"
  on public.reminders for all
  using (true)
  with check (status in ('active', 'dismissed', 'completed'));

drop policy if exists "Public can read approved comments" on public.comments;
create policy "Public can read approved comments"
  on public.comments for select
  using (moderation_status = 'approved');

drop policy if exists "Guest comments enter moderation" on public.comments;
create policy "Guest comments enter moderation"
  on public.comments for insert
  with check (moderation_status = 'pending');

drop policy if exists "Guest source reports can be queued" on public.source_reports;
create policy "Guest source reports can be queued"
  on public.source_reports for insert
  with check (status = 'queued');

drop policy if exists "Guest claim requests can be queued" on public.claim_requests;
create policy "Guest claim requests can be queued"
  on public.claim_requests for insert
  with check (status = 'pending');
