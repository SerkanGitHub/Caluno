import type { Session, User } from '@supabase/supabase-js';
import { get, writable, type Readable } from 'svelte/store';
import { clearMobileCachedAppShellSnapshot } from '$lib/continuity/mobile-app-shell-cache';
import { clearMobileContinuityRepository } from '$lib/offline/repository';
import { getSupabaseBrowserClient, type MobileSupabaseAuthClient } from '$lib/supabase/client';

export type MobileAuthPhase = 'bootstrapping' | 'signed-out' | 'authenticated' | 'invalid-session' | 'error';
export type MobileAuthFailurePhase = 'config' | 'bootstrap' | 'sign-in' | 'sign-out' | null;
export type MobileAuthReasonCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_SESSION'
  | 'SUPABASE_ENV_MISSING'
  | 'AUTH_BOOTSTRAP_TIMEOUT'
  | 'AUTH_BOOTSTRAP_FAILED'
  | 'SIGN_IN_FAILED'
  | 'SIGN_IN_TIMEOUT'
  | 'CALLBACK_RESULT_INVALID'
  | 'LOGOUT_FAILED'
  | 'LOGOUT_TIMEOUT'
  | null;

export type MobileAuthState = {
  phase: MobileAuthPhase;
  failurePhase: MobileAuthFailurePhase;
  reasonCode: MobileAuthReasonCode;
  detail: string;
  retryable: boolean;
  session: Session | null;
  user: User | null;
  displayName: string | null;
  lastValidatedAt: string | null;
};

export type MobileSessionStore = Readable<MobileAuthState> & {
  bootstrap: (options?: { force?: boolean }) => Promise<MobileAuthState>;
  signIn: (credentials: { email: string; password: string }) => Promise<MobileAuthState>;
  signOut: () => Promise<MobileAuthState>;
  reset: (detail?: string) => MobileAuthState;
  snapshot: () => MobileAuthState;
  destroy: () => void;
};

type StoreDependencies = {
  clientFactory?: () => MobileSupabaseAuthClient;
  timeoutMs?: number;
  now?: () => Date;
  clearContinuity?: () => Promise<void>;
};

const DEFAULT_SIGNED_OUT_DETAIL = 'Sign in with your Caluno account before opening protected groups or calendars.';

function resolveDisplayName(user: Pick<User, 'email' | 'user_metadata'> | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  const displayName =
    typeof metadata.display_name === 'string'
      ? metadata.display_name.trim()
      : typeof metadata.full_name === 'string'
        ? metadata.full_name.trim()
        : '';

  return displayName || user.email?.split('@')[0] || 'Caluno member';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, error: Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(error), timeoutMs);
    })
  ]);
}

function isMissingEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Missing required public Supabase env');
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && /timeout/i.test(error.message);
}

