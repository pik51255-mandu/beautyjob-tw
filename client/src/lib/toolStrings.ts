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
  // 실제 적용되는 급距를 셀렉트 밖에 따로 보여준다 — 트리거 글자와 계산 기준이
  // 어긋나 보이던 문제(2026-08-22)를 눈으로 대조할 수 있게 하는 줄이다.
  insuredApplied: { zh: "實際套用投保薪資：", ko: "실제 적용 투보급여:" },
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
    zh: "美髮開店成本試算器｜押金・裝潢・每月固定成本",
    ko: "미용실 창업비용 계산기｜보증금·인테리어·월 고정비",
  },
  ocMetaDescription: {
    zh: "台灣美髮開店成本試算：初期投資（押金・頂讓費・裝潢・設備）與每月固定成本（含雇主勞健保・勞退負擔）、建議準備資金，開店前一次算清楚（2026 年費率）。",
    ko: "대만 미용실 창업비용 계산: 초기 투자(보증금·권리금·인테리어·설비)와 월 고정비(고용주 노건보·노퇴 부담 포함), 권장 준비 자금까지 창업 전 한 번에 (2026년 요율).",
  },
  ocHeading: { zh: "開店成本試算器", ko: "창업비용 계산기" },
  ocSubheading: {
    zh: "初期投資與每月固定成本，開店前先算清楚",
    ko: "초기 투자와 월 고정비를 창업 전에 미리 계산합니다",
  },

  // 출력 카드 (C-2.3)
  ocDepositRefundNote: {
    zh: "其中押金 NT$ {amount} 為可退還項目",
    ko: "이 중 보증금 NT$ {amount}은 반환 가능 항목입니다",
  },
  ocNonRefundable: { zh: "非退還性投資", ko: "소멸성 투자" },
  ocRefundable: { zh: "可退還（押金）", ko: "반환성 (보증금)" },
  ocPrepFundTitle: { zh: "建議準備資金", ko: "권장 준비 자금" },
  ocWorkingCapMonths: { zh: "週轉金月數", ko: "운전자금 개월수" },
  ocPrepFundNote: {
    zh: "建議另備 {n} 個月固定支出作為週轉金",
    ko: "고정지출 {n}개월분을 운전자금으로 별도 준비하길 권장합니다",
  },
  ocPrepFundFormula: {
    zh: "初期投資總額 ＋ 每月固定成本 × {n} 個月",
    ko: "초기 투자 총액 ＋ 월 고정비 × {n}개월",
  },
  ocBurdenDetailToggle: { zh: "查看雇主負擔明細", ko: "고용주 부담 내역 보기" },

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
  ocSeats: { zh: "席位（座位）數", ko: "좌석 수" },
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
    ko: "※ 회수 계산은 보증금 제외 (보증금은 반환 자산)",
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

  // ─── /tools 허브 ───
  hubPageTitle: {
    zh: "美髮工具箱｜薪水・開店成本試算",
    ko: "미용 도구함｜급여·창업비용 계산",
  },
  hubMetaDescription: {
    zh: "台灣美髮人專用工具箱：薪水試算器、開店成本試算器，以及老闆專區的經營工具（2026 年費率）。",
    ko: "대만 미용인 전용 도구함: 급여 계산기, 창업비용 계산기, 그리고 사장님 전용 경영 도구 (2026년 요율).",
  },
  hubHeading: { zh: "美髮工具箱", ko: "미용 도구함" },
  hubSubheading: {
    zh: "薪水、開店成本到經營模擬，美髮人專用計算工具",
    ko: "급여·창업비용부터 경영 시뮬레이션까지, 미용인 전용 계산 도구",
  },
  hubSectionDesigner: { zh: "設計師工具", ko: "디자이너 도구" },
  hubSectionOwner: { zh: "老闆專區", ko: "사장님 전용" },
  hubOwnerDesc: {
    zh: "以店家（老闆）身分登入後即可使用的經營工具",
    ko: "매장(사장님) 신분으로 로그인하면 사용할 수 있는 경영 도구",
  },
  hubComingSoon: { zh: "準備中", ko: "준비 중" },
  hubProductCostTitle: { zh: "藥水成本計算器", ko: "약값(시술 원가) 계산기" },
  hubProductCostDesc: {
    zh: "染燙藥水用量與每次施術的材料成本，一瓶到底能做幾次",
    ko: "염색·펌 약제 사용량과 시술 1회당 재료 원가, 한 통으로 몇 번 가능한지",
  },
  hubBizSimTitle: { zh: "經營損益模擬器", ko: "경영 손익 시뮬레이터" },
  hubBizSimDesc: {
    zh: "服務組合、人力與產能，模擬每月損益與損益兩平",
    ko: "시술 믹스·인력·캐파로 월 손익과 손익분기를 시뮬레이션",
  },
  hubEntryTitle: { zh: "美髮工具箱", ko: "미용 도구함" },
  hubEntryDesc: {
    zh: "薪水試算、開店成本、老闆經營工具一次收齊",
    ko: "급여·창업비용·사장님 경영 도구를 한곳에",
  },

  // ─── 藥水成本計算器 (C-3) ───
  pcPageTitle: {
    zh: "藥水成本計算器｜染燙材料成本・材料率",
    ko: "약값 계산기｜염색·펌 재료 원가·재료율",
  },
  pcMetaDescription: {
    zh: "美髮沙龍藥水成本計算：染膏、雙氧乳、燙髮劑每次施術的材料成本與材料率，並可按月比對預估與實際支出。",
    ko: "미용실 약값 계산: 염모제·산화제·펌제의 시술 1회당 재료 원가와 재료율, 월별 예상 vs 실제 지출 비교까지.",
  },
  pcHeading: { zh: "藥水成本計算器", ko: "약값 계산기" },
  pcSubheading: {
    zh: "每次施術的藥水成本與材料率，再按月驗證實際支出",
    ko: "시술 1회당 약값 원가·재료율 계산 + 월간 실지출 검증",
  },

  // 섹션 A1: 약제
  pcSectionChemicals: { zh: "A. 藥劑清單", ko: "A. 약제 목록" },
  pcChemName: { zh: "藥劑名稱", ko: "약제명" },
  pcChemPrice: { zh: "購入價（NT$）", ko: "구매가 (NT$)" },
  pcChemTotal: { zh: "總容量（g／ml／支）", ko: "총용량 (g/ml/개)" },
  pcChemUsage: { zh: "每次用量", ko: "1회 사용량" },
  pcChemCostPerUse: { zh: "每次成本", ko: "1회당 원가" },
  pcChemAdd: { zh: "＋新增藥劑", ko: "＋약제 추가" },

  // 섹션 A2: 시술
  pcSectionTreatments: { zh: "B. 施術定義", ko: "B. 시술 정의" },
  pcTreatName: { zh: "施術名稱", ko: "시술명" },
  pcTreatPrice: { zh: "施術價（NT$)", ko: "시술가 (NT$)" },
  pcTreatChemicals: { zh: "使用藥劑（可調整倍數）", ko: "사용 약제 (배수 조정 가능)" },
  pcTreatAdd: { zh: "＋新增施術", ko: "＋시술 추가" },
  pcTreatCost: { zh: "每次藥水成本", ko: "1회당 약값 원가" },
  pcTreatRate: { zh: "材料率", ko: "재료율" },
  pcMultiplier: { zh: "倍數", ko: "배수" },
  pcRemove: { zh: "刪除", ko: "삭제" },

  // 결과 카드
  pcResultTitle: { zh: "施術別材料率", ko: "시술별 재료율" },
  pcSalaryRefNote: {
    zh: "此材料率可作為薪水試算器『材料費』欄位的參考值",
    ko: "이 재료율은 급여 계산기의 '재료비' 입력 참고값으로 쓸 수 있습니다",
  },
  pcSalaryRefCta: { zh: "前往薪水試算器", ko: "급여 계산기로" },

  // 섹션 C: 월간 검증
  pcSectionMonthly: { zh: "C. 每月驗證（預估 vs 實際）", ko: "C. 월간 검증 (예측 vs 실제)" },
  pcMonthLabel: { zh: "月份", ko: "월 선택" },
  pcMonthlyCount: { zh: "本月施術件數", ko: "월 시술 건수" },
  pcCountUnit: { zh: "件", ko: "건" },
  pcExpectedLabel: { zh: "預估本月藥水支出", ko: "예상 월 약값" },
  pcActualLabel: { zh: "實際本月藥水支出（NT$）", ko: "실제 월 약값 지출 (NT$)" },
  pcDiffLabel: { zh: "差異", ko: "차이" },
  pcMonthlyWarn: {
    zh: "實際藥水支出高於預估，可能存在過量使用、庫存損耗或漏記施術",
    ko: "실제 약값 지출이 예상보다 높습니다 — 과다 사용·재고 손실·시술 기록 누락 가능성이 있습니다",
  },
  pcSaveRecord: { zh: "儲存本月紀錄", ko: "이번 달 기록 저장" },
  pcRecordSaved: { zh: "紀錄已儲存", ko: "기록이 저장되었습니다" },
  pcSavedRecords: { zh: "已儲存的月份紀錄", ko: "저장된 월별 기록" },
  pcNoRecords: { zh: "尚無紀錄", ko: "저장된 기록이 없습니다" },
  pcDeleteRecord: { zh: "刪除", ko: "삭제" },

  // ─── 經營損益模擬器 (C-4) — 대부분 oc* 키 재사용, 고유분만 추가 ───
  bsPageTitle: {
    zh: "經營損益模擬器｜服務組合・損益兩平・產能",
    ko: "경영 손익 시뮬레이터｜시술 믹스·손익분기·캐파",
  },
  bsMetaDescription: {
    zh: "美髮沙龍經營模擬：服務組合、抽成與手續費、人力產能，計算損益兩平營業額與情境損益（2026 年費率）。",
    ko: "미용실 경영 시뮬레이션: 시술 믹스·커미션·수수료·인력 캐파로 손익분기 매출과 시나리오 손익 계산 (2026년 요율).",
  },
  bsSubheading: {
    zh: "服務組合 × 成本結構 × 產能，模擬每月損益兩平",
    ko: "시술 믹스 × 비용 구조 × 캐파로 월 손익분기를 시뮬레이션",
  },
  bsSectionMix: { zh: "A. 服務組合", ko: "A. 시술 믹스" },
  bsSectionFixed: { zh: "B. 每月固定成本", ko: "B. 월 고정비" },
  bsSectionVariable: { zh: "C. 變動成本結構", ko: "C. 변동비 구조" },
  bsSectionCapacity: { zh: "D. 產能（人力・座位）", ko: "D. 캐파 (인력·좌석)" },
  bsImportFromProductCost: { zh: "從藥水成本計算器匯入", ko: "약값 계산기에서 가져오기" },
  bsImportFromOpeningCost: { zh: "從開店成本試算器匯入", ko: "창업비용 계산기에서 가져오기" },
  bsImportDone: { zh: "已匯入", ko: "가져왔습니다" },
  bsNoImportData: {
    zh: "尚無可匯入的資料 — 請先使用該計算器",
    ko: "가져올 데이터가 없습니다 — 해당 계산기를 먼저 사용해 주세요",
  },
  bsImportHintMix: {
    zh: "匯入後請填寫各服務的來客比重與所需時間",
    ko: "가져온 뒤 각 시술의 손님 비중·소요시간을 입력하세요",
  },
  bsFixedLabel: { zh: "每月固定成本（NT$，含雇主負擔）", ko: "월 고정비 (NT$, 고용주 부담 포함)" },
  bsWorkDaysLabel: { zh: "每月營業日數", ko: "월 영업일수" },

  // ─── 老闆專區 게이트 ───
  gateLoginTitle: { zh: "請先登入", ko: "로그인이 필요합니다" },
  gateLoginDesc: {
    zh: "老闆專區工具需要登入後才能使用",
    ko: "사장님 전용 도구는 로그인 후 사용할 수 있습니다",
  },
  gateLoginCta: { zh: "登入 / 註冊", ko: "로그인 / 회원가입" },
  gatePromptTitle: { zh: "老闆專區", ko: "사장님 전용 구역" },
  gatePromptDesc: {
    zh: "此工具為店家（老闆）專用。要以店家（老闆）身分使用此工具嗎？您的會員身分將更新為「老闆」。",
    ko: "이 도구는 매장(사장님) 전용입니다. 매장(사장님) 신분으로 이 도구를 사용할까요? 회원 신분이 '사장님'으로 변경됩니다.",
  },
  gatePromptCta: { zh: "以店家（老闆）身分使用此工具", ko: "매장(사장님) 신분으로 사용하기" },
  gatePromptCancel: { zh: "返回工具箱", ko: "도구함으로 돌아가기" },
  gateSwitching: { zh: "切換中…", ko: "전환 중…" },
  gateSwitchDone: { zh: "已切換為老闆身分", ko: "사장님 신분으로 전환되었습니다" },
  gateSwitchFail: { zh: "切換失敗，請稍後再試", ko: "전환에 실패했습니다. 잠시 후 다시 시도해 주세요" },

  // 老闆 도구 準備中 페이지
  ownerToolComingSoon: {
    zh: "此工具正在開發中，即將開放",
    ko: "이 도구는 개발 중이며 곧 오픈합니다",
  },
  ownerToolBack: { zh: "返回工具箱", ko: "도구함으로" },

  // 身分 (memberType)
  memberTypeLabel: { zh: "會員身分", ko: "회원 신분" },
  memberTypeDesigner: { zh: "設計師 / 助理", ko: "디자이너 / 어시스턴트" },
  memberTypeOwner: { zh: "店家（老闆）", ko: "매장 (사장님)" },
  memberTypeOther: { zh: "其他", ko: "기타" },
  memberTypeUnset: { zh: "未設定", ko: "미설정" },
  memberTypeNote: {
    zh: "自我申報，之後可於我的頁面變更（未來將提供統一編號認證）",
    ko: "자율 신고이며 마이페이지에서 변경 가능 (추후 사업자번호 인증 예정)",
  },
  memberTypeSaved: { zh: "會員身分已更新", ko: "회원 신분이 변경되었습니다" },

  // 진입 카드 (홈·薪資情報)
  entryCardTitle: { zh: "薪水試算器", ko: "급여 계산기" },
  entryCardDesc: {
    zh: "輸入業績與抽成率，馬上算出勞健保扣除後的實領金額",
    ko: "업적·커미션율 입력만으로 노보·건보 공제 후 실수령액 계산",
  },
  entryCardCta: { zh: "立即試算", ko: "지금 계산하기" },
  // ─── 染髮調配計算機 (/tools/color-mix) ─────────────────────────────────────
  cmPageTitle: { zh: "染髮調配計算機｜雙氧乳度數・底色・分量換算", ko: "염색 조제 계산기" },
  cmMetaDescription: {
    zh: "輸入現在底色與目標色，計算需要的提升度數與雙氧乳濃度（%），預測會露出的底色，並換算染膏與雙氧乳分量。調配比例請依產品包裝標示輸入。",
    ko: "현재 베이스와 목표색을 넣으면 필요 리프트·雙氧乳 농도(%)·底色·분량을 계산합니다.",
  },
  cmHeading: { zh: "染髮調配計算機", ko: "염색 조제 계산기" },
  cmSubheading: {
    zh: "算提升度數與分量，不猜品牌比例",
    ko: "리프트와 분량을 계산합니다. 배합비는 추측하지 않습니다",
  },
  cmSectionInput: { zh: "輸入條件", ko: "조건 입력" },
  cmBaseLevel: { zh: "現在底色（度）", ko: "현재 베이스(度)" },
  cmTargetLevel: { zh: "目標色（度）", ko: "목표색(度)" },
  cmTone: { zh: "色調系列", ko: "색조 계열" },
  cmGrey: { zh: "白髮比例", ko: "새치 비율" },
  cmLength: { zh: "髮長", ko: "모발 길이" },
  cmVolume: { zh: "髮量", ko: "모량" },
  cmRatio: { zh: "調配比例（染膏 1 : 雙氧乳 ?）", ko: "배합비(染膏 1 : 雙氧乳 ?)" },
  cmRatioHint: { zh: "請依產品包裝標示", ko: "제품 포장 표기를 따르세요" },
  cmTubeG: { zh: "一條染膏容量（g）", ko: "튜브 용량(g)" },
  cmSectionLift: { zh: "提升度數診斷", ko: "리프트 진단" },
  cmLiftNeeded: { zh: "需要提升", ko: "필요 리프트" },
  cmRecommendVol: { zh: "建議雙氧乳", ko: "권장 雙氧乳" },
  cmDegree: { zh: "度", ko: "度" },
  cmBleachWarn: { zh: "單靠染髮不足，需先漂髮", ko: "염색만으로 부족 — 탈색 선행 필요" },
  cmVolUsed: { zh: "實際使用的雙氧乳濃度", ko: "실제 사용할 雙氧乳 농도" },
  cmVolAuto: { zh: "依建議", ko: "권장값" },
  cmSectionUndertone: { zh: "底色預測", ko: "底色 예측" },
  cmUndertoneAt: { zh: "此度數會露出的底色", ko: "이 도수에서 드러날 底色" },
  cmSectionAmount: { zh: "分量換算", ko: "분량 환산" },
  cmCream: { zh: "染膏", ko: "染膏" },
  cmDeveloper: { zh: "雙氧乳", ko: "雙氧乳" },
  cmTubes: { zh: "需要染膏條數", ko: "필요 튜브 수" },
  cmVolumeNote: {
    zh: "調配比例是體積(ml)比，不是重量(g)比",
    ko: "배합비는 체적(ml)비이지 중량(g)비가 아닙니다",
  },
  cmSectionRails: { zh: "注意事項", ko: "주의 사항" },
  cmReadMore: { zh: "延伸閱讀", ko: "더 읽기" },
  cmDisclaimer: {
    zh: "本工具為換算參考。實際比例、時間依各品牌說明書為準，並請先做撮取測試（strand test）。",
    ko: "환산 참고용입니다. 실제 비율·시간은 제품 설명서를 따르고 스트랜드 테스트를 먼저 하세요.",
  },
  cmEntryTitle: { zh: "染髮調配計算機", ko: "염색 조제 계산기" },
  cmEntryDesc: {
    zh: "底色到目標色要幾度？雙氧乳要選幾 %？分量算給你",
    ko: "리프트·雙氧乳·분량을 계산합니다",
  },

} as const;

export type ToolStringKey = keyof typeof toolStrings;

export function makeT(lang: ToolLang) {
  return (key: ToolStringKey): string => toolStrings[key][lang];
}

// URL ?lang=ko 일 때만 한국어 (QA용). 그 외 전부 zh-TW.
export function detectToolLang(search: string): ToolLang {
  return new URLSearchParams(search).get("lang") === "ko" ? "ko" : "zh";
}
