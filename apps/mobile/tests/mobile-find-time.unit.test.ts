import { describe, expect, it } from 'vitest';
import type { MobileCalendarRouteResult } from '../src/lib/shell/load-app-shell';
import { loadMobileFindTimeSearchView } from '../src/lib/find-time/transport';
import {
  partitionMobileFindTimeWindows,
  resolveMobileFindTimeRouteState,
  shouldLoadMobileFindTimeSearch
} from '../src/lib/find-time/view';

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
    select: () => builder,
    eq: (column: string, value: unknown) => {
      capture?.eq?.push([column, value]);
      return builder;
    },
    lt: (column: string, value: unknown) => {
      capture?.lt?.push([column, value]);
      return builder;
    },
    gt: (column: string, value: unknown) => {
      capture?.gt?.push([column, value]);
      return builder;
    },
    order: (column: string, value: unknown) => {
      capture?.order?.push([column, value]);
      return builder;
    },
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected)
  };

  return builder;
}

function createQueuedClient(params: {
  fromEntries?: Array<{ table: string; builder: ReturnType<typeof createThenableBuilder> }>;
  rpcEntries?: Array<{ fn: string; result: { data: unknown; error: { message: string } | null } }>;
  calls?: { from: string[]; rpc: string[] };
}) {
  const fromEntries = [...(params.fromEntries ?? [])];
  const rpcEntries = [...(params.rpcEntries ?? [])];
  const calls = params.calls ?? { from: [], rpc: [] };

  return {
    from(table: string) {
      calls.from.push(table);
      const entry = fromEntries.shift();
      expect(entry?.table).toBe(table);
      return entry?.builder;
    },
    rpc(fn: string) {
      calls.rpc.push(fn);
      const entry = rpcEntries.shift();
      expect(entry?.fn).toBe(fn);
      return Promise.resolve(entry?.result);
    }
  };
}

function createCalendarRouteResult(calendarId = 'aaaaaaaa-aaaa-1111-1111-111111111111'): MobileCalendarRouteResult {
  return {
    kind: 'calendar',
    bootstrapMode: 'ready',
    appShell: {
      viewer: {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'alice@example.com',
        displayName: 'Alice Owner'
      },
      memberships: [{ groupId: 'group-alpha', userId: '11111111-1111-1111-1111-111111111111', role: 'owner' }],
      groups: [
        {
          id: 'group-alpha',
          name: 'Alpha Group',
          role: 'owner',
          calendars: [{ id: calendarId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }],
          joinCode: null,
          joinCodeStatus: 'unavailable'
        }
      ],
      calendars: [{ id: calendarId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }],
      primaryCalendar: { id: calendarId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true },
      onboardingState: 'ready'
    },
    state: {
      kind: 'calendar',
      calendar: { id: calendarId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }
    }
  };
}

function createDeniedRouteResult(reason: 'calendar-id-invalid' | 'calendar-missing' = 'calendar-id-invalid'): MobileCalendarRouteResult {
  return {
    kind: 'denied',
    bootstrapMode: 'ready',
    appShell: createCalendarRouteResult().appShell,
    state: {
      kind: 'denied',
      reason,
      attemptedCalendarId: reason === 'calendar-id-invalid' ? 'not-a-uuid' : 'bbbbbbbb-bbbb-2222-2222-222222222222',
      failurePhase: reason === 'calendar-id-invalid' ? 'calendar-param' : 'calendar-lookup'
    }
  };
}

