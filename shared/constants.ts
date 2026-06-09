// 大台灣城市列表
export const TW_CITIES = [
  "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
  "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
  "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "台東縣", "澎湖縣", "金門縣", "連江縣",
];

// 職種標籤
export const JOB_TYPE_LABELS: Record<string, string> = {
  designer: "設計師",
  intern: "助理/學徒",
  staff: "行政/助手",
  colorist: "染髮師",
  barber: "理髮師",
  manager: "店長",
  other: "其他",
};

// 工作型態
export const WORK_TYPE_LABELS: Record<string, string> = {
  full_time: "全職",
  part_time: "兼職",
  contract: "約聘",
};

// 薪資類型
export const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: "月薪",
  hourly: "時薪",
  commission: "抽成制",
};

// 經驗要求
export const EXPERIENCE_LABELS: Record<string, string> = {
  none: "不限",
  "1year": "1年以上",
  "2year": "2年以上",
  "3year": "3年以上",
  "5year": "5年以上",
  "10year": "10年以上",
};

// 社群分類
export const COMMUNITY_CATEGORY_LABELS: Record<string, string> = {
  general: "一般討論",
  technique: "技術分享",
  education: "教育訓練",
  news: "行業新聞",
  qa: "問答",
};

// 二手商品分類
export const USED_ITEM_CATEGORY_LABELS: Record<string, string> = {
  chair: "美髮椅",
  dryer: "吹風機/烘罩",
  washer: "洗頭台",
  scissors: "剪刀/工具",
  chemical: "藥水/材料",
  furniture: "家具/裝潢",
  other: "其他",
};

// 商品狀態
export const ITEM_CONDITION_LABELS: Record<string, string> = {
  new: "全新",
  like_new: "近全新",
  good: "良好",
  fair: "普通",
};

// 格式化 NT$ 金額
export function formatNTD(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "面議";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "面議";
  return `NT$ ${num.toLocaleString("zh-TW")}`;
}

// 薪資範圍顯示
export function formatSalaryRange(
  salaryType: string,
  salaryMin: string | null | undefined,
  salaryMax: string | null | undefined
): string {
  const typeLabel = SALARY_TYPE_LABELS[salaryType] ?? salaryType;
  if (!salaryMin && !salaryMax) return `${typeLabel}：面議`;
  if (salaryMin && salaryMax) {
    return `${typeLabel} NT$${Number(salaryMin).toLocaleString("zh-TW")} ~ NT$${Number(salaryMax).toLocaleString("zh-TW")}`;
  }
  if (salaryMin) return `${typeLabel} NT$${Number(salaryMin).toLocaleString("zh-TW")} 起`;
  return `${typeLabel} NT$${Number(salaryMax).toLocaleString("zh-TW")} 以下`;
}
