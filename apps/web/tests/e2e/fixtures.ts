import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

type SeededUser = {
  email: string;
  password: string;
  displayName: string;
  expectedGroups: string[];
};

type FlowPhase = {
  phase: string;
  detail?: string;
  timestamp: string;
};

type FailedResponse = {
  url: string;
  status: number;
  method: string;
};

export const seededUsers = {
  alphaMember: {
    email: 'bob@example.com',
    password: 'password123',
    displayName: 'Bob Member',
    expectedGroups: ['Alpha Team']
  },
  noMembership: {
    email: 'erin@example.com',
    password: 'password123',
    displayName: 'Erin Outsider',
    expectedGroups: []
  }
} as const satisfies Record<string, SeededUser>;

export const seededJoinCodes = {
  activeAlpha: 'ALPHA123',
  invalid: 'WRONG999'
} as const;

export const seededCalendars = {
  alphaShared: 'aaaaaaaa-aaaa-1111-1111-111111111111',
  betaShared: 'bbbbbbbb-bbbb-2222-2222-222222222222'
} as const;

class FlowDiagnostics {
  private readonly phases: FlowPhase[] = [];
  private readonly consoleErrors: string[] = [];
  private readonly pageErrors: string[] = [];
  private readonly failedResponses: FailedResponse[] = [];

  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo
  ) {
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        this.consoleErrors.push(`${message.type()}: ${message.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      this.pageErrors.push(error.message);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        this.failedResponses.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
  }

  mark(phase: string, detail?: string) {
    this.phases.push({
      phase,
      detail,
      timestamp: new Date().toISOString()
    });
  }

  async attach() {
    const payload = {
      currentPhase: this.phases.at(-1)?.phase ?? 'not-started',
      phases: this.phases,
      fixtures: {
        users: seededUsers,
        joinCodes: seededJoinCodes,
        calendars: seededCalendars
      },
      consoleErrors: this.consoleErrors,
      pageErrors: this.pageErrors,
      failedResponses: this.failedResponses
    };

    await this.testInfo.attach('flow-diagnostics', {
      body: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'),
      contentType: 'application/json'
    });
  }
}

export const test = base.extend<{ flow: FlowDiagnostics }>({
  flow: async ({ page }, use, testInfo) => {
    const flow = new FlowDiagnostics(page, testInfo);
    flow.mark('test-start', testInfo.title);

    try {
      await use(flow);
    } finally {
      await flow.attach();
    }
  }
});

export { expect };

export async function signInThroughUi(page: Page, user: SeededUser) {
  await page.goto('/signin');
  await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
  await page.waitForTimeout(750);

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  await passwordInput.fill(user.password);
  await expect(passwordInput).toHaveValue(user.password);
  await emailInput.fill(user.email);
  await expect(emailInput).toHaveValue(user.email);
  await expect(passwordInput).toHaveValue(user.password);

  await page.getByRole('button', { name: 'Request trusted session' }).click();
  await expect(page).toHaveURL(/\/groups/);
  await expect(page.getByTestId('groups-shell')).toBeVisible();
}

export async function signOutThroughUi(page: Page) {
  await page.getByRole('link', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/signin\?flow=signed-out/);
  await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
}

export async function expectProtectedRouteToRedirectToSignIn(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/signin\?/);
  await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
}
