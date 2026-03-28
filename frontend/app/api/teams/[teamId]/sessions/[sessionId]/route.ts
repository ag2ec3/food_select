import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";
import type {
  Candidate,
  Decision,
  Session,
  Vote,
} from "@/lib/types";

type RouteContext = {
  params: Promise<{ teamId: string; sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId, sessionId } = await context.params;
  if (!teamId || !sessionId) {
    return jsonError(400, "경로가 올바르지 않습니다.");
  }

  const { data: sessionRow, error: sErr } = await supabase
    .from("sessions")
    .select(
      `
      id,
      team_id,
      status,
      created_at,
      closed_at,
      teams ( name )
    `,
    )
    .eq("id", sessionId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (sErr) {
    return jsonInternalError("session detail: load session", sErr);
  }
  if (!sessionRow) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }

  const teamsRel = sessionRow.teams as { name: string } | { name: string }[] | null;
  const teamNameFromRel = Array.isArray(teamsRel)
    ? teamsRel[0]?.name
    : teamsRel?.name;
  const session = {
    id: sessionRow.id,
    team_id: sessionRow.team_id,
    status: sessionRow.status,
    created_at: sessionRow.created_at,
    closed_at: sessionRow.closed_at,
  };

  const [
    { data: candidates, error: cErr },
    { data: votes, error: vErr },
    { data: decision, error: dErr },
  ] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, session_id, user_id, menu_name, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("votes")
      .select("id, session_id, user_id, candidate_id, voted_at")
      .eq("session_id", sessionId),
    supabase
      .from("decisions")
      .select("id, session_id, candidate_id, decided_at")
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  if (cErr) {
    return jsonInternalError("session detail: candidates", cErr);
  }
  if (vErr) {
    return jsonInternalError("session detail: votes", vErr);
  }
  if (dErr) {
    return jsonInternalError("session detail: decision", dErr);
  }

  const candList = (candidates ?? []) as Candidate[];
  const voteList = (votes ?? []) as Vote[];
  const decisionRow = (decision ?? null) as Decision | null;

  const counts = new Map<string, number>();
  for (const c of candList) counts.set(c.id, 0);
  for (const v of voteList) {
    counts.set(v.candidate_id, (counts.get(v.candidate_id) ?? 0) + 1);
  }

  const candidatesWithCounts = candList.map((c) => ({
    ...c,
    vote_count: counts.get(c.id) ?? 0,
  }));

  let confirmed_menu_name: string | null = null;
  if (decisionRow) {
    const winner = candList.find((c) => c.id === decisionRow.candidate_id);
    confirmed_menu_name = winner?.menu_name ?? null;
  }

  return NextResponse.json({
    session: session as Session,
    team_name: teamNameFromRel ?? null,
    candidates: candidatesWithCounts,
    votes: voteList,
    decision: decisionRow,
    confirmed_menu_name,
  });
}
