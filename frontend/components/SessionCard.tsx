import Link from "next/link";
import type { Session } from "@/lib/types";

type SessionCardProps = {
  teamId: string;
  session: Session;
  candidateCount: number;
  voteCount: number;
  confirmedMenuName?: string;
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SessionCard({
  teamId,
  session,
  candidateCount,
  voteCount,
  confirmedMenuName,
}: SessionCardProps) {
  const isOpen = session.status === "open";

  return (
    <Link
      href={`/teams/${teamId}/sessions/${session.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isOpen
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
              : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-300/60"
          }`}
        >
          {isOpen ? "진행 중" : "종료"}
        </span>
        <time
          className="text-xs text-zinc-500"
          dateTime={session.created_at}
        >
          {formatDateTime(session.created_at)}
        </time>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
        <div>
          <dt className="inline text-zinc-500">후보 </dt>
          <dd className="inline font-medium text-zinc-800">{candidateCount}개</dd>
        </div>
        <div>
          <dt className="inline text-zinc-500">투표 </dt>
          <dd className="inline font-medium text-zinc-800">{voteCount}표</dd>
        </div>
      </dl>
      {!isOpen && confirmedMenuName ? (
        <p className="mt-3 text-sm font-medium text-zinc-900">
          확정: <span className="text-emerald-800">{confirmedMenuName}</span>
        </p>
      ) : null}
    </Link>
  );
}
