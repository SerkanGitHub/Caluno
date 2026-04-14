import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeInternalPath } from '$lib/server/auth-flow';

async function clearUntrustedSession(locals: App.Locals) {
  await locals.supabase.auth.signOut();
}

export const GET: RequestHandler = async ({ url, locals }) => {
  const next = normalizeInternalPath(
    url.searchParams.get('next') ?? url.searchParams.get('returnTo'),
    '/groups'
  );

  if (url.searchParams.get('error')) {
    await clearUntrustedSession(locals);
    throw redirect(303, '/signin?flow=callback-error&reason=AUTH_CALLBACK_ERROR');
  }

  const code = url.searchParams.get('code');

  if (!code) {
    await clearUntrustedSession(locals);
    throw redirect(303, '/signin?flow=callback-error&reason=CALLBACK_CODE_MISSING');
  }

  const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    await clearUntrustedSession(locals);
    const reason = /timeout/i.test(error.message) ? 'CALLBACK_TIMEOUT' : 'CALLBACK_ERROR';
    throw redirect(303, `/signin?flow=callback-error&reason=${reason}`);
  }

  if (!data.session || !data.user) {
    await clearUntrustedSession(locals);
    throw redirect(303, '/signin?flow=callback-error&reason=CALLBACK_RESULT_INVALID');
  }

  throw redirect(303, next);
};
