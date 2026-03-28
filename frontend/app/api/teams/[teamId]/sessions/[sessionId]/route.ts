import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
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

  const [{ data: candidates }, { data: votes }, { data: decision }] =
    await Promise.all([
      supabase
        .from("candidates")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
      supabase.from("votes").select("*").eq("session_id", sessionId),
      supabase.from("decisions").select("*").eq("session_id", sessionId).maybeSingle(),
    ]);

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
    candidates: candidatesWithCounts,
    votes: voteList,
    decision: decisionRow,
    confirmed_menu_name,
  });
}
