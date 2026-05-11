import { previewShiftConflicts } from './conflicts';
import { normalizeShiftDraft } from './recurrence';
import type { CalendarShift } from './types';

export type ShiftEditorAdvisoryMode = 'create' | 'edit' | 'move';

export type DeriveShiftEditorClashesParams = {
  mode: ShiftEditorAdvisoryMode;
  calendarId: string | null;
  shiftId?: string | null;
  title: string;
  fallbackTitle?: string | null;
  startAt: string;
  endAt: string;
  existingShifts: CalendarShift[];
};

export function deriveShiftEditorClashes(params: DeriveShiftEditorClashesParams): CalendarShift[] {
  if (!params.calendarId) {
    return [];
  }

  const draftResult = normalizeShiftDraft({
    calendarId: params.calendarId,
    title: params.mode === 'move' ? params.fallbackTitle ?? params.title : params.title,
    startAt: params.startAt,
    endAt: params.endAt,
    recurrence: null
  });

  if (!draftResult.ok) {
    return [];
  }

  return previewShiftConflicts(
    draftResult.value,
    params.existingShifts.filter((candidate) => candidate.id !== params.shiftId)
  );
}
