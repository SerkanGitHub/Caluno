import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  expandShiftOccurrences,
  materializeShiftOccurrences,
  normalizeShiftDraft,
  normalizeVisibleRange
} from '../../src/lib/schedule/recurrence';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), '..', '..', relativePath), 'utf8');
}

const scheduleMigrationSql = readRepoFile('supabase/migrations/20260415_000002_schedule_shifts.sql');
const seedSql = readRepoFile('supabase/seed.sql');

describe('normalizeShiftDraft', () => {
  it('normalizes bounded recurrence input into a concrete shift draft', () => {
    const result = normalizeShiftDraft({
      calendarId: 'calendar-alpha',
      title: '  Alpha opening sweep  ',
      startAt: '2026-04-13T08:30:00Z',
      endAt: '2026-04-13T09:00:00Z',
      seriesId: 'series-alpha',
      recurrence: {
        cadence: 'daily',
        repeatCount: 4,
        repeatUntil: '2026-04-16T09:00:00Z'
      }
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.title).toBe('Alpha opening sweep');
    expect(result.value.durationMs).toBe(30 * 60 * 1000);
    expect(result.value.recurrence).toEqual({
      cadence: 'daily',
      interval: 1,
      repeatCount: 4,
      repeatUntil: new Date('2026-04-16T09:00:00Z')
    });
  });

  it('rejects blank titles and end dates that do not follow the start', () => {
    expect(
      normalizeShiftDraft({
        calendarId: 'calendar-alpha',
        title: '   ',
        startAt: '2026-04-13T08:30:00Z',
        endAt: '2026-04-13T09:00:00Z'
      })
    ).toEqual({
      ok: false,
      reason: 'TITLE_REQUIRED',
      field: 'title'
    });

    expect(
      normalizeShiftDraft({
        calendarId: 'calendar-alpha',
        title: 'Broken shift',
        startAt: '2026-04-13T09:00:00Z',
        endAt: '2026-04-13T09:00:00Z'
      })
    ).toEqual({
      ok: false,
      reason: 'SHIFT_END_BEFORE_START',
      field: 'endAt'
    });
  });

  it('rejects unsupported cadence values and missing recurrence bounds', () => {
    expect(
      normalizeShiftDraft({
        calendarId: 'calendar-alpha',
        title: 'Bad cadence',
        startAt: '2026-04-13T08:30:00Z',
        endAt: '2026-04-13T09:00:00Z',
        recurrence: {
          cadence: 'yearly',
          repeatCount: 2
        }
      })
    ).toEqual({
      ok: false,
      reason: 'RECURRENCE_CADENCE_UNSUPPORTED',
      field: 'recurrence.cadence'
    });

    expect(
      normalizeShiftDraft({
        calendarId: 'calendar-alpha',
        title: 'Forever rule',
        startAt: '2026-04-13T08:30:00Z',
        endAt: '2026-04-13T09:00:00Z',
        recurrence: {
          cadence: 'weekly'
        }
      })
    ).toEqual({
      ok: false,
      reason: 'RECURRENCE_BOUND_REQUIRED',
      field: 'recurrence.repeatUntil'
    });
  });
});

describe('normalizeVisibleRange', () => {
  it('rejects malformed or overly wide visible windows', () => {
    expect(
      normalizeVisibleRange({
        startAt: 'bad-date',
        endAt: '2026-04-20T00:00:00Z',
        maxDays: 7
      })
    ).toEqual({
      ok: false,
      reason: 'VISIBLE_RANGE_START_INVALID',
      field: 'startAt'
    });

    expect(normalizeVisibleRange({
      startAt: '2026-04-13T00:00:00Z',
      endAt: '2026-04-25T00:00:00Z',
      maxDays: 7
    })).toMatchObject({
      ok: false,
      reason: 'VISIBLE_RANGE_TOO_WIDE'
    });
  });
});

describe('expandShiftOccurrences', () => {
  it('clips a bounded recurring series to the visible range while keeping deterministic occurrence indices', () => {
    const shift = normalizeShiftDraft({
      calendarId: 'calendar-alpha',
      title: 'Alpha opening sweep',
      startAt: '2026-04-13T08:30:00Z',
      endAt: '2026-04-13T09:00:00Z',
      seriesId: 'series-alpha',
      recurrence: {
        cadence: 'daily',
        interval: 1,
        repeatCount: 4,
        repeatUntil: '2026-04-16T09:00:00Z'
      }
    });
    const visibleRange = normalizeVisibleRange({
      startAt: '2026-04-14T00:00:00Z',
      endAt: '2026-04-17T00:00:00Z',
      maxDays: 7
    });

    expect(shift.ok).toBe(true);
    expect(visibleRange.ok).toBe(true);

    if (!shift.ok || !visibleRange.ok) {
      return;
    }

    expect(expandShiftOccurrences({ shift: shift.value, visibleRange: visibleRange.value })).toEqual([
      {
        calendarId: 'calendar-alpha',
        title: 'Alpha opening sweep',
        seriesId: 'series-alpha',
        occurrenceIndex: 2,
        startAt: '2026-04-14T08:30:00.000Z',
        endAt: '2026-04-14T09:00:00.000Z',
        dayKey: '2026-04-14'
      },
      {
        calendarId: 'calendar-alpha',
        title: 'Alpha opening sweep',
        seriesId: 'series-alpha',
        occurrenceIndex: 3,
        startAt: '2026-04-15T08:30:00.000Z',
        endAt: '2026-04-15T09:00:00.000Z',
        dayKey: '2026-04-15'
      },
      {
        calendarId: 'calendar-alpha',
        title: 'Alpha opening sweep',
        seriesId: 'series-alpha',
        occurrenceIndex: 4,
        startAt: '2026-04-16T08:30:00.000Z',
        endAt: '2026-04-16T09:00:00.000Z',
        dayKey: '2026-04-16'
      }
    ]);
  });

  it('preserves multiple same-day one-off shifts as separate concrete occurrences', () => {
    const visibleRange = normalizeVisibleRange({
      startAt: '2026-04-15T00:00:00Z',
      endAt: '2026-04-16T00:00:00Z',
      maxDays: 7
    });

    expect(visibleRange.ok).toBe(true);
    if (!visibleRange.ok) {
      return;
    }

    const morning = materializeShiftOccurrences({
      input: {
        calendarId: 'calendar-alpha',
        title: 'Morning intake',
        startAt: '2026-04-15T09:00:00Z',
        endAt: '2026-04-15T11:00:00Z'
      },
      visibleRange: {
        startAt: '2026-04-15T00:00:00Z',
        endAt: '2026-04-16T00:00:00Z',
        maxDays: 7
      }
    });

    const afternoon = materializeShiftOccurrences({
      input: {
        calendarId: 'calendar-alpha',
        title: 'Afternoon handoff',
        startAt: '2026-04-15T13:00:00Z',
        endAt: '2026-04-15T15:00:00Z'
      },
      visibleRange: {
        startAt: '2026-04-15T00:00:00Z',
        endAt: '2026-04-16T00:00:00Z',
        maxDays: 7
      }
    });

    expect(morning.ok).toBe(true);
    expect(afternoon.ok).toBe(true);

    if (!morning.ok || !afternoon.ok) {
      return;
    }

    const sameDay = [...morning.value, ...afternoon.value];

    expect(sameDay).toHaveLength(2);
    expect(sameDay.map((occurrence) => occurrence.dayKey)).toEqual(['2026-04-15', '2026-04-15']);
    expect(sameDay.map((occurrence) => occurrence.title)).toEqual(['Morning intake', 'Afternoon handoff']);
  });
});

describe('schedule sql contract', () => {
  it('keeps shift and series authority scoped through the existing calendar-membership boundary', () => {
    expect(scheduleMigrationSql).toContain("create type public.shift_recurrence_cadence as enum ('daily', 'weekly', 'monthly');");
    expect(scheduleMigrationSql).toContain('create table public.shift_series (');
    expect(scheduleMigrationSql).toContain('create table public.shifts (');
    expect(scheduleMigrationSql).toContain('create or replace function public.current_user_can_access_shift_series(target_series_id uuid)');
    expect(scheduleMigrationSql).toContain('create or replace function public.current_user_can_access_shift(target_shift_id uuid)');
    expect(scheduleMigrationSql).toContain('public.current_user_can_access_calendar(ss.calendar_id)');
    expect(scheduleMigrationSql).toContain('public.current_user_can_access_calendar(s.calendar_id)');
    expect(scheduleMigrationSql).toContain('constraint shift_series_recurrence_bound check');
    expect(scheduleMigrationSql).toContain('constraint shifts_series_occurrence_contract check');
  });
});

describe('schedule seed contract', () => {
  it('provides deterministic Alpha fixtures for same-day, overlapping, and recurring browser proof', () => {
    expect(seedSql).toContain('Alpha opening sweep');
    expect(seedSql).toContain('Morning intake');
    expect(seedSql).toContain('Afternoon handoff');
    expect(seedSql).toContain('Kitchen prep');
    expect(seedSql).toContain('Supplier call');
    expect(seedSql).toContain('aaaaaaaa-5555-1111-1111-111111111111');
    expect(seedSql).toContain('aaaaaaaa-8888-1111-1111-444444444444');
    expect(seedSql).toContain("'2026-04-15T09:00:00Z'");
    expect(seedSql).toContain("'2026-04-16T13:00:00Z'");
  });
});
