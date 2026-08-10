import { describe, expect, it } from "vitest";
import {
  calcBep,
  calcDailyCustomers,
  calcEmployerBurden,
  calcInitialInvestment,
  calcScenarios,
  calcStaffCost,
} from "./openingCostCalc";

// ─── 고용주 부담 ──────────────────────────────────────────────────────────────
describe("calcEmployerBurden", () => {
  it("월급 32,000 (급距 33,300): 勞保 2,914 + 健保 1,611 + 勞退 1,920 = 6,445", () => {
    const b = calcEmployerBurden(32_000);
    expect(b.labor).toBe(2_914);   // 33,300×12.5%×70% = 2,913.75
    expect(b.health).toBe(1_611);  // 33,300×5.17%×60%×1.56 = 1,611.43
    expect(b.pension).toBe(1_920); // 32,000×6% (실급여 기준)
    expect(b.total).toBe(6_445);
  });

  it("勞退 제교는 급距가 아닌 실급여 기준, 상한 150,000", () => {
    expect(calcEmployerBurden(200_000).pension).toBe(9_000); // 150,000×6%
  });

  it("勞保 고용주분은 45,800 캡", () => {
    const b = calcEmployerBurden(100_000);
    expect(b.labor).toBe(Math.round(45_800 * 0.125 * 0.7)); // 4,008
  });
});

// ─── BEP 필수 케이스 ──────────────────────────────────────────────────────────
describe("BEP 필수 케이스: 월세 4만/직원 1명 32,000/기타 1만/재료 10%/抽成 35%/客單價 800/영업일 26", () => {
  const staff = calcStaffCost(1, 32_000);
  const fixed = 40_000 + staff.total + 10_000;
  const variableRatio = 0.10 + 0.35;
  const bep = calcBep(fixed, variableRatio);

  it("고정비 = 40,000 + 38,445(인건비 총부담) + 10,000 = 88,445", () => {
    expect(staff.total).toBe(38_445); // 32,000 + 6,445
    expect(fixed).toBe(88_445);
  });

  it("BEP = 88,445 ÷ 0.55 ≈ 160,809", () => {
    expect(Math.round(bep)).toBe(160_809);
  });

  it("일 필요 객수 = BEP ÷ 800 ÷ 26 = 7.7명", () => {
    expect(calcDailyCustomers(bep, 800, 26)).toBe(7.7);
  });

  it("시나리오: 80% 적자 / 100% 손익 0 / 130% 흑자 + 회수 개월", () => {
    const s = calcScenarios(bep, variableRatio, fixed, 500_000);
    expect(s[0].profit).toBeLessThan(0);          // 80%
    expect(s[1].profit).toBe(0);                  // 100% = BEP
    expect(s[1].paybackMonths).toBeNull();        // 이익 0 → 회수 불가
    expect(s[2].profit).toBe(26_534);             // 130%: 209,052×0.55−88,445
    expect(s[2].paybackMonths).toBe(Math.ceil(500_000 / 26_534)); // 19개월
  });
});

// ─── BEP 추가 케이스 ──────────────────────────────────────────────────────────
describe("calcBep edge cases", () => {
  it("변동비 0이면 BEP = 고정비", () => {
    expect(calcBep(100_000, 0)).toBe(100_000);
  });

  it("변동비율 ≥ 100%면 BEP 불가 (Infinity)", () => {
    expect(calcBep(100_000, 1)).toBe(Infinity);
    expect(calcBep(100_000, 1.2)).toBe(Infinity);
  });

  it("고정비 55,000 / 변동비율 45% → BEP 100,000", () => {
    expect(calcBep(55_000, 0.45)).toBeCloseTo(100_000, 6);
  });
});

// ─── 초기 투자 ────────────────────────────────────────────────────────────────
describe("calcInitialInvestment", () => {
  it("押金 = 월세×개월수, 예비비 = 소계×%", () => {
    const r = calcInitialInvestment({
      monthlyRent: 40_000,
      depositMonths: 2,
      transferFee: 300_000,
      interior: 500_000,
      equipment: 200_000,
      initialSupplies: 50_000,
      reservePct: 10,
    });
    expect(r.deposit).toBe(80_000);
    expect(r.subtotal).toBe(1_130_000);
    expect(r.reserve).toBe(113_000);
    expect(r.total).toBe(1_243_000);
  });
});
