import {
  composeAppGroups,
  deriveViewerSummary,
  pickPrimaryCalendar,
  resolveCalendarPageState,
  type AppCalendar,
  type AppGroup,
  type AppMembership,
  type CalendarPageState,
  type ViewerSummary
} from '@repo/caluno-core/app-shell';
import type { CachedAppShellSnapshot, CachedSessionContinuity } from '@repo/caluno-core/offline/app-shell-cache';
import type { Session, User } from '@supabase/supabase-js';
import {
  readMobileCachedAppShellSnapshot,
  writeMobileCachedAppShellSnapshot,
  type MobileContinuityStorage,
  type MobileContinuityUnavailableReason
} from '$lib/continuity/mobile-app-shell-cache';
import {
  hasSyncedCalendarContinuity,
  type MobileOfflineStorage
} from '$lib/offline/repository';
import { getSupabaseBrowserClient, type MobileSupabaseDataClient } from '$lib/supabase/client';

export type MobileShellBootstrapMode = 'idle' | 'loading' | 'ready' | 'needs-group' | 'load-failed';
export type MobileShellRouteMode = 'trusted-online' | 'cached-offline' | 'denied' | 'public';
export type MobileSnapshotOrigin = 'trusted-online' | 'cached-offline' | 'none';
export type MobileShellFailurePhase = 'viewer' | 'memberships' | 'groups' | 'calendars' | 'join-codes' | 'shape';
export type MobileShellReasonCode =
  | 'APP_SHELL_VIEWER_INVALID'
  | 'APP_SHELL_MEMBERSHIP_TIMEOUT'
  | 'APP_SHELL_MEMBERSHIP_LOAD_FAILED'
  | 'APP_SHELL_GROUP_TIMEOUT'
  | 'APP_SHELL_GROUP_LOAD_FAILED'
  | 'APP_SHELL_CALENDAR_TIMEOUT'
  | 'APP_SHELL_CALENDAR_LOAD_FAILED'
  | 'APP_SHELL_JOIN_CODE_TIMEOUT'
  | 'APP_SHELL_JOIN_CODE_LOAD_FAILED'
  | 'APP_SHELL_MEMBERSHIP_SHAPE_INVALID'
  | 'APP_SHELL_GROUP_SHAPE_INVALID'
  | 'APP_SHELL_CALENDAR_SHAPE_INVALID'
  | 'APP_SHELL_JOIN_CODE_SHAPE_INVALID';

export type MobileAppShell = {
  viewer: ViewerSummary;
  memberships: AppMembership[];
  groups: AppGroup[];
  calendars: AppCalendar[];
  primaryCalendar: AppCalendar | null;
  onboardingState: 'ready' | 'needs-group';
};

export type MobileContinuityState = {
  availability: 'ready' | 'unavailable';
  reason: MobileContinuityUnavailableReason | null;
  detail: string | null;
  lastTrustedRefreshAt: string | null;
};

export type MobileShellLoadSuccess = {
  ok: true;
  bootstrapMode: 'ready' | 'needs-group';
  appShell: MobileAppShell;
  loadedFromCache: boolean;
  routeMode: Extract<MobileShellRouteMode, 'trusted-online' | 'cached-offline'>;
  snapshotOrigin: Exclude<MobileSnapshotOrigin, 'none'>;
  continuity: MobileContinuityState;
};

export type MobileShellLoadFailure = {
  ok: false;
  bootstrapMode: 'load-failed';
  failurePhase: MobileShellFailurePhase;
  reasonCode: MobileShellReasonCode;
  detail: string;
  retryable: boolean;
  routeMode: 'denied';
  snapshotOrigin: 'none';
  continuity: MobileContinuityState;
};

export type MobileShellLoadResult = MobileShellLoadSuccess | MobileShellLoadFailure;

export type LoadedMobileCalendarRoute = {
  kind: 'calendar';
  bootstrapMode: MobileShellBootstrapMode;
  appShell: MobileAppShell;
  state: Extract<CalendarPageState, { kind: 'calendar' }>;
};

