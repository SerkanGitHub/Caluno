import type { Session, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { load } from '../../src/routes/+layout.server';
import { readSupabasePublicEnv } from '../../src/lib/supabase/config';
import { safeGetSession } from '../../src/lib/supabase/server';

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

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-04-14T20:00:00.000Z',
    email: 'user@example.com',
    ...overrides
  } as User;
}

describe('readSupabasePublicEnv', () => {
  it('returns the trimmed public Supabase config', () => {
    expect(
      readSupabasePublicEnv({
        PUBLIC_SUPABASE_URL: ' https://example.supabase.co ',
        PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' publishable-key '
      })
    ).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key'
    });
  });

  it('throws when required public env vars are missing', () => {
    expect(() => readSupabasePublicEnv({})).toThrow(
      'Missing required public Supabase env: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  });
});

describe('safeGetSession', () => {
  it('returns an anonymous auth state when no session exists', async () => {
    const getUser = vi.fn();

    const result = await safeGetSession({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser
      }
    });

    expect(result).toEqual({
      session: null,
      user: null,
      authStatus: 'anonymous'
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('returns an authenticated auth state only after getUser succeeds', async () => {
    const session = createSession();
    const user = createUser({ id: 'user-2', email: 'signed-in@example.com' });

    const result = await safeGetSession({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null })
      }
    });

    expect(result).toEqual({
      session,
      user,
      authStatus: 'authenticated'
    });
  });

  it('returns an invalid auth state when getUser rejects the cookie-backed session', async () => {
    const session = createSession();

    const result = await safeGetSession({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('JWT expired') })
      }
    });

    expect(result).toEqual({
      session: null,
      user: null,
      authStatus: 'invalid'
    });
  });
});

describe('+layout.server load', () => {
  it('exposes the trusted auth state and registers the auth dependency key', async () => {
    const depends = vi.fn();
    const authState = {
      session: createSession(),
      user: createUser(),
      authStatus: 'authenticated' as const
    };

    const result = await load({
      depends,
      locals: {
        safeGetSession: vi.fn().mockResolvedValue(authState)
      }
    } as unknown as Parameters<typeof load>[0]);

    expect(depends).toHaveBeenCalledWith('supabase:auth');
    expect(result).toEqual(authState);
  });
});
