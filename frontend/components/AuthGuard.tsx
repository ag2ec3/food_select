"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/authContext";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500"
        role="status"
        aria-live="polite"
      >
        불러오는 중…
      </div>
    );
  }

  return <>{children}</>;
}
