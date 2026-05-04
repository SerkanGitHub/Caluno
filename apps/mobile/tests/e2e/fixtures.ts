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

export const seededFindTime = {
  start: '2026-04-15',
  durationMinutes: '60',
  alphaWindowCount: 10,
  topPickCount: 3,
  browseCount: 7,
  topPicks: [
    {
      rank: '1',
      startAt: '2026-04-16T15:00:00.000Z',
      endAt: '2026-04-16T16:00:00.000Z',
      spanStartAt: '2026-04-16T15:00:00.000Z',
      spanEndAt: '2026-05-15T00:00:00.000Z',
      availableMembers: ['Alice Owner', 'Bob Member', 'Dana Multi-Group'],
      blockedMembers: [],
      leadingConstraints: [],
      trailingConstraints: []
    },
    {
      rank: '2',
      startAt: '2026-04-15T15:00:00.000Z',
      endAt: '2026-04-15T16:00:00.000Z',
      spanStartAt: '2026-04-15T15:00:00.000Z',
      spanEndAt: '2026-04-16T08:30:00.000Z',
      availableMembers: ['Alice Owner', 'Bob Member', 'Dana Multi-Group'],
      blockedMembers: [],
      leadingConstraints: [],
      trailingConstraints: []
    },
    {
      rank: '3',
      startAt: '2026-04-15T00:00:00.000Z',
      endAt: '2026-04-15T01:00:00.000Z',
      spanStartAt: '2026-04-15T00:00:00.000Z',
      spanEndAt: '2026-04-15T08:30:00.000Z',
      availableMembers: ['Alice Owner', 'Bob Member', 'Dana Multi-Group'],
      blockedMembers: [],
      leadingConstraints: [],
      trailingConstraints: []
    }
  ],
  focusedBrowseWindow: {
    rank: null,
    startAt: '2026-04-15T08:30:00.000Z',
    endAt: '2026-04-15T09:30:00.000Z',
    spanStartAt: '2026-04-15T08:30:00.000Z',
    spanEndAt: '2026-04-15T11:00:00.000Z',
    availableMembers: ['Bob Member', 'Dana Multi-Group'],
    blockedMembers: ['Alice Owner'],
    leadingConstraints: ['Alice Owner:Alpha opening sweep:0'],
    trailingConstraints: ['Alice Owner:Morning intake:0']
  }
} as const;

export type FindTimeCardSnapshot = {
  rank: string | null;
  startAt: string | null;
  endAt: string | null;
  spanStartAt: string | null;
  spanEndAt: string | null;
  availableMembers: string[];
  blockedMembers: string[];
  leadingConstraints: string[];
  trailingConstraints: string[];
  handoffReady: string | null;
};

export type FindTimeSuggestionCtaSnapshot = {
  href: string | null;
  source: string | null;
  targetWeekStart: string | null;
  startAt: string | null;
  endAt: string | null;
  label: string | null;
};

