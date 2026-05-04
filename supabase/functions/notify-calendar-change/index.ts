import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type DispatchRequest = {
  calendarId: string;
  changeType: string;
  targetPath: string;
  shiftId?: string | null;
  occurredAt?: string | null;
  headline?: string | null;
  body?: string | null;
};

type InstallationTargetRow = {
  installation_id: string;
  calendar_id: string;
  desired_enabled: boolean;
  remote_subscription_status: string;
  remote_subscription_reason: string | null;
  notification_installations:
    | {
        installation_id: string;
        push_provider: string | null;
        device_platform: string | null;
      }
    | Array<{
        installation_id: string;
        push_provider: string | null;
        device_platform: string | null;
      }>
    | null;
};

type SanitizedDispatchRequest = {
  calendarId: string;
  changeType: string;
  targetPath: string;
  shiftId: string | null;
  occurredAt: string;
  headline: string;
  body: string;
};

type DispatchResultCode = 'provider-unconfigured' | 'delivery-deferred';

type DispatchTargetResult = {
  targetRef: string;
  devicePlatform: string | null;
  pushProvider: string | null;
  remoteSubscription: string;
  resultCode: DispatchResultCode;
  reason: 'provider-unconfigured' | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json(
      {
        error: 'SUPABASE_ENV_MISSING',
        detail: 'The notification dispatch seam requires Supabase URL, anon key, and service role key.'
      },
      500
    );
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return json(
      {
        error: 'MALFORMED_JSON',
        detail: 'The notification dispatch payload was not valid JSON.'
      },
      400
    );
  }

  const parsed = sanitizeDispatchRequest(rawBody);
  if (!parsed.ok) {
    return json({ error: parsed.error, detail: parsed.detail }, 400);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return json(
      {
        error: 'AUTH_REQUIRED',
        detail: 'Shared-change dispatch requires an authenticated calendar member context.'
      },
      401
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const access = await verifyCalendarAccess(userClient, parsed.value.calendarId);
  if (!access.ok) {
    return json({ error: access.error, detail: access.detail }, access.status);
  }

  const targetsResult = await loadEnabledTargets(serviceClient, parsed.value.calendarId);
  if (!targetsResult.ok) {
    return json({ error: targetsResult.error, detail: targetsResult.detail }, 500);
  }

  const notificationProvider = Deno.env.get('NOTIFICATION_PROVIDER')?.trim() ?? '';
  const providerConfigured = notificationProvider.length > 0;
  const occurredAt = new Date().toISOString();

  let resultCode: DispatchResultCode = providerConfigured ? 'delivery-deferred' : 'provider-unconfigured';
  let degradedTargetCount = 0;

  if (!providerConfigured && targetsResult.targets.length > 0) {
    const updateResult = await serviceClient
      .from('device_calendar_notification_preferences')
      .update({
        remote_subscription_status: 'provider-unconfigured',
        remote_subscription_reason: 'provider-unconfigured',
        synced_at: occurredAt
      })
      .eq('calendar_id', parsed.value.calendarId)
      .eq('desired_enabled', true);

    if (updateResult.error) {
      return json(
        {
          error: 'PREFERENCE_UPDATE_FAILED',
          detail: updateResult.error.message
        },
        500
      );
    }

    degradedTargetCount = targetsResult.targets.length;
  }

  const results: DispatchTargetResult[] = targetsResult.targets.map((target, index) => ({
    targetRef: `target-${index + 1}`,
    devicePlatform: target.devicePlatform,
    pushProvider: target.pushProvider,
    remoteSubscription: providerConfigured ? target.remoteSubscription : 'provider-unconfigured',
    resultCode,
    reason: providerConfigured ? null : 'provider-unconfigured'
  }));

  return json({
    ok: true,
    calendarId: parsed.value.calendarId,
    changeType: parsed.value.changeType,
    occurredAt: parsed.value.occurredAt,
    dispatchRecordedAt: occurredAt,
    targetPath: parsed.value.targetPath,
    shiftId: parsed.value.shiftId,
    headline: parsed.value.headline,
    body: parsed.value.body,
    providerMode: providerConfigured ? notificationProvider : 'unconfigured',
    totals: {
      targeted: results.length,
      degraded: degradedTargetCount,
      deliveryDeferred: providerConfigured ? results.length : 0
    },
    results
  });
});

async function verifyCalendarAccess(client: SupabaseClient, calendarId: string) {
  const { data, error } = await client.rpc('current_user_can_access_calendar', {
    target_calendar_id: calendarId
  });

  if (error) {
    const status = /JWT|auth/i.test(error.message) ? 401 : 403;
    return {
      ok: false as const,
      status,
      error: status === 401 ? 'AUTH_REQUIRED' : 'CALENDAR_SCOPE_DENIED',
      detail: error.message
    };
  }

  if (data !== true) {
    return {
      ok: false as const,
      status: 403,
      error: 'CALENDAR_SCOPE_DENIED',
      detail: 'The requester is outside the trusted membership scope for this calendar.'
    };
  }

  return { ok: true as const };
}

