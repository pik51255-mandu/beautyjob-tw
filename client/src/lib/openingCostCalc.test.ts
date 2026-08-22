import { describe, expect, it } from "vitest";
import {
  calcBep,
  calcDailyCustomers,
  calcEmployerBurden,
  calcInitialInvestment,
  calcMaxDailyCustomers,
  calcPreparationFund,
  calcProductContribution,
  calcScenarios,
  calcServiceMix,
  calcStaffCost,
  normalizeShares,
  type ServiceRow,
} from "./openingCostCalc";
import { matchHealthBracket, matchInsuredBracket } from "./salaryCalc";

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
  it("기본 5행: 가중 客單價 1,480 / 재료비율 26.6%(매출 가중) / 소요시간 73분(객수 가중)", () => {
    const mix = calcServiceMix(DEFAULT_SERVICES);
    expect(mix.shareSum).toBe(100);
    expect(mix.avgTicket).toBe(1_480);   // 600×.4+2500×.2+2200×.25+1500×.1+800×.05
    // 매출 가중 재료비율 = Σ(단가×비중×재료율) ÷ Σ(단가×비중) = 394 ÷ 1,480
    expect(mix.materialRate).toBeCloseTo(394 / 1_480, 10); // ≈ 0.2662 → 26.6%
    expect(mix.avgMinutes).toBe(73);     // 객수 가중 유지: 16+24+25+6+2
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

  it("변동비율 ≈ 63.6% (재료 26.6% + 抽成 35% + 수수료 2%)", () => {
    expect(variableRatio).toBeCloseTo(394 / 1_480 + 0.37, 10); // ≈ 0.6362
  });

  it("BEP = 88,445 ÷ (1 − 0.6362) ≈ 243,125", () => {
    expect(Math.round(bep)).toBe(243_125);
  });

  it("일 필요 객수 6.3명 (客單價 1,480 × 26일)", () => {
    expect(dailyNeed).toBe(6.3);
  });

  it("캐파 한계 6.6명/일 → BEP 달성 가능하나 여유 ~5% (경고 미발동)", () => {
    expect(maxDaily).toBe(6.6);
    expect(dailyNeed <= maxDaily).toBe(true);
  });

  it("130% 시나리오는 일 8.2객 필요 → 캐파 124% 초과", () => {
    const daily130 = calcDailyCustomers(bep * 1.3, mix.avgTicket, 26);
    expect(daily130).toBe(8.2);
    expect(daily130 > maxDaily).toBe(true);
    expect(Math.round((daily130 / maxDaily) * 100)).toBe(124);
  });
});

