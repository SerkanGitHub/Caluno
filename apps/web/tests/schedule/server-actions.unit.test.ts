import { describe, expect, it, vi } from 'vitest';
import {
  createScheduleShift,
  deleteScheduleShift,
  editScheduleShift,
  moveScheduleShift,
  resolveVisibleWeek,
  validateCreateShiftForm
} from '../../src/lib/server/schedule';

function createFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function createThenableBuilder<T>(
  result: { data: T; error: { message: string } | null },
  capture?: {
    eq?: Array<[string, unknown]>;
    insert?: unknown[];
    update?: unknown[];
    deleted?: number;
  }
) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn((payload: unknown) => {
      capture?.insert?.push(payload);
      return builder;
    }),
    update: vi.fn((payload: unknown) => {
      capture?.update?.push(payload);
      return builder;
    }),
    delete: vi.fn(() => {
      if (capture) {
        capture.deleted = (capture.deleted ?? 0) + 1;
      }
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      capture?.eq?.push([column, value]);
      return builder;
    }),
    lt: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected)
  };

  return builder;
}

function createQueuedSupabase(entries: Array<{ table: string; builder: ReturnType<typeof createThenableBuilder> }>) {
  return {
    from: vi.fn((table: string) => {
      const entry = entries.shift();
      expect(entry?.table).toBe(table);
      return entry?.builder;
    })
  };
}