function createSignedOutState(detail = DEFAULT_SIGNED_OUT_DETAIL): MobileAuthState {
  return {
    phase: 'signed-out',
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

function createBootstrappingState(): MobileAuthState {
  return {
    phase: 'bootstrapping',
    failurePhase: 'bootstrap',
    reasonCode: null,
    detail: 'Validating any saved Supabase session before opening protected routes.',
    retryable: true,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}

function createAuthenticatedState(
  session: Session,
  user: User,
  now: Date
): MobileAuthState {
  return {
    phase: 'authenticated',
    failurePhase: null,
    reasonCode: null,
    detail: 'This device holds a trusted session and can open protected mobile routes.',
    retryable: false,
    session,
    user,
    displayName: resolveDisplayName(user),
    lastValidatedAt: now.toISOString()
  };
}

function createInvalidSessionState(): MobileAuthState {
  return {
    phase: 'invalid-session',
    failurePhase: 'bootstrap',
    reasonCode: 'INVALID_SESSION',
    detail: 'The saved session failed trusted verification and was cleared locally before the mobile shell opened.',
    retryable: true,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}

function createErrorState(params: {
  failurePhase: Exclude<MobileAuthFailurePhase, null>;
  reasonCode: Exclude<MobileAuthReasonCode, null>;
  detail: string;
  retryable: boolean;
}): MobileAuthState {
  return {
    phase: 'error',
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

async function clearMobileContinuityState() {
  await Promise.all([clearMobileCachedAppShellSnapshot(), clearMobileContinuityRepository()]);
}

async function signOutLocally(client: MobileSupabaseAuthClient, clearContinuity: () => Promise<void>) {
  await clearContinuity().catch(() => {
    // fail closed: stale continuity must not survive invalid-session or sign-out handling
  });

  try {
    await client.auth.signOut();
  } catch {
    // fail closed: keep the protected shell closed even if local sign-out throws
  }
}

export function createMobileSessionStore(dependencies: StoreDependencies = {}): MobileSessionStore {
  const timeoutMs = dependencies.timeoutMs ?? 5_000;
  const now = dependencies.now ?? (() => new Date());
  const clientFactory = dependencies.clientFactory ?? getSupabaseBrowserClient;
  const clearContinuity = dependencies.clearContinuity ?? clearMobileContinuityState;
  const state = writable<MobileAuthState>(createBootstrappingState());

  let client: MobileSupabaseAuthClient | null = null;
  let bootstrapPromise: Promise<MobileAuthState> | null = null;
  let bootstrapped = false;
  let subscriptionCleanup: (() => void) | null = null;

  function setState(next: MobileAuthState) {
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
      if (event === 'SIGNED_OUT') {
        void clearContinuity();
        setState(createSignedOutState('The session was cleared on this device. Sign in again to reopen protected routes.'));
        return;
      }

      if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session && snapshot().phase === 'authenticated') {
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

  async function bootstrap(options: { force?: boolean } = {}) {
    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    if (bootstrapped && !options.force) {
      return snapshot();
    }

    const task = (async () => {
      setState(createBootstrappingState());

      let authClient: MobileSupabaseAuthClient;

      try {
        authClient = getClient();
        ensureAuthListener();
      } catch (error) {
        bootstrapped = true;
        return setState(
          createErrorState({
            failurePhase: 'config',
            reasonCode: 'SUPABASE_ENV_MISSING',
            detail:
              error instanceof Error
                ? error.message
                : 'Missing public Supabase configuration prevented mobile auth bootstrap.',
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
          new Error('AUTH_BOOTSTRAP_TIMEOUT')
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
          new Error('AUTH_BOOTSTRAP_TIMEOUT')
        );

        if (error || !user?.id || !user.email) {
          await signOutLocally(authClient, clearContinuity);
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
              failurePhase: 'bootstrap',
              reasonCode: 'AUTH_BOOTSTRAP_TIMEOUT',
              detail:
                'The saved session could not be revalidated in time, so the protected shell stayed closed. Retry when the auth service responds again.',
              retryable: true
            })
          );
        }

        if (isMissingEnvError(error)) {
          return setState(
            createErrorState({
              failurePhase: 'config',
              reasonCode: 'SUPABASE_ENV_MISSING',
              detail: error instanceof Error ? error.message : 'Missing public Supabase configuration prevented mobile auth bootstrap.',
              retryable: false
            })
          );
        }

        return setState(
          createErrorState({
            failurePhase: 'bootstrap',
            reasonCode: 'AUTH_BOOTSTRAP_FAILED',
            detail:
              error instanceof Error
                ? error.message
                : 'The saved session could not be verified, so Caluno kept the mobile shell closed.',
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

  async function signIn(credentials: { email: string; password: string }) {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email || !password) {
      return setState(
        createErrorState({
          failurePhase: 'sign-in',
          reasonCode: 'SIGN_IN_FAILED',
          detail: 'Enter both email and password before requesting a trusted session.',
          retryable: true
        })
      );
    }

    let authClient: MobileSupabaseAuthClient;

    try {
      authClient = getClient();
      ensureAuthListener();
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: 'config',
          reasonCode: 'SUPABASE_ENV_MISSING',
          detail:
            error instanceof Error
              ? error.message
              : 'Missing public Supabase configuration prevented sign-in from starting.',
          retryable: false
        })
      );
    }

    setState(createBootstrappingState());

    try {
      const { data, error } = await withTimeout(
        authClient.auth.signInWithPassword({ email, password }),
        timeoutMs,
        new Error('SIGN_IN_TIMEOUT')
      );

      if (error) {
        return setState(
          createErrorState({
            failurePhase: 'sign-in',
            reasonCode: /timeout/i.test(error.message) ? 'SIGN_IN_TIMEOUT' : 'SIGN_IN_FAILED',
            detail: /timeout/i.test(error.message)
              ? 'The sign-in request timed out before the session could be verified. Retry in a moment.'
              : 'The supplied credentials were rejected. Check the email and password, then try again.',
            retryable: true
          })
        );
      }

      if (!data.session || !data.user) {
        await signOutLocally(authClient, clearContinuity);

        return setState(
          createErrorState({
            failurePhase: 'sign-in',
            reasonCode: 'CALLBACK_RESULT_INVALID',
            detail: 'The auth service returned an incomplete session payload, so the mobile shell stayed signed out.',
            retryable: true
          })
        );
      }

      bootstrapped = true;
      return setState(createAuthenticatedState(data.session, data.user, now()));
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: 'sign-in',
          reasonCode: isTimeoutError(error) ? 'SIGN_IN_TIMEOUT' : 'SIGN_IN_FAILED',
          detail: isTimeoutError(error)
            ? 'The sign-in request timed out before the session could be verified. Retry in a moment.'
            : error instanceof Error
              ? error.message
              : 'The sign-in request failed before Caluno could establish a trusted session.',
          retryable: true
        })
      );
    }
  }

  async function signOut() {
    let authClient: MobileSupabaseAuthClient;

    try {
      authClient = getClient();
    } catch {
      await clearContinuity().catch(() => {
        // fail closed even if continuity clear cannot be confirmed
      });
      return setState(createSignedOutState('The local session state is already cleared on this device.'));
    }

    setState(createBootstrappingState());

    try {
      const { error } = await withTimeout(
        authClient.auth.signOut(),
        timeoutMs,
        new Error('LOGOUT_TIMEOUT')
      );

      await clearContinuity().catch(() => {
        // fail closed even if continuity clear cannot be confirmed
      });

      if (error) {
        return setState(
          createErrorState({
            failurePhase: 'sign-out',
            reasonCode: /timeout/i.test(error.message) ? 'LOGOUT_TIMEOUT' : 'LOGOUT_FAILED',
            detail: /timeout/i.test(error.message)
              ? 'Sign-out timed out before the session could be cleared. Retry before reusing this device.'
              : 'Sign-out could not be confirmed. Retry before handing this device to someone else.',
            retryable: true
          })
        );
      }

      return setState(createSignedOutState('You are safely signed out on this device.'));
    } catch (error) {
      await clearContinuity().catch(() => {
        // fail closed even if continuity clear cannot be confirmed
      });
      return setState(
        createErrorState({
          failurePhase: 'sign-out',
          reasonCode: isTimeoutError(error) ? 'LOGOUT_TIMEOUT' : 'LOGOUT_FAILED',
          detail: isTimeoutError(error)
            ? 'Sign-out timed out before the session could be cleared. Retry before reusing this device.'
            : error instanceof Error
              ? error.message
              : 'Sign-out could not be confirmed for this device.',
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

export const mobileSession = createMobileSessionStore();

export function bootstrapMobileSession(options?: { force?: boolean }) {
  return mobileSession.bootstrap(options);
}

export function getMobileSessionSnapshot() {
  return mobileSession.snapshot();
}
