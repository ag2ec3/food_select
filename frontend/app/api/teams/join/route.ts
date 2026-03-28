import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";

function mapJoinRpcError(message: string) {
  if (message.includes("invalid_invite")) {
    return jsonError(
      404,
      "초대 코드를 찾을 수 없습니다. 코드를 확인해 주세요.",
    );
  }
  if (message.includes("already_member")) {
    return jsonError(409, "이미 참가한 팀입니다.");
  }
  if (message.includes("not_authenticated")) {
    return requireAuthError();
  }
  return null;
}

export async function POST(request: Request) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

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

  const { data, error } = await supabase.rpc("join_team_by_invite_code", {
    p_invite: inviteCode.trim(),
  });

  if (error) {
    const mapped = mapJoinRpcError(error.message ?? "");
    if (mapped) return mapped;
    return jsonInternalError("join_team_by_invite_code", error);
  }

  const teamId = typeof data === "string" ? data : null;
  if (!teamId) {
    return jsonInternalError(
      "join_team_by_invite_code empty data",
      new Error("missing team id"),
    );
  }

  return NextResponse.json({ ok: true, team_id: teamId });
}
