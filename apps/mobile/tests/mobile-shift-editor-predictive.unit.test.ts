import { describe, expect, it } from 'vitest';
import type { DetectedRecurrencePattern } from '@repo/caluno-core/schedule/recurrence';
import type { CalendarShift } from '@repo/caluno-core/schedule/types';
import {
  acceptSuggestionDraft,
  buildSuggestionKey,
  deriveMobileClashAdvisory,
  deriveSuggestionState,
  dismissSuggestionDraft,
  syncSuggestionLifecycle,
  type CreateSuggestionLifecycle
} from '../src/lib/components/calendar/shift-editor-predictive';

function createSuggestion(overrides: Partial<DetectedRecurrencePattern> = {}): DetectedRecurrencePattern {
  return {
    cadence: 'weekly',
    interval: 1,
    weekday: 1,
    startTime: '08:30',
    endTime: '09:00',
    exemplarShiftId: 'suggestion-3',
    exemplarStartAt: '2026-04-13T08:30:00.000Z',
    exemplarEndAt: '2026-04-13T09:00:00.000Z',
    matchCount: 3,
    matchingShiftIds: ['suggestion-1', 'suggestion-2', 'suggestion-3'],
    ...overrides
  };
}

function createShift(overrides: Partial<CalendarShift> = {}): CalendarShift {
  return {
    id: 'shift-1',
    calendarId: 'calendar-1',
    seriesId: null,
    title: 'Morning shift',
    startAt: '2026-04-20T09:00:00.000Z',
    endAt: '2026-04-20T10:00:00.000Z',
    occurrenceIndex: null,
    sourceKind: 'single',
    ...overrides
  };
}

describe('mobile shift editor predictive helpers', () => {
  it('preserves dismissed suggestions across close/reopen until fresh route data arrives', () => {
    const suggestionA = createSuggestion();
    const suggestionAKey = buildSuggestionKey(suggestionA);
    expect(suggestionAKey).toBeTruthy();

    let lifecycle: CreateSuggestionLifecycle = {
      acceptedSuggestionKey: null,
      dismissedSuggestionKey: null,
      lastSuggestionKey: null
    };

    lifecycle = syncSuggestionLifecycle({
      mode: 'create',
      currentSuggestionKey: suggestionAKey,
      lifecycle
    });
    expect(deriveSuggestionState({ currentSuggestionKey: suggestionAKey, lifecycle })).toBe('idle');

    lifecycle = {
      ...lifecycle,
      ...dismissSuggestionDraft({ suggestionKey: suggestionAKey })
    };
    expect(deriveSuggestionState({ currentSuggestionKey: suggestionAKey, lifecycle })).toBe('dismissed');

    const sameSuggestionLifecycle = syncSuggestionLifecycle({
      mode: 'create',
      currentSuggestionKey: suggestionAKey,
      lifecycle
    });
    expect(sameSuggestionLifecycle).toEqual(lifecycle);
    expect(deriveSuggestionState({ currentSuggestionKey: suggestionAKey, lifecycle: sameSuggestionLifecycle })).toBe('dismissed');

    const suggestionB = createSuggestion({ exemplarShiftId: 'suggestion-4', matchingShiftIds: ['suggestion-4'], matchCount: 1 });
    const suggestionBKey = buildSuggestionKey(suggestionB);
    const refreshedLifecycle = syncSuggestionLifecycle({
      mode: 'create',
      currentSuggestionKey: suggestionBKey,
      lifecycle
    });

    expect(refreshedLifecycle).toEqual({
      acceptedSuggestionKey: null,
      dismissedSuggestionKey: null,
      lastSuggestionKey: suggestionBKey
    });
    expect(deriveSuggestionState({ currentSuggestionKey: suggestionBKey, lifecycle: refreshedLifecycle })).toBe('idle');
  });

  it('accepts a suggestion by setting only the weekly recurrence fields', () => {
    const suggestionKey = buildSuggestionKey(createSuggestion());

    expect(acceptSuggestionDraft({ suggestionKey })).toEqual({
      recurrenceCadence: 'weekly',
      recurrenceInterval: '1',
      repeatCount: '',
      repeatUntil: '',
      acceptedSuggestionKey: suggestionKey,
      dismissedSuggestionKey: null
    });
  });

  it('suppresses clash advisory output for malformed drafts, delete mode, touching boundaries, and self-overlaps', () => {
    const existingShifts = [
      createShift({ id: 'self', title: 'Editable shift' }),
      createShift({ id: 'later', title: 'Later shift', startAt: '2026-04-20T10:00:00.000Z', endAt: '2026-04-20T11:00:00.000Z' })
    ];

    expect(
      deriveMobileClashAdvisory({
        mode: 'create',
        calendarId: 'calendar-1',
        title: 'Broken draft',
        startAt: 'not-a-date',
        endAt: '2026-04-20T10:30',
        existingShifts
      }).conflicts
    ).toEqual([]);

    expect(
      deriveMobileClashAdvisory({
        mode: 'create',
        calendarId: 'calendar-1',
        title: 'Inverted draft',
        startAt: '2026-04-20T11:00',
        endAt: '2026-04-20T10:00',
        existingShifts
      }).conflicts
    ).toEqual([]);

    expect(
      deriveMobileClashAdvisory({
        mode: 'delete',
        calendarId: 'calendar-1',
        shiftId: 'self',
        title: 'Editable shift',
        startAt: '2026-04-20T09:00',
        endAt: '2026-04-20T10:00',
        existingShifts
      }).conflicts
    ).toEqual([]);

    expect(
      deriveMobileClashAdvisory({
        mode: 'create',
        calendarId: 'calendar-1',
        title: 'Boundary touch',
        startAt: '2026-04-20T08:00',
        endAt: '2026-04-20T09:00',
        existingShifts
      }).conflicts
    ).toEqual([]);

    expect(
      deriveMobileClashAdvisory({
        mode: 'edit',
        calendarId: 'calendar-1',
        shiftId: 'self',
        title: 'Editable shift',
        startAt: '2026-04-20T09:00',
        endAt: '2026-04-20T10:00',
        existingShifts
      }).conflicts
    ).toEqual([]);
  });

  it('returns advisory metadata for real overlaps', () => {
    const advisory = deriveMobileClashAdvisory({
      mode: 'move',
      calendarId: 'calendar-1',
      shiftId: 'draft-shift',
      title: '',
      fallbackTitle: 'Movable shift',
      startAt: '2026-04-20T09:30',
      endAt: '2026-04-20T10:30',
      existingShifts: [
        createShift({ id: 'overlap-1' }),
        createShift({ id: 'overlap-2', startAt: '2026-04-20T10:15:00.000Z', endAt: '2026-04-20T11:15:00.000Z' })
      ]
    });

    expect(advisory.overlapLabel).toBe('2 overlapping shifts');
    expect(advisory.conflicts.map((conflict) => conflict.id)).toEqual(['overlap-1', 'overlap-2']);
  });
});
