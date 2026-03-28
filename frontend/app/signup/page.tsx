"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";

export default function SignupPage() {
  const { user, ready, signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user) {
      router.replace("/teams");
    }
  }, [ready, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const result = await signUp(name, email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.needsEmailConfirmation) {
        setInfo(
          "가입이 완료되었습니다. 이메일에 안내를 확인한 뒤 로그인해 주세요.",
        );
        return;
      }
      router.push("/teams");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-zinc-500">
        이동 중…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        회원가입
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Supabase Auth로 가입합니다. 이름은 프로필에 저장됩니다.
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="signup-name"
            className="block text-sm font-medium text-zinc-700"
          >
            이름
          </label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            placeholder="홍길동"
          />
        </div>
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-zinc-700"
          >
            이메일
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-zinc-700"
          >
            비밀번호
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            placeholder="••••••••"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="text-sm text-emerald-800" role="status">
            {info}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={submitting}
        >
          {submitting ? "처리 중…" : "가입하기"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
