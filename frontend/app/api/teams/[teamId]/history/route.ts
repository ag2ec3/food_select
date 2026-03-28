import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  requireAuthError,
} from "@/lib/api/routeHelpers";

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

type TeamHistoryRow = {
  session_id: string;
  decided_at: string;
  menu_name: string;
  total_vote_count: number;
};

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { teamId } = await context.params;
  if (!teamId) {
    return jsonError(400, "팀이 지정되지 않았습니다.");
  }

  const { data: sessions, error: sErr } = await supabase
    .from("sessions")
    .select("id, closed_at, created_at")
    .eq("team_id", teamId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false, nullsFirst: false });

  if (sErr) {
    return jsonError(500, sErr.message);
  }

  const list = sessions ?? [];
  const sessionIds = list.map((s) => s.id);

  if (sessionIds.length === 0) {
    return NextResponse.json({ history: [] as TeamHistoryRow[] });
  }

  const [{ data: decisionRows, error: dErr }, { data: voteRows, error: vErr }] =
    await Promise.all([
      supabase
        .from("decisions")
        .select("session_id, candidate_id, decided_at")
        .in("session_id", sessionIds),
      supabase.from("votes").select("session_id").in("session_id", sessionIds),
    ]);

  if (dErr) {
    return jsonError(500, dErr.message);
  }
  if (vErr) {
    return jsonError(500, vErr.message);
  }

  const voteCount = countBySessionId(voteRows, sessionIds);

  const candidateIds = [
    ...new Set((decisionRows ?? []).map((d) => d.candidate_id)),
  ];

  const { data: candMenus, error: cErr } =
    candidateIds.length > 0
      ? await supabase
          .from("candidates")
          .select("id, menu_name")
          .in("id", candidateIds)
      : { data: [] as { id: string; menu_name: string }[], error: null };

  if (cErr) {
    return jsonError(500, cErr.message);
  }

  const menuByCandidateId = new Map<string, string>();
  for (const c of candMenus ?? []) {
    menuByCandidateId.set(c.id, c.menu_name);
  }

  const decisionBySession = new Map<
    string,
    { candidate_id: string; decided_at: string }
  >();
  for (const d of decisionRows ?? []) {
    decisionBySession.set(d.session_id, {
      candidate_id: d.candidate_id,
      decided_at: d.decided_at,
    });
  }

  const history: TeamHistoryRow[] = [];

  for (const s of list) {
    const dec = decisionBySession.get(s.id);
    if (!dec) continue;
    const menu = menuByCandidateId.get(dec.candidate_id);
    if (!menu) continue;
    history.push({
      session_id: s.id,
      decided_at: dec.decided_at || s.closed_at || s.created_at,
      menu_name: menu,
      total_vote_count: voteCount.get(s.id) ?? 0,
    });
  }

  history.sort(
    (a, b) =>
      new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime(),
  );

  return NextResponse.json({ history });
}
