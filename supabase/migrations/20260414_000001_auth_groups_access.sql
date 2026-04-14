create extension if not exists pgcrypto;

create type public.group_role as enum ('owner', 'member');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (position('@' in email) > 1),
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.group_memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.group_role not null,
  joined_via text not null default 'direct' check (char_length(btrim(joined_via)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  is_default boolean not null default false,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index calendars_one_default_per_group_idx
  on public.calendars (group_id)
  where is_default;

create table public.group_join_codes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique check (code = upper(code) and char_length(code) between 6 and 12),
  created_by uuid not null references auth.users (id) on delete restrict,
  consumed_count integer not null default 0 check (consumed_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index group_memberships_user_group_idx on public.group_memberships (user_id, group_id);
create index calendars_group_idx on public.calendars (group_id);
create index group_join_codes_group_idx on public.group_join_codes (group_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger groups_set_updated_at
before update on public.groups
for each row execute procedure public.set_updated_at();

create trigger calendars_set_updated_at
before update on public.calendars
for each row execute procedure public.set_updated_at();

create trigger group_join_codes_set_updated_at
before update on public.group_join_codes
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''), '')
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.profiles.display_name),
      updated_at = timezone('utc', now());

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.normalize_join_code(input text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(upper(coalesce(input, '')), '[^A-Z0-9]', '', 'g'), '');
$$;

create or replace function public.current_user_is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.current_user_owns_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

create or replace function public.current_user_can_access_calendar(target_calendar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendars c
    where c.id = target_calendar_id
      and public.current_user_is_group_member(c.group_id)
  );
$$;

create or replace function public.create_group_with_default_calendar(
  p_group_name text,
  p_calendar_name text default 'Shared calendar'
)
returns table (group_id uuid, calendar_id uuid, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  normalized_group_name text := btrim(coalesce(p_group_name, ''));
  normalized_calendar_name text := btrim(coalesce(p_calendar_name, ''));
  new_group_id uuid;
  new_calendar_id uuid;
  generated_code text;
begin
  if actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if normalized_group_name = '' then
    raise exception 'GROUP_NAME_REQUIRED';
  end if;

  if normalized_calendar_name = '' then
    normalized_calendar_name := 'Shared calendar';
  end if;

  insert into public.groups (name, created_by)
  values (normalized_group_name, actor)
  returning id into new_group_id;

  insert into public.group_memberships (group_id, user_id, role, joined_via)
  values (new_group_id, actor, 'owner', 'create_group');

  insert into public.calendars (group_id, name, is_default, created_by)
  values (new_group_id, normalized_calendar_name, true, actor)
  returning id into new_calendar_id;

  loop
    generated_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));

    begin
      insert into public.group_join_codes (group_id, code, created_by)
      values (new_group_id, generated_code, actor);
      exit;
    exception
      when unique_violation then
        generated_code := null;
    end;
  end loop;

  return query select new_group_id, new_calendar_id, generated_code;
end;
$$;

create or replace function public.redeem_group_join_code(p_code text)
returns table (group_id uuid, calendar_id uuid, role public.group_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  normalized_code text := public.normalize_join_code(p_code);
  matched_code public.group_join_codes%rowtype;
  matched_calendar_id uuid;
  membership_role public.group_role;
  membership_insert_count integer := 0;
begin
  if actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if normalized_code is null then
    raise exception 'JOIN_CODE_REQUIRED';
  end if;

  select *
  into matched_code
  from public.group_join_codes gjc
  where gjc.code = normalized_code
  order by gjc.created_at desc
  limit 1;

  if matched_code.id is null then
    raise exception 'JOIN_CODE_INVALID';
  end if;

  if matched_code.revoked_at is not null then
    raise exception 'JOIN_CODE_REVOKED';
  end if;

  if matched_code.expires_at is not null and matched_code.expires_at <= timezone('utc', now()) then
    raise exception 'JOIN_CODE_EXPIRED';
  end if;

  insert into public.group_memberships (group_id, user_id, role, joined_via)
  values (matched_code.group_id, actor, 'member', 'join_code')
  on conflict (group_id, user_id) do nothing;

  get diagnostics membership_insert_count = row_count;

  if membership_insert_count > 0 then
    update public.group_join_codes
    set consumed_count = consumed_count + 1,
        updated_at = timezone('utc', now())
    where id = matched_code.id;
  end if;

  select c.id
  into matched_calendar_id
  from public.calendars c
  where c.group_id = matched_code.group_id
  order by c.is_default desc, c.created_at asc
  limit 1;

  if matched_calendar_id is null then
    raise exception 'GROUP_DEFAULT_CALENDAR_MISSING';
  end if;

  select gm.role
  into membership_role
  from public.group_memberships gm
  where gm.group_id = matched_code.group_id
    and gm.user_id = actor;

  return query select matched_code.group_id, matched_calendar_id, membership_role;
end;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.calendars enable row level security;
alter table public.group_join_codes enable row level security;

create policy profiles_select_self
on public.profiles
for select
using (id = auth.uid());

create policy profiles_update_self
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy groups_select_member
on public.groups
for select
using (public.current_user_is_group_member(id));

create policy group_memberships_select_member_group
on public.group_memberships
for select
using (public.current_user_is_group_member(group_id));

create policy calendars_select_member_group
on public.calendars
for select
using (public.current_user_can_access_calendar(id));

create policy group_join_codes_select_group_owner
on public.group_join_codes
for select
using (public.current_user_owns_group(group_id));

grant select, update on public.profiles to authenticated;
grant select on public.groups, public.group_memberships, public.calendars, public.group_join_codes to authenticated;
grant execute on function public.normalize_join_code(text) to authenticated, anon;
grant execute on function public.current_user_is_group_member(uuid) to authenticated;
grant execute on function public.current_user_owns_group(uuid) to authenticated;
grant execute on function public.current_user_can_access_calendar(uuid) to authenticated;
grant execute on function public.create_group_with_default_calendar(text, text) to authenticated;
grant execute on function public.redeem_group_join_code(text) to authenticated;
