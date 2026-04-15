import { W as WORKER_ISOLATION_HEADERS } from "../chunks/runtime.js";
import { createServerClient } from "@supabase/ssr";
import { p as public_env } from "../chunks/shared-server.js";
function readSupabasePublicEnv(source = public_env) {
  const url = source.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = source.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    const missing = [];
    if (!url) {
      missing.push("PUBLIC_SUPABASE_URL");
    }
    if (!publishableKey) {
      missing.push("PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
    throw new Error(`Missing required public Supabase env: ${missing.join(", ")}`);
  }
  return {
    url,
    publishableKey
  };
}
function createSupabaseServerClient(event) {
  const { url, publishableKey } = readSupabasePublicEnv();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: "/" });
        });
      }
    }
  });
}
async function safeGetSession(client) {
  const {
    data: { session }
  } = await client.auth.getSession();
  if (!session) {
    return {
      session: null,
      user: null,
      authStatus: "anonymous"
    };
  }
  const {
    data: { user },
    error
  } = await client.auth.getUser();
  if (error || !user) {
    return {
      session: null,
      user: null,
      authStatus: "invalid"
    };
  }
  return {
    session,
    user,
    authStatus: "authenticated"
  };
}
const handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event);
  event.locals.safeGetSession = () => safeGetSession(event.locals.supabase);
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version";
    }
  });
  for (const [headerName, headerValue] of Object.entries(WORKER_ISOLATION_HEADERS)) {
    response.headers.set(headerName, headerValue);
  }
  return response;
};
export {
  handle
};
