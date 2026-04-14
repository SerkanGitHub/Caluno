export type GroupRole = 'owner' | 'member';

export type GroupMembership = {
  groupId: string;
  userId: string;
  role: GroupRole;
};

export type CalendarRecord = {
  id: string;
  groupId: string;
  isDefault?: boolean;
};

export type CalendarAccessResult = {
  allowed: boolean;
  reason: 'authenticated-group-member' | 'anonymous' | 'group-membership-missing' | 'calendar-missing';
};

export function normalizeJoinCode(input: string | null | undefined): string | null {
  const normalized = (input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.length > 0 ? normalized : null;
}

export function hasGroupMembership(
  memberships: GroupMembership[],
  userId: string | null | undefined,
  groupId: string
): boolean {
  if (!userId) {
    return false;
  }

  return memberships.some((membership) => membership.userId === userId && membership.groupId === groupId);
}

export function resolveCalendarAccess(params: {
  calendars: CalendarRecord[];
  memberships: GroupMembership[];
  calendarId: string;
  userId: string | null | undefined;
}): CalendarAccessResult {
  const calendar = params.calendars.find((candidate) => candidate.id === params.calendarId);

  if (!calendar) {
    return {
      allowed: false,
      reason: 'calendar-missing'
    };
  }

  if (!params.userId) {
    return {
      allowed: false,
      reason: 'anonymous'
    };
  }

  if (!hasGroupMembership(params.memberships, params.userId, calendar.groupId)) {
    return {
      allowed: false,
      reason: 'group-membership-missing'
    };
  }

  return {
    allowed: true,
    reason: 'authenticated-group-member'
  };
}
