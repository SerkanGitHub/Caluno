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

type FlowContext = {
  calendarId: string | null;
  visibleWeekStart: string | null;
  visibleWeekEndExclusive: string | null;
  focusShiftIds: string[];
  note: string | null;
  navigatorOnline: boolean | null;
  runtimeIsolationState: string | null;
  serviceWorkerStatus: string | null;
  serviceWorkerDetail: string | null;
  calendarRouteMode: string | null;
  calendarRouteReason: string | null;
  calendarRouteDetail: string | null;
  localNetwork: string | null;
  localQueueSummary: string | null;
  localStateDetail: string | null;
  realtimeChannelState: string | null;
  realtimeRefreshState: string | null;
  realtimeDetail: string | null;
  realtimeReason: string | null;
  boardRealtimeChannelState: string | null;
  boardRealtimeRefreshState: string | null;
  boardRealtimeDetail: string | null;
  boardRealtimeReason: string | null;
  cachedSnapshotAt: string | null;
  boardMetaBadges: string[];
  actionReasons: string[];
  actionSummaries: string[];
  deniedReason: string | null;
  deniedFailurePhase: string | null;
  deniedAttemptedId: string | null;
};

type FlowSurfaceSnapshot = Pick<
  FlowContext,
  | 'navigatorOnline'
  | 'runtimeIsolationState'
  | 'serviceWorkerStatus'
  | 'serviceWorkerDetail'
  | 'calendarRouteMode'
  | 'calendarRouteReason'
  | 'calendarRouteDetail'
  | 'localNetwork'
  | 'localQueueSummary'
  | 'localStateDetail'
  | 'realtimeChannelState'
  | 'realtimeRefreshState'
  | 'realtimeDetail'
  | 'realtimeReason'
  | 'boardRealtimeChannelState'
  | 'boardRealtimeRefreshState'
  | 'boardRealtimeDetail'
  | 'boardRealtimeReason'
  | 'cachedSnapshotAt'
  | 'boardMetaBadges'
  | 'actionReasons'
  | 'actionSummaries'
  | 'deniedReason'
  | 'deniedFailurePhase'
  | 'deniedAttemptedId'
>;

type SeededShiftFixture = {
  id: string;
  title: string;
  dayKey: string;
  startAt: string;
  endAt: string;
};

