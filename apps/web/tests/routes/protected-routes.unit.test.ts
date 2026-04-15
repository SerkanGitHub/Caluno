import { describe, expect, it, vi } from 'vitest';
import { normalizeInternalPath, resolveAuthSurface } from '../../src/lib/server/auth-flow';
import { resolveCalendarPageState } from '../../src/lib/server/app-shell';
import {
  readCachedAppShellSnapshot,
  writeCachedAppShellSnapshot,
  type StorageLike
} from '../../src/lib/offline/app-shell-cache';
import {
  OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
  createMemoryScheduleRepository,
  type OfflineScheduleWeekSnapshot
} from '../../src/lib/offline/repository';
import { resolveProtectedShellRouteData } from '../../src/routes/(app)/+layout';
import { resolveCachedCalendarRouteData } from '../../src/routes/(app)/calendars/[calendarId]/+page';
import { load as appLayoutLoad } from '../../src/routes/(app)/+layout.server';
import { actions as groupActions } from '../../src/routes/(app)/groups/+page.server';
import { load as calendarPageLoad } from '../../src/routes/(app)/calendars/[calendarId]/+page.server';
import { GET as authCallbackGet } from '../../src/routes/(auth)/callback/+server';

function createRequest(formData: FormData) {
  return new Request('http://localhost/groups', {
    method: 'POST',
    body: formData
  });
}

function createStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function writeTrustedShell(storage: StorageLike) {
  writeCachedAppShellSnapshot(
    {
      viewer: {
        id: 'user-a',
        email: 'user@example.com',
        displayName: 'User One'
      },
      session: {
        userId: 'user-a',
        email: 'user@example.com',
        displayName: 'User One',
        expiresAtMs: new Date('2026-04-15T12:00:00.000Z').getTime(),
        refreshedAt: '2026-04-15T10:00:00.000Z'
      },
      groups: [
        {
          id: 'group-a',
          name: 'Alpha Group',
          role: 'owner',
          calendars: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              groupId: 'group-a',
              name: 'Alpha shared',
              isDefault: true
            }
          ],
          joinCode: null,
          joinCodeStatus: 'unavailable'
        }
      ],
      calendars: [
        {
          id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
          groupId: 'group-a',
          name: 'Alpha shared',
          isDefault: true
        }
      ],
      primaryCalendar: {
        id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
        groupId: 'group-a',
        name: 'Alpha shared',
        isDefault: true
      },
      onboardingState: 'ready',
      now: new Date('2026-04-15T10:00:00.000Z')
    },
    storage
  );
}

function createOfflineWeekSnapshot(): OfflineScheduleWeekSnapshot {
  return {
    scope: {
      userId: 'user-a',
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      weekStart: '2026-04-20'
    },
    visibleWeek: {
      start: '2026-04-20',
      endExclusive: '2026-04-27',
      startAt: '2026-04-20T00:00:00.000Z',
      endAt: '2026-04-27T00:00:00.000Z',
      requestedStart: '2026-04-20',
      source: 'query',
      reason: null,
      dayKeys: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26']
    },
    shifts: [
      {
        id: 'shift-alpha',
        calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
        seriesId: null,
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z',
        occurrenceIndex: null,
        sourceKind: 'single'
      }
    ],
    cachedAt: '2026-04-15T10:05:00.000Z',
    origin: 'server-sync'
  };
}

function createThenableBuilder<T>(
  result: { data: T; error: { message: string } | null },
  capture?: {
    eq?: Array<[string, unknown]>;
    lt?: Array<[string, unknown]>;
    gt?: Array<[string, unknown]>;
    order?: Array<[string, unknown]>;
  }
) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      capture?.eq?.push([column, value]);
      return builder;
    }),
    lt: vi.fn((column: string, value: unknown) => {
      capture?.lt?.push([column, value]);
      return builder;
    }),
    gt: vi.fn((column: string, value: unknown) => {
      capture?.gt?.push([column, value]);
      return builder;
    }),
    order: vi.fn((column: string, value: unknown) => {
      capture?.order?.push([column, value]);
      return builder;
    }),
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected)
  };

  return builder;
}

