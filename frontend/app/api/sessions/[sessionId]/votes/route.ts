import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";
import type { Vote } from "@/lib/types";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { sessionId } = await context.params;
  if (!sessionId) {
    return jsonError(400, "세션이 지정되지 않았습니다.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "요청 본문이 올바르지 않습니다.");
  }

  const candidateId =
    typeof body === "object" &&
    body !== null &&
    "candidate_id" in body &&
    typeof (body as { candidate_id: unknown }).candidate_id === "string"
      ? (body as { candidate_id: string }).candidate_id
      : "";

  if (!candidateId) {
    return jsonError(400, "후보를 선택해 주세요.");
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sErr) {
    return jsonInternalError("votes: load session", sErr);
  }
  if (!session) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }
  if (session.status === "closed") {
    return jsonError(400, "마감된 세션에는 투표할 수 없습니다.");
  }

  const { data: cand, error: cErr } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (cErr) {
    return jsonInternalError("votes: load candidate", cErr);
  }
  if (!cand) {
    return jsonError(404, "후보를 찾을 수 없습니다.");
  }

  const votedAt = new Date().toISOString();

  const { error: delErr } = await supabase
    .from("votes")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (delErr) {
    return jsonInternalError("votes: delete previous", delErr);
  }

  const { data: row, error: insErr } = await supabase
    .from("votes")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      candidate_id: candidateId,
      voted_at: votedAt,
    })
    .select("id, session_id, user_id, candidate_id, voted_at")
    .single();

  if (insErr) {
    return jsonInternalError("votes: insert", insErr);
  }

  return NextResponse.json(row as Vote);
}
