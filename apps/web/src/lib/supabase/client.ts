import { browser } from '$app/environment';
import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  readCachedAppShellSnapshot,
  type CachedAppShellUnavailableReason,
  type CachedSessionContinuity,
  type StorageLike
} from '$lib/offline/app-shell-cache';
import { readSupabasePublicEnv } from './config';

let browserClient: SupabaseClient | undefined;
let browserSessionHydrationPromise: Promise<void> | null = null;

function isSupabaseBrowserAuthBootstrapError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('initializePromise');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BrowserSessionContinuityLookup =
  | {
      status: 'available';
      session: CachedSessionContinuity;
    }
  | {
      status: 'unavailable';
      reason: CachedAppShellUnavailableReason;
      detail: string;
    };

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, publishableKey } = readSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browser) {
    throw new Error('getSupabaseBrowserClient() must only run in the browser.');
  }

  browserClient ??= createSupabaseBrowserClient();
  return browserClient;
}

export async function readSupabaseBrowserSessionWithRetry(
  client: SupabaseClient = getSupabaseBrowserClient(),
  params: { attempts?: number; delayMs?: number } = {}
): Promise<Session | null> {
  const attempts = params.attempts ?? 6;
  const delayMs = params.delayMs ?? 25;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const {
        data: { session }
      } = await client.auth.getSession();
      return session;
    } catch (error) {
      if (!isSupabaseBrowserAuthBootstrapError(error) || attempt === attempts) {
        throw error;
      }

      await delay(delayMs * attempt);
    }
  }

  return null;
}

export async function hydrateSupabaseBrowserSession(session: Session | null | undefined): Promise<void> {
  if (!browser || !session?.access_token || !session.refresh_token) {
    return;
  }

  const hydrationTask = (async () => {
    const client = getSupabaseBrowserClient();
    const existingSession = await readSupabaseBrowserSessionWithRetry(client);

    if (
      existingSession?.access_token === session.access_token &&
      existingSession.refresh_token === session.refresh_token
    ) {
      return;
    }

    await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  })();

  browserSessionHydrationPromise = hydrationTask;

  try {
    await hydrationTask;
  } finally {
    if (browserSessionHydrationPromise === hydrationTask) {
      browserSessionHydrationPromise = null;
    }
  }
}

export async function waitForSupabaseBrowserSessionHydration(): Promise<void> {
  if (!browser) {
    return;
  }

  if (browserSessionHydrationPromise) {
    await browserSessionHydrationPromise;
  }

  await readSupabaseBrowserSessionWithRetry();
}

export function buildSupabaseSessionContinuity(params: {
  session: Pick<Session, 'expires_at' | 'user'> | null;
  user?: Pick<User, 'id' | 'email' | 'user_metadata'> | null;
  now?: Date;
}): CachedSessionContinuity | null {
  const sessionUser = params.user ?? params.session?.user ?? null;
  const expiresAt = params.session?.expires_at ?? null;

  if (!sessionUser?.id || !sessionUser.email || typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    return null;
  }

  const metadata = (sessionUser.user_metadata ?? {}) as {
    display_name?: string;
    full_name?: string;
  };

  const displayName = metadata.display_name?.trim() || metadata.full_name?.trim() || sessionUser.email.split('@')[0] || 'Caluno member';

  return {
    userId: sessionUser.id,
    email: sessionUser.email,
    displayName,
    expiresAtMs: expiresAt * 1000,
    refreshedAt: (params.now ?? new Date()).toISOString()
  };
}

export function readSupabaseSessionContinuity(params: {
  storage?: StorageLike | null;
  now?: Date;
  expectedUserId?: string | null;
} = {}): BrowserSessionContinuityLookup {
  const snapshot = readCachedAppShellSnapshot({
    storage: params.storage,
    now: params.now,
    expectedUserId: params.expectedUserId
  });

  if (snapshot.status !== 'available') {
    return snapshot;
  }

  return {
    status: 'available',
    session: snapshot.snapshot.session
  };
}
