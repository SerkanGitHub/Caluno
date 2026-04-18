import { describe, expect, it } from 'vitest';
import { buildFindTimeWindows, normalizeFindTimeDuration, normalizeFindTimeSearchRange } from '../../src/lib/find-time/matcher';

const roster = [
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

  it('ranks the full truthful candidate set and attaches shortlist plus nearby-constraint metadata', () => {
    const duration = expectDuration('60');

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
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T12:00:00.000Z'
      },
      duration: duration.value
    });

    expect(result.malformed).toBeNull();
    expect(result.totalWindows).toBe(4);
    expect(result.topPickCount).toBe(3);
    expect(result.windows.map((window) => window.startAt)).toEqual([
      '2026-04-15T08:00:00.000Z',
      '2026-04-15T11:00:00.000Z',
      '2026-04-15T09:00:00.000Z',
      '2026-04-15T10:00:00.000Z'
    ]);

    expect(result.windows[0]).toMatchObject({
      topPickEligible: true,
      topPick: true,
      topPickRank: 1,
      scoreBreakdown: {
        sharedMemberCount: 3,
        spanSlackMinutes: 0
      },
      blockedMembers: []
    });

    const focusedWindow = result.windows.find((window) => window.startAt === '2026-04-15T09:00:00.000Z');
    expect(focusedWindow).toMatchObject({
      topPickEligible: true,
      topPick: true,
      topPickRank: 3,
      scoreBreakdown: {
        sharedMemberCount: 2,
        earlierStartAt: '2026-04-15T09:00:00.000Z'
      }
    });
    expect(focusedWindow?.blockedMembers).toEqual([
      {
        memberId: roster[0].memberId,
        displayName: roster[0].displayName,
        nearbyConstraints: {
          leading: [
            {
              memberId: roster[0].memberId,
              memberName: roster[0].displayName,
              shiftId: 'shift-a',
              shiftTitle: 'Daily standup',
              relation: 'leading',
              distanceMinutes: 0,
              overlapsBoundary: true,
              startAt: '2026-04-15T09:00:00.000Z',
              endAt: '2026-04-15T10:00:00.000Z'
            }
          ],
          trailing: []
        }
      }
    ]);
    expect(focusedWindow?.nearbyConstraints.leading).toEqual([
      expect.objectContaining({
        shiftTitle: 'Daily standup',
        relation: 'leading'
      })
    ]);
  });

  it('ranks before truncation so later stronger candidates beat earlier weaker ones', () => {
    const duration = expectDuration('60');

    const result = buildFindTimeWindows({
      roster,
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: 'Alice busy',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T08:00:00.000Z',
          endAt: '2026-04-15T09:00:00.000Z'
        },
        {
          shiftId: 'shift-b',
          shiftTitle: 'Bob busy',
          memberId: roster[1].memberId,
          memberName: roster[1].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T13:00:00.000Z'
      },
      duration: duration.value,
      maxWindows: 2
    });

    expect(result.totalWindows).toBe(3);
    expect(result.truncated).toBe(true);
    expect(result.windows.map((window) => window.startAt)).toEqual([
      '2026-04-15T10:00:00.000Z',
      '2026-04-15T08:00:00.000Z'
    ]);
    expect(result.windows[0]).toMatchObject({
      topPick: true,
      scoreBreakdown: {
        sharedMemberCount: 3,
        spanSlackMinutes: 120
      }
    });
  });

  it('breaks equal scores by earlier start time', () => {
    const duration = expectDuration('60');

    const result = buildFindTimeWindows({
      roster: roster.slice(0, 2),
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: 'Joint outage',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T11:00:00.000Z'
        },
        {
          shiftId: 'shift-b',
          shiftTitle: 'Joint outage',
          memberId: roster[1].memberId,
          memberName: roster[1].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T11:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T12:00:00.000Z'
      },
      duration: duration.value
    });

    expect(result.windows.map((window) => window.startAt)).toEqual([
      '2026-04-15T08:00:00.000Z',
      '2026-04-15T11:00:00.000Z'
    ]);
    expect(result.windows[0]?.scoreBreakdown).toMatchObject({
      sharedMemberCount: 2,
      spanSlackMinutes: 0,
      nearbyEdgePressureMinutes: 0
    });
    expect(result.windows[1]?.scoreBreakdown).toMatchObject({
      sharedMemberCount: 2,
      spanSlackMinutes: 0,
      nearbyEdgePressureMinutes: 0
    });
    expect(result.windows[0]?.scoreBreakdown.earlierStartAt).toBe('2026-04-15T08:00:00.000Z');
  });

  it('treats exactly two free members as shortlist-eligible shared availability', () => {
    const duration = expectDuration('60');

    const result = buildFindTimeWindows({
      roster,
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: 'Alice busy',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
          startAt: '2026-04-15T09:00:00.000Z',
          endAt: '2026-04-15T10:00:00.000Z'
        }
      ],
      range: {
        startAt: '2026-04-15T09:00:00.000Z',
        endAt: '2026-04-15T10:00:00.000Z'
      },
      duration: duration.value
    });

    expect(result.totalWindows).toBe(1);
    expect(result.windows[0]).toMatchObject({
      topPickEligible: true,
      topPick: true,
      scoreBreakdown: {
        sharedMemberCount: 2
      }
    });
  });

  it('keeps ranked candidates empty for malformed explanation inputs instead of guessing', () => {
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

    expect(missingTitle.totalWindows).toBe(0);
    expect(missingTitle.windows).toEqual([]);
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

    expect(duplicateAssignment.totalWindows).toBe(0);
    expect(duplicateAssignment.malformed).toMatchObject({
      reason: 'FIND_TIME_RANKING_MEMBER_DUPLICATE'
    });
  });

  it('returns no results for an empty roster and preserves the 30-day boundary edge gap', () => {
    const duration = expectDuration('60');

    const emptyRoster = buildFindTimeWindows({
      roster: [],
      busyIntervals: [],
      range: {
        startAt: '2026-04-15T08:00:00.000Z',
        endAt: '2026-04-15T11:00:00.000Z'
      },
      duration: duration.value
    });

    expect(emptyRoster).toMatchObject({
      totalWindows: 0,
      windows: [],
      malformed: null
    });

    const boundaryGap = buildFindTimeWindows({
      roster: [roster[0]],
      busyIntervals: [
        {
          shiftId: 'shift-a',
          shiftTitle: 'Month-long block',
          memberId: roster[0].memberId,
          memberName: roster[0].displayName,
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

    expect(boundaryGap.totalWindows).toBe(1);
    expect(boundaryGap.windows[0]).toMatchObject({
      startAt: '2026-04-30T23:00:00.000Z',
      endAt: '2026-05-01T00:00:00.000Z',
      spanStartAt: '2026-04-30T23:00:00.000Z',
      spanEndAt: '2026-05-01T00:00:00.000Z',
      topPickEligible: false,
      topPick: false
    });
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
