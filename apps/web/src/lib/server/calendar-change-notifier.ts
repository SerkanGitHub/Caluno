import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Best-effort shared-change dispatch seam for trusted web schedule mutations.
 *
 * Contract:
 * - Called only after canonical write success is already confirmed.
 * - Never throws or rejects the caller — all errors degrade to a logged reason.
 * - Never rolls back or relabels the canonical schedule outcome.
 * - Sanitizes calendarId, shiftId, and targetPath before dispatch.
 */

export type CalendarChangeKind = 'create' | 'edit' | 'move' | 'delete';

export type NotifierDispatchResult =
  | { ok: true; calendarId: string; changeType: CalendarChangeKind }
  | {
      ok: false;
      degraded: true;
      reason:
        | 'invalid-calendar-id'
        | 'invalid-shift-id'
        | 'invalid-target-path'
        | 'dispatch-error'
        | 'dispatch-timeout'
        | 'dispatch-malformed';
      detail: string;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function sanitizeTargetPath(
  calendarId: string,
  rawPath: string | null | undefined
): { ok: true; targetPath: string } | { ok: false; reason: string } {
  const value = typeof rawPath === 'string' ? rawPath.trim() : null;

  if (!value) {
    // Default to the calendar route when no path is provided.
    return { ok: true, targetPath: `/calendars/${calendarId}` };
  }

  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /:\/\//.test(value)
  ) {
    return { ok: false, reason: 'unsafe-path-prefix' };
  }

  const normalized = value.replace(/\/+$/, '') || '/';
  if (normalized !== value) {
    return { ok: false, reason: 'path-not-normalized' };
  }

  const isAllowed =
    normalized === '/groups' ||
    normalized === `/calendars/${calendarId}` ||
    normalized.startsWith(`/calendars/${calendarId}?`);

  if (!isAllowed) {
    return { ok: false, reason: 'path-out-of-scope' };
  }

  return { ok: true, targetPath: normalized };
}

/**
 * Invoke the notify-calendar-change edge function as a best-effort post-write
 * step. The caller must already hold an authenticated Supabase client carrying
 * the trusted member context for the calendar.
 *
 * Returns a typed result so tests can assert on dispatch behaviour without
 * inspecting live network calls.
 */
export async function dispatchCalendarChange(params: {
  supabase: SupabaseClient;
  calendarId: string;
  changeType: CalendarChangeKind;
  shiftId: string | null;
  targetPath?: string | null;
  occurredAt?: string;
  headline?: string;
  body?: string;
  timeoutMs?: number;
}): Promise<NotifierDispatchResult> {
  // Sanitize calendarId — reject before any network call.
  if (!isUuidLike(params.calendarId)) {
    return {
      ok: false,
      degraded: true,
      reason: 'invalid-calendar-id',
      detail: `Dispatch skipped: calendarId "${String(params.calendarId).slice(0, 36)}" is not a valid UUID.`
    };
  }

  // Sanitize shiftId when present.
  if (params.shiftId != null && params.shiftId !== '' && !isUuidLike(params.shiftId)) {
    return {
      ok: false,
      degraded: true,
      reason: 'invalid-shift-id',
      detail: `Dispatch skipped: shiftId "${String(params.shiftId).slice(0, 36)}" is not a valid UUID.`
    };
  }

  // Sanitize targetPath.
  const pathResult = sanitizeTargetPath(params.calendarId, params.targetPath ?? null);
  if (!pathResult.ok) {
    return {
      ok: false,
      degraded: true,
      reason: 'invalid-target-path',
      detail: `Dispatch skipped: targetPath rejected with reason "${pathResult.reason}".`
    };
  }

  const payload = {
    calendarId: params.calendarId,
    changeType: params.changeType,
    targetPath: pathResult.targetPath,
    shiftId: params.shiftId ?? null,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    headline: params.headline ?? undefined,
    body: params.body ?? undefined
  };

  const timeoutMs = params.timeoutMs ?? 5_000;

  try {
    const dispatchPromise = Promise.resolve(
      params.supabase.functions.invoke('notify-calendar-change', {
        body: payload
      })
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('dispatch-timeout')), timeoutMs)
    );

    const result = await Promise.race([dispatchPromise, timeoutPromise]);

    // functions.invoke resolves even on HTTP errors — check for invoke-level error.
    if (result && typeof result === 'object' && 'error' in result && result.error != null) {
      return {
        ok: false,
        degraded: true,
        reason: 'dispatch-error',
        detail: `Dispatch degraded: ${String((result.error as { message?: string }).message ?? result.error).slice(0, 200)}`
      };
    }

    // Verify the response shape is at least loosely well-formed.
    if (!result || typeof result !== 'object' || !('data' in result)) {
      return {
        ok: false,
        degraded: true,
        reason: 'dispatch-malformed',
        detail: 'Dispatch degraded: edge function returned an unexpected response shape.'
      };
    }

    return { ok: true, calendarId: params.calendarId, changeType: params.changeType };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === 'dispatch-timeout' || /timeout/i.test(message)) {
      return {
        ok: false,
        degraded: true,
        reason: 'dispatch-timeout',
        detail: `Dispatch timed out after ${timeoutMs}ms — canonical schedule write is unaffected.`
      };
    }

    return {
      ok: false,
      degraded: true,
      reason: 'dispatch-error',
      detail: `Dispatch degraded unexpectedly: ${message.slice(0, 200)}`
    };
  }
}
