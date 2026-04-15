import type { Session, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { writeCachedAppShellSnapshot, type StorageLike } from '../../src/lib/offline/app-shell-cache';
import { load } from '../../src/routes/+layout.server';
import { readSupabasePublicEnv } from '../../src/lib/supabase/config';
import {
  buildSupabaseSessionContinuity,
  readSupabaseSessionContinuity
} from '../../src/lib/supabase/client';
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

function createStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
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

describe('browser continuity session helpers', () => {
  it('builds a minimal continuity session without persisting raw auth tokens', () => {
    const session = createSession({
      expires_at: 1_900_000_000,
      user: createUser({
        id: 'user-2',
        email: 'signed-in@example.com',
        user_metadata: { full_name: 'Taylor Agent' }
      })
    });

    expect(
      buildSupabaseSessionContinuity({
        session,
        now: new Date('2026-04-15T10:00:00.000Z')
      })
    ).toEqual({
      userId: 'user-2',
      email: 'signed-in@example.com',
      displayName: 'Taylor Agent',
      expiresAtMs: 1_900_000_000_000,
      refreshedAt: '2026-04-15T10:00:00.000Z'
    });
  });

  it('reads continuity from the cached shell and rejects stale cached sessions', () => {
    const storage = createStorage();

    writeCachedAppShellSnapshot(
      {
        viewer: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User One'
        },
        session: {
          userId: 'user-1',
          email: 'user@example.com',
          displayName: 'User One',
          expiresAtMs: new Date('2026-04-15T09:59:59.000Z').getTime(),
          refreshedAt: '2026-04-15T09:00:00.000Z'
        },
        groups: [
          {
            id: 'group-a',
            name: 'Alpha Group',
            role: 'owner',
            calendars: [
              {
                id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
                groupId: 'group-a',
                name: 'Alpha shared',
                isDefault: true
              }
            ],
            joinCode: null,
            joinCodeStatus: 'unavailable'
          }
        ],
        calendars: [
          {
            id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
            groupId: 'group-a',
            name: 'Alpha shared',
            isDefault: true
          }
        ],
        primaryCalendar: {
          id: 'aaaaaaaa-aaaa-1111-1111-111111111111',
          groupId: 'group-a',
          name: 'Alpha shared',
          isDefault: true
        },
        onboardingState: 'ready',
        now: new Date('2026-04-15T09:00:00.000Z')
      },
      storage
    );

    expect(
      readSupabaseSessionContinuity({
        storage,
        expectedUserId: 'user-1',
        now: new Date('2026-04-15T10:00:00.000Z')
      })
    ).toEqual({
      status: 'unavailable',
      reason: 'session-stale',
      detail: 'The cached continuity session expired, so offline continuity failed closed.'
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
