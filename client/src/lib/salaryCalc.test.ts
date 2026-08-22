import { describe, expect, it } from "vitest";
import {
  calcAssistantGross,
  calcDeductions,
  calcDesignerGross,
  calcNet,
  matchInsuredBracket,
} from "./salaryCalc";
import {
  HEALTH_INSURANCE_MAX,
  INSURED_SALARY_BRACKETS,
  LABOR_INSURANCE_MAX,
  PENSION_SELF_MAX_BASE,
} from "./rates2026";

// ─── 급距 매칭 ────────────────────────────────────────────────────────────────
describe("matchInsuredBracket", () => {
  it("급距 사이값은 상위 급距 적용 (35,000 → 36,300)", () => {
    expect(matchInsuredBracket(35_000)).toBe(36_300);
  });

  it("최저임금 이하는 최저 급距 29,500", () => {
    expect(matchInsuredBracket(20_000)).toBe(29_500);
    expect(matchInsuredBracket(29_500)).toBe(29_500);
  });

  it("급距 정확 일치 시 해당 급距 유지", () => {
    for (const bracket of INSURED_SALARY_BRACKETS) {
      expect(matchInsuredBracket(bracket)).toBe(bracket);
    }
  });

  it("최고 급距 초과 시 45,800으로 캡", () => {
    expect(matchInsuredBracket(60_000)).toBe(45_800);
    expect(matchInsuredBracket(1_000_000)).toBe(LABOR_INSURANCE_MAX);
  });
});

// ─── 공제 상한 3종 ────────────────────────────────────────────────────────────
describe("calcDeductions caps", () => {
  it("勞保 상한 45,800: 급距가 상한을 넘어도 45,800 기준", () => {
    const d = calcDeductions({ insuredBracket: 100_000, dependents: 0, pensionSelfRate: 0 });
    // 45,800 × 12.5% × 20% = 1,145
    expect(d.laborInsurance).toBe(1_145);
  });

  it("健保 상한 313,000: 초과분은 313,000 기준", () => {
    const d = calcDeductions({ insuredBracket: 400_000, dependents: 0, pensionSelfRate: 0 });
    // 313,000 × 5.17% × 30% = 4,854.63 → 4,855
    expect(d.healthInsurance).toBe(Math.round(HEALTH_INSURANCE_MAX * 0.0517 * 0.3));
  });

  it("勞退 自提 상한 150,000: 초과분은 150,000 기준", () => {
    const d = calcDeductions({ insuredBracket: 200_000, dependents: 0, pensionSelfRate: 0.06 });
    expect(d.pensionSelf).toBe(Math.round(PENSION_SELF_MAX_BASE * 0.06)); // 9,000
  });

  it("健保 권속 1인당 동액 가산", () => {
    const alone = calcDeductions({ insuredBracket: 36_300, dependents: 0, pensionSelfRate: 0 });
    const withTwo = calcDeductions({ insuredBracket: 36_300, dependents: 2, pensionSelfRate: 0 });
    expect(withTwo.healthInsurance).toBe(alone.healthInsurance * 3);
  });
});

