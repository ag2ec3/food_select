"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { HistoryItem } from "@/components/HistoryItem";
import { NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";
import type { Team } from "@/lib/types";

type HistoryApiRow = {
  session_id: string;
  decided_at: string;
  menu_name: string;
  total_vote_count: number;
};

export default function TeamHistoryPage() {
  const params = useParams();
  const teamId =
    typeof params.teamId === "string"
      ? params.teamId
      : Array.isArray(params.teamId)
        ? params.teamId[0]
        : "";

  const [team, setTeam] = useState<Team | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryApiRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setLoadError(null);
    try {
      const [teamsRes, historyRes] = await Promise.all([
        fetch("/api/teams", { credentials: "same-origin" }),
        fetch(`/api/teams/${teamId}/history`, { credentials: "same-origin" }),
      ]);

      const teamsJson = (await teamsRes.json().catch(() => ({}))) as {
        error?: string;
        teams?: Team[];
      };
      if (!teamsRes.ok) {
        setLoadError(teamsJson.error ?? "팀 정보를 불러오지 못했습니다.");
        setTeam(null);
        setHistoryRows([]);
        return;
      }
      const found = (teamsJson.teams ?? []).find((t) => t.id === teamId);
      if (!found) {
        setTeam(null);
        setHistoryRows([]);
        return;
      }
      setTeam(found);

      const histJson = (await historyRes.json().catch(() => ({}))) as {
        error?: string;
        history?: HistoryApiRow[];
      };
      if (!historyRes.ok) {
        setLoadError(histJson.error ?? "이력을 불러오지 못했습니다.");
        setHistoryRows([]);
        return;
      }
      setHistoryRows(histJson.history ?? []);
    } catch {
      setLoadError(NETWORK_ERROR_MESSAGE);
      setTeam(null);
      setHistoryRows([]);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {loadError ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}
      <nav className="text-sm text-zinc-500">
        <Link href="/teams" className="font-medium text-zinc-700 hover:underline">
          내 팀
        </Link>
        <span className="mx-2 text-zinc-400" aria-hidden>
          /
        </span>
        <Link
          href={`/teams/${teamId}`}
          className="font-medium text-zinc-700 hover:underline"
        >
          {team.name}
        </Link>
        <span className="mx-2 text-zinc-400" aria-hidden>
          /
        </span>
        <span className="text-zinc-900">확정 메뉴 이력</span>
      </nav>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900">
        확정 메뉴 이력
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        마감되어 확정된 메뉴만 표시됩니다. 항목을 누르면 해당 세션 상세로 이동합니다.
      </p>

      {historyRows.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {historyRows.map((row) => (
            <li key={row.session_id}>
              <HistoryItem
                teamId={teamId}
                sessionId={row.session_id}
                decidedAt={row.decided_at}
                menuName={row.menu_name}
                totalVoteCount={row.total_vote_count}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-12 text-center">
          <p className="text-sm text-zinc-600">
            아직 확정된 메뉴 이력이 없습니다. 세션을 마감하면 여기에 표시됩니다.
          </p>
          <Link
            href={`/teams/${teamId}`}
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
          >
            팀 홈으로 돌아가기
          </Link>
        </div>
      )}
    </div>
  );
}
