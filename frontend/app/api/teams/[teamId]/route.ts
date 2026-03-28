import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";
import type { Team } from "@/lib/types";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId } = await context.params;
  if (!teamId) {
    return jsonError(400, "팀이 지정되지 않았습니다.");
  }

  const { data: row, error } = await supabase
    .from("teams")
    .select("id, name, created_at")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    return jsonInternalError("team GET", error);
  }
  if (!row) {
    return jsonError(404, "팀을 찾을 수 없습니다.");
  }

  return NextResponse.json({ team: row as Team });
}
