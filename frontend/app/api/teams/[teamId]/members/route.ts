import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";
import type { TeamMemberListItem } from "@/lib/types";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId } = await context.params;
  if (!teamId) {
    return jsonError(400, "팀이 지정되지 않았습니다.");
  }

  const { data: myMembership, error: mErr } = await supabase
    .from("memberships")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mErr) {
    return jsonInternalError("members GET: my membership", mErr);
  }
  if (!myMembership) {
    return jsonError(403, "이 팀의 멤버만 멤버 목록을 볼 수 있습니다.");
  }

  const { data: rows, error } = await supabase
    .from("memberships")
    .select("user_id, role, joined_at")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error) {
    if (error.code === "42501" || error.message.includes("permission")) {
      return jsonError(403, "이 팀의 멤버만 멤버 목록을 볼 수 있습니다.");
    }
    return jsonInternalError("members GET: list", error);
  }

  return NextResponse.json({
    members: (rows ?? []) as TeamMemberListItem[],
  });
}
