// @ts-nocheck
import type { LayoutServerLoad } from './$types';

export const load = async ({ depends, locals }: Parameters<LayoutServerLoad>[0]) => {
  depends('supabase:auth');

  return locals.safeGetSession();
};
