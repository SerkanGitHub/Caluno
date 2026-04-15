import type {
  CalendarControllerActionState,
  CalendarControllerFailure,
  CalendarControllerSyncPhase,
  CalendarShiftDiagnostic
} from '$lib/offline/calendar-controller';
import type { CalendarScheduleView, CalendarShift, VisibleWeek } from '$lib/server/schedule';

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
  statusBadges: CalendarShiftDiagnostic[];
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

export type CalendarWeekBoardStatusBadge = {
  id: string;
  label: string;
  tone: BoardTone;
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
  statusBadges: CalendarWeekBoardStatusBadge[];
  syncPhaseLabel: string;
  lastSyncAttemptLabel: string | null;
  lastFailure: CalendarControllerFailure | null;
  lastSyncError: CalendarControllerFailure | null;
  days: ShiftDayColumnModel[];
};

export type CalendarActionSummary = {
  id: string;
  label: string;
  tone: BoardTone;
  state: CalendarControllerActionState;
};

export function buildCalendarWeekBoard(
  schedule: Pick<CalendarScheduleView, 'visibleWeek' | 'days' | 'totalShifts'>,
  options?: {
    now?: Date;
    runtime?: {
      boardSource: 'server-sync' | 'cached-local';
      network: 'online' | 'offline';
      queueLength: number;
      pendingQueueLength: number;
      retryableQueueLength: number;
      syncPhase: CalendarControllerSyncPhase;
      lastSyncAttemptAt: string | null;
      shiftDiagnostics?: Record<string, CalendarShiftDiagnostic[]>;
      lastFailure?: CalendarControllerFailure | null;
      lastSyncError?: CalendarControllerFailure | null;
    };
  }
): CalendarWeekBoardModel {
  const visibleWeek = schedule.visibleWeek;
  const todayKey = toDayKey(options?.now ?? null);
  const startDate = parseUtcDate(visibleWeek.start);
  const endDate = parseUtcDate(addDayKey(visibleWeek.endExclusive, -1));
  const runtime = options?.runtime;

  return {
    visibleWeekStart: visibleWeek.start,
    visibleWeekEndExclusive: visibleWeek.endExclusive,
    rangeLabel: `${formatMonthDay(startDate)} — ${formatMonthDay(endDate)}, ${startDate.getUTCFullYear()}`,
    caption: buildVisibleWeekCaption(visibleWeek, runtime?.boardSource ?? 'server-sync'),
    sourceLabel: buildVisibleWeekSourceLabel(visibleWeek),
    sourceTone: visibleWeek.source === 'fallback-invalid' ? 'warning' : 'neutral',
    previousWeekStart: addDayKey(visibleWeek.start, -7),
    nextWeekStart: addDayKey(visibleWeek.start, 7),
    totalShifts: schedule.totalShifts,
    hasShifts: schedule.totalShifts > 0,
    statusBadges: buildBoardStatusBadges(runtime),
    syncPhaseLabel: formatSyncPhaseLabel(runtime?.syncPhase ?? 'idle'),
    lastSyncAttemptLabel: runtime?.lastSyncAttemptAt ?? null,
    lastFailure: runtime?.lastFailure ?? null,
    lastSyncError: runtime?.lastSyncError ?? null,
    days: schedule.days.map((day) => buildDayColumn(day, todayKey, runtime?.shiftDiagnostics ?? {}))
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

export function summarizeScheduleActions(
  states: Array<CalendarControllerActionState | null | undefined>
): CalendarActionSummary[] {
  return states
    .filter((state): state is CalendarControllerActionState => Boolean(state))
    .map((state) => ({
      id: state.id,
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
  todayKey: string | null,
  shiftDiagnostics: Record<string, CalendarShiftDiagnostic[]>
): ShiftDayColumnModel {
  const date = parseUtcDate(day.dayKey);
  const shifts = sortShiftsForBoard(day.shifts).map((shift) => buildShiftCardModel(shift, day.shifts.length, shiftDiagnostics));

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

function buildShiftCardModel(
  shift: CalendarShift,
  dayShiftCount: number,
  shiftDiagnostics: Record<string, CalendarShiftDiagnostic[]>
): ShiftCardModel {
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
    sourceKind: shift.sourceKind,
    statusBadges: shiftDiagnostics[shift.id] ?? []
  };
}

function buildBoardStatusBadges(
  runtime:
    | {
        boardSource: 'server-sync' | 'cached-local';
        network: 'online' | 'offline';
        queueLength: number;
        pendingQueueLength: number;
        retryableQueueLength: number;
        syncPhase: CalendarControllerSyncPhase;
        lastSyncAttemptAt: string | null;
      }
    | undefined
): CalendarWeekBoardStatusBadge[] {
  if (!runtime) {
    return [];
  }

  const badges: CalendarWeekBoardStatusBadge[] = [
    {
      id: 'board-source',
      label: runtime.boardSource === 'cached-local' ? 'Cached local board' : 'Server-synced board',
      tone: runtime.boardSource === 'cached-local' ? 'warning' : 'neutral'
    },
    {
      id: 'network',
      label: runtime.network === 'offline' ? 'Offline' : 'Online',
      tone: runtime.network === 'offline' ? 'warning' : 'neutral'
    },
    {
      id: 'sync-phase',
      label: formatSyncPhaseLabel(runtime.syncPhase),
      tone: runtime.syncPhase === 'paused-retryable' ? 'danger' : runtime.syncPhase === 'draining' ? 'warning' : 'neutral'
    }
  ];

  if (runtime.lastSyncAttemptAt) {
    badges.push({
      id: 'sync-attempt',
      label: 'Sync attempt recorded',
      tone: 'neutral'
    });
  }

  if (runtime.queueLength === 0) {
    badges.push({
      id: 'queue',
      label: 'No pending local writes',
      tone: 'neutral'
    });
    return badges;
  }

  if (runtime.retryableQueueLength > 0) {
    badges.push({
      id: 'queue',
      label: `${runtime.retryableQueueLength} retryable local ${runtime.retryableQueueLength === 1 ? 'write' : 'writes'}`,
      tone: 'danger'
    });
  } else {
    badges.push({
      id: 'queue',
      label: `${runtime.pendingQueueLength} pending local ${runtime.pendingQueueLength === 1 ? 'write' : 'writes'}`,
      tone: 'warning'
    });
  }

  return badges;
}

function buildVisibleWeekCaption(visibleWeek: VisibleWeek, boardSource: 'server-sync' | 'cached-local'): string {
  if (visibleWeek.source === 'query') {
    return boardSource === 'cached-local'
      ? 'Visible week chosen from the route query and reopened from browser-local continuity.'
      : 'Visible week chosen from the route query.';
  }

  if (visibleWeek.source === 'fallback-invalid') {
    return 'The requested week was malformed, so the board fell back to the current trusted week.';
  }

  return boardSource === 'cached-local'
    ? 'Showing the current week from browser-local continuity.'
    : 'Showing the current trusted week.';
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

function formatActionLabel(action: CalendarControllerActionState['action']): string {
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

function mapActionTone(status: CalendarControllerActionState['status']): BoardTone {
  switch (status) {
    case 'success':
      return 'success';
    case 'pending-local':
    case 'timeout':
      return 'warning';
    case 'validation-error':
    case 'forbidden':
    case 'write-error':
    case 'malformed-response':
    case 'local-write-failed':
    case 'queue-persist-failed':
      return 'danger';
  }
}

function formatSyncPhaseLabel(phase: CalendarControllerSyncPhase): string {
  switch (phase) {
    case 'idle':
      return 'Sync idle';
    case 'draining':
      return 'Sync draining reconnect queue';
    case 'paused-retryable':
      return 'Sync paused with retryable work';
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
