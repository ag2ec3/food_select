/** Shown when `fetch` throws or the browser cannot reach the server. */
export const NETWORK_ERROR_MESSAGE =
  "네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.";

const FETCH_FAILURE_MARKERS = [
  "failed to fetch",
  "networkerror",
  "load failed",
  "fetch failed",
] as const;

/** Supabase Auth often returns only "Failed to fetch" for bad env, DNS, or blocked requests. */
export function mapSupabaseAuthErrorMessage(raw: string | undefined): string {
  const m = raw?.trim() ?? "";
  if (!m) {
    return NETWORK_ERROR_MESSAGE;
  }
  const lower = m.toLowerCase();
  if (
    lower === "failed to fetch" ||
    FETCH_FAILURE_MARKERS.some((x) => lower.includes(x))
  ) {
    return `${NETWORK_ERROR_MESSAGE} Supabase URL·anon 키(frontend/.env.local)가 맞는지, 개발 서버를 재시작했는지, Supabase 프로젝트가 활성인지·방화벽을 확인해 주세요.`;
  }
  if (lower.includes("invalid api key")) {
    return (
      "API 키가 이 Supabase 프로젝트와 맞지 않습니다. Settings → API에서 URL과 같은 프로젝트의 " +
      "anon(eyJ…) 또는 Publishable(sb_publishable_…)만 사용하고, service_role/secret은 넣지 마세요. " +
      "둘 다 .env에 있으면 오래된 anon을 지우거나, Publishable만 남겨 보세요. 값 저장 후 dev 서버를 재시작하세요."
    );
  }
  return m;
}
