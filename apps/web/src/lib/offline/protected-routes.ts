import {
  readCachedAppShellSnapshot,
  writeCachedAppShellSnapshot,
  type CachedAppShellLookup,
  type CachedAppShellSnapshot
} from '$lib/offline/app-shell-cache';
import {
  createEmptyCalendarScheduleView,
  resolveTrustedCalendarFromAppShell,
  resolveVisibleWeek,
  type AppCalendar,
  type AppGroup,
  type AppMembership,
  type CalendarScheduleView,
  type ViewerSummary
} from '@repo/caluno-core';
import type { OfflineWeekSnapshotReadResult } from './repository';

export type ProtectedAppShellData = {
  viewer: ViewerSummary;
  memberships: AppMembership[];
  groups: AppGroup[];
  calendars: AppCalendar[];
  primaryCalendar: AppCalendar | null;
  onboardingState: 'needs-group' | 'ready';
};

export function buildProtectedAppShellFromSnapshot(snapshot: CachedAppShellSnapshot): ProtectedAppShellData {
  const calendars = snapshot.calendars.map((calendar) => ({
    id: calendar.id,
    groupId: calendar.groupId,
    name: calendar.name,
    isDefault: calendar.isDefault
  }));

  const memberships = snapshot.groups.map((group) => ({
    groupId: group.id,
    userId: snapshot.viewer.id,
    role: group.role
  })) satisfies AppMembership[];

  const groups = snapshot.groups.map((group) => ({
    id: group.id,
    name: group.name,
    role: group.role,
    calendars: group.calendarIds
      .map((calendarId) => calendars.find((calendar) => calendar.id === calendarId) ?? null)
      .filter((calendar): calendar is AppCalendar => calendar !== null),
    joinCode: null,
    joinCodeStatus: 'unavailable'
  })) satisfies AppGroup[];

  return {
    viewer: {
      id: snapshot.viewer.id,
      email: snapshot.viewer.email,
      displayName: snapshot.viewer.displayName
    },
    memberships,
    groups,
    calendars,
    primaryCalendar: calendars.find((calendar) => calendar.id === snapshot.primaryCalendarId) ?? null,
    onboardingState: snapshot.onboardingState
  };
}

export function resolveProtectedShellRouteData(params: {
  isOnline: boolean;
  serverAppShell?: ProtectedAppShellData | null;
  cachedLookup?: CachedAppShellLookup | null;
}): {
  appShell: ProtectedAppShellData | null;
  protectedShellState: App.ProtectedShellState;
} {
  if (params.isOnline && params.serverAppShell) {
    return {
      appShell: params.serverAppShell,
      protectedShellState: {
        mode: 'trusted-online',
        reason: null,
        detail: 'Protected navigation and calendar scope came from the trusted server load.',
        refreshedAt: null,
        visibleCalendarIds: params.serverAppShell.calendars.map((calendar) => calendar.id)
      }
    };
  }

  if (params.cachedLookup?.status === 'available') {
    const appShell = buildProtectedAppShellFromSnapshot(params.cachedLookup.snapshot);

    return {
      appShell,
      protectedShellState: {
        mode: 'cached-offline',
        reason: null,
        detail: 'Protected navigation reopened from the last trusted browser-local shell snapshot.',
        refreshedAt: params.cachedLookup.snapshot.refreshedAt,
        visibleCalendarIds: appShell.calendars.map((calendar) => calendar.id)
      }
    };
  }

  return {
    appShell: null,
    protectedShellState: {
      mode: 'offline-denied',
      reason: params.cachedLookup?.status === 'unavailable' ? params.cachedLookup.reason : 'cache-missing',
      detail:
        params.cachedLookup?.status === 'unavailable'
          ? params.cachedLookup.detail
          : 'No trusted browser-local shell snapshot is available, so offline continuity stayed locked down.',
      refreshedAt: null,
      visibleCalendarIds: []
    }
  };
}

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

