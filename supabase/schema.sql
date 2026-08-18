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
