import { describeDeniedCalendarReason } from '@repo/caluno-core/app-shell';
import type { FindTimeWindow } from '@repo/caluno-core/find-time/matcher';
import type { MobileNetworkStatus } from '$lib/offline/network';
import type { MobileCalendarRouteResult, MobileShellRouteMode } from '$lib/shell/load-app-shell';
import type { MobileFindTimeSearchView } from './transport';

export type MobileFindTimeRouteStatus =
  | 'ready'
  | 'no-results'
  | 'invalid-input'
  | 'query-failure'
  | 'timeout'
  | 'malformed-response'
  | 'denied'
  | 'offline-unavailable';

export type MobileFindTimeResolvedState = {
  status: MobileFindTimeRouteStatus;
  reason: string | null;
  message: string;
  routeMode: MobileShellRouteMode;
  networkConnected: boolean | null;
  networkSource: MobileNetworkStatus['source'] | 'none';
  denialPhase: string | null;
  calendarId: string | null;
  topPicks: FindTimeWindow[];
  browseWindows: FindTimeWindow[];
  windows: FindTimeWindow[];
  topPickCount: number;
  browseCount: number;
  totalWindows: number;
  truncated: boolean;
  durationMinutes: number | null;
  rangeStartAt: string | null;
  rangeEndAt: string | null;
};

export function shouldLoadMobileFindTimeSearch(params: {
  routeAccess: MobileCalendarRouteResult | null;
  routeMode: MobileShellRouteMode;
  network: MobileNetworkStatus | null;
}) {
  return (
    params.routeAccess?.kind === 'calendar' &&
    params.routeMode === 'trusted-online' &&
    params.network?.connected === true
  );
}

export function resolveMobileFindTimeRouteState(params: {
  routeAccess: MobileCalendarRouteResult | null;
  routeMode: MobileShellRouteMode;
  network: MobileNetworkStatus | null;
  search: MobileFindTimeSearchView | null;
}): MobileFindTimeResolvedState | null {
  if (params.routeAccess?.kind === 'denied') {
    const deniedDetail = describeDeniedCalendarReason(params.routeAccess.state.reason);
    return {
      status: 'denied',
      reason: params.routeAccess.state.reason,
      message: deniedDetail.detail,
      routeMode: params.routeMode,
      networkConnected: params.network?.connected ?? null,
      networkSource: params.network?.source ?? 'none',
      denialPhase: params.routeAccess.state.failurePhase,
      calendarId: params.routeAccess.state.attemptedCalendarId,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0,
      truncated: false,
      durationMinutes: null,
      rangeStartAt: null,
      rangeEndAt: null
    } satisfies MobileFindTimeResolvedState;
  }

  const calendarId = params.routeAccess?.kind === 'calendar' ? params.routeAccess.state.calendar.id : null;

  if (params.routeMode === 'cached-offline') {
    return {
      status: 'offline-unavailable',
      reason: 'FIND_TIME_CACHED_OFFLINE',
      message:
        'This calendar reopened from cached continuity, but mobile find-time stays live-only instead of replaying stale answers.',
      routeMode: params.routeMode,
      networkConnected: params.network?.connected ?? null,
      networkSource: params.network?.source ?? 'none',
      denialPhase: 'continuity',
      calendarId,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0,
      truncated: false,
      durationMinutes: null,
      rangeStartAt: null,
      rangeEndAt: null
    } satisfies MobileFindTimeResolvedState;
  }

  if (params.network && !params.network.connected) {
    return {
      status: 'offline-unavailable',
      reason: 'FIND_TIME_OFFLINE',
      message: 'The device is offline, so mobile find-time stays live-only until trusted connectivity returns.',
      routeMode: params.routeMode,
      networkConnected: false,
      networkSource: params.network.source,
      denialPhase: 'connectivity',
      calendarId,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0,
      truncated: false,
      durationMinutes: null,
      rangeStartAt: null,
      rangeEndAt: null
    } satisfies MobileFindTimeResolvedState;
  }

  if (!params.search) {
    return null;
  }

  return {
    status: params.search.status,
    reason: params.search.reason,
    message: params.search.message,
    routeMode: params.routeMode,
    networkConnected: params.network?.connected ?? null,
    networkSource: params.network?.source ?? 'none',
    denialPhase: null,
    calendarId: params.search.calendarId,
    topPicks: params.search.topPicks,
    browseWindows: params.search.browseWindows,
    windows: params.search.windows,
    topPickCount: params.search.topPickCount,
    browseCount: params.search.browseWindows.length,
    totalWindows: params.search.totalWindows,
    truncated: params.search.truncated,
    durationMinutes: params.search.durationMinutes,
    rangeStartAt: params.search.range.startAt,
    rangeEndAt: params.search.range.endAt
  } satisfies MobileFindTimeResolvedState;
}

export function partitionMobileFindTimeWindows(windows: FindTimeWindow[]) {
  const topPicks: FindTimeWindow[] = [];
  const browseWindows: FindTimeWindow[] = [];

  for (const window of windows) {
    if (window.topPick) {
      topPicks.push(window);
      continue;
    }

    browseWindows.push(window);
  }

  return {
    topPicks,
    browseWindows,
    topPickCount: topPicks.length,
    browseCount: browseWindows.length,
    totalWindows: windows.length
  };
}
