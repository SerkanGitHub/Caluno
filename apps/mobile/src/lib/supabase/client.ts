import { browser } from '$app/environment';
import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { readSupabasePublicEnv, type SupabasePublicEnv } from './config';

export type MobileSupabaseClient = Pick<SupabaseClient, 'auth'>;

export type MobileSupabaseAuthClient = {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null } }>;
    getUser: () => Promise<{ data: { user: User | null }; error: unknown }>;
    signInWithPassword: (credentials: {
      email: string;
      password: string;
    }) => Promise<{ data: { session: Session | null; user: User | null }; error: { message: string } | null }>;
    signOut: () => Promise<{ error: { message: string } | null }>;
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
  };
};

/**
 * Minimal function-invocation seam for best-effort edge-function dispatch.
 * Only the subset of `SupabaseClient.functions` required by the mobile dispatch
 * helper is exposed so the type boundary stays narrow.
 */
export type MobileSupabaseFunctionsSeam = {
  functions: {
    invoke(
      fn: string,
      options?: { body?: unknown }
    ): Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

export type MobileSupabaseDataClient = MobileSupabaseAuthClient &
  Pick<SupabaseClient, 'from' | 'rpc'> &
  MobileSupabaseFunctionsSeam;

let browserClient: MobileSupabaseDataClient | undefined;

export function createSupabaseBrowserClient(source?: SupabasePublicEnv): MobileSupabaseDataClient {
  const { url, publishableKey } = readSupabasePublicEnv(source);
  return createBrowserClient(url, publishableKey);
}

export function getSupabaseBrowserClient(): MobileSupabaseDataClient {
  if (!browser) {
    throw new Error('getSupabaseBrowserClient() must only run in the browser.');
  }

  browserClient ??= createSupabaseBrowserClient();
  return browserClient;
}

export function resetSupabaseBrowserClientForTests() {
  browserClient = undefined;
}