export type CreateSheetArrivalSnapshot = {
  routePrefillStatus: string | null;
  routePrefillSource: string | null;
  routePrefillStart: string | null;
  routePrefillEnd: string | null;
  open: boolean;
  openOnArrival: string | null;
  createSource: string | null;
  prefillSource: string | null;
  prefillStart: string | null;
  prefillEnd: string | null;
  startValue: string;
  endValue: string;
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const clearedMarker = 'caluno-e2e-cleared=1';
      const connectivityCookieName = 'caluno-e2e-connectivity';
      const reminderSource = 'caluno-shift-reminder';
      const localListeners = new Map<string, Set<(payload: unknown) => void>>();
      const pushListeners = new Map<string, Set<(payload: unknown) => void>>();
      const queuedLocalEvents = new Map<string, unknown[]>();
      const queuedPushEvents = new Map<string, unknown[]>();
      const pendingLocalNotifications = new Map<number, {
        id: number;
        extra: {
          source: string;
          calendarId: string;
          shiftId: string;
          targetPath: string | null;
          triggerAt: string;
        };
        schedule?: { at?: string };
      }>();

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

      try {
        const installationStorageKey = 'CapacitorStorage.caluno.mobile.notification-installation.v1';
        if (!window.localStorage.getItem(installationStorageKey)) {
          window.localStorage.setItem(
            installationStorageKey,
            JSON.stringify({
              installationId: '11111111-1111-4111-8111-111111111111',
              pushToken: null,
              pushProvider: null,
              devicePlatform: null,
              tokenLastRotatedAt: null,
              createdAt: '2026-05-04T10:00:00.000Z',
              updatedAt: '2026-05-04T10:00:00.000Z'
            })
          );
        }
      } catch {
        // ignore notification installation seed failures; the runtime will surface them explicitly
      }

      try {
        const fixedNow = Date.parse('2026-04-15T07:00:00.000Z');
        const RealDate = Date;
        class FixedDate extends RealDate {
          constructor(...args: any[]) {
            if (args.length === 0) {
              super(fixedNow);
              return;
            }

            switch (args.length) {
              case 1:
                super(args[0]);
                break;
              case 2:
                super(args[0], args[1]);
                break;
              case 3:
                super(args[0], args[1], args[2]);
                break;
              case 4:
                super(args[0], args[1], args[2], args[3]);
                break;
              case 5:
                super(args[0], args[1], args[2], args[3], args[4]);
                break;
              case 6:
                super(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
              default:
                super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
                break;
            }
          }

          static now() {
            return fixedNow;
          }
        }

        FixedDate.parse = RealDate.parse;
        FixedDate.UTC = RealDate.UTC;
        Object.setPrototypeOf(FixedDate, RealDate);
        // @ts-expect-error test harness date freeze
        window.Date = FixedDate;
      } catch {
        // ignore date-freeze failures; runtime behavior will remain real-time
      }

      const connectivityMatch = document.cookie.match(/(?:^|;\s*)caluno-e2e-connectivity=(online|offline)\b/);
      const notificationHarnessStorageKey = 'caluno.e2e.notifications.v1';
      let connected = connectivityMatch?.[1] !== 'offline';

      const readNotificationHarnessState = () => {
        try {
          const raw = window.localStorage.getItem(notificationHarnessStorageKey);
          if (!raw) {
            return null;
          }

          const parsed = JSON.parse(raw) as {
            localPermission?: 'prompt' | 'granted' | 'denied';
            pushPermission?: 'prompt' | 'granted' | 'denied';
            pushRegistration?: {
              mode?: 'success' | 'error';
              token?: string;
              error?: string;
            };
          };

          return parsed;
        } catch {
          return null;
        }
      };

      const persistNotificationHarnessState = (value: {
        localPermission: 'prompt' | 'granted' | 'denied';
        pushPermission: 'prompt' | 'granted' | 'denied';
        pushRegistration: {
          mode: 'success' | 'error';
          token: string;
          error: string;
        };
      }) => {
        try {
          window.localStorage.setItem(notificationHarnessStorageKey, JSON.stringify(value));
        } catch {
          // ignore harness persistence failures
        }
      };

      const persistedNotificationState = readNotificationHarnessState();
      let localPermission: 'prompt' | 'granted' | 'denied' = persistedNotificationState?.localPermission ?? 'granted';
      let pushPermission: 'prompt' | 'granted' | 'denied' = persistedNotificationState?.pushPermission ?? 'granted';
      let pushRegistration: {
        mode: 'success' | 'error';
        token: string;
        error: string;
      } = {
        mode: persistedNotificationState?.pushRegistration?.mode ?? 'success',
        token: persistedNotificationState?.pushRegistration?.token ?? 'playwright-push-token',
        error: persistedNotificationState?.pushRegistration?.error ?? 'Simulated push registration failure.'
      };
      persistNotificationHarnessState({
        localPermission,
        pushPermission,
        pushRegistration
      });

      const addListener = (
        registry: Map<string, Set<(payload: unknown) => void>>,
        queue: Map<string, unknown[]>,
        eventName: string,
        listener: (payload: unknown) => void
      ) => {
        const listeners = registry.get(eventName) ?? new Set<(payload: unknown) => void>();
        listeners.add(listener);
        registry.set(eventName, listeners);

        const queued = queue.get(eventName) ?? [];
        if (queued.length > 0) {
          queue.delete(eventName);
          for (const payload of queued) {
            listener(payload);
          }
        }

        return {
          remove: async () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
              registry.delete(eventName);
            }
          }
        };
      };

      const emit = (
        registry: Map<string, Set<(payload: unknown) => void>>,
        queue: Map<string, unknown[]>,
        eventName: string,
        payload: unknown
      ) => {
        const listeners = registry.get(eventName);
        if (!listeners || listeners.size === 0) {
          const queued = queue.get(eventName) ?? [];
          queued.push(payload);
          queue.set(eventName, queued);
          return;
        }

        for (const listener of listeners) {
          listener(payload);
        }
      };

      const localNotificationsPlugin = {
        async checkPermissions() {
          return { display: localPermission };
        },
        async requestPermissions() {
          return { display: localPermission };
        },
        async getPending() {
          return {
            notifications: Array.from(pendingLocalNotifications.values()).sort((left, right) => left.id - right.id)
          };
        },
        async schedule(options: { notifications?: Array<{ id?: number; extra?: Record<string, unknown>; schedule?: { at?: Date | string } }> }) {
          for (const notification of options?.notifications ?? []) {
            if (typeof notification?.id !== 'number' || !notification.extra || typeof notification.extra !== 'object') {
              continue;
            }

            const extra = notification.extra as {
              source?: string;
              calendarId?: string;
              shiftId?: string;
              targetPath?: string | null;
              triggerAt?: string;
            };

            pendingLocalNotifications.set(notification.id, {
              id: notification.id,
              extra: {
                source: typeof extra.source === 'string' ? extra.source : reminderSource,
                calendarId: typeof extra.calendarId === 'string' ? extra.calendarId : 'unknown-calendar',
                shiftId: typeof extra.shiftId === 'string' ? extra.shiftId : 'unknown-shift',
                targetPath: typeof extra.targetPath === 'string' ? extra.targetPath : null,
                triggerAt: typeof extra.triggerAt === 'string' ? extra.triggerAt : new Date().toISOString()
              },
              schedule: {
                at:
                  notification.schedule?.at instanceof Date
                    ? notification.schedule.at.toISOString()
                    : typeof notification.schedule?.at === 'string'
                      ? notification.schedule.at
                      : undefined
              }
            });
          }

          return {};
        },
        async cancel(options: { notifications?: Array<{ id?: number }> }) {
          for (const notification of options?.notifications ?? []) {
            if (typeof notification?.id === 'number') {
              pendingLocalNotifications.delete(notification.id);
            }
          }
        },
        async addListener(eventName: 'localNotificationActionPerformed', listener: (event: unknown) => void) {
          return addListener(localListeners, queuedLocalEvents, eventName, listener);
        }
      };

      const pushNotificationsPlugin = {
        async checkPermissions() {
          return { receive: pushPermission };
        },
        async requestPermissions() {
          return { receive: pushPermission };
        },
        async register() {
          queueMicrotask(() => {
            if (pushPermission !== 'granted') {
              return;
            }

            if (pushRegistration.mode === 'success') {
              emit(pushListeners, queuedPushEvents, 'registration', { value: pushRegistration.token });
              return;
            }

            emit(pushListeners, queuedPushEvents, 'registrationError', { error: pushRegistration.error });
          });
        },
        async addListener(
          eventName: 'registration' | 'registrationError' | 'pushNotificationActionPerformed' | 'pushNotificationReceived',
          listener: (event: unknown) => void
        ) {
          return addListener(pushListeners, queuedPushEvents, eventName, listener);
        }
      };

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

      Object.defineProperty(window, '__calunoE2ENotifications', {
        configurable: true,
        value: {
          localNotificationsPlugin,
          pushNotificationsPlugin
        }
      });

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
          },
          notifications: {
            setLocalPermission(next: 'prompt' | 'granted' | 'denied') {
              localPermission = next;
              persistNotificationHarnessState({
                localPermission,
                pushPermission,
                pushRegistration
              });
            },
            setPushPermission(next: 'prompt' | 'granted' | 'denied') {
              pushPermission = next;
              persistNotificationHarnessState({
                localPermission,
                pushPermission,
                pushRegistration
              });
            },
            setPushRegistration(next: Partial<typeof pushRegistration>) {
              pushRegistration = {
                ...pushRegistration,
                ...next
              };
              persistNotificationHarnessState({
                localPermission,
                pushPermission,
                pushRegistration
              });
            },
            triggerLocalAction(params: {
              actionId?: string;
              notificationId?: number;
              targetPath?: string | null;
              calendarId?: string;
              shiftId?: string;
            }) {
              const notificationId = params.notificationId ?? 9001;
              const payload = {
                actionId: params.actionId ?? 'tap',
                notification: {
                  id: notificationId,
                  extra: {
                    source: reminderSource,
                    calendarId: params.calendarId ?? 'aaaaaaaa-aaaa-1111-1111-111111111111',
                    shiftId: params.shiftId ?? 'eeeeeeee-eeee-4444-8444-444444444444',
                    targetPath: params.targetPath ?? null,
                    triggerAt: new Date().toISOString()
                  }
                }
              };

              emit(localListeners, queuedLocalEvents, 'localNotificationActionPerformed', payload);
            },
            triggerPushAction(params: { actionId?: string; targetPath?: string | null }) {
              emit(pushListeners, queuedPushEvents, 'pushNotificationActionPerformed', {
                actionId: params.actionId ?? 'tap',
                notification: {
                  data: {
                    path: params.targetPath ?? null
                  }
                }
              });
            },
            getPendingLocalNotificationCount() {
              return pendingLocalNotifications.size;
            },
            reset() {
              pendingLocalNotifications.clear();
              localPermission = 'granted';
              pushPermission = 'granted';
              pushRegistration = {
                mode: 'success',
                token: 'playwright-push-token',
                error: 'Simulated push registration failure.'
              };
              persistNotificationHarnessState({
                localPermission,
                pushPermission,
                pushRegistration
              });
            }
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

export async function setSimulatedNotificationPermissions(
  page: Page,
  params: {
    local?: 'prompt' | 'granted' | 'denied';
    push?: 'prompt' | 'granted' | 'denied';
  }
) {
  await page.addInitScript((next) => {
    try {
      const key = 'caluno.e2e.notifications.v1';
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      const pushRegistration =
        parsed && typeof parsed === 'object' && parsed.pushRegistration && typeof parsed.pushRegistration === 'object'
          ? parsed.pushRegistration
          : {
              mode: 'success',
              token: 'playwright-push-token',
              error: 'Simulated push registration failure.'
            };

      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...parsed,
          ...(next.local ? { localPermission: next.local } : {}),
          ...(next.push ? { pushPermission: next.push } : {}),
          pushRegistration
        })
      );
    } catch {
      // ignore future-page harness persistence failures
    }
  }, params);

  if (page.url() === 'about:blank') {
    return;
  }

  await page.evaluate((next) => {
    if (next.local) {
      window.__calunoE2E?.notifications?.setLocalPermission(next.local);
    }

    if (next.push) {
      window.__calunoE2E?.notifications?.setPushPermission(next.push);
    }
  }, params);
}

