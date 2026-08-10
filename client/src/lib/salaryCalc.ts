// 薪資試算 계산 로직 — 언어와 무관한 단일 코드. UI에서 직접 계산하지 말 것.
import {
  HEALTH_INSURANCE_EMPLOYEE_SHARE,
  HEALTH_INSURANCE_MAX,
  HEALTH_INSURANCE_RATE,
  INSURED_SALARY_BRACKETS,
  LABOR_INSURANCE_EMPLOYEE_SHARE,
  LABOR_INSURANCE_MAX,
  LABOR_INSURANCE_RATE,
  PENSION_SELF_MAX_BASE,
} from "./rates2026";

// ─── 투보급距 매칭 ────────────────────────────────────────────────────────────
// 실급여가 급距 사이면 상위 급距, 최고 급距 초과면 최고 급距(45,800).
export function matchInsuredBracket(grossSalary: number): number {
  if (grossSalary <= INSURED_SALARY_BRACKETS[0]) return INSURED_SALARY_BRACKETS[0];
  for (const bracket of INSURED_SALARY_BRACKETS) {
    if (grossSalary <= bracket) return bracket;
  }
  return INSURED_SALARY_BRACKETS[INSURED_SALARY_BRACKETS.length - 1];
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
  insuredBracket: number;   // 선택된 투보급距
  dependents: number;       // 健保 권속 수 (기본 0)
  pensionSelfRate: number;  // 勞退 自提 0~0.06
};

export type DeductionResult = {
  laborInsurance: number;
  healthInsurance: number;
  pensionSelf: number;
  total: number;
};

export function calcDeductions(input: DeductionInput): DeductionResult {
  const laborBase = Math.min(input.insuredBracket, LABOR_INSURANCE_MAX);
  const laborInsurance = Math.round(laborBase * LABOR_INSURANCE_RATE * LABOR_INSURANCE_EMPLOYEE_SHARE);

  const healthBase = Math.min(input.insuredBracket, HEALTH_INSURANCE_MAX);
  const healthPerPerson = Math.round(healthBase * HEALTH_INSURANCE_RATE * HEALTH_INSURANCE_EMPLOYEE_SHARE);
  const healthInsurance = healthPerPerson * (1 + Math.max(0, Math.floor(input.dependents)));

  const pensionBase = Math.min(input.insuredBracket, PENSION_SELF_MAX_BASE);
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
