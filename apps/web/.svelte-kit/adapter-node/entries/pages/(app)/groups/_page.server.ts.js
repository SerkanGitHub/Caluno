import { fail, redirect } from "@sveltejs/kit";
import { n as normalizeJoinCode } from "../../../../chunks/contract.js";
import { e as extractReasonCode } from "../../../../chunks/auth-flow.js";
const GROUP_CREATE_CODES = ["AUTH_REQUIRED", "GROUP_NAME_REQUIRED"];
const GROUP_JOIN_CODES = [
  "AUTH_REQUIRED",
  "JOIN_CODE_REQUIRED",
  "JOIN_CODE_INVALID",
  "JOIN_CODE_EXPIRED",
  "JOIN_CODE_REVOKED",
  "GROUP_DEFAULT_CALENDAR_MISSING"
];
function describeCreateGroupReason(reason) {
  switch (reason) {
    case "GROUP_NAME_REQUIRED":
      return "Give the group a name before creating a protected workspace.";
    case "AUTH_REQUIRED":
      return "Your trusted session expired before the group could be created. Sign in again.";
    default:
      return "The group could not be created. Retry once the write path is responsive again.";
  }
}
function describeJoinGroupReason(reason) {
  switch (reason) {
    case "JOIN_CODE_REQUIRED":
      return "Enter a join code before requesting access.";
    case "JOIN_CODE_INVALID":
      return "That join code was not recognized. Check the characters and try again.";
    case "JOIN_CODE_EXPIRED":
      return "That join code expired, so the membership was not created.";
    case "JOIN_CODE_REVOKED":
      return "That join code was revoked and can no longer grant access.";
    case "GROUP_DEFAULT_CALENDAR_MISSING":
      return "The group exists, but its default calendar could not be resolved safely.";
    case "AUTH_REQUIRED":
      return "Your trusted session expired before the join request could be completed.";
    default:
      return "The join request could not be completed. Retry once the write path is responsive again.";
  }
}
function toRpcRow(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}
async function assertAuthenticated(locals) {
  const authState = await locals.safeGetSession();
  if (authState.authStatus !== "authenticated" || !authState.user) {
    throw redirect(303, "/signin?flow=auth-required&reason=AUTH_REQUIRED&returnTo=%2Fgroups");
  }
  return authState.user;
}
const load = async ({ parent }) => {
  const { appShell } = await parent();
  return {
    onboardingState: appShell.onboardingState
  };
};
const actions = {
  createGroup: async ({ request, locals }) => {
    await assertAuthenticated(locals);
    const formData = await request.formData();
    const groupName = String(formData.get("groupName") ?? "").trim();
    const calendarName = String(formData.get("calendarName") ?? "").trim();
    if (!groupName) {
      return fail(400, {
        createGroup: {
          status: "validation-error",
          reason: "GROUP_NAME_REQUIRED",
          message: describeCreateGroupReason("GROUP_NAME_REQUIRED"),
          fields: {
            groupName,
            calendarName
          }
        }
      });
    }
    const { data, error } = await locals.supabase.rpc("create_group_with_default_calendar", {
      p_group_name: groupName,
      p_calendar_name: calendarName || "Shared calendar"
    });
    if (error) {
      const reason = /timeout/i.test(error.message) ? "GROUP_CREATE_TIMEOUT" : extractReasonCode(error.message, GROUP_CREATE_CODES, "GROUP_CREATE_FAILED");
      return fail(reason === "GROUP_CREATE_TIMEOUT" ? 504 : 400, {
        createGroup: {
          status: reason === "GROUP_CREATE_TIMEOUT" ? "timeout" : "create-error",
          reason,
          message: reason === "GROUP_CREATE_TIMEOUT" ? "The group creation request timed out before a protected workspace could be returned." : describeCreateGroupReason(reason),
          fields: {
            groupName,
            calendarName
          }
        }
      });
    }
    const payload = toRpcRow(data);
    if (!payload?.group_id || !payload.calendar_id) {
      return fail(502, {
        createGroup: {
          status: "malformed-response",
          reason: "GROUP_CREATE_RESPONSE_INVALID",
          message: "The server did not return a usable protected workspace, so the browser stayed on onboarding.",
          fields: {
            groupName,
            calendarName
          }
        }
      });
    }
    throw redirect(303, `/calendars/${payload.calendar_id}?welcome=group-created`);
  },
  joinGroup: async ({ request, locals }) => {
    await assertAuthenticated(locals);
    const formData = await request.formData();
    const rawJoinCode = String(formData.get("joinCode") ?? "");
    const joinCode = normalizeJoinCode(rawJoinCode);
    if (!joinCode) {
      return fail(400, {
        joinGroup: {
          status: "validation-error",
          reason: "JOIN_CODE_REQUIRED",
          message: describeJoinGroupReason("JOIN_CODE_REQUIRED"),
          fields: {
            joinCode: rawJoinCode
          }
        }
      });
    }
    const { data, error } = await locals.supabase.rpc("redeem_group_join_code", {
      p_code: joinCode
    });
    if (error) {
      const reason = /timeout/i.test(error.message) ? "GROUP_JOIN_TIMEOUT" : extractReasonCode(error.message, GROUP_JOIN_CODES, "GROUP_JOIN_FAILED");
      return fail(reason === "GROUP_JOIN_TIMEOUT" ? 504 : 400, {
        joinGroup: {
          status: reason === "GROUP_JOIN_TIMEOUT" ? "timeout" : "join-error",
          reason,
          message: reason === "GROUP_JOIN_TIMEOUT" ? "The join request timed out before a protected calendar could be returned." : describeJoinGroupReason(reason),
          fields: {
            joinCode: rawJoinCode
          }
        }
      });
    }
    const payload = toRpcRow(data);
    if (!payload?.group_id || !payload.calendar_id) {
      return fail(502, {
        joinGroup: {
          status: "malformed-response",
          reason: "GROUP_JOIN_RESPONSE_INVALID",
          message: "The join request succeeded incompletely, so the browser stayed on the onboarding shell.",
          fields: {
            joinCode: rawJoinCode
          }
        }
      });
    }
    throw redirect(303, `/calendars/${payload.calendar_id}?welcome=group-joined`);
  }
};
export {
  actions,
  load
};
