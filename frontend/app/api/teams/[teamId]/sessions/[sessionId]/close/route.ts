import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";

type RouteContext = {
  params: Promise<{ teamId: string; sessionId: string }>;
};

type CloseRpcRow = { candidate_id: string; decided_at: string };

function mapCloseRpcError(message: string, code?: string) {
  if (message.includes("ERR_CLOSE_NO_CANDIDATES")) {
    return jsonError(400, "메뉴를 작성해주세요");
  }
  if (message.includes("ERR_CLOSE_ALREADY_CLOSED")) {
    return jsonError(400, "이미 마감된 세션입니다.");
  }
  if (message.includes("ERR_CLOSE_SESSION_NOT_FOUND")) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }
  if (message.includes("ERR_CLOSE_WRONG_TEAM")) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }
  if (message.includes("ERR_CLOSE_NOT_AUTHENTICATED")) {
    return jsonError(401, "로그인이 필요합니다.");
  }
  if (message.includes("ERR_CLOSE_NOT_MEMBER")) {
    return jsonError(403, "이 팀에 세션을 마감할 권한이 없습니다.");
  }
  if (code === "23505") {
    return jsonError(400, "이미 마감된 세션입니다.");
  }
  return null;
}

export async function PATCH(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId, sessionId } = await context.params;
  if (!teamId || !sessionId) {
    return jsonError(400, "경로가 올바르지 않습니다.");
  }

  const { data, error } = await supabase.rpc("close_session_pick_winner", {
    p_team_id: teamId,
    p_session_id: sessionId,
  });

  if (error) {
    const mapped = mapCloseRpcError(error.message ?? "", error.code);
    if (mapped) return mapped;
    return jsonInternalError("close_session_pick_winner", error);
  }

  const raw = data as CloseRpcRow | CloseRpcRow[] | null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.candidate_id || !row?.decided_at) {
    return jsonInternalError("close_session_pick_winner empty data", data);
  }

  return NextResponse.json({
    ok: true,
    candidate_id: row.candidate_id,
    decided_at: row.decided_at,
  });
}