export async function setSimulatedPushRegistration(
  page: Page,
  params: {
    mode: 'success' | 'error';
    token?: string;
    error?: string;
  }
) {
  await page.addInitScript((next) => {
    try {
      const key = 'caluno.e2e.notifications.v1';
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...parsed,
          pushRegistration: {
            mode: next.mode,
            token: next.token ?? parsed?.pushRegistration?.token ?? 'playwright-push-token',
            error: next.error ?? parsed?.pushRegistration?.error ?? 'Simulated push registration failure.'
          }
        })
      );
    } catch {
      // ignore future-page harness persistence failures
    }
  }, params);

  if (page.url() === 'about:blank') {
    return;
  }

  await page.evaluate((next) => {
    window.__calunoE2E?.notifications?.setPushRegistration(next);
  }, params);
}

export async function triggerSimulatedLocalNotificationAction(
  page: Page,
  params: {
    actionId?: string;
    notificationId?: number;
    targetPath?: string | null;
    calendarId?: string;
    shiftId?: string;
  }
) {
  await page.evaluate((next) => {
    window.__calunoE2E?.notifications?.triggerLocalAction(next);
  }, params);
}

export async function triggerSimulatedPushNotificationAction(
  page: Page,
  params: {
    actionId?: string;
    targetPath?: string | null;
  }
) {
  await page.evaluate((next) => {
    window.__calunoE2E?.notifications?.triggerPushAction(next);
  }, params);
}

