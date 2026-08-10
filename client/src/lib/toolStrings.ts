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

  // ─── 開店成本試算器 ───
  ocPageTitle: {
    zh: "美髮開店成本試算器｜押金・裝潢・損益兩平",
    ko: "미용실 창업비용 계산기｜보증금·인테리어·손익분기",
  },
  ocMetaDescription: {
    zh: "台灣美髮開店成本試算：初期投資、每月固定成本（含雇主勞健保・勞退負擔）、損益兩平營業額與回本期間，一次算清楚（2026 年費率）。",
    ko: "대만 미용실 창업비용 계산: 초기 투자, 월 고정비(고용주 노건보·노퇴 부담 포함), 손익분기 매출과 회수 기간까지 한 번에 (2026년 요율).",
  },
  ocHeading: { zh: "開店成本試算器", ko: "창업비용 계산기" },
  ocSubheading: {
    zh: "初期投資・每月固定成本・損益兩平，一次算清楚",
    ko: "초기 투자·월 고정비·손익분기를 한 번에 계산합니다",
  },

  // 섹션 A: 초기 투자
  ocSectionInitial: { zh: "A. 初期投資", ko: "A. 초기 투자" },
  ocDepositMonths: { zh: "押金（月租 × 幾個月）", ko: "보증금 (월세 × 개월수)" },
  ocMonthsUnit: { zh: "個月", ko: "개월" },
  ocDepositResult: { zh: "押金金額", ko: "보증금 금액" },
  ocTransferFee: { zh: "頂讓費（新開店請填 0）", ko: "권리금 (신규 창업이면 0)" },
  ocInterior: { zh: "裝潢費", ko: "인테리어 비용" },
  ocEquipment: { zh: "設備・儀器", ko: "설비·기기" },
  ocSupplies: { zh: "初期材料・備品", ko: "초기 재료·비품" },
  ocReserve: { zh: "預備金（小計的 %）", ko: "예비비 (소계의 %)" },
  ocInitialTotal: { zh: "初期投資總額（含預備金）", ko: "초기 투자 총액 (예비비 포함)" },

  // 섹션 B: 월 고정비
  ocSectionFixed: { zh: "B. 每月固定成本", ko: "B. 월 고정비" },
  ocRent: { zh: "月租（NT$）", ko: "월세 (NT$)" },
  ocStaffCount: { zh: "月薪制員工人數", ko: "월급제 직원 수" },
  ocStaffSalary: { zh: "每人月薪（NT$）", ko: "1인당 월급 (NT$)" },
  ocStaffBurdenTitle: { zh: "每人雇主負擔（自動加算）", ko: "1인당 고용주 부담 (자동 가산)" },
  ocBurdenLabor: { zh: "勞保雇主分（70%）", ko: "노보 고용주분 (70%)" },
  ocBurdenHealth: { zh: "健保雇主分（60% × 平均眷屬係數 1.56）", ko: "건보 고용주분 (60% × 평균 피부양 계수 1.56)" },
  ocBurdenPension: { zh: "勞退提繳（6%）", ko: "노퇴 적립 (6%)" },
  ocStaffTotalCost: { zh: "實際人事總負擔", ko: "실제 인건비 총부담" },
  ocUtilities: { zh: "水電・通訊（NT$）", ko: "수도광열·통신 (NT$)" },
  ocMarketing: { zh: "行銷費用（NT$）", ko: "마케팅 (NT$)" },
  ocOtherFixed: { zh: "其他固定成本（NT$）", ko: "기타 고정비 (NT$)" },
  ocFixedTotal: { zh: "每月固定成本合計", ko: "월 고정비 합계" },

  // 섹션 C: 시술 믹스 & 변동비
  ocSectionVariable: { zh: "C. 服務項目與變動成本", ko: "C. 시술 믹스·변동비" },
  ocCommissionRatio: { zh: "抽成制設計師平均抽成率（%）", ko: "커미션제 디자이너 평균 커미션율 (%)" },
  ocWorkDays: { zh: "每月營業日數", ko: "월 영업일수" },

  // 시술 테이블
  ocServiceName: { zh: "服務項目", ko: "시술명" },
  ocServicePrice: { zh: "單價（NT$）", ko: "단가 (NT$)" },
  ocServiceMaterial: { zh: "材料費率（%）", ko: "재료비율 (%)" },
  ocServiceShare: { zh: "來客比重（%）", ko: "손님 비중 (%)" },
  ocServiceMinutes: { zh: "所需時間（分）", ko: "소요시간 (분)" },
  ocServiceAdd: { zh: "＋新增服務項目", ko: "＋시술 행 추가" },
  ocServiceRemove: { zh: "刪除", ko: "삭제" },
  ocServiceHint: {
    zh: "燙髮若含下壓燙，建議另外新增一行（例：下壓燙 比重 10%）",
    ko: "다운펌 포함 시 별도 행 추가 권장 (예: 下壓燙 비중 10%)",
  },
  ocShareSumWarning: {
    zh: "來客比重合計不是 100%（目前 {sum}%）— 計算已按比例換算，建議按下方按鈕自動調整",
    ko: "손님 비중 합계가 100%가 아닙니다 (현재 {sum}%) — 계산은 비율로 환산했으며, 아래 버튼으로 자동 정규화를 권장합니다",
  },
  ocNormalizeShares: { zh: "自動調整為 100%", ko: "100%로 자동 정규화" },
  ocMixAvgTicket: { zh: "加權平均客單價", ko: "가중평균 객단가" },
  ocMixMaterialRate: { zh: "加權平均材料費率", ko: "가중평균 재료비율" },
  ocMixAvgMinutes: { zh: "加權平均所需時間", ko: "가중평균 소요시간" },
  ocMinutesUnit: { zh: "分", ko: "분" },

  // 수수료·변동비 경고
  ocCardFee: { zh: "刷卡・預約平台手續費（營業額的 %）", ko: "카드·예약앱 수수료 (매출의 %)" },
  ocVariableWarning: {
    zh: "變動成本率超過 95% — 幾乎沒有毛利空間，請重新檢視抽成率與材料費率",
    ko: "변동비율이 95%를 초과합니다 — 마진이 거의 없으니 커미션율·재료비율을 재검토하세요",
  },

  // 店販 (제품 판매)
  ocRetailToggle: { zh: "含店販（產品銷售）", ko: "店販(제품 판매) 포함" },
  ocRetailRevenue: { zh: "每月產品營業額預估（NT$）", ko: "월 제품매출 예상 (NT$)" },
  ocRetailCost: { zh: "產品成本率（%）", ko: "제품 원가율 (%)" },
  ocRetailIncentive: { zh: "銷售獎金率（%）", ko: "판매 인센티브율 (%)" },
  ocRetailContribution: { zh: "店販貢獻（加入月損益）", ko: "店販 기여 (월 손익에 가산)" },

  // 섹션 D: 캐파 체크
  ocSectionCapacity: { zh: "D. 產能檢查（人力・座位）", ko: "D. 캐파 체크 (인력·좌석)" },
  ocDesigners: { zh: "設計師人數", ko: "디자이너 수" },
  ocSeats: { zh: "席位（座位）數", ko: "席位(의자) 수" },
  ocDailyHours: { zh: "每日營業時間（小時）", ko: "일 영업시간 (시간)" },
  ocUtilization: { zh: "稼動率（%）", ko: "가동률 (%)" },
  ocMaxDaily: { zh: "每日最大可服務來客數", ko: "일 최대 처리 객수" },
  ocCapacityWarning: {
    zh: "以目前人力與座位，此損益兩平來客數實際上無法達成 — 需調整客單價、人力或成本結構",
    ko: "현재 인력·좌석으로는 이 손익분기 객수를 실제로 달성할 수 없습니다 — 객단가·인력·비용 구조 조정이 필요합니다",
  },
  ocScenarioDaily: { zh: "每日來客", ko: "일 객수" },
  ocScenarioCapacity: { zh: "產能占用", ko: "캐파 대비" },
  ocPaybackNote: {
    zh: "※ 回本計算不含押金（押金為可退還資產）",
    ko: "※ 회수 계산은 押金 제외 (押金은 반환 자산)",
  },

  // 결과
  ocResultTitle: { zh: "試算結果", ko: "계산 결과" },
  ocBepLabel: { zh: "損益兩平月營業額", ko: "손익분기 월매출" },
  ocBepImpossible: {
    zh: "變動成本率已達 100%，無法達到損益兩平 — 請調整抽成率或材料費率",
    ko: "변동비율이 100% 이상이라 손익분기가 불가능합니다 — 커미션율·재료비율을 조정하세요",
  },
  ocDailyCustomers: { zh: "每日所需來客數", ko: "일 필요 객수" },
  ocCustomersUnit: { zh: "位／日", ko: "명／일" },
  ocVariableRatio: { zh: "變動成本率", ko: "변동비율" },
  ocScenarioTitle: { zh: "情境分析（以損益兩平為基準）", ko: "시나리오 (손익분기 기준)" },
  ocScenarioRevenue: { zh: "月營業額", ko: "월매출" },
  ocScenarioProfit: { zh: "月損益", ko: "월 손익" },
  ocScenarioPayback: { zh: "初期投資回本", ko: "초기투자 회수" },
  ocPaybackMonths: { zh: "個月", ko: "개월" },
  ocPaybackNever: { zh: "無法回本", ko: "회수 불가" },

  // CTA
  ocCtaTransfers: { zh: "看店面頂讓物件", ko: "매장 양도 매물 보기" },
  ocCtaSalary: { zh: "薪水試算器", ko: "급여 계산기" },

  // 면책
  ocDisclaimer: {
    zh: "本試算僅供參考，未含職災保險・稅務・裝潢貸款利息，實際成本依個案而異",
    ko: "본 계산은 참고용이며 산재보험(職災保險)·세무·인테리어 대출이자는 포함하지 않습니다. 실제 비용은 개별 사례에 따라 다릅니다",
  },

  // 진입 카드 (開店成本)
  ocEntryTitle: { zh: "開店成本試算器", ko: "창업비용 계산기" },
  ocEntryDesc: {
    zh: "押金、裝潢、人事到損益兩平，開店前先算清楚",
    ko: "보증금·인테리어·인건비부터 손익분기까지, 창업 전 미리 계산",
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