export type DeniedMobileCalendarRoute = {
  kind: 'denied';
  bootstrapMode: MobileShellBootstrapMode;
  appShell: MobileAppShell;
  state: Extract<CalendarPageState, { kind: 'denied' }>;
};

export type MobileCalendarRouteResult = LoadedMobileCalendarRoute | DeniedMobileCalendarRoute;

export type MobileProtectedEntryState = {
  isProtectedRoute: boolean;
  routeMode: MobileShellRouteMode;
  snapshotOrigin: MobileSnapshotOrigin;
  requestedCalendarId: string | null;
  cachedSnapshot: CachedAppShellSnapshot | null;
  denialReasonCode: string | null;
  continuityReason: MobileContinuityUnavailableReason | null;
  continuityDetail: string | null;
  lastTrustedRefreshAt: string | null;
  signInHref: string | null;
};

type MembershipRow = {
  group_id: string;
  role: 'owner' | 'member';
};

type GroupRow = {
  id: string;
  name: string;
};

type CalendarRow = {
  id: string;
  group_id: string;
  name: string;
  is_default: boolean | null;
};

type JoinCodeRow = {
  group_id: string;
  code: string;
  expires_at: string | null;
  revoked_at: string | null;
};

type LoadDependencies = {
  client?: MobileSupabaseDataClient;
  timeoutMs?: number;
  force?: boolean;
  session?: Pick<Session, 'expires_at' | 'expires_in'> | null;
  now?: () => Date;
  continuityStorage?: MobileContinuityStorage;
  continuityStorageTimeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const shellCache = new Map<string, MobileShellLoadSuccess>();
const inflightLoads = new Map<string, Promise<MobileShellLoadResult>>();

class MobileShellLoadError extends Error {
  failurePhase: MobileShellFailurePhase;
  reasonCode: MobileShellReasonCode;
  retryable: boolean;

  constructor(params: {
    failurePhase: MobileShellFailurePhase;
    reasonCode: MobileShellReasonCode;
    detail: string;
    retryable?: boolean;
  }) {
    super(params.detail);
    this.failurePhase = params.failurePhase;
    this.reasonCode = params.reasonCode;
    this.retryable = params.retryable ?? true;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: MobileShellReasonCode) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new MobileShellLoadError({
              failurePhase: resolveFailurePhaseForCode(code),
              reasonCode: code,
              detail: buildTimeoutDetail(code)
            })
          ),
        timeoutMs
      );
    })
  ]);
}

function resolveFailurePhaseForCode(code: MobileShellReasonCode): MobileShellFailurePhase {
  if (code.startsWith('APP_SHELL_MEMBERSHIP')) {
    return code.endsWith('SHAPE_INVALID') ? 'shape' : 'memberships';
  }

  if (code.startsWith('APP_SHELL_GROUP')) {
    return code.endsWith('SHAPE_INVALID') ? 'shape' : 'groups';
  }

  if (code.startsWith('APP_SHELL_CALENDAR')) {
    return code.endsWith('SHAPE_INVALID') ? 'shape' : 'calendars';
  }

  if (code.startsWith('APP_SHELL_JOIN_CODE')) {
    return code.endsWith('SHAPE_INVALID') ? 'shape' : 'join-codes';
  }

  return 'viewer';
}

