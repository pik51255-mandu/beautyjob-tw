// 薪資試算 계산 로직 — 언어와 무관한 단일 코드. UI에서 직접 계산하지 말 것.
import {
  HEALTH_INSURANCE_EMPLOYEE_SHARE,
  HEALTH_INSURANCE_RATE,
  INSURED_SALARY_BRACKETS,
  LABOR_INSURANCE_EMPLOYEE_SHARE,
  LABOR_INSURANCE_MAX,
  LABOR_INSURANCE_RATE,
} from "./rates2026";
import { HEALTH_INSURANCE_TABLE, PENSION_TABLE } from "./insuranceTables2026";

/** 健保法 第18條第2項 「前項眷屬之保險費，由被保險人繳納；超過三口者，以三口計」 */
export const HEALTH_DEPENDENT_CAP = 3;

// ─── 분급표 매칭 ──────────────────────────────────────────────────────────────
// 세 제도(勞保·健保·勞退)가 쓰는 규칙은 같다 — 실급여 이상인 첫 급距, 최고 급距를
// 넘으면 최고 급距. 표만 다르다. 官方 원문의 구간 표기("N元至M元 → M元")와 같은 결과다.
export function matchBracket(amounts: readonly number[], grossSalary: number): number {
  for (const amount of amounts) {
    if (grossSalary <= amount) return amount;
  }
  return amounts[amounts.length - 1];
}

/** 勞保(就保 포함) 투보급距. UI 의 「自動對應」이 쓰는 값이다. */
export function matchInsuredBracket(grossSalary: number): number {
  return matchBracket(INSURED_SALARY_BRACKETS, grossSalary);
}

/** 健保 투보금액 — 勞保와 다른 표(58급, 상한 313,000)를 쓴다. */
export function matchHealthBracket(grossSalary: number): number {
  return matchBracket(HEALTH_INSURANCE_TABLE.amounts, grossSalary);
}

/** 勞退 월제교공자 — 또 다른 표(62급, 상한 150,000)를 쓴다. */
export function matchPensionBracket(grossSalary: number): number {
  return matchBracket(PENSION_TABLE.amounts, grossSalary);
}

// ─── 총급여 계산 ──────────────────────────────────────────────────────────────
export type PerformanceTier = { from: number; rate: number }; // rate: 0~1, from 초과분에 적용

export type DesignerPayInput =
  | { structure: "pure_commission"; performance: number; commissionRate: number; materialRate: number; designationFee: number }
  | { structure: "base_plus_commission"; base: number; performance: number; commissionRate: number; materialRate: number; designationFee: number }
  | { structure: "tiered"; base: number; performance: number; materialRate: number; designationFee: number; tiers: PerformanceTier[] };

export type AssistantPayInput = { salary: number; allowance: number };

// 材料費는 業績에서 선공제 후 抽成을 적용한다: (業績 × (1−材料費率)) × 抽成率
export function calcDesignerGross(input: DesignerPayInput): number {
  const netPerformance = input.performance * (1 - clamp01(input.materialRate));
  let gross = input.designationFee;
  if (input.structure === "pure_commission") {
    gross += netPerformance * clamp01(input.commissionRate);
  } else if (input.structure === "base_plus_commission") {
    gross += input.base + netPerformance * clamp01(input.commissionRate);
  } else {
    // 級距制: 정렬된 구간별로 초과분에 해당 구간 요율을 누진 적용
    gross += input.base;
    const tiers = [...input.tiers].sort((a, b) => a.from - b.from);
    for (let i = 0; i < tiers.length; i++) {
      const start = tiers[i].from;
      const end = i + 1 < tiers.length ? tiers[i + 1].from : Infinity;
      if (netPerformance <= start) break;
      const portion = Math.min(netPerformance, end) - start;
      gross += portion * clamp01(tiers[i].rate);
    }
  }
  return Math.round(gross);
}

export function calcAssistantGross(input: AssistantPayInput): number {
  return Math.round(input.salary + input.allowance);
}

// ─── 공제 계산 ────────────────────────────────────────────────────────────────
export type DeductionInput = {
  /** 勞保 투보급距. 사용자가 수동 조정할 수 있어 별도로 받는다 */
  insuredBracket: number;
  /** 健保·勞退 산정에 쓰는 실급여 총액. 생략하면 insuredBracket 을 쓴다(구 동작) */
  grossSalary?: number;
  dependents: number;       // 健保 권속 수 (기본 0, 3口 캡)
  pensionSelfRate: number;  // 勞退 自提 0~0.06
};

export type DeductionResult = {
  laborInsurance: number;
  healthInsurance: number;
  pensionSelf: number;
  total: number;
};

export function calcDeductions(input: DeductionInput): DeductionResult {
  // 勞保는 사용자가 고른 급距 그대로 쓴다 (수동 저보고를 화면에 그대로 보여주려고).
  // 다만 표의 상한(45,800)은 넘을 수 없다 — UI 밖에서 호출될 때의 방어선.
  const laborBase = Math.min(input.insuredBracket, LABOR_INSURANCE_MAX);
  const laborInsurance = Math.round(laborBase * LABOR_INSURANCE_RATE * LABOR_INSURANCE_EMPLOYEE_SHARE);

  // 健保·勞退는 각자의 분급표로 실급여에서 다시 잡는다. 세 표가 갈리는 것은
  // 45,800 초과 구간부터라, 助理 급여대에서는 예전과 결과가 같다.
  const base = input.grossSalary ?? input.insuredBracket;

  const healthBase = matchHealthBracket(base);
  const healthPerPerson = Math.round(healthBase * HEALTH_INSURANCE_RATE * HEALTH_INSURANCE_EMPLOYEE_SHARE);
  // 眷屬은 3口까지만 계산한다 (健保法 第18條第2項).
  const dependents = Math.min(HEALTH_DEPENDENT_CAP, Math.max(0, Math.floor(input.dependents)));
  const healthInsurance = healthPerPerson * (1 + dependents);

  const pensionBase = matchPensionBracket(base);
  const pensionSelf = Math.round(pensionBase * clampRange(input.pensionSelfRate, 0, 0.06));

  return {
    laborInsurance,
    healthInsurance,
    pensionSelf,
    total: laborInsurance + healthInsurance + pensionSelf,
  };
}

export function calcNet(gross: number, deductions: DeductionResult): number {
  return gross - deductions.total;
}

function clamp01(n: number): number {
  return clampRange(n, 0, 1);
}

function clampRange(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
