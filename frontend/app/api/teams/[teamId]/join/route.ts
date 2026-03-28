import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId } = await context.params;
  if (!teamId) {
    return jsonError(400, "팀이 지정되지 않았습니다.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "요청 본문이 올바르지 않습니다.");
  }

  const inviteCode =
    typeof body === "object" &&
    body !== null &&
    "invite_code" in body &&
    typeof (body as { invite_code: unknown }).invite_code === "string"
      ? (body as { invite_code: string }).invite_code
      : "";

  if (!inviteCode.trim()) {
    return jsonError(400, "초대 코드를 입력해 주세요.");
  }

  const { error } = await supabase.rpc("join_team_by_invite", {
    p_team_id: teamId,
    p_invite: inviteCode,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("invalid_invite")) {
      return jsonError(
        404,
        "초대 코드를 찾을 수 없습니다. 코드를 확인해 주세요.",
      );
    }
    if (msg.includes("already_member")) {
      return jsonError(409, "이미 참가한 팀입니다.");
    }
    if (msg.includes("not_authenticated")) {
      return requireAuthError();
    }
    return jsonInternalError("join_team_by_invite", error);
  }

  return NextResponse.json({ ok: true });
}