function buildTimeoutDetail(code: MobileShellReasonCode): string {
  switch (code) {
    case 'APP_SHELL_MEMBERSHIP_TIMEOUT':
      return 'Membership loading timed out, so the mobile shell stayed in a retryable loading failure state.';
    case 'APP_SHELL_GROUP_TIMEOUT':
      return 'Group loading timed out, so the mobile shell stayed in a retryable loading failure state.';
    case 'APP_SHELL_CALENDAR_TIMEOUT':
      return 'Calendar loading timed out, so the mobile shell stayed in a retryable loading failure state.';
    case 'APP_SHELL_JOIN_CODE_TIMEOUT':
      return 'Join-code loading timed out, so the mobile shell stayed in a retryable loading failure state.';
    default:
      return 'The mobile shell load timed out before trusted scope could be confirmed.';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMembershipRow(value: unknown): value is MembershipRow {
  return (
    isRecord(value) &&
    typeof value.group_id === 'string' &&
    value.group_id.trim().length > 0 &&
    (value.role === 'owner' || value.role === 'member')
  );
}

function isGroupRow(value: unknown): value is GroupRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0
  );
}

function isCalendarRow(value: unknown): value is CalendarRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.group_id === 'string' &&
    value.group_id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    (typeof value.is_default === 'boolean' || value.is_default === null)
  );
}

function isJoinCodeRow(value: unknown): value is JoinCodeRow {
  return (
    isRecord(value) &&
    typeof value.group_id === 'string' &&
    value.group_id.trim().length > 0 &&
    typeof value.code === 'string' &&
    value.code.trim().length > 0 &&
    (typeof value.expires_at === 'string' || value.expires_at === null) &&
    (typeof value.revoked_at === 'string' || value.revoked_at === null)
  );
}

function ensureRows<T>(params: {
  rows: unknown;
  guard: (value: unknown) => value is T;
  reasonCode: MobileShellReasonCode;
  detail: string;
}): T[] {
  if (!Array.isArray(params.rows) || !params.rows.every(params.guard)) {
    throw new MobileShellLoadError({
      failurePhase: 'shape',
      reasonCode: params.reasonCode,
      detail: params.detail,
      retryable: false
    });
  }

  return params.rows;
}

