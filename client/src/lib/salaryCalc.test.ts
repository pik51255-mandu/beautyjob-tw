import { describe, expect, it } from "vitest";
import {
  calcAssistantGross,
  calcDeductions,
  calcDesignerGross,
  calcNet,
  laborEmployeePremium,
  laborEmployerPremium,
  splitLaborPremium,
  matchHealthBracket,
  matchInsuredBracket,
  matchPensionBracket,
} from "./salaryCalc";
import {
  HEALTH_INSURANCE_TABLE,
  LABOR_INSURANCE_TABLE,
  LABOR_PREMIUM_TABLE,
  PENSION_TABLE,
  RATE_ROC_YEAR,
  RATE_YEAR,
} from "./insuranceTables2026";
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

// ─── v24 A+B+C — 제도별 분급표 분리 ──────────────────────────────────────────
// 勞保·健保·勞退가 각자 다른 표를 쓴다. 예전에는 勞保 표 하나로 셋을 계산해서
// 45,800 초과 구간(設計師)에서 健保·勞退가 과소 계산됐다.
describe("분급표 분리 (v24)", () => {
  it("세 표는 서로 다르다 — 급수와 상한", () => {
    expect(INSURED_SALARY_BRACKETS).toHaveLength(11);
    expect(HEALTH_INSURANCE_TABLE.amounts).toHaveLength(58);
    expect(PENSION_TABLE.amounts).toHaveLength(62);
    expect(INSURED_SALARY_BRACKETS.at(-1)).toBe(45_800);
    expect(HEALTH_INSURANCE_TABLE.amounts.at(-1)).toBe(313_000);
    expect(PENSION_TABLE.amounts.at(-1)).toBe(150_000);
  });

  it("메타는 연도·시행일·출처를 갖는다 (UI 연도 라벨의 유일한 출처)", () => {
    for (const t of [LABOR_INSURANCE_TABLE, HEALTH_INSURANCE_TABLE, PENSION_TABLE]) {
      expect(t.year).toBe(2026);
      expect(t.rocYear).toBe(115);
      expect(t.effectiveFrom).toBe("2026-01-01");
      expect(t.sourceUrl).toMatch(/^https:\/\//);
    }
    expect(RATE_YEAR).toBe(2026);
    expect(RATE_ROC_YEAR).toBe(115);
  });

  // v26 감사에서 官方 표 배열이 오염됐는데 315개 테스트가 전부 통과했다 —
  // 아무도 LABOR_INSURANCE_TABLE.amounts 를 읽지 않았기 때문이다.
  // 이제 INSURED_SALARY_BRACKETS 가 그 배열의 파생이라 여기서 함께 지켜진다.
  it("勞保 급距는 官方 표에서 파생된다 — 사본이 아니다", () => {
    expect(INSURED_SALARY_BRACKETS).toBe(LABOR_INSURANCE_TABLE.amounts);
  });

  it("官方 勞保 표 11급이 원문 값 그대로다 (오염 감지)", () => {
    expect([...LABOR_INSURANCE_TABLE.amounts]).toEqual([
      29_500, 30_300, 31_800, 33_300, 34_800, 36_300,
      38_200, 40_100, 42_000, 43_900, 45_800,
    ]);
  });

  it("네 표 모두 오름차순이고 중복이 없다", () => {
    for (const amounts of [
      LABOR_INSURANCE_TABLE.amounts,
      INSURED_SALARY_BRACKETS,
      HEALTH_INSURANCE_TABLE.amounts,
      PENSION_TABLE.amounts,
    ]) {
      for (let i = 1; i < amounts.length; i++) expect(amounts[i]).toBeGreaterThan(amounts[i - 1]);
    }
  });

  it("45,800 이하에서는 勞保·健保 표가 같다 (助理 구간 결과 불변의 근거)", () => {
    const health = HEALTH_INSURANCE_TABLE.amounts.filter((a) => a <= 45_800);
    expect(health).toEqual([...INSURED_SALARY_BRACKETS]);
  });
});

describe("경계값 — 급距 매칭", () => {
  it("45,800 직전·정확·초과", () => {
    expect(matchInsuredBracket(43_901)).toBe(45_800);
    expect(matchInsuredBracket(45_800)).toBe(45_800);
    expect(matchInsuredBracket(45_801)).toBe(45_800); // 勞保는 여기서 멈춘다
    expect(matchHealthBracket(45_800)).toBe(45_800);
    expect(matchHealthBracket(45_801)).toBe(48_200);  // 健保는 계속 올라간다
    expect(matchPensionBracket(45_801)).toBe(48_200);
  });

  it("健保 상한 등급 313,000", () => {
    expect(matchHealthBracket(312_999)).toBe(313_000);
    expect(matchHealthBracket(313_000)).toBe(313_000);
    expect(matchHealthBracket(9_999_999)).toBe(313_000);
  });

  it("勞退 캡 150,000", () => {
    expect(matchPensionBracket(147_901)).toBe(150_000);
    expect(matchPensionBracket(150_000)).toBe(150_000);
    expect(matchPensionBracket(9_999_999)).toBe(150_000);
  });

  it("최저 급距 아래는 제1급", () => {
    expect(matchInsuredBracket(0)).toBe(29_500);
    expect(matchHealthBracket(1)).toBe(29_500);
    expect(matchPensionBracket(1)).toBe(1_500);
  });
});

describe("경계값 — 健保 眷屬 3口 캡 (健保法 第18條第2項)", () => {
  const at = (dependents: number) =>
    calcDeductions({ insuredBracket: 45_800, grossSalary: 45_000, dependents, pensionSelfRate: 0 });

  it("0口 = 본인만 710", () => {
    expect(at(0).healthInsurance).toBe(710);
  });

  it("3口 = 본인+3 = 710 × 4 = 2,840 (官方 「本人+3眷口」 열과 일치)", () => {
    expect(at(3).healthInsurance).toBe(2_840);
  });

  it("4口 이상은 3口로 잡힌다 — 더 늘지 않는다", () => {
    expect(at(4).healthInsurance).toBe(at(3).healthInsurance);
    expect(at(10).healthInsurance).toBe(at(3).healthInsurance);
    expect(at(999).healthInsurance).toBe(at(3).healthInsurance);
  });

  it("음수·소수는 0口로 떨어진다", () => {
    expect(at(-5).healthInsurance).toBe(710);
    expect(at(0.9).healthInsurance).toBe(710);
  });
});

describe("助理 45,000 회귀 — 표 분리 뒤에도 값이 그대로다", () => {
  it("勞保 1,145 / 健保 710 / 실수령 43,145", () => {
    const gross = calcAssistantGross({ salary: 45_000, allowance: 0 });
    const d = calcDeductions({
      insuredBracket: matchInsuredBracket(gross),
      grossSalary: gross,
      dependents: 0,
      pensionSelfRate: 0,
    });
    expect(d.laborInsurance).toBe(1_145);
    expect(d.healthInsurance).toBe(710);
    expect(d.total).toBe(1_855);
    expect(calcNet(gross, d)).toBe(43_145);
  });

  it("助理 급여대 전 구간에서 표 분리 전후 결과가 같다", () => {
    for (let salary = 29_000; salary <= 45_800; salary += 100) {
      const bracket = matchInsuredBracket(salary);
      const now = calcDeductions({ insuredBracket: bracket, grossSalary: salary, dependents: 0, pensionSelfRate: 0.06 });
      const before = calcDeductions({ insuredBracket: bracket, dependents: 0, pensionSelfRate: 0.06 });
      expect(now).toEqual(before);
    }
  });
});

describe("設計師 고소득 — 분리 효과 (v22 §2 불일치 B·C 해소)", () => {
  it("총급여 60,000: 健保가 45,800 이 아니라 60,800 기준", () => {
    const d = calcDeductions({
      insuredBracket: matchInsuredBracket(60_000), // 45,800 (勞保는 캡)
      grossSalary: 60_000,
      dependents: 0,
      pensionSelfRate: 0,
    });
    expect(d.laborInsurance).toBe(1_145);          // 勞保는 그대로 캡
    expect(d.healthInsurance).toBe(943);           // 60,800 × 5.17% × 30%
    expect(matchHealthBracket(60_000)).toBe(60_800);
  });

  it("총급여 100,000·自提 6%: 勞退가 45,800 이 아니라 101,100 기준", () => {
    const d = calcDeductions({
      insuredBracket: matchInsuredBracket(100_000),
      grossSalary: 100_000,
      dependents: 0,
      pensionSelfRate: 0.06,
    });
    expect(matchPensionBracket(100_000)).toBe(101_100);
    expect(d.pensionSelf).toBe(Math.round(101_100 * 0.06)); // 6,066
  });
});

// 官方 「勞工保險普通事故保險費及就業保險保險費合計之被保險人與投保單位分擔金額表
// (自115年1月1日起適用)」 30일(만근) 열 — https://www.bli.gov.tw/Files/25697 (ODS 원문 셀값)
describe("官方 분담금액표 대조 — 勞保 11급 전량", () => {
  /** [투보급距, 官方 본인부담액] */
  const OFFICIAL: [number, number][] = [
    [29_500, 738], [30_300, 758], [31_800, 795], [33_300, 833],
    [34_800, 870], [36_300, 908], [38_200, 955], [40_100, 1_002],
    [42_000, 1_050], [43_900, 1_098], [45_800, 1_145],
  ];

  it("11급 전부 官方 표와 원 단위까지 같다", () => {
    for (const [bracket, expected] of OFFICIAL) {
      const d = calcDeductions({ insuredBracket: bracket, grossSalary: bracket, dependents: 0, pensionSelfRate: 0 });
      expect(d.laborInsurance).toBe(expected);
    }
  });

  /**
   * v25 정정: 40,100 은 官方 표의 특이값이 아니었다.
   * 官方은 12.5% 를 한 번에 곱하지 않고 勞保 11.5% 와 就保 1% 를 각각 반올림해 더한다.
   * 그 산식이면 본인·단위 22개 값이 전부 맞는다. 단일 12.5% 는 본인 1건·단위 3건이 어긋난다.
   */
  it("官方 산식(분리합산)이 본인·단위 22개 값을 전부 재현한다", () => {
    for (const [bracket, expectedEmployee] of OFFICIAL) {
      expect(splitLaborPremium(bracket, 0.2)).toBe(expectedEmployee);
      expect(splitLaborPremium(bracket, 0.7)).toBe(LABOR_PREMIUM_TABLE.byBracket[bracket].employer);
    }
  });

  it("단일 12.5% 산식은 4곳에서 어긋난다 — 그래서 표가 정본이다", () => {
    const mismatches: number[] = [];
    for (const [bracket, expectedEmployee] of OFFICIAL) {
      const employer = LABOR_PREMIUM_TABLE.byBracket[bracket].employer;
      if (Math.round(bracket * 0.125 * 0.2) !== expectedEmployee) mismatches.push(bracket);
      if (Math.round(bracket * 0.125 * 0.7) !== employer) mismatches.push(bracket);
    }
    expect(mismatches.sort((a, b) => a - b)).toEqual([29_500, 38_200, 40_100, 45_800]);
  });

  it("표에 없는 급距는 官方 산식으로 떨어진다 (UI 밖 호출 방어)", () => {
    expect(laborEmployeePremium(37_000)).toBe(splitLaborPremium(37_000, 0.2));
    expect(laborEmployerPremium(37_000)).toBe(splitLaborPremium(37_000, 0.7));
  });

  it("대조 대상이 표 전량이다 (급距를 빠뜨리지 않았다)", () => {
    expect(OFFICIAL.map(([b]) => b)).toEqual([...INSURED_SALARY_BRACKETS]);
  });
});
