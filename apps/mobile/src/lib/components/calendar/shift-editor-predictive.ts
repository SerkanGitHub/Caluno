import type { DetectedRecurrencePattern } from '@repo/caluno-core/schedule/recurrence';
import { deriveShiftEditorClashes, type ShiftEditorAdvisoryMode } from '@repo/caluno-core/schedule/shift-editor-advisory';
import type { CalendarShift } from '@repo/caluno-core/schedule/types';

export type MobileSuggestionState = 'idle' | 'accepted' | 'dismissed' | 'absent';
export type MobileRecurrenceCadence = '' | 'daily' | 'weekly' | 'monthly';
export type MobileShiftEditorMode = ShiftEditorAdvisoryMode | 'delete';

export type CreateSuggestionLifecycle = {
  acceptedSuggestionKey: string | null;
  dismissedSuggestionKey: string | null;
  lastSuggestionKey: string | null;
};

export type CreateRecurrenceDraft = {
  recurrenceCadence: MobileRecurrenceCadence;
  recurrenceInterval: string;
  repeatCount: string;
  repeatUntil: string;
};

export function buildSuggestionKey(suggestion: DetectedRecurrencePattern | null): string | null {
  if (!suggestion) {
    return null;
  }

  return [
    suggestion.exemplarShiftId,
    suggestion.cadence,
    suggestion.interval,
    suggestion.weekday,
    suggestion.startTime,
    suggestion.endTime,
    suggestion.matchCount,
    suggestion.matchingShiftIds.join(',')
  ].join(':');
}

export function deriveSuggestionState(params: {
  currentSuggestionKey: string | null;
  lifecycle: Pick<CreateSuggestionLifecycle, 'acceptedSuggestionKey' | 'dismissedSuggestionKey'>;
}): MobileSuggestionState {
  if (!params.currentSuggestionKey) {
    return 'absent';
  }

  if (params.lifecycle.dismissedSuggestionKey === params.currentSuggestionKey) {
    return 'dismissed';
  }

  if (params.lifecycle.acceptedSuggestionKey === params.currentSuggestionKey) {
    return 'accepted';
  }

  return 'idle';
}

export function syncSuggestionLifecycle(params: {
  mode: MobileShiftEditorMode;
  currentSuggestionKey: string | null;
  lifecycle: CreateSuggestionLifecycle;
}): CreateSuggestionLifecycle {
  if (params.mode !== 'create') {
    return {
      acceptedSuggestionKey: null,
      dismissedSuggestionKey: null,
      lastSuggestionKey: null
    };
  }

  if (params.currentSuggestionKey === params.lifecycle.lastSuggestionKey) {
    return params.lifecycle;
  }

  return {
    acceptedSuggestionKey: null,
    dismissedSuggestionKey: null,
    lastSuggestionKey: params.currentSuggestionKey
  };
}

export function resetCreateRecurrenceDraft(params: {
  clearSuggestionFeedback?: boolean;
  dismissedSuggestionKey?: string | null;
} = {}): CreateRecurrenceDraft & Pick<CreateSuggestionLifecycle, 'acceptedSuggestionKey' | 'dismissedSuggestionKey'> {
  return {
    recurrenceCadence: '',
    recurrenceInterval: '',
    repeatCount: '',
    repeatUntil: '',
    acceptedSuggestionKey: null,
    dismissedSuggestionKey: params.clearSuggestionFeedback ? null : (params.dismissedSuggestionKey ?? null)
  };
}

export function acceptSuggestionDraft(params: {
  suggestionKey: string | null;
}): CreateRecurrenceDraft & Pick<CreateSuggestionLifecycle, 'acceptedSuggestionKey' | 'dismissedSuggestionKey'> {
  if (!params.suggestionKey) {
    return {
      recurrenceCadence: '',
      recurrenceInterval: '',
      repeatCount: '',
      repeatUntil: '',
      acceptedSuggestionKey: null,
      dismissedSuggestionKey: null
    };
  }

  return {
    recurrenceCadence: 'weekly',
    recurrenceInterval: '1',
    repeatCount: '',
    repeatUntil: '',
    acceptedSuggestionKey: params.suggestionKey,
    dismissedSuggestionKey: null
  };
}

export function dismissSuggestionDraft(params: {
  suggestionKey: string | null;
}): Pick<CreateSuggestionLifecycle, 'acceptedSuggestionKey' | 'dismissedSuggestionKey'> {
  return {
    acceptedSuggestionKey: null,
    dismissedSuggestionKey: params.suggestionKey
  };
}

export function deriveMobileClashAdvisory(params: {
  mode: MobileShiftEditorMode;
  calendarId: string;
  shiftId?: string | null;
  title: string;
  fallbackTitle?: string | null;
  startAt: string;
  endAt: string;
  existingShifts: CalendarShift[];
}) {
  if (params.mode === 'delete') {
    return {
      conflicts: [],
      overlapLabel: '0 overlapping shifts'
    };
  }

  const conflicts = deriveShiftEditorClashes({
    mode: params.mode,
    calendarId: params.calendarId,
    shiftId: params.shiftId,
    title: params.title,
    fallbackTitle: params.fallbackTitle,
    startAt: params.startAt,
    endAt: params.endAt,
    existingShifts: params.existingShifts
  });

  return {
    conflicts,
    overlapLabel: conflicts.length === 1 ? '1 overlapping shift' : `${conflicts.length} overlapping shifts`
  };
}
