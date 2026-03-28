import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  requireAuthError,
} from "@/lib/api/routeHelpers";
import type { Session } from "@/lib/types";

type RouteContext = { params: Promise<{ teamId: string }> };

function countBySessionId(
  rows: { session_id: string }[] | null,
  sessionIds: string[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of sessionIds) m.set(id, 0);
  for (const row of rows ?? []) {
    m.set(row.session_id, (m.get(row.session_id) ?? 0) + 1);
  }
  return m;
}

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId } = await context.params;
  if (!teamId) {
    return jsonError(400, "팀이 지정되지 않았습니다.");
  }

  const { data: sessions, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (sErr) {
    return jsonError(500, sErr.message);
  }

  const list = (sessions ?? []) as Session[];
  const sessionIds = list.map((s) => s.id);
  if (sessionIds.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const [{ data: candRows }, { data: voteRows }, { data: decisionRows }] =
    await Promise.all([
      supabase.from("candidates").select("session_id").in("session_id", sessionIds),
      supabase.from("votes").select("session_id").in("session_id", sessionIds),
      supabase
        .from("decisions")
        .select("session_id, candidate_id")
        .in("session_id", sessionIds),
    ]);

  const candCount = countBySessionId(candRows, sessionIds);
  const voteCount = countBySessionId(voteRows, sessionIds);

  const candidateIds = [...new Set((decisionRows ?? []).map((d) => d.candidate_id))];
  const { data: candMenus } =
    candidateIds.length > 0
      ? await supabase
          .from("candidates")
          .select("id, menu_name")
          .in("id", candidateIds)
      : { data: [] };

  const menuByCandidateId = new Map<string, string>();
  for (const c of candMenus ?? []) {
    menuByCandidateId.set(c.id, c.menu_name);
  }

  const confirmedBySession = new Map<string, string>();
  for (const d of decisionRows ?? []) {
    const menu = menuByCandidateId.get(d.candidate_id);
    if (menu) confirmedBySession.set(d.session_id, menu);
  }

  const payload = list.map((s) => ({
    ...s,
    candidate_count: candCount.get(s.id) ?? 0,
    vote_count: voteCount.get(s.id) ?? 0,
    confirmed_menu_name: s.status === "closed" ? confirmedBySession.get(s.id) ?? null : null,
  }));

  return NextResponse.json({ sessions: payload });
}

export async function POST(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId } = await context.params;
  if (!teamId) {
    return jsonError(400, "팀이 지정되지 않았습니다.");
  }

  const { data: row, error } = await supabase
    .from("sessions")
    .insert({
      team_id: teamId,
      status: "open",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42501" || error.message.includes("permission")) {
      return jsonError(403, "이 팀에 세션을 만들 권한이 없습니다.");
    }
    return jsonError(500, error.message);
  }

  return NextResponse.json(row as Session);
}
