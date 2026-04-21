# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-scope.spec.ts >> reload keeps a valid trusted session working and sign-out closes protected routes again
- Location: tests/e2e/auth-scope.spec.ts:44:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/signin\?flow=auth-required/
Received string:  "http://127.0.0.1:4173/calendars/aaaaaaaa-aaaa-1111-1111-111111111111"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    14 × unexpected value "http://127.0.0.1:4173/calendars/aaaaaaaa-aaaa-1111-1111-111111111111"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Caluno pocket shell
      - generic [ref=e7]:
        - generic [ref=e8]: Caluno member
        - button "Sign out" [ref=e9] [cursor=pointer]
    - generic [ref=e10]:
      - heading "Calendar access resolved from trusted scope." [level=1] [ref=e11]
      - paragraph [ref=e12]: This route never probes arbitrary calendar ids. It resolves the attempted id only against trusted online inventory or a previously synced cached continuity snapshot.
    - generic [ref=e13]:
      - article [ref=e14]:
        - generic [ref=e15]: Shell state
        - strong [ref=e16]: idle
      - article [ref=e17]:
        - generic [ref=e18]: Route mode
        - strong [ref=e19]: denied
      - article [ref=e20]:
        - generic [ref=e21]: Snapshot origin
        - strong [ref=e22]: none
      - article [ref=e23]:
        - generic [ref=e24]: Continuity
        - strong [ref=e25]: cache-missing
  - article [ref=e28]:
    - paragraph [ref=e29]: Continuity denied
    - heading "Protected content stayed closed." [level=2] [ref=e30]
    - paragraph [ref=e31]: No trusted app-shell continuity snapshot has been stored on this browser yet.
    - generic [ref=e32]:
      - generic [ref=e33]:
        - term [ref=e34]: Reason
        - definition [ref=e35]: cache-missing
      - generic [ref=e36]:
        - term [ref=e37]: Route mode
        - definition [ref=e38]: denied
      - generic [ref=e39]:
        - term [ref=e40]: Attempted id
        - definition [ref=e41]:
          - code [ref=e42]: aaaaaaaa-aaaa-1111-1111-111111111111
    - generic [ref=e43]:
      - link "Sign in again" [ref=e44] [cursor=pointer]:
        - /url: /signin?flow=auth-required&reason=AUTH_REQUIRED&returnTo=%2Fcalendars%2Faaaaaaaa-aaaa-1111-1111-111111111111
      - link "Return to groups" [ref=e45] [cursor=pointer]:
        - /url: /groups
  - navigation "Primary mobile navigation" [ref=e46]:
    - link "Groups" [ref=e47] [cursor=pointer]:
      - /url: /groups
    - generic [ref=e48]: Calendar locked
    - link "Account" [ref=e49] [cursor=pointer]:
      - /url: /signin