function ensureScopedRows(params: {
  groupIds: string[];
  groups: GroupRow[];
  calendars: CalendarRow[];
  joinCodes: JoinCodeRow[];
}) {
  const expectedGroupIds = new Set(params.groupIds);

  if (params.groups.some((group) => !expectedGroupIds.has(group.id))) {
    throw new MobileShellLoadError({
      failurePhase: 'shape',
      reasonCode: 'APP_SHELL_GROUP_SHAPE_INVALID',
      detail: 'Trusted group rows escaped the permitted membership scope, so the mobile shell failed closed.',
      retryable: false
    });
  }

  if (params.calendars.some((calendar) => !expectedGroupIds.has(calendar.group_id))) {
    throw new MobileShellLoadError({
      failurePhase: 'shape',
      reasonCode: 'APP_SHELL_CALENDAR_SHAPE_INVALID',
      detail: 'Trusted calendar rows escaped the permitted membership scope, so the mobile shell failed closed.',
      retryable: false
    });
  }

  if (params.joinCodes.some((joinCode) => !expectedGroupIds.has(joinCode.group_id))) {
    throw new MobileShellLoadError({
      failurePhase: 'shape',
      reasonCode: 'APP_SHELL_JOIN_CODE_SHAPE_INVALID',
      detail: 'Trusted join-code rows escaped the permitted membership scope, so the mobile shell failed closed.',
      retryable: false
    });
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function buildViewer(user: Pick<User, 'id' | 'email' | 'user_metadata'>): ViewerSummary {
  if (!user.id?.trim()) {
    throw new MobileShellLoadError({
      failurePhase: 'viewer',
      reasonCode: 'APP_SHELL_VIEWER_INVALID',
      detail: 'Trusted viewer identity was incomplete, so the mobile shell stayed closed.',
      retryable: false
    });
  }

  const metadata = (user.user_metadata ?? {}) as {
    display_name?: string;
    full_name?: string;
  };

  return deriveViewerSummary({
    id: user.id,
    email: user.email,
    displayName: metadata.display_name ?? metadata.full_name ?? null
  });
}

async function readMembershipRows(client: MobileSupabaseDataClient, userId: string, timeoutMs: number) {
  const result = await withTimeout<{ data: MembershipRow[] | null; error: { message: string } | null }>(
    Promise.resolve(
      client
        .from('group_memberships')
        .select('group_id, role')
        .eq('user_id', userId)
        .returns<MembershipRow[]>()
    ),
    timeoutMs,
    'APP_SHELL_MEMBERSHIP_TIMEOUT'
  );

  if (result.error) {
    throw new MobileShellLoadError({
      failurePhase: 'memberships',
      reasonCode: 'APP_SHELL_MEMBERSHIP_LOAD_FAILED',
      detail: 'Membership loading failed, so the mobile shell kept protected content hidden.'
    });
  }

  return ensureRows({
    rows: result.data ?? [],
    guard: isMembershipRow,
    reasonCode: 'APP_SHELL_MEMBERSHIP_SHAPE_INVALID',
    detail: 'Membership rows were malformed, so the mobile shell failed closed instead of widening scope.'
  });
}

async function readScopedRows(client: MobileSupabaseDataClient, groupIds: string[], timeoutMs: number) {
  const [groupsResult, calendarsResult, joinCodesResult] = await Promise.all([
    withTimeout<{ data: GroupRow[] | null; error: { message: string } | null }>(
      Promise.resolve(client.from('groups').select('id, name').in('id', groupIds).returns<GroupRow[]>()),
      timeoutMs,
      'APP_SHELL_GROUP_TIMEOUT'
    ),
    withTimeout<{ data: CalendarRow[] | null; error: { message: string } | null }>(
      Promise.resolve(
        client
          .from('calendars')
          .select('id, group_id, name, is_default')
          .in('group_id', groupIds)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true })
          .returns<CalendarRow[]>()
      ),
      timeoutMs,
      'APP_SHELL_CALENDAR_TIMEOUT'
    ),
    withTimeout<{ data: JoinCodeRow[] | null; error: { message: string } | null }>(
      Promise.resolve(
        client
          .from('group_join_codes')
          .select('group_id, code, expires_at, revoked_at')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })
          .returns<JoinCodeRow[]>()
      ),
      timeoutMs,
      'APP_SHELL_JOIN_CODE_TIMEOUT'
    )
  ]);

  if (groupsResult.error) {
    throw new MobileShellLoadError({
      failurePhase: 'groups',
      reasonCode: 'APP_SHELL_GROUP_LOAD_FAILED',
      detail: 'Group loading failed, so the mobile shell kept protected content hidden.'
    });
  }

  if (calendarsResult.error) {
    throw new MobileShellLoadError({
      failurePhase: 'calendars',
      reasonCode: 'APP_SHELL_CALENDAR_LOAD_FAILED',
      detail: 'Calendar loading failed, so the mobile shell kept protected content hidden.'
    });
  }

  if (joinCodesResult.error) {
    throw new MobileShellLoadError({
      failurePhase: 'join-codes',
      reasonCode: 'APP_SHELL_JOIN_CODE_LOAD_FAILED',
      detail: 'Join-code loading failed, so the mobile shell kept protected content hidden.'
    });
  }

  const groups = ensureRows({
    rows: groupsResult.data ?? [],
    guard: isGroupRow,
    reasonCode: 'APP_SHELL_GROUP_SHAPE_INVALID',
    detail: 'Group rows were malformed, so the mobile shell failed closed instead of widening scope.'
  });
  const calendars = ensureRows({
    rows: calendarsResult.data ?? [],
    guard: isCalendarRow,
    reasonCode: 'APP_SHELL_CALENDAR_SHAPE_INVALID',
    detail: 'Calendar rows were malformed, so the mobile shell failed closed instead of widening scope.'
  });
  const joinCodes = ensureRows({
    rows: joinCodesResult.data ?? [],
    guard: isJoinCodeRow,
    reasonCode: 'APP_SHELL_JOIN_CODE_SHAPE_INVALID',
    detail: 'Join-code rows were malformed, so the mobile shell failed closed instead of widening scope.'
  });

  ensureScopedRows({
    groupIds,
    groups,
    calendars,
    joinCodes
  });

  return { groups, calendars, joinCodes };
}

