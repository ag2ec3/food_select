import Link from "next/link";

type HistoryItemProps = {
  teamId: string;
  sessionId: string;
  decidedAt: string;
  menuName: string;
  totalVoteCount: number;
};

function formatDecidedDate(iso: string): string {
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

export function HistoryItem({
  teamId,
  sessionId,
  decidedAt,
  menuName,
  totalVoteCount,
}: HistoryItemProps) {
  return (
    <Link
      href={`/teams/${teamId}/sessions/${sessionId}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <time
          className="text-sm font-medium text-zinc-900"
          dateTime={decidedAt}
        >
          {formatDecidedDate(decidedAt)}
        </time>
        <span className="text-sm text-zinc-600">
          총 <span className="font-semibold text-zinc-800">{totalVoteCount}</span>
          표
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-emerald-800">{menuName}</p>
    </Link>
  );
}
