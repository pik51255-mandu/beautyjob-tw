import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHEMICALS,
  DEFAULT_TREATMENTS,
  calcChemicalCostPerUse,
  calcMonthlyExpected,
  calcTreatmentCost,
  evaluateMonthly,
} from "./productCostCalc";

// ─── 1회당 원가 ───────────────────────────────────────────────────────────────
describe("calcChemicalCostPerUse", () => {
  it("染膏 550/150g/60g → 1회 220", () => {
    expect(calcChemicalCostPerUse(DEFAULT_CHEMICALS[0])).toBeCloseTo(220, 6);
  });

  it("雙氧乳 180/1000ml/60ml → 1회 10.8", () => {
    expect(calcChemicalCostPerUse(DEFAULT_CHEMICALS[1])).toBeCloseTo(10.8, 6);
  });

  it("支 단위(총용량 1)는 구매가 × 사용량", () => {
    expect(calcChemicalCostPerUse(DEFAULT_CHEMICALS[4])).toBe(90);
  });
});

// ─── 배수 적용 + 재료율 ───────────────────────────────────────────────────────
describe("calcTreatmentCost", () => {
  it("染髮 = 染膏 220 + 雙氧乳 10.8 = 230.8, 재료율 ≈ 10.5%", () => {
    const r = calcTreatmentCost(DEFAULT_TREATMENTS[0], DEFAULT_CHEMICALS);
    expect(r.cost).toBeCloseTo(230.8, 6);
    expect(r.materialRate).toBeCloseTo(230.8 / 2_200, 10); // ≈ 0.1049
  });

  it("護髮 = 安瓶 90 × 배수 2 = 180, 재료율 12%", () => {
    const r = calcTreatmentCost(DEFAULT_TREATMENTS[2], DEFAULT_CHEMICALS);
    expect(r.cost).toBe(180);
    expect(r.materialRate).toBeCloseTo(0.12, 10);
  });

  it("燙髮 = 84 + 76 = 160, 재료율 6.4%", () => {
    const r = calcTreatmentCost(DEFAULT_TREATMENTS[1], DEFAULT_CHEMICALS);
    expect(r.cost).toBeCloseTo(160, 6);
    expect(r.materialRate).toBeCloseTo(0.064, 10);
  });
});

// ─── 필수 검증 케이스: 월간 예측 vs 실제 ──────────────────────────────────────
describe("월간 검증 필수 케이스: 染30·燙15·護20, 실제 12,000", () => {
  const counts = { 1: 30, 2: 15, 3: 20 };
  const expected = calcMonthlyExpected(DEFAULT_TREATMENTS, counts, DEFAULT_CHEMICALS);

  it("예상 월 약값 = 230.8×30 + 160×15 + 180×20 = 12,924", () => {
    expect(Math.round(expected)).toBe(12_924);
  });

  it("실제 12,000 → 차이 −924 (−7.1%), 경고 미발동", () => {
    const r = evaluateMonthly(expected, 12_000);
    expect(r.diff).toBe(-924);
    expect(Math.round(r.diffPct * 1000) / 10).toBe(-7.1); // −924 ÷ 12,924
    expect(r.warn).toBe(false);
  });
});

// ─── 경고 발동 케이스 ─────────────────────────────────────────────────────────
describe("evaluateMonthly 경고", () => {
  it("실제가 예상 +15% 초과 시 경고 발동", () => {
    expect(evaluateMonthly(10_000, 11_501).warn).toBe(true);  // +15.01%
    expect(evaluateMonthly(10_000, 11_500).warn).toBe(false); // 정확히 +15% → 미발동
  });

  it("임계값 상수 편집 가능 (예: 10%)", () => {
    expect(evaluateMonthly(10_000, 11_100, 0.1).warn).toBe(true);
  });

  it("예상 0이면 경고 없음", () => {
    expect(evaluateMonthly(0, 5_000).warn).toBe(false);
  });
});
