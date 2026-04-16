import "@supabase/ssr";
function buildProtectedAppShellFromSnapshot(snapshot) {
  const calendars = snapshot.calendars.map((calendar) => ({
    id: calendar.id,
    groupId: calendar.groupId,
    name: calendar.name,
    isDefault: calendar.isDefault
  }));
  const memberships = snapshot.groups.map((group) => ({
    groupId: group.id,
    userId: snapshot.viewer.id,
    role: group.role
  }));
  const groups = snapshot.groups.map((group) => ({
    id: group.id,
    name: group.name,
    role: group.role,
    calendars: group.calendarIds.map((calendarId) => calendars.find((calendar) => calendar.id === calendarId) ?? null).filter((calendar) => calendar !== null),
    joinCode: null,
    joinCodeStatus: "unavailable"
  }));
  return {
    viewer: {
      id: snapshot.viewer.id,
      email: snapshot.viewer.email,
      displayName: snapshot.viewer.displayName
    },
    memberships,
    groups,
    calendars,
    primaryCalendar: calendars.find((calendar) => calendar.id === snapshot.primaryCalendarId) ?? null,
    onboardingState: snapshot.onboardingState
  };
}
function resolveProtectedShellRouteData(params) {
  if (params.serverAppShell) {
    return {
      appShell: params.serverAppShell,
      protectedShellState: {
        mode: "trusted-online",
        reason: null,
        detail: "Protected navigation and calendar scope came from the trusted server load.",
        refreshedAt: null,
        visibleCalendarIds: params.serverAppShell.calendars.map((calendar) => calendar.id)
      }
    };
  }
  if (params.cachedLookup?.status === "available") {
    const appShell = buildProtectedAppShellFromSnapshot(params.cachedLookup.snapshot);
    return {
      appShell,
      protectedShellState: {
        mode: "cached-offline",
        reason: null,
        detail: "Protected navigation reopened from the last trusted browser-local shell snapshot.",
        refreshedAt: params.cachedLookup.snapshot.refreshedAt,
        visibleCalendarIds: appShell.calendars.map((calendar) => calendar.id)
      }
    };
  }
  return {
    appShell: null,
    protectedShellState: {
      mode: "offline-denied",
      reason: params.cachedLookup?.status === "unavailable" ? params.cachedLookup.reason : "cache-missing",
      detail: params.cachedLookup?.status === "unavailable" ? params.cachedLookup.detail : "No trusted browser-local shell snapshot is available, so offline continuity stayed locked down.",
      refreshedAt: null,
      visibleCalendarIds: []
    }
  };
}
const load = async ({ data, parent }) => {
  await parent();
  {
    return resolveProtectedShellRouteData({
      serverAppShell: data.appShell
    });
  }
};
export {
  load
};
