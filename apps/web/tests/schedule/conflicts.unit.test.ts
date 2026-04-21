import { describe, expect, it } from 'vitest';
import { deriveVisibleWeekConflicts } from '@repo/caluno-core/schedule/conflicts';

describe('visible-week conflict derivation', () => {
  it('detects real overlaps while keeping touching boundaries clean', () => {
    const conflicts = deriveVisibleWeekConflicts({
      days: [
        {
          dayKey: '2026-04-15',
          label: 'Wed, Apr 15',
          shifts: [
            {
              id: 'shift-w1',
              calendarId: 'calendar-alpha',
              seriesId: 'series-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-15T08:30:00.000Z',
              endAt: '2026-04-15T09:00:00.000Z',
              occurrenceIndex: 3,
              sourceKind: 'series' as const
            },
            {
              id: 'shift-w2',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Morning intake',
              startAt: '2026-04-15T09:00:00.000Z',
              endAt: '2026-04-15T11:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            }
          ]
        },
        {
          dayKey: '2026-04-16',
          label: 'Thu, Apr 16',
          shifts: [
            {
              id: 'shift-t1',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Kitchen prep',
              startAt: '2026-04-16T12:00:00.000Z',
              endAt: '2026-04-16T14:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-t2',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Supplier call',
              startAt: '2026-04-16T13:00:00.000Z',
              endAt: '2026-04-16T15:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            }
          ]
        }
      ]
    });

    expect(conflicts.invalidShiftIds).toEqual([]);
    expect(conflicts.board).toEqual({
      overlapCount: 1,
      conflictDayCount: 1,
      conflictingShiftCount: 2,
      conflictDayKeys: ['2026-04-16']
    });
    expect(conflicts.days['2026-04-15']).toBeUndefined();
    expect(conflicts.days['2026-04-16']).toEqual({
      dayKey: '2026-04-16',
      overlapCount: 1,
      conflictingShiftIds: ['shift-t1', 'shift-t2'],
      conflictPairs: [{ leftShiftId: 'shift-t1', rightShiftId: 'shift-t2' }]
    });
    expect(conflicts.shifts['shift-t1']).toMatchObject({
      overlapCount: 1,
      conflictingShiftIds: ['shift-t2']
    });
    expect(conflicts.shifts['shift-t2']).toMatchObject({
      overlapCount: 1,
      conflictingShiftIds: ['shift-t1']
    });
  });

  it('counts one shift overlapping multiple later shifts without inventing extra pairs', () => {
    const conflicts = deriveVisibleWeekConflicts({
      days: [
        {
          dayKey: '2026-04-17',
          label: 'Fri, Apr 17',
          shifts: [
            {
              id: 'shift-anchor',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Long prep window',
              startAt: '2026-04-17T09:00:00.000Z',
              endAt: '2026-04-17T11:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-mid',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Short review',
              startAt: '2026-04-17T09:30:00.000Z',
              endAt: '2026-04-17T10:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-late',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Late check-in',
              startAt: '2026-04-17T10:00:00.000Z',
              endAt: '2026-04-17T10:30:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            }
          ]
        }
      ]
    });

    expect(conflicts.board).toEqual({
      overlapCount: 2,
      conflictDayCount: 1,
      conflictingShiftCount: 3,
      conflictDayKeys: ['2026-04-17']
    });
    expect(conflicts.days['2026-04-17']?.conflictPairs).toEqual([
      { leftShiftId: 'shift-anchor', rightShiftId: 'shift-mid' },
      { leftShiftId: 'shift-anchor', rightShiftId: 'shift-late' }
    ]);
    expect(conflicts.shifts['shift-anchor']).toMatchObject({
      overlapCount: 2,
      conflictingShiftIds: ['shift-mid', 'shift-late']
    });
    expect(conflicts.shifts['shift-mid']).toMatchObject({
      overlapCount: 1,
      conflictingShiftIds: ['shift-anchor']
    });
    expect(conflicts.shifts['shift-late']).toMatchObject({
      overlapCount: 1,
      conflictingShiftIds: ['shift-anchor']
    });
  });

  it('fails closed on malformed rows, duplicate ids, and empty day groups', () => {
    const conflicts = deriveVisibleWeekConflicts({
      days: [
        {
          dayKey: '2026-04-18',
          label: 'Sat, Apr 18',
          shifts: []
        },
        {
          dayKey: '2026-04-19',
          label: 'Sun, Apr 19',
          shifts: [
            {
              id: 'shift-duplicate',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Duplicated id A',
              startAt: '2026-04-19T09:00:00.000Z',
              endAt: '2026-04-19T10:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-duplicate',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Duplicated id B',
              startAt: '2026-04-19T09:30:00.000Z',
              endAt: '2026-04-19T11:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-invalid-start',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Broken timestamp',
              startAt: 'not-a-date',
              endAt: '2026-04-19T11:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-inverted',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Inverted range',
              startAt: '2026-04-19T12:00:00.000Z',
              endAt: '2026-04-19T11:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            },
            {
              id: 'shift-day-mismatch',
              calendarId: 'calendar-alpha',
              seriesId: null,
              title: 'Wrong rendered day',
              startAt: '2026-04-18T12:00:00.000Z',
              endAt: '2026-04-18T13:00:00.000Z',
              occurrenceIndex: null,
              sourceKind: 'single' as const
            }
          ]
        }
      ]
    });

    expect(conflicts.board).toBeNull();
    expect(conflicts.days).toEqual({});
    expect(conflicts.shifts).toEqual({});
    expect(conflicts.invalidShiftIds).toEqual([
      'shift-day-mismatch',
      'shift-duplicate',
      'shift-invalid-start',
      'shift-inverted'
    ]);
  });
});