// ─── C-2.3 필수 케이스: 초기투자 + 월 고정비 + 권장 준비 자금 ─────────────────
describe("C-2.3 필수 케이스: 월세 4만·押金 2개월·頂讓 30만·裝潢 40만·설비 15만·재료비품 5만·예비비 10% + 직원 1명 32,000·수도광열 8,000·마케팅 5,000·기타 5,000·운전자금 6개월", () => {
  const initial = calcInitialInvestment({
    monthlyRent: 40_000,
    depositMonths: 2,
    transferFee: 300_000,
    interior: 400_000,
    equipment: 150_000,
    initialSupplies: 50_000,
    reservePct: 10,
  });
  const staff = calcStaffCost(1, 32_000);
  const fixed = 40_000 + staff.total + 8_000 + 5_000 + 5_000;

  it("카드① 초기 투자 총액 1,078,000 — 押金 80,000(반환성) / 소멸성 998,000 구분", () => {
    expect(initial.deposit).toBe(80_000);
    expect(initial.subtotal).toBe(980_000);
    expect(initial.reserve).toBe(98_000);
    expect(initial.total).toBe(1_078_000);
    expect(initial.total - initial.deposit).toBe(998_000); // 소멸성
  });

  it("카드② 월 고정비 96,445 — 인건비 실부담 38,445 (명목 32,000 + 고용주 6,445)", () => {
    expect(staff.total).toBe(38_445);
    expect(fixed).toBe(96_445);
  });

  it("카드③ 권장 준비 자금 = 1,078,000 + 96,445 × 6 = 1,656,670", () => {
    expect(calcPreparationFund(initial.total, fixed, 6)).toBe(1_656_670);
  });

  it("운전자금 0개월이면 준비 자금 = 초기 투자 총액", () => {
    expect(calcPreparationFund(initial.total, fixed, 0)).toBe(initial.total);
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

// ─── 화면 표기 가드 (눈검사 수정 사이클 1 / B) ───────────────────────────────
// 계산식이 Infinity 를 내는 것 자체는 의도된 신호값이다. 문제는 그 값이 화면에
// 그대로 나가는 것이었다 — 실제로 /tools/biz-simulator 에서 raw "Infinity" 가 노출됐다.
// BizSimulator 는 num() 으로 "—" 로 바꿔 내보낸다. 여기서는 그 계약을 고정한다.
describe("Infinity 신호값이 나오는 조건", () => {
  it("영업일수가 0이면 일 필요 객수는 계산 불가다", () => {
    expect(calcDailyCustomers(1_000_000, 1500, 0)).toBe(Infinity);
  });

  it("客單價가 0이어도 계산 불가다", () => {
    expect(calcDailyCustomers(1_000_000, 0, 26)).toBe(Infinity);
  });

  it("매출 자체가 Infinity(BEP 불가)면 전파된다", () => {
    expect(calcDailyCustomers(Infinity, 1500, 26)).toBe(Infinity);
  });

  it("정상 입력에서는 유한한 숫자를 낸다", () => {
    expect(Number.isFinite(calcDailyCustomers(1_000_000, 1500, 26))).toBe(true);
  });

  it("변동비율 100% 이상이면 BEP 는 계산 불가다", () => {
    expect(calcBep(500_000, 1)).toBe(Infinity);
    expect(calcBep(500_000, 1.2)).toBe(Infinity);
  });
});

describe("화면 표기 규약 — 계산 불가는 '—' 로 나가야 한다", () => {
  // BizSimulator.tsx 의 num() 과 동일한 규약
  const num = (v: number) => (Number.isFinite(v) ? String(v) : "—");

  it("Infinity 는 절대 화면 문자열이 되지 않는다", () => {
    expect(num(calcDailyCustomers(1_000_000, 1500, 0))).toBe("—");
    expect(num(calcDailyCustomers(1_000_000, 0, 26))).toBe("—");
    expect(num(calcBep(500_000, 1))).toBe("—");
    expect(num(calcMaxDailyCustomers(2, 3, 10, 0, 0.8))).toBe("—");
  });

  it("어떤 입력 조합에서도 'Infinity' 문자열이 새지 않는다", () => {
    const revenues = [0, 1, 1_000_000, Infinity, -5];
    const tickets = [0, 1500, -1];
    const days = [0, 1, 26, 31, -3];
    for (const r of revenues) for (const a of tickets) for (const d of days) {
      expect(num(calcDailyCustomers(r, a, d))).not.toContain("Infinity");
    }
  });

  it("정상값은 숫자 문자열 그대로 나간다", () => {
    expect(num(calcDailyCustomers(1_000_000, 1500, 26))).toMatch(/^\d+(\.\d+)?$/);
  });
});

describe("영업일수 입력 클램프", () => {
  // BizSimulator 의 onChange 와 동일한 규약: 1..31
  const clamp = (raw: number) => Math.min(31, Math.max(1, raw));

  it("0 을 넣어도 1 로 저장된다 — localStorage 에 0 이 굳는 것을 막는다", () => {
    expect(clamp(0)).toBe(1);
  });

  it("음수도 1 로 올라온다", () => {
    expect(clamp(-5)).toBe(1);
  });

  it("31 을 넘으면 31 로 잘린다", () => {
    expect(clamp(99)).toBe(31);
  });

  it("정상 범위는 그대로다", () => {
    expect(clamp(26)).toBe(26);
  });

  it("클램프된 값으로는 계산이 항상 유한하다", () => {
    for (const raw of [-5, 0, 1, 26, 99]) {
      expect(Number.isFinite(calcDailyCustomers(1_000_000, 1500, clamp(raw)))).toBe(true);
    }
  });
});

// ─── v25: 고용주 부담 — 제도별 분급표 + 官方 분담금액표 ──────────────────────
describe("calcEmployerBurden 경계값 (v25)", () => {
  it("기존 케이스 회귀 불변 — 월급 32,000", () => {
    const b = calcEmployerBurden(32_000);
    expect(b.labor).toBe(2_914);   // 33,300 급距, 官方 분담금액표
    expect(b.health).toBe(1_611);  // 33,300 × 5.17% × 60% × 1.56
    expect(b.pension).toBe(1_920);
    expect(b.total).toBe(6_445);
  });

  it("45,800 이하는 勞保·健保 표가 같아 결과가 갈리지 않는다", () => {
    for (const salary of [29_000, 30_000, 33_300, 40_000, 45_000, 45_800]) {
      expect(matchHealthBracket(salary)).toBe(matchInsuredBracket(salary));
    }
  });

  it("45,800 초과: 健保만 계속 올라가고 勞保는 상한에서 멈춘다", () => {
    const b = calcEmployerBurden(60_000);
    // 勞保는 45,800 에서 캡 → 官方 분담금액표 4,008
    expect(b.labor).toBe(4_008);
    // 健保는 60,800 급距 → 60,800 × 5.17% × 60% × 1.56
    expect(matchHealthBracket(60_000)).toBe(60_800);
    expect(b.health).toBe(Math.round(60_800 * 0.0517 * 0.6 * 1.56)); // 2,942
    // 고치기 전에는 45,800 기준 2,216 이었다 — 726 과소였다
    expect(b.health).toBeGreaterThan(2_216);
  });

  it("健保 상한 313,000 을 넘겨도 상한에서 멈춘다", () => {
    const b = calcEmployerBurden(500_000);
    expect(matchHealthBracket(500_000)).toBe(313_000);
    expect(b.health).toBe(Math.round(313_000 * 0.0517 * 0.6 * 1.56));
  });

  it("勞保 고용주분은 官方 분담금액표와 11급 전부 일치한다", () => {
    const OFFICIAL_EMPLOYER: [number, number][] = [
      [29_500, 2_582], [30_300, 2_651], [31_800, 2_783], [33_300, 2_914],
      [34_800, 3_045], [36_300, 3_176], [38_200, 3_342], [40_100, 3_509],
      [42_000, 3_675], [43_900, 3_841], [45_800, 4_008],
    ];
    for (const [bracket, expected] of OFFICIAL_EMPLOYER) {
      expect(calcEmployerBurden(bracket).labor).toBe(expected);
    }
  });

  it("단일 12.5% 산식이었으면 3곳이 어긋났다 — 표 조회로 바꾼 이유", () => {
    for (const bracket of [29_500, 38_200, 45_800]) {
      expect(Math.round(bracket * 0.125 * 0.7)).not.toBe(calcEmployerBurden(bracket).labor);
    }
  });

  it("인원 배수는 그대로 곱해진다", () => {
    const one = calcEmployerBurden(60_000);
    const staff = calcStaffCost(3, 60_000);
    expect(staff.perEmployee).toBe(60_000 + one.total);
    expect(staff.total).toBe((60_000 + one.total) * 3);
  });
});
