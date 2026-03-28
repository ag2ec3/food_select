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