export async function getSimulatedPendingNotificationCount(page: Page) {
  return page.evaluate(() => window.__calunoE2E?.notifications?.getPendingLocalNotificationCount() ?? 0);
}

export async function stubSupabaseRpc(
  page: Page,
  rpcName: string,
  handler: (body: unknown) => { data?: unknown; error?: { message: string; code?: string } | null; status?: number }
) {
  const pattern = `${supabaseApiOrigin}/rest/v1/rpc/${rpcName}`;
  const routeHandler = async (route: Route) => {
    const request = route.request();
    const bodyText = request.postData() ?? '';
    let parsedBody: unknown = null;

    try {
      parsedBody = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsedBody = bodyText;
    }

    const result = handler(parsedBody);
    if (result.error) {
      await route.fulfill({
        status: result.status ?? 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: result.error.message,
          code: result.error.code ?? 'PGRST301'
        })
      });
      return;
    }

    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.data ?? null)
    });
  };

  await page.route(pattern, routeHandler);
  return async () => {
    await page.unroute(pattern, routeHandler);
  };
}

export async function waitForNotificationToggleState(
  page: Page,
  calendarId: string,
  expected: Partial<{
    enabled: 'true' | 'false';
    permission: string;
    localReminders: string;
    remoteSubscription: string;
    phase: string;
    reason: string;
  }>
) {
  const toggle = page.locator(`[data-testid="calendar-notification-toggle"][data-calendar-id="${calendarId}"]`).first();
  await expect(toggle).toBeVisible();

  if (expected.enabled) {
    await expect(toggle).toHaveAttribute('data-notification-enabled', expected.enabled);
  }

  if (expected.permission) {
    await expect(toggle).toHaveAttribute('data-notification-permission', expected.permission);
  }

  if (expected.localReminders) {
    await expect(toggle).toHaveAttribute('data-local-reminders', expected.localReminders);
  }

  if (expected.remoteSubscription) {
    await expect(toggle).toHaveAttribute('data-remote-subscription', expected.remoteSubscription);
  }

  if (expected.phase) {
    await expect(toggle).toHaveAttribute('data-notification-phase', expected.phase);
  }

  if (expected.reason) {
    await expect(toggle).toHaveAttribute('data-notification-reason', expected.reason);
  }
}

