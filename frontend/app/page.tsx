"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/authContext";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (user) {
      router.replace("/teams");
    } else {
      router.replace("/login");
    }
  }, [ready, user, router]);

  return (
    <div
      className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      불러오는 중…
    </div>
  );
}
