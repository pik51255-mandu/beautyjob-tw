/**
 * 染髮調配計算機 — 순수 계산 로직
 *
 * 설계 원칙 (v12 2-b): **배합비는 계산기가 추측하지 않는다.**
 * 브랜드마다 1:1 / 1:1.5 / 1:2 가 다르므로 사용자가 제품 튜브 표기를 보고 입력한다.
 * 이 도구가 하는 일은 "리프트 진단 · 底色 예측 · 분량 환산"이지 배합비 추천이 아니다.
 *
 * % ↔ vol 대응은 02 바이블 1-3 고정: 3%=10 / 6%=20 / 9%=30 / 12%=40
 */

// ─── 雙氧乳 度數 ──────────────────────────────────────────────────────────────
export type Developer = { percent: number; vol: number };

export const DEVELOPERS: Developer[] = [
  { percent: 3, vol: 10 },
  { percent: 6, vol: 20 },
  { percent: 9, vol: 30 },
  { percent: 12, vol: 40 },
];

/** UI 에서 직접 고를 수 있는 度數. DEVELOPERS 와 같은 집합을 유지한다. */
export const SELECTABLE_VOLS: number[] = DEVELOPERS.map((d) => d.vol);

export function volToPercent(vol: number): number {
  return (vol * 3) / 10;
}

// ─── 리프트 진단 (2-d) ────────────────────────────────────────────────────────
export type LiftVerdict =
  | { kind: "ok"; lift: number; vol: number; percent: number }
  | { kind: "bleach"; lift: number };

/**
 * 필요 리프트 = 目標度 - 底色度
 * 0度 → 10vol / 1~2度 → 20vol / 2~3度 → 30vol / 3度 초과 → 漂髮 안내
 *
 * 어둡게 가는 경우(리프트 음수)도 0度 구간으로 본다 — 리프트가 필요 없다.
 */
export function diagnoseLift(baseLevel: number, targetLevel: number): LiftVerdict {
  const lift = targetLevel - baseLevel;
  if (lift > 3) return { kind: "bleach", lift };
  if (lift <= 0) return { kind: "ok", lift, vol: 10, percent: 3 };
  if (lift <= 2) return { kind: "ok", lift, vol: 20, percent: 6 };
  return { kind: "ok", lift, vol: 30, percent: 9 };
}

// ─── 底色 예측 (2-e) ─────────────────────────────────────────────────────────
/** 度數별로 드러나는 언더톤. 낮을수록 붉고 높을수록 노랗다. */
const UNDERTONE_BY_LEVEL: Record<number, string> = {
  1: "黑", 2: "紅", 3: "紅", 4: "紅橘", 5: "橘",
  6: "橘", 7: "橘黃", 8: "黃", 9: "黃", 10: "淺黃",
};

export function undertoneAt(level: number): string {
  const l = Math.max(1, Math.min(10, Math.round(level)));
  return UNDERTONE_BY_LEVEL[l];
}

/** 灰霧·冷色 계열은 底色이 충분히 밝지 않으면 탁해진다. */
export const COOL_TONES = ["灰霧", "冷棕"] as const;

export type ToneFamily = "自然" | "灰霧" | "棕" | "金" | "紅銅" | "冷棕";

export const TONE_FAMILIES: ToneFamily[] = ["自然", "灰霧", "棕", "金", "紅銅", "冷棕"];

/**
 * 冷色 계열인데 리프트 후 底色이 아직 붉은/주황 구간이면 탁해진다.
 * 실무 기준: 灰霧 계열은 底色이 최소 8度(黃) 이상이어야 안정적으로 나온다.
 */
export function isUndertoneRisky(targetLevel: number, tone: ToneFamily): boolean {
  if (!(COOL_TONES as readonly string[]).includes(tone)) return false;
  return targetLevel < 8;
}

// ─── 분량 (2-f) ──────────────────────────────────────────────────────────────
export type HairLength = "短" | "中" | "長";
export type HairVolume = "少" | "中" | "多";

