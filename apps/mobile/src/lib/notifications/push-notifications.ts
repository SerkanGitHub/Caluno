import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { NotificationPermissionState, NotificationReasonCode } from '$lib/notifications/types';

export type MobilePushNotificationRegistration = {
  pushToken: string;
  pushProvider: string;
  devicePlatform: string;
};

export type MobilePushNotificationAction = {
  actionId: string;
  targetPath: string | null;
};

export type MobilePushNotificationsPlugin = {
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

export type PushPermissionResult =
  | {
      ok: true;
      permission: Extract<NotificationPermissionState, 'granted' | 'denied' | 'unsupported'>;
      detail: string;
    }
  | {
      ok: false;
      permission: Extract<NotificationPermissionState, 'unknown' | 'unsupported'>;
      reason: NotificationReasonCode;
      detail: string;
    };

export type PushRegistrationResult =
  | {
      ok: true;
      permission: 'granted';
      registration: MobilePushNotificationRegistration;
      detail: string;
    }
  | {
      ok: false;
      permission: NotificationPermissionState;
      reason: NotificationReasonCode;
      detail: string;
    };

export type MobilePushNotificationsAdapter = {
  getPermissionState: (params?: { requestIfNeeded?: boolean }) => Promise<PushPermissionResult>;
  ensureRegistration: (params?: { requestIfNeeded?: boolean }) => Promise<PushRegistrationResult>;
  subscribeToActions: (listener: (action: MobilePushNotificationAction) => void) => Promise<() => Promise<void>>;
};

const DEFAULT_TIMEOUT_MS = 8_000;

type PushNotificationsE2EHarness = {
  pushNotificationsPlugin?: MobilePushNotificationsPlugin;
};

export function createMobilePushNotificationsAdapter(options: {
  plugin?: MobilePushNotificationsPlugin;
  timeoutMs?: number;
  platform?: () => string;
} = {}): MobilePushNotificationsAdapter {
  const plugin = options.plugin ?? readE2EPushNotificationsPlugin() ?? (PushNotifications as MobilePushNotificationsPlugin);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const platform = options.platform ?? (() => Capacitor.getPlatform());

  return {
    async getPermissionState(params = {}) {
      return readPushPermission(plugin, timeoutMs, params.requestIfNeeded ?? false);
    },

    async ensureRegistration(params = {}) {
      const permission = await readPushPermission(plugin, timeoutMs, params.requestIfNeeded ?? false);
      if (!permission.ok) {
        return {
          ok: false,
          permission: permission.permission,
          reason: permission.reason,
          detail: permission.detail
        } satisfies PushRegistrationResult;
      }

      if (permission.permission !== 'granted') {
        return {
          ok: false,
          permission: permission.permission,
          reason: permission.permission === 'denied' ? 'permission-denied' : 'registration-failed',
          detail:
            permission.permission === 'denied'
              ? 'Push registration stayed disabled because the device denied notification permission.'
              : 'Push registration is unsupported on this device runtime.'
        } satisfies PushRegistrationResult;
      }

      const listeners: Array<{ remove: () => Promise<void> }> = [];

      try {
        const result = await new Promise<PushRegistrationResult>(async (resolve) => {
          let settled = false;
          const settle = async (value: PushRegistrationResult) => {
            if (settled) {
              return;
            }

            settled = true;
            await Promise.all(listeners.map((listener) => listener.remove()));
            resolve(value);
          };

          listeners.push(
            await plugin.addListener('registration', async (raw) => {
              const token = readToken(raw);
              if (!token) {
                await settle({
                  ok: false,
                  permission: 'granted',
                  reason: 'malformed-response',
                  detail: 'The push registration payload was malformed, so remote subscription stayed degraded.'
                });
                return;
              }

              const devicePlatform = platform();
              await settle({
                ok: true,
                permission: 'granted',
                registration: {
                  pushToken: token,
                  pushProvider: inferPushProvider(devicePlatform),
                  devicePlatform
                },
                detail: 'Push registration completed successfully.'
              });
            })
          );

          listeners.push(
            await plugin.addListener('registrationError', async (raw) => {
              await settle({
                ok: false,
                permission: 'granted',
                reason: 'registration-failed',
                detail: readRegistrationError(raw)
              });
            })
          );

          setTimeout(() => {
            void settle({
              ok: false,
              permission: 'granted',
              reason: 'timeout',
              detail: 'Push registration timed out before the device returned a token or explicit failure.'
            });
          }, timeoutMs);

          await plugin.register();
        });

        return result;
      } catch (error) {
        await Promise.all(listeners.map((listener) => listener.remove().catch(() => undefined)));
        return {
          ok: false,
          permission: 'granted',
          reason: resolveRuntimeReason(error, 'registration-failed'),
          detail:
            error instanceof Error
              ? error.message
              : 'Push registration failed before the device returned a token or explicit failure.'
        } satisfies PushRegistrationResult;
      }
    },

    async subscribeToActions(listener) {
      const handle = await plugin.addListener('pushNotificationActionPerformed', (raw) => {
        const action = readPushAction(raw);
        if (!action) {
          return;
        }

        listener(action);
      });

      return async () => {
        await handle.remove();
      };
    }
  };
}

export function getMobilePushNotificationsAdapter() {
  return createMobilePushNotificationsAdapter();
}

function readE2EPushNotificationsPlugin(): MobilePushNotificationsPlugin | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const harness = (window as Window & { __calunoE2ENotifications?: PushNotificationsE2EHarness }).__calunoE2ENotifications;
  return harness?.pushNotificationsPlugin ?? null;
}

