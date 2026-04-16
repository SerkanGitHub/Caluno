const load = async ({ data, params, parent, url }) => {
  await parent();
  {
    return {
      ...data,
      protectedCalendarState: {
        mode: "trusted-online",
        reason: null,
        detail: "Week data and calendar scope came from the trusted server route.",
        cachedAt: null,
        visibleWeekStart: data.calendarView.kind === "calendar" ? data.calendarView.schedule.visibleWeek.start : null,
        visibleWeekOrigin: data.calendarView.kind === "calendar" ? "server-sync" : null
      }
    };
  }
};
export {
  load
};
