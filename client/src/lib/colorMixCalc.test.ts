import { describe, expect, it } from "vitest";
import {
  DEVELOPERS, SELECTABLE_PERCENTS, calcMix, diagnoseLift, isUndertoneRisky, needsNaturalBase,
  percentToVol, railForPercent, resolvePercent, safetyRails, undertoneAt,
} from "./colorMixCalc";

describe("雙氧乳 %↔vol 대응 (02 바이블 1-3)", () => {
  it("고정 대응표를 지킨다", () => {
    expect(DEVELOPERS).toEqual([
      { percent: 3, vol: 10 }, { percent: 6, vol: 20 },
      { percent: 9, vol: 30 }, { percent: 12, vol: 40 },
    ]);
  });

  it("% → vol 환산이 표와 일치한다 (vol 은 표시용 파생값)", () => {
    expect(percentToVol(3)).toBe(10);
    expect(percentToVol(6)).toBe(20);
    expect(percentToVol(9)).toBe(30);
    expect(percentToVol(12)).toBe(40);
  });

  it("환산표에 없는 %는 vol 을 만들지 않는다", () => {
    expect(percentToVol(7)).toBeNull();
    expect(percentToVol(0)).toBeNull();
  });
});

describe("리프트 진단 (2-d)", () => {
  it("리프트 0度면 3%", () => {
    expect(diagnoseLift(6, 6)).toEqual({ kind: "ok", lift: 0, percent: 3 });
  });

  it("어둡게 가는 경우도 3% (리프트 불필요)", () => {
    const v = diagnoseLift(8, 6);
    expect(v.kind).toBe("ok");
    if (v.kind === "ok") expect(v.percent).toBe(3);
  });

  it("1~2度는 6%", () => {
    for (const [b, t] of [[6, 7], [6, 8], [3, 5]] as const) {
      const v = diagnoseLift(b, t);
      expect(v.kind).toBe("ok");
      if (v.kind === "ok") expect(v.percent).toBe(6);
    }
  });

  it("2~3度는 9%", () => {
    const v = diagnoseLift(5, 8);
    expect(v.kind).toBe("ok");
    if (v.kind === "ok") expect(v.percent).toBe(9);
  });

  it("3度 초과는 濃度 추천 대신 漂髮 안내", () => {
    const v = diagnoseLift(3, 9);
    expect(v.kind).toBe("bleach");
    if (v.kind === "bleach") expect(v.lift).toBe(6);
    expect(v).not.toHaveProperty("percent");
  });

  it("진단 결과에 vol 필드가 남아 있지 않다 (기준 단위는 %)", () => {
    expect(diagnoseLift(6, 8)).not.toHaveProperty("vol");
  });

  it("경계값 3度는 아직 염색 범위", () => {
    expect(diagnoseLift(5, 8).kind).toBe("ok");
    expect(diagnoseLift(5, 9).kind).toBe("bleach");
  });
});

describe("底色 예측 (2-e)", () => {
  it("度數가 낮을수록 붉고 높을수록 노랗다", () => {
    expect(undertoneAt(3)).toBe("紅");
    expect(undertoneAt(6)).toBe("橘");
    expect(undertoneAt(9)).toBe("黃");
  });

  it("범위를 벗어난 값도 1~10 으로 잘라 처리한다", () => {
    expect(undertoneAt(0)).toBe(undertoneAt(1));
    expect(undertoneAt(99)).toBe(undertoneAt(10));
  });

  it("冷色 계열은 8度 미만이면 탁해질 위험을 표시한다", () => {
    expect(isUndertoneRisky(6, "灰霧")).toBe(true);
    expect(isUndertoneRisky(9, "灰霧")).toBe(false);
  });

  it("暖色 계열은 底色 경고 대상이 아니다", () => {
    expect(isUndertoneRisky(6, "紅銅")).toBe(false);
    expect(isUndertoneRisky(6, "金")).toBe(false);
  });
});

