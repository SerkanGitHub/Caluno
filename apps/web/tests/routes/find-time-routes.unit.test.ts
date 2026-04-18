import { describe, expect, it, vi } from 'vitest';
import { load as findTimePageLoad } from '../../src/routes/(app)/calendars/[calendarId]/find-time/+page.server';

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

function createQueuedSupabase(params: {
  fromEntries?: Array<{ table: string; builder: ReturnType<typeof createThenableBuilder> }>;
  rpcEntries?: Array<{ fn: string; result: { data: unknown; error: { message: string } | null } }>;
}) {
  const fromEntries = [...(params.fromEntries ?? [])];
  const rpcEntries = [...(params.rpcEntries ?? [])];

  return {
    from: vi.fn((table: string) => {
      const entry = fromEntries.shift();
      expect(entry?.table).toBe(table);
      return entry?.builder;
    }),
    rpc: vi.fn((fn: string) => {
      const entry = rpcEntries.shift();
      expect(entry?.fn).toBe(fn);
      return Promise.resolve(entry?.result);
    })
  };
}

function createParentResult(calendarId = 'aaaaaaaa-aaaa-1111-1111-111111111111') {
  return {
    user: { id: '11111111-1111-1111-1111-111111111111' },
    appShell: {
      memberships: [{ groupId: 'group-a', userId: '11111111-1111-1111-1111-111111111111', role: 'owner' as const }],
      calendars: [{ id: calendarId, groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
      groups: [
        {
          id: 'group-a',
          name: 'Alpha Group',
          role: 'owner' as const,
          calendars: [{ id: calendarId, groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
          joinCode: null,
          joinCodeStatus: 'unavailable' as const
        }
      ],
      primaryCalendar: null
    }
  };
}

describe('find-time protected route contract', () => {
  it('denies malformed calendar ids before any trusted query runs', async () => {
    const supabase = createQueuedSupabase({});

    const result = (await findTimePageLoad({
      params: { calendarId: 'not-a-uuid' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/not-a-uuid/find-time?duration=60')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('denied');
    if (result.findTimeView.kind === 'denied') {
      expect(result.findTimeView.reason).toBe('calendar-id-invalid');
      expect(result.findTimeView.failurePhase).toBe('calendar-param');
    }
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects missing duration before any roster or busy lookup runs', async () => {
    const supabase = createQueuedSupabase({});

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search.status).toBe('invalid-input');
      expect(result.findTimeView.search.reason).toBe('FIND_TIME_DURATION_REQUIRED');
      expect(result.findTimeView.search.totalWindows).toBe(0);
    }
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed range anchors before any roster or busy lookup runs', async () => {
    const supabase = createQueuedSupabase({});

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=not-a-date')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search.status).toBe('invalid-input');
      expect(result.findTimeView.search.reason).toBe('FIND_TIME_RANGE_START_INVALID');
    }
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('surfaces trusted query timeouts as retryable timeout state', async () => {
    const supabase = createQueuedSupabase({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-a' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-a', role: 'owner' as const }],
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

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search.status).toBe('timeout');
      expect(result.findTimeView.search.reason).toBe('FIND_TIME_ROSTER_TIMEOUT');
      expect(result.findTimeView.search.totalWindows).toBe(0);
    }
  });

  it('returns explicit no-results state when no truthful window satisfies the duration', async () => {
    const capture = {
      eq: [] as Array<[string, unknown]>,
      lt: [] as Array<[string, unknown]>,
      gt: [] as Array<[string, unknown]>,
      order: [] as Array<[string, unknown]>
    };

    const supabase = createQueuedSupabase({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-a' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-a', role: 'owner' as const }],
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

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search.status).toBe('no-results');
      expect(result.findTimeView.search.reason).toBe('FIND_TIME_NO_RESULTS');
      expect(result.findTimeView.search.totalWindows).toBe(0);
    }
    expect(capture.eq).toContainEqual(['calendar_id', 'aaaaaaaa-aaaa-1111-1111-111111111111']);
    expect(capture.lt).toContainEqual(['start_at', '2026-05-15T00:00:00.000Z']);
    expect(capture.gt).toContainEqual(['end_at', '2026-04-15T00:00:00.000Z']);
  });

  it('denies calendars outside the trusted app-shell scope before any server query runs', async () => {
    const supabase = createQueuedSupabase({});

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult('bbbbbbbb-bbbb-2222-2222-222222222222')),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('denied');
    if (result.findTimeView.kind === 'denied') {
      expect(result.findTimeView.reason).toBe('calendar-missing');
      expect(result.findTimeView.failurePhase).toBe('calendar-lookup');
    }
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('returns separate ranked top picks and browse windows for a permitted calendar route', async () => {
    const supabase = createQueuedSupabase({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-a' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-a', role: 'owner' as const }],
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

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search).toMatchObject({
        status: 'ready',
        durationMinutes: 60,
        topPickCount: 3,
        totalBrowseWindows: 1,
        totalWindows: 4,
        truncated: false
      });
      expect(result.findTimeView.search.topPicks.map((window: { startAt: string }) => window.startAt)).toEqual([
        '2026-04-15T11:00:00.000Z',
        '2026-04-15T00:00:00.000Z',
        '2026-04-15T09:00:00.000Z'
      ]);
      expect(result.findTimeView.search.browseWindows.map((window: { startAt: string }) => window.startAt)).toEqual([
        '2026-04-15T10:00:00.000Z'
      ]);
      expect(result.findTimeView.search.windows.map((window: { startAt: string }) => window.startAt)).toEqual([
        '2026-04-15T11:00:00.000Z',
        '2026-04-15T00:00:00.000Z',
        '2026-04-15T09:00:00.000Z',
        '2026-04-15T10:00:00.000Z'
      ]);
      expect(result.findTimeView.search.topPicks[0]).toMatchObject({
        topPick: true,
        topPickRank: 1,
        blockedMembers: []
      });
      expect(result.findTimeView.search.browseWindows[0]).toMatchObject({
        topPick: false,
        availableMemberIds: [
          '11111111-1111-1111-1111-111111111111',
          '33333333-3333-3333-3333-333333333333'
        ],
        blockedMembers: [
          expect.objectContaining({
            memberId: '22222222-2222-2222-2222-222222222222',
            displayName: 'Bob Member'
          })
        ],
        nearbyConstraints: {
          leading: [
            expect.objectContaining({
              shiftId: 'shift-b',
              shiftTitle: 'Design review',
              relation: 'leading'
            })
          ],
          trailing: []
        }
      });
    }
  });

  it('keeps ready browse results explicit when no shortlist candidate qualifies', async () => {
    const supabase = createQueuedSupabase({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-a' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-a', role: 'owner' as const }],
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

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search).toMatchObject({
        status: 'ready',
        topPickCount: 0,
        totalBrowseWindows: 1,
        totalWindows: 1,
        truncated: false
      });
      expect(result.findTimeView.search.topPicks).toEqual([]);
      expect(result.findTimeView.search.browseWindows).toHaveLength(1);
      expect(result.findTimeView.search.windows).toEqual(result.findTimeView.search.browseWindows);
      expect(result.findTimeView.search.browseWindows[0]).toMatchObject({
        topPickEligible: false,
        topPick: false,
        availableMemberIds: ['11111111-1111-1111-1111-111111111111']
      });
    }
  });

  it('fails closed on malformed trusted busy rows before shaping shortlist explanations', async () => {
    const supabase = createQueuedSupabase({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', group_id: 'group-a' }],
            error: null
          })
        },
        {
          table: 'group_memberships',
          builder: createThenableBuilder({
            data: [{ group_id: 'group-a', role: 'owner' as const }],
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

    const result = (await findTimePageLoad({
      params: { calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111' },
      locals: { supabase },
      parent: vi.fn().mockResolvedValue(createParentResult()),
      url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15')
    } as unknown as Parameters<typeof findTimePageLoad>[0])) as Exclude<Awaited<ReturnType<typeof findTimePageLoad>>, void>;

    expect(result.findTimeView.kind).toBe('calendar');
    if (result.findTimeView.kind === 'calendar') {
      expect(result.findTimeView.search).toMatchObject({
        status: 'malformed-response',
        reason: 'FIND_TIME_ASSIGNMENT_TITLE_MISSING',
        totalWindows: 0,
        topPickCount: 0,
        totalBrowseWindows: 0
      });
      expect(result.findTimeView.search.topPicks).toEqual([]);
      expect(result.findTimeView.search.browseWindows).toEqual([]);
      expect(result.findTimeView.search.windows).toEqual([]);
    }
  });
});
