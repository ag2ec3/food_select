/** 점심 메뉴 아이디어 풀 — 팀 세션 후보 제안용 (로컬 랜덤 추천) */
export const MENU_SUGGESTION_POOL: readonly string[] = [
  "김치찌개",
  "된장찌개",
  "부대찌개",
  "순두부찌개",
  "제육덮밥",
  "불고기덮밥",
  "비빔밥",
  "돈까스",
  "카레라이스",
  "짜장면",
  "짬뽕",
  "볶음밥",
  "삼겹살",
  "쌈밥",
  "냉면",
  "국수",
  "우동",
  "라면",
  "초밥",
  "회덮밥",
  "버거",
  "샐러드",
  "샌드위치",
  "파스타",
  "리조또",
  "피자",
  "치킨",
  "닭갈비",
  "떡볶이",
  "김밥",
  "쌀국수",
  "마라탕",
  "훠궈",
  "스테이크",
  "오므라이스",
];

function normalizeMenuName(name: string): string {
  return name.trim();
}

/** 세션에 이미 있는 메뉴명은 제외하고, 무작위로 최대 `count`개를 고른다. */
export function pickMenuSuggestions(
  existingMenuNames: Iterable<string>,
  count: number,
): string[] {
  const exclude = new Set<string>();
  for (const n of existingMenuNames) {
    const t = normalizeMenuName(n);
    if (t) exclude.add(t);
  }

  const available = MENU_SUGGESTION_POOL.filter(
    (m) => !exclude.has(normalizeMenuName(m)),
  );

  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp!;
  }

  const n = Math.max(0, Math.min(count, shuffled.length));
  return shuffled.slice(0, n);
}
