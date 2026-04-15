const load = async ({ depends, locals }) => {
  depends("supabase:auth");
  return locals.safeGetSession();
};
export {
  load
};