describe('auth-flow helpers', () => {
  it('keeps only internal redirect paths', () => {
    expect(normalizeInternalPath('/groups?tab=owned')).toBe('/groups?tab=owned');
    expect(normalizeInternalPath('https://evil.example/phish')).toBe('/groups');
    expect(normalizeInternalPath('//evil.example/phish')).toBe('/groups');
  });

  it('surfaces callback failures as high-level reason codes', () => {
    const surface = resolveAuthSurface(new URLSearchParams('flow=callback-error&reason=CALLBACK_TIMEOUT'));

    expect(surface.state).toBe('callback-error');
    expect(surface.reasonCode).toBe('CALLBACK_TIMEOUT');
    expect(surface.detail).toContain('too long');
  });
});

describe('protected app layout', () => {
  it('redirects anonymous users to the sign-in entrypoint', async () => {
    await expect(
      appLayoutLoad({
        locals: {
          safeGetSession: vi.fn().mockResolvedValue({
            session: null,
            user: null,
            authStatus: 'anonymous'
          })
        },
        url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111')
      } as unknown as Parameters<typeof appLayoutLoad>[0])
    ).rejects.toMatchObject({
      status: 303,
      location:
        '/signin?flow=auth-required&reason=AUTH_REQUIRED&returnTo=%2Fcalendars%2Faaaaaaaa-aaaa-1111-1111-111111111111'
    });
  });

  it('reopens the protected shell from cached scope offline', () => {
    const storage = createStorage();
    writeTrustedShell(storage);

    const result = resolveProtectedShellRouteData({
      isOnline: false,
      cachedLookup: readCachedAppShellSnapshot({
        storage,
        now: new Date('2026-04-15T10:30:00.000Z')
      })
    });

    expect(result.protectedShellState.mode).toBe('cached-offline');
    expect(result.protectedShellState.visibleCalendarIds).toEqual(['aaaaaaaa-aaaa-1111-1111-111111111111']);
    expect(result.appShell?.viewer.displayName).toBe('User One');
    expect(result.appShell?.groups[0]?.name).toBe('Alpha Group');
  });

  it('fails closed offline when no trusted shell snapshot exists on this browser', () => {
    const result = resolveProtectedShellRouteData({
      isOnline: false,
      cachedLookup: readCachedAppShellSnapshot({ storage: createStorage() })
    });

    expect(result.protectedShellState).toEqual({
      mode: 'offline-denied',
      reason: 'cache-missing',
      detail: 'No trusted app-shell continuity snapshot has been stored on this browser yet.',
      refreshedAt: null,
      visibleCalendarIds: []
    });
    expect(result.appShell).toBeNull();
  });
});