async function performMobileShellLoad(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  dependencies: LoadDependencies
): Promise<MobileShellLoadResult> {
  const now = dependencies.now ?? (() => new Date());

  try {
    const client = dependencies.client ?? getSupabaseBrowserClient();
    const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const viewer = buildViewer(user);
    const membershipRows = await readMembershipRows(client, user.id, timeoutMs);
    const groupIds = unique(membershipRows.map((membership) => membership.group_id));

    if (groupIds.length === 0) {
      const emptySuccess = await finalizeOnlineShellSuccess(
        {
          viewer,
          memberships: [],
          groups: [],
          calendars: [],
          primaryCalendar: null,
          onboardingState: 'needs-group'
        },
        user,
        dependencies,
        now()
      );

      shellCache.set(user.id, emptySuccess);
      return emptySuccess;
    }

    const { groups, calendars, joinCodes } = await readScopedRows(client, groupIds, timeoutMs);
    const shaped = composeAppGroups({
      userId: user.id,
      memberships: membershipRows,
      groups,
      calendars,
      joinCodes
    });

    const success = await finalizeOnlineShellSuccess(
      {
        viewer,
        memberships: shaped.memberships,
        groups: shaped.groups,
        calendars: shaped.calendars,
        primaryCalendar: pickPrimaryCalendar(shaped.groups),
        onboardingState: shaped.groups.length === 0 ? 'needs-group' : 'ready'
      },
      user,
      dependencies,
      now()
    );

    shellCache.set(user.id, success);
    return success;
  } catch (error) {
    if (error instanceof MobileShellLoadError) {
      return {
        ok: false,
        bootstrapMode: 'load-failed',
        failurePhase: error.failurePhase,
        reasonCode: error.reasonCode,
        detail: error.message,
        retryable: error.retryable,
        routeMode: 'denied',
        snapshotOrigin: 'none',
        continuity: unavailableContinuity(null, null)
      };
    }

    return {
      ok: false,
      bootstrapMode: 'load-failed',
      failurePhase: 'shape',
      reasonCode: 'APP_SHELL_GROUP_SHAPE_INVALID',
      detail:
        error instanceof Error
          ? error.message
          : 'Trusted mobile shell shaping failed before protected content could render.',
      retryable: true,
      routeMode: 'denied',
      snapshotOrigin: 'none',
      continuity: unavailableContinuity(null, null)
    };
  }
}

async function finalizeOnlineShellSuccess(
  appShell: MobileAppShell,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  dependencies: LoadDependencies,
  now: Date
): Promise<MobileShellLoadSuccess> {
  const continuity = await persistTrustedShellContinuity(appShell, user, dependencies, now);

  return {
    ok: true,
    bootstrapMode: appShell.onboardingState === 'needs-group' ? 'needs-group' : 'ready',
    appShell,
    loadedFromCache: false,
    routeMode: 'trusted-online',
    snapshotOrigin: 'trusted-online',
    continuity
  };
}

async function persistTrustedShellContinuity(
  appShell: MobileAppShell,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  dependencies: LoadDependencies,
  now: Date
): Promise<MobileContinuityState> {
  const sessionContinuity = deriveSessionContinuity(user, dependencies.session, appShell.viewer, now);
  if (!sessionContinuity) {
    return unavailableContinuity(null, null);
  }

  const result = await writeMobileCachedAppShellSnapshot({
    viewer: appShell.viewer,
    session: sessionContinuity,
    groups: appShell.groups,
    calendars: appShell.calendars,
    primaryCalendar: appShell.primaryCalendar,
    onboardingState: appShell.onboardingState,
    now,
    timeoutMs: dependencies.continuityStorageTimeoutMs,
    storage: dependencies.continuityStorage
  });

  if (!result.ok) {
    return unavailableContinuity(result.reason, result.detail);
  }

  return readyContinuity(result.snapshot.refreshedAt);
}

