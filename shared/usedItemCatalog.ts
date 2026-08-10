// 二手器材 등록 카탈로그 — D-1: 자유입력·「其他非醫療器材」 제거, 명시 목록만 허용.
// 카테고리를 추가할 때는 이 파일 + drizzle/schema.ts enum + 마이그레이션을 함께 갱신할 것.

export const USED_ITEM_CATEGORIES = [
  { value: "chair", label: "美髮椅" },
  { value: "mirror_station", label: "鏡台" },
  { value: "wash_bed", label: "洗頭床（沖水床）" },
  { value: "dryer", label: "吹風機" },
  { value: "iron", label: "電棒・離子夾" },
  { value: "perm_machine", label: "燙髮機" },
  { value: "steamer", label: "蒸氣機" },
  { value: "clipper", label: "推剪" },
  { value: "wash_basin", label: "洗髮槽" },
  { value: "trolley", label: "美髮推車" },
  { value: "scissors", label: "美髮剪刀" },
  { value: "hood_heater", label: "烘罩・加熱器具" },
] as const;

export type UsedItemCategoryValue = (typeof USED_ITEM_CATEGORIES)[number]["value"];

export const USED_ITEM_CATEGORY_VALUES = USED_ITEM_CATEGORIES.map((c) => c.value) as [
  UsedItemCategoryValue,
  ...UsedItemCategoryValue[],
];

// 의료기기·의료미용 기기 금지 키워드 (제목+내용 등록 시점 차단 + 사후 자동 플래그)
export const BANNED_MEDICAL_KEYWORDS = [
  "雷射",
  "皮秒",
  "脈衝光",
  "IPL",
  "電波",
  "音波",
  "高週波",
  "微針",
  "水光",
  "溶脂",
  "冷凍減脂",
  "除毛",
  "醫美",
] as const;

export const BANNED_KEYWORD_MESSAGE = "醫療器材及醫美儀器依法不得刊登";

// 제목+내용에서 첫 번째로 걸리는 금지 키워드 반환 (없으면 null). 영문 키워드는 대소문자 무시.
export function findBannedKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const keyword of BANNED_MEDICAL_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) return keyword;
  }
  return null;
}
