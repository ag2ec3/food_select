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
    const parts: string[] = [];
    if (!url) {
      parts.push("NEXT_PUBLIC_SUPABASE_URL이 비어 있습니다.");
    }
    if (!anonKey) {
      parts.push(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 비어 있습니다.",
      );
    }
    return {
      ok: false,
      message: `${parts.join(" ")} 로컬: 파일은 반드시 frontend/.env.local에 두고, 터미널에서 cd frontend 후 npm run dev로 실행하세요. 변수 이름 오타·앞뒤 공백·따옴표로 값 전체 감싸기를 확인하세요. Vercel: Project Settings → Environment Variables에 동일 이름 추가 후 재배포하세요.`,
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
