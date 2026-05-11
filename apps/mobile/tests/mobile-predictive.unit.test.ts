import { describe, expect, it, vi } from 'vitest';
import { resolveVisibleWeek } from '@repo/caluno-core/route-contract';
import { createTrustedMobileScheduleTransport } from '../src/lib/offline/transport';
import type { MobileSupabaseDataClient } from '../src/lib/supabase/client';

function createThenableBuilder<T>(
  result: { data: T; error: { message: string } | null },
  capture?: {
    eq?: Array<[string, unknown]>;
    gte?: Array<[string, unknown]>;
    lt?: Array<[string, unknown]>;
    order?: Array<[string, unknown]>;
  }
) {
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      capture?.eq?.push([column, value]);
      return builder;
    },
    gte: (column: string, value: unknown) => {
      capture?.gte?.push([column, value]);
      return builder;
    },
    lt: (column: string, value: unknown) => {
      capture?.lt?.push([column, value]);
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

function createDelayedThenableBuilder<T>(result: { data: T; error: { message: string } | null }, delayMs: number) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lt: () => builder,
    order: () => builder,
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      new Promise<typeof result>((resolve) => {
        setTimeout(() => resolve(result), delayMs);
      }).then(onFulfilled, onRejected)
  };

  return builder;
}

function createQueuedClient(builder: unknown): MobileSupabaseDataClient {
  return {
    from(table: string) {
      expect(table).toBe('shifts');
      return builder;
    },
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn()
    },
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn()
    }
  } as unknown as MobileSupabaseDataClient;
}

