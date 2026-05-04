import { get, readonly, writable } from 'svelte/store';
import type { NotificationReasonCode } from '$lib/notifications/types';
import { extractRequestedCalendarId, isProtectedPath, normalizeInternalPath } from '$lib/shell/load-app-shell';

export type NotificationRouteSource = 'local' | 'push';
export type NotificationRouteResultCode = 'idle' | 'navigated' | 'path-rejected' | 'navigation-timeout';

export type NotificationRouteDiagnostics = {
  code: NotificationRouteResultCode;
  source: NotificationRouteSource | null;
  targetPath: string | null;
  normalizedPath: string | null;
  requestedCalendarId: string | null;
  reason: NotificationReasonCode | null;
  detail: string;
  handledAt: string | null;
};

const REJECTED_PATH_SENTINEL = '/__caluno_notification_rejected__';

const trustedCalendarScopeStore = writable<string[] | null>(null);
const notificationRouteDiagnosticsStore = writable<NotificationRouteDiagnostics>(createIdleNotificationRouteDiagnostics());

export const trustedNotificationCalendarScope = readonly(trustedCalendarScopeStore);
export const notificationRouteDiagnostics = readonly(notificationRouteDiagnosticsStore);

export function createIdleNotificationRouteDiagnostics(): NotificationRouteDiagnostics {
  return {
    code: 'idle',
    source: null,
    targetPath: null,
    normalizedPath: null,
    requestedCalendarId: null,
    reason: null,
    detail: 'No notification tap has been routed in this session yet.',
    handledAt: null
  } satisfies NotificationRouteDiagnostics;
}

export function setTrustedNotificationCalendarScope(calendarIds: string[] | null | undefined) {
  if (calendarIds == null) {
    trustedCalendarScopeStore.set(null);
    return;
  }

  trustedCalendarScopeStore.set(Array.from(new Set(calendarIds)).sort((left, right) => left.localeCompare(right)));
}

export function clearTrustedNotificationCalendarScope() {
  trustedCalendarScopeStore.set(null);
}

export function resetNotificationRouteDiagnostics() {
  notificationRouteDiagnosticsStore.set(createIdleNotificationRouteDiagnostics());
}

export function resolveNotificationOpenTarget(params: {
  targetPath: string | null | undefined;
  permittedCalendarIds?: string[] | null;
}):
  | {
      ok: true;
      normalizedPath: string;
      requestedCalendarId: string | null;
    }
  | {
      ok: false;
      reason: 'path-rejected';
      detail: string;
      normalizedPath: null;
      requestedCalendarId: null;
    } {
  const targetPath = typeof params.targetPath === 'string' ? params.targetPath.trim() : '';
  if (!targetPath) {
    return {
      ok: false,
      reason: 'path-rejected',
      detail: 'The notification payload did not include a usable internal target path.',
      normalizedPath: null,
      requestedCalendarId: null
    };
  }

  const normalizedPath = normalizeInternalPath(targetPath, REJECTED_PATH_SENTINEL);
  if (normalizedPath === REJECTED_PATH_SENTINEL || normalizedPath !== targetPath || !isProtectedPath(normalizedPath)) {
    return {
      ok: false,
      reason: 'path-rejected',
      detail: 'The notification target path was unsafe, so navigation was rejected explicitly.',
      normalizedPath: null,
      requestedCalendarId: null
    };
  }

  const requestedCalendarId = extractRequestedCalendarId(normalizedPath);
  const permittedCalendarIds = params.permittedCalendarIds ?? null;

  if (requestedCalendarId && permittedCalendarIds && !permittedCalendarIds.includes(requestedCalendarId)) {
    return {
      ok: false,
      reason: 'path-rejected',
      detail: 'The notification target referenced a calendar outside the current trusted scope, so navigation was rejected.',
      normalizedPath: null,
      requestedCalendarId: null
    };
  }

  return {
    ok: true,
    normalizedPath,
    requestedCalendarId
  };
}

export async function routeNotificationOpen(params: {
  source: NotificationRouteSource;
  targetPath: string | null | undefined;
  permittedCalendarIds?: string[] | null;
  navigate: (path: string) => Promise<unknown>;
  now?: () => Date;
  timeoutMs?: number;
}): Promise<NotificationRouteDiagnostics> {
  const now = params.now ?? (() => new Date());
  const permittedCalendarIds = params.permittedCalendarIds ?? get(trustedCalendarScopeStore);
  const resolved = resolveNotificationOpenTarget({
    targetPath: params.targetPath,
    permittedCalendarIds
  });

  if (!resolved.ok) {
    const diagnostics = buildNotificationRouteDiagnostics({
      code: 'path-rejected',
      source: params.source,
      targetPath: params.targetPath ?? null,
      normalizedPath: null,
      requestedCalendarId: null,
      reason: resolved.reason,
      detail: resolved.detail,
      handledAt: now().toISOString()
    });
    notificationRouteDiagnosticsStore.set(diagnostics);
    return diagnostics;
  }

  try {
    await withTimeout(params.navigate(resolved.normalizedPath), params.timeoutMs ?? 2_500);
    const diagnostics = buildNotificationRouteDiagnostics({
      code: 'navigated',
      source: params.source,
      targetPath: params.targetPath ?? null,
      normalizedPath: resolved.normalizedPath,
      requestedCalendarId: resolved.requestedCalendarId,
      reason: null,
      detail: 'Notification tap routed through a normalized internal path.',
      handledAt: now().toISOString()
    });
    notificationRouteDiagnosticsStore.set(diagnostics);
    return diagnostics;
  } catch (error) {
    const timedOut = error instanceof Error && /timed out/i.test(error.message);
    const diagnostics = buildNotificationRouteDiagnostics({
      code: timedOut ? 'navigation-timeout' : 'path-rejected',
      source: params.source,
      targetPath: params.targetPath ?? null,
      normalizedPath: resolved.normalizedPath,
      requestedCalendarId: resolved.requestedCalendarId,
      reason: timedOut ? 'timeout' : 'path-rejected',
      detail:
        error instanceof Error
          ? error.message
          : 'Notification routing failed before the target path could settle.',
      handledAt: now().toISOString()
    });
    notificationRouteDiagnosticsStore.set(diagnostics);
    return diagnostics;
  }
}

function buildNotificationRouteDiagnostics(diagnostics: NotificationRouteDiagnostics): NotificationRouteDiagnostics {
  return diagnostics;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.resolve(promise);

  return Promise.race([
    settled.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Notification routing timed out before the target path could settle.')),
        timeoutMs
      );
    })
  ]);
}
