import type { MobileSupabaseFunctionsSeam } from '$lib/supabase/client';

/**
 * Best-effort shared-change dispatch seam for trusted mobile schedule mutations.
 *
 * Contract:
 * - Called only after canonical write success is already confirmed.
 * - Never throws or rejects the caller — all errors degrade to a typed reason.
 * - Never rolls back or relabels the canonical schedule outcome.
 * - Replay-safe: each reconnect-drained write dispatches exactly once per
 *   canonical success — no second queue state, no blocking the replay loop.
 * - Sanitizes calendarId and shiftId before dispatch.
 */

export type MobileCalendarChangeKind = 'create' | 'edit' | 'move' | 'delete';

export type MobileDispatchResult =
  | { ok: true; calendarId: string; changeType: MobileCalendarChangeKind }
  | {
      ok: false;
      degraded: true;
      reason:
        | 'invalid-calendar-id'
        | 'invalid-shift-id'
        | 'dispatch-error'
        | 'dispatch-timeout'
        | 'dispatch-malformed';
      detail: string;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Invoke the notify-calendar-change edge function as a best-effort post-write
 * step. The caller must already hold an authenticated Supabase client carrying
 * the trusted member context for the calendar.
 *
 * Replay-safety: the function is stateless with respect to the mobile offline
 * queue. If dispatch degrades, the queue drains normally — the returned result
 * is informational only and must not affect the canonical write outcome.
 */
export async function dispatchMobileCalendarChange(params: {
  client: MobileSupabaseFunctionsSeam;
  calendarId: string;
  changeType: MobileCalendarChangeKind;
  shiftId: string | null;
  occurredAt?: string;
  timeoutMs?: number;
}): Promise<MobileDispatchResult> {
  if (!isUuidLike(params.calendarId)) {
    return {
      ok: false,
      degraded: true,
      reason: 'invalid-calendar-id',
      detail: `Dispatch skipped: calendarId "${String(params.calendarId).slice(0, 36)}" is not a valid UUID.`
    };
  }

  if (params.shiftId != null && params.shiftId !== '' && !isUuidLike(params.shiftId)) {
    return {
      ok: false,
      degraded: true,
      reason: 'invalid-shift-id',
      detail: `Dispatch skipped: shiftId "${String(params.shiftId).slice(0, 36)}" is not a valid UUID.`
    };
  }

  const payload = {
    calendarId: params.calendarId,
    changeType: params.changeType,
    shiftId: params.shiftId ?? null,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    targetPath: `/calendars/${params.calendarId}`
  };

  const timeoutMs = params.timeoutMs ?? 5_000;

  try {
    const dispatchPromise = Promise.resolve(
      params.client.functions.invoke('notify-calendar-change', { body: payload })
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('dispatch-timeout')), timeoutMs)
    );

    const result = await Promise.race([dispatchPromise, timeoutPromise]);

    if (result && typeof result === 'object' && 'error' in result && result.error != null) {
      return {
        ok: false,
        degraded: true,
        reason: 'dispatch-error',
        detail: `Dispatch degraded: ${String((result.error as { message?: string }).message ?? result.error).slice(0, 200)}`
      };
    }

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
