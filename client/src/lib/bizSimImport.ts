// 經營損益模擬器 (C-4) — 다른 도구의 localStorage 데이터 가져오기 매퍼.
// 순수 함수로 분리해 단위테스트 대상으로 유지. 파싱 실패는 null 반환 (버튼 비활성).
import type { ServiceRow } from "./openingCostCalc";
import { calcStaffCost } from "./openingCostCalc";
import { calcTreatmentCost, type Chemical, type Treatment } from "./productCostCalc";

export const PRODUCT_COST_STORAGE_KEY = "productCostInputs.v1";
export const OPENING_COST_STORAGE_KEY = "openingCostInputs.v3";

// C-3 藥水成本計算器의 시술 정의 → 시술 믹스 행 (재료율은 약값 기반 실측치).
// 비중·소요시간은 시뮬레이터에서 입력해야 하므로 0/60분으로 초기화한다.
export function mapProductCostToServiceRows(raw: string | null): ServiceRow[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { chemicals?: Chemical[]; treatments?: Treatment[] };
    if (!Array.isArray(parsed.treatments) || parsed.treatments.length === 0) return null;
    if (!Array.isArray(parsed.chemicals)) return null;
    return parsed.treatments.map((treatment) => {
      const { materialRate } = calcTreatmentCost(treatment, parsed.chemicals!);
      return {
        name: treatment.name,
        price: treatment.price,
        materialPct: Math.round(materialRate * 1000) / 10,
        sharePct: 0,
        minutes: 60,
      };
    });
  } catch {
    return null;
  }
}

// 開店成本試算器의 월 고정비 합계 (고용주 부담 포함)
export function mapOpeningCostToMonthlyFixed(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      monthlyRent?: number;
      staffCount?: number;
      staffSalary?: number;
      utilities?: number;
      marketing?: number;
      otherFixed?: number;
    };
    if (typeof parsed.monthlyRent !== "number") return null;
    const staff = calcStaffCost(parsed.staffCount ?? 0, parsed.staffSalary ?? 0);
    return Math.round(
      parsed.monthlyRent +
        staff.total +
        (parsed.utilities ?? 0) +
        (parsed.marketing ?? 0) +
        (parsed.otherFixed ?? 0)
    );
  } catch {
    return null;
  }
}
