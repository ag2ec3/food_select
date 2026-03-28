"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";

export function Header() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href={user ? "/teams" : "/"}
          className="text-lg font-semibold tracking-tight text-zinc-900 transition-colors hover:text-zinc-700"
        >
          오늘 뭐 먹지?
        </Link>
        <nav
          className="flex items-center gap-3 text-sm text-zinc-600 sm:gap-4"
          aria-label="주요 메뉴"
        >
          {user ? (
            <>
              <Link
                href="/teams"
                className="rounded-md px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                팀
              </Link>
              <span className="hidden max-w-[10rem] truncate text-zinc-500 sm:inline">
                {user.name}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                로그아웃
              </Button>
            </>
          ) : ready && !isAuthPage ? (
            <Link
              href="/login"
              className="rounded-md px-2 py-1 font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              로그인
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