describe('mobile recurrence suggestion transport', () => {
  const calendarId = 'aaaaaaaa-aaaa-4111-8111-111111111111';
  const visibleWeek = resolveVisibleWeek(new URLSearchParams({ start: '2026-04-20' }));

  it('loads a same-calendar trailing 30-day recurrence suggestion with explicit diagnostics', async () => {
    const capture = {
      eq: [] as Array<[string, unknown]>,
      gte: [] as Array<[string, unknown]>,
      lt: [] as Array<[string, unknown]>,
      order: [] as Array<[string, unknown]>
    };
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const transport = createTrustedMobileScheduleTransport({
      client: createQueuedClient(
        createThenableBuilder(
          {
            data: [
              {
                id: 'suggestion-1',
                calendar_id: calendarId,
                series_id: null,
                title: 'Alpha open',
                start_at: '2026-03-30T08:30:00.000Z',
                end_at: '2026-03-30T09:00:00.000Z',
                occurrence_index: null,
                source_kind: 'single' as const
              },
              {
                id: 'suggestion-2',
                calendar_id: calendarId,
                series_id: null,
                title: 'Alpha open',
                start_at: '2026-04-06T08:30:00.000Z',
                end_at: '2026-04-06T09:00:00.000Z',
                occurrence_index: null,
                source_kind: 'single' as const
              },
              {
                id: 'suggestion-3',
                calendar_id: calendarId,
                series_id: null,
                title: 'Alpha open',
                start_at: '2026-04-13T08:30:00.000Z',
                end_at: '2026-04-13T09:00:00.000Z',
                occurrence_index: null,
                source_kind: 'single' as const
              },
              {
                id: 'other-calendar',
                calendar_id: calendarId,
                series_id: null,
                title: 'Same calendar but different time',
                start_at: '2026-04-18T10:00:00.000Z',
                end_at: '2026-04-18T11:00:00.000Z',
                occurrence_index: null,
                source_kind: 'single' as const
              }
            ],
            error: null
          },
          capture
        )
      ),
      userId: 'user-mobile',
      calendarId
    });

    const result = await transport.loadRecurrenceSuggestion({
      calendarId,
      visibleWeekStart: visibleWeek.start,
      visibleWeekEndAt: visibleWeek.endAt
    });

    expect(result).toEqual({
      suggestion: {
        cadence: 'weekly',
        interval: 1,
        weekday: 1,
        startTime: '08:30',
        endTime: '09:00',
        exemplarShiftId: 'suggestion-3',
        exemplarStartAt: '2026-04-13T08:30:00.000Z',
        exemplarEndAt: '2026-04-13T09:00:00.000Z',
        matchCount: 3,
        matchingShiftIds: ['suggestion-1', 'suggestion-2', 'suggestion-3']
      },
      status: 'ready',
      reason: null,
      message: 'Recent same-calendar shifts suggested a trusted weekly recurrence pattern.',
      lookbackStartAt: '2026-03-28T00:00:00.000Z',
      visibleWeekStart: '2026-04-20',
      visibleWeekEndAt: '2026-04-27T00:00:00.000Z'
    });
    expect(capture.eq).toContainEqual(['calendar_id', calendarId]);
    expect(capture.gte).toContainEqual(['start_at', '2026-03-28T00:00:00.000Z']);
    expect(capture.lt).toContainEqual(['start_at', '2026-04-27T00:00:00.000Z']);
    expect(capture.order).toEqual([
      ['start_at', { ascending: true }],
      ['end_at', { ascending: true }]
    ]);
    expect(consoleInfo).toHaveBeenCalledWith('mobile.calendar.recurrence-suggestion.computed', {
      calendarId,
      visibleWeekStart: '2026-04-20',
      visibleWeekEndAt: '2026-04-27T00:00:00.000Z',
      lookbackStartAt: '2026-03-28T00:00:00.000Z',
      exemplarShiftId: 'suggestion-3',
      matchCount: 3,
      matchingShiftIds: ['suggestion-1', 'suggestion-2', 'suggestion-3']
    });

    consoleInfo.mockRestore();
  });

  it('fails closed with a timeout diagnostic when the bounded history read exceeds the transport timeout', async () => {
    const transport = createTrustedMobileScheduleTransport({
      client: createQueuedClient(createDelayedThenableBuilder({ data: [], error: null }, 25)),
      userId: 'user-mobile',
      calendarId,
      timeoutMs: 1
    });

    const result = await transport.loadRecurrenceSuggestion({
      calendarId,
      visibleWeekStart: visibleWeek.start,
      visibleWeekEndAt: visibleWeek.endAt
    });

    expect(result).toEqual({
      suggestion: null,
      status: 'timeout',
      reason: 'SCHEDULE_RECURRENCE_SUGGESTION_TIMEOUT',
      message: 'The bounded recurrence history query timed out, so predictive hints stayed hidden.',
      lookbackStartAt: '2026-03-28T00:00:00.000Z',
      visibleWeekStart: '2026-04-20',
      visibleWeekEndAt: '2026-04-27T00:00:00.000Z'
    });
  });

  it('fails closed with a query-error diagnostic when the bounded history read errors', async () => {
    const transport = createTrustedMobileScheduleTransport({
      client: createQueuedClient(createThenableBuilder({ data: null, error: { message: 'permission denied' } })),
      userId: 'user-mobile',
      calendarId
    });

    const result = await transport.loadRecurrenceSuggestion({
      calendarId,
      visibleWeekStart: visibleWeek.start,
      visibleWeekEndAt: visibleWeek.endAt
    });

    expect(result).toEqual({
      suggestion: null,
      status: 'query-error',
      reason: 'SCHEDULE_RECURRENCE_SUGGESTION_FAILED',
      message: 'permission denied',
      lookbackStartAt: '2026-03-28T00:00:00.000Z',
      visibleWeekStart: '2026-04-20',
      visibleWeekEndAt: '2026-04-27T00:00:00.000Z'
    });
  });

  it('fails closed with a malformed-response diagnostic when bounded history rows are not trustworthy', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const transport = createTrustedMobileScheduleTransport({
      client: createQueuedClient(
        createThenableBuilder({
          data: [
            {
              id: 'suggestion-bad',
              calendar_id: calendarId,
              series_id: null,
              title: 'Broken row',
              start_at: '2026-04-13T08:30:00.000Z',
              end_at: null,
              occurrence_index: null,
              source_kind: 'single' as const
            }
          ],
          error: null
        })
      ),
      userId: 'user-mobile',
      calendarId
    });

    const result = await transport.loadRecurrenceSuggestion({
      calendarId,
      visibleWeekStart: visibleWeek.start,
      visibleWeekEndAt: visibleWeek.endAt
    });

    expect(result).toEqual({
      suggestion: null,
      status: 'malformed-response',
      reason: 'SCHEDULE_RECURRENCE_SUGGESTION_RESPONSE_INVALID',
      message: 'The bounded recurrence history query returned malformed data, so predictive hints stayed hidden.',
      lookbackStartAt: '2026-03-28T00:00:00.000Z',
      visibleWeekStart: '2026-04-20',
      visibleWeekEndAt: '2026-04-27T00:00:00.000Z'
    });
    expect(consoleInfo).not.toHaveBeenCalled();

    consoleInfo.mockRestore();
  });
});
