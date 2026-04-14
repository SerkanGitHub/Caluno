import { describe, expect, it, vi } from 'vitest';
import { normalizeInternalPath, resolveAuthSurface } from '../../src/lib/server/auth-flow';
import { resolveCalendarPageState } from '../../src/lib/server/app-shell';
import { load as appLayoutLoad } from '../../src/routes/(app)/+layout.server';
import { actions as groupActions } from '../../src/routes/(app)/groups/+page.server';
import { load as calendarPageLoad } from '../../src/routes/(app)/calendars/[calendarId]/+page.server';
import { GET as authCallbackGet } from '../../src/routes/(auth)/callback/+server';

function createRequest(formData: FormData) {
  return new Request('http://localhost/groups', {
    method: 'POST',
    body: formData
  });
}

describe('auth-flow helpers', () => {
  it('keeps only internal redirect paths', () => {
    expect(normalizeInternalPath('/groups?tab=owned')).toBe('/groups?tab=owned');
    expect(normalizeInternalPath('https://evil.example/phish')).toBe('/groups');
    expect(normalizeInternalPath('//evil.example/phish')).toBe('/groups');
  });

  it('surfaces callback failures as high-level reason codes', () => {
    const surface = resolveAuthSurface(new URLSearchParams('flow=callback-error&reason=CALLBACK_TIMEOUT'));

    expect(surface.state).toBe('callback-error');
    expect(surface.reasonCode).toBe('CALLBACK_TIMEOUT');
    expect(surface.detail).toContain('too long');
  });
});

describe('protected app layout', () => {
  it('redirects anonymous users to the sign-in entrypoint', async () => {
    await expect(
      appLayoutLoad({
        locals: {
          safeGetSession: vi.fn().mockResolvedValue({
            session: null,
            user: null,
            authStatus: 'anonymous'
          })
        },
        url: new URL('http://localhost/calendars/aaaaaaaa-aaaa-1111-1111-111111111111')
      } as unknown as Parameters<typeof appLayoutLoad>[0])
    ).rejects.toMatchObject({
      status: 303,
      location:
        '/signin?flow=auth-required&reason=AUTH_REQUIRED&returnTo=%2Fcalendars%2Faaaaaaaa-aaaa-1111-1111-111111111111'
    });
  });
});

describe('group onboarding actions', () => {
  it('rejects blank group names before attempting the create RPC', async () => {
    const rpc = vi.fn();
    const formData = new FormData();
    formData.set('groupName', '   ');
    formData.set('calendarName', 'Shared calendar');

    const result = await groupActions.createGroup({
      request: createRequest(formData),
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: {},
          user: { id: 'user-1' },
          authStatus: 'authenticated'
        }),
        supabase: { rpc }
      }
    } as unknown as Parameters<typeof groupActions.createGroup>[0]);

    expect(result.status).toBe(400);
    expect(result.data.createGroup.reason).toBe('GROUP_NAME_REQUIRED');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects blank join codes before attempting the join RPC', async () => {
    const rpc = vi.fn();
    const formData = new FormData();
    formData.set('joinCode', '---');

    const result = await groupActions.joinGroup({
      request: createRequest(formData),
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: {},
          user: { id: 'user-1' },
          authStatus: 'authenticated'
        }),
        supabase: { rpc }
      }
    } as unknown as Parameters<typeof groupActions.joinGroup>[0]);

    expect(result.status).toBe(400);
    expect(result.data.joinGroup.reason).toBe('JOIN_CODE_REQUIRED');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('calendar route resolution', () => {
  it('fails closed for malformed calendar ids without querying a guessed record', async () => {
    const helperResult = resolveCalendarPageState({
      calendarId: 'not-a-uuid',
      userId: 'user-a',
      memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
      calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }]
    });

    expect(helperResult).toEqual({
      kind: 'denied',
      attemptedCalendarId: 'not-a-uuid',
      reason: 'calendar-id-invalid',
      failurePhase: 'calendar-param'
    });
  });

  it('returns a named denied surface when a malformed route param reaches the page loader', async () => {
    const result = (await calendarPageLoad({
      params: { calendarId: 'not-a-uuid' },
      parent: vi.fn().mockResolvedValue({
        user: { id: 'user-a' },
        appShell: {
          memberships: [{ groupId: 'group-a', userId: 'user-a', role: 'owner' }],
          calendars: [{ id: 'aaaaaaaa-aaaa-1111-1111-111111111111', groupId: 'group-a', name: 'Alpha shared', isDefault: true }],
          groups: [],
          primaryCalendar: null
        }
      }),
      url: new URL('http://localhost/calendars/not-a-uuid')
    } as unknown as Parameters<typeof calendarPageLoad>[0])) as Exclude<
      Awaited<ReturnType<typeof calendarPageLoad>>,
      void
    >;

    expect(result.calendarView.kind).toBe('denied');
    expect(result.calendarView.reason).toBe('calendar-id-invalid');
    expect(result.calendarView.failurePhase).toBe('calendar-param');
  });
});

describe('auth callback route', () => {
  it('drops malformed callback requests and redirects back to sign-in', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });

    await expect(
      authCallbackGet({
        url: new URL('http://localhost/callback'),
        locals: {
          supabase: {
            auth: {
              signOut,
              exchangeCodeForSession: vi.fn()
            }
          }
        }
      } as unknown as Parameters<typeof authCallbackGet>[0])
    ).rejects.toMatchObject({
      status: 303,
      location: '/signin?flow=callback-error&reason=CALLBACK_CODE_MISSING'
    });

    expect(signOut).toHaveBeenCalled();
  });
});
