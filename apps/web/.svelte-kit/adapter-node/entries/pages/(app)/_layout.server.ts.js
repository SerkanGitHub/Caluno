import { redirect, error } from "@sveltejs/kit";
import { d as deriveViewerSummary, c as composeAppGroups, p as pickPrimaryCalendar } from "../../../chunks/app-shell.js";
import { n as normalizeInternalPath } from "../../../chunks/auth-flow.js";
function buildRedirectTarget(pathname, search, reason) {
  const returnTo = normalizeInternalPath(`${pathname}${search}`, "/groups");
  return `/signin?flow=${reason === "INVALID_SESSION" ? "invalid-session" : "auth-required"}&reason=${reason}&returnTo=${encodeURIComponent(returnTo)}`;
}
const load = async ({ locals, url }) => {
  const authState = await locals.safeGetSession();
  if (authState.authStatus !== "authenticated" || !authState.user) {
    throw redirect(
      303,
      buildRedirectTarget(url.pathname, url.search, authState.authStatus === "invalid" ? "INVALID_SESSION" : "AUTH_REQUIRED")
    );
  }
  const metadata = authState.user.user_metadata ?? {};
  const viewer = deriveViewerSummary({
    id: authState.user.id,
    email: authState.user.email,
    displayName: metadata.display_name ?? metadata.full_name ?? null
  });
  const membershipResult = await locals.supabase.from("group_memberships").select("group_id, role").eq("user_id", authState.user.id).returns();
  if (membershipResult.error) {
    throw error(500, "APP_SHELL_MEMBERSHIP_LOAD_FAILED");
  }
  const membershipRows = membershipResult.data ?? [];
  const groupIds = membershipRows.map((membership) => membership.group_id);
  if (groupIds.length === 0) {
    return {
      appShell: {
        viewer,
        memberships: [],
        groups: [],
        calendars: [],
        primaryCalendar: null,
        onboardingState: "needs-group"
      }
    };
  }
  const [groupsResult, calendarsResult, joinCodesResult] = await Promise.all([
    locals.supabase.from("groups").select("id, name").in("id", groupIds).returns(),
    locals.supabase.from("calendars").select("id, group_id, name, is_default").in("group_id", groupIds).order("is_default", { ascending: false }).order("name", { ascending: true }).returns(),
    locals.supabase.from("group_join_codes").select("group_id, code, expires_at, revoked_at").in("group_id", groupIds).order("created_at", { ascending: false }).returns()
  ]);
  if (groupsResult.error) {
    throw error(500, "APP_SHELL_GROUP_LOAD_FAILED");
  }
  if (calendarsResult.error) {
    throw error(500, "APP_SHELL_CALENDAR_LOAD_FAILED");
  }
  if (joinCodesResult.error) {
    throw error(500, "APP_SHELL_JOIN_CODE_LOAD_FAILED");
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
      onboardingState: groups.length === 0 ? "needs-group" : "ready"
    }
  };
};
export {
  load
};
