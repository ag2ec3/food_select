import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  requireAuthError,
} from "@/lib/api/routeHelpers";

type RouteContext = {
  params: Promise<{ teamId: string; sessionId: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId, sessionId } = await context.params;
  if (!teamId || !sessionId) {
    return jsonError(400, "경로가 올바르지 않습니다.");
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (sErr) {
    return jsonError(500, sErr.message);
  }
  if (!session) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }
  if (session.status === "closed") {
    return jsonError(400, "이미 마감된 세션입니다.");
  }

  const { data: candidates, error: cErr } = await supabase
    .from("candidates")
    .select("id")
    .eq("session_id", sessionId);

  if (cErr) {
    return jsonError(500, cErr.message);
  }

  const candIds = (candidates ?? []).map((c) => c.id);
  if (candIds.length === 0) {
    return jsonError(400, "메뉴를 작성해주세요");
  }

  const { data: voteRows, error: vErr } = await supabase
    .from("votes")
    .select("candidate_id")
    .eq("session_id", sessionId);

  if (vErr) {
    return jsonError(500, vErr.message);
  }

  const counts = new Map<string, number>();
  for (const id of candIds) counts.set(id, 0);
  for (const v of voteRows ?? []) {
    counts.set(
      v.candidate_id,
      (counts.get(v.candidate_id) ?? 0) + 1,
    );
  }

  let max = -1;
  const winners: string[] = [];
  for (const [cid, cnt] of counts) {
    if (cnt > max) {
      max = cnt;
      winners.length = 0;
      winners.push(cid);
    } else if (cnt === max) {
      winners.push(cid);
    }
  }

  const picked =
    winners[Math.floor(Math.random() * winners.length)] ?? candIds[0];
  const decidedAt = new Date().toISOString();

  const { error: dErr } = await supabase.from("decisions").insert({
    session_id: sessionId,
    candidate_id: picked,
    decided_at: decidedAt,
  });

  if (dErr) {
    if (dErr.code === "23505") {
      return jsonError(400, "이미 마감된 세션입니다.");
    }
    return jsonError(500, dErr.message);
  }

  const { error: uErr } = await supabase
    .from("sessions")
    .update({
      status: "closed",
      closed_at: decidedAt,
    })
    .eq("id", sessionId)
    .eq("team_id", teamId);

  if (uErr) {
    return jsonError(500, uErr.message);
  }

  return NextResponse.json({ ok: true, candidate_id: picked, decided_at: decidedAt });
}
