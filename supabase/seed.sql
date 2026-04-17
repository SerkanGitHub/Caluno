begin;

-- Local development users. All seeded accounts use the password: password123
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Alice Owner"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Bob Member"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'casey@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Casey Owner"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'dana@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Dana Multi-Group"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'erin@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Erin Outsider"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    phone_change_token = coalesce(phone_change_token, '')
where email in (
  'alice@example.com',
  'bob@example.com',
  'casey@example.com',
  'dana@example.com',
  'erin@example.com'
);

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'alice@example.com',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com","email_verified":true}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'bob@example.com',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@example.com","email_verified":true}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'casey@example.com',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"casey@example.com","email_verified":true}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'dana@example.com',
    '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"dana@example.com","email_verified":true}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    'erin@example.com',
    '55555555-5555-5555-5555-555555555555',
    '{"sub":"55555555-5555-5555-5555-555555555555","email":"erin@example.com","email_verified":true}'::jsonb,
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (provider_id, provider) do update
set user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = excluded.updated_at;

insert into public.groups (id, name, created_by)
values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'Alpha Team', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'Beta Team', '33333333-3333-3333-3333-333333333333')
on conflict (id) do update
set name = excluded.name,
    created_by = excluded.created_by,
    updated_at = timezone('utc', now());

insert into public.group_memberships (group_id, user_id, role, joined_via)
values
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'owner', 'seed'),
  ('aaaaaaaa-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'member', 'seed'),
  ('aaaaaaaa-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'member', 'seed'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'owner', 'seed'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'member', 'seed')
on conflict (group_id, user_id) do update
set role = excluded.role,
    joined_via = excluded.joined_via;

insert into public.calendars (id, group_id, name, is_default, created_by)
values
  ('aaaaaaaa-aaaa-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'Alpha shared', true, '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-1111-1111-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111', 'Alpha backlog', false, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'Beta shared', true, '33333333-3333-3333-3333-333333333333')
on conflict (id) do update
set group_id = excluded.group_id,
    name = excluded.name,
    is_default = excluded.is_default,
    created_by = excluded.created_by,
    updated_at = timezone('utc', now());

insert into public.group_join_codes (id, group_id, code, created_by, consumed_count, expires_at, revoked_at)
values
  (
    'aaaaaaaa-3333-3333-3333-333333333333',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'ALPHA123',
    '11111111-1111-1111-1111-111111111111',
    0,
    timezone('utc', now()) + interval '30 day',
    null
  ),
  (
    'bbbbbbbb-3333-3333-3333-333333333333',
    'bbbbbbbb-2222-2222-2222-222222222222',
    'BETA2024',
    '33333333-3333-3333-3333-333333333333',
    0,
    timezone('utc', now()) + interval '30 day',
    null
  ),
  (
    'cccccccc-3333-3333-3333-333333333333',
    'bbbbbbbb-2222-2222-2222-222222222222',
    'EXPIRE01',
    '33333333-3333-3333-3333-333333333333',
    0,
    timezone('utc', now()) - interval '1 day',
    null
  ),
  (
    'dddddddd-3333-3333-3333-333333333333',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'REVOKED1',
    '11111111-1111-1111-1111-111111111111',
    0,
    timezone('utc', now()) + interval '30 day',
    timezone('utc', now())
  )
on conflict (id) do update
set group_id = excluded.group_id,
    code = excluded.code,
    created_by = excluded.created_by,
    consumed_count = excluded.consumed_count,
    expires_at = excluded.expires_at,
    revoked_at = excluded.revoked_at,
    updated_at = timezone('utc', now());

insert into public.shift_series (
  id,
  calendar_id,
  title,
  starts_at,
  ends_at,
  recurrence_cadence,
  recurrence_interval,
  repeat_count,
  repeat_until,
  timezone_name,
  created_by
)
values
  (
    'aaaaaaaa-5555-1111-1111-111111111111',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    'Alpha opening sweep',
    '2026-04-13T08:30:00Z',
    '2026-04-13T09:00:00Z',
    'daily',
    1,
    4,
    '2026-04-16T09:00:00Z',
    'UTC',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do update
set calendar_id = excluded.calendar_id,
    title = excluded.title,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    recurrence_cadence = excluded.recurrence_cadence,
    recurrence_interval = excluded.recurrence_interval,
    repeat_count = excluded.repeat_count,
    repeat_until = excluded.repeat_until,
    timezone_name = excluded.timezone_name,
    created_by = excluded.created_by,
    updated_at = timezone('utc', now());

insert into public.shifts (
  id,
  calendar_id,
  series_id,
  title,
  start_at,
  end_at,
  occurrence_index,
  source_kind,
  created_by
)
values
  (
    'aaaaaaaa-6666-1111-1111-111111111111',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    null,
    'Morning intake',
    '2026-04-15T09:00:00Z',
    '2026-04-15T11:00:00Z',
    null,
    'single',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-6666-1111-1111-222222222222',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    null,
    'Afternoon handoff',
    '2026-04-15T13:00:00Z',
    '2026-04-15T15:00:00Z',
    null,
    'single',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-7777-1111-1111-111111111111',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    null,
    'Kitchen prep',
    '2026-04-16T12:00:00Z',
    '2026-04-16T14:00:00Z',
    null,
    'single',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-7777-1111-1111-222222222222',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    null,
    'Supplier call',
    '2026-04-16T13:00:00Z',
    '2026-04-16T15:00:00Z',
    null,
    'single',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-8888-1111-1111-111111111111',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    'aaaaaaaa-5555-1111-1111-111111111111',
    'Alpha opening sweep',
    '2026-04-13T08:30:00Z',
    '2026-04-13T09:00:00Z',
    1,
    'series',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-8888-1111-1111-222222222222',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    'aaaaaaaa-5555-1111-1111-111111111111',
    'Alpha opening sweep',
    '2026-04-14T08:30:00Z',
    '2026-04-14T09:00:00Z',
    2,
    'series',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-8888-1111-1111-333333333333',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    'aaaaaaaa-5555-1111-1111-111111111111',
    'Alpha opening sweep',
    '2026-04-15T08:30:00Z',
    '2026-04-15T09:00:00Z',
    3,
    'series',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-8888-1111-1111-444444444444',
    'aaaaaaaa-aaaa-1111-1111-111111111111',
    'aaaaaaaa-5555-1111-1111-111111111111',
    'Alpha opening sweep',
    '2026-04-16T08:30:00Z',
    '2026-04-16T09:00:00Z',
    4,
    'series',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'bbbbbbbb-6666-2222-2222-111111111111',
    'bbbbbbbb-bbbb-2222-2222-222222222222',
    null,
    'Beta planning',
    '2026-04-15T10:00:00Z',
    '2026-04-15T12:00:00Z',
    null,
    'single',
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    'bbbbbbbb-6666-2222-2222-222222222222',
    'bbbbbbbb-bbbb-2222-2222-222222222222',
    null,
    'Beta support window',
    '2026-04-16T15:00:00Z',
    '2026-04-16T17:00:00Z',
    null,
    'single',
    '33333333-3333-3333-3333-333333333333'
  )
on conflict (id) do update
set calendar_id = excluded.calendar_id,
    series_id = excluded.series_id,
    title = excluded.title,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    occurrence_index = excluded.occurrence_index,
    source_kind = excluded.source_kind,
    created_by = excluded.created_by,
    updated_at = timezone('utc', now());

insert into public.shift_assignments (shift_id, member_id, created_by)
values
  ('aaaaaaaa-6666-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-6666-1111-1111-222222222222', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-7777-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-7777-1111-1111-222222222222', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-7777-1111-1111-222222222222', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-8888-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-8888-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-8888-1111-1111-333333333333', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-8888-1111-1111-444444444444', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-6666-2222-2222-111111111111', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbbb-6666-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333')
on conflict (shift_id, member_id) do update
set created_by = excluded.created_by;

commit;
