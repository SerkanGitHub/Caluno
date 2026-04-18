import { describe, expect, it } from 'vitest';
import {
  buildCreatePrefillHref,
  CREATE_PREFILL_SOURCE,
  deriveCreatePrefillWeekStart,
  parseCreatePrefill
} from '../../src/lib/schedule/create-prefill';

describe('create prefill contract', () => {
  it('builds a timing-only handoff href and derives the destination week from the selected slot', () => {
    const href = buildCreatePrefillHref({
      calendarId: 'calendar-alpha',
      window: {
        startAt: '2026-05-07T13:30:00.000Z',
        endAt: '2026-05-07T15:00:00.000Z'
      }
    });

    expect(href).toBe(
      '/calendars/calendar-alpha?create=1&start=2026-05-04&prefillStartAt=2026-05-07T13%3A30%3A00.000Z&prefillEndAt=2026-05-07T15%3A00%3A00.000Z&source=find-time'
    );
  });

  it('parses a valid handoff into the exact accepted contract shape with datetime-local round-trips', () => {
    const href = buildCreatePrefillHref({
      calendarId: 'calendar-alpha',
      window: {
        startAt: '2026-05-07T13:30:00.000Z',
        endAt: '2026-05-07T15:00:00.000Z'
      }
    });

    const searchParams = new URL(href ?? '', 'https://caluno.test').searchParams;

    expect(parseCreatePrefill(searchParams)).toEqual({
      source: CREATE_PREFILL_SOURCE,
      visibleWeekStart: '2026-05-04',
      startAt: '2026-05-07T13:30:00.000Z',
      endAt: '2026-05-07T15:00:00.000Z',
      startAtLocal: '2026-05-07T13:30',
      endAtLocal: '2026-05-07T15:00'
    });
  });

  it('derives Monday-bounded visible weeks from any exact slot in the horizon', () => {
    expect(deriveCreatePrefillWeekStart('2026-05-04T08:00:00.000Z')).toBe('2026-05-04');
    expect(deriveCreatePrefillWeekStart('2026-05-10T22:45:00.000Z')).toBe('2026-05-04');
    expect(deriveCreatePrefillWeekStart('2026-05-31T09:00:00.000Z')).toBe('2026-05-25');
  });

  it('rejects malformed, partial, empty, and mismatched handoff params instead of guessing', () => {
    const rejectedShapes = [
      {
        name: 'missing prefillStartAt',
        search: 'create=1&start=2026-05-04&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time'
      },
      {
        name: 'missing prefillEndAt',
        search: 'create=1&start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&source=find-time'
      },
      {
        name: 'invalid ISO start timestamp',
        search: 'create=1&start=2026-05-04&prefillStartAt=not-an-iso&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time'
      },
      {
        name: 'invalid ISO end timestamp',
        search: 'create=1&start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=tomorrow&source=find-time'
      },
      {
        name: 'invalid visible week start',
        search: 'create=1&start=2026-05-xx&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time'
      },
      {
        name: 'empty strings',
        search: 'create=1&start=&prefillStartAt=&prefillEndAt=&source=find-time'
      },
      {
        name: 'end before start',
        search: 'create=1&start=2026-05-04&prefillStartAt=2026-05-07T15:00:00.000Z&prefillEndAt=2026-05-07T13:30:00.000Z&source=find-time'
      },
      {
        name: 'zero-length slot',
        search: 'create=1&start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T13:30:00.000Z&source=find-time'
      },
      {
        name: 'mismatched derived week context',
        search: 'create=1&start=2026-05-11&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time'
      },
      {
        name: 'missing create flag',
        search: 'start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time'
      },
      {
        name: 'unknown source',
        search: 'create=1&start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T15:00:00.000Z&source=calendar-board'
      }
    ] as const;

    for (const rejectedShape of rejectedShapes) {
      expect(parseCreatePrefill(new URLSearchParams(rejectedShape.search)), rejectedShape.name).toBeNull();
    }
  });

  it('returns no href for malformed or zero-length selected suggestion windows', () => {
    expect(
      buildCreatePrefillHref({
        calendarId: 'calendar-alpha',
        window: {
          startAt: 'not-an-iso',
          endAt: '2026-05-07T15:00:00.000Z'
        }
      })
    ).toBeNull();

    expect(
      buildCreatePrefillHref({
        calendarId: 'calendar-alpha',
        window: {
          startAt: '2026-05-07T13:30:00.000Z',
          endAt: '2026-05-07T13:30:00.000Z'
        }
      })
    ).toBeNull();
  });
});
