import { redirect } from "@sveltejs/kit";
async function logout(locals) {
  const { error } = await locals.supabase.auth.signOut();
  if (error) {
    const reason = /timeout/i.test(error.message) ? "LOGOUT_TIMEOUT" : "LOGOUT_FAILED";
    throw redirect(303, `/signin?flow=logout-error&reason=${reason}`);
  }
  throw redirect(303, "/signin?flow=signed-out");
}
const GET = async ({ locals }) => logout(locals);
const POST = async ({ locals }) => logout(locals);
export {
  GET,
  POST
};
