import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function getSupabaseAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null as null };
  }
  return { supabase, user };
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAuthError() {
  return jsonError(401, "로그인이 필요합니다.");
}

/** User-facing 500 body; log the underlying cause separately. */
export const INTERNAL_ERROR_MESSAGE =
  "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export function jsonInternalError(context: string, cause: unknown) {
  console.error(`[api] ${context}`, cause);
  return jsonError(500, INTERNAL_ERROR_MESSAGE);
}
