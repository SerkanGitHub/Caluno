import { describe, expect, it, vi } from 'vitest';
import {
  loadCalendarMemberAvailability,
  normalizeFindTimeRange
} from '../../src/lib/server/find-time';

function createThenableBuilder<T>(result: { data: T; error: { message: string } | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected)
  };

  return builder;
}

function createQueuedSupabase(params: {
  fromEntries: Array<{ table: string; builder: ReturnType<typeof createThenableBuilder> }>;
  rpcEntries?: Array<{ fn: string; result: { data: unknown; error: { message: string } | null } }>;
}) {
  const rpcEntries = [...(params.rpcEntries ?? [])];

  return {
    from: vi.fn((table: string) => {
      const entry = params.fromEntries.shift();
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

describe('find-time member availability', () => {
  it('rejects ranges wider than the trusted 30-day search horizon', () => {
    const result = normalizeFindTimeRange({
      startAt: '2026-04-01T00:00:00.000Z',
      endAt: '2026-05-02T00:00:00.000Z'
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      reason: 'FIND_TIME_RANGE_TOO_WIDE'
    });
  });

  it('returns a trusted roster and member-attributed busy intervals for a permitted calendar', async () => {
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
                id: 'aaaaaaaa-6666-1111-1111-111111111111',
                start_at: '2026-04-15T09:00:00.000Z',
                end_at: '2026-04-15T11:00:00.000Z',
                shift_assignments: [{ member_id: '11111111-1111-1111-1111-111111111111' }]
              },
              {
                id: 'aaaaaaaa-7777-1111-1111-222222222222',
                start_at: '2026-04-16T13:00:00.000Z',
                end_at: '2026-04-16T15:00:00.000Z',
                shift_assignments: [
                  { member_id: '22222222-2222-2222-2222-222222222222' },
                  { member_id: '44444444-4444-4444-4444-444444444444' }
                ]
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
                member_id: '44444444-4444-4444-4444-444444444444',
                display_name: 'Dana Multi-Group'
              },
              {
                member_id: '11111111-1111-1111-1111-111111111111',
                display_name: 'Alice Owner'
              },
              {
                member_id: '22222222-2222-2222-2222-222222222222',
                display_name: 'Bob Member'
              }
            ],
            error: null
          }
        }
      ]
    });

    const result = await loadCalendarMemberAvailability({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      rangeStart: '2026-04-15T00:00:00.000Z',
      rangeEnd: '2026-04-18T00:00:00.000Z'
    });

    expect(result.status).toBe('ready');
    expect(result.reason).toBeNull();
    expect(result.memberIds).toEqual([
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '44444444-4444-4444-4444-444444444444'
    ]);
    expect(result.roster.map((member) => member.displayName)).toEqual([
      'Alice Owner',
      'Bob Member',
      'Dana Multi-Group'
    ]);
    expect(result.busyIntervals).toEqual([
      {
        shiftId: 'aaaaaaaa-6666-1111-1111-111111111111',
        memberId: '11111111-1111-1111-1111-111111111111',
        memberName: 'Alice Owner',
        startAt: '2026-04-15T09:00:00.000Z',
        endAt: '2026-04-15T11:00:00.000Z'
      },
      {
        shiftId: 'aaaaaaaa-7777-1111-1111-222222222222',
        memberId: '22222222-2222-2222-2222-222222222222',
        memberName: 'Bob Member',
        startAt: '2026-04-16T13:00:00.000Z',
        endAt: '2026-04-16T15:00:00.000Z'
      },
      {
        shiftId: 'aaaaaaaa-7777-1111-1111-222222222222',
        memberId: '44444444-4444-4444-4444-444444444444',
        memberName: 'Dana Multi-Group',
        startAt: '2026-04-16T13:00:00.000Z',
        endAt: '2026-04-16T15:00:00.000Z'
      }
    ]);
    expect(result.shiftIds).toEqual([
      'aaaaaaaa-6666-1111-1111-111111111111',
      'aaaaaaaa-7777-1111-1111-222222222222'
    ]);
  });

  it('fails closed when the requested calendar is outside the trusted membership scope', async () => {
    const supabase = createQueuedSupabase({
      fromEntries: [
        {
          table: 'calendars',
          builder: createThenableBuilder({
            data: [],
            error: null
          })
        }
      ]
    });

    const result = await loadCalendarMemberAvailability({
      supabase: supabase as never,
      calendarId: 'bbbbbbbb-bbbb-2222-2222-222222222222',
      userId: '22222222-2222-2222-2222-222222222222',
      rangeStart: '2026-04-15T00:00:00.000Z',
      rangeEnd: '2026-04-18T00:00:00.000Z'
    });

    expect(result.status).toBe('denied');
    expect(result.reason).toBe('CALENDAR_NOT_PERMITTED');
    expect(result.roster).toEqual([]);
    expect(result.busyIntervals).toEqual([]);
  });

  it('returns a timeout state when the trusted roster lookup stalls', async () => {
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
            data: [{ group_id: 'group-a', role: 'member' as const }],
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

    const result = await loadCalendarMemberAvailability({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      rangeStart: '2026-04-15T00:00:00.000Z',
      rangeEnd: '2026-04-18T00:00:00.000Z'
    });

    expect(result.status).toBe('timeout');
    expect(result.reason).toBe('FIND_TIME_ROSTER_TIMEOUT');
  });

  it('refuses to infer availability from a shift that is missing assignments', async () => {
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
                id: 'aaaaaaaa-6666-1111-1111-111111111111',
                start_at: '2026-04-15T09:00:00.000Z',
                end_at: '2026-04-15T11:00:00.000Z',
                shift_assignments: []
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

    const result = await loadCalendarMemberAvailability({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      rangeStart: '2026-04-15T00:00:00.000Z',
      rangeEnd: '2026-04-18T00:00:00.000Z'
    });

    expect(result.status).toBe('malformed-response');
    expect(result.reason).toBe('FIND_TIME_ASSIGNMENTS_MISSING');
    expect(result.roster).toEqual([
      {
        memberId: '11111111-1111-1111-1111-111111111111',
        displayName: 'Alice Owner'
      }
    ]);
  });

  it('refuses assignment rows that point at members outside the trusted roster', async () => {
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
                id: 'aaaaaaaa-6666-1111-1111-111111111111',
                start_at: '2026-04-15T09:00:00.000Z',
                end_at: '2026-04-15T11:00:00.000Z',
                shift_assignments: [{ member_id: '55555555-5555-5555-5555-555555555555' }]
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

    const result = await loadCalendarMemberAvailability({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      rangeStart: '2026-04-15T00:00:00.000Z',
      rangeEnd: '2026-04-18T00:00:00.000Z'
    });

    expect(result.status).toBe('malformed-response');
    expect(result.reason).toBe('FIND_TIME_ASSIGNMENT_MEMBER_UNKNOWN');
  });
});
