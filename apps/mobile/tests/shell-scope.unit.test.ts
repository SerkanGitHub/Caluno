import { describe, expect, it } from 'vitest';
import {
  loadMobileAppShell,
  primaryCalendarLandingHref,
  resetMobileAppShellCache,
  resolveMobileCalendarRoute,
  type MobileShellLoadResult
} from '../src/lib/shell/load-app-shell';

const alphaDefaultId = 'aaaaaaaa-aaaa-1111-1111-111111111111';
const alphaSecondaryId = 'aaaaaaaa-aaaa-1111-1111-222222222222';
const betaDefaultId = 'bbbbbbbb-bbbb-2222-2222-111111111111';

type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
};

function createQueryClient(responses: Record<string, QueryResponse>) {
  return {
    from(table: string) {
      return createBuilder(table, responses);
    }
  };
}

function createBuilder(table: string, responses: Record<string, QueryResponse>) {
  const state = {
    filters: [] as string[],
    orders: [] as string[]
  };

  const builder = {
    select(_columns: string) {
      return builder;
    },
    eq(column: string, value: string) {
      state.filters.push(`eq:${column}:${value}`);
      return builder;
    },
    in(column: string, values: string[]) {
      state.filters.push(`in:${column}:${values.join(',')}`);
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      state.orders.push(`order:${column}:${options?.ascending === false ? 'desc' : 'asc'}`);
      return builder;
    },
    returns<T>() {
      const lookupKey = [table, ...state.filters, ...state.orders].join('|');
      const response = responses[lookupKey] ?? responses[table];
      return Promise.resolve((response ?? { data: [], error: null }) as { data: T; error: { message: string } | null });
    }
  };

  return builder;
}

function expectShellSuccess(result: MobileShellLoadResult) {
  expect(result.ok).toBe(true);
  return result.ok ? result.appShell : null;
}

