// @ts-nocheck
import { browser } from '$app/environment';
import type { Session, User } from '@supabase/supabase-js';
import { readCachedAppShellSnapshot, writeCachedAppShellSnapshot } from '$lib/offline/app-shell-cache';
import {
  resolveProtectedShellRouteData,
  type ProtectedAppShellData
} from '$lib/offline/protected-routes';
import { buildSupabaseSessionContinuity } from '$lib/supabase/client';
import type { LayoutLoad } from './$types';

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

export const load = async ({ data, parent }: Parameters<LayoutLoad>[0]) => {
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
