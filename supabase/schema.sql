-- PitWall Supabase schema.
-- Run once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: uses "if not exists" / "or replace" where practical.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mein Motorsport-Team',
  logo_path text,
  accent text not null default 'red' check (accent in ('red', 'orange')),
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'Sonstiges'
    check (role in ('Teamchef', 'Fahrer', 'Ingenieur', 'Mechaniker', 'Strategie', 'Sonstiges')),
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (team_id, user_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  type text not null default 'other' check (type in ('training', 'qualifying', 'race', 'briefing', 'other')),
  start timestamptz not null,
  "end" timestamptz,
  location text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  category text not null default 'Sonstiges',
  tags text[] not null default '{}',
  size bigint not null default 0,
  added_by uuid references auth.users(id),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists bulletins (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  source text,
  category text not null default 'Allgemein',
  priority text not null default 'info' check (priority in ('info', 'wichtig', 'dringend')),
  date timestamptz not null default now(),
  body text,
  event_id uuid references events(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists bulletin_reads (
  bulletin_id uuid not null references bulletins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (bulletin_id, user_id)
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  kind text not null default 'general' check (kind in ('general', 'event')),
  event_id uuid references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, event_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text not null default 'Team',
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['teams', 'team_members', 'events', 'documents', 'bulletins', 'messages']
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Membership helper (security definer avoids RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function my_team_ids() returns setof uuid
language sql security definer stable as $$
  select team_id from team_members where user_id = auth.uid();
$$;

create or replace function is_team_admin(target_team_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from team_members
    where team_id = target_team_id and user_id = auth.uid() and role = 'Teamchef'
  );
$$;

-- Public-ish lookup used only by the "join team" flow. Returns just enough
-- to confirm the team name before the user commits to joining; does not
-- expose the full teams table to non-members.
create or replace function find_team_by_invite_code(code text) returns table(id uuid, name text)
language sql security definer stable as $$
  select id, name from teams where invite_code = code;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table teams enable row level security;
alter table team_members enable row level security;
alter table events enable row level security;
alter table documents enable row level security;
alter table bulletins enable row level security;
alter table bulletin_reads enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;

drop policy if exists teams_select on teams;
create policy teams_select on teams for select
  using (id in (select my_team_ids()));

drop policy if exists teams_insert on teams;
create policy teams_insert on teams for insert
  with check (auth.uid() is not null);

drop policy if exists teams_update on teams;
create policy teams_update on teams for update
  using (is_team_admin(id));

drop policy if exists team_members_select on team_members;
create policy team_members_select on team_members for select
  using (team_id in (select my_team_ids()));

drop policy if exists team_members_insert on team_members;
create policy team_members_insert on team_members for insert
  with check (user_id = auth.uid());

drop policy if exists team_members_update on team_members;
create policy team_members_update on team_members for update
  using (user_id = auth.uid() or is_team_admin(team_id));

drop policy if exists team_members_delete on team_members;
create policy team_members_delete on team_members for delete
  using (is_team_admin(team_id));

drop policy if exists events_all on events;
create policy events_all on events for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

drop policy if exists documents_all on documents;
create policy documents_all on documents for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

drop policy if exists bulletins_all on bulletins;
create policy bulletins_all on bulletins for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

drop policy if exists bulletin_reads_all on bulletin_reads;
create policy bulletin_reads_all on bulletin_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists channels_all on channels;
create policy channels_all on channels for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

drop policy if exists messages_all on messages;
create policy messages_all on messages for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

-- ---------------------------------------------------------------------------
-- Storage (documents + team logos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('team-files', 'team-files', false)
on conflict (id) do nothing;

drop policy if exists team_files_select on storage.objects;
create policy team_files_select on storage.objects for select
  using (bucket_id = 'team-files' and (storage.foldername(name))[1]::uuid in (select my_team_ids()));

drop policy if exists team_files_insert on storage.objects;
create policy team_files_insert on storage.objects for insert
  with check (bucket_id = 'team-files' and (storage.foldername(name))[1]::uuid in (select my_team_ids()));

drop policy if exists team_files_update on storage.objects;
create policy team_files_update on storage.objects for update
  using (bucket_id = 'team-files' and (storage.foldername(name))[1]::uuid in (select my_team_ids()));

drop policy if exists team_files_delete on storage.objects;
create policy team_files_delete on storage.objects for delete
  using (bucket_id = 'team-files' and (storage.foldername(name))[1]::uuid in (select my_team_ids()));

-- ---------------------------------------------------------------------------
-- Realtime (idempotent: ignores tables already added to the publication)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['team_members', 'events', 'documents', 'bulletins', 'channels', 'messages']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
