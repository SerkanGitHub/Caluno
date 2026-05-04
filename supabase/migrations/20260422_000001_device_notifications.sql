create table public.notification_installations (
  installation_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  push_provider text check (push_provider is null or char_length(btrim(push_provider)) between 1 and 60),
  push_token text check (push_token is null or char_length(btrim(push_token)) > 0),
  device_platform text check (device_platform is null or char_length(btrim(device_platform)) between 1 and 60),
  token_last_rotated_at timestamptz,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((push_provider is null and push_token is null) or (push_provider is not null and push_token is not null))
);

create index notification_installations_user_idx
  on public.notification_installations (user_id, updated_at desc);

create trigger notification_installations_set_updated_at
before update on public.notification_installations
for each row execute procedure public.set_updated_at();

create table public.device_calendar_notification_preferences (
  installation_id uuid not null references public.notification_installations (installation_id) on delete cascade,
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  desired_enabled boolean not null default false,
  remote_subscription_status text not null default 'unsubscribed'
    check (remote_subscription_status in ('unknown', 'unsubscribed', 'subscribed', 'syncing', 'degraded', 'provider-unconfigured')),
  remote_subscription_reason text check (remote_subscription_reason is null or char_length(btrim(remote_subscription_reason)) between 1 and 80),
  synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (installation_id, calendar_id),
  check (
    (remote_subscription_status in ('degraded', 'provider-unconfigured') and remote_subscription_reason is not null)
    or remote_subscription_status not in ('degraded', 'provider-unconfigured')
  )
);

create index device_calendar_notification_preferences_calendar_idx
  on public.device_calendar_notification_preferences (calendar_id, updated_at desc);

create trigger device_calendar_notification_preferences_set_updated_at
before update on public.device_calendar_notification_preferences
for each row execute procedure public.set_updated_at();

create or replace function public.current_user_can_access_notification_installation(target_installation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notification_installations ni
    where ni.installation_id = target_installation_id
      and ni.user_id = auth.uid()
  );
$$;

