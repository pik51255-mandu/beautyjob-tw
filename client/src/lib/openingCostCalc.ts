// 開店成本試算 계산 로직 — 언어 무관 단일 코드.
import {
  HEALTH_INSURANCE_AVG_DEPENDENTS_FACTOR,
  HEALTH_INSURANCE_EMPLOYER_SHARE,
  HEALTH_INSURANCE_MAX,
  HEALTH_INSURANCE_RATE,
  LABOR_INSURANCE_EMPLOYER_SHARE,
  LABOR_INSURANCE_MAX,
  LABOR_INSURANCE_RATE,
  PENSION_EMPLOYER_MAX_BASE,
  PENSION_EMPLOYER_RATE,
} from "./rates2026";
import { matchInsuredBracket } from "./salaryCalc";

// ─── 월급제 직원 1인당 고용주 부담 ────────────────────────────────────────────
export type EmployerBurden = {
  labor: number;    // 勞保 고용주분
  health: number;   // 健保 고용주분 (평균 권속 계수 포함)
  pension: number;  // 勞退 제교 6%
  total: number;
};

export function calcEmployerBurden(monthlySalary: number): EmployerBurden {
  const bracket = matchInsuredBracket(monthlySalary);
  const labor = Math.round(
    Math.min(bracket, LABOR_INSURANCE_MAX) * LABOR_INSURANCE_RATE * LABOR_INSURANCE_EMPLOYER_SHARE
  );
  const health = Math.round(
    Math.min(bracket, HEALTH_INSURANCE_MAX) *
      HEALTH_INSURANCE_RATE *
      HEALTH_INSURANCE_EMPLOYER_SHARE *
      HEALTH_INSURANCE_AVG_DEPENDENTS_FACTOR
  );
  // 勞退 제교는 실급여 기준 (상한 150,000)
  const pension = Math.round(Math.min(monthlySalary, PENSION_EMPLOYER_MAX_BASE) * PENSION_EMPLOYER_RATE);
  return { labor, health, pension, total: labor + health + pension };
}

// 인건비 총부담 = (월급 + 고용주 부담) × 인원
export function calcStaffCost(headcount: number, monthlySalary: number): {
  burden: EmployerBurden;
  perEmployee: number;
  total: number;
} {
  const n = Math.max(0, Math.floor(headcount));
  const burden = calcEmployerBurden(monthlySalary);
  const perEmployee = monthlySalary + burden.total;
  return { burden, perEmployee, total: perEmployee * n };
}

// ─── 초기 투자 ────────────────────────────────────────────────────────────────
export type InitialInvestmentInput = {
  monthlyRent: number;
  depositMonths: number;   // 押金 = 월세 × 개월수 (기본 2)
  transferFee: number;     // 頂讓費 (신규창업 0)
  interior: number;        // 裝潢
  equipment: number;       // 설비·기기
  initialSupplies: number; // 초기 재료·비품
  reservePct: number;      // 예비비 % (기본 10)
};

export function calcInitialInvestment(input: InitialInvestmentInput): {
  deposit: number;
  subtotal: number;
  reserve: number;
  total: number;
} {
  const deposit = Math.round(input.monthlyRent * Math.max(0, input.depositMonths));
  const subtotal = deposit + input.transferFee + input.interior + input.equipment + input.initialSupplies;
  const reserve = Math.round(subtotal * Math.max(0, input.reservePct) / 100);
  return { deposit, subtotal, reserve, total: subtotal + reserve };
}

// ─── 손익분기 (BEP) ───────────────────────────────────────────────────────────
// BEP = 고정비 ÷ (1 − 변동비율), 변동비율 = 재료비율 + 抽成率
export function calcBep(monthlyFixedCost: number, variableRatio: number): number {
  if (variableRatio >= 1) return Infinity;
  return monthlyFixedCost / (1 - Math.max(0, variableRatio));
}

// 일 필요 객수 = BEP ÷ 客單價 ÷ 영업일수 (소수 1자리)
export function calcDailyCustomers(bep: number, avgTicket: number, workDays: number): number {
  if (!Number.isFinite(bep) || avgTicket <= 0 || workDays <= 0) return Infinity;
  return Math.round((bep / avgTicket / workDays) * 10) / 10;
}

// ─── 시나리오 (BEP의 80% / 100% / 130%) ──────────────────────────────────────
export type Scenario = {
  pct: number;          // 0.8 / 1.0 / 1.3
  revenue: number;      // 월매출
  profit: number;       // 월 손익
  paybackMonths: number | null; // 초기투자 회수 개월수 (이익 ≤ 0이면 null)
};

export function calcScenarios(
  bep: number,
  variableRatio: number,
  monthlyFixedCost: number,
  initialInvestment: number,
  pcts: number[] = [0.8, 1, 1.3]
): Scenario[] {
  return pcts.map((pct) => {
    const revenue = Math.round(bep * pct);
    const profit = Math.round(revenue * (1 - variableRatio) - monthlyFixedCost) || 0; // -0 정규화
    const paybackMonths =
      profit > 0 && initialInvestment > 0 ? Math.ceil(initialInvestment / profit) : null;
    return { pct, revenue, profit, paybackMonths };
  });
}
