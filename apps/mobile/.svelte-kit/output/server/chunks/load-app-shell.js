import { r as readMobileCachedAppShellSnapshot, h as hasSyncedCalendarContinuity } from "./mobile-session.js";
import "@supabase/ssr";
function primaryCalendarLandingHref(appShell) {
  return appShell.primaryCalendar ? `/calendars/${appShell.primaryCalendar.id}` : null;
}
async function resolveMobileProtectedEntryState(params) {
  const isProtectedRoute = isProtectedPath(params.pathname);
  const requestedCalendarId = extractRequestedCalendarId(params.pathname);
  const signInHref = isProtectedRoute ? buildSignInTarget(
    params.pathname,
    params.search ?? "",
    params.authPhase === "invalid-session" ? "INVALID_SESSION" : "AUTH_REQUIRED"
  ) : null;
  if (!isProtectedRoute) {
    return {
      isProtectedRoute,
      routeMode: "public",
      snapshotOrigin: "none",
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: null,
      continuityReason: null,
      continuityDetail: null,
      lastTrustedRefreshAt: null,
      signInHref
    };
  }
  if (params.authPhase === "authenticated") {
    return {
      isProtectedRoute,
      routeMode: "trusted-online",
      snapshotOrigin: "trusted-online",
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: null,
      continuityReason: null,
      continuityDetail: null,
      lastTrustedRefreshAt: null,
      signInHref: null
    };
  }
  if (!canUseCachedContinuity(params.authPhase, params.authReasonCode ?? null)) {
    return {
      isProtectedRoute,
      routeMode: "denied",
      snapshotOrigin: "none",
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: params.authReasonCode ?? (params.authPhase === "invalid-session" ? "INVALID_SESSION" : "AUTH_REQUIRED"),
      continuityReason: null,
      continuityDetail: describeProtectedEntryDenial(params.authPhase, params.authReasonCode ?? null),
      lastTrustedRefreshAt: null,
      signInHref
    };
  }
  const lookup = await readMobileCachedAppShellSnapshot({
    calendarId: requestedCalendarId,
    now: params.now,
    storage: params.continuityStorage,
    timeoutMs: params.continuityStorageTimeoutMs
  });
  if (lookup.status !== "available") {
    return {
      isProtectedRoute,
      routeMode: "denied",
      snapshotOrigin: "none",
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: lookup.reason,
      continuityReason: lookup.reason,
      continuityDetail: lookup.detail,
      lastTrustedRefreshAt: null,
      signInHref
    };
  }
  if (requestedCalendarId) {
    const continuity = await hasSyncedCalendarContinuity(
      {
        userId: lookup.snapshot.viewer.id,
        calendarId: requestedCalendarId
      },
      {
        storage: params.offlineStorage,
        timeoutMs: params.offlineStorageTimeoutMs
      }
    );
    if (!continuity.ok) {
      return {
        isProtectedRoute,
        routeMode: "denied",
        snapshotOrigin: "none",
        requestedCalendarId,
        cachedSnapshot: null,
        denialReasonCode: "storage-unavailable",
        continuityReason: "storage-unavailable",
        continuityDetail: continuity.detail,
        lastTrustedRefreshAt: null,
        signInHref
      };
    }
    if (!continuity.hasWeek) {
      return {
        isProtectedRoute,
        routeMode: "denied",
        snapshotOrigin: "none",
        requestedCalendarId,
        cachedSnapshot: null,
        denialReasonCode: "calendar-not-synced",
        continuityReason: "calendar-not-synced",
        continuityDetail: "No previously synced week metadata exists for that calendar on this device, so cached continuity failed closed.",
        lastTrustedRefreshAt: null,
        signInHref
      };
    }
  }
  return {
    isProtectedRoute,
    routeMode: "cached-offline",
    snapshotOrigin: "cached-offline",
    requestedCalendarId,
    cachedSnapshot: lookup.snapshot,
    denialReasonCode: null,
    continuityReason: null,
    continuityDetail: null,
    lastTrustedRefreshAt: lookup.snapshot.refreshedAt,
    signInHref: null
  };
}
function extractRequestedCalendarId(pathname) {
  const match = pathname.match(/^\/calendars\/([^/?#]+)/);
  return match?.[1] ?? null;
}
function isProtectedPath(pathname) {
  return pathname === "/groups" || pathname.startsWith("/groups/") || pathname === "/calendars" || pathname.startsWith("/calendars/");
}
function normalizeInternalPath(input, fallback = "/groups") {
  if (!input) {
    return fallback;
  }
  const normalized = input.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }
  return normalized;
}
function buildSignInTarget(pathname, search, reason) {
  const returnTo = normalizeInternalPath(`${pathname}${search}`, "/groups");
  const flow = reason === "INVALID_SESSION" ? "invalid-session" : "auth-required";
  return `/signin?flow=${flow}&reason=${reason}&returnTo=${encodeURIComponent(returnTo)}`;
}
function canUseCachedContinuity(authPhase, authReasonCode) {
  if (authPhase === "signed-out") {
    return true;
  }
  if (authPhase !== "error") {
    return false;
  }
  return authReasonCode === "AUTH_BOOTSTRAP_TIMEOUT" || authReasonCode === "AUTH_BOOTSTRAP_FAILED";
}
function describeProtectedEntryDenial(authPhase, authReasonCode) {
  if (authPhase === "invalid-session") {
    return "The saved session failed trusted verification and continuity was cleared, so the protected route stayed closed.";
  }
  switch (authReasonCode) {
    case "SUPABASE_ENV_MISSING":
      return "Public Supabase configuration is missing, so the protected route stayed closed instead of guessing cached scope.";
    case "AUTH_BOOTSTRAP_TIMEOUT":
      return "Trusted auth verification timed out before continuity eligibility could be confirmed.";
    case "AUTH_BOOTSTRAP_FAILED":
      return "Trusted auth verification failed before continuity eligibility could be confirmed.";
    default:
      return "Sign in with your Caluno account before opening protected groups or calendars.";
  }
}
export {
  primaryCalendarLandingHref as p,
  resolveMobileProtectedEntryState as r
};
