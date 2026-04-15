import { fail, redirect } from "@sveltejs/kit";
import { n as normalizeInternalPath, r as resolveAuthSurface } from "../../../../chunks/auth-flow.js";
function getAuthDisplayName(user) {
  const metadata = user.user_metadata ?? {};
  const displayName = typeof metadata.display_name === "string" ? metadata.display_name : typeof metadata.full_name === "string" ? metadata.full_name : null;
  return displayName?.trim() || user.email?.split("@")[0] || "Caluno member";
}
function describeSignInReason(reason) {
  switch (reason) {
    case "SIGN_IN_TIMEOUT":
      return "The sign-in request timed out before the session could be verified. Retry in a moment.";
    case "SIGN_IN_FAILED":
    default:
      return "The supplied credentials were rejected. Check the email and password, then try again.";
  }
}
const load = async ({ locals, url }) => {
  const authState = await locals.safeGetSession();
  const returnTo = normalizeInternalPath(url.searchParams.get("returnTo"), "/groups");
  if (authState.authStatus === "authenticated" && authState.user) {
    throw redirect(303, returnTo);
  }
  if (authState.authStatus === "invalid") {
    await locals.supabase.auth.signOut();
    throw redirect(303, "/signin?flow=invalid-session&reason=INVALID_SESSION");
  }
  return {
    returnTo,
    authSurface: resolveAuthSurface(url.searchParams)
  };
};
const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const returnTo = normalizeInternalPath(String(formData.get("returnTo") ?? ""), "/groups");
    if (!email || !password) {
      return fail(400, {
        signIn: {
          status: "validation-error",
          reason: "SIGN_IN_FAILED",
          message: "Enter both email and password before requesting a trusted session.",
          fields: {
            email,
            returnTo
          }
        }
      });
    }
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      const reason = /timeout/i.test(error.message) ? "SIGN_IN_TIMEOUT" : "SIGN_IN_FAILED";
      return fail(reason === "SIGN_IN_TIMEOUT" ? 504 : 400, {
        signIn: {
          status: reason === "SIGN_IN_TIMEOUT" ? "timeout" : "auth-error",
          reason,
          message: describeSignInReason(reason),
          fields: {
            email,
            returnTo
          }
        }
      });
    }
    if (!data.session || !data.user) {
      await locals.supabase.auth.signOut();
      return fail(502, {
        signIn: {
          status: "malformed-response",
          reason: "CALLBACK_RESULT_INVALID",
          message: "The auth service returned an incomplete session payload, so the browser stayed signed out.",
          fields: {
            email,
            returnTo
          }
        }
      });
    }
    const destination = normalizeInternalPath(returnTo, "/groups");
    const displayName = getAuthDisplayName({
      email: data.user.email,
      user_metadata: data.user.user_metadata
    });
    throw redirect(303, destination || `/groups?viewer=${encodeURIComponent(displayName)}`);
  }
};
export {
  actions,
  load
};
