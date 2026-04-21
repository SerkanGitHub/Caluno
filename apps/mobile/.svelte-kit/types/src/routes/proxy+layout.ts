// @ts-nocheck
import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { bootstrapMobileSession, getMobileSessionSnapshot } from '$lib/auth/mobile-session';
import {
  normalizeInternalPath,
  resolveMobileProtectedEntryState
} from '$lib/shell/load-app-shell';
import type { LayoutLoad } from './$types';

export const load = async ({ depends, route, url }: Parameters<LayoutLoad>[0]) => {
  depends('mobile:auth');

  const authState = browser ? await bootstrapMobileSession() : getMobileSessionSnapshot();
  const protectedEntry = await resolveMobileProtectedEntryState({
    pathname: url.pathname,
    search: url.search,
    authPhase: authState.phase,
    authReasonCode: authState.reasonCode,
    now: new Date()
  });
  const routeId = route.id ?? '';
  const isSignInRoute = routeId === '/signin';

  if (browser && isSignInRoute && authState.phase === 'authenticated') {
    throw redirect(303, normalizeInternalPath(url.searchParams.get('returnTo'), '/groups'));
  }

  return {
    authState,
    protectedEntry
  };
};
