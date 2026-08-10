import { describe, expect, it } from "vitest";
import {
  calcBep,
  calcDailyCustomers,
  calcEmployerBurden,
  calcInitialInvestment,
  calcMaxDailyCustomers,
  calcProductContribution,
  calcScenarios,
  calcServiceMix,
  calcStaffCost,
  normalizeShares,
  type ServiceRow,
} from "./openingCostCalc";

// 다올살롱 실측 모델 기본 5행
const DEFAULT_SERVICES: ServiceRow[] = [
  { name: "剪髮", price: 600, materialPct: 0, sharePct: 40, minutes: 40 },
  { name: "燙髮", price: 2_500, materialPct: 30, sharePct: 20, minutes: 120 },
  { name: "染髮", price: 2_200, materialPct: 30, sharePct: 25, minutes: 100 },
  { name: "護髮", price: 1_500, materialPct: 50, sharePct: 10, minutes: 60 },
  { name: "其他", price: 800, materialPct: 10, sharePct: 5, minutes: 40 },
];

// ─── 고용주 부담 (기존 유지) ──────────────────────────────────────────────────
describe("calcEmployerBurden", () => {
  it("월급 32,000: 勞保 2,914 + 健保 1,611 + 勞退 1,920 = 6,445", () => {
    const b = calcEmployerBurden(32_000);
    expect(b.total).toBe(6_445);
  });
});

// ─── 시술 믹스 가중평균 ───────────────────────────────────────────────────────
describe("calcServiceMix", () => {
  it("기본 5행: 가중 客單價 1,480 / 재료비율 19% / 소요시간 73분", () => {
    const mix = calcServiceMix(DEFAULT_SERVICES);
    expect(mix.shareSum).toBe(100);
    expect(mix.avgTicket).toBe(1_480);   // 600×.4+2500×.2+2200×.25+1500×.1+800×.05
    expect(mix.materialRate).toBeCloseTo(0.19, 10); // 0+.06+.075+.05+.005
    expect(mix.avgMinutes).toBe(73);     // 16+24+25+6+2
  });

  it("비중 합 ≠ 100이어도 비중 합 기준으로 정규화 계산", () => {
    const doubled = DEFAULT_SERVICES.map((r) => ({ ...r, sharePct: r.sharePct * 2 }));
    const mix = calcServiceMix(doubled);
    expect(mix.shareSum).toBe(200);
    expect(mix.avgTicket).toBe(1_480); // 가중평균은 동일
  });

  it("normalizeShares: 합 100으로 정규화", () => {
    const rows = normalizeShares(DEFAULT_SERVICES.map((r) => ({ ...r, sharePct: r.sharePct * 2 })));
    const sum = rows.reduce((s, r) => s + r.sharePct, 0);
    expect(Math.round(sum)).toBe(100);
  });
});

// ─── 押金 제외 회수 ───────────────────────────────────────────────────────────
describe("押金 제외 초기투자 회수", () => {
  it("회수 대상 = 초기투자 총액 − 押金", () => {
    const initial = calcInitialInvestment({
      monthlyRent: 40_000, depositMonths: 2, transferFee: 300_000,
      interior: 500_000, equipment: 200_000, initialSupplies: 50_000, reservePct: 10,
    });
    expect(initial.total).toBe(1_243_000);
    expect(initial.deposit).toBe(80_000);
    const recoverable = initial.total - initial.deposit; // 1,163,000
    const s = calcScenarios(200_000, 0.5, 80_000, recoverable);
    // 130%: 260,000×0.5−80,000 = 50,000 → ceil(1,163,000/50,000) = 24개월
    expect(s[2].profit).toBe(50_000);
    expect(s[2].paybackMonths).toBe(24);
  });

  it("손익 0이면 payback null (UI에서 '—' 표기)", () => {
    const s = calcScenarios(100_000, 0.5, 50_000, 500_000);
    expect(s[1].profit).toBe(0);
    expect(s[1].paybackMonths).toBeNull();
  });
});

