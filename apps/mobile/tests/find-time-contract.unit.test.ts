import { describe, expect, it } from 'vitest';
import {
  buildFindTimeWindows,
  normalizeFindTimeDuration,
  normalizeFindTimeSearchRange,
  type FindTimeMatcherMember
} from '@repo/caluno-core/find-time/matcher';
import {
  buildCreatePrefillHref,
  CREATE_PREFILL_SOURCE,
  deriveCreatePrefillWeekStart,
  parseCreatePrefill,
  stripCreatePrefillSearchParams
} from '@repo/caluno-core/schedule/create-prefill';

const roster: FindTimeMatcherMember[] = [
  {
    memberId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alice Owner'
  },
  {
    memberId: '22222222-2222-2222-2222-222222222222',
    displayName: 'Bob Member'
  },
  {
    memberId: '33333333-3333-3333-3333-333333333333',
    displayName: 'Cara Support'
  }
];

describe('shared find-time and create-prefill contracts', () => {
  it('orders top picks before browse windows through the shared matcher contract', () => {
    const duration = expectDuration('60');
    const range = expectSearchRange('2026-04-15');

    const result = buildFindTimeWindows({
      roster,
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: 'Daily standup',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        },
        {
          shiftId: 'shift-b',
          shiftTitle: 'Design review',
          memberId: roster[1].memberId,
          memberName: roster[1].displayName,
          startAt: '2026-04-15T10:00:00.000Z',
          endAt: '2026-04-15T11:00:00.000Z'
        }
      ],
      range: {
        startAt: range.startAt,
        endAt: '2026-04-15T12:00:00.000Z'
      },
      duration: duration.value
    });

    expect(result.malformed).toBeNull();
    expect(result.topPickCount).toBe(3);
    expect(result.windows.map((window) => ({ startAt: window.startAt, topPick: window.topPick }))).toEqual([
      { startAt: '2026-04-15T00:00:00.000Z', topPick: true },
      { startAt: '2026-04-15T11:00:00.000Z', topPick: true },
      { startAt: '2026-04-15T09:00:00.000Z', topPick: true },
      { startAt: '2026-04-15T10:00:00.000Z', topPick: false }
    ]);
    expect(result.windows[3]).toMatchObject({
      blockedMembers: [
        expect.objectContaining({
          memberId: roster[1].memberId,
          displayName: roster[1].displayName
        })
      ]
    });
  });

  it('fails closed when ranked explanations receive malformed busy assignments', () => {
    const duration = expectDuration('60');

    const missingTitle = buildFindTimeWindows({
      roster: roster.slice(0, 1),
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: '',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T11:00:00.000Z'
      },
      duration: duration.value
    });

    expect(missingTitle.windows).toEqual([]);
    expect(missingTitle.totalWindows).toBe(0);
    expect(missingTitle.malformed).toMatchObject({
      reason: 'FIND_TIME_RANKING_SHIFT_TITLE_MISSING'
    });

    const duplicateAssignment = buildFindTimeWindows({
      roster: roster.slice(0, 1),
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: 'Overlap',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        },
        {
          shiftId: 'shift-a',
          shiftTitle: 'Overlap',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T11:00:00.000Z'
      },
      duration: duration.value
    });

    expect(duplicateAssignment.windows).toEqual([]);
    expect(duplicateAssignment.malformed).toMatchObject({
      reason: 'FIND_TIME_RANKING_MEMBER_DUPLICATE'
    });
  });

  it('parses only strict create-prefill handoffs and rejects malformed params', () => {
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
    expect(parseCreatePrefill(new URL(href ?? '', 'https://caluno.test').searchParams)).toEqual({
      source: CREATE_PREFILL_SOURCE,
      visibleWeekStart: '2026-05-04',
      startAt: '2026-05-07T13:30:00.000Z',
      endAt: '2026-05-07T15:00:00.000Z',
      startAtLocal: '2026-05-07T13:30',
      endAtLocal: '2026-05-07T15:00'
    });

    expect(
      parseCreatePrefill(
        new URLSearchParams(
          'create=1&start=2026-05-11&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time'
        )
      )
    ).toBeNull();
    expect(
      parseCreatePrefill(
        new URLSearchParams(
          'create=1&start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T13:30:00.000Z&source=find-time'
        )
      )
    ).toBeNull();
  });

  it('derives Monday-visible weeks from any accepted slot instant', () => {
    expect(deriveCreatePrefillWeekStart('2026-05-04T08:00:00.000Z')).toBe('2026-05-04');
    expect(deriveCreatePrefillWeekStart('2026-05-10T22:45:00.000Z')).toBe('2026-05-04');
    expect(deriveCreatePrefillWeekStart('2026-05-31T09:00:00.000Z')).toBe('2026-05-25');
    expect(deriveCreatePrefillWeekStart('not-an-iso')).toBeNull();
  });

  it('strips one-shot handoff params while preserving week context and unrelated search state', () => {
    const cleaned = stripCreatePrefillSearchParams(
      new URLSearchParams(
        'create=1&start=2026-05-04&prefillStartAt=2026-05-07T13:30:00.000Z&prefillEndAt=2026-05-07T15:00:00.000Z&source=find-time&welcome=back'
      )
    );

    expect(cleaned.toString()).toBe('start=2026-05-04&welcome=back');
  });
});

function expectDuration(value: string) {
  const duration = normalizeFindTimeDuration(value);
  expect(duration.ok).toBe(true);
  if (!duration.ok) {
    throw new Error('expected valid duration');
  }

  return duration;
}

function expectSearchRange(start: string) {
  const range = normalizeFindTimeSearchRange({
    start,
    now: new Date('2026-04-15T12:00:00.000Z')
  });
  expect(range.ok).toBe(true);
  if (!range.ok) {
    throw new Error('expected valid search range');
  }

  return range.value;
}