describe('group onboarding actions', () => {
  it('rejects blank group names before attempting the create RPC', async () => {
    const rpc = vi.fn();
    const formData = new FormData();
    formData.set('groupName', '   ');
    formData.set('calendarName', 'Shared calendar');

    const result = await groupActions.createGroup({
      request: createRequest(formData),
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: {},
          user: { id: 'user-1' },
          authStatus: 'authenticated'
        }),
        supabase: { rpc }
      }
    } as unknown as Parameters<typeof groupActions.createGroup>[0]);

    expect(result.status).toBe(400);
    expect(result.data.createGroup.reason).toBe('GROUP_NAME_REQUIRED');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects blank join codes before attempting the join RPC', async () => {
    const rpc = vi.fn();
    const formData = new FormData();
    formData.set('joinCode', '---');

    const result = await groupActions.joinGroup({
      request: createRequest(formData),
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: {},
          user: { id: 'user-1' },
          authStatus: 'authenticated'
        }),
        supabase: { rpc }
      }
    } as unknown as Parameters<typeof groupActions.joinGroup>[0]);

    expect(result.status).toBe(400);
    expect(result.data.joinGroup.reason).toBe('JOIN_CODE_REQUIRED');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('calendar route resolution', () => {
  it('fails closed for malformed calendar ids without querying a guessed record', async () => {
    const helperResult = resolveCalendarPageState({
      calendarId: 'not-a-uuid',
      userId: 'user-a',
      memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
      calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }]
    });

    expect(helperResult).toEqual({
      kind: 'denied',
      attemptedCalendarId: 'not-a-uuid',
      reason: 'calendar-id-invalid',
      failurePhase: 'calendar-param'
    });
  });

  it('returns a named denied surface when a malformed route param reaches the page loader', async () => {
    const shiftsFrom = vi.fn();

    const result = (await calendarPageLoad({
      params: { calendarId: 'not-a-uuid' },
      locals: {
        supabase: {
          from: shiftsFrom
        }
      },
      parent: vi.fn().mockResolvedValue({
        user: { id: 'user-a' },
        appShell: {
          memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
          calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
          groups: [],
          primaryCalendar: null
        }
      }),
      url: new URL('http://localhost/calendars/not-a-uuid')
    } as unknown as Parameters<typeof calendarPageLoad>[0])) as Exclude<
      Awaited<ReturnType<typeof calendarPageLoad>>,
      void
    >;

    expect(result.calendarView.kind).toBe('denied');
    expect(result.calendarView.reason).toBe('calendar-id-invalid');
    expect(result.calendarView.failurePhase).toBe('calendar-param');
    expect(shiftsFrom).not.toHaveBeenCalled();
  });

  it('shapes one validated visible week for a permitted calendar route', async () => {
    const capture = {
      eq: [] as Array<[string, unknown]>,
      lt: [] as Array<[string, unknown]>,
      gt: [] as Array<[string, unknown]>,
      order: [] as Array<[string, unknown]>
    };

    const shiftsBuilder = createThenableBuilder(
      {
        data: [
          {
            id: 'aaaaaaaa-9999-1111-1111-111111111111',
            calendar_id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
            series_id: 'aaaaaaaa-5555-1111-1111-111111111111',
            title: 'Alpha opening sweep',
            start_at: '2026-04-20T08:30:00.000Z',
            end_at: '2026-04-20T09:00:00.000Z',
            occurrence_index: 1,
            source_kind: 'series' as const
          },
          {
            id: 'aaaaaaaa-9999-1111-1111-222222222222',
            calendar_id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
            series_id: null,
            title: 'Afternoon handoff',
            start_at: '2026-04-22T13:00:00.000Z',
            end_at: '2026-04-22T15:00:00.000Z',
            occurrence_index: null,
            source_kind: 'single' as const
          }
        ],
        error: null
      },
      capture
    );

    const result = (await calendarPageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: {
        supabase: {
          from: vi.fn((table: string) => {
            expect(table).toBe('shifts');
            return shiftsBuilder;
          })
        }
      },
      parent: vi.fn().mockResolvedValue({
        user: { id: 'user-a' },
        appShell: {
          memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
          calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
          groups: [
            {
              id: 'group-a',
              name: 'Alpha Group',
              role: 'owner',
              calendars: [
                { id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }
              ],
              joinCode: null,
              joinCodeStatus: 'unavailable'
            }
          ],
          primaryCalendar: null
        }
      }),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111?start=2026-04-20')
    } as unknown as Parameters<typeof calendarPageLoad>[0])) as Exclude<
      Awaited<ReturnType<typeof calendarPageLoad>>,
      void
    >;

    expect(result.calendarView.kind).toBe('calendar');
    expect(result.calendarView.visibleWeek.start).toBe('2026-04-20');
    expect(result.calendarView.visibleWeek.endExclusive).toBe('2026-04-27');
    expect(result.calendarView.schedule.totalShifts).toBe(2);
    expect(
      result.calendarView.schedule.days.find((day: { dayKey: string }) => day.dayKey === '2026-04-20')?.shifts
    ).toHaveLength(1);
    expect(
      result.calendarView.schedule.days.find((day: { dayKey: string }) => day.dayKey === '2026-04-22')?.shifts
    ).toHaveLength(1);
    expect(capture.eq).toContainEqual(['calendar_id', 'aaaaaaaa-aaaa-1111-1111-111111111111']);
    expect(capture.lt).toContainEqual(['start_at', '2026-04-27T00:00:00.000Z']);
    expect(capture.gt).toContainEqual(['end_at', '2026-04-20T00:00:00.000Z']);
  });

  it('reopens a previously synced calendar week from cached scope offline', async () => {
    const storage = createStorage();
    writeTrustedShell(storage);

    const shellResult = resolveProtectedShellRouteData({
      isOnline: false,
      cachedLookup: readCachedAppShellSnapshot({
        storage,
        now: new Date('2026-04-15T10:30:00.000Z')
      })
    });

    const repository = createMemoryScheduleRepository({ storage });
    const snapshot = createOfflineWeekSnapshot();
    await repository.putWeekSnapshot(snapshot);

    const routeResult = resolveCachedCalendarRouteData({
      calendarId: snapshot.scope.calendarId,
      searchParams: new URLSearchParams(`start=${snapshot.scope.weekStart}`),
      appShell: shellResult.appShell,
      shellState: shellResult.protectedShellState,
      snapshotResult: await repository.getWeekSnapshot(snapshot.scope)
    });

    expect(routeResult.protectedCalendarState).toEqual({
      mode: 'cached-offline',
      reason: null,
      detail: 'This calendar reopened from the last trusted week snapshot stored on this browser.',
      cachedAt: '2026-04-15T10:05:00.000Z',
      visibleWeekStart: '2026-04-20',
      visibleWeekOrigin: 'cached-local'
    });
    expect(routeResult.calendarView.kind).toBe('calendar');
    if (routeResult.calendarView.kind === 'calendar') {
      expect(routeResult.calendarView.schedule.totalShifts).toBe(1);
      expect(routeResult.calendarView.group?.name).toBe('Alpha Group');
      expect(routeResult.calendarView.schedule.days[0]?.shifts[0]?.title).toBe('Alpha opening sweep');
    }
  });

  it('fails closed for unsynced offline calendar ids instead of widening cached scope', () => {
    const storage = createStorage();
    writeTrustedShell(storage);

    const shellResult = resolveProtectedShellRouteData({
      isOnline: false,
      cachedLookup: readCachedAppShellSnapshot({
        storage,
        now: new Date('2026-04-15T10:30:00.000Z')
      })
    });

    const routeResult = resolveCachedCalendarRouteData({
      calendarId: 'bbbbbbbb-bbbb-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      appShell: shellResult.appShell,
      shellState: shellResult.protectedShellState
    });

    expect(routeResult.protectedCalendarState.mode).toBe('offline-denied');
    expect(routeResult.protectedCalendarState.reason).toBe('calendar-not-synced');
    expect(routeResult.calendarView.kind).toBe('denied');
    if (routeResult.calendarView.kind === 'denied') {
      expect(routeResult.calendarView.reason).toBe('calendar-missing');
      expect(routeResult.calendarView.failurePhase).toBe('calendar-lookup');
      expect(routeResult.calendarView.detail.title).toBe('That calendar was never synced on this browser.');
    }
  });

  it('fails closed when the cached week snapshot is malformed', async () => {
    const storage = createStorage();
    writeTrustedShell(storage);

    const shellResult = resolveProtectedShellRouteData({
      isOnline: false,
      cachedLookup: readCachedAppShellSnapshot({
        storage,
        now: new Date('2026-04-15T10:30:00.000Z')
      })
    });

    storage.setItem(
      OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
      JSON.stringify({
        weekSnapshots: {
          'user-a::aaaaaaaa-aaaa-1111-1111-111111111111::2026-04-20': '{"scope":{"userId":"user-a"}}'
        },
        localMutations: {}
      })
    );

    const repository = createMemoryScheduleRepository({ storage });
    const routeResult = resolveCachedCalendarRouteData({
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      appShell: shellResult.appShell,
      shellState: shellResult.protectedShellState,
      snapshotResult: await repository.getWeekSnapshot({
        userId: 'user-a',
        calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
        weekStart: '2026-04-20'
      })
    });

    expect(routeResult.protectedCalendarState.mode).toBe('offline-denied');
    expect(routeResult.protectedCalendarState.reason).toBe('snapshot-invalid');
    expect(routeResult.calendarView.kind).toBe('denied');
    if (routeResult.calendarView.kind === 'denied') {
      expect(routeResult.calendarView.detail.title).toBe('The cached calendar snapshot could not be trusted.');
    }
  });

  it('keeps the denied contract for out-of-scope calendar ids without loading schedule data', async () => {
    const shiftsFrom = vi.fn();

    const result = (await calendarPageLoad({
      params: { calendarId: 'bbbbbbbb-bbbb-1111-1111-111111111111' },
      locals: {
        supabase: {
          from: shiftsFrom
        }
      },
      parent: vi.fn().mockResolvedValue({
        user: { id: 'user-a' },
        appShell: {
          memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
          calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
          groups: [],
          primaryCalendar: null
        }
      }),
      url: new URL('http://localhost/calendars/bbbbbbbb-bbbb-1111-1111-111111111111?start=2026-04-20')
    } as unknown as Parameters<typeof calendarPageLoad>[0])) as Exclude<
      Awaited<ReturnType<typeof calendarPageLoad>>,
      void
    >;

    expect(result.calendarView.kind).toBe('denied');
    expect(result.calendarView.reason).toBe('calendar-missing');
    expect(result.calendarView.failurePhase).toBe('calendar-lookup');
    expect(shiftsFrom).not.toHaveBeenCalled();
  });

  it('surfaces invalid week params as typed visible-week metadata while staying on a bounded fallback week', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

    const shiftsBuilder = createThenableBuilder({ data: [], error: null });

    const result = (await calendarPageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: {
        supabase: {
          from: vi.fn(() => shiftsBuilder)
        }
      },
      parent: vi.fn().mockResolvedValue({
        user: { id: 'user-a' },
        appShell: {
          memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
          calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
          groups: [],
          primaryCalendar: null
        }
      }),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111?start=not-a-date')
    } as unknown as Parameters<typeof calendarPageLoad>[0])) as Exclude<
      Awaited<ReturnType<typeof calendarPageLoad>>,
      void
    >;

    expect(result.calendarView.kind).toBe('calendar');
    expect(result.calendarView.visibleWeek.source).toBe('fallback-invalid');
    expect(result.calendarView.visibleWeek.reason).toBe('VISIBLE_WEEK_START_INVALID');
    expect(result.calendarView.visibleWeek.start).toBe('2026-04-13');
    expect(result.calendarView.schedule.reason).toBe('VISIBLE_WEEK_START_INVALID');

    vi.useRealTimers();
  });
});

describe('auth callback route', () => {
  it('drops malformed callback requests and redirects back to sign-in', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });

    await expect(
      authCallbackGet({
        url: new URL('http://localhost/callback'),
        locals: {
          supabase: {
            auth: {
              signOut,
              exchangeCodeForSession: vi.fn()
            }
          }
        }
      } as unknown as Parameters<typeof authCallbackGet>[0])
    ).rejects.toMatchObject({
      status: 303,
      location: '/signin?flow=callback-error&reason=CALLBACK_CODE_MISSING'
    });

    expect(signOut).toHaveBeenCalled();
  });
});
