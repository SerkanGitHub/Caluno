import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { bootstrapMobileSession, getMobileSessionSnapshot } from '$lib/auth/mobile-session';
import type { LayoutLoad } from './$types';

function normalizeInternalPath(input: string | null | undefined, fallback = '/groups'): string {
  if (!input) {
    return fallback;
  }

  const normalized = input.trim();

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return fallback;
  }

  return normalized;
}

function buildSignInTarget(pathname: string, search: string, reason: 'AUTH_REQUIRED' | 'INVALID_SESSION') {
  const returnTo = normalizeInternalPath(`${pathname}${search}`, '/groups');
  const flow = reason === 'INVALID_SESSION' ? 'invalid-session' : 'auth-required';
  return `/signin?flow=${flow}&reason=${reason}&returnTo=${encodeURIComponent(returnTo)}`;
}

export const load: LayoutLoad = async ({ depends, route, url }) => {
  depends('mobile:auth');

  const authState = browser ? await bootstrapMobileSession() : getMobileSessionSnapshot();
  const routeId = route.id ?? '';
  const isProtectedRoute = routeId.startsWith('/groups') || routeId.startsWith('/calendars');
  const isSignInRoute = routeId === '/signin';

  if (browser && isProtectedRoute && authState.phase !== 'authenticated') {
    throw redirect(
      303,
      buildSignInTarget(url.pathname, url.search, authState.phase === 'invalid-session' ? 'INVALID_SESSION' : 'AUTH_REQUIRED')
    );
  }

  if (browser && isSignInRoute && authState.phase === 'authenticated') {
    throw redirect(303, normalizeInternalPath(url.searchParams.get('returnTo'), '/groups'));
  }

  return {
    authState
  };
};