describe("분량 환산 (2-f)", () => {
  it("배합비는 사용자 입력을 그대로 쓴다 — 추측하지 않는다", () => {
    expect(calcMix("中", "中", 1).developerMl).toBe(60);
    expect(calcMix("中", "中", 1.5).developerMl).toBe(90);
    expect(calcMix("中", "中", 2).developerMl).toBe(120);
  });

  it("길이·모량에 따라 染膏 기준량이 달라진다", () => {
    expect(calcMix("短", "少", 1).creamG).toBe(30);
    expect(calcMix("長", "多", 1).creamG).toBe(120);
  });

  it("튜브 개수는 올림 처리한다", () => {
    expect(calcMix("中", "中", 1, 60).tubes).toBe(1);
    expect(calcMix("長", "多", 1, 60).tubes).toBe(2);
    expect(calcMix("長", "少", 1, 60).tubes).toBe(2);
  });

  it("튜브 용량을 바꿀 수 있다", () => {
    expect(calcMix("長", "多", 1, 100).tubes).toBe(2);
    expect(calcMix("長", "多", 1, 40).tubes).toBe(3);
  });

  it("잘못된 배합비·튜브값은 안전한 기본값으로 떨어진다", () => {
    expect(calcMix("中", "中", 0).developerMl).toBe(60);
    expect(calcMix("中", "中", -1).developerMl).toBe(60);
    expect(calcMix("中", "中", NaN).developerMl).toBe(60);
    expect(calcMix("中", "中", 1, 0).tubes).toBe(1);
  });

  it("어떤 입력에서도 NaN·Infinity 가 새지 않는다", () => {
    for (const r of [0, 1, 1.5, 2, 3, -5, NaN, Infinity]) {
      const m = calcMix("中", "中", r);
      expect(Number.isFinite(m.creamG)).toBe(true);
      expect(Number.isFinite(m.developerMl)).toBe(true);
      expect(Number.isFinite(m.tubes)).toBe(true);
    }
  });
});

describe("안전 레일 (2-g)", () => {
  it("3度 초과면 漂髮 안내가 뜬다", () => {
    const rails = safetyRails(diagnoseLift(3, 9), "0", "自然", 9);
    expect(rails.find((r) => r.id === "bleach")?.linkSlug).toBe("bleaching-science");
  });

  it("白髮 50% 초과면 자연 베이스 혼합 제안", () => {
    expect(needsNaturalBase("50+")).toBe(true);
    expect(needsNaturalBase("50")).toBe(false);
    const rails = safetyRails(diagnoseLift(5, 6), "50+", "自然", 6);
    expect(rails.find((r) => r.id === "grey")?.linkSlug).toBe("grey-coverage-science");
  });

  it("冷色인데 底色이 부족하면 경고 + 이론 글 링크", () => {
    const rails = safetyRails(diagnoseLift(5, 6), "0", "灰霧", 6);
    const u = rails.find((r) => r.id === "undertone");
    expect(u?.linkSlug).toBe("undertone-theory");
    expect(u?.textZh).toContain("底色不足");
  });

  it("12% 선택 시 두피 이격 권고", () => {
    expect(railForPercent(12)?.textZh).toContain("頭皮保持距離");
    expect(railForPercent(9)).toBeNull();
  });

  it("조건이 겹치면 레일이 함께 뜬다", () => {
    const rails = safetyRails(diagnoseLift(3, 9), "50+", "灰霧", 9);
    expect(rails.map((r) => r.id).sort()).toEqual(["bleach", "grey"]);
  });
});

