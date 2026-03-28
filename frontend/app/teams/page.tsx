"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TeamCard } from "@/components/TeamCard";
import { NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";
import type { Team } from "@/lib/types";

const TeamCreateModal = dynamic(
  () =>
    import("@/components/TeamCreateModal").then((m) => ({
      default: m.TeamCreateModal,
    })),
  { ssr: false },
);

const TeamJoinModal = dynamic(
  () =>
    import("@/components/TeamJoinModal").then((m) => ({
      default: m.TeamJoinModal,
    })),
  { ssr: false },
);

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

  const closeCreateModal = useCallback(() => setCreateOpen(false), []);
  const closeJoinModal = useCallback(() => setJoinOpen(false), []);

  const handleCreate = useCallback(
    async (name: string) => {
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
    },
    [router, loadTeams],
  );

  const handleJoin = useCallback(
    async (inviteCode: string) => {
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        team_id?: string;
      };
      if (!res.ok) {
        return {
          ok: false as const,
          message: json.error ?? "팀 참가에 실패했습니다.",
        };
      }
      const teamId = json.team_id;
      if (!teamId) {
        return {
          ok: false as const,
          message: "팀 참가에 실패했습니다.",
        };
      }
      await loadTeams();
      router.push(`/teams/${teamId}`);
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: NETWORK_ERROR_MESSAGE };
    }
    },
    [router, loadTeams],
  );

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
        onClose={closeCreateModal}
        onCreate={handleCreate}
      />
      <TeamJoinModal
        open={joinOpen}
        onClose={closeJoinModal}
        onJoin={handleJoin}
      />
    </div>
  );
}