create or replace function public.register_notification_installation(
  p_installation_id uuid,
  p_push_token text default null,
  p_push_provider text default null,
  p_device_platform text default null
)
returns table (
  installation_id uuid,
  push_provider text,
  device_platform text,
  token_last_rotated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  existing_user_id uuid;
  previous_push_token text;
  normalized_push_token text := nullif(btrim(coalesce(p_push_token, '')), '');
  normalized_push_provider text := nullif(btrim(coalesce(p_push_provider, '')), '');
  normalized_device_platform text := nullif(btrim(coalesce(p_device_platform, '')), '');
  now_utc timestamptz := timezone('utc', now());
begin
  if actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_installation_id is null then
    raise exception 'INSTALLATION_ID_REQUIRED';
  end if;

  if (normalized_push_token is null) <> (normalized_push_provider is null) then
    raise exception 'PUSH_REGISTRATION_INCOMPLETE';
  end if;

  select ni.user_id, ni.push_token
  into existing_user_id, previous_push_token
  from public.notification_installations ni
  where ni.installation_id = p_installation_id
  for update;

  if existing_user_id is not null and existing_user_id <> actor then
    raise exception 'INSTALLATION_SCOPE_DENIED';
  end if;

  if existing_user_id is null then
    insert into public.notification_installations (
      installation_id,
      user_id,
      push_token,
      push_provider,
      device_platform,
      token_last_rotated_at,
      last_seen_at
    )
    values (
      p_installation_id,
      actor,
      normalized_push_token,
      normalized_push_provider,
      normalized_device_platform,
      case when normalized_push_token is null then null else now_utc end,
      now_utc
    );
  else
    update public.notification_installations
    set push_token = coalesce(normalized_push_token, public.notification_installations.push_token),
        push_provider = coalesce(normalized_push_provider, public.notification_installations.push_provider),
        device_platform = coalesce(normalized_device_platform, public.notification_installations.device_platform),
        token_last_rotated_at = case
          when normalized_push_token is not null and normalized_push_token is distinct from previous_push_token then now_utc
          else public.notification_installations.token_last_rotated_at
        end,
        last_seen_at = now_utc
    where public.notification_installations.installation_id = p_installation_id;
  end if;

  return query
  select
    ni.installation_id,
    ni.push_provider,
    ni.device_platform,
    ni.token_last_rotated_at,
    ni.created_at,
    ni.updated_at
  from public.notification_installations ni
  where ni.installation_id = p_installation_id
    and ni.user_id = actor;
end;
$$;

create or replace function public.list_device_calendar_notification_preferences(
  p_installation_id uuid,
  p_calendar_ids uuid[] default null
)
returns table (
  installation_id uuid,
  calendar_id uuid,
  desired_enabled boolean,
  remote_subscription_status text,
  remote_subscription_reason text,
  synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_calendar_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.current_user_can_access_notification_installation(p_installation_id) then
    raise exception 'INSTALLATION_SCOPE_DENIED';
  end if;

  if p_calendar_ids is not null then
    foreach requested_calendar_id in array p_calendar_ids loop
      if not public.current_user_can_access_calendar(requested_calendar_id) then
        raise exception 'CALENDAR_SCOPE_DENIED';
      end if;
    end loop;
  end if;

  return query
  select
    pref.installation_id,
    pref.calendar_id,
    pref.desired_enabled,
    pref.remote_subscription_status,
    pref.remote_subscription_reason,
    pref.synced_at,
    pref.created_at,
    pref.updated_at
  from public.device_calendar_notification_preferences pref
  where pref.installation_id = p_installation_id
    and public.current_user_can_access_calendar(pref.calendar_id)
    and (p_calendar_ids is null or pref.calendar_id = any (p_calendar_ids))
  order by pref.calendar_id;
end;
$$;

create or replace function public.set_device_calendar_notification_preference(
  p_installation_id uuid,
  p_calendar_id uuid,
  p_desired_enabled boolean,
  p_remote_subscription_status text default 'unknown',
  p_remote_subscription_reason text default null
)
returns table (
  installation_id uuid,
  calendar_id uuid,
  desired_enabled boolean,
  remote_subscription_status text,
  remote_subscription_reason text,
  synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_remote_status text := coalesce(nullif(btrim(coalesce(p_remote_subscription_status, '')), ''), 'unknown');
  normalized_remote_reason text := nullif(btrim(coalesce(p_remote_subscription_reason, '')), '');
  now_utc timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_installation_id is null or p_calendar_id is null then
    raise exception 'NOTIFICATION_SCOPE_REQUIRED';
  end if;

  if not public.current_user_can_access_notification_installation(p_installation_id) then
    raise exception 'INSTALLATION_SCOPE_DENIED';
  end if;

  if not public.current_user_can_access_calendar(p_calendar_id) then
    raise exception 'CALENDAR_SCOPE_DENIED';
  end if;

  if normalized_remote_status not in ('unknown', 'unsubscribed', 'subscribed', 'syncing', 'degraded', 'provider-unconfigured') then
    raise exception 'REMOTE_SUBSCRIPTION_STATUS_INVALID';
  end if;

  if normalized_remote_status in ('degraded', 'provider-unconfigured') and normalized_remote_reason is null then
    raise exception 'REMOTE_SUBSCRIPTION_REASON_REQUIRED';
  end if;

  if normalized_remote_status not in ('degraded', 'provider-unconfigured') then
    normalized_remote_reason := null;
  end if;

  insert into public.device_calendar_notification_preferences (
    installation_id,
    calendar_id,
    desired_enabled,
    remote_subscription_status,
    remote_subscription_reason,
    synced_at
  )
  values (
    p_installation_id,
    p_calendar_id,
    p_desired_enabled,
    normalized_remote_status,
    normalized_remote_reason,
    now_utc
  )
  on conflict (installation_id, calendar_id)
  do update
    set desired_enabled = excluded.desired_enabled,
        remote_subscription_status = excluded.remote_subscription_status,
        remote_subscription_reason = excluded.remote_subscription_reason,
        synced_at = excluded.synced_at;

  return query
  select
    pref.installation_id,
    pref.calendar_id,
    pref.desired_enabled,
    pref.remote_subscription_status,
    pref.remote_subscription_reason,
    pref.synced_at,
    pref.created_at,
    pref.updated_at
  from public.device_calendar_notification_preferences pref
  where pref.installation_id = p_installation_id
    and pref.calendar_id = p_calendar_id;
end;
$$;

alter table public.notification_installations enable row level security;
alter table public.device_calendar_notification_preferences enable row level security;

create policy notification_installations_select_self
on public.notification_installations
for select
using (user_id = auth.uid());

create policy notification_installations_insert_self
on public.notification_installations
for insert
with check (user_id = auth.uid());

create policy notification_installations_update_self
on public.notification_installations
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy device_calendar_notification_preferences_select_scope
on public.device_calendar_notification_preferences
for select
using (
  public.current_user_can_access_notification_installation(installation_id)
  and public.current_user_can_access_calendar(calendar_id)
);

create policy device_calendar_notification_preferences_insert_scope
on public.device_calendar_notification_preferences
for insert
with check (
  public.current_user_can_access_notification_installation(installation_id)
  and public.current_user_can_access_calendar(calendar_id)
);

create policy device_calendar_notification_preferences_update_scope
on public.device_calendar_notification_preferences
for update
using (
  public.current_user_can_access_notification_installation(installation_id)
  and public.current_user_can_access_calendar(calendar_id)
)
with check (
  public.current_user_can_access_notification_installation(installation_id)
  and public.current_user_can_access_calendar(calendar_id)
);

grant select, insert, update on public.notification_installations to authenticated;
grant select, insert, update on public.device_calendar_notification_preferences to authenticated;
grant execute on function public.current_user_can_access_notification_installation(uuid) to authenticated;
grant execute on function public.register_notification_installation(uuid, text, text, text) to authenticated;
grant execute on function public.list_device_calendar_notification_preferences(uuid, uuid[]) to authenticated;
grant execute on function public.set_device_calendar_notification_preference(uuid, uuid, boolean, text, text) to authenticated;
