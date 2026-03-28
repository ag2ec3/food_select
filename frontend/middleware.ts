import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    console.error("[middleware]", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Skip API routes: Route Handlers already call getSupabaseAndUser(); running
     * middleware on /api would duplicate auth refresh work per request.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
