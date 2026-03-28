"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { SessionCard } from "@/components/SessionCard";
import { NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";
import type { Session, Team } from "@/lib/types";

type SessionListItem = Session & {
  candidate_count: number;
  vote_count: number;
  confirmed_menu_name: string | null;
};

function partitionSessions(sessions: Session[]) {
  const open: Session[] = [];
  const closed: Session[] = [];
  for (const s of sessions) {
    if (s.status === "open") open.push(s);
    else closed.push(s);
  }
  return { open, closed };
}

export default function TeamSessionsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId =
    typeof params.teamId === "string"
      ? params.teamId
      : Array.isArray(params.teamId)
        ? params.teamId[0]
        : "";

  const [team, setTeam] = useState<Team | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setLoadError(null);
    try {
      const [teamsRes, sessRes] = await Promise.all([
        fetch("/api/teams", { credentials: "same-origin" }),
        fetch(`/api/teams/${teamId}/sessions`, { credentials: "same-origin" }),
      ]);

      const teamsJson = (await teamsRes.json().catch(() => ({}))) as {
        error?: string;
        teams?: (Team & { member_count: number })[];
      };
      if (!teamsRes.ok) {
        setLoadError(teamsJson.error ?? "팀 정보를 불러오지 못했습니다.");
        setTeam(null);
        setSessions([]);
        return;
      }
      const found = (teamsJson.teams ?? []).find((t) => t.id === teamId);
      if (!found) {
        setLoadError(null);
        setTeam(null);
        setSessions([]);
        return;
      }
      setTeam({ id: found.id, name: found.name, created_at: found.created_at });

      const sessJson = (await sessRes.json().catch(() => ({}))) as {
        error?: string;
        sessions?: SessionListItem[];
      };
      if (!sessRes.ok) {
        setLoadError(sessJson.error ?? "세션 목록을 불러오지 못했습니다.");
        setSessions([]);
        return;
      }
      setSessions(sessJson.sessions ?? []);
    } catch {
      setLoadError(NETWORK_ERROR_MESSAGE);
      setTeam(null);
      setSessions([]);
    }
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    if (!teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadData().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, loadData]);

  const { open, closed } = useMemo(() => {
    const base = sessions.map((s) => ({
      id: s.id,
      team_id: s.team_id,
      status: s.status,
      created_at: s.created_at,
      closed_at: s.closed_at,
    }));
    return partitionSessions(base);
  }, [sessions]);

  async function handleNewSession() {
    if (!teamId) return;
    setCreateError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/sessions`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        setCreateError(json.error ?? "세션을 만들 수 없습니다.");
        return;
      }
      if (json.id) {
        router.push(`/teams/${teamId}/sessions/${json.id}`);
      }
    } catch {
      setCreateError(NETWORK_ERROR_MESSAGE);
    }
  }

  if (!teamId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm text-zinc-600">잘못된 경로입니다.</p>
        <Link
          href="/teams"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          팀 목록으로
        </Link>
      </div>
    );
  }

  if (!loading && !team) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-zinc-900">팀을 찾을 수 없음</h1>
        <p className="mt-2 text-sm text-zinc-600">
          삭제되었거나 접근할 수 없는 팀입니다.
        </p>
        <Link
          href="/teams"
          className="mt-6 inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          ← 팀 목록으로
        </Link>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm text-zinc-600">불러오는 중…</p>
      </div>
    );
  }

  const sessionMeta = new Map(sessions.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {loadError ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}
      <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
        <Link href="/teams" className="font-medium text-zinc-700 hover:underline">
          내 팀
        </Link>
        <span className="text-zinc-400" aria-hidden>
          /
        </span>
        <span className="text-zinc-900">{team.name}</span>
        <span className="text-zinc-400" aria-hidden>
          ·
        </span>
        <Link
          href={`/teams/${teamId}/history`}
          className="font-medium text-zinc-700 underline-offset-4 hover:underline"
        >
          확정 메뉴 이력
        </Link>
      </nav>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {team.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            세션별로 메뉴를 제안하고 투표해 오늘 점심을 정해 보세요.
          </p>
        </div>
        <Button type="button" size="lg" onClick={handleNewSession}>
          새 세션 시작
        </Button>
      </div>
      {createError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {createError}
        </p>
      ) : null}

      {open.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            진행 중인 세션
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {open.map((session) => {
              const meta = sessionMeta.get(session.id);
              return (
                <li key={session.id}>
                  <SessionCard
                    teamId={teamId}
                    session={session}
                    candidateCount={meta?.candidate_count ?? 0}
                    voteCount={meta?.vote_count ?? 0}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600">
          진행 중인 세션이 없습니다. 위에서 새 세션을 시작해 보세요.
        </p>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          종료된 세션
        </h2>
        {closed.length > 0 ? (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {closed.map((session) => {
              const meta = sessionMeta.get(session.id);
              return (
                <li key={session.id}>
                  <SessionCard
                    teamId={teamId}
                    session={session}
                    candidateCount={meta?.candidate_count ?? 0}
                    voteCount={meta?.vote_count ?? 0}
                    confirmedMenuName={meta?.confirmed_menu_name ?? undefined}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">종료된 세션이 아직 없습니다.</p>
        )}
      </section>
    </div>
  );
}
