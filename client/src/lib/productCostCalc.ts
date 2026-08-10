// 藥水成本 계산 로직 (C-3) — 언어 무관 단일 코드.

// 월간 검증 경고 임계값: 실제 지출이 예상보다 +15% 초과 시 경고 (편집 가능 상수)
export const MONTHLY_WARN_THRESHOLD = 0.15;

export type Chemical = {
  id: number;
  name: string;
  price: number;        // 구매가 NT$
  totalAmount: number;  // 총용량 (g 또는 ml, 支 단위면 1)
  usagePerService: number; // 1회 사용량 (같은 단위)
};

export type TreatmentChemical = {
  chemicalId: number;
  multiplier: number;   // 사용 배수 (예: 안瓶×2)
};

export type Treatment = {
  id: number;
  name: string;
  price: number;        // 시술가 NT$
  chemicals: TreatmentChemical[];
};

// 약제 1회당 원가 = 구매가 × (1회 사용량 ÷ 총용량)
export function calcChemicalCostPerUse(chemical: Chemical): number {
  if (chemical.totalAmount <= 0) return 0;
  return (chemical.price * chemical.usagePerService) / chemical.totalAmount;
}

// 시술 1회당 약값 원가 + 재료율
export function calcTreatmentCost(
  treatment: Treatment,
  chemicals: Chemical[]
): { cost: number; materialRate: number } {
  const byId = new Map(chemicals.map((c) => [c.id, c]));
  let cost = 0;
  for (const tc of treatment.chemicals) {
    const chemical = byId.get(tc.chemicalId);
    if (!chemical) continue;
    cost += calcChemicalCostPerUse(chemical) * Math.max(0, tc.multiplier);
  }
  return {
    cost,
    materialRate: treatment.price > 0 ? cost / treatment.price : 0,
  };
}

// 월간 예상 약값 = Σ(시술별 월 건수 × 시술 1회당 원가)
export function calcMonthlyExpected(
  treatments: Treatment[],
  counts: Record<number, number>, // treatmentId → 월 건수
  chemicals: Chemical[]
): number {
  let total = 0;
  for (const treatment of treatments) {
    const count = Math.max(0, counts[treatment.id] ?? 0);
    total += calcTreatmentCost(treatment, chemicals).cost * count;
  }
  return total;
}

export type MonthlyEvaluation = {
  diff: number;      // 실제 − 예상 (NT$)
  diffPct: number;   // 예상 대비 % (예상 0이면 0)
  warn: boolean;     // 실제가 예상보다 +임계값 초과
};

export function evaluateMonthly(
  expected: number,
  actual: number,
  threshold: number = MONTHLY_WARN_THRESHOLD
): MonthlyEvaluation {
  const diff = actual - expected;
  const diffPct = expected > 0 ? diff / expected : 0;
  return {
    diff: Math.round(diff),
    diffPct,
    warn: expected > 0 && diffPct > threshold,
  };
}

// 기본 예시 데이터 (전부 수정 가능)
export const DEFAULT_CHEMICALS: Chemical[] = [
  { id: 1, name: "染膏", price: 550, totalAmount: 150, usagePerService: 60 },
  { id: 2, name: "雙氧乳", price: 180, totalAmount: 1000, usagePerService: 60 },
  { id: 3, name: "燙髮1劑", price: 420, totalAmount: 400, usagePerService: 80 },
  { id: 4, name: "燙髮2劑", price: 380, totalAmount: 400, usagePerService: 80 },
  { id: 5, name: "護髮安瓶", price: 90, totalAmount: 1, usagePerService: 1 },
];

export const DEFAULT_TREATMENTS: Treatment[] = [
  { id: 1, name: "染髮", price: 2_200, chemicals: [{ chemicalId: 1, multiplier: 1 }, { chemicalId: 2, multiplier: 1 }] },
  { id: 2, name: "燙髮", price: 2_500, chemicals: [{ chemicalId: 3, multiplier: 1 }, { chemicalId: 4, multiplier: 1 }] },
  { id: 3, name: "護髮", price: 1_500, chemicals: [{ chemicalId: 5, multiplier: 2 }] },
];
