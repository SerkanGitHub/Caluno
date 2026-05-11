import { describe, expect, it } from 'vitest';
import { deriveShiftEditorClashes } from '@repo/caluno-core/schedule/shift-editor-advisory';
import type { CalendarShift } from '@repo/caluno-core/schedule/types';

function buildShift(overrides: Partial<CalendarShift> = {}): CalendarShift {
  return {
    id: overrides.id ?? 'shift-alpha',
    calendarId: overrides.calendarId ?? 'calendar-alpha',
    seriesId: overrides.seriesId ?? null,
    title: overrides.title ?? 'Morning coverage',
    startAt: overrides.startAt ?? '2026-04-16T10:30:00.000Z',
    endAt: overrides.endAt ?? '2026-04-16T11:30:00.000Z',
    occurrenceIndex: overrides.occurrenceIndex ?? null,
    sourceKind: overrides.sourceKind ?? 'single'
  };
}

describe('deriveShiftEditorClashes', () => {
  it('suppresses the preview for malformed, blank, and inverted local drafts instead of throwing', () => {
    expect(
      deriveShiftEditorClashes({
        mode: 'create',
        calendarId: 'calendar-alpha',
        title: '',
        startAt: '2026-04-16T10:00',
        endAt: '2026-04-16T12:00',
        existingShifts: [buildShift()]
      })
    ).toEqual([]);

    expect(
      deriveShiftEditorClashes({
        mode: 'create',
        calendarId: 'calendar-alpha',
        title: 'Coverage',
        startAt: 'not-a-date',
        endAt: '2026-04-16T12:00',
        existingShifts: [buildShift()]
      })
    ).toEqual([]);

    expect(
      deriveShiftEditorClashes({
        mode: 'create',
        calendarId: 'calendar-alpha',
        title: 'Coverage',
        startAt: '2026-04-16T12:00',
        endAt: '2026-04-16T10:00',
        existingShifts: [buildShift()]
      })
    ).toEqual([]);
  });

  it('keeps touching-boundary drafts clear and excludes the current shift during edit and move flows', () => {
    const boundaryOnly = deriveShiftEditorClashes({
      mode: 'create',
      calendarId: 'calendar-alpha',
      title: 'Boundary-safe opening',
      startAt: '2026-04-16T08:00',
      endAt: '2026-04-16T10:00',
      existingShifts: [
        buildShift({
          id: 'shift-after',
          startAt: '2026-04-16T10:00:00.000Z',
          endAt: '2026-04-16T12:00:00.000Z'
        })
      ]
    });

    expect(boundaryOnly).toEqual([]);

    const overlappingWithSelfExcluded = deriveShiftEditorClashes({
      mode: 'edit',
      calendarId: 'calendar-alpha',
      shiftId: 'shift-self',
      title: 'Morning coverage',
      startAt: '2026-04-16T10:00',
      endAt: '2026-04-16T12:00',
      existingShifts: [
        buildShift({
          id: 'shift-self',
          startAt: '2026-04-16T10:00:00.000Z',
          endAt: '2026-04-16T12:00:00.000Z'
        }),
        buildShift({
          id: 'shift-other',
          title: 'Late cover',
          startAt: '2026-04-16T11:30:00.000Z',
          endAt: '2026-04-16T13:30:00.000Z'
        })
      ]
    });

    expect(overlappingWithSelfExcluded.map((shift) => shift.id)).toEqual(['shift-other']);

    const movePreview = deriveShiftEditorClashes({
      mode: 'move',
      calendarId: 'calendar-alpha',
      shiftId: 'shift-self',
      title: '',
      fallbackTitle: 'Morning coverage',
      startAt: '2026-04-16T10:45',
      endAt: '2026-04-16T12:15',
      existingShifts: [
        buildShift({
          id: 'shift-self',
          startAt: '2026-04-16T10:00:00.000Z',
          endAt: '2026-04-16T12:00:00.000Z'
        }),
        buildShift({
          id: 'shift-overlap',
          title: 'Team handoff',
          startAt: '2026-04-16T11:00:00.000Z',
          endAt: '2026-04-16T12:30:00.000Z'
        })
      ]
    });

    expect(movePreview.map((shift) => shift.id)).toEqual(['shift-overlap']);
  });

  it('preserves same-calendar scope even when another calendar overlaps the same window', () => {
    const clashes = deriveShiftEditorClashes({
      mode: 'create',
      calendarId: 'calendar-alpha',
      title: 'Shared opening',
      startAt: '2026-04-16T10:00',
      endAt: '2026-04-16T12:00',
      existingShifts: [
        buildShift({
          id: 'shift-same-calendar',
          title: 'Coverage overlap',
          startAt: '2026-04-16T10:30:00.000Z',
          endAt: '2026-04-16T11:30:00.000Z'
        }),
        buildShift({
          id: 'shift-other-calendar',
          calendarId: 'calendar-beta',
          title: 'Other calendar overlap',
          startAt: '2026-04-16T10:15:00.000Z',
          endAt: '2026-04-16T11:45:00.000Z'
        })
      ]
    });

    expect(clashes.map((shift) => shift.id)).toEqual(['shift-same-calendar']);
  });
});
