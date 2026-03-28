"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TeamCard } from "@/components/TeamCard";
import { TeamCreateModal } from "@/components/TeamCreateModal";
import { TeamJoinModal } from "@/components/TeamJoinModal";
import { NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";
import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/lib/types";

type TeamRow = Team & { member_count: number };

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/teams", { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        teams?: TeamRow[];
      };
      if (!res.ok) {
        setLoadError(json.error ?? "목록을 불러오지 못했습니다.");
        setTeams([]);
        return;
      }
      setTeams(json.teams ?? []);
    } catch {
      setLoadError(NETWORK_ERROR_MESSAGE);
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadTeams().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadTeams]);

  async function handleCreate(name: string) {
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        return {
          ok: false as const,
          message: json.error ?? "팀을 만들 수 없습니다.",
        };
      }
      if (json.id) {
        await loadTeams();
        router.push(`/teams/${json.id}`);
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: NETWORK_ERROR_MESSAGE };
    }
  }

  async function handleJoin(inviteCode: string) {
    try {
      const supabase = createClient();
      const { data: teamId, error: luErr } = await supabase.rpc(
        "lookup_team_invite",
        { p_invite: inviteCode.trim() },
      );
      if (luErr || !teamId || typeof teamId !== "string") {
        return {
          ok: false as const,
          message: "초대 코드를 찾을 수 없습니다. 코드를 확인해 주세요.",
        };
      }
      const res = await fetch(`/api/teams/${teamId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return {
          ok: false as const,
          message: json.error ?? "팀 참가에 실패했습니다.",
        };
      }
      await loadTeams();
      router.push(`/teams/${teamId}`);
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: NETWORK_ERROR_MESSAGE };
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            내 팀
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            팀을 선택하면 세션 목록으로 이동합니다. 새 팀을 만들거나 초대 코드로
            참가할 수 있어요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button type="button" variant="secondary" onClick={() => setJoinOpen(true)}>
            팀 참가하기
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            새 팀 만들기
          </Button>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <li className="col-span-full rounded-xl border border-zinc-200 bg-white px-6 py-8 text-center text-sm text-zinc-600">
            불러오는 중…
          </li>
        ) : teams.length === 0 ? (
          <li className="col-span-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center text-sm text-zinc-600">
            아직 속한 팀이 없습니다. 팀을 만들거나 초대 코드로 참가해 보세요.
          </li>
        ) : (
          teams.map((team) => (
            <li key={team.id}>
              <TeamCard team={team} memberCount={team.member_count} />
            </li>
          ))
        )}
      </ul>

      <TeamCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <TeamJoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={handleJoin}
      />
    </div>
  );
}
