import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseSupabasePublicEnv } from "@/lib/supabase/publicEnv";

/**
 * Refreshes the Supabase session on each matched request so cookies stay in sync.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const env = parseSupabasePublicEnv();
  if (!env.ok) {
    console.error("[supabase middleware]", env.message);
    return supabaseResponse;
  }

  const { url, anonKey } = env;

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    await supabase.auth.getUser();
  } catch (err) {
    console.error("[supabase middleware] session refresh failed", err);
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
