/**
 * Missing or invalid public env makes Supabase Auth return a vague "Failed to fetch".
 */
export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경 변수가 없습니다. frontend/.env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣은 뒤 개발 서버를 다시 시작하세요.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. (예: https://xxxx.supabase.co)",
    );
  }

  const isLocalHttp =
    parsed.protocol === "http:" &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");

  if (parsed.protocol !== "https:" && !isLocalHttp) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL은 https:// 주소이거나 로컬(http://127.0.0.1, http://localhost)이어야 합니다.",
    );
  }

  return { url, anonKey };
}
