// 2026년(민국115년) 공고 기준 요율 상수 — 2026-08-10 웹 검증 완료값 (선후 제공).
// 요율·급距 변경 시 이 파일만 수정하면 시산기 전체에 반영된다.

// 최저임금
export const MIN_WAGE_MONTHLY = 29_500; // 月薪
export const MIN_WAGE_HOURLY = 196;     // 時薪

// 勞保 (就業保險 1% 포함)
export const LABOR_INSURANCE_RATE = 0.125;      // 12.5%
export const LABOR_INSURANCE_EMPLOYEE_SHARE = 0.2; // 본인부담 20%
export const LABOR_INSURANCE_MAX = 45_800;      // 투보급距 상한

// 健保
export const HEALTH_INSURANCE_RATE = 0.0517;    // 5.17%
export const HEALTH_INSURANCE_EMPLOYEE_SHARE = 0.3; // 본인부담 30%
export const HEALTH_INSURANCE_MAX = 313_000;    // 급距 상한
// 권속(眷屬) 1인당 본인 보험료와 동액 가산 (기본 0인)

// 勞退 — 고용주 6%는 급여에서 공제되지 않음(별도 적립).
// 본인 자발적 제출(自提) 0~6%만 급여 공제 대상.
export const PENSION_SELF_MAX_BASE = 150_000;   // 自提 기준 상한
export const PENSION_SELF_RATE_MAX = 0.06;

// ─── 고용주 부담 (開店成本試算器용, 2026-08-10 검증값) ───────────────────────
export const LABOR_INSURANCE_EMPLOYER_SHARE = 0.7;   // 勞保 고용주부담 70%
export const HEALTH_INSURANCE_EMPLOYER_SHARE = 0.6;  // 健保 고용주부담 60%
export const HEALTH_INSURANCE_AVG_DEPENDENTS_FACTOR = 1.56; // 평균 권속 0.56인 포함 계수
export const PENSION_EMPLOYER_RATE = 0.06;           // 勞退 고용주 제교 6% (실급여 기준)
export const PENSION_EMPLOYER_MAX_BASE = 150_000;    // 제교 기준 상한
// 職災保險은 업종별 요율이 상이하여 미포함 — 시산기 면책에 명시

// 勞保 투보급距 분급표 (2026, 최저 29,500 ~ 최고 45,800).
// 급距 사이의 실급여는 "상위 급距"를 적용한다 (예: 35,000 → 36,300).
export const INSURED_SALARY_BRACKETS: number[] = [
  29_500,
  30_300,
  31_800,
  33_300,
  34_800,
  36_300,
  38_200,
  40_100,
  42_000,
  43_900,
  45_800,
];