describe('mobile trusted shell scope', () => {
  it('keeps onboarding explicit when trusted memberships are empty', async () => {
    resetMobileAppShellCache();

    const result = await loadMobileAppShell(
      {
        id: 'user-empty',
        email: 'empty@example.com',
        user_metadata: { display_name: 'No Groups' }
      },
      {
        client: createQueryClient({
          'group_memberships|eq:user_id:user-empty': {
            data: [],
            error: null
          }
        }) as never
      }
    );

    expect(result).toMatchObject({
      ok: true,
      bootstrapMode: 'needs-group',
      appShell: {
        onboardingState: 'needs-group',
        groups: [],
        calendars: [],
        primaryCalendar: null
      }
    });
  });

  it('shapes trusted inventory and lands on the shared primary calendar helper', async () => {
    resetMobileAppShellCache();

    const result = await loadMobileAppShell(
      {
        id: 'user-alpha',
        email: 'alpha@example.com',
        user_metadata: { full_name: 'Alpha Member' }
      },
      {
        client: createQueryClient({
          'group_memberships|eq:user_id:user-alpha': {
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          },
          'groups|in:id:group-alpha': {
            data: [{ id: 'group-alpha', name: 'Alpha Group' }],
            error: null
          },
          'calendars|in:group_id:group-alpha|order:is_default:desc|order:name:asc': {
            data: [
              { id: alphaDefaultId, group_id: 'group-alpha', name: 'Alpha shared', is_default: true },
              { id: alphaSecondaryId, group_id: 'group-alpha', name: 'Alpha backlog', is_default: false }
            ],
            error: null
          },
          'group_join_codes|in:group_id:group-alpha|order:created_at:desc': {
            data: [{ group_id: 'group-alpha', code: 'ALPHA123', expires_at: null, revoked_at: null }],
            error: null
          }
        }) as never
      }
    );

    const appShell = expectShellSuccess(result);
    expect(appShell?.primaryCalendar?.id).toBe(alphaDefaultId);
    expect(primaryCalendarLandingHref(appShell as NonNullable<typeof appShell>)).toBe(`/calendars/${alphaDefaultId}`);
  });

  it('falls back to the first visible calendar when no default calendar exists', async () => {
    resetMobileAppShellCache();

    const result = await loadMobileAppShell(
      {
        id: 'user-fallback',
        email: 'fallback@example.com',
        user_metadata: { display_name: 'Fallback Member' }
      },
      {
        client: createQueryClient({
          'group_memberships|eq:user_id:user-fallback': {
            data: [{ group_id: 'group-alpha', role: 'member' }],
            error: null
          },
          'groups|in:id:group-alpha': {
            data: [{ id: 'group-alpha', name: 'Alpha Group' }],
            error: null
          },
          'calendars|in:group_id:group-alpha|order:is_default:desc|order:name:asc': {
            data: [{ id: alphaSecondaryId, group_id: 'group-alpha', name: 'Alpha backlog', is_default: false }],
            error: null
          },
          'group_join_codes|in:group_id:group-alpha|order:created_at:desc': {
            data: [],
            error: null
          }
        }) as never
      }
    );

    const appShell = expectShellSuccess(result);
    expect(appShell?.primaryCalendar?.id).toBe(alphaSecondaryId);
  });

  it('fails closed when join-code rows are malformed instead of widening trusted inventory', async () => {
    resetMobileAppShellCache();

    const result = await loadMobileAppShell(
      {
        id: 'user-bad-join',
        email: 'badjoin@example.com',
        user_metadata: { display_name: 'Bad Join' }
      },
      {
        client: createQueryClient({
          'group_memberships|eq:user_id:user-bad-join': {
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          },
          'groups|in:id:group-alpha': {
            data: [{ id: 'group-alpha', name: 'Alpha Group' }],
            error: null
          },
          'calendars|in:group_id:group-alpha|order:is_default:desc|order:name:asc': {
            data: [{ id: alphaDefaultId, group_id: 'group-alpha', name: 'Alpha shared', is_default: true }],
            error: null
          },
          'group_join_codes|in:group_id:group-alpha|order:created_at:desc': {
            data: [{ group_id: 'group-alpha', code: null, expires_at: null, revoked_at: null }],
            error: null
          }
        }) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      bootstrapMode: 'load-failed',
      failurePhase: 'shape',
      reasonCode: 'APP_SHELL_JOIN_CODE_SHAPE_INVALID'
    });
  });

  it('keeps query failures explicit instead of rendering partial shell scope', async () => {
    resetMobileAppShellCache();

    const result = await loadMobileAppShell(
      {
        id: 'user-query-fail',
        email: 'queryfail@example.com',
        user_metadata: { display_name: 'Query Fail' }
      },
      {
        client: createQueryClient({
          'group_memberships|eq:user_id:user-query-fail': {
            data: [{ group_id: 'group-alpha', role: 'owner' }],
            error: null
          },
          'groups|in:id:group-alpha': {
            data: [{ id: 'group-alpha', name: 'Alpha Group' }],
            error: null
          },
          'calendars|in:group_id:group-alpha|order:is_default:desc|order:name:asc': {
            data: null,
            error: { message: 'RLS blocked calendars' }
          },
          'group_join_codes|in:group_id:group-alpha|order:created_at:desc': {
            data: [],
            error: null
          }
        }) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      bootstrapMode: 'load-failed',
      failurePhase: 'calendars',
      reasonCode: 'APP_SHELL_CALENDAR_LOAD_FAILED'
    });
  });

  it('renders calendar-id-invalid for malformed params and calendar-missing for out-of-scope ids', async () => {
    const resolved = resolveMobileCalendarRoute({
      appShell: {
        viewer: {
          id: 'user-alpha',
          email: 'alpha@example.com',
          displayName: 'Alpha Member'
        },
        memberships: [{ groupId: 'group-alpha', userId: 'user-alpha', role: 'owner' }],
        groups: [
          {
            id: 'group-alpha',
            name: 'Alpha Group',
            role: 'owner',
            calendars: [{ id: alphaDefaultId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }],
            joinCode: 'ALPHA123',
            joinCodeStatus: 'active'
          }
        ],
        calendars: [{ id: alphaDefaultId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }],
        primaryCalendar: { id: alphaDefaultId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true },
        onboardingState: 'ready'
      },
      calendarId: 'not-a-uuid',
      userId: 'user-alpha'
    });

    expect(resolved).toMatchObject({
      kind: 'denied',
      state: {
        reason: 'calendar-id-invalid',
        failurePhase: 'calendar-param'
      }
    });

    const missing = resolveMobileCalendarRoute({
      appShell: {
        viewer: {
          id: 'user-alpha',
          email: 'alpha@example.com',
          displayName: 'Alpha Member'
        },
        memberships: [{ groupId: 'group-alpha', userId: 'user-alpha', role: 'owner' }],
        groups: [
          {
            id: 'group-alpha',
            name: 'Alpha Group',
            role: 'owner',
            calendars: [{ id: alphaDefaultId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }],
            joinCode: 'ALPHA123',
            joinCodeStatus: 'active'
          }
        ],
        calendars: [{ id: alphaDefaultId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true }],
        primaryCalendar: { id: alphaDefaultId, groupId: 'group-alpha', name: 'Alpha shared', isDefault: true },
        onboardingState: 'ready'
      },
      calendarId: betaDefaultId,
      userId: 'user-alpha'
    });

    expect(missing).toMatchObject({
      kind: 'denied',
      state: {
        reason: 'calendar-missing',
        failurePhase: 'calendar-lookup',
        attemptedCalendarId: betaDefaultId
      }
    });
  });
});
