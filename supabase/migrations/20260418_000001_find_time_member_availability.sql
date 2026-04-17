create table public.shift_assignments (
  shift_id uuid not null references public.shifts (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (shift_id, member_id)
);

create index shift_assignments_member_id_idx on public.shift_assignments (member_id);

create or replace function public.current_user_can_assign_member_to_shift(target_shift_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shifts s
    join public.calendars c
      on c.id = s.calendar_id
    join public.group_memberships gm
      on gm.group_id = c.group_id
    where s.id = target_shift_id
      and gm.user_id = target_member_id
      and public.current_user_can_access_calendar(s.calendar_id)
  );
$$;

create or replace function public.list_calendar_members(p_calendar_id uuid)
returns table (member_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select
    gm.user_id as member_id,
    coalesce(nullif(btrim(p.display_name), ''), split_part(p.email, '@', 1)) as display_name
  from public.calendars c
  join public.group_memberships gm
    on gm.group_id = c.group_id
  join public.profiles p
    on p.id = gm.user_id
  where c.id = p_calendar_id
    and public.current_user_can_access_calendar(p_calendar_id)
  order by lower(coalesce(nullif(btrim(p.display_name), ''), split_part(p.email, '@', 1))), gm.user_id;
$$;

alter table public.shift_assignments enable row level security;

create policy shift_assignments_select_member_calendar
on public.shift_assignments
for select
using (public.current_user_can_access_shift(shift_id));

create policy shift_assignments_insert_member_calendar
on public.shift_assignments
for insert
with check (
  created_by = auth.uid()
  and public.current_user_can_access_shift(shift_id)
  and public.current_user_can_assign_member_to_shift(shift_id, member_id)
);

create policy shift_assignments_update_member_calendar
on public.shift_assignments
for update
using (public.current_user_can_access_shift(shift_id))
with check (
  created_by = auth.uid()
  and public.current_user_can_access_shift(shift_id)
  and public.current_user_can_assign_member_to_shift(shift_id, member_id)
);

create policy shift_assignments_delete_member_calendar
on public.shift_assignments
for delete
using (public.current_user_can_access_shift(shift_id));

grant select, insert, update, delete on public.shift_assignments to authenticated;
grant execute on function public.current_user_can_assign_member_to_shift(uuid, uuid) to authenticated;
grant execute on function public.list_calendar_members(uuid) to authenticated;
