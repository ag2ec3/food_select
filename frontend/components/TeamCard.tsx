import Link from "next/link";
import type { Team } from "@/lib/types";

type TeamCardProps = {
  team: Team;
  memberCount: number;
};

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TeamCard({ team, memberCount }: TeamCardProps) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
    >
      <h2 className="text-lg font-semibold text-zinc-900">{team.name}</h2>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
        <div>
          <dt className="inline text-zinc-500">멤버 </dt>
          <dd className="inline font-medium text-zinc-800">{memberCount}명</dd>
        </div>
        <div>
          <dt className="inline text-zinc-500">생성일 </dt>
          <dd className="inline">{formatCreatedAt(team.created_at)}</dd>
        </div>
      </dl>
    </Link>
  );
}