type VisibleWeekFixture = {
  start: string;
  endExclusive: string;
  dayKeys: string[];
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

export const seededSchedule = {
  visibleWeek: {
    start: '2026-04-13',
    endExclusive: '2026-04-20',
    dayKeys: ['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18', '2026-04-19']
  },
  series: {
    alphaOpeningSweep: 'aaaaaaaa-5555-1111-1111-111111111111'
  },
  shifts: {
    morningIntake: {
      id: 'aaaaaaaa-6666-1111-1111-111111111111',
      title: 'Morning intake',
      dayKey: '2026-04-15',
      startAt: '2026-04-15T09:00:00Z',
      endAt: '2026-04-15T11:00:00Z'
    },
    afternoonHandoff: {
      id: 'aaaaaaaa-6666-1111-1111-222222222222',
      title: 'Afternoon handoff',
      dayKey: '2026-04-15',
      startAt: '2026-04-15T13:00:00Z',
      endAt: '2026-04-15T15:00:00Z'
    },
    kitchenPrep: {
      id: 'aaaaaaaa-7777-1111-1111-111111111111',
      title: 'Kitchen prep',
      dayKey: '2026-04-16',
      startAt: '2026-04-16T12:00:00Z',
      endAt: '2026-04-16T14:00:00Z'
    },
    supplierCall: {
      id: 'aaaaaaaa-7777-1111-1111-222222222222',
      title: 'Supplier call',
      dayKey: '2026-04-16',
      startAt: '2026-04-16T13:00:00Z',
      endAt: '2026-04-16T15:00:00Z'
    },
    alphaOpeningSweepWednesday: {
      id: 'aaaaaaaa-8888-1111-1111-333333333333',
      title: 'Alpha opening sweep',
      dayKey: '2026-04-15',
      startAt: '2026-04-15T08:30:00Z',
      endAt: '2026-04-15T09:00:00Z'
    },
    alphaOpeningSweepThursday: {
      id: 'aaaaaaaa-8888-1111-1111-444444444444',
      title: 'Alpha opening sweep',
      dayKey: '2026-04-16',
      startAt: '2026-04-16T08:30:00Z',
      endAt: '2026-04-16T09:00:00Z'
    }
  },
  recurringCreate: {
    title: 'Recurring coverage drill',
    startLocal: '2026-04-17T10:00',
    endLocal: '2026-04-17T11:30',
    cadence: 'daily',
    repeatCount: '3',
    expectedDayKeys: ['2026-04-17', '2026-04-18', '2026-04-19']
  },
  editExpectation: {
    shiftId: 'aaaaaaaa-6666-1111-1111-111111111111',
    nextTitle: 'Morning intake revised',
    nextStartLocal: '2026-04-15T09:30',
    nextEndLocal: '2026-04-15T11:30'
  },
  moveExpectation: {
    shiftId: 'aaaaaaaa-7777-1111-1111-222222222222',
    title: 'Supplier call',
    fromDayKey: '2026-04-16',
    toDayKey: '2026-04-17',
    nextStartLocal: '2026-04-17T15:00',
    nextEndLocal: '2026-04-17T17:00'
  },
  deleteExpectation: {
    shiftId: 'aaaaaaaa-6666-1111-1111-222222222222',
    title: 'Afternoon handoff',
    dayKey: '2026-04-15'
  }
} as const satisfies {
  visibleWeek: VisibleWeekFixture;
  series: Record<string, string>;
  shifts: Record<string, SeededShiftFixture>;
  recurringCreate: {
    title: string;
    startLocal: string;
    endLocal: string;
    cadence: 'daily' | 'weekly' | 'monthly';
    repeatCount: string;
    expectedDayKeys: string[];
  };
  editExpectation: {
    shiftId: string;
    nextTitle: string;
    nextStartLocal: string;
    nextEndLocal: string;
  };
  moveExpectation: {
    shiftId: string;
    title: string;
    fromDayKey: string;
    toDayKey: string;
    nextStartLocal: string;
    nextEndLocal: string;
  };
  deleteExpectation: {
    shiftId: string;
    title: string;
    dayKey: string;
  };
};

async function readFlowSurfaceSnapshot(page: Page): Promise<FlowSurfaceSnapshot> {
  return page.evaluate(() => {
    const text = (selector: string) => document.querySelector<HTMLElement>(selector)?.textContent?.trim() ?? null;
    const texts = (selector: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
        .map((element) => element.textContent?.trim() ?? '')
        .filter(Boolean);

    return {
      navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : null,
      runtimeIsolationState: document.querySelector<HTMLElement>('[data-testid="offline-runtime-surface"]')?.dataset.crossOriginIsolated ?? null,
      serviceWorkerStatus: document.querySelector<HTMLElement>('[data-testid="offline-runtime-surface"]')?.dataset.serviceWorkerStatus ?? null,
      serviceWorkerDetail: document.querySelector<HTMLElement>('[data-testid="offline-runtime-surface"]')?.dataset.serviceWorkerDetail ?? null,
      calendarRouteMode: text('[data-testid="calendar-route-state"] strong'),
      calendarRouteReason: text('[data-testid="calendar-route-state"] code'),
      calendarRouteDetail: text('[data-testid="calendar-route-state"] p'),
      localNetwork: text('[data-testid="calendar-local-state"] strong'),
      localQueueSummary: text('[data-testid="calendar-local-state"] code'),
      localStateDetail: text('[data-testid="calendar-local-state"] p'),
      realtimeChannelState:
        document.querySelector<HTMLElement>('[data-testid="calendar-realtime-state"]')?.dataset.channelState ??
        text('[data-testid="calendar-realtime-state"] strong'),
      realtimeRefreshState:
        document.querySelector<HTMLElement>('[data-testid="calendar-realtime-state"]')?.dataset.remoteRefreshState ?? null,
      realtimeDetail: text('[data-testid="calendar-realtime-state"] p:last-of-type'),
      realtimeReason: text('[data-testid="calendar-realtime-state"] code:last-of-type'),
      boardRealtimeChannelState:
        document.querySelector<HTMLElement>('[data-testid="board-realtime-diagnostics"]')?.dataset.channelState ??
        text('[data-testid="board-realtime-diagnostics"] strong'),
      boardRealtimeRefreshState:
        document.querySelector<HTMLElement>('[data-testid="board-realtime-diagnostics"]')?.dataset.remoteRefreshState ?? null,
      boardRealtimeDetail: text('[data-testid="board-realtime-diagnostics"] p:last-of-type'),
      boardRealtimeReason: text('[data-testid="board-realtime-diagnostics"] code:last-of-type'),
      cachedSnapshotAt: text('.status-stack article:nth-of-type(5) strong') ?? text('.status-stack article:nth-of-type(4) strong'),
      boardMetaBadges: texts('[data-testid="calendar-week-board"] .calendar-week-board__meta .pill'),
      actionReasons: texts('[data-testid="schedule-action-strip"] article strong'),
      actionSummaries: texts('[data-testid="schedule-action-strip"] article p'),
      deniedReason: text('[data-testid="access-denied-state"] .denied-meta div:nth-of-type(2) strong'),
      deniedFailurePhase: text('[data-testid="access-denied-state"] .denied-meta div:nth-of-type(1) strong'),
      deniedAttemptedId: text('[data-testid="access-denied-state"] .denied-meta div:nth-of-type(3) code')
    } satisfies FlowSurfaceSnapshot;
  });
}

class FlowDiagnostics {
  private readonly phases: FlowPhase[] = [];
  private readonly consoleErrors: string[] = [];
  private readonly pageErrors: string[] = [];
  private readonly failedResponses: FailedResponse[] = [];
  private context: FlowContext = {
    calendarId: null,
    visibleWeekStart: null,
    visibleWeekEndExclusive: null,
    focusShiftIds: [],
    note: null,
    navigatorOnline: null,
    runtimeIsolationState: null,
    serviceWorkerStatus: null,
    serviceWorkerDetail: null,
    calendarRouteMode: null,
    calendarRouteReason: null,
    calendarRouteDetail: null,
    localNetwork: null,
    localQueueSummary: null,
    localStateDetail: null,
    realtimeChannelState: null,
    realtimeRefreshState: null,
    realtimeDetail: null,
    realtimeReason: null,
    boardRealtimeChannelState: null,
    boardRealtimeRefreshState: null,
    boardRealtimeDetail: null,
    boardRealtimeReason: null,
    cachedSnapshotAt: null,
    boardMetaBadges: [],
    actionReasons: [],
    actionSummaries: [],
    deniedReason: null,
    deniedFailurePhase: null,
    deniedAttemptedId: null
  };

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

  setContext(patch: Partial<FlowContext>) {
    this.context = {
      ...this.context,
      ...patch,
      focusShiftIds: patch.focusShiftIds ?? this.context.focusShiftIds,
      boardMetaBadges: patch.boardMetaBadges ?? this.context.boardMetaBadges,
      actionReasons: patch.actionReasons ?? this.context.actionReasons,
      actionSummaries: patch.actionSummaries ?? this.context.actionSummaries
    };
  }

  async attach() {
    const surfaceSnapshot = await readFlowSurfaceSnapshot(this.page).catch(() => null);
    const payload = {
      currentPhase: this.phases.at(-1)?.phase ?? 'not-started',
      currentDetail: this.phases.at(-1)?.detail ?? null,
      phases: this.phases,
      currentUrl: this.page.url(),
      fixtures: {
        users: seededUsers,
        joinCodes: seededJoinCodes,
        calendars: seededCalendars,
        schedule: seededSchedule
      },
      context: this.context,
      surfaceSnapshot,
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

export async function readVisibleWeekFromBoard(page: Page) {
  const board = page.getByTestId('calendar-week-board');
  await expect(board).toBeVisible();

  const visibleWeekStart = await board.getAttribute('data-visible-week-start');
  const visibleWeekEndExclusive = await board.getAttribute('data-visible-week-end');

  return {
    visibleWeekStart,
    visibleWeekEndExclusive
  };
}

export async function openCalendarWeek(params: {
  page: Page;
  flow: FlowDiagnostics;
  calendarId: string;
  visibleWeekStart?: string;
  focusShiftIds?: string[];
  phase?: string;
}) {
  const { page, flow, calendarId, visibleWeekStart = seededSchedule.visibleWeek.start, focusShiftIds = [], phase } = params;
  const targetUrl = `/calendars/${calendarId}?start=${visibleWeekStart}`;

  flow.mark(phase ?? 'open-calendar', targetUrl);
  flow.setContext({
    calendarId,
    visibleWeekStart,
    visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
    focusShiftIds,
    note: `calendar route ${targetUrl}`
  });

  try {
    await page.goto(targetUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('net::ERR_ABORTED')) {
      throw error;
    }

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-week-board')).toBeVisible();

  const boardWeek = await readVisibleWeekFromBoard(page);
  expect(boardWeek.visibleWeekStart).toBe(visibleWeekStart);
  expect(boardWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

  await syncCalendarFlowContext(page, flow, {
    calendarId,
    visibleWeekStart: boardWeek.visibleWeekStart,
    visibleWeekEndExclusive: boardWeek.visibleWeekEndExclusive,
    focusShiftIds,
    note: `calendar route ${targetUrl}`
  });
}

export async function expectRuntimeSurfaceReady(page: Page) {
  const runtimeSurface = page.getByTestId('offline-runtime-surface');

  await expect(runtimeSurface).toBeVisible();
  await expect(runtimeSurface).toHaveAttribute('data-offline-proof-surface', 'service-worker-preview');
  await expect
    .poll(
      async () => runtimeSurface.getAttribute('data-service-worker-status'),
      {
        timeout: 15_000,
        message: 'expected the service worker registration to reach an installable or ready state'
      }
    )
    .toMatch(/installed|ready/);

  return runtimeSurface;
}

export async function syncCalendarFlowContext(page: Page, flow: FlowDiagnostics, patch: Partial<FlowContext> = {}) {
  const snapshot = await readFlowSurfaceSnapshot(page);
  flow.setContext({
    ...snapshot,
    ...patch,
    boardMetaBadges: patch.boardMetaBadges ?? snapshot.boardMetaBadges,
    actionReasons: patch.actionReasons ?? snapshot.actionReasons,
    actionSummaries: patch.actionSummaries ?? snapshot.actionSummaries
  });
  return snapshot;
}

export async function setBrowserOffline(page: Page, flow: FlowDiagnostics, offline: boolean, note?: string) {
  flow.mark(offline ? 'offline-transition' : 'online-transition', note);
  await page.context().setOffline(offline);
  await expect
    .poll(
      async () => page.evaluate(() => navigator.onLine),
      {
        timeout: 10_000,
        message: `expected navigator.onLine to become ${offline ? 'false' : 'true'}`
      }
    )
    .toBe(!offline);
  await syncCalendarFlowContext(page, flow, {
    note: note ?? (offline ? 'browser context forced offline' : 'browser context restored online')
  });
}
