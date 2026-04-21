export const scheduleRecurrenceCadences = ['daily', 'weekly', 'monthly'] as const;

export type ScheduleRecurrenceCadence = (typeof scheduleRecurrenceCadences)[number];

export type ScheduleValidationFailureReason =
  | 'TITLE_REQUIRED'
  | 'SHIFT_START_INVALID'
  | 'SHIFT_END_INVALID'
  | 'SHIFT_END_BEFORE_START'
  | 'RECURRENCE_CADENCE_REQUIRED'
  | 'RECURRENCE_CADENCE_UNSUPPORTED'
  | 'RECURRENCE_INTERVAL_INVALID'
  | 'RECURRENCE_BOUND_REQUIRED'
  | 'RECURRENCE_REPEAT_COUNT_INVALID'
  | 'RECURRENCE_REPEAT_UNTIL_INVALID'
  | 'RECURRENCE_REPEAT_UNTIL_BEFORE_SHIFT_END'
  | 'VISIBLE_RANGE_START_INVALID'
  | 'VISIBLE_RANGE_END_INVALID'
  | 'VISIBLE_RANGE_INVALID'
  | 'VISIBLE_RANGE_TOO_WIDE';

export type ScheduleValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      reason: ScheduleValidationFailureReason;
      field?: string;
      detail?: string;
    };

export type ScheduleRecurrenceInput = {
  cadence?: string | null;
  interval?: number | null;
  repeatCount?: number | null;
  repeatUntil?: string | null;
};

export type ScheduleShiftDraftInput = {
  calendarId: string;
  title: string;
  startAt: string;
  endAt: string;
  seriesId?: string | null;
  recurrence?: ScheduleRecurrenceInput | null;
};

export type ScheduleVisibleRangeInput = {
  startAt: string;
  endAt: string;
  maxDays?: number;
};

export type NormalizedScheduleRecurrence = {
  cadence: ScheduleRecurrenceCadence;
  interval: number;
  repeatCount: number | null;
  repeatUntil: Date | null;
};

export type NormalizedScheduleShiftDraft = {
  calendarId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMs: number;
  seriesId: string | null;
  recurrence: NormalizedScheduleRecurrence | null;
};

export type NormalizedScheduleVisibleRange = {
  startAt: Date;
  endAt: Date;
  maxDays: number;
  daySpan: number;
};

export type ExpandedScheduleOccurrence = {
  calendarId: string;
  title: string;
  seriesId: string | null;
  occurrenceIndex: number | null;
  startAt: string;
  endAt: string;
  dayKey: string;
};

export type VisibleWeekSource = 'query' | 'default' | 'fallback-invalid';
export type ScheduleLoadStatus = 'ready' | 'query-error' | 'timeout' | 'malformed-response';
export type ScheduleActionKind = 'create' | 'edit' | 'move' | 'delete';
export type ScheduleActionStatus =
  | 'success'
  | 'validation-error'
  | 'forbidden'
  | 'write-error'
  | 'timeout'
  | 'malformed-response';

export type VisibleWeek = {
  start: string;
  endExclusive: string;
  startAt: string;
  endAt: string;
  requestedStart: string | null;
  source: VisibleWeekSource;
  reason: 'VISIBLE_WEEK_START_INVALID' | null;
  dayKeys: string[];
};

export type CalendarShift = {
  id: string;
  calendarId: string;
  seriesId: string | null;
  title: string;
  startAt: string;
  endAt: string;
  occurrenceIndex: number | null;
  sourceKind: 'single' | 'series';
};

export type CalendarShiftDay = {
  dayKey: string;
  label: string;
  shifts: CalendarShift[];
};

export type CalendarScheduleView = {
  status: ScheduleLoadStatus;
  reason: string | null;
  message: string;
  visibleWeek: VisibleWeek;
  days: CalendarShiftDay[];
  totalShifts: number;
  shiftIds: string[];
};

export type ScheduleActionState = {
  action: ScheduleActionKind;
  status: ScheduleActionStatus;
  reason: string;
  message: string;
  visibleWeekStart: string;
  shiftId: string | null;
  seriesId: string | null;
  affectedShiftIds: string[];
  fields: Record<string, string>;
};

export type CalendarControllerActionStatus =
  | 'pending-local'
  | 'success'
  | 'validation-error'
  | 'forbidden'
  | 'write-error'
  | 'timeout'
  | 'malformed-response'
  | 'local-write-failed'
  | 'queue-persist-failed';

export type CalendarControllerActionState = {
  id: string;
  formId: string;
  action: ScheduleActionKind;
  status: CalendarControllerActionStatus;
  reason: string;
  message: string;
  shiftId: string | null;
  createdAt: string;
};

export type CalendarControllerFailure = {
  reason: string;
  detail: string;
};

export type CalendarControllerSyncPhase = 'idle' | 'draining' | 'paused-retryable';

export type CalendarShiftDiagnostic = {
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
};
