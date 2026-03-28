import { NextResponse } from "next/server";
import {
  getSupabaseAndUser,
  jsonError,
  requireAuthError,
} from "@/lib/api/routeHelpers";

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `INV-${suffix}`;
}

export async function GET() {
  const { supabase, user } = await getSupabaseAndUser();
  if (!user) return requireAuthError();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, created_at, memberships(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(500, error.message);
  }

  const payload = (teams ?? []).map((row) => {
    const nested = row.memberships as unknown;
    let memberCount = 0;
    if (Array.isArray(nested) && nested[0] && typeof nested[0] === "object") {
      const c = (nested[0] as { count?: number }).count;
      if (typeof c === "number") memberCount = c;
    }
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      member_count: memberCount,
    };
  });

  return NextResponse.json({ teams: payload });
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

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : "";

  if (!name) {
    return jsonError(400, "팀 이름을 입력해 주세요.");
  }

  let invite = randomInviteCode();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase.rpc("create_team_with_owner", {
      p_name: name,
      p_invite_code: invite,
    });

    if (!error && data) {
      const raw = data as
        | {
            id: string;
            name: string;
            created_at: string;
            invite_code: string;
          }
        | Array<{
            id: string;
            name: string;
            created_at: string;
            invite_code: string;
          }>;
      const team = Array.isArray(raw) ? raw[0] : raw;
      if (team) {
        return NextResponse.json({
          id: team.id,
          name: team.name,
          created_at: team.created_at,
          invite_code: team.invite_code,
        });
      }
    }

    if (
      error?.message?.includes("duplicate") ||
      error?.code === "23505"
    ) {
      invite = randomInviteCode();
      continue;
    }

    if (error?.message?.includes("invalid_name")) {
      return jsonError(400, "팀 이름을 입력해 주세요.");
    }

    return jsonError(500, error?.message ?? "팀을 만들 수 없습니다.");
  }

  return jsonError(500, "초대 코드 충돌이 반복되었습니다. 다시 시도해 주세요.");
}