describe('schedule server helpers', () => {
  it('parses a deterministic visible week from the start query param', () => {
    const visibleWeek = resolveVisibleWeek(new URLSearchParams('start=2026-04-20'));

    expect(visibleWeek.start).toBe('2026-04-20');
    expect(visibleWeek.endExclusive).toBe('2026-04-27');
    expect(visibleWeek.source).toBe('query');
    expect(visibleWeek.reason).toBeNull();
  });

  it('falls back to the current bounded week when the start query param is malformed', () => {
    const visibleWeek = resolveVisibleWeek(
      new URLSearchParams('start=definitely-not-a-date'),
      new Date('2026-04-15T12:00:00.000Z')
    );

    expect(visibleWeek.start).toBe('2026-04-13');
    expect(visibleWeek.source).toBe('fallback-invalid');
    expect(visibleWeek.reason).toBe('VISIBLE_WEEK_START_INVALID');
  });

  it('rejects blank shift titles before any write runs', () => {
    const result = validateCreateShiftForm({
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      formData: createFormData({
        title: '   ',
        startAt: '2026-04-20T09:00:00.000Z',
        endAt: '2026-04-20T11:00:00.000Z',
        recurrenceCadence: '',
        recurrenceInterval: '',
        repeatCount: '',
        repeatUntil: ''
      })
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      reason: 'TITLE_REQUIRED'
    });
  });

  it('rejects recurring creates that omit both repeat count and repeat-until bounds', () => {
    const result = validateCreateShiftForm({
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      formData: createFormData({
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z',
        recurrenceCadence: 'daily',
        recurrenceInterval: '1',
        repeatCount: '',
        repeatUntil: ''
      })
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      reason: 'RECURRENCE_BOUND_REQUIRED'
    });
  });

  it('returns a retryable timeout state when a trusted create write times out', async () => {
    const insertCapture = {
      insert: [] as unknown[]
    };

    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
            data: null,
            error: { message: 'statement timeout exceeded' }
          },
          insertCapture
        )
      }
    ]);

    const result = await createScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        title: 'Morning intake',
        startAt: '2026-04-20T09:00:00.000Z',
        endAt: '2026-04-20T11:00:00.000Z',
        recurrenceCadence: '',
        recurrenceInterval: '',
        repeatCount: '',
        repeatUntil: ''
      })
    });

    expect(result.status).toBe(504);
    expect(result.state.status).toBe('timeout');
    expect(result.state.reason).toBe('SCHEDULE_CREATE_TIMEOUT');
    expect(result.state.visibleWeekStart).toBe('2026-04-20');
    expect(insertCapture.insert[0]).toMatchObject({
      calendar_id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      title: 'Morning intake'
    });
  });

  it('rejects cross-calendar edits even when the shift id is otherwise visible to the user', async () => {
    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
              id: 'aaaaaaaa-9999-1111-1111-111111111111',
              calendar_id: 'bbbbbbbb-bbbb-1111-1111-111111111111',
              series_id: null,
              title: 'Other calendar shift',
              start_at: '2026-04-20T09:00:00.000Z',
              end_at: '2026-04-20T11:00:00.000Z',
              occurrence_index: null,
              source_kind: 'single' as const
            }
          ],
          error: null
        })
      }
    ]);

    const result = await editScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        shiftId: 'aaaaaaaa-9999-1111-1111-111111111111',
        title: 'Edited title',
        startAt: '2026-04-20T09:30:00.000Z',
        endAt: '2026-04-20T11:30:00.000Z'
      })
    });

    expect(result.status).toBe(403);
    expect(result.state.status).toBe('forbidden');
    expect(result.state.reason).toBe('SHIFT_CALENDAR_MISMATCH');
  });

  it('rejects move requests that would widen the trusted visible range beyond one week', async () => {
    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
    ]);

    const result = await moveScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        shiftId: 'aaaaaaaa-9999-1111-1111-111111111111',
        title: '',
        startAt: '2026-04-20T09:00:00.000Z',
        endAt: '2026-04-28T09:30:00.000Z'
      })
    });

    expect(result.status).toBe(400);
    expect(result.state.status).toBe('validation-error');
    expect(result.state.reason).toBe('VISIBLE_RANGE_TOO_WIDE');
  });

  it('writes a creator assignment alongside a trusted single-shift create', async () => {
    const shiftInsertCapture = {
      insert: [] as unknown[]
    };
    const assignmentInsertCapture = {
      insert: [] as unknown[]
    };

    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
            data: null,
            error: null
          },
          shiftInsertCapture
        )
      },
      {
        table: 'shift_assignments',
        builder: createThenableBuilder(
          {
            data: null,
            error: null
          },
          assignmentInsertCapture
        )
      }
    ]);

    const result = await createScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        title: 'Morning intake',
        startAt: '2026-04-20T09:00:00.000Z',
        endAt: '2026-04-20T11:00:00.000Z',
        recurrenceCadence: '',
        recurrenceInterval: '',
        repeatCount: '',
        repeatUntil: ''
      })
    });

    const insertedShift = shiftInsertCapture.insert[0] as {
      id: string;
      calendar_id: string;
      created_by: string;
    };
    const insertedAssignments = assignmentInsertCapture.insert[0] as Array<{
      shift_id: string;
      member_id: string;
      created_by: string;
    }>;

    expect(result.status).toBe(200);
    expect(result.state.status).toBe('success');
    expect(result.state.reason).toBe('SHIFT_CREATED');
    expect(result.state.affectedShiftIds).toEqual([insertedShift.id]);
    expect(insertedShift).toMatchObject({
      calendar_id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      created_by: '11111111-1111-1111-1111-111111111111'
    });
    expect(insertedAssignments).toEqual([
      {
        shift_id: insertedShift.id,
        member_id: '11111111-1111-1111-1111-111111111111',
        created_by: '11111111-1111-1111-1111-111111111111'
      }
    ]);
  });

  it('rolls back a trusted single-shift create when the creator assignment write fails', async () => {
    const shiftInsertCapture = {
      insert: [] as unknown[]
    };
    const deleteCapture = {
      eq: [] as Array<[string, unknown]>,
      deleted: 0
    };

    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
            data: null,
            error: null
          },
          shiftInsertCapture
        )
      },
      {
        table: 'shift_assignments',
        builder: createThenableBuilder({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        })
      },
      {
        table: 'shifts',
        builder: createThenableBuilder(
          {
            data: null,
            error: null
          },
          deleteCapture
        )
      }
    ]);

    const result = await createScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        title: 'Morning intake',
        startAt: '2026-04-20T09:00:00.000Z',
        endAt: '2026-04-20T11:00:00.000Z',
        recurrenceCadence: '',
        recurrenceInterval: '',
        repeatCount: '',
        repeatUntil: ''
      })
    });

    const insertedShift = shiftInsertCapture.insert[0] as { id: string };

    expect(result.status).toBe(400);
    expect(result.state.status).toBe('write-error');
    expect(result.state.reason).toBe('SCHEDULE_CREATE_ASSIGNMENT_FAILED');
    expect(deleteCapture.deleted).toBe(1);
    expect(deleteCapture.eq).toContainEqual(['id', insertedShift.id]);
    expect(deleteCapture.eq).toContainEqual(['calendar_id', 'aaaaaaaa-aaaa-1111-1111-111111111111']);
  });

  it('fans creator assignments out across recurring shift occurrences', async () => {
    const seriesInsertCapture = {
      insert: [] as unknown[]
    };
    const shiftInsertCapture = {
      insert: [] as unknown[]
    };
    const assignmentInsertCapture = {
      insert: [] as unknown[]
    };

    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
        table: 'shift_series',
        builder: createThenableBuilder(
          {
            data: null,
            error: null
          },
          seriesInsertCapture
        )
      },
      {
        table: 'shifts',
        builder: createThenableBuilder(
          {
            data: null,
            error: null
          },
          shiftInsertCapture
        )
      },
      {
        table: 'shift_assignments',
        builder: createThenableBuilder(
          {
            data: null,
            error: null
          },
          assignmentInsertCapture
        )
      }
    ]);

    const result = await createScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z',
        recurrenceCadence: 'daily',
        recurrenceInterval: '1',
        repeatCount: '3',
        repeatUntil: ''
      })
    });

    const insertedSeries = seriesInsertCapture.insert[0] as { id: string };
    const insertedShifts = shiftInsertCapture.insert[0] as Array<{ id: string; series_id: string }>;
    const insertedAssignments = assignmentInsertCapture.insert[0] as Array<{
      shift_id: string;
      member_id: string;
      created_by: string;
    }>;

    expect(result.status).toBe(200);
    expect(result.state.status).toBe('success');
    expect(result.state.seriesId).toBe(insertedSeries.id);
    expect(result.state.affectedShiftIds).toEqual(insertedShifts.map((row) => row.id));
    expect(insertedShifts).toHaveLength(3);
    expect(insertedShifts.every((row) => row.series_id === insertedSeries.id)).toBe(true);
    expect(insertedAssignments).toEqual(
      insertedShifts.map((row) => ({
        shift_id: row.id,
        member_id: '11111111-1111-1111-1111-111111111111',
        created_by: '11111111-1111-1111-1111-111111111111'
      }))
    );
  });

  it('returns deleted shift ids on a trusted delete success path', async () => {
    const deleteCapture = {
      eq: [] as Array<[string, unknown]>,
      deleted: 0
    };

    const supabase = createQueuedSupabase([
      {
        table: 'calendars',
        builder: createThenableBuilder({
          data: [
            {
              id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              group_id: 'group-a',
              name: 'Alpha shared',
              is_default: true
            }
          ],
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
              id: 'aaaaaaaa-9999-1111-1111-111111111111',
              calendar_id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
              series_id: null,
              title: 'Morning intake',
              start_at: '2026-04-20T09:00:00.000Z',
              end_at: '2026-04-20T11:00:00.000Z',
              occurrence_index: null,
              source_kind: 'single' as const
            }
          ],
          error: null
        })
      },
      {
        table: 'shifts',
        builder: createThenableBuilder(
          {
            data: [
              {
                id: 'aaaaaaaa-9999-1111-1111-111111111111',
                calendar_id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
                series_id: null,
                title: 'Morning intake',
                start_at: '2026-04-20T09:00:00.000Z',
                end_at: '2026-04-20T11:00:00.000Z',
                occurrence_index: null,
                source_kind: 'single' as const
              }
            ],
            error: null
          },
          deleteCapture
        )
      }
    ]);

    const result = await deleteScheduleShift({
      supabase: supabase as never,
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      searchParams: new URLSearchParams('start=2026-04-20'),
      formData: createFormData({
        shiftId: 'aaaaaaaa-9999-1111-1111-111111111111',
        title: '',
        startAt: '',
        endAt: ''
      })
    });

    expect(result.status).toBe(200);
    expect(result.state.status).toBe('success');
    expect(result.state.reason).toBe('SHIFT_DELETED');
    expect(result.state.affectedShiftIds).toEqual(['aaaaaaaa-9999-1111-1111-111111111111']);
    expect(deleteCapture.deleted).toBe(1);
    expect(deleteCapture.eq).toContainEqual(['id', 'aaaaaaaa-9999-1111-1111-111111111111']);
    expect(deleteCapture.eq).toContainEqual(['calendar_id', 'aaaaaaaa-aaaa-1111-1111-111111111111']);
  });
});
