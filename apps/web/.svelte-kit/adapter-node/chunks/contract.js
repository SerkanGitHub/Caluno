function normalizeJoinCode(input) {
  const normalized = (input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
}
function hasGroupMembership(memberships, userId, groupId) {
  if (!userId) {
    return false;
  }
  return memberships.some((membership) => membership.userId === userId && membership.groupId === groupId);
}
function resolveCalendarAccess(params) {
  const calendar = params.calendars.find((candidate) => candidate.id === params.calendarId);
  if (!calendar) {
    return {
      allowed: false,
      reason: "calendar-missing"
    };
  }
  if (!params.userId) {
    return {
      allowed: false,
      reason: "anonymous"
    };
  }
  if (!hasGroupMembership(params.memberships, params.userId, calendar.groupId)) {
    return {
      allowed: false,
      reason: "group-membership-missing"
    };
  }
  return {
    allowed: true,
    reason: "authenticated-group-member"
  };
}
export {
  normalizeJoinCode as n,
  resolveCalendarAccess as r
};
