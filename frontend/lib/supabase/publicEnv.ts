export type SupabasePublicEnvResult =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; message: string };

/**
 * Parse public Supabase env without throwing (for Edge middleware: uncaught errors → Vercel MIDDLEWARE_INVOCATION_FAILED).
 */
function readPublicSupabaseKey(): string {
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  // Prefer publishable when both are set: a stale legacy anon + new publishable is a common misconfiguration.
  if (publishable) return publishable;
  return anon;
}

export function parseSupabasePublicEnv(): SupabasePublicEnvResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = readPublicSupabaseKey();

  if (!url || !anonKey) {
    return {
      ok: false,
      message:
        "Supabase 환경 변수가 없습니다. 로컬: frontend/.env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY(또는 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) 설정 후 dev 서버 재시작. Vercel: 동일 이름으로 추가 후 재배포.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. (예: https://xxxx.supabase.co)",
    };
  }

  const isLocalHttp =
    parsed.protocol === "http:" &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");

  if (parsed.protocol !== "https:" && !isLocalHttp) {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_SUPABASE_URL은 https:// 주소이거나 로컬(http://127.0.0.1, http://localhost)이어야 합니다.",
    };
  }

  return { ok: true, url, anonKey };
}

/**
 * Missing or invalid public env makes Supabase Auth return a vague "Failed to fetch".
 */
export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  const parsed = parseSupabasePublicEnv();
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  return { url: parsed.url, anonKey: parsed.anonKey };
}
