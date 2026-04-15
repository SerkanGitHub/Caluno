function deriveViewerSummary(params) {
  const email = params.email?.trim() || "unknown@example.com";
  const displayName = params.displayName?.trim() || email.split("@")[0] || "Caluno member";
  return {
    id: params.id,
    email,
    displayName
  };
}
function composeAppGroups(params) {
  const memberships = params.memberships.map((membership) => ({
    groupId: membership.group_id,
    userId: params.userId,
    role: membership.role
  }));
  const calendars = params.calendars.map((calendar) => ({
    id: calendar.id,
    groupId: calendar.group_id,
    name: calendar.name,
    isDefault: Boolean(calendar.is_default)
  }));
  const joinCodeMap = /* @__PURE__ */ new Map();
  for (const joinCode of params.joinCodes) {
    if (!joinCodeMap.has(joinCode.group_id)) {
      joinCodeMap.set(joinCode.group_id, joinCode);
    }
  }
  const membershipByGroup = new Map(params.memberships.map((membership) => [membership.group_id, membership]));
  const groups = params.groups.map((group) => {
    const membership = membershipByGroup.get(group.id);
    if (!membership) {
      return null;
    }
    const visibleJoinCode = joinCodeMap.get(group.id);
    const groupCalendars = calendars.filter((calendar) => calendar.groupId === group.id).sort((left, right) => {
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
    };
  }).filter((group) => group !== null).sort((left, right) => left.name.localeCompare(right.name));
  return {
    memberships,
    groups,
    calendars: groups.flatMap((group) => group.calendars)
  };
}
function pickPrimaryCalendar(groups) {
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
function describeDeniedCalendarReason(reason) {
  switch (reason) {
    case "calendar-id-invalid":
      return {
        badge: "Route rejected",
        title: "That calendar address is malformed.",
        detail: "The route parameter was rejected before any trusted calendar lookup could run."
      };
    case "calendar-missing":
      return {
        badge: "Lookup denied",
        title: "That calendar does not exist in your permitted scope.",
        detail: "Caluno failed closed instead of rendering an empty calendar for a guessed or stale id."
      };
    case "group-membership-missing":
      return {
        badge: "Access denied",
        title: "Your session is not a member of the group behind this calendar.",
        detail: "The calendar id was recognized, but membership proof was missing, so the view stayed locked."
      };
    case "anonymous":
      return {
        badge: "Authentication required",
        title: "Sign in before opening protected calendars.",
        detail: "Calendar access is resolved only for trusted authenticated members."
      };
  }
}
function resolveJoinCodeStatus(joinCode) {
  if (!joinCode) {
    return "unavailable";
  }
  if (joinCode.revoked_at) {
    return "revoked";
  }
  if (joinCode.expires_at && new Date(joinCode.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}
export {
  describeDeniedCalendarReason as a,
  composeAppGroups as c,
  deriveViewerSummary as d,
  pickPrimaryCalendar as p
};
