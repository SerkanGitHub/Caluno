import { execFileSync } from 'node:child_process';
import { test as base, expect, type Page, type Route } from '@playwright/test';

type SeededUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  expectedGroups: string[];
};

type SupabaseStatusEnv = {
  API_URL?: string;
};

const OFFLINE_QUEUE_PREFIX = 'caluno.mobile.mutation-queue.v1';
const APP_SHELL_CACHE_STORAGE_KEY = 'caluno.offline.app-shell.v1';
const CAPACITOR_PREFERENCES_GROUP = 'CapacitorStorage';
const connectivityRouteHandlers = new WeakMap<Page, (route: Route) => Promise<void>>();
const supabaseApiOrigin = readLocalSupabaseApiOrigin();

export const seededUsers = {
  alphaMember: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'bob@example.com',
    password: 'password123',
    displayName: 'Bob Member',
    expectedGroups: ['Alpha Team']
  }
} as const satisfies Record<string, SeededUser>;

export const seededCalendars = {
  alphaShared: 'aaaaaaaa-aaaa-1111-1111-111111111111',
  alphaBacklog: 'aaaaaaaa-aaaa-1111-1111-222222222222',
  betaShared: 'bbbbbbbb-bbbb-2222-2222-222222222222'
} as const;

export const seededWeekStarts = {
  alphaWarm: '2026-04-13'
} as const;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const clearedMarker = 'caluno-e2e-cleared=1';
      const connectivityCookieName = 'caluno-e2e-connectivity';

      if (!document.cookie.includes(clearedMarker)) {
        try {
          window.localStorage.clear();
        } catch {
          // ignore test bootstrap cleanup failures
        }

        try {
          window.sessionStorage.clear();
        } catch {
          // ignore test bootstrap cleanup failures
        }

        document.cookie = `${clearedMarker}; path=/`;
        document.cookie = `${connectivityCookieName}=online; path=/`;
      }

      const connectivityMatch = document.cookie.match(/(?:^|;\s*)caluno-e2e-connectivity=(online|offline)\b/);
      let connected = connectivityMatch?.[1] !== 'offline';

      try {
        Object.defineProperty(window.navigator, 'onLine', {
          configurable: true,
          get() {
            return connected;
          }
        });
      } catch {
        // ignore navigator override failures and rely on emitted events instead
      }

      Object.defineProperty(window, '__calunoE2E', {
        configurable: true,
        value: {
          getConnectivity() {
            return connected;
          },
          setConnectivity(next: boolean) {
            connected = next;
            document.cookie = `caluno-e2e-connectivity=${next ? 'online' : 'offline'}; path=/`;
            window.dispatchEvent(new Event(next ? 'online' : 'offline'));
          }
        }
      });
    });

    await use(page);

    const existingHandler = connectivityRouteHandlers.get(page);
    if (existingHandler) {
      await page.unroute(`${supabaseApiOrigin}/**`, existingHandler);
      connectivityRouteHandlers.delete(page);
    }
  }
});

export { expect };

export function buildCalendarPath(calendarId: string, weekStart?: string) {
  return weekStart ? `/calendars/${calendarId}?start=${weekStart}` : `/calendars/${calendarId}`;
}

export function buildMutationQueueKey(params: { userId: string; calendarId: string; weekStart: string }) {
  return `${OFFLINE_QUEUE_PREFIX}:${params.userId}:${params.calendarId}:${params.weekStart}`;
}

export async function signInThroughUi(page: Page, user: SeededUser) {
  await page.goto('/signin');
  await expect(page.getByTestId('mobile-signin-entrypoint')).toBeVisible();
  await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-phase', 'signed-out');

  await page.getByTestId('mobile-signin-email').fill(user.email);
  await page.getByTestId('mobile-signin-password').fill(user.password);

  await Promise.all([
    page.waitForURL(/\/(groups(?:\?|$)|calendars\/)/),
    page.getByTestId('mobile-signin-submit').click()
  ]);

  await expect(page.getByTestId('mobile-shell-frame')).toBeVisible();
  await expect(page.getByTestId('mobile-shell-status')).toContainText('trusted-ready');
}

