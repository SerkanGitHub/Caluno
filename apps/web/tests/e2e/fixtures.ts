import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Locator,
  type Page,
  type TestInfo
} from '@playwright/test';

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
  syncPhase: string | null;
  syncDetail: string | null;
  syncLastAttempt: string | null;
  syncLastErrorReason: string | null;
  syncLastErrorDetail: string | null;
  realtimeChannelState: string | null;
  realtimeRefreshState: string | null;
  realtimeDetail: string | null;
  realtimeReason: string | null;
  boardSyncPhase: string | null;
  boardSyncDetail: string | null;
  boardSyncLastAttempt: string | null;
  boardSyncErrorReason: string | null;
  boardSyncErrorDetail: string | null;
  boardSourceBadge: string | null;
  boardRealtimeChannelState: string | null;
  boardRealtimeRefreshState: string | null;
  boardRealtimeDetail: string | null;
  boardRealtimeReason: string | null;
  localWriteFailureReason: string | null;
  localWriteFailureDetail: string | null;
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
  | 'syncPhase'
  | 'syncDetail'
  | 'syncLastAttempt'
  | 'syncLastErrorReason'
  | 'syncLastErrorDetail'
  | 'realtimeChannelState'
  | 'realtimeRefreshState'
  | 'realtimeDetail'
  | 'realtimeReason'
  | 'boardSyncPhase'
  | 'boardSyncDetail'
  | 'boardSyncLastAttempt'
  | 'boardSyncErrorReason'
  | 'boardSyncErrorDetail'
  | 'boardSourceBadge'
  | 'boardRealtimeChannelState'
  | 'boardRealtimeRefreshState'
  | 'boardRealtimeDetail'
  | 'boardRealtimeReason'
  | 'localWriteFailureReason'
  | 'localWriteFailureDetail'
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
  alphaCollaborator: {
    email: 'dana@example.com',
    password: 'password123',
    displayName: 'Dana Multi-Group',
    expectedGroups: ['Alpha Team', 'Beta Team']
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
    const firstOrNull = (values: string[]) => values[0] ?? null;
    const lastOrNull = (values: string[]) => (values.length > 0 ? values[values.length - 1] : null);
    const secondParagraphOrNull = (values: string[]) => (values.length > 1 ? values[values.length - 1] : null);

    const syncParagraphs = texts('[data-testid="calendar-sync-state"] p');
    const syncCodes = texts('[data-testid="calendar-sync-state"] code');
    const realtimeParagraphs = texts('[data-testid="calendar-realtime-state"] p');
    const realtimeCodes = texts('[data-testid="calendar-realtime-state"] code');
    const boardSyncParagraphs = texts('[data-testid="board-sync-diagnostics"] p');
    const boardSyncCodes = texts('[data-testid="board-sync-diagnostics"] code');
    const boardRealtimeParagraphs = texts('[data-testid="board-realtime-diagnostics"] p');
    const boardRealtimeCodes = texts('[data-testid="board-realtime-diagnostics"] code');
    const boardMetaBadges = texts('[data-testid="calendar-week-board"] .calendar-week-board__meta .pill');

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
      syncPhase: text('[data-testid="calendar-sync-state"] strong'),
      syncDetail: firstOrNull(syncParagraphs),
      syncLastAttempt: firstOrNull(syncCodes),
      syncLastErrorReason: syncCodes.length > 1 ? lastOrNull(syncCodes) : null,
      syncLastErrorDetail: secondParagraphOrNull(syncParagraphs),
      realtimeChannelState:
        document.querySelector<HTMLElement>('[data-testid="calendar-realtime-state"]')?.dataset.channelState ??
        text('[data-testid="calendar-realtime-state"] strong'),
      realtimeRefreshState:
        document.querySelector<HTMLElement>('[data-testid="calendar-realtime-state"]')?.dataset.remoteRefreshState ?? null,
      realtimeDetail: lastOrNull(realtimeParagraphs),
      realtimeReason: lastOrNull(realtimeCodes),
      boardSyncPhase: text('[data-testid="board-sync-diagnostics"] strong'),
      boardSyncDetail: firstOrNull(boardSyncParagraphs),
      boardSyncLastAttempt: firstOrNull(boardSyncCodes),
      boardSyncErrorReason: boardSyncCodes.length > 1 ? lastOrNull(boardSyncCodes) : null,
      boardSyncErrorDetail: secondParagraphOrNull(boardSyncParagraphs),
      boardSourceBadge: firstOrNull(boardMetaBadges),
      boardRealtimeChannelState:
        document.querySelector<HTMLElement>('[data-testid="board-realtime-diagnostics"]')?.dataset.channelState ??
        text('[data-testid="board-realtime-diagnostics"] strong'),
      boardRealtimeRefreshState:
        document.querySelector<HTMLElement>('[data-testid="board-realtime-diagnostics"]')?.dataset.remoteRefreshState ?? null,
      boardRealtimeDetail: lastOrNull(boardRealtimeParagraphs),
      boardRealtimeReason: lastOrNull(boardRealtimeCodes),
      localWriteFailureReason: text('[data-testid="local-write-failure"] strong'),
      localWriteFailureDetail: text('[data-testid="local-write-failure"] p'),
      cachedSnapshotAt: text('.status-stack article:nth-of-type(5) strong') ?? text('.status-stack article:nth-of-type(4) strong'),
      boardMetaBadges,
      actionReasons: texts('[data-testid="schedule-action-strip"] article strong'),
      actionSummaries: texts('[data-testid="schedule-action-strip"] article p'),
      deniedReason: text('[data-testid="access-denied-state"] .denied-meta div:nth-of-type(2) strong'),
      deniedFailurePhase: text('[data-testid="access-denied-state"] .denied-meta div:nth-of-type(1) strong'),
      deniedAttemptedId: text('[data-testid="access-denied-state"] .denied-meta div:nth-of-type(3) code')
    } satisfies FlowSurfaceSnapshot;
  });
}

