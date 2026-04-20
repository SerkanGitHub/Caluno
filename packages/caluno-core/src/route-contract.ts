import { resolveCalendarAccess } from './access';
import type { AppCalendar, AppMembership } from './app-shell';

export type VisibleWeekSource = 'query' | 'default' | 'fallback-invalid';
export type ScheduleLoadStatus = 'ready' | 'query-error' | 'timeout' | 'malformed-response';

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

export function resolveVisibleWeek(searchParams: URLSearchParams, now = new Date()): VisibleWeek {
  const requestedStart = searchParams.get('start')?.trim() || null;

  if (requestedStart) {
    const parsedRequested = parseIsoDay(requestedStart);
    if (parsedRequested) {
      return buildVisibleWeek(parsedRequested, 'query', requestedStart, null);
    }

    return buildVisibleWeek(startOfUtcWeek(now), 'fallback-invalid', requestedStart, 'VISIBLE_WEEK_START_INVALID');
  }

  return buildVisibleWeek(startOfUtcWeek(now), 'default', null, null);
}

export function createEmptyCalendarScheduleView(visibleWeek: VisibleWeek): CalendarScheduleView {
  return {
    status: 'ready',
    reason: visibleWeek.reason,
    message:
      visibleWeek.reason === 'VISIBLE_WEEK_START_INVALID'
        ? 'The requested week start was invalid, so the route fell back to the current trusted week.'
        : 'The requested visible week resolved successfully.',
    visibleWeek,
    days: visibleWeek.dayKeys.map((dayKey) => ({
      dayKey,
      label: formatDayLabel(dayKey),
      shifts: []
    })),
    totalShifts: 0,
    shiftIds: []
  };
}

export function resolveTrustedCalendarFromAppShell(params: {
  calendarId: string;
  userId: string | null | undefined;
  memberships: AppMembership[] | null | undefined;
  calendars: AppCalendar[] | null | undefined;
}):
  | {
      ok: true;
      calendar: AppCalendar;
      memberships: AppMembership[];
      calendars: AppCalendar[];
    }
  | {
      ok: false;
      reason: 'calendar-id-invalid' | 'calendar-missing' | 'group-membership-missing' | 'anonymous';
      failurePhase: 'calendar-param' | 'calendar-lookup' | 'calendar-authorization';
    } {
  if (!Array.isArray(params.memberships) || !Array.isArray(params.calendars)) {
    return {
      ok: false,
      reason: 'group-membership-missing',
      failurePhase: 'calendar-authorization'
    };
  }

  if (!isUuidLike(params.calendarId)) {
    return {
      ok: false,
      reason: 'calendar-id-invalid',
      failurePhase: 'calendar-param'
    };
  }

  const accessResult = resolveCalendarAccess({
    calendars: params.calendars,
    memberships: params.memberships,
    calendarId: params.calendarId,
    userId: params.userId
  });

  if (!accessResult.allowed) {
    const reason =
      accessResult.reason === 'authenticated-group-member'
        ? 'group-membership-missing'
        : accessResult.reason;

    return {
      ok: false,
      reason,
      failurePhase: reason === 'calendar-missing' ? 'calendar-lookup' : 'calendar-authorization'
    };
  }

  return {
    ok: true,
    calendar: params.calendars.find((calendar) => calendar.id === params.calendarId) as AppCalendar,
    memberships: params.memberships,
    calendars: params.calendars
  };
}

function buildVisibleWeek(
  startDate: Date,
  source: VisibleWeekSource,
  requestedStart: string | null,
  reason: VisibleWeek['reason']
): VisibleWeek {
  const weekStart = startOfUtcDay(startDate);
  const weekEnd = addUtcDays(weekStart, 7);

  return {
    start: weekStart.toISOString().slice(0, 10),
    endExclusive: weekEnd.toISOString().slice(0, 10),
    startAt: weekStart.toISOString(),
    endAt: weekEnd.toISOString(),
    requestedStart,
    source,
    reason,
    dayKeys: Array.from({ length: 7 }, (_, index) => addUtcDays(weekStart, index).toISOString().slice(0, 10))
  };
}

function parseIsoDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcWeek(value: Date): Date {
  const dayStart = startOfUtcDay(value);
  const dayOfWeek = dayStart.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return addUtcDays(dayStart, -daysFromMonday);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, amount: number): Date {
  return new Date(value.getTime() + amount * DAY_IN_MS);
}

function formatDayLabel(dayKey: string): string {
  const date = parseIsoDay(dayKey);
  return (date ?? new Date(`${dayKey}T00:00:00.000Z`)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
