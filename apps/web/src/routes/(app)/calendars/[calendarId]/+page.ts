import { browser } from '$app/environment';
import { createBrowserScheduleRepository, type OfflineWeekSnapshotReadResult } from '$lib/offline/repository';
import {
  createEmptyCalendarScheduleView,
  resolveTrustedCalendarFromAppShell,
  resolveVisibleWeek,
  type CalendarScheduleView
} from '$lib/server/schedule';
import type { AppCalendar, AppGroup } from '$lib/server/app-shell';
import type { ProtectedAppShellData } from '../../+layout';
import type { PageLoad } from './$types';

type CalendarRouteView =
  | {
      kind: 'calendar';
      calendar: AppCalendar;
      group: AppGroup | null;
      welcome: null;
      visibleWeek: CalendarScheduleView['visibleWeek'];
      schedule: CalendarScheduleView;
    }
  | {
      kind: 'denied';
      attemptedCalendarId: string;
      failurePhase: 'calendar-param' | 'calendar-lookup' | 'calendar-authorization';
      reason: 'calendar-id-invalid' | 'calendar-missing' | 'group-membership-missing' | 'anonymous';
      detail: {
        badge: string;
        title: string;
        detail: string;
      };
      welcome: null;
    };

function buildDeniedCalendarView(params: {
  calendarId: string;
  reason: 'calendar-id-invalid' | 'calendar-missing' | 'group-membership-missing' | 'anonymous';
  failurePhase: 'calendar-param' | 'calendar-lookup' | 'calendar-authorization';
  badge: string;
  title: string;
  detail: string;
}): { calendarView: CalendarRouteView } {
  return {
    calendarView: {
      kind: 'denied',
      attemptedCalendarId: params.calendarId,
      failurePhase: params.failurePhase,
      reason: params.reason,
      detail: {
        badge: params.badge,
        title: params.title,
        detail: params.detail
      },
      welcome: null
    }
  };
}

function buildCachedSchedule(snapshot: Extract<OfflineWeekSnapshotReadResult, { status: 'available' }>['snapshot']): CalendarScheduleView {
  const emptyView = createEmptyCalendarScheduleView(snapshot.visibleWeek);
  const mappedShifts = [...snapshot.shifts].sort(
    (left, right) =>
      left.startAt.localeCompare(right.startAt) ||
      left.endAt.localeCompare(right.endAt) ||
      left.title.localeCompare(right.title)
  );

  return {
    status: 'ready',
    reason: emptyView.reason,
    message:
      snapshot.origin === 'local-write'
        ? 'Showing cached week data with browser-local edits already applied.'
        : 'Showing the last trusted week snapshot cached on this browser.',
    visibleWeek: snapshot.visibleWeek,
    days: emptyView.days.map((day) => ({
      ...day,
      shifts: mappedShifts.filter((shift) => shift.startAt.slice(0, 10) === day.dayKey)
    })),
    totalShifts: mappedShifts.length,
    shiftIds: mappedShifts.map((shift) => shift.id)
  };
}

function resolveGroup(groups: AppGroup[] | null | undefined, groupId: string): AppGroup | null {
  return Array.isArray(groups) ? groups.find((group) => group.id === groupId) ?? null : null;
}