function safePageUrl(page: Page): string | null {
  try {
    return page.url();
  } catch {
    return null;
  }
}

export class FlowDiagnostics {
  private readonly phases: FlowPhase[] = [];
  private readonly consoleErrors: string[] = [];
  private readonly pageErrors: string[] = [];
  private readonly failedResponses: FailedResponse[] = [];
  private attached = false;
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
    syncPhase: null,
    syncDetail: null,
    syncLastAttempt: null,
    syncLastErrorReason: null,
    syncLastErrorDetail: null,
    realtimeChannelState: null,
    realtimeRefreshState: null,
    realtimeDetail: null,
    realtimeReason: null,
    boardSyncPhase: null,
    boardSyncDetail: null,
    boardSyncLastAttempt: null,
    boardSyncErrorReason: null,
    boardSyncErrorDetail: null,
    boardSourceBadge: null,
    boardRealtimeChannelState: null,
    boardRealtimeRefreshState: null,
    boardRealtimeDetail: null,
    boardRealtimeReason: null,
    localWriteFailureReason: null,
    localWriteFailureDetail: null,
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
    private readonly testInfo: TestInfo,
    private readonly attachmentName = 'flow-diagnostics'
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
    if (this.attached) {
      return;
    }

    this.attached = true;

    const surfaceSnapshot = await readFlowSurfaceSnapshot(this.page).catch(() => null);
    const payload = {
      currentPhase: this.phases.at(-1)?.phase ?? 'not-started',
      currentDetail: this.phases.at(-1)?.detail ?? null,
      phases: this.phases,
      currentUrl: safePageUrl(this.page),
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

    await this.testInfo.attach(this.attachmentName, {
      body: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'),
      contentType: 'application/json'
    });
  }
}

export function createFlowDiagnostics(page: Page, testInfo: TestInfo, attachmentName = 'flow-diagnostics') {
  return new FlowDiagnostics(page, testInfo, attachmentName);
}

