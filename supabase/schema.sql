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
  calendar_ics_url text,
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
  source text not null default 'manual' check (source in ('manual', 'import')),
  external_uid text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (team_id, external_uid)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  category text not null default 'Sonstiges',
  tags text[] not null default '{}',
  size bigint not null default 0,
  visible_roles text[],
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
  attachment_path text,
  attachment_name text,
  visible_roles text[],
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
  kind text not null default 'general' check (kind in ('general', 'event', 'custom')),
  event_id uuid references events(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (team_id, event_id)
);

create table if not exists channel_members (
  channel_id uuid not null references channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  assignee_id uuid references team_members(id) on delete set null,
  due_date timestamptz,
  event_id uuid references events(id) on delete set null,
  done boolean not null default false,
  notes text,
  visible_roles text[],
  completed_by uuid references auth.users(id),
  completed_by_name text,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text not null default 'Team',
  text text not null,
  reply_to_id uuid references messages(id) on delete set null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Migrations for installations that already ran an earlier version of this
-- file (CREATE TABLE IF NOT EXISTS alone won't add new columns to an
-- existing table, so these are explicit and safe to re-run).
-- ---------------------------------------------------------------------------

alter table teams add column if not exists calendar_ics_url text;

alter table events add column if not exists source text not null default 'manual';
alter table events add column if not exists external_uid text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_source_check') then
    alter table events add constraint events_source_check check (source in ('manual', 'import'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_team_id_external_uid_key') then
    alter table events add constraint events_team_id_external_uid_key unique (team_id, external_uid);
  end if;
end $$;

alter table channels add column if not exists created_by uuid references auth.users(id);
alter table channels drop constraint if exists channels_kind_check;
alter table channels add constraint channels_kind_check check (kind in ('general', 'event', 'custom'));

alter table bulletins add column if not exists attachment_path text;
alter table bulletins add column if not exists attachment_name text;

alter table documents add column if not exists visible_roles text[];
alter table bulletins add column if not exists visible_roles text[];
alter table tasks add column if not exists visible_roles text[];

alter table tasks add column if not exists completed_by uuid references auth.users(id);
alter table tasks add column if not exists completed_by_name text;
alter table tasks add column if not exists completed_at timestamptz;

alter table messages add column if not exists reply_to_id uuid references messages(id) on delete set null;
alter table messages add column if not exists image_path text;

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
  foreach t in array array['teams', 'team_members', 'events', 'documents', 'bulletins', 'messages', 'tasks']
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

-- Custom channels are only visible to their explicit member list; general
-- and event channels stay visible to the whole team (checked separately via
-- the team_id membership clause on each policy).
create or replace function can_access_channel(target_channel_id uuid) returns boolean
language sql security definer stable as $$
  select case
    when (select kind from channels where id = target_channel_id) = 'custom'
      then exists (
        select 1 from channel_members
        where channel_id = target_channel_id and user_id = auth.uid()
      )
    else true
  end;
$$;

-- Role-scoped visibility for documents/bulletins/tasks: null or empty
-- target_roles means visible to the whole team; otherwise only members
-- whose role is in the list can see the row.
create or replace function can_view_by_roles(target_team_id uuid, target_roles text[]) returns boolean
language sql security definer stable as $$
  select target_roles is null or array_length(target_roles, 1) is null or exists (
    select 1 from team_members
    where team_id = target_team_id and user_id = auth.uid() and role = any(target_roles)
  );
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
alter table channel_members enable row level security;
alter table messages enable row level security;
alter table tasks enable row level security;

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

drop policy if exists documents_select on documents;
create policy documents_select on documents for select
  using (
    team_id in (select my_team_ids())
    and (added_by = auth.uid() or can_view_by_roles(team_id, visible_roles))
  );

drop policy if exists documents_insert on documents;
create policy documents_insert on documents for insert
  with check (team_id in (select my_team_ids()));

drop policy if exists documents_update on documents;
create policy documents_update on documents for update
  using (team_id in (select my_team_ids()));

drop policy if exists documents_delete on documents;
create policy documents_delete on documents for delete
  using (team_id in (select my_team_ids()));

drop policy if exists bulletins_all on bulletins;

drop policy if exists bulletins_select on bulletins;
create policy bulletins_select on bulletins for select
  using (
    team_id in (select my_team_ids())
    and (created_by = auth.uid() or can_view_by_roles(team_id, visible_roles))
  );

drop policy if exists bulletins_insert on bulletins;
create policy bulletins_insert on bulletins for insert
  with check (team_id in (select my_team_ids()));

drop policy if exists bulletins_update on bulletins;
create policy bulletins_update on bulletins for update
  using (team_id in (select my_team_ids()));

drop policy if exists bulletins_delete on bulletins;
create policy bulletins_delete on bulletins for delete
  using (team_id in (select my_team_ids()));

drop policy if exists bulletin_reads_all on bulletin_reads;
create policy bulletin_reads_all on bulletin_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists channels_all on channels;

drop policy if exists channels_select on channels;
create policy channels_select on channels for select
  using (team_id in (select my_team_ids()) and (kind <> 'custom' or can_access_channel(id)));

drop policy if exists channels_insert on channels;
create policy channels_insert on channels for insert
  with check (team_id in (select my_team_ids()));

drop policy if exists channels_update on channels;
create policy channels_update on channels for update
  using (team_id in (select my_team_ids()) and (kind <> 'custom' or can_access_channel(id)));

drop policy if exists channels_delete on channels;
create policy channels_delete on channels for delete
  using (team_id in (select my_team_ids()) and (created_by = auth.uid() or is_team_admin(team_id)));

drop policy if exists channel_members_select on channel_members;
create policy channel_members_select on channel_members for select
  using (channel_id in (select id from channels where team_id in (select my_team_ids())));

drop policy if exists channel_members_insert on channel_members;
create policy channel_members_insert on channel_members for insert
  with check (
    channel_id in (
      select id from channels c
      where c.team_id in (select my_team_ids()) and (c.created_by = auth.uid() or is_team_admin(c.team_id))
    )
  );

drop policy if exists channel_members_delete on channel_members;
create policy channel_members_delete on channel_members for delete
  using (
    user_id = auth.uid()
    or channel_id in (select id from channels c where c.created_by = auth.uid() or is_team_admin(c.team_id))
  );

drop policy if exists messages_all on messages;

drop policy if exists messages_select on messages;
create policy messages_select on messages for select
  using (team_id in (select my_team_ids()) and can_access_channel(channel_id));

drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert
  with check (team_id in (select my_team_ids()) and can_access_channel(channel_id));

drop policy if exists messages_update on messages;
create policy messages_update on messages for update
  using (team_id in (select my_team_ids()) and (author_id = auth.uid() or is_team_admin(team_id)));

drop policy if exists messages_delete on messages;
create policy messages_delete on messages for delete
  using (team_id in (select my_team_ids()) and (author_id = auth.uid() or is_team_admin(team_id)));

drop policy if exists tasks_all on tasks;

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select
  using (
    team_id in (select my_team_ids())
    and (created_by = auth.uid() or can_view_by_roles(team_id, visible_roles))
  );

drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks for insert
  with check (team_id in (select my_team_ids()));

drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks for update
  using (team_id in (select my_team_ids()));

drop policy if exists tasks_delete on tasks;
create policy tasks_delete on tasks for delete
  using (team_id in (select my_team_ids()));

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
  foreach t in array array['team_members', 'events', 'documents', 'bulletins', 'channels', 'channel_members', 'messages', 'tasks']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