export async function openCalendar(
  page: Page,
  params: {
    calendarId: string;
    weekStart?: string;
    expectedName?: string;
  }
) {
  const path = buildCalendarPath(params.calendarId, params.weekStart);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}$`));
  await expect(page.getByTestId('calendar-shell')).toBeVisible();

  if (params.expectedName) {
    await expect(page.getByTestId('calendar-shell').locator('h1').filter({ hasText: params.expectedName })).toBeVisible();
  }

  if (params.weekStart) {
    await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-start', params.weekStart);
  }
}

export async function expectProtectedRouteToRedirectToSignIn(
  page: Page,
  path: string,
  expectedFlow: 'auth-required' | 'invalid-session' = 'auth-required'
) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`/signin\\?flow=${expectedFlow}`));
  await expect(page.getByTestId('mobile-signin-entrypoint')).toBeVisible();
  await expect(page.getByTestId('mobile-signin-entrypoint')).toHaveAttribute('data-signin-flow', expectedFlow);
}

export async function setSimulatedConnectivity(
  page: Page,
  connected: boolean,
  options: {
    waitForCalendarUi?: boolean;
  } = {}
) {
  const existingHandler = connectivityRouteHandlers.get(page);

  if (connected) {
    if (existingHandler) {
      await page.unroute(`${supabaseApiOrigin}/**`, existingHandler);
      connectivityRouteHandlers.delete(page);
    }
  } else if (!existingHandler) {
    const handler = async (route: Route) => {
      await route.abort('internetdisconnected');
    };

    await page.route(`${supabaseApiOrigin}/**`, handler);
    connectivityRouteHandlers.set(page, handler);
  }

  await page.evaluate((nextConnected) => {
    window.__calunoE2E?.setConnectivity(nextConnected);
  }, connected);

  if (options.waitForCalendarUi ?? true) {
    await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-network', connected ? 'online' : 'offline');
  }
}

export async function waitForPendingCount(page: Page, count: number) {
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-pending-count', String(count));
}

export async function waitForRetryableCount(page: Page, count: number) {
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-retryable-count', String(count));
}

export async function clearPersistedSession(page: Page) {
  const result = await page.evaluate(() => {
    const matchingCookies = document.cookie
      .split(/;\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.split('=')[0] ?? '')
      .filter((name) => /^sb-.*auth-token(?:\.\d+)?$/.test(name));

    for (const name of matchingCookies) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }

    const matchingLocalStorageKeys = Object.keys(window.localStorage).filter(
      (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token')
    );

    for (const key of matchingLocalStorageKeys) {
      window.localStorage.removeItem(key);
    }

    return {
      ok: matchingCookies.length > 0 || matchingLocalStorageKeys.length > 0,
      cookieCount: matchingCookies.length,
      localStorageCount: matchingLocalStorageKeys.length
    };
  });

  expect(result.ok, `expected a persisted auth session to exist before clearing, got ${JSON.stringify(result)}`).toBe(true);
  return result;
}

export async function corruptPersistedSession(page: Page) {
  const result = await page.evaluate(() => {
    const matchingCookies = document.cookie
      .split(/;\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.split('=')[0] ?? '')
      .filter((name) => /^sb-.*auth-token(?:\.\d+)?$/.test(name));

    if (matchingCookies.length === 0) {
      const localStorageKey = Object.keys(window.localStorage).find(
        (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token')
      );

      if (!localStorageKey) {
        return { ok: false, reason: 'auth-session-missing' };
      }

      window.localStorage.setItem(
        localStorageKey,
        JSON.stringify({
          access_token: 'malformed-access-token',
          refresh_token: 'malformed-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: 'broken-session-user',
            email: 'bob@example.com'
          }
        })
      );

      return { ok: true, key: localStorageKey, mode: 'local-storage' };
    }

    const baseName = matchingCookies[0].replace(/\.\d+$/, '');
    for (const name of matchingCookies) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }

    const malformedSession = JSON.stringify({
      access_token: 'malformed-access-token',
      refresh_token: 'malformed-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'broken-session-user',
        email: 'bob@example.com'
      }
    });

    const encoded = btoa(unescape(encodeURIComponent(malformedSession)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    document.cookie = `${baseName}=base64-${encoded}; path=/`;
    return { ok: true, key: baseName, mode: 'cookie' };
  });

  expect(result.ok, `expected a persisted auth session to exist before corruption, got ${JSON.stringify(result)}`).toBe(true);
  return result;
}

export async function corruptAppShellContinuity(page: Page, raw: string) {
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: buildCapacitorPreferencesStorageKey(APP_SHELL_CACHE_STORAGE_KEY), value: raw }
  );
}

export async function corruptOfflineMutationQueue(
  page: Page,
  params: { userId: string; calendarId: string; weekStart: string; raw: string }
) {
  const key = buildMutationQueueKey(params);
  await page.evaluate(
    ({ queueKey, value }) => {
      window.localStorage.setItem(queueKey, value);
    },
    { queueKey: buildCapacitorPreferencesStorageKey(key), value: params.raw }
  );
}

function buildCapacitorPreferencesStorageKey(key: string) {
  return `${CAPACITOR_PREFERENCES_GROUP}.${key}`;
}

function parseStatusEnv(raw: string): SupabaseStatusEnv {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<SupabaseStatusEnv>((accumulator, line) => {
      const match = line.match(/^([A-Z0-9_]+)=(?:"([\s\S]*)"|(.*))$/);

      if (!match) {
        return accumulator;
      }

      const [, key, quotedValue, bareValue] = match;
      accumulator[key as keyof SupabaseStatusEnv] = (quotedValue ?? bareValue ?? '').trim();
      return accumulator;
    }, {});
}

function readLocalSupabaseApiOrigin() {
  const raw = execFileSync('npx', ['--yes', 'supabase', 'status', '--output', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const env = parseStatusEnv(raw);
  const apiUrl = env.API_URL?.trim();

  if (!apiUrl) {
    throw new Error('Unable to resolve local Supabase API_URL for Playwright connectivity controls.');
  }

  return apiUrl.replace(/\/$/, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

declare global {
  interface Window {
    __calunoE2E?: {
      getConnectivity: () => boolean;
      setConnectivity: (connected: boolean) => void;
    };
  }
}