describe('mobile find-time route state and transport', () => {
  it('keeps cached-offline continuity explicit as offline-unavailable instead of replaying stale results', () => {
    const state = resolveMobileFindTimeRouteState({
      routeAccess: createCalendarRouteResult(),
      routeMode: 'cached-offline',
      network: { connected: true, source: 'navigator' },
      search: {
        status: 'ready',
        reason: null,
        message: 'stale result that should be hidden',
        calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
        range: {
          startAt: '2026-04-15T00:00:00.000Z',
          endAt: '2026-05-15T00:00:00.000Z',
          totalDays: 30,
          source: 'query',
          requestedStart: '2026-04-15'
        },
        durationMinutes: 60,
        roster: [],
        busyIntervals: [],
        topPicks: [],
        browseWindows: [],
        windows: [],
        topPickCount: 0,
        totalBrowseWindows: 0,
        totalWindows: 0,
        truncated: false,
        shiftIds: [],
        memberIds: []
      }
    });

    expect(state).toMatchObject({
      status: 'offline-unavailable',
      reason: 'FIND_TIME_CACHED_OFFLINE',
      denialPhase: 'continuity',
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0
    });
  });

  it('denies malformed route scope before any search is considered loadable', () => {
    const denied = resolveMobileFindTimeRouteState({
      routeAccess: createDeniedRouteResult('calendar-id-invalid'),
      routeMode: 'trusted-online',
      network: { connected: true, source: 'navigator' },
      search: null
    });

    expect(denied).toMatchObject({
      status: 'denied',
      reason: 'calendar-id-invalid',
      denialPhase: 'calendar-param'
    });

    expect(
      shouldLoadMobileFindTimeSearch({
        routeAccess: createDeniedRouteResult('calendar-id-invalid'),
        routeMode: 'trusted-online',
        network: { connected: true, source: 'navigator' }
      })
    ).toBe(false);
  });

  it('rejects blank duration before any roster or busy query runs', async () => {
    const calls = { from: [] as string[], rpc: [] as string[] };
    const client = createQueuedClient({ calls });

    const result = await loadMobileFindTimeSearchView({
      client: client as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: null,
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(result).toMatchObject({
      status: 'invalid-input',
      reason: 'FIND_TIME_DURATION_REQUIRED',
      totalWindows: 0
    });
    expect(calls.from).toEqual([]);
    expect(calls.rpc).toEqual([]);
  });

  it('rejects malformed range anchors before any roster or busy query runs', async () => {
    const calls = { from: [] as string[], rpc: [] as string[] };
    const client = createQueuedClient({ calls });

    const result = await loadMobileFindTimeSearchView({
      client: client as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: 'not-a-date',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(result).toMatchObject({
      status: 'invalid-input',
      reason: 'FIND_TIME_RANGE_START_INVALID',
      totalWindows: 0
    });
    expect(calls.from).toEqual([]);
    expect(calls.rpc).toEqual([]);
  });

  it('surfaces trusted roster timeouts as timeout state', async () => {
    const client = createQueuedClient({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-alpha' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          })
        }
      ],
      rpcEntries: [
        {
          fn: 'list_calendar_members',
          result: {
            data: null,
            error: { message: 'statement timeout exceeded' }
          }
        }
      ]
    });

    const result = await loadMobileFindTimeSearchView({
      client: client as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(result).toMatchObject({
      status: 'timeout',
      reason: 'FIND_TIME_ROSTER_TIMEOUT',
      totalWindows: 0
    });
  });

  it('surfaces busy-query failures and malformed rows explicitly', async () => {
    const queryFailureClient = createQueuedClient({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-alpha' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          })
        },
        {
          table: 'shifts',
          builder: createThenableBuilder({
            data: null,
            error: { message: 'RLS blocked shifts' }
          })
        }
      ],
      rpcEntries: [
        {
          fn: 'list_calendar_members',
          result: {
            data: [
              {
                member_id: '11111111-1111-1111-1111-111111111111',
                display_name: 'Alice Owner'
              }
            ],
            error: null
          }
        }
      ]
    });

    const queryFailure = await loadMobileFindTimeSearchView({
      client: queryFailureClient as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(queryFailure).toMatchObject({
      status: 'query-failure',
      reason: 'FIND_TIME_ASSIGNMENTS_FAILED',
      totalWindows: 0
    });

    const malformedClient = createQueuedClient({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-alpha' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          })
        },
        {
          table: 'shifts',
          builder: createThenableBuilder({
            data: [
              {
                id: 'shift-a',
                title: '   ',
                start_at: '2026-04-15T09:00:00.000Z',
                end_at: '2026-04-15T10:00:00.000Z',
                shift_assignments: [{ member_id: '11111111-1111-1111-1111-111111111111' }]
              }
            ],
            error: null
          })
        }
      ],
      rpcEntries: [
        {
          fn: 'list_calendar_members',
          result: {
            data: [
              {
                member_id: '11111111-1111-1111-1111-111111111111',
                display_name: 'Alice Owner'
              }
            ],
            error: null
          }
        }
      ]
    });

    const malformed = await loadMobileFindTimeSearchView({
      client: malformedClient as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(malformed).toMatchObject({
      status: 'malformed-response',
      reason: 'FIND_TIME_ASSIGNMENT_TITLE_MISSING',
      totalWindows: 0,
      topPickCount: 0,
      totalBrowseWindows: 0
    });
  });

  it('returns no-results, browse-only, and ready top-pick partitions deterministically', async () => {
    const capture = {
      eq: [] as Array<[string, unknown]>,
      lt: [] as Array<[string, unknown]>,
      gt: [] as Array<[string, unknown]>,
      order: [] as Array<[string, unknown]>
    };

    const noResultsClient = createQueuedClient({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-alpha' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          })
        },
        {
          table: 'shifts',
          builder: createThenableBuilder(
            {
              data: [
                {
                  id: 'shift-a',
                  title: 'Always busy',
                  start_at: '2026-04-15T00:00:00.000Z',
                  end_at: '2026-05-15T00:00:00.000Z',
                  shift_assignments: [{ member_id: '11111111-1111-1111-1111-111111111111' }]
                }
              ],
              error: null
            },
            capture
          )
        }
      ],
      rpcEntries: [
        {
          fn: 'list_calendar_members',
          result: {
            data: [
              {
                member_id: '11111111-1111-1111-1111-111111111111',
                display_name: 'Alice Owner'
              }
            ],
            error: null
          }
        }
      ]
    });

    const noResults = await loadMobileFindTimeSearchView({
      client: noResultsClient as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(noResults).toMatchObject({
      status: 'no-results',
      reason: 'FIND_TIME_NO_RESULTS',
      totalWindows: 0
    });
    expect(capture.eq).toContainEqual(['calendar_id', 'aaaaaaaa-aaaa-1111-1111-111111111111']);
    expect(capture.lt).toContainEqual(['start_at', '2026-05-15T00:00:00.000Z']);
    expect(capture.gt).toContainEqual(['end_at', '2026-04-15T00:00:00.000Z']);

    const browseOnlyClient = createQueuedClient({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-alpha' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          })
        },
        {
          table: 'shifts',
          builder: createThenableBuilder({
            data: [],
            error: null
          })
        }
      ],
      rpcEntries: [
        {
          fn: 'list_calendar_members',
          result: {
            data: [
              {
                member_id: '11111111-1111-1111-1111-111111111111',
                display_name: 'Alice Owner'
              }
            ],
            error: null
          }
        }
      ]
    });

    const browseOnly = await loadMobileFindTimeSearchView({
      client: browseOnlyClient as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(browseOnly).toMatchObject({
      status: 'ready',
      topPickCount: 0,
      totalBrowseWindows: 1,
      totalWindows: 1
    });

    const readyClient = createQueuedClient({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-alpha' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          })
        },
        {
          table: 'shifts',
          builder: createThenableBuilder({
            data: [
              {
                id: 'shift-a',
                title: 'Daily standup',
                start_at: '2026-04-15T09:00:00.000Z',
                end_at: '2026-04-15T10:00:00.000Z',
                shift_assignments: [{ member_id: '11111111-1111-1111-1111-111111111111' }]
              },
              {
                id: 'shift-b',
                title: 'Design review',
                start_at: '2026-04-15T10:00:00.000Z',
                end_at: '2026-04-15T11:00:00.000Z',
                shift_assignments: [{ member_id: '22222222-2222-2222-2222-222222222222' }]
              }
            ],
            error: null
          })
        }
      ],
      rpcEntries: [
        {
          fn: 'list_calendar_members',
          result: {
            data: [
              {
                member_id: '11111111-1111-1111-1111-111111111111',
                display_name: 'Alice Owner'
              },
              {
                member_id: '22222222-2222-2222-2222-222222222222',
                display_name: 'Bob Member'
              },
              {
                member_id: '33333333-3333-3333-3333-333333333333',
                display_name: 'Cara Support'
              }
            ],
            error: null
          }
        }
      ]
    });

    const ready = await loadMobileFindTimeSearchView({
      client: readyClient as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      duration: '60',
      start: '2026-04-15',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(ready).toMatchObject({
      status: 'ready',
      durationMinutes: 60,
      topPickCount: 3,
      totalBrowseWindows: 1,
      totalWindows: 4,
      truncated: false
    });
    expect(ready.topPicks.map((window) => window.startAt)).toEqual([
      '2026-04-15T11:00:00.000Z',
      '2026-04-15T00:00:00.000Z',
      '2026-04-15T09:00:00.000Z'
    ]);
    expect(ready.browseWindows.map((window) => window.startAt)).toEqual(['2026-04-15T10:00:00.000Z']);

    expect(partitionMobileFindTimeWindows(ready.windows)).toMatchObject({
      topPickCount: 3,
      browseCount: 1,
      totalWindows: 4
    });
  });
});
