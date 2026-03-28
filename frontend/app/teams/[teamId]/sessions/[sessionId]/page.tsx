"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";
import { useAuth } from "@/lib/authContext";
import { pickMenuSuggestions } from "@/lib/menuSuggestions";
import type {
  Candidate,
  Decision,
  Session,
  Vote,
} from "@/lib/types";

type CandidateRow = Candidate & { vote_count: number };

type SessionDetailJson = {
  session: Session;
  team_name: string | null;
  candidates: CandidateRow[];
  votes: Vote[];
  decision: Decision | null;
  confirmed_menu_name: string | null;
};

export default function SessionDetailPage() {
  const params = useParams();
  const { user } = useAuth();

  const teamId =
    typeof params.teamId === "string"
      ? params.teamId
      : Array.isArray(params.teamId)
        ? params.teamId[0]
        : "";
  const sessionId =
    typeof params.sessionId === "string"
      ? params.sessionId
      : Array.isArray(params.sessionId)
        ? params.sessionId[0]
        : "";

  const [teamName, setTeamName] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetailJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [menuInput, setMenuInput] = useState("");
  const [menuError, setMenuError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const loadDetail = useCallback(async () => {
    if (!teamId || !sessionId) return;
    setLoadError(null);
    try {
      const detailRes = await fetch(
        `/api/teams/${teamId}/sessions/${sessionId}`,
        { credentials: "same-origin" },
      );

      const json = (await detailRes.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<SessionDetailJson>;

      if (!detailRes.ok) {
        setLoadError(json.error ?? "세션을 불러오지 못했습니다.");
        setDetail(null);
        setTeamName(null);
        return;
      }
      if (!json.session) {
        setLoadError("세션을 불러오지 못했습니다.");
        setDetail(null);
        setTeamName(null);
        return;
      }

      const name =
        typeof json.team_name === "string" && json.team_name.trim() !== ""
          ? json.team_name
          : "팀";
      setTeamName(name);
      setDetail({
        session: json.session,
        team_name: json.team_name ?? null,
        candidates: Array.isArray(json.candidates) ? json.candidates : [],
        votes: json.votes ?? [],
        decision: json.decision ?? null,
        confirmed_menu_name: json.confirmed_menu_name ?? null,
      });
    } catch {
      setLoadError(NETWORK_ERROR_MESSAGE);
      setDetail(null);
      setTeamName(null);
    }
  }, [teamId, sessionId]);

  useEffect(() => {
    let cancelled = false;
    if (!teamId || !sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDetail().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, sessionId, loadDetail]);

  const session = detail?.session;
  const candidates = useMemo(
    () => detail?.candidates ?? [],
    [detail],
  );
  const decision = detail?.decision ?? null;
  const confirmedName = detail?.confirmed_menu_name ?? undefined;

  const voteCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of candidates) {
      m.set(c.id, c.vote_count);
    }
    return m;
  }, [candidates]);

  const myVote =
    user && detail
      ? detail.votes.find(
          (v) => v.session_id === sessionId && v.user_id === user.id,
        )
      : undefined;

  const isOpen = session?.status === "open";
  const totalVotes = useMemo(() => {
    let n = 0;
    for (const v of voteCounts.values()) n += v;
    return n;
  }, [voteCounts]);

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const ca = voteCounts.get(a.id) ?? 0;
      const cb = voteCounts.get(b.id) ?? 0;
      if (cb !== ca) return cb - ca;
      return a.menu_name.localeCompare(b.menu_name, "ko");
    });
  }, [candidates, voteCounts]);

  const wrongTeam =
    session && teamId && session.team_id !== teamId ? true : false;

  const candidateMenuSignature = useMemo(
    () => candidates.map((c) => c.menu_name).join("\u0001"),
    [candidates],
  );

  useEffect(() => {
    if (!isOpen) {
      setRecommendations([]);
      return;
    }
    setRecommendations(
      pickMenuSuggestions(
        candidates.map((c) => c.menu_name),
        3,
      ),
    );
    /* 후보 메뉴명 집합이 바뀔 때만 풀에서 다시 뽑는다 (같은 세트면 추천 유지). */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- candidateMenuSignature가 위 candidates 메뉴명 집합과 동기화됨
  }, [isOpen, candidateMenuSignature]);

  async function submitCandidate(
    rawName: string,
    options?: { clearInputOnSuccess?: boolean },
  ): Promise<boolean> {
    const menuName = rawName.trim();
    if (!menuName) {
      setMenuError("메뉴 이름을 입력해 주세요.");
      return false;
    }
    setMenuError(null);
    setVoteError(null);
    if (!user || !sessionId || !isOpen || actionBusy) return false;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ menu_name: menuName }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMenuError(json.error ?? "메뉴를 추가할 수 없습니다.");
        return false;
      }
      if (options?.clearInputOnSuccess) setMenuInput("");
      await loadDetail();
      return true;
    } catch {
      setMenuError(NETWORK_ERROR_MESSAGE);
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAddMenu(e: React.FormEvent) {
    e.preventDefault();
    await submitCandidate(menuInput, { clearInputOnSuccess: true });
  }

  function refreshRecommendations() {
    setRecommendations(
      pickMenuSuggestions(
        candidates.map((c) => c.menu_name),
        3,
      ),
    );
  }

  async function handleAddSuggestedMenu(name: string) {
    await submitCandidate(name);
  }

  async function handleVote(candidateId: string) {
    setVoteError(null);
    if (!user || !sessionId || !isOpen || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setVoteError(json.error ?? "투표할 수 없습니다.");
        return;
      }
      setVoteError(null);
      await loadDetail();
    } catch {
      setVoteError(NETWORK_ERROR_MESSAGE);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCloseClick() {
    setCloseError(null);
    setVoteError(null);
    if (!sessionId || !teamId || !isOpen || actionBusy) return;
    if (candidates.length === 0) return;
    const ok = window.confirm(
      "세션을 마감할까요? 최다 득표 메뉴가 확정되며, 이후 제안·투표를 바꿀 수 없습니다.",
    );
    if (!ok) return;
    setActionBusy(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/sessions/${sessionId}/close`,
        { method: "PATCH", credentials: "same-origin" },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCloseError(json.error ?? "마감할 수 없습니다.");
        return;
      }
      await loadDetail();
    } catch {
      setCloseError(NETWORK_ERROR_MESSAGE);
    } finally {
      setActionBusy(false);
    }
  }

  if (!teamId || !sessionId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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

  if (!loading && (loadError || !session || wrongTeam)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-zinc-900">세션을 찾을 수 없음</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {loadError ??
            "존재하지 않거나 이 팀에 속하지 않은 세션입니다."}
        </p>
        <Link
          href={`/teams/${teamId}`}
          className="mt-6 inline-block text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          ← 팀으로
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-zinc-600">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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
          {teamName ?? "팀"}
        </Link>
        <span className="mx-2 text-zinc-400" aria-hidden>
          /
        </span>
        <span className="text-zinc-900">세션</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          메뉴 투표
        </h1>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isOpen
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
              : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-300/60"
          }`}
        >
          {isOpen ? "진행 중" : "종료"}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        시작{" "}
        <time dateTime={session.created_at}>
          {new Date(session.created_at).toLocaleString("ko-KR")}
        </time>
        {session.closed_at ? (
          <>
            {" "}
            · 마감{" "}
            <time dateTime={session.closed_at}>
              {new Date(session.closed_at).toLocaleString("ko-KR")}
            </time>
          </>
        ) : null}
      </p>

      {!isOpen && confirmedName ? (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-5">
          <p className="text-sm font-medium text-emerald-900">확정 메뉴</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">
            {confirmedName}
          </p>
        </div>
      ) : null}
      {!isOpen && !confirmedName ? (
        <p className="mt-8 text-sm text-amber-800" role="status">
          마감된 세션이지만 확정 메뉴를 표시할 수 없습니다.
        </p>
      ) : null}

      {isOpen ? (
        <form className="mt-8" onSubmit={handleAddMenu}>
          <label
            htmlFor="menu-proposal"
            className="block text-sm font-medium text-zinc-700"
          >
            메뉴 제안
          </label>
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-800">추천 메뉴</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={
                  !user ||
                  actionBusy ||
                  recommendations.length === 0
                }
                onClick={refreshRecommendations}
              >
                다른 추천
              </Button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              자주 고르는 점심 메뉴에서 골랐어요. 탭하면 후보에 바로 넣을 수 있어요.
            </p>
            <ul
              className="mt-3 flex flex-wrap gap-2"
              aria-live="polite"
              aria-label="추천 메뉴 목록"
            >
              {recommendations.length === 0 ? (
                <li className="text-sm text-zinc-600">
                  추천할 새 메뉴가 없어요. 직접 입력해 보세요.
                </li>
              ) : (
                recommendations.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      disabled={!user || actionBusy}
                      onClick={() => void handleAddSuggestedMenu(name)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {name}
                      <span className="ml-1.5 text-xs font-normal text-zinc-500">
                        후보 추가
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              id="menu-proposal"
              name="menu"
              type="text"
              value={menuInput}
              onChange={(e) => setMenuInput(e.target.value)}
              disabled={!user || actionBusy}
              placeholder="예: 김치찌개"
              className="min-h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 disabled:bg-zinc-100"
            />
            <Button type="submit" size="lg" disabled={!user || actionBusy}>
              추가
            </Button>
          </div>
          {menuError ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {menuError}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">마감된 세션에서는 메뉴를 추가할 수 없습니다.</p>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900">
          {isOpen ? "후보 메뉴" : "최종 득표"}
        </h2>
        {!isOpen && candidates.length > 0 ? (
          <p className="mt-1 text-sm text-zinc-600">총 {totalVotes}표</p>
        ) : null}
        {voteError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {voteError}
          </p>
        ) : null}
        {candidates.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
            메뉴를 작성해 주세요.
          </p>
        ) : isOpen ? (
          <ul className="mt-3 space-y-3">
            {sortedCandidates.map((c) => {
              const count = voteCounts.get(c.id) ?? 0;
              const isMine = myVote?.candidate_id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!user || actionBusy}
                    onClick={() => handleVote(c.id)}
                    className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
                      isMine
                        ? "border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/30"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="font-medium text-zinc-900">{c.menu_name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
                      {isMine ? (
                        <span className="text-emerald-700" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                      <span className="tabular-nums">{count}표</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {sortedCandidates.map((c) => {
              const count = voteCounts.get(c.id) ?? 0;
              const isWinner = decision?.candidate_id === c.id;
              return (
                <li
                  key={c.id}
                  className={`flex justify-between rounded-lg border px-3 py-2 ${
                    isWinner
                      ? "border-emerald-300 bg-emerald-50/80 font-medium text-emerald-950"
                      : "border-zinc-200 bg-white text-zinc-800"
                  }`}
                >
                  <span>{c.menu_name}</span>
                  <span className="tabular-nums text-zinc-600">{count}표</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isOpen ? (
        <div className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-8">
          {closeError ? (
            <p className="text-sm text-red-600" role="alert">
              {closeError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={candidates.length === 0 || actionBusy}
            onClick={handleCloseClick}
          >
            마감
          </Button>
          {candidates.length === 0 ? (
            <p className="text-sm text-zinc-500">메뉴를 작성해 주세요.</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-10">
        <Link
          href={`/teams/${teamId}`}
          className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline"
        >
          ← 세션 목록으로
        </Link>
      </p>
    </div>
  );
}
