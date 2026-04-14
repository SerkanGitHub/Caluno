import { resolveCalendarAccess, type GroupMembership } from '$lib/access/contract';

export type AppMembership = GroupMembership;

export type AppCalendar = {
  id: string;
  groupId: string;
  name: string;
  isDefault: boolean;
};

export type AppGroup = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  calendars: AppCalendar[];
  joinCode: string | null;
  joinCodeStatus: 'active' | 'expired' | 'revoked' | 'unavailable';
};

export type ViewerSummary = {
  id: string;
  email: string;
  displayName: string;
};

export type CalendarDeniedReason =
  | 'calendar-id-invalid'
  | 'calendar-missing'
  | 'group-membership-missing'
  | 'anonymous';

export type CalendarPageState =
  | {
      kind: 'calendar';
      calendar: AppCalendar;
    }
  | {
      kind: 'denied';
      reason: CalendarDeniedReason;
      attemptedCalendarId: string;
      failurePhase: 'calendar-param' | 'calendar-lookup' | 'calendar-authorization';
    };

type GroupRecord = {
  id: string;
  name: string;
};

type CalendarRecord = {
  id: string;
  group_id: string;
  name: string;
  is_default: boolean | null;
};

type JoinCodeRecord = {
  group_id: string;
  code: string;
  expires_at: string | null;
  revoked_at: string | null;
};

export function deriveViewerSummary(params: {
  id: string;
  email: string | null | undefined;
  displayName: string | null | undefined;
}): ViewerSummary {
  const email = params.email?.trim() || 'unknown@example.com';
  const displayName = params.displayName?.trim() || email.split('@')[0] || 'Caluno member';

  return {
    id: params.id,
    email,
    displayName
  };
}

export function composeAppGroups(params: {
  userId: string;
  memberships: { group_id: string; role: 'owner' | 'member' }[];
  groups: GroupRecord[];
  calendars: CalendarRecord[];
  joinCodes: JoinCodeRecord[];
}): { memberships: AppMembership[]; groups: AppGroup[]; calendars: AppCalendar[] } {
  const memberships: AppMembership[] = params.memberships.map((membership) => ({
    groupId: membership.group_id,
    userId: params.userId,
    role: membership.role
  }));

  const calendars: AppCalendar[] = params.calendars.map((calendar) => ({
    id: calendar.id,
    groupId: calendar.group_id,
    name: calendar.name,
    isDefault: Boolean(calendar.is_default)
  }));

  const joinCodeMap = new Map<string, JoinCodeRecord>();
  for (const joinCode of params.joinCodes) {
    if (!joinCodeMap.has(joinCode.group_id)) {
      joinCodeMap.set(joinCode.group_id, joinCode);
    }
  }

  const membershipByGroup = new Map(params.memberships.map((membership) => [membership.group_id, membership]));

  const groups = params.groups
    .map((group) => {
      const membership = membershipByGroup.get(group.id);
      if (!membership) {
        return null;
      }

      const visibleJoinCode = joinCodeMap.get(group.id);
      const groupCalendars = calendars
        .filter((calendar) => calendar.groupId === group.id)
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return left.isDefault ? -1 : 1;
          }

          return left.name.localeCompare(right.name);
        });

      return {
        id: group.id,
        name: group.name,
        role: membership.role,
        calendars: groupCalendars,
        joinCode: visibleJoinCode?.code ?? null,
        joinCodeStatus: resolveJoinCodeStatus(visibleJoinCode)
      } satisfies AppGroup;
    })
    .filter((group): group is AppGroup => group !== null)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    memberships,
    groups,
    calendars: groups.flatMap((group) => group.calendars)
  };
}

export function pickPrimaryCalendar(groups: AppGroup[]): AppCalendar | null {
  for (const group of groups) {
    const defaultCalendar = group.calendars.find((calendar) => calendar.isDefault);
    if (defaultCalendar) {
      return defaultCalendar;
    }

    if (group.calendars[0]) {
      return group.calendars[0];
    }
  }

  return null;
}

export function resolveCalendarPageState(params: {
  calendarId: string;
  userId: string | null | undefined;
  memberships: AppMembership[];
  calendars: AppCalendar[];
}): CalendarPageState {
  if (!isUuidLike(params.calendarId)) {
    return {
      kind: 'denied',
      attemptedCalendarId: params.calendarId,
      reason: 'calendar-id-invalid',
      failurePhase: 'calendar-param'
    };
  }

  const accessResult = resolveCalendarAccess({
    calendars: params.calendars,
    memberships: params.memberships,
    calendarId: params.calendarId,
    userId: params.userId
  });

  if (!accessResult.allowed) {
    const deniedReason =
      accessResult.reason === 'authenticated-group-member'
        ? 'group-membership-missing'
        : accessResult.reason;

    return {
      kind: 'denied',
      attemptedCalendarId: params.calendarId,
      reason: deniedReason,
      failurePhase:
        deniedReason === 'calendar-missing' ? 'calendar-lookup' : 'calendar-authorization'
    };
  }

  return {
    kind: 'calendar',
    calendar: params.calendars.find((calendar) => calendar.id === params.calendarId) as AppCalendar
  };
}

export function describeDeniedCalendarReason(reason: CalendarDeniedReason): {
  badge: string;
  title: string;
  detail: string;
} {
  switch (reason) {
    case 'calendar-id-invalid':
      return {
        badge: 'Route rejected',
        title: 'That calendar address is malformed.',
        detail: 'The route parameter was rejected before any trusted calendar lookup could run.'
      };

    case 'calendar-missing':
      return {
        badge: 'Lookup denied',
        title: 'That calendar does not exist in your permitted scope.',
        detail: 'Caluno failed closed instead of rendering an empty calendar for a guessed or stale id.'
      };

    case 'group-membership-missing':
      return {
        badge: 'Access denied',
        title: 'Your session is not a member of the group behind this calendar.',
        detail: 'The calendar id was recognized, but membership proof was missing, so the view stayed locked.'
      };

    case 'anonymous':
      return {
        badge: 'Authentication required',
        title: 'Sign in before opening protected calendars.',
        detail: 'Calendar access is resolved only for trusted authenticated members.'
      };
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function resolveJoinCodeStatus(joinCode: JoinCodeRecord | undefined): AppGroup['joinCodeStatus'] {
  if (!joinCode) {
    return 'unavailable';
  }

  if (joinCode.revoked_at) {
    return 'revoked';
  }

  if (joinCode.expires_at && new Date(joinCode.expires_at).getTime() <= Date.now()) {
    return 'expired';
  }

  return 'active';
}