function deriveSessionContinuity(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  session: Pick<Session, 'expires_at' | 'expires_in'> | null | undefined,
  viewer: ViewerSummary,
  now: Date
): CachedSessionContinuity | null {
  const expiresAtMs = resolveSessionExpiresAtMs(session, now);
  if (!expiresAtMs || !user.id || !viewer.email) {
    return null;
  }

  return {
    userId: user.id,
    email: viewer.email,
    displayName: viewer.displayName,
    expiresAtMs,
    refreshedAt: now.toISOString()
  };
}

function resolveSessionExpiresAtMs(session: Pick<Session, 'expires_at' | 'expires_in'> | null | undefined, now: Date): number | null {
  if (!session) {
    return null;
  }

  if (typeof session.expires_at === 'number' && Number.isFinite(session.expires_at)) {
    return session.expires_at * 1000;
  }

  if (typeof session.expires_in === 'number' && Number.isFinite(session.expires_in)) {
    return now.getTime() + session.expires_in * 1000;
  }

  return null;
}

function readyContinuity(lastTrustedRefreshAt: string): MobileContinuityState {
  return {
    availability: 'ready',
    reason: null,
    detail: null,
    lastTrustedRefreshAt
  };
}

function unavailableContinuity(
  reason: MobileContinuityUnavailableReason | null,
  detail: string | null
): MobileContinuityState {
  return {
    availability: 'unavailable',
    reason,
    detail,
    lastTrustedRefreshAt: null
  };
}

export async function loadMobileAppShell(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  dependencies: LoadDependencies = {}
): Promise<MobileShellLoadResult> {
  const cacheKey = user.id;

  if (!dependencies.force) {
    const cached = shellCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        loadedFromCache: true
      };
    }

    const inflight = inflightLoads.get(cacheKey);
    if (inflight) {
      return inflight;
    }
  }

  const nextLoad = performMobileShellLoad(user, dependencies).finally(() => {
    inflightLoads.delete(cacheKey);
  });

  inflightLoads.set(cacheKey, nextLoad);
  return nextLoad;
}

export function materializeMobileAppShellFromSnapshot(snapshot: CachedAppShellSnapshot): MobileAppShell {
  const calendarMap = new Map(
    snapshot.calendars.map((calendar) => [calendar.id, { ...calendar }] satisfies [string, AppCalendar])
  );

  const groups: AppGroup[] = snapshot.groups.map((group) => ({
    id: group.id,
    name: group.name,
    role: group.role,
    calendars: group.calendarIds
      .map((calendarId) => calendarMap.get(calendarId) ?? null)
      .filter((calendar): calendar is AppCalendar => calendar !== null),
    joinCode: null,
    joinCodeStatus: 'unavailable'
  }));

  const memberships: AppMembership[] = snapshot.groups.map((group) => ({
    groupId: group.id,
    userId: snapshot.viewer.id,
    role: group.role
  }));

  return {
    viewer: snapshot.viewer,
    memberships,
    groups,
    calendars: snapshot.calendars.map((calendar) => ({ ...calendar })),
    primaryCalendar: snapshot.primaryCalendarId ? (calendarMap.get(snapshot.primaryCalendarId) ?? null) : null,
    onboardingState: snapshot.onboardingState
  };
}

export function loadCachedMobileAppShell(snapshot: CachedAppShellSnapshot): MobileShellLoadSuccess {
  return {
    ok: true,
    bootstrapMode: snapshot.onboardingState === 'needs-group' ? 'needs-group' : 'ready',
    appShell: materializeMobileAppShellFromSnapshot(snapshot),
    loadedFromCache: true,
    routeMode: 'cached-offline',
    snapshotOrigin: 'cached-offline',
    continuity: readyContinuity(snapshot.refreshedAt)
  };
}

