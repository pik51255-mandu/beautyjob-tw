import { describe, expect, it } from "vitest";
import {
  DEVELOPERS, SELECTABLE_VOLS, calcMix, diagnoseLift, isUndertoneRisky, needsNaturalBase,
  railForVol, resolveVol, safetyRails, undertoneAt, volToPercent,
} from "./colorMixCalc";

describe("雙氧乳 %↔vol 대응 (02 바이블 1-3)", () => {
  it("고정 대응표를 지킨다", () => {
    expect(DEVELOPERS).toEqual([
      { percent: 3, vol: 10 }, { percent: 6, vol: 20 },
      { percent: 9, vol: 30 }, { percent: 12, vol: 40 },
    ]);
  });

  it("vol → % 환산이 표와 일치한다", () => {
    expect(volToPercent(10)).toBe(3);
    expect(volToPercent(20)).toBe(6);
    expect(volToPercent(30)).toBe(9);
    expect(volToPercent(40)).toBe(12);
  });
});

describe("리프트 진단 (2-d)", () => {
  it("리프트 0度면 10vol", () => {
    expect(diagnoseLift(6, 6)).toEqual({ kind: "ok", lift: 0, vol: 10, percent: 3 });
  });

  it("어둡게 가는 경우도 10vol (리프트 불필요)", () => {
    const v = diagnoseLift(8, 6);
    expect(v.kind).toBe("ok");
    if (v.kind === "ok") expect(v.vol).toBe(10);
  });

  it("1~2度는 20vol", () => {
    for (const [b, t] of [[6, 7], [6, 8], [3, 5]] as const) {
      const v = diagnoseLift(b, t);
      expect(v.kind).toBe("ok");
      if (v.kind === "ok") expect(v.vol).toBe(20);
    }
  });

  it("2~3度는 30vol", () => {
    const v = diagnoseLift(5, 8);
    expect(v.kind).toBe("ok");
    if (v.kind === "ok") expect(v.vol).toBe(30);
  });

  it("3度 초과는 vol 추천 대신 漂髮 안내", () => {
    const v = diagnoseLift(3, 9);
    expect(v.kind).toBe("bleach");
    if (v.kind === "bleach") expect(v.lift).toBe(6);
    expect(v).not.toHaveProperty("vol");
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

  it("40vol 선택 시 두피 이격 권고", () => {
    expect(railForVol(40)?.textZh).toContain("頭皮保持距離");
    expect(railForVol(30)).toBeNull();
  });

  it("조건이 겹치면 레일이 함께 뜬다", () => {
    const rails = safetyRails(diagnoseLift(3, 9), "50+", "灰霧", 9);
    expect(rails.map((r) => r.id).sort()).toEqual(["bleach", "grey"]);
  });
});

describe("雙氧乳 度數 직접 선택 (40vol 대만 합법)", () => {
  it("40vol 은 선택지에 남아 있다 — 過氧化氫 12% 는 대만 합법 상한", () => {
    expect(SELECTABLE_VOLS).toEqual([10, 20, 30, 40]);
    expect(DEVELOPERS.some((d) => d.vol === 40 && d.percent === 12)).toBe(true);
  });

  it("override 가 없으면 진단 권장값을 쓴다", () => {
    expect(resolveVol(diagnoseLift(6, 8), null)).toBe(20);
    expect(resolveVol(diagnoseLift(6, 6), null)).toBe(10);
  });

  it("漂髮 판정이면 권장값이 없다", () => {
    expect(resolveVol(diagnoseLift(3, 9), null)).toBeNull();
  });

  it("漂髮 판정에서도 直接 고른 度數는 살아 있다", () => {
    expect(resolveVol(diagnoseLift(3, 9), 40)).toBe(40);
  });

  it("override 는 권장값을 덮어쓴다", () => {
    expect(resolveVol(diagnoseLift(6, 8), 40)).toBe(40);
    expect(resolveVol(diagnoseLift(6, 8), 10)).toBe(10);
  });

  it("목록에 없는 度數는 무시하고 권장값으로 되돌린다", () => {
    expect(resolveVol(diagnoseLift(6, 8), 35)).toBe(20);
    expect(resolveVol(diagnoseLift(6, 8), 0)).toBe(20);
    expect(resolveVol(diagnoseLift(6, 8), NaN)).toBe(20);
  });

  it("40vol 을 고르면 두피 이격 경고가 붙는다", () => {
    const vol = resolveVol(diagnoseLift(6, 8), 40);
    expect(vol).toBe(40);
    expect(railForVol(vol ?? 0)?.textZh).toContain("頭皮保持距離");
  });

  it("40vol 미만에서는 경고가 붙지 않는다", () => {
    for (const v of [10, 20, 30]) expect(railForVol(v)).toBeNull();
  });

  it("safetyRails 는 40vol 레일을 만들지 않는다 — railForVol 이 단독 담당(중복 방지)", () => {
    const rails = safetyRails(diagnoseLift(3, 9), "50+", "灰霧", 9);
    expect(rails.map((r) => r.id)).not.toContain("vol40");
  });
});

describe("v12 지정 테스트 케이스 3종", () => {
  it("① 底色6 → 目標8 自然", () => {
    const v = diagnoseLift(6, 8);
    expect(v).toEqual({ kind: "ok", lift: 2, vol: 20, percent: 6 });
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
    expect(v).toEqual({ kind: "ok", lift: 1, vol: 20, percent: 6 });
    const rails = safetyRails(v, "50+", "自然", 6);
    expect(rails.map((r) => r.id)).toEqual(["grey"]);
  });
});
