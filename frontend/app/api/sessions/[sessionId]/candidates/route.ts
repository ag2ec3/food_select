import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  jsonInternalError,
  requireAuthError,
} from "@/lib/api/routeHelpers";
import type { Candidate } from "@/lib/types";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { sessionId } = await context.params;
  if (!sessionId) {
    return jsonError(400, "세션이 지정되지 않았습니다.");
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sErr) {
    return jsonInternalError("candidates GET: session", sErr);
  }
  if (!session) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }

  const [{ data: votes, error: vErr }, { data: candidates, error: cErr }] =
    await Promise.all([
      supabase
        .from("votes")
        .select("candidate_id")
        .eq("session_id", sessionId),
      supabase
        .from("candidates")
        .select("id, session_id, user_id, menu_name, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

  if (vErr) {
    return jsonInternalError("candidates GET: votes", vErr);
  }
  if (cErr) {
    return jsonInternalError("candidates GET: candidates", cErr);
  }

  const counts = new Map<string, number>();
  for (const v of votes ?? []) {
    counts.set(v.candidate_id, (counts.get(v.candidate_id) ?? 0) + 1);
  }

  const list = (candidates ?? []) as Candidate[];
  const payload = list.map((c) => ({
    ...c,
    vote_count: counts.get(c.id) ?? 0,
  }));

  return NextResponse.json({
    session_status: session.status,
    candidates: payload,
  });
}

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

  const menuName =
    typeof body === "object" &&
    body !== null &&
    "menu_name" in body &&
    typeof (body as { menu_name: unknown }).menu_name === "string"
      ? (body as { menu_name: string }).menu_name.trim()
      : "";

  if (!menuName) {
    return jsonError(400, "메뉴 이름을 입력해 주세요.");
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sErr) {
    return jsonInternalError("candidates POST: session", sErr);
  }
  if (!session) {
    return jsonError(404, "세션을 찾을 수 없습니다.");
  }
  if (session.status === "closed") {
    return jsonError(400, "마감된 세션에는 메뉴를 추가할 수 없습니다.");
  }

  const { data: row, error: iErr } = await supabase
    .from("candidates")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      menu_name: menuName,
    })
    .select("id, session_id, user_id, menu_name, created_at")
    .single();

  if (iErr) {
    if (iErr.code === "23505") {
      return jsonError(409, "이미 제안된 메뉴입니다.");
    }
    return jsonInternalError("candidates POST: insert", iErr);
  }

  return NextResponse.json(row as Candidate);
}