// ─── 보고용 3케이스 ───────────────────────────────────────────────────────────
describe("report cases", () => {
  it("設計師 純抽成: 業績 150,000 × 40% → 총 60,000, 실수령 58,145", () => {
    const gross = calcDesignerGross({
      structure: "pure_commission",
      performance: 150_000,
      commissionRate: 0.4,
      materialRate: 0,
      designationFee: 0,
    });
    expect(gross).toBe(60_000);
    const bracket = matchInsuredBracket(gross); // 45,800 캡
    expect(bracket).toBe(45_800);
    const d = calcDeductions({ insuredBracket: bracket, dependents: 0, pensionSelfRate: 0 });
    expect(d.laborInsurance).toBe(1_145); // 45,800×12.5%×20%
    expect(d.healthInsurance).toBe(710);  // 45,800×5.17%×30% = 710.36 → 710
    expect(calcNet(gross, d)).toBe(58_145);
  });

  it("設計師 純抽成: 業績 250,000 × 40% → 총 100,000, 실수령 98,145", () => {
    const gross = calcDesignerGross({
      structure: "pure_commission",
      performance: 250_000,
      commissionRate: 0.4,
      materialRate: 0,
      designationFee: 0,
    });
    expect(gross).toBe(100_000);
    const d = calcDeductions({ insuredBracket: matchInsuredBracket(gross), dependents: 0, pensionSelfRate: 0 });
    expect(calcNet(gross, d)).toBe(98_145);
  });

  it("助理 월급 32,000 → 급距 33,300, 실수령 30,651", () => {
    const gross = calcAssistantGross({ salary: 32_000, allowance: 0 });
    const bracket = matchInsuredBracket(gross);
    expect(bracket).toBe(33_300);
    const d = calcDeductions({ insuredBracket: bracket, dependents: 0, pensionSelfRate: 0 });
    expect(d.laborInsurance).toBe(833); // 33,300×12.5%×20% = 832.5 → 833
    expect(d.healthInsurance).toBe(516); // 33,300×5.17%×30% = 516.48 → 516
    expect(calcNet(gross, d)).toBe(30_651);
  });
});

// ─── 級距制 누진 계산 ─────────────────────────────────────────────────────────
describe("tiered commission", () => {
  it("구간별 초과분 누진 적용", () => {
    const gross = calcDesignerGross({
      structure: "tiered",
      base: 10_000,
      performance: 200_000,
      materialRate: 0,
      designationFee: 0,
      tiers: [
        { from: 0, rate: 0.3 },        // 0~100,000: 30%
        { from: 100_000, rate: 0.4 },  // 100,000 초과: 40%
      ],
    });
    // 10,000 + 100,000×0.3 + 100,000×0.4 = 80,000
    expect(gross).toBe(80_000);
  });
});

// ─── 실기기 신고 케이스 (2026-08-22) ──────────────────────────────────────────
// 助理 월급 45,000 신고 건. 화면에는 급距 33,300 이 보이는데 공제는 45,800 기준으로
// 잡혀 "표시값과 계산값이 다르다"는 제보였다. 계산 자체는 옳았고 표시가 낡은
// 번역본이었다(translateGuard 회귀 참조). 두 값이 같은 출처임을 여기서 못박는다.
describe("助理 월급 45,000 (실기기 제보 케이스)", () => {
  const gross = calcAssistantGross({ salary: 45_000, allowance: 0 });

  it("총급여 45,000 → 자동 급距 45,800 (33,300 아님)", () => {
    expect(gross).toBe(45_000);
    expect(matchInsuredBracket(gross)).toBe(45_800);
    expect(matchInsuredBracket(gross)).not.toBe(33_300);
  });

  it("공제액이 제보된 실측치와 일치 (勞保 1,145 / 健保 710)", () => {
    const d = calcDeductions({
      insuredBracket: matchInsuredBracket(gross),
      dependents: 0,
      pensionSelfRate: 0,
    });
    expect(d.laborInsurance).toBe(1_145); // 45,800 × 12.5% × 20%
    expect(d.healthInsurance).toBe(710);  // 45,800 × 5.17% × 30%
    expect(d.total).toBe(1_855);
    expect(calcNet(gross, d)).toBe(43_145);
  });

  it("화면 표시 급距와 공제 계산 급距는 같은 함수에서 나온다", () => {
    // UI 의 「自動對應（N）」 표시와 calcDeductions 의 입력이 갈라지지 않는지 확인.
    for (const salary of [29_000, 32_000, 35_000, 45_000, 60_000]) {
      const displayed = matchInsuredBracket(calcAssistantGross({ salary, allowance: 0 }));
      const used = calcDeductions({ insuredBracket: displayed, dependents: 0, pensionSelfRate: 0 });
      expect(used.laborInsurance).toBe(Math.round(Math.min(displayed, 45_800) * 0.125 * 0.2));
    }
  });
});
