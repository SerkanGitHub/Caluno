create type public.shift_recurrence_cadence as enum ('daily', 'weekly', 'monthly');

create table public.shift_series (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurrence_cadence public.shift_recurrence_cadence,
  recurrence_interval integer,
  repeat_count integer,
  repeat_until timestamptz,
  timezone_name text not null default 'UTC' check (char_length(btrim(timezone_name)) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shift_series_time_range check (ends_at > starts_at),
  constraint shift_series_recurrence_interval check (
    (recurrence_cadence is null and recurrence_interval is null)
    or (recurrence_cadence is not null and recurrence_interval is not null and recurrence_interval between 1 and 52)
  ),
  constraint shift_series_repeat_count_valid check (repeat_count is null or repeat_count between 1 and 366),
  constraint shift_series_repeat_until_after_start check (repeat_until is null or repeat_until >= ends_at),
  constraint shift_series_recurrence_bound check (
    (recurrence_cadence is null and repeat_count is null and repeat_until is null)
    or (recurrence_cadence is not null and (repeat_count is not null or repeat_until is not null))
  )
);

create unique index shift_series_id_calendar_idx on public.shift_series (id, calendar_id);
create index shift_series_calendar_starts_at_idx on public.shift_series (calendar_id, starts_at);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  series_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  start_at timestamptz not null,
  end_at timestamptz not null,
  occurrence_index integer,
  source_kind text not null default 'single' check (source_kind in ('single', 'series')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shifts_time_range check (end_at > start_at),
  constraint shifts_series_occurrence_contract check (
    (series_id is null and occurrence_index is null and source_kind = 'single')
    or (series_id is not null and occurrence_index is not null and occurrence_index >= 1 and source_kind = 'series')
  ),
  constraint shifts_series_calendar_fk foreign key (series_id, calendar_id)
    references public.shift_series (id, calendar_id)
    on delete cascade
);

create unique index shifts_series_occurrence_unique_idx
  on public.shifts (series_id, occurrence_index)
  where series_id is not null;
create index shifts_calendar_start_at_idx on public.shifts (calendar_id, start_at);
create index shifts_calendar_end_at_idx on public.shifts (calendar_id, end_at);

create trigger shift_series_set_updated_at
before update on public.shift_series
for each row execute procedure public.set_updated_at();

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute procedure public.set_updated_at();

create or replace function public.current_user_can_access_shift_series(target_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shift_series ss
    where ss.id = target_series_id
      and public.current_user_can_access_calendar(ss.calendar_id)
  );
$$;

create or replace function public.current_user_can_access_shift(target_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shifts s
    where s.id = target_shift_id
      and public.current_user_can_access_calendar(s.calendar_id)
  );
$$;

alter table public.shift_series enable row level security;
alter table public.shifts enable row level security;

create policy shift_series_select_member_calendar
on public.shift_series
for select
using (public.current_user_can_access_shift_series(id));

create policy shift_series_insert_member_calendar
on public.shift_series
for insert
with check (public.current_user_can_access_calendar(calendar_id));

create policy shift_series_update_member_calendar
on public.shift_series
for update
using (public.current_user_can_access_shift_series(id))
with check (public.current_user_can_access_calendar(calendar_id));

create policy shift_series_delete_member_calendar
on public.shift_series
for delete
using (public.current_user_can_access_shift_series(id));

create policy shifts_select_member_calendar
on public.shifts
for select
using (public.current_user_can_access_shift(id));

create policy shifts_insert_member_calendar
on public.shifts
for insert
with check (
  public.current_user_can_access_calendar(calendar_id)
  and (series_id is null or public.current_user_can_access_shift_series(series_id))
);

create policy shifts_update_member_calendar
on public.shifts
for update
using (public.current_user_can_access_shift(id))
with check (
  public.current_user_can_access_calendar(calendar_id)
  and (series_id is null or public.current_user_can_access_shift_series(series_id))
);

create policy shifts_delete_member_calendar
on public.shifts
for delete
using (public.current_user_can_access_shift(id));

grant select, insert, update, delete on public.shift_series, public.shifts to authenticated;
grant execute on function public.current_user_can_access_shift_series(uuid) to authenticated;
grant execute on function public.current_user_can_access_shift(uuid) to authenticated;