/** 染膏 기준량(g). 길이 × 모량 조합. 현장 통용 범위를 보수적으로 잡았다. */
const BASE_GRAMS: Record<HairLength, Record<HairVolume, number>> = {
  短: { 少: 30, 中: 40, 多: 50 },
  中: { 少: 50, 中: 60, 多: 80 },
  長: { 少: 70, 中: 90, 多: 120 },
};

export type MixResult = {
  creamG: number;      // 染膏 g
  developerMl: number; // 雙氧乳 ml
  totalG: number;      // 합계(참고값)
  tubes: number;       // 필요 튜브 개수
};

/**
 * ratio 는 사용자가 제품 표기를 보고 입력한 값(染膏 1 : 雙氧乳 ratio).
 * 반환하는 雙氧乳 단위는 **ml** 이다 — 배합비는 체적비이지 중량비가 아니다(2-f).
 */
export function calcMix(
  length: HairLength,
  volume: HairVolume,
  ratio: number,
  tubeG = 60
): MixResult {
  const creamG = BASE_GRAMS[length][volume];
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const developerMl = Math.round(creamG * r * 10) / 10;
  const t = Number.isFinite(tubeG) && tubeG > 0 ? tubeG : 60;
  return {
    creamG,
    developerMl,
    totalG: Math.round((creamG + developerMl) * 10) / 10,
    tubes: Math.ceil(creamG / t),
  };
}

// ─── 白髮 ────────────────────────────────────────────────────────────────────
export type GreyRatio = "0" | "30" | "50" | "50+";

export const GREY_OPTIONS: { value: GreyRatio; labelZh: string }[] = [
  { value: "0", labelZh: "沒有白髮" },
  { value: "30", labelZh: "約 30% 以下" },
  { value: "50", labelZh: "約 50%" },
  { value: "50+", labelZh: "50% 以上" },
];

export function needsNaturalBase(grey: GreyRatio): boolean {
  return grey === "50+";
}

// ─── 안전 레일 (2-g) ─────────────────────────────────────────────────────────
export type Rail = { id: string; textZh: string; linkSlug?: string };

export function safetyRails(
  verdict: LiftVerdict,
  grey: GreyRatio,
  tone: ToneFamily,
  targetLevel: number
): Rail[] {
  const rails: Rail[] = [];

  if (verdict.kind === "bleach") {
    rails.push({
      id: "bleach",
      textZh: `需要提升 ${verdict.lift} 度，單靠染髮不足，需先漂髮。`,
      linkSlug: "bleaching-science",
    });
  }

  // 40vol 두피 이격 경고는 railForVol() 이 실제 사용 度數를 받아 판정한다.

  if (needsNaturalBase(grey)) {
    rails.push({
      id: "grey",
      textZh: "白髮比例偏高，建議混合自然色系打底，避免顏色浮、掉色快。",
      linkSlug: "grey-coverage-science",
    });
  }

  if (isUndertoneRisky(targetLevel, tone)) {
    rails.push({
      id: "undertone",
      textZh: `底色不足，冷色會濁。目標 ${targetLevel} 度時底色仍在「${undertoneAt(targetLevel)}」區間。`,
      linkSlug: "undertone-theory",
    });
  }

  return rails;
}

/**
 * 실제로 쓸 雙氧乳 度數.
 *
 * 過氧化氫 12%(40vol) 은 대만에서 합법이다 — 〈特定用途化粧品成分名稱及使用限制表〉의
 * 燙髮劑二劑 항목에 12%(40 volumes) 상한이 명시돼 있다. 그래서 선택지에서 빼지 않는다.
 * 다만 고르면 두피 이격 경고(railForVol)가 붙는다.
 *
 * override 가 null 이면 진단 권장값을 쓴다. 漂髮 판정에는 권장값이 없으므로 null 이 될 수 있다.
 */
export function resolveVol(verdict: LiftVerdict, override: number | null): number | null {
  if (override != null && SELECTABLE_VOLS.includes(override)) return override;
  return verdict.kind === "ok" ? verdict.vol : null;
}

/** 40vol 을 직접 선택했을 때의 레일 (UI 에서 度數를 바꿀 수 있게 열어둔 경우). */
export function railForVol(vol: number): Rail | null {
  if (vol >= 40) return { id: "vol40", textZh: "使用 40vol 時，請與頭皮保持距離塗抹。" };
  return null;
}