export const test = base.extend<{ flow: FlowDiagnostics }>({
  flow: async ({ page }, use, testInfo) => {
    const flow = createFlowDiagnostics(page, testInfo);
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

  const runtimeSurface = page.getByTestId('offline-runtime-surface');
  if ((await runtimeSurface.count()) > 0) {
    await expect(runtimeSurface).toBeVisible();
    await expect
      .poll(
        async () => runtimeSurface.getAttribute('data-service-worker-status'),
        {
          timeout: 10_000,
          message: 'expected the shared layout runtime surface to finish its initial service-worker transition before typing credentials'
        }
      )
      .not.toBe('registering');
  }

  await expect(page.getByRole('button', { name: 'Request trusted session' })).toBeEnabled();
  await page.waitForTimeout(300);

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  await emailInput.fill(user.email);
  await expect(emailInput).toHaveValue(user.email);
  await passwordInput.fill(user.password);
  await expect(passwordInput).toHaveValue(user.password);
  await expect(emailInput).toHaveValue(user.email);

  await passwordInput.press('Enter');
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

async function readStateText(page: Page, testId: string, selector: string) {
  const locator = page.getByTestId(testId).locator(selector).first();
  if ((await locator.count()) === 0) {
    return null;
  }

  return (await locator.textContent())?.trim() ?? null;
}

export async function waitForQueueSummary(page: Page, expectedSummary: string | RegExp, timeout = 20_000) {
  const message = `expected queue summary to become ${String(expectedSummary)}`;

  if (expectedSummary instanceof RegExp) {
    await expect
      .poll(async () => (await readStateText(page, 'calendar-local-state', 'code')) ?? '', {
        timeout,
        message
      })
      .toMatch(expectedSummary);
    return;
  }

  await expect
    .poll(async () => await readStateText(page, 'calendar-local-state', 'code'), {
      timeout,
      message
    })
    .toBe(expectedSummary);
}

export async function waitForSyncAttempt(page: Page, timeout = 20_000) {
  await expect
    .poll(async () => (await readStateText(page, 'calendar-sync-state', 'code')) ?? '', {
      timeout,
      message: 'expected reconnect diagnostics to record a last-attempt marker'
    })
    .not.toBe('No reconnect attempt yet');
}

export async function waitForSyncPhase(page: Page, expectedPhase: string | RegExp, timeout = 20_000) {
  const message = `expected sync phase to become ${String(expectedPhase)}`;

  if (expectedPhase instanceof RegExp) {
    await expect
      .poll(async () => (await readStateText(page, 'calendar-sync-state', 'strong')) ?? '', {
        timeout,
        message
      })
      .toMatch(expectedPhase);
    return;
  }

  await expect
    .poll(async () => await readStateText(page, 'calendar-sync-state', 'strong'), {
      timeout,
      message
    })
    .toBe(expectedPhase);
}

export async function waitForRealtimeChannelReady(page: Page, timeout = 20_000) {
  await expect
    .poll(async () => page.getByTestId('calendar-realtime-state').getAttribute('data-channel-state'), {
      timeout,
      message: 'expected the realtime channel state to reach ready'
    })
    .toBe('ready');
}

export async function waitForRemoteRefreshApplied(page: Page, timeout = 20_000) {
  await expect
    .poll(async () => page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'), {
      timeout,
      message: 'expected realtime diagnostics to confirm a trusted refresh was applied'
    })
    .toBe('applied');
}

export async function createTrackedSession(params: {
  browser: Browser;
  testInfo: TestInfo;
  attachmentName: string;
  contextOptions?: BrowserContextOptions;
}): Promise<{
  context: BrowserContext;
  page: Page;
  flow: FlowDiagnostics;
  close: () => Promise<void>;
}> {
  const configuredBaseURL = params.testInfo.project.use.baseURL;
  const baseURL = typeof configuredBaseURL === 'string' ? configuredBaseURL : undefined;
  const context = await params.browser.newContext({
    baseURL,
    ...(params.contextOptions ?? {})
  });
  const page = await context.newPage();
  const flow = createFlowDiagnostics(page, params.testInfo, params.attachmentName);
  flow.mark('session-start', params.attachmentName);

  let closed = false;

  return {
    context,
    page,
    flow,
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await flow.attach().catch(() => undefined);
      await context.close();
    }
  };
}

export async function openTrackedCalendarSession(params: {
  browser: Browser;
  testInfo: TestInfo;
  attachmentName: string;
  user: SeededUser;
  calendarId: string;
  visibleWeekStart?: string;
  focusShiftIds?: string[];
  contextOptions?: BrowserContextOptions;
}): Promise<{
  context: BrowserContext;
  page: Page;
  flow: FlowDiagnostics;
  close: () => Promise<void>;
}> {
  const session = await createTrackedSession({
    browser: params.browser,
    testInfo: params.testInfo,
    attachmentName: params.attachmentName,
    contextOptions: params.contextOptions
  });

  try {
    session.flow.mark('login', params.user.email);
    await signInThroughUi(session.page, params.user);
    await openCalendarWeek({
      page: session.page,
      flow: session.flow,
      calendarId: params.calendarId,
      visibleWeekStart: params.visibleWeekStart,
      focusShiftIds: params.focusShiftIds,
      phase: 'open-calendar-session'
    });
    await syncCalendarFlowContext(session.page, session.flow, {
      calendarId: params.calendarId,
      visibleWeekStart: params.visibleWeekStart ?? seededSchedule.visibleWeek.start,
      visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
      focusShiftIds: params.focusShiftIds ?? [],
      note: `${params.attachmentName} opened a trusted calendar session`
    });

    return session;
  } catch (error) {
    await session.close();
    throw error;
  }
}

export async function submitShiftEditorForm(
  editor: Locator,
  values: {
    title?: string;
    startAt?: string;
    endAt?: string;
    recurrenceCadence?: '' | 'daily' | 'weekly' | 'monthly';
    repeatCount?: string;
    repeatUntil?: string;
  }
) {
  const isOpen = await editor.evaluate((element) => (element instanceof HTMLDetailsElement ? element.open : true));
  if (!isOpen) {
    await editor.locator('summary').click();
  }

  const form = editor.locator('form');

  await form.evaluate((formElement, nextValues) => {
    if (!(formElement instanceof HTMLFormElement)) {
      throw new Error('Shift editor form element not found.');
    }

    const setTextInput = (selector: string, value: string) => {
      const input = formElement.querySelector(selector);
      if (!(input instanceof HTMLInputElement)) {
        throw new Error(`Missing input for selector: ${selector}`);
      }

      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (typeof nextValues.title === 'string') {
      setTextInput('input[name="title"]', nextValues.title);
    }

    if (typeof nextValues.startAt === 'string') {
      setTextInput('input[name="startAt"]', nextValues.startAt);
    }

    if (typeof nextValues.endAt === 'string') {
      setTextInput('input[name="endAt"]', nextValues.endAt);
    }

    if (typeof nextValues.repeatCount === 'string') {
      setTextInput('input[name="repeatCount"]', nextValues.repeatCount);
    }

    if (typeof nextValues.repeatUntil === 'string') {
      setTextInput('input[name="repeatUntil"]', nextValues.repeatUntil);
    }

    if (typeof nextValues.recurrenceCadence === 'string') {
      const radios = Array.from(formElement.querySelectorAll('input[name="recurrenceCadence"]')).filter(
        (candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement
      );
      const radio = radios.find((candidate) => candidate.value === nextValues.recurrenceCadence);
      if (!radio) {
        throw new Error(`Missing recurrence radio for value: ${nextValues.recurrenceCadence}`);
      }

      for (const candidate of radios) {
        candidate.checked = candidate.value === nextValues.recurrenceCadence;
      }

      radio.dispatchEvent(new Event('input', { bubbles: true }));
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }

    formElement.requestSubmit();
  }, values);
}
