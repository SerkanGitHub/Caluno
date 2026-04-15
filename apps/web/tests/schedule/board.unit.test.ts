import { describe, expect, it } from 'vitest';
import {
  buildCalendarWeekBoard,
  sortShiftsForBoard,
  summarizeScheduleActions,
  toDateTimeLocalValue
} from '../../src/lib/schedule/board';

describe('schedule board helpers', () => {
  it('keeps multiple same-day shifts sorted by start, end, title, and id', () => {
    const sorted = sortShiftsForBoard([
      {
        id: 'shift-c',
        calendarId: 'calendar-alpha',
        seriesId: null,
        title: 'Supplier call',
        startAt: '2026-04-16T13:00:00.000Z',
        endAt: '2026-04-16T13:30:00.000Z',
        occurrenceIndex: null,
        sourceKind: 'single' as const
      },
      {
        id: 'shift-a',
        calendarId: 'calendar-alpha',
        seriesId: null,
        title: 'Kitchen prep',
        startAt: '2026-04-16T12:00:00.000Z',
        endAt: '2026-04-16T14:00:00.000Z',
        occurrenceIndex: null,
        sourceKind: 'single' as const
      },
      {
        id: 'shift-b',
        calendarId: 'calendar-alpha',
        seriesId: null,
        title: 'Alpha opening sweep',
        startAt: '2026-04-16T12:00:00.000Z',
        endAt: '2026-04-16T12:30:00.000Z',
        occurrenceIndex: 4,
        sourceKind: 'series' as const
      }
    ]);

    expect(sorted.map((shift) => shift.id)).toEqual(['shift-b', 'shift-a', 'shift-c']);
  });

  it('builds a calm week model with busy-day density, local status badges, and visible-week diagnostics', () => {
    const board = buildCalendarWeekBoard(
      {
        visibleWeek: {
          start: '2026-04-13',
          endExclusive: '2026-04-20',
          startAt: '2026-04-13T00:00:00.000Z',
          endAt: '2026-04-20T00:00:00.000Z',
          requestedStart: 'not-a-date',
          source: 'fallback-invalid',
          reason: 'VISIBLE_WEEK_START_INVALID',
          dayKeys: [
            '2026-04-13',
            '2026-04-14',
            '2026-04-15',
            '2026-04-16',
            '2026-04-17',
            '2026-04-18',
            '2026-04-19'
          ]
        },
        totalShifts: 3,
        days: [
          {
            dayKey: '2026-04-13',
            label: 'Mon, Apr 13',
            shifts: []
          },
          {
            dayKey: '2026-04-14',
            label: 'Tue, Apr 14',
            shifts: []
          },
          {
            dayKey: '2026-04-15',
            label: 'Wed, Apr 15',
            shifts: []
          },
          {
            dayKey: '2026-04-16',
            label: 'Thu, Apr 16',
            shifts: [
              {
                id: 'shift-a',
                calendarId: 'calendar-alpha',
                seriesId: null,
                title: 'Kitchen prep',
                startAt: '2026-04-16T12:00:00.000Z',
                endAt: '2026-04-16T14:00:00.000Z',
                occurrenceIndex: null,
                sourceKind: 'single' as const
              },
              {
                id: 'shift-b',
                calendarId: 'calendar-alpha',
                seriesId: 'series-alpha',
                title: 'Alpha opening sweep',
                startAt: '2026-04-16T08:30:00.000Z',
                endAt: '2026-04-16T09:00:00.000Z',
                occurrenceIndex: 4,
                sourceKind: 'series' as const
              },
              {
                id: 'shift-c',
                calendarId: 'calendar-alpha',
                seriesId: null,
                title: 'Supplier call',
                startAt: '2026-04-16T13:00:00.000Z',
                endAt: '2026-04-16T13:30:00.000Z',
                occurrenceIndex: null,
                sourceKind: 'single' as const
              }
            ]
          },
          {
            dayKey: '2026-04-17',
            label: 'Fri, Apr 17',
            shifts: []
          },
          {
            dayKey: '2026-04-18',
            label: 'Sat, Apr 18',
            shifts: []
          },
          {
            dayKey: '2026-04-19',
            label: 'Sun, Apr 19',
            shifts: []
          }
        ]
      },
      {
        now: new Date('2026-04-16T10:00:00.000Z'),
        runtime: {
          boardSource: 'cached-local',
          network: 'offline',
          queueLength: 2,
          pendingQueueLength: 2,
          retryableQueueLength: 0,
          shiftDiagnostics: {
            'shift-a': [{ label: 'Pending sync', tone: 'warning' }],
            'shift-c': [
              { label: 'Local only', tone: 'warning' },
              { label: 'Pending sync', tone: 'warning' }
            ]
          },
          lastFailure: {
            reason: 'LOCAL_QUEUE_PERSIST_FAILED',
            detail: 'The queue could not persist.'
          }
        }
      }
    );

    expect(board.rangeLabel).toBe('Apr 13 — Apr 19, 2026');
    expect(board.caption).toContain('fell back');
    expect(board.sourceLabel).toContain('Invalid requested week');
    expect(board.sourceTone).toBe('warning');
    expect(board.previousWeekStart).toBe('2026-04-06');
    expect(board.nextWeekStart).toBe('2026-04-20');
    expect(board.statusBadges.map((badge) => badge.label)).toEqual([
      'Cached local board',
      'Offline',
      '2 pending local writes'
    ]);
    expect(board.lastFailure?.reason).toBe('LOCAL_QUEUE_PERSIST_FAILED');

    const busyDay = board.days.find((day) => day.dayKey === '2026-04-16');
    expect(busyDay?.density).toBe('busy');
    expect(busyDay?.isToday).toBe(true);
    expect(busyDay?.shifts.map((shift) => shift.id)).toEqual(['shift-b', 'shift-a', 'shift-c']);
    expect(busyDay?.shifts[0]).toMatchObject({
      rangeLabel: '08:30 → 09:00',
      occurrenceLabel: 'Occurrence 4',
      sourceLabel: 'Recurring series'
    });
    expect(busyDay?.shifts.find((shift) => shift.id === 'shift-a')?.statusBadges).toEqual([
      { label: 'Pending sync', tone: 'warning' }
    ]);
    expect(busyDay?.shifts.find((shift) => shift.id === 'shift-c')?.statusBadges).toEqual([
      { label: 'Local only', tone: 'warning' },
      { label: 'Pending sync', tone: 'warning' }
    ]);

    expect(board.days.find((day) => day.dayKey === '2026-04-13')).toMatchObject({
      isEmpty: true,
      density: 'empty'
    });
  });

  it('summarizes local-first action states and converts ISO timestamps into datetime-local field values', () => {
    const summaries = summarizeScheduleActions([
      {
        id: 'action-1',
        formId: 'create:week',
        action: 'create',
        status: 'success',
        reason: 'SHIFT_CREATED',
        message: 'Created.',
        shiftId: 'shift-1',
        createdAt: '2026-04-15T10:00:00.000Z'
      },
      {
        id: 'action-2',
        formId: 'move:shift-2',
        action: 'move',
        status: 'timeout',
        reason: 'SCHEDULE_MOVE_TIMEOUT',
        message: 'Timed out.',
        shiftId: 'shift-2',
        createdAt: '2026-04-15T10:01:00.000Z'
      }
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => [summary.label, summary.tone])).toEqual([
      ['Create shift', 'success'],
      ['Move shift', 'warning']
    ]);
    expect(toDateTimeLocalValue('2026-04-20T09:30:00.000Z')).toBe('2026-04-20T09:30');
  });
});
