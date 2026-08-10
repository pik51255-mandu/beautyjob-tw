import { describe, expect, it } from "vitest";
import {
  calcBep,
  calcDailyCustomers,
  calcMaxDailyCustomers,
  calcServiceMix,
  calcStaffCost,
  type ServiceRow,
} from "./openingCostCalc";
import { mapOpeningCostToMonthlyFixed, mapProductCostToServiceRows } from "./bizSimImport";
import { DEFAULT_CHEMICALS, DEFAULT_TREATMENTS } from "./productCostCalc";

// C-4 검증 앵커: 기본 5행 + 월세 4만 + 직원 1명 32,000 + 기타 1만
// + 抽成 35% + 수수료 2% + 디자이너 1·席位 3·10h·80%·26일
const DEFAULT_SERVICES: ServiceRow[] = [
  { name: "剪髮", price: 600, materialPct: 0, sharePct: 40, minutes: 40 },
  { name: "燙髮", price: 2_500, materialPct: 30, sharePct: 20, minutes: 120 },
  { name: "染髮", price: 2_200, materialPct: 30, sharePct: 25, minutes: 100 },
  { name: "護髮", price: 1_500, materialPct: 50, sharePct: 10, minutes: 60 },
  { name: "其他", price: 800, materialPct: 10, sharePct: 5, minutes: 40 },
];

describe("經營損益模擬器 검증 앵커 (매출 가중 확인)", () => {
  const mix = calcServiceMix(DEFAULT_SERVICES);
  const fixed = 40_000 + calcStaffCost(1, 32_000).total + 10_000; // 88,445
  const variableRatio = mix.materialRate + 0.35 + 0.02;
  const bep = calcBep(fixed, variableRatio);
  const dailyNeed = calcDailyCustomers(bep, mix.avgTicket, 26);
  const maxDaily = calcMaxDailyCustomers(1, 3, 10, mix.avgMinutes, 0.8);

  it("가중 재료율 26.6% — 객수 가중(19%)이 나오면 실패", () => {
    expect(Math.round(mix.materialRate * 1000) / 10).toBe(26.6);
    expect(Math.abs(mix.materialRate - 0.19)).toBeGreaterThan(0.05); // 객수 가중 회귀 방지
  });

  it("변동비율 ≈ 63.6%", () => {
    expect(Math.round(variableRatio * 1000) / 10).toBe(63.6);
  });

  it("BEP ≈ NT$ 243,125 (지시서 추정 242,981은 재료율 26.6% 반올림값 — 정확 계산 기준)", () => {
    expect(Math.round(bep)).toBe(243_125);
  });

  it("일 필요 객수 ≈ 6.3 / 캐파 6.6명/일", () => {
    expect(dailyNeed).toBe(6.3);
    expect(maxDaily).toBe(6.6);
    expect(dailyNeed <= maxDaily).toBe(true); // BEP 자체는 달성 가능 (여유 ~5%)
  });

  it("130% 시나리오는 캐파 초과 → 경고 발동", () => {
    const daily130 = calcDailyCustomers(bep * 1.3, mix.avgTicket, 26);
    expect(daily130).toBe(8.2);
    expect(daily130 > maxDaily).toBe(true);
  });
});

// ─── 크로스 도구 가져오기 매퍼 ────────────────────────────────────────────────
describe("bizSimImport", () => {
  it("C-3 데이터 → 시술 믹스 행 (재료율 약값 실측 기반)", () => {
    const raw = JSON.stringify({ chemicals: DEFAULT_CHEMICALS, treatments: DEFAULT_TREATMENTS });
    const rows = mapProductCostToServiceRows(raw);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(3);
    expect(rows![0]).toMatchObject({ name: "染髮", price: 2_200, materialPct: 10.5 }); // 230.8/2200
    expect(rows![2]).toMatchObject({ name: "護髮", price: 1_500, materialPct: 12 });
    expect(rows![0].sharePct).toBe(0); // 비중·시간은 시뮬레이터에서 입력
  });

  it("C-3 데이터 없음/깨짐 → null (버튼 비활성)", () => {
    expect(mapProductCostToServiceRows(null)).toBeNull();
    expect(mapProductCostToServiceRows("not-json")).toBeNull();
    expect(mapProductCostToServiceRows(JSON.stringify({ treatments: [] }))).toBeNull();
  });

  it("개점 계산기 데이터 → 월 고정비 합계 (고용주 부담 포함)", () => {
    const raw = JSON.stringify({
      monthlyRent: 40_000, staffCount: 1, staffSalary: 32_000,
      utilities: 8_000, marketing: 5_000, otherFixed: 5_000,
    });
    expect(mapOpeningCostToMonthlyFixed(raw)).toBe(96_445); // 40,000+38,445+18,000
    expect(mapOpeningCostToMonthlyFixed(null)).toBeNull();
  });
});
