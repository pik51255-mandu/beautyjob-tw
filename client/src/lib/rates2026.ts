import { LABOR_INSURANCE_TABLE } from "./insuranceTables2026";

// 2026년(민국115년) 공고 기준 요율 상수 — 2026-08-10 웹 검증 완료값 (선후 제공).
// 요율·급距 변경 시 이 파일만 수정하면 시산기 전체에 반영된다.

// 최저임금
export const MIN_WAGE_MONTHLY = 29_500; // 月薪
export const MIN_WAGE_HOURLY = 196;     // 時薪

// 勞保 (就業保險 1% 포함)
// ⚠️ 官方은 이 12.5% 를 한 번에 곱하지 않는다. 普通事故 11.5% 와 就保 1% 를 각각
// 반올림해서 더한다 — 분담액은 LABOR_PREMIUM_TABLE(표 조회)이 정본이다.
// 이 상수는 요율 표기·근사 계산용으로만 남긴다.
export const LABOR_ORDINARY_RATE = 0.115;       // 普通事故 11.5% (自114.1.1)
export const EMPLOYMENT_INSURANCE_RATE = 0.01;  // 就業保險 1% (自92.1.1)
export const LABOR_INSURANCE_RATE = 0.125;      // 12.5% = 위 둘의 합
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
// 勞退 고용주 제교 6%. **곱하는 대상은 실급여가 아니라 月提繳分級表의 급距**다
// (勞工退休金條例 第14條第5項 — 「每月工資」를 분급표로 정한다). v26 에서 교정.
export const PENSION_EMPLOYER_RATE = 0.06;
// 제교 기준 상한. 실제 상한 적용은 勞退 月提繳分級表(62급, 최고 150,000)가 맡는다 —
// 급距 조회로 바뀐 뒤로 이 상수는 문서용이다.
export const PENSION_EMPLOYER_MAX_BASE = 150_000;
// 職災保險은 업종별 요율이 상이하여 미포함 — 시산기 면책에 명시

// 勞保 투보급距 분급표 — **官方 표(insuranceTables2026)에서 파생한다.**
// 예전에는 여기에 11개 값을 손으로 복사해 뒀는데, 그러면 官方 표를 고쳐도 계산은
// 안 따라오고(계산은 이쪽만 봤다) 官方 표가 망가져도 테스트가 못 잡는다.
// 실제로 v26 감사 중 官方 표 배열이 잘못된 값으로 오염됐는데 315개 테스트가 전부
// 통과했다 — 아무도 그 배열을 읽지 않았기 때문이다. 사본을 없애 그 구멍을 막는다.
export const INSURED_SALARY_BRACKETS: readonly number[] = LABOR_INSURANCE_TABLE.amounts;