export function resolveMobileCalendarRoute(params: {
  appShell: MobileAppShell;
  calendarId: string;
  userId: string | null | undefined;
}): MobileCalendarRouteResult {
  const state = resolveCalendarPageState({
    calendarId: params.calendarId,
    userId: params.userId,
    memberships: params.appShell.memberships,
    calendars: params.appShell.calendars
  });

  if (state.kind === 'calendar') {
    return {
      kind: 'calendar',
      bootstrapMode: params.appShell.onboardingState === 'needs-group' ? 'needs-group' : 'ready',
      appShell: params.appShell,
      state
    };
  }

  return {
    kind: 'denied',
    bootstrapMode: params.appShell.onboardingState === 'needs-group' ? 'needs-group' : 'ready',
    appShell: params.appShell,
    state
  };
}

export function primaryCalendarLandingHref(appShell: MobileAppShell): string | null {
  return appShell.primaryCalendar ? `/calendars/${appShell.primaryCalendar.id}` : null;
}

export async function resolveMobileProtectedEntryState(params: {
  pathname: string;
  search?: string;
  authPhase: 'bootstrapping' | 'signed-out' | 'authenticated' | 'invalid-session' | 'error';
  authReasonCode?: string | null;
  now?: Date;
  continuityStorage?: MobileContinuityStorage;
  continuityStorageTimeoutMs?: number;
  offlineStorage?: MobileOfflineStorage;
  offlineStorageTimeoutMs?: number;
}): Promise<MobileProtectedEntryState> {
  const isProtectedRoute = isProtectedPath(params.pathname);
  const requestedCalendarId = extractRequestedCalendarId(params.pathname);
  const signInHref = isProtectedRoute
    ? buildSignInTarget(
        params.pathname,
        params.search ?? '',
        params.authPhase === 'invalid-session' ? 'INVALID_SESSION' : 'AUTH_REQUIRED'
      )
    : null;

  if (!isProtectedRoute) {
    return {
      isProtectedRoute,
      routeMode: 'public',
      snapshotOrigin: 'none',
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: null,
      continuityReason: null,
      continuityDetail: null,
      lastTrustedRefreshAt: null,
      signInHref
    };
  }

  if (params.authPhase === 'authenticated') {
    return {
      isProtectedRoute,
      routeMode: 'trusted-online',
      snapshotOrigin: 'trusted-online',
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: null,
      continuityReason: null,
      continuityDetail: null,
      lastTrustedRefreshAt: null,
      signInHref: null
    };
  }

  if (!canUseCachedContinuity(params.authPhase, params.authReasonCode ?? null)) {
    return {
      isProtectedRoute,
      routeMode: 'denied',
      snapshotOrigin: 'none',
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: params.authReasonCode ?? (params.authPhase === 'invalid-session' ? 'INVALID_SESSION' : 'AUTH_REQUIRED'),
      continuityReason: null,
      continuityDetail: describeProtectedEntryDenial(params.authPhase, params.authReasonCode ?? null),
      lastTrustedRefreshAt: null,
      signInHref
    };
  }

  const lookup = await readMobileCachedAppShellSnapshot({
    calendarId: requestedCalendarId,
    now: params.now,
    storage: params.continuityStorage,
    timeoutMs: params.continuityStorageTimeoutMs
  });

  if (lookup.status !== 'available') {
    return {
      isProtectedRoute,
      routeMode: 'denied',
      snapshotOrigin: 'none',
      requestedCalendarId,
      cachedSnapshot: null,
      denialReasonCode: lookup.reason,
      continuityReason: lookup.reason,
      continuityDetail: lookup.detail,
      lastTrustedRefreshAt: null,
      signInHref
    };
  }

  if (requestedCalendarId) {
    const continuity = await hasSyncedCalendarContinuity(
      {
        userId: lookup.snapshot.viewer.id,
        calendarId: requestedCalendarId
      },
      {
        storage: params.offlineStorage,
        timeoutMs: params.offlineStorageTimeoutMs
      }
    );

    if (!continuity.ok) {
      return {
        isProtectedRoute,
        routeMode: 'denied',
        snapshotOrigin: 'none',
        requestedCalendarId,
        cachedSnapshot: null,
        denialReasonCode: 'storage-unavailable',
        continuityReason: 'storage-unavailable',
        continuityDetail: continuity.detail,
        lastTrustedRefreshAt: null,
        signInHref
      };
    }

    if (!continuity.hasWeek) {
      return {
        isProtectedRoute,
        routeMode: 'denied',
        snapshotOrigin: 'none',
        requestedCalendarId,
        cachedSnapshot: null,
        denialReasonCode: 'calendar-not-synced',
        continuityReason: 'calendar-not-synced',
        continuityDetail:
          'No previously synced week metadata exists for that calendar on this device, so cached continuity failed closed.',
        lastTrustedRefreshAt: null,
        signInHref
      };
    }
  }

  return {
    isProtectedRoute,
    routeMode: 'cached-offline',
    snapshotOrigin: 'cached-offline',
    requestedCalendarId,
    cachedSnapshot: lookup.snapshot,
    denialReasonCode: null,
    continuityReason: null,
    continuityDetail: null,
    lastTrustedRefreshAt: lookup.snapshot.refreshedAt,
    signInHref: null
  };
}