// ─── 店販 공헌이익 ────────────────────────────────────────────────────────────
describe("calcProductContribution", () => {
  it("매출 30,000 × (1 − 원가 50% − 인센티브 10%) = 12,000, 시나리오 손익에 가산", () => {
    const contribution = calcProductContribution(30_000, 50, 10);
    expect(contribution).toBe(12_000);
    const s = calcScenarios(100_000, 0.5, 50_000, 500_000, contribution);
    expect(s[1].profit).toBe(12_000); // 시술 손익 0 + 店販 12,000
    expect(s[1].paybackMonths).toBe(Math.ceil(500_000 / 12_000));
  });
});

// ─── 캐파 체크 ────────────────────────────────────────────────────────────────
describe("calcMaxDailyCustomers", () => {
  it("min(디자이너, 席位) × 영업분 ÷ 평균시간 × 가동률", () => {
    // min(1,3)=1 × 600분 ÷ 73분 × 0.8 = 6.575 → 6.6
    expect(calcMaxDailyCustomers(1, 3, 10, 73, 0.8)).toBe(6.6);
    // 디자이너 2명이면 2배
    expect(calcMaxDailyCustomers(2, 3, 10, 73, 0.8)).toBe(13.2);
  });

  it("캐파 경고 발동 케이스: BEP 일 객수 > 최대 처리 객수", () => {
    // 시술이 느리고(평균 120분) 인력 1명 → max = 600/120×0.8 = 4.0
    const max = calcMaxDailyCustomers(1, 3, 10, 120, 0.8);
    expect(max).toBe(4);
    // BEP 200,000, 客單價 1,000, 26일 → 일 7.7객 필요 > 4.0 → 경고
    const need = calcDailyCustomers(200_000, 1_000, 26);
    expect(need).toBe(7.7);
    expect(need > max).toBe(true);
  });
});

// ─── 필수 검증 케이스 ─────────────────────────────────────────────────────────
describe("필수 케이스: 기본 5행 + 월세 4만 + 직원 1명 32,000 + 기타 1만 + 抽成 35% + 수수료 2% + 디자이너 1·席位 3·10h", () => {
  const mix = calcServiceMix(DEFAULT_SERVICES);
  const staff = calcStaffCost(1, 32_000);
  const fixed = 40_000 + staff.total + 10_000; // 88,445
  const variableRatio = mix.materialRate + 0.35 + 0.02; // 0.56
  const bep = calcBep(fixed, variableRatio);
  const dailyNeed = calcDailyCustomers(bep, mix.avgTicket, 26);
  const maxDaily = calcMaxDailyCustomers(1, 3, 10, mix.avgMinutes, 0.8);

  it("변동비율 56% (재료 19% + 抽成 35% + 수수료 2%)", () => {
    expect(variableRatio).toBeCloseTo(0.56, 10);
  });

  it("BEP = 88,445 ÷ 0.44 ≈ 201,011", () => {
    expect(Math.round(bep)).toBe(201_011);
  });

  it("일 필요 객수 5.2명 (客單價 1,480 × 26일)", () => {
    expect(dailyNeed).toBe(5.2);
  });

  it("캐파 한계 6.6명/일 → BEP 달성 가능 (경고 미발동)", () => {
    expect(maxDaily).toBe(6.6);
    expect(dailyNeed <= maxDaily).toBe(true);
  });

  it("130% 시나리오는 일 6.8객 필요 → 캐파 초과", () => {
    const daily130 = calcDailyCustomers(bep * 1.3, mix.avgTicket, 26);
    expect(daily130).toBe(6.8);
    expect(daily130 > maxDaily).toBe(true);
  });
});

// ─── BEP 엣지 (기존 유지) ─────────────────────────────────────────────────────
describe("calcBep edge cases", () => {
  it("변동비율 ≥ 100%면 Infinity", () => {
    expect(calcBep(100_000, 1)).toBe(Infinity);
  });
  it("변동비 0이면 BEP = 고정비", () => {
    expect(calcBep(100_000, 0)).toBe(100_000);
  });
});
