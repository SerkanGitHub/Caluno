const FLOW_REASON_COPY = {
  CALLBACK_ERROR: "The callback response could not be trusted. Start a fresh sign-in to restore a verified session.",
  CALLBACK_CODE_MISSING: "The callback returned without a usable authorization code. Start a fresh sign-in and try again.",
  CALLBACK_RESULT_INVALID: "The callback response was malformed, so the app refused to assume you were signed in.",
  CALLBACK_TIMEOUT: "The callback took too long to resolve. Retry sign-in when the auth provider is responsive again.",
  LOGOUT_FAILED: "Sign-out could not be confirmed. Retry the logout request before handing this browser to someone else.",
  LOGOUT_TIMEOUT: "Sign-out timed out before the session could be cleared. Retry once the auth service is responsive.",
  INVALID_SESSION: "The saved browser session failed trusted verification and was cleared. Sign in again to continue.",
  AUTH_REQUIRED: "This route is protected. Sign in with a trusted account before opening group or calendar pages.",
  AUTH_CALLBACK_ERROR: "The auth provider returned an error before the session could be established.",
  SIGN_IN_FAILED: "The supplied credentials were rejected. Check the email and password, then try again.",
  SIGN_IN_TIMEOUT: "The sign-in request timed out before the session could be verified. Retry in a moment."
};
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
function extractReasonCode(input, knownCodes, fallback) {
  const source = input?.toUpperCase() ?? "";
  return knownCodes.find((code) => source.includes(code)) ?? fallback;
}
function resolveAuthSurface(searchParams) {
  const flow = searchParams.get("flow");
  const reasonCode = searchParams.get("reason")?.trim().toUpperCase() ?? null;
  switch (flow) {
    case "signed-out":
      return {
        state: "signed-out",
        tone: "neutral",
        eyebrow: "Session closed",
        title: "You are safely signed out.",
        detail: "Return when you are ready to open a trusted group workspace again.",
        reasonCode
      };
    case "invalid-session":
      return {
        state: "invalid-session",
        tone: "warning",
        eyebrow: "Session reset",
        title: "We refused an untrusted browser session.",
        detail: FLOW_REASON_COPY.INVALID_SESSION,
        reasonCode: reasonCode ?? "INVALID_SESSION"
      };
    case "callback-error":
      return {
        state: "callback-error",
        tone: "danger",
        eyebrow: "Callback failed",
        title: "The sign-in handshake did not complete cleanly.",
        detail: FLOW_REASON_COPY[reasonCode ?? ""] ?? "The auth callback could not be completed safely. Start a fresh sign-in.",
        reasonCode: reasonCode ?? "CALLBACK_ERROR"
      };
    case "logout-error":
      return {
        state: "logout-error",
        tone: "danger",
        eyebrow: "Sign-out needs attention",
        title: "We could not confirm sign-out.",
        detail: FLOW_REASON_COPY[reasonCode ?? ""] ?? "The auth service did not confirm sign-out. Retry before reusing this browser.",
        reasonCode: reasonCode ?? "LOGOUT_FAILED"
      };
    case "auth-required":
      return {
        state: "auth-required",
        tone: "warning",
        eyebrow: "Protected route",
        title: "Sign in to open your permitted calendars.",
        detail: FLOW_REASON_COPY[reasonCode ?? ""] ?? FLOW_REASON_COPY.AUTH_REQUIRED,
        reasonCode: reasonCode ?? "AUTH_REQUIRED"
      };
    default:
      return {
        state: "ready",
        tone: "neutral",
        eyebrow: "Trusted entrypoint",
        title: "Sign in to load only the groups and calendars you are allowed to open.",
        detail: "Caluno resolves membership and calendar access on the server first, then renders only the workspace scope your session can prove.",
        reasonCode
      };
  }
}
export {
  extractReasonCode as e,
  normalizeInternalPath as n,
  resolveAuthSurface as r
};
