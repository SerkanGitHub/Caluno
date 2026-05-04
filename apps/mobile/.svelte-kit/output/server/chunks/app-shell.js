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
export {
  describeDeniedCalendarReason as d
};
