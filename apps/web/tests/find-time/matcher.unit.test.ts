import { describe, expect, it } from 'vitest';
import {
  buildFindTimeWindows,
  normalizeFindTimeDuration,
  normalizeFindTimeSearchRange
} from '../../src/lib/find-time/matcher';

const roster = [
  {
    memberId: '11111111-1111-1111-1111-111111111111',
    displayName: 'Alice Owner'
  },
  {
    memberId: '22222222-2222-2222-2222-222222222222',
    displayName: 'Bob Member'
  }
];

describe('find-time matcher', () => {
  it('rejects missing or out-of-bounds durations before matching', () => {
    expect(normalizeFindTimeDuration(null)).toMatchObject({
      ok: false,
      reason: 'FIND_TIME_DURATION_REQUIRED'
    });

    expect(normalizeFindTimeDuration('10')).toMatchObject({
      ok: false,
      reason: 'FIND_TIME_DURATION_TOO_SHORT'
    });

    expect(normalizeFindTimeDuration('721')).toMatchObject({
      ok: false,
      reason: 'FIND_TIME_DURATION_TOO_LONG'
    });
  });

  it('rejects malformed range anchors instead of coercing them', () => {
    const result = normalizeFindTimeSearchRange({
      start: 'not-a-date',
      now: new Date('2026-04-15T12:00:00.000Z')
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'FIND_TIME_RANGE_START_INVALID'
    });
  });

  it('returns merged windows with exact slot bounds plus wider span metadata', () => {
    const duration = normalizeFindTimeDuration('60');
    expect(duration.ok).toBe(true);
    if (!duration.ok) {
      throw new Error('expected valid duration');
    }

    const result = buildFindTimeWindows({
      roster,
      busyIntervals: [
        {
          shiftId: 'shift-a',
          memberId: '11111111-1111-1111-1111-111111111111',
          memberName: 'Alice Owner',
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        },
        {
          shiftId: 'shift-b',
          memberId: '22222222-2222-2222-2222-222222222222',
          memberName: 'Bob Member',
          startAt: '2026-04-15T10:00:00.000Z',
          endAt: '2026-04-15T11:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T12:00:00.000Z'
      },
      duration: duration.value
    });

    expect(result.totalWindows).toBe(4);
    expect(result.truncated).toBe(false);
    expect(result.windows).toEqual([
      {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T09:00:00.000Z',
        durationMinutes: 60,
        spanStartAt: '2026-04-15T08:00:00.000Z',
        spanEndAt: '2026-04-15T09:00:00.000Z',
        spanDurationMinutes: 60,
        availableMembers: roster,
        availableMemberIds: roster.map((member) => member.memberId),
        busyMemberCount: 0
      },
      {
        startAt: '2026-04-15T09:00:00.000Z',
        endAt: '2026-04-15T10:00:00.000Z',
        durationMinutes: 60,
        spanStartAt: '2026-04-15T09:00:00.000Z',
        spanEndAt: '2026-04-15T10:00:00.000Z',
        spanDurationMinutes: 60,
        availableMembers: [roster[1]],
        availableMemberIds: ['22222222-2222-2222-2222-222222222222'],
        busyMemberCount: 1
      },
      {
        startAt: '2026-04-15T10:00:00.000Z',
        endAt: '2026-04-15T11:00:00.000Z',
        durationMinutes: 60,
        spanStartAt: '2026-04-15T10:00:00.000Z',
        spanEndAt: '2026-04-15T11:00:00.000Z',
        spanDurationMinutes: 60,
        availableMembers: [roster[0]],
        availableMemberIds: ['11111111-1111-1111-1111-111111111111'],
        busyMemberCount: 1
      },
      {
        startAt: '2026-04-15T11:00:00.000Z',
        endAt: '2026-04-15T12:00:00.000Z',
        durationMinutes: 60,
        spanStartAt: '2026-04-15T11:00:00.000Z',
        spanEndAt: '2026-04-15T12:00:00.000Z',
        spanDurationMinutes: 60,
        availableMembers: roster,
        availableMemberIds: roster.map((member) => member.memberId),
        busyMemberCount: 0
      }
    ]);
  });

  it('keeps a single member busy across overlapping intervals and returns no results when everyone is occupied', () => {
    const duration = normalizeFindTimeDuration('60');
    expect(duration.ok).toBe(true);
    if (!duration.ok) {
      throw new Error('expected valid duration');
    }

    const overlapping = buildFindTimeWindows({
      roster: [roster[0]],
      busyIntervals: [
        {
          shiftId: 'shift-a',
          memberId: '11111111-1111-1111-1111-111111111111',
          memberName: 'Alice Owner',
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:30:00.000Z'
        },
        {
          shiftId: 'shift-b',
          memberId: '11111111-1111-1111-1111-111111111111',
          memberName: 'Alice Owner',
          startAt: '2026-04-15T10:00:00.000Z',
          endAt: '2026-04-15T11:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T09:00:00.000Z',
        endAt: '2026-04-15T11:00:00.000Z'
      },
      duration: duration.value
    });

    expect(overlapping.totalWindows).toBe(0);
    expect(overlapping.windows).toEqual([]);
  });

  it('preserves horizon edges so a last-hour gap on day 30 still counts as one valid window', () => {
    const duration = normalizeFindTimeDuration('60');
    expect(duration.ok).toBe(true);
    if (!duration.ok) {
      throw new Error('expected valid duration');
    }

    const result = buildFindTimeWindows({
      roster: [roster[0]],
      busyIntervals: [
        {
          shiftId: 'shift-a',
          memberId: '11111111-1111-1111-1111-111111111111',
          memberName: 'Alice Owner',
          startAt: '2026-04-01T00:00:00.000Z',
          endAt: '2026-04-30T23:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-01T00:00:00.000Z',
        endAt: '2026-05-01T00:00:00.000Z'
      },
      duration: duration.value
    });

    expect(result.totalWindows).toBe(1);
    expect(result.windows[0]).toMatchObject({
      startAt: '2026-04-30T23:00:00.000Z',
      endAt: '2026-05-01T00:00:00.000Z',
      spanStartAt: '2026-04-30T23:00:00.000Z',
      spanEndAt: '2026-05-01T00:00:00.000Z'
    });
  });
});
