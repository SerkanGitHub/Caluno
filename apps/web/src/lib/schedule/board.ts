import type {
  CalendarScheduleView,
  CalendarShift,
  ScheduleActionState,
  VisibleWeek
} from '$lib/server/schedule';

export type BoardTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ShiftCardModel = {
  id: string;
  title: string;
  dayKey: string;
  startAt: string;
  endAt: string;
  startTimeLabel: string;
  endTimeLabel: string;
  rangeLabel: string;
  durationLabel: string;
  occurrenceLabel: string | null;
  sourceLabel: string;
  density: 'quiet' | 'busy';
  seriesId: string | null;
  occurrenceIndex: number | null;
  sourceKind: 'single' | 'series';
};

export type ShiftDayColumnModel = {
  dayKey: string;
  label: string;
  weekdayLabel: string;
  dayNumberLabel: string;
  monthLabel: string;
  isToday: boolean;
  isEmpty: boolean;
  density: 'empty' | 'quiet' | 'busy';
  shiftCount: number;
  shifts: ShiftCardModel[];
};

export type CalendarWeekBoardModel = {
  visibleWeekStart: string;
  visibleWeekEndExclusive: string;
  rangeLabel: string;
  caption: string;
  sourceLabel: string;
  sourceTone: Exclude<BoardTone, 'success'>;
  previousWeekStart: string;
  nextWeekStart: string;
  totalShifts: number;
  hasShifts: boolean;
  days: ShiftDayColumnModel[];
};

export type ScheduleActionSummary = {
  id: string;
  label: string;
  tone: BoardTone;
  state: ScheduleActionState;
};

export function buildCalendarWeekBoard(
  schedule: Pick<CalendarScheduleView, 'visibleWeek' | 'days' | 'totalShifts'>,
  options?: { now?: Date }
): CalendarWeekBoardModel {
  const visibleWeek = schedule.visibleWeek;
  const todayKey = toDayKey(options?.now ?? null);
  const startDate = parseUtcDate(visibleWeek.start);
  const endDate = parseUtcDate(addDayKey(visibleWeek.endExclusive, -1));

  return {
    visibleWeekStart: visibleWeek.start,
    visibleWeekEndExclusive: visibleWeek.endExclusive,
    rangeLabel: `${formatMonthDay(startDate)} — ${formatMonthDay(endDate)}, ${startDate.getUTCFullYear()}`,
    caption: buildVisibleWeekCaption(visibleWeek),
    sourceLabel: buildVisibleWeekSourceLabel(visibleWeek),
    sourceTone: visibleWeek.source === 'fallback-invalid' ? 'warning' : 'neutral',
    previousWeekStart: addDayKey(visibleWeek.start, -7),
    nextWeekStart: addDayKey(visibleWeek.start, 7),
    totalShifts: schedule.totalShifts,
    hasShifts: schedule.totalShifts > 0,
    days: schedule.days.map((day) => buildDayColumn(day, todayKey))
  };
}

