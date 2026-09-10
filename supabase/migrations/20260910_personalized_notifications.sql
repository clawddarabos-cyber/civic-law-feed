create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  frequency text not null default 'immediate' check (frequency in ('immediate', 'daily', 'weekly', 'off')),
  representative_votes boolean not null default true,
  bill_updates boolean not null default true,
  forecast_results boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  event_type text not null check (event_type in ('representative_vote', 'bill_update', 'forecast_result')),
  civic_item_id text references public.civic_items(id) on delete cascade,
  official_id text references public.officials(id) on delete set null,
  title text not null,
  body text not null,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (profile_id, event_key)
);

create index if not exists notifications_profile_created_idx
  on public.notifications(profile_id, created_at desc);
create index if not exists notifications_profile_unread_idx
  on public.notifications(profile_id, read_at, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

revoke all on public.notification_preferences, public.notifications from anon;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, update, delete on public.notifications to authenticated;

drop policy if exists "Users manage notification preferences" on public.notification_preferences;
create policy "Users manage notification preferences"
  on public.notification_preferences for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications"
  on public.notifications for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Users update their notifications" on public.notifications;
create policy "Users update their notifications"
  on public.notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "Users delete their notifications" on public.notifications;
create policy "Users delete their notifications"
  on public.notifications for delete to authenticated
  using (profile_id = auth.uid());
