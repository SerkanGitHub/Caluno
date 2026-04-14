import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function logout(locals: App.Locals): Promise<Response> {
  const { error } = await locals.supabase.auth.signOut();

  if (error) {
    const reason = /timeout/i.test(error.message) ? 'LOGOUT_TIMEOUT' : 'LOGOUT_FAILED';
    throw redirect(303, `/signin?flow=logout-error&reason=${reason}`);
  }

  throw redirect(303, '/signin?flow=signed-out');
}

export const GET: RequestHandler = async ({ locals }) => logout(locals);
export const POST: RequestHandler = async ({ locals }) => logout(locals);