export function resolveCachedCalendarRouteData(params: {
  calendarId: string;
  searchParams: URLSearchParams;
  appShell: ProtectedAppShellData | null;
  shellState: App.ProtectedShellState;
  snapshotResult?: OfflineWeekSnapshotReadResult | null;
}): {
  calendarView: CalendarRouteView;
  protectedCalendarState: App.ProtectedCalendarState;
} {
  const visibleWeek = resolveVisibleWeek(params.searchParams);

  if (!params.appShell) {
    return {
      ...buildDeniedCalendarView({
        calendarId: params.calendarId,
        reason: 'anonymous',
        failurePhase: 'calendar-authorization',
        badge: 'Offline unavailable',
        title: 'This browser cannot reopen the protected shell offline.',
        detail: params.shellState.detail
      }),
      protectedCalendarState: {
        mode: 'offline-denied',
        reason: params.shellState.reason,
        detail: params.shellState.detail,
        cachedAt: null,
        visibleWeekStart: visibleWeek.start,
        visibleWeekOrigin: null
      }
    };
  }

  const calendarState = resolveTrustedCalendarFromAppShell({
    calendarId: params.calendarId,
    userId: params.appShell.viewer.id,
    memberships: params.appShell.memberships,
    calendars: params.appShell.calendars
  });

  if (!calendarState.ok) {
    const isUnsyncedCalendar = calendarState.reason === 'calendar-missing';

    return {
      ...buildDeniedCalendarView({
        calendarId: params.calendarId,
        reason: calendarState.reason,
        failurePhase: calendarState.failurePhase,
        badge: isUnsyncedCalendar ? 'Offline denied' : 'Offline route rejected',
        title: isUnsyncedCalendar
          ? 'That calendar was never synced on this browser.'
          : 'This offline calendar route could not be trusted.',
        detail: isUnsyncedCalendar
          ? 'Offline continuity only reopens calendars that were previously synced into the trusted browser-local scope.'
          : 'The cached protected shell rejected this calendar route instead of guessing access.'
      }),
      protectedCalendarState: {
        mode: 'offline-denied',
        reason: isUnsyncedCalendar ? 'calendar-not-synced' : calendarState.reason,
        detail: isUnsyncedCalendar
          ? 'That calendar id was never synced into the trusted browser-local scope, so offline continuity failed closed.'
          : 'The cached protected shell rejected this calendar route instead of guessing access.',
        cachedAt: null,
        visibleWeekStart: visibleWeek.start,
        visibleWeekOrigin: null
      }
    };
  }

  const snapshotResult = params.snapshotResult;
  if (!snapshotResult || snapshotResult.status === 'missing') {
    return {
      ...buildDeniedCalendarView({
        calendarId: params.calendarId,
        reason: 'calendar-missing',
        failurePhase: 'calendar-lookup',
        badge: 'Offline unavailable',
        title: 'This week has not been cached for offline use yet.',
        detail: 'Open this calendar week online once before relying on browser-local continuity.'
      }),
      protectedCalendarState: {
        mode: 'offline-denied',
        reason: 'snapshot-missing',
        detail: 'No trusted cached week snapshot exists for this calendar and visible week yet.',
        cachedAt: null,
        visibleWeekStart: visibleWeek.start,
        visibleWeekOrigin: null
      }
    };
  }

  if (snapshotResult.status === 'malformed') {
    return {
      ...buildDeniedCalendarView({
        calendarId: params.calendarId,
        reason: 'calendar-missing',
        failurePhase: 'calendar-lookup',
        badge: 'Offline denied',
        title: 'The cached calendar snapshot could not be trusted.',
        detail: snapshotResult.detail
      }),
      protectedCalendarState: {
        mode: 'offline-denied',
        reason: snapshotResult.reason,
        detail: snapshotResult.detail,
        cachedAt: null,
        visibleWeekStart: visibleWeek.start,
        visibleWeekOrigin: null
      }
    };
  }

  if (snapshotResult.status === 'unavailable') {
    return {
      ...buildDeniedCalendarView({
        calendarId: params.calendarId,
        reason: 'calendar-missing',
        failurePhase: 'calendar-lookup',
        badge: 'Offline unavailable',
        title: 'Browser-local calendar storage is unavailable.',
        detail: snapshotResult.detail
      }),
      protectedCalendarState: {
        mode: 'offline-denied',
        reason: snapshotResult.reason,
        detail: snapshotResult.detail,
        cachedAt: null,
        visibleWeekStart: visibleWeek.start,
        visibleWeekOrigin: null
      }
    };
  }

  return {
    calendarView: {
      kind: 'calendar',
      calendar: calendarState.calendar,
      group: resolveGroup(params.appShell.groups, calendarState.calendar.groupId),
      welcome: null,
      visibleWeek: snapshotResult.snapshot.visibleWeek,
      schedule: buildCachedSchedule(snapshotResult.snapshot)
    },
    protectedCalendarState: {
      mode: 'cached-offline',
      reason: null,
      detail: 'This calendar reopened from the last trusted week snapshot stored on this browser.',
      cachedAt: snapshotResult.snapshot.cachedAt,
      visibleWeekStart: snapshotResult.snapshot.visibleWeek.start,
      visibleWeekOrigin: 'cached-local'
    }
  };
}

export const load: PageLoad = async ({ data, params, parent, url }) => {
  const parentData = await parent();
  const isOnline = !browser || navigator.onLine;

  if (isOnline) {
    if (browser && data.calendarView.kind === 'calendar' && data.calendarView.schedule.status === 'ready' && parentData.appShell) {
      const repository = createBrowserScheduleRepository();

      try {
        await repository.putWeekSnapshot({
          scope: {
            userId: parentData.appShell.viewer.id,
            calendarId: data.calendarView.calendar.id,
            weekStart: data.calendarView.schedule.visibleWeek.start
          },
          visibleWeek: data.calendarView.schedule.visibleWeek,
          shifts: data.calendarView.schedule.days.flatMap((day) => day.shifts),
          cachedAt: new Date().toISOString(),
          origin: 'server-sync'
        });
      } catch {
        // fail closed: keep the trusted online route active even if local caching is unavailable
      } finally {
        await repository.close();
      }
    }

    return {
      protectedCalendarState: {
        mode: 'trusted-online',
        reason: null,
        detail: 'Week data and calendar scope came from the trusted server route.',
        cachedAt: null,
        visibleWeekStart: data.calendarView.kind === 'calendar' ? data.calendarView.schedule.visibleWeek.start : null,
        visibleWeekOrigin: data.calendarView.kind === 'calendar' ? 'server-sync' : null
      }
    };
  }

  if (!parentData.appShell) {
    return resolveCachedCalendarRouteData({
      calendarId: params.calendarId,
      searchParams: url.searchParams,
      appShell: null,
      shellState: parentData.protectedShellState
    });
  }

  const visibleWeek = resolveVisibleWeek(url.searchParams);
  const repository = createBrowserScheduleRepository();

  try {
    const snapshotResult = await repository.getWeekSnapshot({
      userId: parentData.appShell.viewer.id,
      calendarId: params.calendarId,
      weekStart: visibleWeek.start
    });

    return resolveCachedCalendarRouteData({
      calendarId: params.calendarId,
      searchParams: url.searchParams,
      appShell: parentData.appShell,
      shellState: parentData.protectedShellState,
      snapshotResult
    });
  } finally {
    await repository.close();
  }
};
