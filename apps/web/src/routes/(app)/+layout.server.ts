import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
  composeAppGroups,
  deriveViewerSummary,
  pickPrimaryCalendar,
  type AppCalendar,
  type AppGroup,
  type AppMembership
} from '@repo/caluno-core/app-shell';
import { normalizeInternalPath } from '$lib/server/auth-flow';

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

function buildRedirectTarget(pathname: string, search: string, reason: string) {
  const returnTo = normalizeInternalPath(`${pathname}${search}`, '/groups');
  return `/signin?flow=${reason === 'INVALID_SESSION' ? 'invalid-session' : 'auth-required'}&reason=${reason}&returnTo=${encodeURIComponent(returnTo)}`;
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const authState = await locals.safeGetSession();

  if (authState.authStatus !== 'authenticated' || !authState.user) {
    throw redirect(
      303,
      buildRedirectTarget(url.pathname, url.search, authState.authStatus === 'invalid' ? 'INVALID_SESSION' : 'AUTH_REQUIRED')
    );
  }

  const metadata = (authState.user.user_metadata ?? {}) as {
    display_name?: string;
    full_name?: string;
  };

  const viewer = deriveViewerSummary({
    id: authState.user.id,
    email: authState.user.email,
    displayName: metadata.display_name ?? metadata.full_name ?? null
  });

  const membershipResult = await locals.supabase
    .from('group_memberships')
    .select('group_id, role')
    .eq('user_id', authState.user.id)
    .returns<MembershipRow[]>();

  if (membershipResult.error) {
    throw error(500, 'APP_SHELL_MEMBERSHIP_LOAD_FAILED');
  }

  const membershipRows = membershipResult.data ?? [];
  const groupIds = membershipRows.map((membership) => membership.group_id);

  if (groupIds.length === 0) {
    return {
      appShell: {
        viewer,
        memberships: [] as AppMembership[],
        groups: [] as AppGroup[],
        calendars: [] as AppCalendar[],
        primaryCalendar: null,
        onboardingState: 'needs-group' as const
      }
    };
  }

  const [groupsResult, calendarsResult, joinCodesResult] = await Promise.all([
    locals.supabase.from('groups').select('id, name').in('id', groupIds).returns<GroupRow[]>(),
    locals.supabase
      .from('calendars')
      .select('id, group_id, name, is_default')
      .in('group_id', groupIds)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
      .returns<CalendarRow[]>(),
    locals.supabase
      .from('group_join_codes')
      .select('group_id, code, expires_at, revoked_at')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .returns<JoinCodeRow[]>()
  ]);

  if (groupsResult.error) {
    throw error(500, 'APP_SHELL_GROUP_LOAD_FAILED');
  }

  if (calendarsResult.error) {
    throw error(500, 'APP_SHELL_CALENDAR_LOAD_FAILED');
  }

  if (joinCodesResult.error) {
    throw error(500, 'APP_SHELL_JOIN_CODE_LOAD_FAILED');
  }

  const { memberships, groups, calendars } = composeAppGroups({
    userId: authState.user.id,
    memberships: membershipRows,
    groups: groupsResult.data ?? [],
    calendars: calendarsResult.data ?? [],
    joinCodes: joinCodesResult.data ?? []
  });

  return {
    appShell: {
      viewer,
      memberships,
      groups,
      calendars,
      primaryCalendar: pickPrimaryCalendar(groups),
      onboardingState: groups.length === 0 ? ('needs-group' as const) : ('ready' as const)
    }
  };
};