export function sortShiftsForBoard(shifts: CalendarShift[]): CalendarShift[] {
  return [...shifts].sort((left, right) => {
    return (
      left.startAt.localeCompare(right.startAt) ||
      left.endAt.localeCompare(right.endAt) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function summarizeScheduleActions(states: Array<ScheduleActionState | null | undefined>): ScheduleActionSummary[] {
  return states
    .filter((state): state is ScheduleActionState => Boolean(state))
    .map((state) => ({
      id: `${state.action}:${state.shiftId ?? state.seriesId ?? state.visibleWeekStart}`,
      label: formatActionLabel(state.action),
      tone: mapActionTone(state.status),
      state
    }));
}

export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getUTCDate()}`.padStart(2, '0');
  const hours = `${parsed.getUTCHours()}`.padStart(2, '0');
  const minutes = `${parsed.getUTCMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function buildDefaultCreateTimes(dayKey: string | null | undefined): { startAt: string; endAt: string } {
  const safeDayKey = dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) ? dayKey : '2026-04-20';

  return {
    startAt: `${safeDayKey}T09:00`,
    endAt: `${safeDayKey}T13:00`
  };
}

function buildDayColumn(
  day: Pick<CalendarScheduleView['days'][number], 'dayKey' | 'label' | 'shifts'>,
  todayKey: string | null
): ShiftDayColumnModel {
  const date = parseUtcDate(day.dayKey);
  const shifts = sortShiftsForBoard(day.shifts).map((shift) => buildShiftCardModel(shift, day.shifts.length));

  return {
    dayKey: day.dayKey,
    label: day.label,
    weekdayLabel: date.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC'
    }),
    dayNumberLabel: date.toLocaleDateString('en-US', {
      day: 'numeric',
      timeZone: 'UTC'
    }),
    monthLabel: date.toLocaleDateString('en-US', {
      month: 'short',
      timeZone: 'UTC'
    }),
    isToday: todayKey === day.dayKey,
    isEmpty: shifts.length === 0,
    density: shifts.length === 0 ? 'empty' : shifts.length >= 3 ? 'busy' : 'quiet',
    shiftCount: shifts.length,
    shifts
  };
}

function buildShiftCardModel(shift: CalendarShift, dayShiftCount: number): ShiftCardModel {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const durationHours = durationMinutes / 60;

  return {
    id: shift.id,
    title: shift.title,
    dayKey: shift.startAt.slice(0, 10),
    startAt: shift.startAt,
    endAt: shift.endAt,
    startTimeLabel: formatTime(start),
    endTimeLabel: formatTime(end),
    rangeLabel: `${formatTime(start)} → ${formatTime(end)}`,
    durationLabel:
      durationMinutes % 60 === 0 ? `${durationHours.toFixed(0)}h block` : `${durationHours.toFixed(1)}h block`,
    occurrenceLabel: shift.occurrenceIndex ? `Occurrence ${shift.occurrenceIndex}` : null,
    sourceLabel: shift.sourceKind === 'series' ? 'Recurring series' : 'One-off shift',
    density: dayShiftCount >= 3 ? 'busy' : 'quiet',
    seriesId: shift.seriesId,
    occurrenceIndex: shift.occurrenceIndex,
    sourceKind: shift.sourceKind
  };
}

function buildVisibleWeekCaption(visibleWeek: VisibleWeek): string {
  if (visibleWeek.source === 'query') {
    return 'Visible week chosen from the route query.';
  }

  if (visibleWeek.source === 'fallback-invalid') {
    return 'The requested week was malformed, so the board fell back to the current trusted week.';
  }

  return 'Showing the current trusted week.';
}

function buildVisibleWeekSourceLabel(visibleWeek: VisibleWeek): string {
  if (visibleWeek.source === 'query') {
    return `Visible week start: ${visibleWeek.start}`;
  }

  if (visibleWeek.source === 'fallback-invalid') {
    return `Invalid requested week ${visibleWeek.requestedStart ?? 'unknown'}. Showing ${visibleWeek.start} instead.`;
  }

  return `Default visible week start: ${visibleWeek.start}`;
}

function formatActionLabel(action: ScheduleActionState['action']): string {
  switch (action) {
    case 'create':
      return 'Create shift';
    case 'edit':
      return 'Edit shift';
    case 'move':
      return 'Move shift';
    case 'delete':
      return 'Delete shift';
  }
}

function mapActionTone(status: ScheduleActionState['status']): BoardTone {
  switch (status) {
    case 'success':
      return 'success';
    case 'timeout':
      return 'warning';
    case 'validation-error':
    case 'forbidden':
    case 'write-error':
    case 'malformed-response':
      return 'danger';
  }
}

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  });
}

function parseUtcDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

function addDayKey(dayKey: string, amount: number): string {
  const next = new Date(parseUtcDate(dayKey).getTime() + amount * DAY_IN_MS);
  return next.toISOString().slice(0, 10);
}

function toDayKey(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }

  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())).toISOString().slice(0, 10);
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
