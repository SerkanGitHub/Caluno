import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hasGroupMembership,
  normalizeJoinCode,
  resolveCalendarAccess,
  type CalendarRecord,
  type GroupMembership
} from '../../src/lib/access/contract';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), '..', '..', relativePath), 'utf8');
}

const migrationSql = readRepoFile('supabase/migrations/20260414_000001_auth_groups_access.sql');
const seedSql = readRepoFile('supabase/seed.sql');

const memberships: GroupMembership[] = [
  { groupId: 'group-a', userId: 'user-a', role: 'owner' },
  { groupId: 'group-a', userId: 'user-b', role: 'member' },
  { groupId: 'group-a', userId: 'user-d', role: 'member' },
  { groupId: 'group-b', userId: 'user-c', role: 'owner' },
  { groupId: 'group-b', userId: 'user-d', role: 'member' }
];

const calendars: CalendarRecord[] = [
  { id: 'calendar-a-default', groupId: 'group-a', isDefault: true },
  { id: 'calendar-a-secondary', groupId: 'group-a', isDefault: false },
  { id: 'calendar-b-default', groupId: 'group-b', isDefault: true }
];

describe('normalizeJoinCode', () => {
  it('uppercases and strips separators so join codes are compared consistently', () => {
    expect(normalizeJoinCode(' ab-12 cd ')).toBe('AB12CD');
  });

  it('returns null for blank or non-alphanumeric input', () => {
    expect(normalizeJoinCode('   ')).toBeNull();
    expect(normalizeJoinCode('---')).toBeNull();
  });
});

describe('hasGroupMembership', () => {
  it('returns true when the user belongs to the target group', () => {
    expect(hasGroupMembership(memberships, 'user-b', 'group-a')).toBe(true);
  });

  it('returns false for anonymous users or groups they do not belong to', () => {
    expect(hasGroupMembership(memberships, null, 'group-a')).toBe(false);
    expect(hasGroupMembership(memberships, 'user-b', 'group-b')).toBe(false);
  });

  it('supports users who belong to multiple groups without widening access across groups', () => {
    expect(hasGroupMembership(memberships, 'user-d', 'group-a')).toBe(true);
    expect(hasGroupMembership(memberships, 'user-d', 'group-b')).toBe(true);
    expect(hasGroupMembership(memberships, 'user-d', 'group-c')).toBe(false);
  });
});

describe('resolveCalendarAccess', () => {
  it('allows access only when the user is a member of the calendar group', () => {
    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-a-default',
        userId: 'user-a'
      })
    ).toEqual({
      allowed: true,
      reason: 'authenticated-group-member'
    });
  });

  it('denies anonymous access before any calendar lookup can be treated as trusted', () => {
    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-a-default',
        userId: null
      })
    ).toEqual({
      allowed: false,
      reason: 'anonymous'
    });
  });

  it('denies users who guess a calendar id outside their group membership boundary', () => {
    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-b-default',
        userId: 'user-b'
      })
    ).toEqual({
      allowed: false,
      reason: 'group-membership-missing'
    });
  });

  it('fails closed when the requested calendar id does not exist', () => {
    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-missing',
        userId: 'user-a'
      })
    ).toEqual({
      allowed: false,
      reason: 'calendar-missing'
    });
  });

  it('still allows a member to open a secondary calendar because access is derived from group membership', () => {
    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-a-secondary',
        userId: 'user-b'
      })
    ).toEqual({
      allowed: true,
      reason: 'authenticated-group-member'
    });
  });

  it('allows a multi-group user to access each permitted calendar without cross-group leakage', () => {
    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-a-default',
        userId: 'user-d'
      })
    ).toEqual({
      allowed: true,
      reason: 'authenticated-group-member'
    });

    expect(
      resolveCalendarAccess({
        calendars,
        memberships,
        calendarId: 'calendar-b-default',
        userId: 'user-d'
      })
    ).toEqual({
      allowed: true,
      reason: 'authenticated-group-member'
    });
  });
});

describe('supabase sql contract', () => {
  it('keeps the schema authority in the migration with explicit group and calendar identities', () => {
    expect(migrationSql).toContain("create type public.group_role as enum ('owner', 'member');");
    expect(migrationSql).toContain('create table public.groups (');
    expect(migrationSql).toContain('create table public.group_memberships (');
    expect(migrationSql).toContain('create table public.calendars (');
    expect(migrationSql).toContain('create table public.group_join_codes (');
    expect(migrationSql).toContain('create unique index calendars_one_default_per_group_idx');
    expect(migrationSql).toContain('create or replace function public.create_group_with_default_calendar(');
    expect(migrationSql).toContain('create or replace function public.redeem_group_join_code(p_code text)');
  });

  it('derives calendar visibility from authenticated membership and denies guessed calendar ids through policy', () => {
    expect(migrationSql).toContain('create or replace function public.current_user_can_access_calendar(target_calendar_id uuid)');
    expect(migrationSql).toContain('and public.current_user_is_group_member(c.group_id)');
    expect(migrationSql).toMatch(
      /create policy calendars_select_member_group[\s\S]*using \(public\.current_user_can_access_calendar\(id\)\);/
    );
  });

  it('surfaces deterministic join-code failure reasons for blank, invalid, expired, and revoked inputs', () => {
    expect(migrationSql).toContain("raise exception 'JOIN_CODE_REQUIRED';");
    expect(migrationSql).toContain("raise exception 'JOIN_CODE_INVALID';");
    expect(migrationSql).toContain("raise exception 'JOIN_CODE_EXPIRED';");
    expect(migrationSql).toContain("raise exception 'JOIN_CODE_REVOKED';");
    expect(migrationSql).toContain('get diagnostics membership_insert_count = row_count;');
    expect(migrationSql).toContain('on conflict on constraint group_memberships_pkey do nothing;');
  });
});

describe('seed scenarios', () => {
  it('provides deterministic local users, join codes, and access-denied fixtures for future browser proof', () => {
    expect(seedSql).toContain('alice@example.com');
    expect(seedSql).toContain('bob@example.com');
    expect(seedSql).toContain('dana@example.com');
    expect(seedSql).toContain('erin@example.com');
    expect(seedSql).toContain('ALPHA123');
    expect(seedSql).toContain('BETA2024');
    expect(seedSql).toContain('EXPIRE01');
    expect(seedSql).toContain('REVOKED1');
  });

  it('covers the multi-group and default-calendar boundary conditions called out by the slice plan', () => {
    expect(seedSql).toContain("'44444444-4444-4444-4444-444444444444', 'member', 'seed'");
    expect(seedSql).toContain('Alpha shared');
    expect(seedSql).toContain('Alpha backlog');
    expect(seedSql).toContain('Beta shared');
    expect(seedSql).toContain("interval '30 day'");
    expect(seedSql).toContain("interval '1 day'");
  });
});
