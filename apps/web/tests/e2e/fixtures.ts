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

type FlowDayConflictSnapshot = {
  dayKey: string;
  label: string;
  detail: string;
  pairCount: number;
  shiftCount: number;
};

type FlowShiftConflictSnapshot = {
  shiftId: string;
  label: string;
  detail: string;
  overlapCount: number;
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
  localQueueState: string | null;
  localSnapshotStatus: string | null;
  localSnapshotAt: string | null;
  localSnapshotOrigin: string | null;
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
  boardConflictLabel: string | null;
  boardConflictDetail: string | null;
  boardConflictDayCount: number | null;
  boardConflictShiftCount: number | null;
  boardConflictPairCount: number | null;
  dayConflicts: FlowDayConflictSnapshot[];
  shiftConflicts: FlowShiftConflictSnapshot[];
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
  | 'localQueueState'
  | 'localSnapshotStatus'
  | 'localSnapshotAt'
  | 'localSnapshotOrigin'
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
  | 'boardConflictLabel'
  | 'boardConflictDetail'
  | 'boardConflictDayCount'
  | 'boardConflictShiftCount'
  | 'boardConflictPairCount'
  | 'dayConflicts'
  | 'shiftConflicts'
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
    const count = (element: Element | null, attribute: string) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const raw = element.getAttribute(attribute);
      if (!raw) {
        return null;
      }

      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const dayConflicts = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="day-conflict-summary-"]')).map(
      (element) => ({
        dayKey: element.getAttribute('data-testid')?.replace('day-conflict-summary-', '') ?? 'unknown-day',
        label: element.querySelector('strong')?.textContent?.trim() ?? '',
        detail: element.querySelector('p')?.textContent?.trim() ?? '',
        pairCount: count(element, 'data-conflict-pairs') ?? 0,
        shiftCount: count(element, 'data-conflict-shifts') ?? 0
      }) satisfies FlowDayConflictSnapshot
    );
    const shiftConflicts = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="shift-conflict-summary-"]')).map(
      (element) => ({
        shiftId: element.getAttribute('data-testid')?.replace('shift-conflict-summary-', '') ?? 'unknown-shift',
        label: element.querySelector('strong')?.textContent?.trim() ?? '',
        detail: element.querySelector('p')?.textContent?.trim() ?? '',
        overlapCount: count(element, 'data-conflict-overlaps') ?? 0
      }) satisfies FlowShiftConflictSnapshot
    );

    const syncParagraphs = texts('[data-testid="calendar-sync-state"] p');
    const syncCodes = texts('[data-testid="calendar-sync-state"] code');
    const realtimeParagraphs = texts('[data-testid="calendar-realtime-state"] p');
    const realtimeCodes = texts('[data-testid="calendar-realtime-state"] code');
    const boardSyncParagraphs = texts('[data-testid="board-sync-diagnostics"] p');
    const boardSyncCodes = texts('[data-testid="board-sync-diagnostics"] code');
    const boardRealtimeParagraphs = texts('[data-testid="board-realtime-diagnostics"] p');
    const boardRealtimeCodes = texts('[data-testid="board-realtime-diagnostics"] code');
    const boardMetaBadges = texts('[data-testid="calendar-week-board"] .calendar-week-board__meta .pill');
    const boardConflictSummary = document.querySelector<HTMLElement>('[data-testid="board-conflict-summary"]');

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
      localQueueState: document.querySelector<HTMLElement>('[data-testid="calendar-local-state"]')?.dataset.queueState ?? null,
      localSnapshotStatus: document.querySelector<HTMLElement>('[data-testid="calendar-local-state"]')?.dataset.snapshotStatus ?? null,
      localSnapshotAt: document.querySelector<HTMLElement>('[data-testid="calendar-local-state"]')?.dataset.snapshotAt ?? null,
      localSnapshotOrigin: document.querySelector<HTMLElement>('[data-testid="calendar-local-state"]')?.dataset.snapshotOrigin ?? null,
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
      boardConflictLabel: boardConflictSummary?.querySelector('strong')?.textContent?.trim() ?? null,
      boardConflictDetail: boardConflictSummary?.querySelector('p')?.textContent?.trim() ?? null,
      boardConflictDayCount: count(boardConflictSummary, 'data-conflict-days'),
      boardConflictShiftCount: count(boardConflictSummary, 'data-conflict-shifts'),
      boardConflictPairCount: count(boardConflictSummary, 'data-conflict-pairs'),
      dayConflicts,
      shiftConflicts,
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
    localQueueState: null,
    localSnapshotStatus: null,
    localSnapshotAt: null,
    localSnapshotOrigin: null,
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
    boardConflictLabel: null,
    boardConflictDetail: null,
    boardConflictDayCount: null,
    boardConflictShiftCount: null,
    boardConflictPairCount: null,
    dayConflicts: [],
    shiftConflicts: [],
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
      dayConflicts: patch.dayConflicts ?? this.context.dayConflicts,
      shiftConflicts: patch.shiftConflicts ?? this.context.shiftConflicts,
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
  const expectedVisibleWeekEndExclusive = addUtcDays(visibleWeekStart, 7);
  const targetUrl = `/calendars/${calendarId}?start=${visibleWeekStart}`;

  flow.mark(phase ?? 'open-calendar', targetUrl);
  flow.setContext({
    calendarId,
    visibleWeekStart,
    visibleWeekEndExclusive: expectedVisibleWeekEndExclusive,
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

  const routeState = page.getByTestId('calendar-route-state');
  if ((await routeState.count()) > 0 && ((await routeState.textContent()) ?? '').includes('trusted-online')) {
    const localState = page.getByTestId('calendar-local-state');
    if ((await localState.count()) > 0) {
      await waitForLocalSnapshotStatus(page, 'ready');
    }
  }

  const boardWeek = await readVisibleWeekFromBoard(page);
  expect(boardWeek.visibleWeekStart).toBe(visibleWeekStart);
  expect(boardWeek.visibleWeekEndExclusive).toBe(expectedVisibleWeekEndExclusive);

  await syncCalendarFlowContext(page, flow, {
    calendarId,
    visibleWeekStart: boardWeek.visibleWeekStart,
    visibleWeekEndExclusive: boardWeek.visibleWeekEndExclusive,
    focusShiftIds,
    note: `calendar route ${targetUrl}`
  });
}

function addUtcDays(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
    dayConflicts: patch.dayConflicts ?? snapshot.dayConflicts,
    shiftConflicts: patch.shiftConflicts ?? snapshot.shiftConflicts,
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

export type VisibleShiftCardIdentityKind = 'any' | 'local' | 'server';

export type VisibleShiftCardIdentity = {
  shiftId: string;
  testId: string;
  locator: Locator;
};

export function findVisibleShiftCards(params: {
  page: Page;
  title: string;
  dayKey?: string;
  windowLabel?: string;
}) {
  const scope = params.dayKey ? params.page.getByTestId(`day-column-${params.dayKey}`) : params.page.locator('main');
  let locator = scope.locator('[data-testid^="shift-card-"]').filter({ hasText: params.title });

  if (params.windowLabel) {
    locator = locator.filter({ hasText: params.windowLabel });
  }

  return locator;
}

function matchesVisibleShiftCardIdentityKind(shiftId: string, kind: VisibleShiftCardIdentityKind) {
  if (kind === 'any') {
    return true;
  }

  return kind === 'local' ? shiftId.startsWith('local-') : !shiftId.startsWith('local-');
}

export async function resolveVisibleShiftCardIdentity(params: {
  page: Page;
  title: string;
  dayKey?: string;
  windowLabel?: string;
  idKind?: VisibleShiftCardIdentityKind;
  timeout?: number;
}): Promise<VisibleShiftCardIdentity> {
  const timeout = params.timeout ?? 20_000;
  const idKind = params.idKind ?? 'any';
  const scope = params.dayKey ? params.page.getByTestId(`day-column-${params.dayKey}`) : params.page.locator('main');

  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeout) {
    const candidates = scope.locator('[data-testid^="shift-card-"]');
    const candidateCount = await candidates.count();

    for (let index = 0; index < candidateCount; index += 1) {
      const locator = candidates.nth(index);
      if (!(await locator.isVisible())) {
        continue;
      }

      const headingText = ((await locator.locator('h3').first().textContent()) ?? '').trim();
      if (headingText !== params.title) {
        continue;
      }

      if (params.windowLabel) {
        const cardText = ((await locator.textContent()) ?? '').trim();
        if (!cardText.includes(params.windowLabel)) {
          continue;
        }
      }

      const testId = await locator.getAttribute('data-testid');
      if (testId?.startsWith('shift-card-')) {
        const shiftId = testId.replace('shift-card-', '');
        if (matchesVisibleShiftCardIdentityKind(shiftId, idKind)) {
          return {
            shiftId,
            testId,
            locator
          };
        }
      }
    }

    await params.page.waitForTimeout(200);
  }

  throw new Error(
    `Expected visible shift card "${params.title}"${params.dayKey ? ` in day ${params.dayKey}` : ''} to expose a ${idKind} id via data-testid${params.windowLabel ? ` with window ${params.windowLabel}` : ''}, but no matching visible card was found before timeout.`
  );
}

export type BoardConflictState = {
  visible: boolean;
  label: string | null;
  detail: string | null;
  dayCount: number | null;
  shiftCount: number | null;
  pairCount: number | null;
};

export type DayConflictState = {
  visible: boolean;
  dayKey: string;
  label: string | null;
  detail: string | null;
  pairCount: number | null;
  shiftCount: number | null;
};

export type ShiftConflictState = {
  visible: boolean;
  shiftId: string;
  label: string | null;
  detail: string | null;
  overlapCount: number | null;
};

async function readCountAttribute(locator: Locator, attribute: string) {
  if ((await locator.count()) === 0) {
    return null;
  }

  const raw = await locator.getAttribute(attribute);
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function readBoardConflictSummary(page: Page): Promise<BoardConflictState> {
  const summary = page.getByTestId('board-conflict-summary');
  if ((await summary.count()) === 0) {
    return {
      visible: false,
      label: null,
      detail: null,
      dayCount: null,
      shiftCount: null,
      pairCount: null
    };
  }

  return {
    visible: await summary.isVisible(),
    label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
    detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
    dayCount: await readCountAttribute(summary, 'data-conflict-days'),
    shiftCount: await readCountAttribute(summary, 'data-conflict-shifts'),
    pairCount: await readCountAttribute(summary, 'data-conflict-pairs')
  };
}

export async function readDayConflictSummary(page: Page, dayKey: string): Promise<DayConflictState> {
  const summary = page.getByTestId(`day-conflict-summary-${dayKey}`);
  if ((await summary.count()) === 0) {
    return {
      visible: false,
      dayKey,
      label: null,
      detail: null,
      pairCount: null,
      shiftCount: null
    };
  }

  return {
    visible: await summary.isVisible(),
    dayKey,
    label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
    detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
    pairCount: await readCountAttribute(summary, 'data-conflict-pairs'),
    shiftCount: await readCountAttribute(summary, 'data-conflict-shifts')
  };
}

export async function readShiftConflictSummary(page: Page, shiftId: string): Promise<ShiftConflictState> {
  const summary = page.getByTestId(`shift-conflict-summary-${shiftId}`);
  if ((await summary.count()) === 0) {
    return {
      visible: false,
      shiftId,
      label: null,
      detail: null,
      overlapCount: null
    };
  }

  return {
    visible: await summary.isVisible(),
    shiftId,
    label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
    detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
    overlapCount: await readCountAttribute(summary, 'data-conflict-overlaps')
  };
}

export async function waitForBoardConflictPairs(page: Page, expectedPairCount: number | null, timeout = 20_000) {
  await expect
    .poll(async () => (await readBoardConflictSummary(page)).pairCount, {
      timeout,
      message:
        expectedPairCount === null
          ? 'expected the board conflict summary to stay absent'
          : `expected the board conflict summary to show ${expectedPairCount} overlap pair(s)`
    })
    .toBe(expectedPairCount);
}

export async function waitForDayConflictPairs(page: Page, dayKey: string, expectedPairCount: number | null, timeout = 20_000) {
  await expect
    .poll(async () => (await readDayConflictSummary(page, dayKey)).pairCount, {
      timeout,
      message:
        expectedPairCount === null
          ? `expected day ${dayKey} to stay conflict-free`
          : `expected day ${dayKey} to show ${expectedPairCount} overlap pair(s)`
    })
    .toBe(expectedPairCount);
}

export async function waitForShiftConflictOverlaps(page: Page, shiftId: string, expectedOverlapCount: number | null, timeout = 20_000) {
  await expect
    .poll(async () => (await readShiftConflictSummary(page, shiftId)).overlapCount, {
      timeout,
      message:
        expectedOverlapCount === null
          ? `expected shift ${shiftId} to stay conflict-free`
          : `expected shift ${shiftId} to show ${expectedOverlapCount} visible overlap(s)`
    })
    .toBe(expectedOverlapCount);
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

export async function waitForLocalSnapshotStatus(page: Page, expectedStatus: 'ready' | 'failed' | 'idle', timeout = 20_000) {
  await expect
    .poll(async () => page.getByTestId('calendar-local-state').getAttribute('data-snapshot-status'), {
      timeout,
      message: `expected local snapshot status to become ${expectedStatus}`
    })
    .toBe(expectedStatus);
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

export type RealtimeDiagnosticsState = {
  channelState: string | null;
  remoteRefreshState: string | null;
  signalSummary: string | null;
  detail: string | null;
  reason: string | null;
};

export async function readRealtimeDiagnosticsState(page: Page): Promise<RealtimeDiagnosticsState> {
  return {
    channelState: await page.getByTestId('calendar-realtime-state').getAttribute('data-channel-state'),
    remoteRefreshState: await page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'),
    signalSummary: await readStateText(page, 'calendar-realtime-state', 'code'),
    detail: await readStateText(page, 'calendar-realtime-state', 'p:last-of-type'),
    reason: await readStateText(page, 'calendar-realtime-state', 'code:last-of-type')
  };
}

export async function waitForRealtimeChannelReady(page: Page, timeout = 20_000) {
  await expect
    .poll(async () => (await readRealtimeDiagnosticsState(page)).channelState, {
      timeout,
      message: 'expected the realtime channel state to reach ready'
    })
    .toBe('ready');
}

export async function waitForRealtimeSignal(page: Page, expectedSignal: string | RegExp = /(INSERT|UPDATE|DELETE) at /, timeout = 20_000) {
  const message = `expected realtime diagnostics to record a shared shift signal matching ${String(expectedSignal)}`;

  if (expectedSignal instanceof RegExp) {
    await expect
      .poll(async () => (await readRealtimeDiagnosticsState(page)).signalSummary ?? '', {
        timeout,
        message
      })
      .toMatch(expectedSignal);
    return;
  }

  await expect
    .poll(async () => (await readRealtimeDiagnosticsState(page)).signalSummary, {
      timeout,
      message
    })
    .toBe(expectedSignal);
}

export async function waitForRemoteRefreshState(
  page: Page,
  expectedState: 'idle' | 'refreshing' | 'applied' | 'failed',
  timeout = 20_000
) {
  await expect
    .poll(async () => (await readRealtimeDiagnosticsState(page)).remoteRefreshState, {
      timeout,
      message: `expected realtime diagnostics to reach remote refresh state ${expectedState}`
    })
    .toBe(expectedState);
}

export async function waitForRemoteRefreshApplied(page: Page, timeout = 20_000) {
  await waitForRemoteRefreshState(page, 'applied', timeout);
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
