import { browser } from '$app/environment';
import type { Session, User } from '@supabase/supabase-js';
import {
  readCachedAppShellSnapshot,
  writeCachedAppShellSnapshot,
  type CachedAppShellLookup,
  type CachedAppShellSnapshot
} from '$lib/offline/app-shell-cache';
import {
  buildSupabaseSessionContinuity
} from '$lib/supabase/client';
import type { AppCalendar, AppGroup, AppMembership, ViewerSummary } from '$lib/server/app-shell';
import type { LayoutLoad } from './$types';

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

function persistTrustedAppShellSnapshot(params: {
  appShell: ProtectedAppShellData | null | undefined;
  session: Session | null | undefined;
  user: User | null | undefined;
}) {
  if (!params.appShell) {
    return;
  }

  const sessionContinuity = buildSupabaseSessionContinuity({
    session: params.session ?? null,
    user: params.user ?? null
  });

  if (!sessionContinuity) {
    return;
  }

  try {
    writeCachedAppShellSnapshot({
      viewer: params.appShell.viewer,
      session: sessionContinuity,
      groups: params.appShell.groups,
      calendars: params.appShell.calendars,
      primaryCalendar: params.appShell.primaryCalendar,
      onboardingState: params.appShell.onboardingState
    });
  } catch {
    // fail closed: keep the trusted online shell and leave offline continuity unavailable
  }
}

export const load: LayoutLoad = async ({ data, parent }) => {
  const parentData = await parent();
  const isOnline = !browser || navigator.onLine;

  if (isOnline) {
    if (browser) {
      persistTrustedAppShellSnapshot({
        appShell: data.appShell,
        session: parentData.session,
        user: parentData.user
      });
    }

    return resolveProtectedShellRouteData({
      isOnline: true,
      serverAppShell: data.appShell
    });
  }

  return resolveProtectedShellRouteData({
    isOnline: false,
    cachedLookup: readCachedAppShellSnapshot()
  });
};
