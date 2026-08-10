// 시산기 UI 문자열 — 전부 이 파일에 { ko, zh } 병기. 컴포넌트 내 하드코딩 금지.
// 기본 언어 zh-TW, ?lang=ko 일 때만 한국어 (QA용, SEO 미노출).

export type ToolLang = "zh" | "ko";

export const toolStrings = {
  pageTitle: {
    zh: "美髮設計師薪水試算器｜抽成・勞健保",
    ko: "미용 디자이너 급여 계산기｜커미션·노보·건보",
  },
  metaDescription: {
    zh: "台灣美髮設計師・助理專用薪水試算器。輸入業績與抽成率，自動計算勞保、健保、勞退自提與實領金額（2026年費率）。",
    ko: "대만 미용 디자이너·어시스턴트 전용 급여 계산기. 업적·커미션 입력 시 노보·건보·노퇴 공제와 실수령액 자동 계산 (2026년 요율).",
  },
  heading: { zh: "薪水試算器", ko: "급여 계산기" },
  subheading: {
    zh: "2026 年費率｜輸入您的條件，估算每月實領金額",
    ko: "2026년 요율｜조건을 입력하면 월 실수령액을 추정합니다",
  },

  // 모드
  modeDesigner: { zh: "設計師", ko: "디자이너" },
  modeAssistant: { zh: "助理", ko: "어시스턴트" },

  // 급여 구조
  structureLabel: { zh: "薪資結構", ko: "급여 구조" },
  structPureCommission: { zh: "純抽成", ko: "순수 커미션" },
  structBasePlus: { zh: "底薪＋抽成", ko: "기본급＋커미션" },
  structTiered: { zh: "業績級距制", ko: "업적 구간제" },

  // 입력
  performance: { zh: "本月業績（NT$）", ko: "이달 업적 (NT$)" },
  commissionRate: { zh: "抽成率（%）", ko: "커미션율 (%)" },
  baseSalary: { zh: "底薪（NT$）", ko: "기본급 (NT$)" },
  materialRate: { zh: "材料費負擔率（%，從業績先扣除）", ko: "재료비 부담률 (%, 업적에서 선공제)" },
  designationFee: { zh: "指定費等其他收入（NT$）", ko: "지명비 등 기타 수입 (NT$)" },
  assistantSalary: { zh: "月薪（NT$）", ko: "월급 (NT$)" },
  assistantAllowance: { zh: "津貼・獎金（NT$）", ko: "수당·보너스 (NT$)" },

  // 級距制
  tierFrom: { zh: "業績門檻（超過此金額適用）", ko: "업적 기준 (초과분에 적용)" },
  tierRate: { zh: "抽成率（%）", ko: "커미션율 (%)" },
  tierAdd: { zh: "＋新增級距", ko: "＋구간 추가" },
  tierRemove: { zh: "刪除", ko: "삭제" },
  tierHint: {
    zh: "各級距僅適用於「超過門檻的部分」（累進計算）",
    ko: "각 구간 요율은 '기준 초과분'에만 적용됩니다 (누진 계산)",
  },

  // 投保薪資
  insuredLabel: { zh: "投保薪資（自動對應級距，可手動調整）", ko: "투보급여 (자동 매칭, 수동 조정 가능)" },
  insuredAuto: { zh: "自動對應", ko: "자동 매칭" },
  insuredWarning: {
    zh: "投保薪資低於實際薪資屬高薪低報，將影響您的勞保給付與退休金",
    ko: "투보급여를 실제 급여보다 낮게 신고하는 것은 고신저보(高薪低報)로, 노보 급여와 퇴직금에 불이익이 생깁니다",
  },

  // 공제 옵션
  dependents: { zh: "健保眷屬人數", ko: "건보 피부양 가족 수" },
  pensionSelfRate: { zh: "勞退自提（0～6%，雇主 6% 不從薪資扣除）", ko: "노퇴 자기부담 (0~6%, 고용주 6%는 급여에서 공제 안 됨)" },

  // 결과
  resultTitle: { zh: "試算結果", ko: "계산 결과" },
  grossLabel: { zh: "薪資總額", ko: "총급여" },
  laborLabel: { zh: "勞保（含就業保險，本人 20%）", ko: "노보 (취업보험 포함, 본인 20%)" },
  healthLabel: { zh: "健保（本人 30%）", ko: "건보 (본인 30%)" },
  healthDependents: { zh: "含眷屬", ko: "피부양 포함" },
  pensionLabel: { zh: "勞退自提", ko: "노퇴 자기부담" },
  deductionTotal: { zh: "扣除合計", ko: "공제 합계" },
  netLabel: { zh: "實領估算", ko: "실수령 추정" },
  perMonth: { zh: "／月", ko: "／월" },
  saveImage: { zh: "儲存結果圖片", ko: "결과 이미지 저장" },

  // 면책
  disclaimer: {
    zh: "本試算僅供參考，未含補充保費與所得稅，實際金額以勞保局・健保署公告及公司計算為準",
    ko: "본 계산은 참고용이며 보충보험료(補充保費)와 소득세는 포함하지 않습니다. 실제 금액은 노보국·건보서 공고 및 회사 계산 기준입니다",
  },
  ratesNote: {
    zh: "費率基準：2026 年（民國 115 年）公告。最低工資 29,500／勞保 12.5%／健保 5.17%",
    ko: "요율 기준: 2026년(민국 115년) 공고. 최저임금 29,500／노보 12.5%／건보 5.17%",
  },

  // 진입 카드 (홈·薪資情報)
  entryCardTitle: { zh: "薪水試算器", ko: "급여 계산기" },
  entryCardDesc: {
    zh: "輸入業績與抽成率，馬上算出勞健保扣除後的實領金額",
    ko: "업적·커미션율 입력만으로 노보·건보 공제 후 실수령액 계산",
  },
  entryCardCta: { zh: "立即試算", ko: "지금 계산하기" },
} as const;

export type ToolStringKey = keyof typeof toolStrings;

export function makeT(lang: ToolLang) {
  return (key: ToolStringKey): string => toolStrings[key][lang];
}

// URL ?lang=ko 일 때만 한국어 (QA용). 그 외 전부 zh-TW.
export function detectToolLang(search: string): ToolLang {
  return new URLSearchParams(search).get("lang") === "ko" ? "ko" : "zh";
}
