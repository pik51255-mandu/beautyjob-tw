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

// ─── 시술 믹스 (다올살롱 실측 모델) ───────────────────────────────────────────
export type ServiceRow = {
  name: string;
  price: number;       // 단가 NT$
  materialPct: number; // 재료비율 % (0~100)
  sharePct: number;    // 손님 비중 % (합계 100 검증)
  minutes: number;     // 소요시간 (분)
};

export type ServiceMix = {
  shareSum: number;        // 입력된 비중 합 (%)
  avgTicket: number;       // 가중평균 客單價
  materialRate: number;    // 가중평균 재료비율 (0~1)
  avgMinutes: number;      // 가중평균 소요시간 (분)
};

// 비중 합이 100이 아니어도 계산은 비중 합 기준으로 정규화해서 수행한다
// (UI에서는 합≠100 경고 + 자동 정규화 버튼 제공).
export function calcServiceMix(rows: ServiceRow[]): ServiceMix {
  const shareSum = rows.reduce((s, r) => s + Math.max(0, r.sharePct), 0);
  if (shareSum <= 0) return { shareSum: 0, avgTicket: 0, materialRate: 0, avgMinutes: 0 };
  let ticket = 0, material = 0, minutes = 0;
  for (const r of rows) {
    const w = Math.max(0, r.sharePct) / shareSum;
    ticket += r.price * w;
    material += (Math.max(0, r.materialPct) / 100) * w;
    minutes += r.minutes * w;
  }
  return {
    shareSum: Math.round(shareSum * 10) / 10,
    avgTicket: Math.round(ticket),
    materialRate: material,
    avgMinutes: Math.round(minutes * 10) / 10,
  };
}

// 비중 자동 정규화 (합 100%로)
export function normalizeShares(rows: ServiceRow[]): ServiceRow[] {
  const sum = rows.reduce((s, r) => s + Math.max(0, r.sharePct), 0);
  if (sum <= 0) return rows;
  return rows.map((r) => ({ ...r, sharePct: Math.round((Math.max(0, r.sharePct) / sum) * 1000) / 10 }));
}

// ─── 店販 (제품 판매) 공헌이익 ────────────────────────────────────────────────
// 공헌이익 = 월 제품매출 × (1 − 원가율 − 인센티브율)
export function calcProductContribution(
  monthlyRevenue: number,
  costPct: number,
  incentivePct: number
): number {
  const ratio = 1 - Math.max(0, costPct) / 100 - Math.max(0, incentivePct) / 100;
  return Math.round(monthlyRevenue * Math.max(0, ratio));
}

// ─── 캐파 체크 ────────────────────────────────────────────────────────────────
export const DEFAULT_UTILIZATION = 0.8; // 가동률 기본값 (UI에서 편집 가능)

// 일 최대 처리 객수 = min(디자이너, 席位) × 영업시간(분) ÷ 가중평균 소요시간 × 가동률
export function calcMaxDailyCustomers(
  designers: number,
  seats: number,
  hoursPerDay: number,
  avgMinutes: number,
  utilization: number = DEFAULT_UTILIZATION
): number {
  if (avgMinutes <= 0) return Infinity;
  const stations = Math.max(0, Math.min(Math.floor(designers), Math.floor(seats)));
  const raw = (stations * hoursPerDay * 60) / avgMinutes * Math.max(0, utilization);
  return Math.round(raw * 10) / 10;
}

// ─── 손익분기 (BEP) ───────────────────────────────────────────────────────────
// BEP = 고정비 ÷ (1 − 변동비율), 변동비율 = 가중 재료비율 + 抽成率 + 수수료율
export function calcBep(monthlyFixedCost: number, variableRatio: number): number {
  if (variableRatio >= 1) return Infinity;
  return monthlyFixedCost / (1 - Math.max(0, variableRatio));
}

// 일 필요 객수 = 매출 ÷ 客單價 ÷ 영업일수 (소수 1자리)
export function calcDailyCustomers(revenue: number, avgTicket: number, workDays: number): number {
  if (!Number.isFinite(revenue) || avgTicket <= 0 || workDays <= 0) return Infinity;
  return Math.round((revenue / avgTicket / workDays) * 10) / 10;
}

// ─── 시나리오 (BEP의 80% / 100% / 130%) ──────────────────────────────────────
export type Scenario = {
  pct: number;          // 0.8 / 1.0 / 1.3
  revenue: number;      // 월매출 (시술)
  profit: number;       // 월 손익 (店販 공헌이익 포함)
  paybackMonths: number | null; // 회수 개월수 (押金 제외 투자 기준, 이익 ≤ 0이면 null)
};

// recoverableInvestment: 초기투자 총액 − 押金 (押金은 반환 자산이라 회수 대상에서 제외)
export function calcScenarios(
  bep: number,
  variableRatio: number,
  monthlyFixedCost: number,
  recoverableInvestment: number,
  productContribution: number = 0,
  pcts: number[] = [0.8, 1, 1.3]
): Scenario[] {
  return pcts.map((pct) => {
    const revenue = Math.round(bep * pct);
    const serviceProfit = Math.round(revenue * (1 - variableRatio) - monthlyFixedCost) || 0; // -0 정규화
    const profit = serviceProfit + productContribution;
    const paybackMonths =
      profit > 0 && recoverableInvestment > 0 ? Math.ceil(recoverableInvestment / profit) : null;
    return { pct, revenue, profit, paybackMonths };
  });
}