```

# Test source

```ts
  1   | import { test as base, expect, type Page } from '@playwright/test';
  2   | 
  3   | type SeededUser = {
  4   |   email: string;
  5   |   password: string;
  6   |   displayName: string;
  7   |   expectedGroups: string[];
  8   | };
  9   | 
  10  | export const seededUsers = {
  11  |   alphaMember: {
  12  |     email: 'bob@example.com',
  13  |     password: 'password123',
  14  |     displayName: 'Bob Member',
  15  |     expectedGroups: ['Alpha Team']
  16  |   }
  17  | } as const satisfies Record<string, SeededUser>;
  18  | 
  19  | export const seededCalendars = {
  20  |   alphaShared: 'aaaaaaaa-aaaa-1111-1111-111111111111',
  21  |   betaShared: 'bbbbbbbb-bbbb-2222-2222-222222222222'
  22  | } as const;
  23  | 
  24  | export const test = base.extend({
  25  |   page: async ({ page }, use) => {
  26  |     await page.addInitScript(() => {
  27  |       window.localStorage.clear();
  28  |       window.sessionStorage.clear();
  29  |     });
  30  | 
  31  |     await use(page);
  32  |   }
  33  | });
  34  | 
  35  | export { expect };
  36  | 
  37  | export async function signInThroughUi(page: Page, user: SeededUser) {
  38  |   await page.goto('/signin');
  39  |   await expect(page.getByTestId('mobile-signin-entrypoint')).toBeVisible();
  40  |   await expect(page.getByTestId('mobile-auth-state')).toHaveAttribute('data-auth-phase', 'signed-out');
  41  | 
  42  |   await page.getByTestId('mobile-signin-email').fill(user.email);
  43  |   await page.getByTestId('mobile-signin-password').fill(user.password);
  44  | 
  45  |   await Promise.all([
  46  |     page.waitForURL(/\/(groups(?:\?|$)|calendars\/)/),
  47  |     page.getByTestId('mobile-signin-submit').click()
  48  |   ]);
  49  | 
  50  |   await expect(page.getByTestId('mobile-shell-frame')).toBeVisible();
  51  |   await expect(page.getByTestId('mobile-shell-status')).toContainText('trusted-ready');
  52  | }
  53  | 
  54  | export async function expectProtectedRouteToRedirectToSignIn(
  55  |   page: Page,
  56  |   path: string,
  57  |   expectedFlow: 'auth-required' | 'invalid-session' = 'auth-required'
  58  | ) {
  59  |   await page.goto(path);
> 60  |   await expect(page).toHaveURL(new RegExp(`/signin\\?flow=${expectedFlow}`));
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  61  |   await expect(page.getByTestId('mobile-signin-entrypoint')).toBeVisible();
  62  |   await expect(page.getByTestId('mobile-signin-entrypoint')).toHaveAttribute('data-signin-flow', expectedFlow);
  63  | }
  64  | 
  65  | export async function corruptPersistedSession(page: Page) {
  66  |   const result = await page.evaluate(() => {
  67  |     const matchingCookies = document.cookie
  68  |       .split(/;\s*/)
  69  |       .map((entry) => entry.trim())
  70  |       .filter(Boolean)
  71  |       .map((entry) => entry.split('=')[0] ?? '')
  72  |       .filter((name) => /^sb-.*auth-token(?:\.\d+)?$/.test(name));
  73  | 
  74  |     if (matchingCookies.length === 0) {
  75  |       const localStorageKey = Object.keys(window.localStorage).find(
  76  |         (candidate) => candidate.startsWith('sb-') && candidate.endsWith('-auth-token')
  77  |       );
  78  | 
  79  |       if (!localStorageKey) {
  80  |         return { ok: false, reason: 'auth-session-missing' };
  81  |       }
  82  | 
  83  |       window.localStorage.setItem(
  84  |         localStorageKey,
  85  |         JSON.stringify({
  86  |           access_token: 'malformed-access-token',
  87  |           refresh_token: 'malformed-refresh-token',
  88  |           token_type: 'bearer',
  89  |           expires_in: 3600,
  90  |           expires_at: Math.floor(Date.now() / 1000) + 3600,
  91  |           user: {
  92  |             id: 'broken-session-user',
  93  |             email: 'bob@example.com'
  94  |           }
  95  |         })
  96  |       );
  97  | 
  98  |       return { ok: true, key: localStorageKey, mode: 'local-storage' };
  99  |     }
  100 | 
  101 |     const baseName = matchingCookies[0].replace(/\.\d+$/, '');
  102 |     for (const name of matchingCookies) {
  103 |       document.cookie = `${name}=; Max-Age=0; path=/`;
  104 |     }
  105 | 
  106 |     const malformedSession = JSON.stringify({
  107 |       access_token: 'malformed-access-token',
  108 |       refresh_token: 'malformed-refresh-token',
  109 |       token_type: 'bearer',
  110 |       expires_in: 3600,
  111 |       expires_at: Math.floor(Date.now() / 1000) + 3600,
  112 |       user: {
  113 |         id: 'broken-session-user',
  114 |         email: 'bob@example.com'
  115 |       }
  116 |     });
  117 | 
  118 |     const encoded = btoa(unescape(encodeURIComponent(malformedSession)))
  119 |       .replace(/\+/g, '-')
  120 |       .replace(/\//g, '_')
  121 |       .replace(/=+$/g, '');
  122 | 
  123 |     document.cookie = `${baseName}=base64-${encoded}; path=/`;
  124 |     return { ok: true, key: baseName, mode: 'cookie' };
  125 |   });
  126 | 
  127 |   expect(result.ok, `expected a persisted auth session to exist before corruption, got ${JSON.stringify(result)}`).toBe(true);
  128 |   return result;
  129 | }
  130 | 
```