export async function setNotificationToggleValue(page: Page, calendarId: string, checked: boolean) {
  const control = page
    .locator(`[data-testid="calendar-notification-toggle"][data-calendar-id="${calendarId}"]`)
    .getByTestId('calendar-notification-switch');
  await expect(control).toBeVisible();

  const current = await control.getAttribute('aria-checked');
  if ((current === 'true') === checked) {
    return;
  }

  await control.click();
}

export async function waitForPendingCount(page: Page, count: number) {
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-pending-count', String(count));
}

export async function waitForRetryableCount(page: Page, count: number) {
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-retryable-count', String(count));
}

export async function openFindTimeRoute(
  page: Page,
  params: {
    calendarId: string;
    durationMinutes?: string | number;
    start?: string;
  }
) {
  const searchParams = new URLSearchParams({
    duration: String(params.durationMinutes ?? seededFindTime.durationMinutes)
  });

  if (params.start ?? seededFindTime.start) {
    searchParams.set('start', params.start ?? seededFindTime.start);
  }

  const path = `/calendars/${params.calendarId}/find-time?${searchParams.toString()}`;
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}$`));
  await expect(page.getByTestId('find-time-route-state')).toBeVisible();

  return path;
}

async function readFindTimeCardSnapshot(page: Page, testId: string): Promise<FindTimeCardSnapshot> {
  const card = page.getByTestId(testId);
  await expect(card).toBeVisible();

  return {
    rank: await card.getAttribute('data-top-pick-rank'),
    startAt: await card.getAttribute('data-start-at'),
    endAt: await card.getAttribute('data-end-at'),
    spanStartAt: await card.getAttribute('data-span-start-at'),
    spanEndAt: await card.getAttribute('data-span-end-at'),
    availableMembers: ((await card.getAttribute('data-available-members')) ?? '').split('|').filter(Boolean),
    blockedMembers: ((await card.getAttribute('data-blocked-members')) ?? '').split('|').filter(Boolean),
    leadingConstraints: ((await card.getAttribute('data-leading-constraints')) ?? '').split('|').filter(Boolean),
    trailingConstraints: ((await card.getAttribute('data-trailing-constraints')) ?? '').split('|').filter(Boolean),
    handoffReady: await card.getAttribute('data-handoff-ready')
  };
}

export async function readFindTimeTopPickSnapshot(page: Page, index: number) {
  return readFindTimeCardSnapshot(page, `find-time-top-pick-${index}`);
}

export async function readFindTimeBrowseWindowSnapshot(page: Page, index: number) {
  return readFindTimeCardSnapshot(page, `find-time-browse-window-${index}`);
}

async function readFindTimeSuggestionCtaSnapshot(page: Page, testId: string): Promise<FindTimeSuggestionCtaSnapshot> {
  const cta = page.getByTestId(testId);
  await expect(cta).toBeVisible();

  return {
    href: await cta.getAttribute('href'),
    source: await cta.getAttribute('data-handoff-source'),
    targetWeekStart: await cta.getAttribute('data-handoff-week-start'),
    startAt: await cta.getAttribute('data-handoff-start-at'),
    endAt: await cta.getAttribute('data-handoff-end-at'),
    label: ((await cta.textContent()) ?? '').trim() || null
  };
}

export async function readFindTimeTopPickCtaSnapshot(page: Page, index: number) {
  return readFindTimeSuggestionCtaSnapshot(page, `find-time-top-pick-${index}-cta`);
}

export async function readFindTimeBrowseWindowCtaSnapshot(page: Page, index: number) {
  return readFindTimeSuggestionCtaSnapshot(page, `find-time-browse-window-${index}-cta`);
}

export async function readVisibleWeekFromBoard(page: Page) {
  await expect(page.getByTestId('mobile-calendar-board')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toBeVisible();

  return {
    visibleWeekStart: await page.getByTestId('calendar-route-state').getAttribute('data-visible-week-start'),
    boardWeekStart: await page.getByTestId('mobile-calendar-board').getAttribute('data-visible-week-start'),
    boardWeekEnd: await page.getByTestId('mobile-calendar-board').getAttribute('data-visible-week-end')
  };
}

function toUtcDateTimeLocalValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getUTCDate()}`.padStart(2, '0');
  const hours = `${parsed.getUTCHours()}`.padStart(2, '0');
  const minutes = `${parsed.getUTCMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function expectedCreateShiftPrefillValues(snapshot: Pick<FindTimeSuggestionCtaSnapshot, 'startAt' | 'endAt'>) {
  return {
    startValue: toUtcDateTimeLocalValue(snapshot.startAt),
    endValue: toUtcDateTimeLocalValue(snapshot.endAt)
  };
}

export async function readCreateSheetArrivalSnapshot(page: Page): Promise<CreateSheetArrivalSnapshot> {
  const routeState = page.getByTestId('calendar-route-state');
  const editor = page.getByTestId('create-shift-editor');
  await expect(routeState).toBeVisible();
  await expect(editor).toBeVisible();

  const prefillSource = page.getByTestId('create-prefill-source');
  await expect(prefillSource).toBeVisible();

  return {
    routePrefillStatus: await routeState.getAttribute('data-create-prefill-status'),
    routePrefillSource: await routeState.getAttribute('data-create-prefill-source'),
    routePrefillStart: await routeState.getAttribute('data-create-prefill-start'),
    routePrefillEnd: await routeState.getAttribute('data-create-prefill-end'),
    open: true,
    openOnArrival: await editor.getAttribute('data-open-on-arrival'),
    createSource: await editor.getAttribute('data-create-source'),
    prefillSource: await prefillSource.getAttribute('data-prefill-source'),
    prefillStart: await prefillSource.getAttribute('data-prefill-start'),
    prefillEnd: await prefillSource.getAttribute('data-prefill-end'),
    startValue: await page.getByTestId('create-start-input').inputValue(),
    endValue: await page.getByTestId('create-end-input').inputValue()
  };
}

export async function submitHandoffBackedCreateForm(
  page: Page,
  values: {
    title: string;
    startAt?: string;
    endAt?: string;
  }
) {
  const editor = page.getByTestId('create-shift-editor');
  await expect(editor).toBeVisible();

  await page.getByTestId('create-title-input').fill(values.title);

  if (typeof values.startAt === 'string') {
    await page.getByTestId('create-start-input').fill(values.startAt);
  }

  if (typeof values.endAt === 'string') {
    await page.getByTestId('create-end-input').fill(values.endAt);
  }

  await editor.locator('form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
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
    __calunoE2ENotifications?: {
      localNotificationsPlugin?: {
        checkPermissions: () => Promise<unknown>;
        requestPermissions: () => Promise<unknown>;
        getPending: () => Promise<unknown>;
        schedule: (options: unknown) => Promise<unknown>;
        cancel: (options: unknown) => Promise<void>;
        addListener?: (
          eventName: 'localNotificationActionPerformed',
          listener: (event: unknown) => void
        ) => Promise<{ remove: () => Promise<void> }> | { remove: () => Promise<void> };
      };
      pushNotificationsPlugin?: {
        checkPermissions: () => Promise<unknown>;
        requestPermissions: () => Promise<unknown>;
        register: () => Promise<void>;
        addListener: (
          eventName:
            | 'registration'
            | 'registrationError'
            | 'pushNotificationActionPerformed'
            | 'pushNotificationReceived',
          listener: (event: unknown) => void
        ) => Promise<{ remove: () => Promise<void> }> | { remove: () => Promise<void> };
      };
    };
    __calunoE2E?: {
      getConnectivity: () => boolean;
      setConnectivity: (connected: boolean) => void;
      notifications?: {
        setLocalPermission: (permission: 'prompt' | 'granted' | 'denied') => void;
        setPushPermission: (permission: 'prompt' | 'granted' | 'denied') => void;
        setPushRegistration: (params: { mode?: 'success' | 'error'; token?: string; error?: string }) => void;
        triggerLocalAction: (params: {
          actionId?: string;
          notificationId?: number;
          targetPath?: string | null;
          calendarId?: string;
          shiftId?: string;
        }) => void;
        triggerPushAction: (params: { actionId?: string; targetPath?: string | null }) => void;
        getPendingLocalNotificationCount: () => number;
        reset: () => void;
      };
    };
  }
}