async function loadEnabledTargets(client: SupabaseClient, calendarId: string) {
  const { data, error } = await client
    .from('device_calendar_notification_preferences')
    .select(
      `installation_id, calendar_id, desired_enabled, remote_subscription_status, remote_subscription_reason, notification_installations!inner(installation_id, push_provider, device_platform)`
    )
    .eq('calendar_id', calendarId)
    .eq('desired_enabled', true)
    .order('installation_id', { ascending: true });

  if (error) {
    return {
      ok: false as const,
      error: 'TARGET_LOOKUP_FAILED',
      detail: error.message
    };
  }

  const targets = (data ?? []).flatMap(normalizeTargetRow).filter((value): value is NonNullable<typeof value> => value !== null);
  return { ok: true as const, targets };
}

function sanitizeDispatchRequest(raw: unknown):
  | {
      ok: true;
      value: SanitizedDispatchRequest;
    }
  | {
      ok: false;
      error: string;
      detail: string;
    } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'INVALID_PAYLOAD',
      detail: 'The notification dispatch payload must be an object.'
    };
  }

  const candidate = raw as Partial<DispatchRequest>;
  if (!isUuid(candidate.calendarId)) {
    return {
      ok: false,
      error: 'CALENDAR_ID_INVALID',
      detail: 'The dispatch payload requires a UUID calendarId.'
    };
  }

  const changeType = candidate.changeType?.trim();
  if (!changeType) {
    return {
      ok: false,
      error: 'CHANGE_TYPE_REQUIRED',
      detail: 'The dispatch payload requires a non-empty changeType.'
    };
  }

  const target = sanitizeProtectedPath(candidate.targetPath ?? null, candidate.calendarId);
  if (!target.ok) {
    return target;
  }

  if (candidate.shiftId != null && candidate.shiftId !== '' && !isUuid(candidate.shiftId)) {
    return {
      ok: false,
      error: 'SHIFT_ID_INVALID',
      detail: 'shiftId must be a UUID when provided.'
    };
  }

  const occurredAt = isIsoTimestamp(candidate.occurredAt) ? candidate.occurredAt : new Date().toISOString();
  const headline = trimOrNull(candidate.headline) ?? `Calendar updated: ${changeType}`;
  const body = trimOrNull(candidate.body) ?? 'A shared calendar changed and matched at least one enabled device preference.';

  return {
    ok: true,
    value: {
      calendarId: candidate.calendarId,
      changeType,
      targetPath: target.targetPath,
      shiftId: trimOrNull(candidate.shiftId),
      occurredAt,
      headline,
      body
    }
  };
}

function sanitizeProtectedPath(targetPath: string | null, calendarId: string):
  | { ok: true; targetPath: string }
  | { ok: false; error: string; detail: string } {
  const value = trimOrNull(targetPath);
  if (!value) {
    return {
      ok: false,
      error: 'TARGET_PATH_REQUIRED',
      detail: 'The dispatch payload requires a protected internal targetPath.'
    };
  }

  if (!value.startsWith('/') || value.startsWith('//') || /:\/\//.test(value)) {
    return {
      ok: false,
      error: 'TARGET_PATH_UNSAFE',
      detail: 'The dispatch payload targetPath must stay inside the protected app path space.'
    };
  }

  const normalized = value.replace(/\/+$/g, '') || '/';
  if (normalized !== value) {
    return {
      ok: false,
      error: 'TARGET_PATH_UNSAFE',
      detail: 'The dispatch payload targetPath must already be normalized.'
    };
  }

  if (!(normalized === '/groups' || normalized === `/calendars/${calendarId}` || normalized.startsWith(`/calendars/${calendarId}?`))) {
    return {
      ok: false,
      error: 'TARGET_PATH_OUT_OF_SCOPE',
      detail: 'The dispatch payload targetPath must stay within the changed calendar or the protected groups surface.'
    };
  }

  return {
    ok: true,
    targetPath: normalized
  };
}

function normalizeTargetRow(row: InstallationTargetRow | Record<string, never>) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }

  const typedRow = row as InstallationTargetRow;
  const installation = Array.isArray(typedRow.notification_installations)
    ? typedRow.notification_installations[0] ?? null
    : typedRow.notification_installations;

  if (!installation) {
    return null;
  }

  return {
    devicePlatform: trimOrNull(installation.device_platform),
    pushProvider: trimOrNull(installation.push_provider),
    remoteSubscription: trimOrNull(typedRow.remote_subscription_status) ?? 'unknown'
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function trimOrNull(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
