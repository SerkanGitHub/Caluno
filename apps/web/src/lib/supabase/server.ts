import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { readSupabasePublicEnv } from './config';

export type AuthStatus = 'anonymous' | 'authenticated' | 'invalid';

export type AuthState = {
  session: Session | null;
  user: User | null;
  authStatus: AuthStatus;
};

type SafeSessionAuthClient = {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null } }>;
    getUser: () => Promise<{ data: { user: User | null }; error: unknown }>;
  };
};

export function createSupabaseServerClient(event: Pick<RequestEvent, 'cookies'>): SupabaseClient {
  const { url, publishableKey } = readSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' });
        });
      }
    }
  });
}

export async function safeGetSession(client: SafeSessionAuthClient): Promise<AuthState> {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session) {
    return {
      session: null,
      user: null,
      authStatus: 'anonymous'
    };
  }

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error || !user) {
    return {
      session: null,
      user: null,
      authStatus: 'invalid'
    };
  }

  return {
    session,
    user,
    authStatus: 'authenticated'
  };
}