async function readPushPermission(
  plugin: MobilePushNotificationsPlugin,
  timeoutMs: number,
  requestIfNeeded: boolean
): Promise<PushPermissionResult> {
  try {
    const checked = await withTimeout(
      plugin.checkPermissions(),
      timeoutMs,
      'Reading push notification permissions timed out before remote subscription could confirm device consent.'
    );
    const initial = normalizePushPermissionState(checked);

    if (initial === 'granted' || initial === 'denied' || initial === 'unsupported') {
      return {
        ok: true,
        permission: initial,
        detail: 'Push notification permission read completed successfully.'
      } satisfies PushPermissionResult;
    }

    if (!requestIfNeeded) {
      return {
        ok: false,
        permission: 'unknown',
        reason: 'malformed-response',
        detail: 'The push notification permission response was malformed, so remote subscription stayed degraded.'
      } satisfies PushPermissionResult;
    }

    const requested = await withTimeout(
      plugin.requestPermissions(),
      timeoutMs,
      'Requesting push notification permissions timed out before remote subscription could confirm device consent.'
    );
    const normalized = normalizePushPermissionState(requested);

    if (normalized === 'granted' || normalized === 'denied' || normalized === 'unsupported') {
      return {
        ok: true,
        permission: normalized,
        detail: 'Push notification permission request completed successfully.'
      } satisfies PushPermissionResult;
    }

    return {
      ok: false,
      permission: 'unknown',
      reason: 'malformed-response',
      detail: 'The push notification permission response was malformed after requesting access, so remote subscription stayed degraded.'
    } satisfies PushPermissionResult;
  } catch (error) {
    return {
      ok: false,
      permission: 'unsupported',
      reason: resolveRuntimeReason(error, 'registration-failed'),
      detail:
        error instanceof Error
          ? error.message
          : 'Reading push notification permissions failed before remote subscription could confirm device consent.'
    } satisfies PushPermissionResult;
  }
}

function normalizePushPermissionState(value: unknown): NotificationPermissionState | 'prompt' | 'malformed' {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'malformed';
  }

  const candidate = value as { receive?: unknown; granted?: unknown };
  if (candidate.receive === 'granted' || candidate.receive === 'denied') {
    return candidate.receive;
  }

  if (candidate.receive === 'prompt') {
    return 'prompt';
  }

  if (typeof candidate.granted === 'boolean') {
    return candidate.granted ? 'granted' : 'denied';
  }

  return 'malformed';
}

function readToken(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { value?: unknown; token?: unknown };
  if (isNonEmptyString(candidate.value)) {
    return candidate.value;
  }

  if (isNonEmptyString(candidate.token)) {
    return candidate.token;
  }

  return null;
}

function readRegistrationError(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'Push registration failed before the device returned a structured error.';
  }

  const candidate = value as { error?: unknown; message?: unknown };
  if (isNonEmptyString(candidate.error)) {
    return candidate.error;
  }

  if (isNonEmptyString(candidate.message)) {
    return candidate.message;
  }

  return 'Push registration failed before the device returned a structured error.';
}

function readPushAction(value: unknown): MobilePushNotificationAction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {
    actionId?: unknown;
    notification?: { data?: unknown } | null;
  };
  if (!isNonEmptyString(candidate.actionId)) {
    return null;
  }

  const targetPath = readTargetPath(candidate.notification?.data);
  return {
    actionId: candidate.actionId,
    targetPath
  } satisfies MobilePushNotificationAction;
}

function readTargetPath(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { path?: unknown; href?: unknown };
  if (isNonEmptyString(candidate.path)) {
    return candidate.path;
  }

  if (isNonEmptyString(candidate.href)) {
    return candidate.href;
  }

  return null;
}

function inferPushProvider(devicePlatform: string) {
  return devicePlatform === 'ios' ? 'apns' : devicePlatform === 'android' ? 'fcm' : 'web';
}

function resolveRuntimeReason(error: unknown, fallback: Extract<NotificationReasonCode, 'registration-failed'>): NotificationReasonCode {
  if (error instanceof Error && /timed out/i.test(error.message)) {
    return 'timeout';
  }

  return fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, detail: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.resolve(promise);

  return Promise.race([
    settled.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(detail)), timeoutMs);
    })
  ]);
}
