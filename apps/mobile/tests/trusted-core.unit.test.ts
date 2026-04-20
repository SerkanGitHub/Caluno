import { describe, expect, it } from 'vitest';
import {
  composeAppGroups,
  pickPrimaryCalendar,
  readSupabasePublicEnv,
  resolveCalendarPageState,
  resolveTrustedCalendarFromAppShell
} from '@repo/caluno-core';

const alphaDefaultId = 'aaaaaaaa-aaaa-1111-1111-111111111111';
const alphaSecondaryId = 'aaaaaaaa-aaaa-1111-1111-222222222222';
const betaDefaultId = 'bbbbbbbb-bbbb-2222-2222-111111111111';

describe('shared trusted core contract', () => {
  it('rejects malformed calendar ids before any trusted lookup can widen scope', () => {
    expect(
      resolveCalendarPageState({
        calendarId: 'not-a-uuid',
        userId: 'user-a',
        memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
        calendars: [
          { id: alphaDefaultId, groupId: 'group-a', name: 'Alpha shared', isDefault: true }
        ]
      })
    ).toEqual({
      kind: 'denied',
      attemptedCalendarId: 'not-a-uuid',
      reason: 'calendar-id-invalid',
      failurePhase: 'calendar-param'
    });
  });

  it('collapses real-but-out-of-scope calendar ids into calendar-missing without probing arbitrary existence', () => {
    expect(
      resolveTrustedCalendarFromAppShell({
        calendarId: betaDefaultId,
        userId: 'user-a',
        memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
        calendars: [
          { id: alphaDefaultId, groupId: 'group-a', name: 'Alpha shared', isDefault: true },
          { id: alphaSecondaryId, groupId: 'group-a', name: 'Alpha backlog', isDefault: false }
        ]
      })
    ).toEqual({
      ok: false,
      reason: 'calendar-missing',
      failurePhase: 'calendar-lookup'
    });
  });

  it('picks the default calendar first, then falls back to the first sorted visible calendar, then null', () => {
    const alphaGroup = {
      id: 'group-a',
      name: 'Alpha Group',
      role: 'owner' as const,
      calendars: [
        { id: alphaSecondaryId, groupId: 'group-a', name: 'Alpha backlog', isDefault: false },
        { id: alphaDefaultId, groupId: 'group-a', name: 'Alpha shared', isDefault: true }
      ],
      joinCode: 'ALPHA123',
      joinCodeStatus: 'active' as const
    };

    expect(pickPrimaryCalendar([alphaGroup])).toEqual(alphaGroup.calendars[1]);

    expect(
      pickPrimaryCalendar([
        {
          ...alphaGroup,
          calendars: [
            { id: alphaSecondaryId, groupId: 'group-a', name: 'Alpha backlog', isDefault: false }
          ]
        }
      ])
    ).toEqual({ id: alphaSecondaryId, groupId: 'group-a', name: 'Alpha backlog', isDefault: false });

    expect(pickPrimaryCalendar([])).toBeNull();
  });

  it('shapes memberships, calendar ordering, and join-code state from trusted app-shell rows', () => {
    const originalDateNow = Date.now;
    Date.now = () => new Date('2026-04-21T10:00:00.000Z').getTime();

    try {
      const result = composeAppGroups({
        userId: 'user-a',
        memberships: [{ group_id: 'group-a', role: 'owner' }],
        groups: [{ id: 'group-a', name: 'Alpha Group' }],
        calendars: [
          { id: alphaSecondaryId, group_id: 'group-a', name: 'Alpha backlog', is_default: false },
          { id: alphaDefaultId, group_id: 'group-a', name: 'Alpha shared', is_default: true }
        ],
        joinCodes: [{ group_id: 'group-a', code: 'ALPHA123', expires_at: null, revoked_at: null }]
      });

      expect(result.memberships).toEqual([{ groupId: 'group-a', userId: 'user-a', role: 'owner' }]);
      expect(result.groups).toEqual([
        {
          id: 'group-a',
          name: 'Alpha Group',
          role: 'owner',
          calendars: [
            { id: alphaDefaultId, groupId: 'group-a', name: 'Alpha shared', isDefault: true },
            { id: alphaSecondaryId, groupId: 'group-a', name: 'Alpha backlog', isDefault: false }
          ],
          joinCode: 'ALPHA123',
          joinCodeStatus: 'active'
        }
      ]);
      expect(result.calendars.map((calendar) => calendar.id)).toEqual([alphaDefaultId, alphaSecondaryId]);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it('rejects blank public Supabase env values with explicit missing-key diagnostics', () => {
    expect(() =>
      readSupabasePublicEnv({
        PUBLIC_SUPABASE_URL: '   ',
        PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' publishable-key '
      })
    ).toThrow('Missing required public Supabase env: PUBLIC_SUPABASE_URL');

    expect(
      readSupabasePublicEnv({
        PUBLIC_SUPABASE_URL: ' https://example.supabase.co ',
        PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' publishable-key '
      })
    ).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key'
    });
  });
});
