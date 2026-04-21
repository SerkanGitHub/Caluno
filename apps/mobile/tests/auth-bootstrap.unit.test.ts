import type { Session, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createMobileSessionStore } from '../src/lib/auth/mobile-session';
import type { MobileSupabaseAuthClient } from '../src/lib/supabase/client';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-04-21T08:00:00.000Z',
    email: 'taylor@example.com',
    ...overrides
  } as User;
}

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1_900_000_000,
    token_type: 'bearer',
    user: createUser(),
    ...overrides
  } as Session;
}

function createAuthClient(params: {
  getSession?: () => Promise<{ data: { session: Session | null } }>;
  getUser?: () => Promise<{ data: { user: User | null }; error: unknown }>;
  signInWithPassword?: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ data: { session: Session | null; user: User | null }; error: { message: string } | null }>;
  signOut?: () => Promise<{ error: { message: string } | null }>;
}) {
  const unsubscribe = vi.fn();

  const client: MobileSupabaseAuthClient = {
    auth: {
      getSession:
        params.getSession ??
        vi.fn().mockResolvedValue({
          data: { session: null }
        }),
      getUser:
        params.getUser ??
        vi.fn().mockResolvedValue({
          data: { user: null },
          error: null
        }),
      signInWithPassword:
        params.signInWithPassword ??
        vi.fn().mockResolvedValue({
          data: { session: createSession(), user: createUser() },
          error: null
        }),
      signOut:
        params.signOut ??
        vi.fn().mockResolvedValue({
          error: null
        }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe
          }
        }
      })
    }
  };

  return {
    client,
    unsubscribe
  };
}

describe('mobile auth bootstrap store', () => {
  it('fails fast with a visible config error when public Supabase env is missing', async () => {
    const store = createMobileSessionStore({
      clientFactory: () => {
        throw new Error('Missing required public Supabase env: PUBLIC_SUPABASE_URL');
      }
    });

    await expect(store.bootstrap()).resolves.toMatchObject({
      phase: 'error',
      failurePhase: 'config',
      reasonCode: 'SUPABASE_ENV_MISSING',
      detail: 'Missing required public Supabase env: PUBLIC_SUPABASE_URL'
    });
  });

  it('treats an anonymous first launch as signed-out and never calls getUser', async () => {
    const getUser = vi.fn();
    const { client } = createAuthClient({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null }
      }),
      getUser
    });

    const store = createMobileSessionStore({
      clientFactory: () => client
    });

    await expect(store.bootstrap()).resolves.toMatchObject({
      phase: 'signed-out',
      reasonCode: null,
      detail: 'Sign in with your Caluno account before opening protected groups or calendars.'
    });

    expect(getUser).not.toHaveBeenCalled();
  });

  it('reuses a valid cached session and bootstraps only once even under duplicate calls', async () => {
    const session = createSession();
    const user = createUser({
      email: 'mobile@example.com',
      user_metadata: { display_name: 'Taylor Mobile' }
    });

    const getSession = vi.fn().mockImplementation(
      () => new Promise<{ data: { session: Session | null } }>((resolve) => setTimeout(() => resolve({ data: { session } }), 5))
    );
    const getUser = vi.fn().mockResolvedValue({
      data: { user },
      error: null
    });

    const { client } = createAuthClient({ getSession, getUser });
    const store = createMobileSessionStore({
      clientFactory: () => client,
      now: () => new Date('2026-04-21T09:30:00.000Z')
    });

    const [first, second] = await Promise.all([store.bootstrap(), store.bootstrap()]);

    expect(first).toMatchObject({
      phase: 'authenticated',
      displayName: 'Taylor Mobile',
      lastValidatedAt: '2026-04-21T09:30:00.000Z'
    });
    expect(second).toEqual(first);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('falls back to the email prefix when user metadata is malformed', async () => {
    const session = createSession();
    const user = createUser({
      email: 'fallback@example.com',
      user_metadata: { display_name: ['wrong-shape'], full_name: 42 }
    });

    const { client } = createAuthClient({
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null })
    });

    const store = createMobileSessionStore({
      clientFactory: () => client,
      now: () => new Date('2026-04-21T09:35:00.000Z')
    });

    await expect(store.bootstrap()).resolves.toMatchObject({
      phase: 'authenticated',
      displayName: 'fallback'
    });
  });

  it('fails closed when getUser rejects the cached session, clears continuity, and signs out locally', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const clearContinuity = vi.fn().mockResolvedValue(undefined);
    const { client } = createAuthClient({
      getSession: vi.fn().mockResolvedValue({
        data: { session: createSession() }
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('JWT expired')
      }),
      signOut
    });

    const store = createMobileSessionStore({
      clientFactory: () => client,
      clearContinuity
    });

    await expect(store.bootstrap()).resolves.toMatchObject({
      phase: 'invalid-session',
      failurePhase: 'bootstrap',
      reasonCode: 'INVALID_SESSION'
    });
    expect(clearContinuity).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('maps blank credentials and rejected passwords into explicit sign-in errors', async () => {
    const { client } = createAuthClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' }
      })
    });

    const store = createMobileSessionStore({
      clientFactory: () => client
    });

    await expect(store.signIn({ email: '   ', password: '' })).resolves.toMatchObject({
      phase: 'error',
      failurePhase: 'sign-in',
      reasonCode: 'SIGN_IN_FAILED',
      detail: 'Enter both email and password before requesting a trusted session.'
    });

    await expect(store.signIn({ email: 'user@example.com', password: 'wrong-password' })).resolves.toMatchObject({
      phase: 'error',
      failurePhase: 'sign-in',
      reasonCode: 'SIGN_IN_FAILED',
      detail: 'The supplied credentials were rejected. Check the email and password, then try again.'
    });
  });

  it('supports reset after invalid-session and safe sign-out after a trusted session exists', async () => {
    const session = createSession();
    const user = createUser({ email: 'signedin@example.com' });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const clearContinuity = vi.fn().mockResolvedValue(undefined);
    const { client } = createAuthClient({
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut
    });

    const store = createMobileSessionStore({
      clientFactory: () => client,
      now: () => new Date('2026-04-21T09:45:00.000Z'),
      clearContinuity
    });

    await store.bootstrap();

    await expect(store.signOut()).resolves.toMatchObject({
      phase: 'signed-out',
      detail: 'You are safely signed out on this device.'
    });
    expect(clearContinuity).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);

    expect(store.reset('Return to sign-in.')).toMatchObject({
      phase: 'signed-out',
      detail: 'Return to sign-in.'
    });
  });
});
