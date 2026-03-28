"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";

/** Total length bound aligned with common SMTP / RFC practice (≤254). */
const MAX_EMAIL_LENGTH = 254;

function validateLoginFields(email: string, password: string): string | null {
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  if (!trimmedEmail || !trimmedPassword) {
    return "이메일과 비밀번호를 입력해 주세요.";
  }
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return "이메일이 너무 깁니다.";
  }
  if (!trimmedEmail.includes("@")) {
    return "올바른 이메일 형식이 아닙니다.";
  }
  return null;
}

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (user) {
      router.replace("/teams");
    }
  }, [ready, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitInFlightRef.current) return;
    setError(null);
    setSubmitting(true);
    submitInFlightRef.current = true;

    const clientError = validateLoginFields(email, password);
    if (clientError) {
      setError(clientError);
      submitInFlightRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
    } finally {
      submitInFlightRef.current = false;
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
        로그인
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Supabase Auth 계정으로 로그인합니다.
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-zinc-700"
          >
            이메일
          </label>
          <input
            id="login-email"
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
            htmlFor="login-password"
            className="block text-sm font-medium text-zinc-700"
          >
            비밀번호
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
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
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={submitting}
        >
          {submitting ? "처리 중…" : "로그인"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