export function resetMobileAppShellCache() {
  shellCache.clear();
  inflightLoads.clear();
}

export function extractRequestedCalendarId(pathname: string): string | null {
  const match = pathname.match(/^\/calendars\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function isProtectedPath(pathname: string): boolean {
  return pathname === '/groups' || pathname.startsWith('/groups/') || pathname === '/calendars' || pathname.startsWith('/calendars/');
}

export function normalizeInternalPath(input: string | null | undefined, fallback = '/groups'): string {
  if (!input) {
    return fallback;
  }

  const normalized = input.trim();

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return fallback;
  }

  return normalized;
}

export function buildSignInTarget(pathname: string, search: string, reason: 'AUTH_REQUIRED' | 'INVALID_SESSION') {
  const returnTo = normalizeInternalPath(`${pathname}${search}`, '/groups');
  const flow = reason === 'INVALID_SESSION' ? 'invalid-session' : 'auth-required';
  return `/signin?flow=${flow}&reason=${reason}&returnTo=${encodeURIComponent(returnTo)}`;
}

function canUseCachedContinuity(
  authPhase: MobileProtectedEntryState extends never ? never : 'bootstrapping' | 'signed-out' | 'authenticated' | 'invalid-session' | 'error',
  authReasonCode: string | null
) {
  if (authPhase === 'signed-out') {
    return true;
  }

  if (authPhase !== 'error') {
    return false;
  }

  return authReasonCode === 'AUTH_BOOTSTRAP_TIMEOUT' || authReasonCode === 'AUTH_BOOTSTRAP_FAILED';
}

function describeProtectedEntryDenial(authPhase: MobileProtectedEntryState extends never ? never : 'bootstrapping' | 'signed-out' | 'authenticated' | 'invalid-session' | 'error', authReasonCode: string | null) {
  if (authPhase === 'invalid-session') {
    return 'The saved session failed trusted verification and continuity was cleared, so the protected route stayed closed.';
  }

  switch (authReasonCode) {
    case 'SUPABASE_ENV_MISSING':
      return 'Public Supabase configuration is missing, so the protected route stayed closed instead of guessing cached scope.';
    case 'AUTH_BOOTSTRAP_TIMEOUT':
      return 'Trusted auth verification timed out before continuity eligibility could be confirmed.';
    case 'AUTH_BOOTSTRAP_FAILED':
      return 'Trusted auth verification failed before continuity eligibility could be confirmed.';
    default:
      return 'Sign in with your Caluno account before opening protected groups or calendars.';
  }
}
