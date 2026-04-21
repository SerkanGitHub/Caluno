import { g as get, w as writable } from "./index.js";
import "@supabase/ssr";
function getSupabaseBrowserClient() {
  {
    throw new Error("getSupabaseBrowserClient() must only run in the browser.");
  }
}
const DEFAULT_SIGNED_OUT_DETAIL = "Sign in with your Caluno account before opening protected groups or calendars.";
function resolveDisplayName(user) {
  if (!user) {
    return null;
  }
  const metadata = user.user_metadata ?? {};
  const displayName = typeof metadata.display_name === "string" ? metadata.display_name.trim() : typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  return displayName || user.email?.split("@")[0] || "Caluno member";
}
function withTimeout(promise, timeoutMs, error) {
  let timer;
  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(error), timeoutMs);
    })
  ]);
}
function isMissingEnvError(error) {
  return error instanceof Error && error.message.includes("Missing required public Supabase env");
}
function isTimeoutError(error) {
  return error instanceof Error && /timeout/i.test(error.message);
}
function createSignedOutState(detail = DEFAULT_SIGNED_OUT_DETAIL) {
  return {
    phase: "signed-out",
    failurePhase: null,
    reasonCode: null,
    detail,
    retryable: false,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
function createBootstrappingState() {
  return {
    phase: "bootstrapping",
    failurePhase: "bootstrap",
    reasonCode: null,
    detail: "Validating any saved Supabase session before opening protected routes.",
    retryable: true,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
function createAuthenticatedState(session, user, now) {
  return {
    phase: "authenticated",
    failurePhase: null,
    reasonCode: null,
    detail: "This device holds a trusted session and can open protected mobile routes.",
    retryable: false,
    session,
    user,
    displayName: resolveDisplayName(user),
    lastValidatedAt: now.toISOString()
  };
}
function createInvalidSessionState() {
  return {
    phase: "invalid-session",
    failurePhase: "bootstrap",
    reasonCode: "INVALID_SESSION",
    detail: "The saved session failed trusted verification and was cleared locally before the mobile shell opened.",
    retryable: true,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
function createErrorState(params) {
  return {
    phase: "error",
    failurePhase: params.failurePhase,
    reasonCode: params.reasonCode,
    detail: params.detail,
    retryable: params.retryable,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
async function signOutLocally(client) {
  try {
    await client.auth.signOut();
  } catch {
  }
}
function createMobileSessionStore(dependencies = {}) {
  const timeoutMs = dependencies.timeoutMs ?? 5e3;
  const now = dependencies.now ?? (() => /* @__PURE__ */ new Date());
  const clientFactory = dependencies.clientFactory ?? getSupabaseBrowserClient;
  const state = writable(createBootstrappingState());
  let client = null;
  let bootstrapPromise = null;
  let bootstrapped = false;
  let subscriptionCleanup = null;
  function setState(next) {
    state.set(next);
    return next;
  }
  function snapshot() {
    return get(state);
  }
  function getClient() {
    client ??= clientFactory();
    return client;
  }
  function ensureAuthListener() {
    if (subscriptionCleanup) {
      return;
    }
    const authClient = getClient();
    const {
      data: { subscription }
    } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setState(createSignedOutState("The session was cleared on this device. Sign in again to reopen protected routes."));
        return;
      }
      if ((event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session && snapshot().phase === "authenticated") {
        const currentUser = snapshot().user ?? session.user ?? null;
        if (currentUser) {
          setState(createAuthenticatedState(session, currentUser, now()));
        }
      }
    });
    subscriptionCleanup = () => {
      subscription.unsubscribe();
      subscriptionCleanup = null;
    };
  }
  async function bootstrap(options = {}) {
    if (bootstrapPromise) {
      return bootstrapPromise;
    }
    if (bootstrapped && !options.force) {
      return snapshot();
    }
    const task = (async () => {
      setState(createBootstrappingState());
      let authClient;
      try {
        authClient = getClient();
        ensureAuthListener();
      } catch (error) {
        bootstrapped = true;
        return setState(
          createErrorState({
            failurePhase: "config",
            reasonCode: "SUPABASE_ENV_MISSING",
            detail: error instanceof Error ? error.message : "Missing public Supabase configuration prevented mobile auth bootstrap.",
            retryable: false
          })
        );
      }
      try {
        const {
          data: { session }
        } = await withTimeout(
          authClient.auth.getSession(),
          timeoutMs,
          new Error("AUTH_BOOTSTRAP_TIMEOUT")
        );
        if (!session) {
          bootstrapped = true;
          return setState(createSignedOutState());
        }
        const {
          data: { user },
          error
        } = await withTimeout(
          authClient.auth.getUser(),
          timeoutMs,
          new Error("AUTH_BOOTSTRAP_TIMEOUT")
        );
        if (error || !user?.id || !user.email) {
          await signOutLocally(authClient);
          bootstrapped = true;
          return setState(createInvalidSessionState());
        }
        bootstrapped = true;
        return setState(createAuthenticatedState(session, user, now()));
      } catch (error) {
        bootstrapped = true;
        if (isTimeoutError(error)) {
          return setState(
            createErrorState({
              failurePhase: "bootstrap",
              reasonCode: "AUTH_BOOTSTRAP_TIMEOUT",
              detail: "The saved session could not be revalidated in time, so the protected shell stayed closed. Retry when the auth service responds again.",
              retryable: true
            })
          );
        }
        if (isMissingEnvError(error)) {
          return setState(
            createErrorState({
              failurePhase: "config",
              reasonCode: "SUPABASE_ENV_MISSING",
              detail: error instanceof Error ? error.message : "Missing public Supabase configuration prevented mobile auth bootstrap.",
              retryable: false
            })
          );
        }
        return setState(
          createErrorState({
            failurePhase: "bootstrap",
            reasonCode: "AUTH_BOOTSTRAP_FAILED",
            detail: error instanceof Error ? error.message : "The saved session could not be verified, so Caluno kept the mobile shell closed.",
            retryable: true
          })
        );
      }
    })();
    bootstrapPromise = task.finally(() => {
      bootstrapPromise = null;
    });
    return bootstrapPromise;
  }
  async function signIn(credentials) {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;
    if (!email || !password) {
      return setState(
        createErrorState({
          failurePhase: "sign-in",
          reasonCode: "SIGN_IN_FAILED",
          detail: "Enter both email and password before requesting a trusted session.",
          retryable: true
        })
      );
    }
    let authClient;
    try {
      authClient = getClient();
      ensureAuthListener();
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: "config",
          reasonCode: "SUPABASE_ENV_MISSING",
          detail: error instanceof Error ? error.message : "Missing public Supabase configuration prevented sign-in from starting.",
          retryable: false
        })
      );
    }
    setState(createBootstrappingState());
    try {
      const { data, error } = await withTimeout(
        authClient.auth.signInWithPassword({ email, password }),
        timeoutMs,
        new Error("SIGN_IN_TIMEOUT")
      );
      if (error) {
        return setState(
          createErrorState({
            failurePhase: "sign-in",
            reasonCode: /timeout/i.test(error.message) ? "SIGN_IN_TIMEOUT" : "SIGN_IN_FAILED",
            detail: /timeout/i.test(error.message) ? "The sign-in request timed out before the session could be verified. Retry in a moment." : "The supplied credentials were rejected. Check the email and password, then try again.",
            retryable: true
          })
        );
      }
      if (!data.session || !data.user) {
        await signOutLocally(authClient);
        return setState(
          createErrorState({
            failurePhase: "sign-in",
            reasonCode: "CALLBACK_RESULT_INVALID",
            detail: "The auth service returned an incomplete session payload, so the mobile shell stayed signed out.",
            retryable: true
          })
        );
      }
      bootstrapped = true;
      return setState(createAuthenticatedState(data.session, data.user, now()));
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: "sign-in",
          reasonCode: isTimeoutError(error) ? "SIGN_IN_TIMEOUT" : "SIGN_IN_FAILED",
          detail: isTimeoutError(error) ? "The sign-in request timed out before the session could be verified. Retry in a moment." : error instanceof Error ? error.message : "The sign-in request failed before Caluno could establish a trusted session.",
          retryable: true
        })
      );
    }
  }
  async function signOut() {
    let authClient;
    try {
      authClient = getClient();
    } catch {
      return setState(createSignedOutState("The local session state is already cleared on this device."));
    }
    setState(createBootstrappingState());
    try {
      const { error } = await withTimeout(
        authClient.auth.signOut(),
        timeoutMs,
        new Error("LOGOUT_TIMEOUT")
      );
      if (error) {
        return setState(
          createErrorState({
            failurePhase: "sign-out",
            reasonCode: /timeout/i.test(error.message) ? "LOGOUT_TIMEOUT" : "LOGOUT_FAILED",
            detail: /timeout/i.test(error.message) ? "Sign-out timed out before the session could be cleared. Retry before reusing this device." : "Sign-out could not be confirmed. Retry before handing this device to someone else.",
            retryable: true
          })
        );
      }
      return setState(createSignedOutState("You are safely signed out on this device."));
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: "sign-out",
          reasonCode: isTimeoutError(error) ? "LOGOUT_TIMEOUT" : "LOGOUT_FAILED",
          detail: isTimeoutError(error) ? "Sign-out timed out before the session could be cleared. Retry before reusing this device." : error instanceof Error ? error.message : "Sign-out could not be confirmed for this device.",
          retryable: true
        })
      );
    }
  }
  function reset(detail = DEFAULT_SIGNED_OUT_DETAIL) {
    return setState(createSignedOutState(detail));
  }
  function destroy() {
    subscriptionCleanup?.();
    client = null;
    bootstrapPromise = null;
    bootstrapped = false;
    setState(createBootstrappingState());
  }
  return {
    subscribe: state.subscribe,
    bootstrap,
    signIn,
    signOut,
    reset,
    snapshot,
    destroy
  };
}
const mobileSession = createMobileSessionStore();
function getMobileSessionSnapshot() {
  return mobileSession.snapshot();
}
export {
  getMobileSessionSnapshot as g,
  mobileSession as m
};
