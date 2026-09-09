alter table public.profiles
  add column if not exists congressional_district integer,
  add column if not exists state_senate_district integer,
  add column if not exists state_house_district integer,
  add column if not exists theme_preference text,
  add column if not exists jurisdiction_data jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.profiles add constraint profiles_theme_preference_check
    check (theme_preference in ('light', 'dark'));
exception when duplicate_object then null;
end $$;

create unique index if not exists reminders_profile_item_idx
  on public.reminders(profile_id, civic_item_id);

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

create index if not exists roll_calls_vote_date_idx on public.roll_calls(vote_date desc);
create index if not exists official_votes_official_idx on public.official_votes(official_id, roll_call_id);
alter table public.roll_calls enable row level security;
alter table public.official_votes enable row level security;
grant select on public.roll_calls to anon, authenticated;
grant select on public.official_votes to anon, authenticated;
drop policy if exists "Public can read roll calls" on public.roll_calls;
create policy "Public can read roll calls" on public.roll_calls for select using (true);
drop policy if exists "Public can read official votes" on public.official_votes;
create policy "Public can read official votes" on public.official_votes for select using (true);

revoke all on public.profiles, public.user_votes, public.saved_items, public.follows, public.reminders from anon;
grant select, insert, update on public.profiles to authenticated;
grant insert on public.civic_items to authenticated;
grant select, insert, update, delete on public.user_votes to authenticated;
grant select, insert, delete on public.saved_items to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select on public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
grant insert on public.source_reports to authenticated;
grant insert on public.claim_requests to authenticated;

drop policy if exists "Guest sync can stage civic items" on public.civic_items;
drop policy if exists "Authenticated users can stage known civic items" on public.civic_items;
create policy "Authenticated users can stage known civic items" on public.civic_items
  for insert to authenticated with check (true);

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

drop policy if exists "Guest comments enter moderation" on public.comments;
drop policy if exists "Authenticated comments enter moderation" on public.comments;
create policy "Authenticated comments enter moderation" on public.comments for insert to authenticated
  with check (profile_id = auth.uid() and moderation_status = 'pending');

drop policy if exists "Guest source reports can be queued" on public.source_reports;
drop policy if exists "Authenticated source reports can be queued" on public.source_reports;
create policy "Authenticated source reports can be queued" on public.source_reports for insert to authenticated
  with check (profile_id = auth.uid() and status = 'queued');

drop policy if exists "Guest claim requests can be queued" on public.claim_requests;
drop policy if exists "Authenticated claim requests can be queued" on public.claim_requests;
create policy "Authenticated claim requests can be queued" on public.claim_requests for insert to authenticated
  with check (profile_id = auth.uid() and claimant_email = (auth.jwt() ->> 'email') and status = 'pending');
