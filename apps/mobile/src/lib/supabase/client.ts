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

export type MobileSupabaseDataClient = MobileSupabaseAuthClient & Pick<SupabaseClient, 'from' | 'rpc'>;

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
