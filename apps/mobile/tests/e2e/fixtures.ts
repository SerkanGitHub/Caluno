import { test as base, expect, type Page } from '@playwright/test';

type SeededUser = {
  email: string;
  password: string;
  displayName: string;
  expectedGroups: string[];
};

export const seededUsers = {
  alphaMember: {
    email: 'bob@example.com',
    password: 'password123',
    displayName: 'Bob Member',
    expectedGroups: ['Alpha Team']
  }
} as const satisfies Record<string, SeededUser>;

export const seededCalendars = {
  alphaShared: 'aaaaaaaa-aaaa-1111-1111-111111111111',
  betaShared: 'bbbbbbbb-bbbb-2222-2222-222222222222'
} as const;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await use(page);
  }
});

export { expect };

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