describe("雙氧乳 濃度 직접 선택 (% 기준)", () => {
  it("선택지는 환산표의 % 집합과 완전히 같다 — 도달 불가 항목 0", () => {
    expect(SELECTABLE_PERCENTS).toEqual([3, 6, 9, 12]);
    expect(SELECTABLE_PERCENTS).toEqual(DEVELOPERS.map((d) => d.percent));
  });

  it("override 가 없으면 진단 권장값을 쓴다", () => {
    expect(resolvePercent(diagnoseLift(6, 8), null)).toBe(6);
    expect(resolvePercent(diagnoseLift(6, 6), null)).toBe(3);
  });

  it("漂髮 판정이면 권장값이 없다", () => {
    expect(resolvePercent(diagnoseLift(3, 9), null)).toBeNull();
  });

  it("漂髮 판정에서도 直接 고른 濃度는 살아 있다", () => {
    expect(resolvePercent(diagnoseLift(3, 9), 12)).toBe(12);
  });

  it("override 는 권장값을 덮어쓴다", () => {
    expect(resolvePercent(diagnoseLift(6, 8), 12)).toBe(12);
    expect(resolvePercent(diagnoseLift(6, 8), 3)).toBe(3);
  });

  it("환산표에 없는 濃度는 무시하고 권장값으로 되돌린다", () => {
    expect(resolvePercent(diagnoseLift(6, 8), 7)).toBe(6);
    expect(resolvePercent(diagnoseLift(6, 8), 0)).toBe(6);
    expect(resolvePercent(diagnoseLift(6, 8), NaN)).toBe(6);
    expect(resolvePercent(diagnoseLift(6, 8), 40)).toBe(6); // vol 값을 넣어도 진입 불가
  });

  it("12% 를 고르면 두피 이격 경고가 붙는다", () => {
    const pct = resolvePercent(diagnoseLift(6, 8), 12);
    expect(pct).toBe(12);
    expect(railForPercent(pct ?? 0)?.textZh).toContain("頭皮保持距離");
  });

  it("12% 미만에서는 경고가 붙지 않는다", () => {
    for (const p of [3, 6, 9]) expect(railForPercent(p)).toBeNull();
  });

  it("safetyRails 는 濃度 레일을 만들지 않는다 — railForPercent 단독 담당(중복 방지)", () => {
    const rails = safetyRails(diagnoseLift(3, 9), "50+", "灰霧", 9);
    expect(rails.map((r) => r.id)).not.toContain("pct12");
  });
});

describe("도달 불가 분기 점검 (환산표 ↔ 진단 ↔ 레일 3자 대조)", () => {
  it("환산표의 모든 %는 어떤 경로로든 실제로 도달할 수 있다", () => {
    const reachable = new Set<number>();
    // 경로 1: 진단 권장값
    for (let base = 1; base <= 10; base++) {
      for (let target = 1; target <= 10; target++) {
        const p = resolvePercent(diagnoseLift(base, target), null);
        if (p != null) reachable.add(p);
      }
    }
    // 경로 2: 사용자 직접 선택
    for (const p of SELECTABLE_PERCENTS) {
      const r = resolvePercent(diagnoseLift(6, 8), p);
      if (r != null) reachable.add(r);
    }
    expect([...reachable].sort((a, b) => a - b)).toEqual(DEVELOPERS.map((d) => d.percent));
  });

  it("진단이 스스로 추천하는 범위는 3~9% — 12%는 사용자가 직접 골라야만 나온다", () => {
    const byDiagnosis = new Set<number>();
    for (let base = 1; base <= 10; base++) {
      for (let target = 1; target <= 10; target++) {
        const v = diagnoseLift(base, target);
        if (v.kind === "ok") byDiagnosis.add(v.percent);
      }
    }
    expect([...byDiagnosis].sort((a, b) => a - b)).toEqual([3, 6, 9]);
    expect(byDiagnosis.has(12)).toBe(false);
    expect(resolvePercent(diagnoseLift(6, 8), 12)).toBe(12);
  });

  it("레일이 반응하는 값도 도달 가능한 값 안에 있다", () => {
    const railTriggers = SELECTABLE_PERCENTS.filter((p) => railForPercent(p) !== null);
    expect(railTriggers).toEqual([12]);
    expect(SELECTABLE_PERCENTS).toContain(12);
  });
});

describe("v12 지정 테스트 케이스 3종", () => {
  it("① 底色6 → 目標8 自然", () => {
    const v = diagnoseLift(6, 8);
    expect(v).toEqual({ kind: "ok", lift: 2, percent: 6 });
    expect(safetyRails(v, "0", "自然", 8)).toEqual([]);
  });

  it("② 底色3 → 目標9 灰霧 — 漂髮 안내", () => {
    const v = diagnoseLift(3, 9);
    expect(v.kind).toBe("bleach");
    const rails = safetyRails(v, "0", "灰霧", 9);
    expect(rails.map((r) => r.id)).toContain("bleach");
    // 목표가 9度라 冷色 底色 경고는 뜨지 않는다
    expect(rails.map((r) => r.id)).not.toContain("undertone");
  });

  it("③ 白髮60% 底色5 → 目標6", () => {
    const v = diagnoseLift(5, 6);
    expect(v).toEqual({ kind: "ok", lift: 1, percent: 6 });
    const rails = safetyRails(v, "50+", "自然", 6);
    expect(rails.map((r) => r.id)).toEqual(["grey"]);
  });
});
