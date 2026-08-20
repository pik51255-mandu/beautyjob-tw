import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// ─── Core Users ───────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 미용업 역할
  userType: mysqlEnum("userType", ["salon_owner", "job_seeker", "unset"]).default("unset").notNull(),
  // 회원 身分 (자율 신고, 인증 없음) — 老闆專區 게이트용.
  // Phase 2: 사업자번호(統一編號) 인증 필드 추가 예정 자리.
  memberType: mysqlEnum("memberType", ["designer", "owner", "other"]),
  // 프로필 추가 정보
  phone: varchar("phone", { length: 30 }),
  city: varchar("city", { length: 50 }),         // 거주/사업 지역
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  passwordHash: text("passwordHash"),  // 이메일 로그인용 비밀번호 해시
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Job Posts (채용공고) ──────────────────────────────────────────────────────
export const jobPosts = mysqlTable("job_posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),            // users.id (salon_owner)
  title: varchar("title", { length: 200 }).notNull(),
  salonName: varchar("salonName", { length: 100 }).notNull(),
  jobType: mysqlEnum("jobType", [
    "designer",   // 設計師
    "intern",     // 助理/學徒
    "staff",      // 行政/助手
    "colorist",   // 染髮師
    "barber",     // 理髮師
    "manager",    // 店長
    "other",
  ]).notNull(),
  workType: mysqlEnum("workType", ["full_time", "part_time", "contract"]).notNull(),
  city: varchar("city", { length: 50 }).notNull(),
  district: varchar("district", { length: 50 }),
  address: text("address"),
  salaryType: mysqlEnum("salaryType", ["monthly", "hourly", "commission"]).notNull(),
  salaryMin: decimal("salaryMin", { precision: 10, scale: 0 }),  // NT$
  salaryMax: decimal("salaryMax", { precision: 10, scale: 0 }),  // NT$
  experienceRequired: mysqlEnum("experienceRequired", [
    "none", "1year", "2year", "3year", "5year", "10year"
  ]).default("none").notNull(),
  description: text("description").notNull(),
  benefits: text("benefits"),
  contactInfo: text("contactInfo"),
  isActive: boolean("isActive").default(true).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_job_city").on(table.city),
  index("idx_job_type").on(table.jobType),
  index("idx_job_active").on(table.isActive),
]);

export type JobPost = typeof jobPosts.$inferSelect;
export type InsertJobPost = typeof jobPosts.$inferInsert;

// ─── Resumes (이력서) ─────────────────────────────────────────────────────────
export const resumes = mysqlTable("resumes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),       // users.id (job_seeker)
  fullName: varchar("fullName", { length: 100 }).notNull(),
  jobType: mysqlEnum("jobType", [
    "designer", "intern", "staff", "colorist", "barber", "manager", "other"
  ]).notNull(),
  experienceYears: int("experienceYears").default(0).notNull(),
  currentCity: varchar("currentCity", { length: 50 }).notNull(),
  desiredCity: varchar("desiredCity", { length: 50 }),
  desiredSalaryMin: decimal("desiredSalaryMin", { precision: 10, scale: 0 }),
  desiredSalaryMax: decimal("desiredSalaryMax", { precision: 10, scale: 0 }),
  desiredWorkType: mysqlEnum("desiredWorkType", ["full_time", "part_time", "contract", "any"]).default("any"),
  skills: text("skills"),                         // JSON array of skill tags
  introduction: text("introduction").notNull(),
  portfolioUrl: text("portfolioUrl"),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_resume_city").on(table.currentCity),
  index("idx_resume_jobtype").on(table.jobType),
]);

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;

// ─── Community Posts (커뮤니티 게시판) ────────────────────────────────────────
export const communityPosts = mysqlTable("community_posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  category: mysqlEnum("category", [
    "general",      // 一般討論
    "technique",    // 技術分享
    "education",    // 教育訓練
    "news",         // 行業新聞
    "qa",           // 問答
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_community_category").on(table.category),
]);

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = typeof communityPosts.$inferInsert;

// ─── Comments (공통 댓글) ─────────────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  postType: mysqlEnum("postType", [
    "community", "salon_transfer", "used_item"
  ]).notNull(),
  postId: int("postId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_comment_post").on(table.postType, table.postId),
]);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ─── Salon Transfers (미용실 양도 게시판) ─────────────────────────────────────
export const salonTransfers = mysqlTable("salon_transfers", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  salonName: varchar("salonName", { length: 100 }),
  city: varchar("city", { length: 50 }).notNull(),
  district: varchar("district", { length: 50 }),
  address: text("address"),
  sizeM2: decimal("sizeM2", { precision: 8, scale: 2 }),   // 坪數 (평수)
  keyMoney: decimal("keyMoney", { precision: 12, scale: 0 }),   // 頂讓金 (권리금) NT$
  deposit: decimal("deposit", { precision: 12, scale: 0 }),     // 押金 (보증금) NT$
  monthlyRent: decimal("monthlyRent", { precision: 10, scale: 0 }), // 月租 (월세) NT$
  description: text("description").notNull(),
  contactInfo: text("contactInfo"),
  imageUrls: text("imageUrls"),   // JSON array
  isActive: boolean("isActive").default(true).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_transfer_city").on(table.city),
]);

export type SalonTransfer = typeof salonTransfers.$inferSelect;
export type InsertSalonTransfer = typeof salonTransfers.$inferInsert;

// ─── Used Items (중고거래 게시판) ─────────────────────────────────────────────
export const usedItems = mysqlTable("used_items", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  // D-1: 명시 목록만 허용 (shared/usedItemCatalog.ts와 동기 유지)
  category: mysqlEnum("category", [
    "chair",          // 美髮椅
    "mirror_station", // 鏡台
    "wash_bed",       // 洗頭床(沖水床)
    "dryer",          // 吹風機
    "iron",           // 電棒·離子夾
    "perm_machine",   // 燙髮機
    "steamer",        // 蒸氣機
    "clipper",        // 推剪
    "wash_basin",     // 洗髮槽
    "trolley",        // 美髮推車
    "scissors",       // 美髮剪刀
    "hood_heater",    // 烘罩·加熱器具
  ]).notNull(),
  condition: mysqlEnum("condition", ["new", "like_new", "good", "fair"]).notNull(),
  price: decimal("price", { precision: 10, scale: 0 }).notNull(),  // NT$
  city: varchar("city", { length: 50 }).notNull(),
  description: text("description").notNull(),
  imageUrls: text("imageUrls"),   // JSON array
  isSold: boolean("isSold").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_used_category").on(table.category),
  index("idx_used_city").on(table.city),
]);

export type UsedItem = typeof usedItems.$inferSelect;
export type InsertUsedItem = typeof usedItems.$inferInsert;

// ─── Favorites (즐겨찾기) ─────────────────────────────────────────────────────
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetType: mysqlEnum("targetType", [
    "job_post", "resume", "salon_transfer", "used_item"
  ]).notNull(),
  targetId: int("targetId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_fav_user").on(table.userId, table.targetType),
]);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
// ─── Reports (檢舉 신고) ──────────────────────────────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),         // users.id
  targetType: mysqlEnum("targetType", [
    "community", "salon_transfer", "used_item"
  ]).notNull(),
  targetId: int("targetId").notNull(),
  reason: mysqlEnum("reason", [
    "spam",         // 廣告/垃圾訊息
    "fraud",        // 詐騙/不實資訊
    "offensive",    // 不當言論/攻擊
    "illegal",      // 違法內容
    "other",
  ]).notNull(),
  detail: text("detail"),
  status: mysqlEnum("status", [
    "pending",      // 待處理
    "resolved",     // 已處理 (게시글 삭제 등)
    "dismissed",    // 駁回
  ]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_report_status").on(table.status),
  index("idx_report_target").on(table.targetType, table.targetId),
]);

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ─── Supply Stores (美材行 — 공공 오픈데이터 기반 디렉토리) ─────────────────────
// 회원 게시물이 아니라 정부 공개자료로 구축한 참조 데이터라 authorId 가 없다.
// 출처: 經濟部 商工行政資料開放平臺(업종·주소) + 高雄市政府 民政局 門牌坐標(좌표)
export const supplyStores = mysqlTable("supply_stores", {
  id: int("id").autoincrement().primaryKey(),
  // 統一編號 — 공공자료의 자연키. upsert 기준이라 unique.
  taxId: varchar("taxId", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  district: varchar("district", { length: 20 }).notNull(),
  lat: decimal("lat", { precision: 9, scale: 6 }).notNull(),
  lng: decimal("lng", { precision: 9, scale: 6 }).notNull(),
  // 1 = 웹 실측검증(已驗證) / 2 = 등기기반(登記資料)
  tier: int("tier").notNull(),
  phone: varchar("phone", { length: 40 }),
  note: text("note"),
  coordSource: varchar("coordSource", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_supply_district").on(table.district),
  index("idx_supply_tier").on(table.tier),
]);

export type SupplyStore = typeof supplyStores.$inferSelect;
export type InsertSupplyStore = typeof supplyStores.$inferInsert;

// ─── 高雄市 미용실 (公開資料 기반 참조 테이블) ────────────────────────────────
// 출처: 經濟部 商工行政資料開放平臺(업체·주소·설립일) + KCG 民政局 門牌坐標(좌표).
// 負責人(대표자) 성명은 적법성 판정에 따라 저장하지 않는다 — 컬럼 자체를 두지 않음.
// 공개 참조 데이터라 authorId 없음(supply_stores 와 동일 성격).
export const salons = mysqlTable("salons", {
  id: int("id").autoincrement().primaryKey(),
  // 統一編號 — 공공자료의 자연키. upsert 기준이라 unique.
  taxId: varchar("taxId", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  district: varchar("district", { length: 20 }).notNull(),
  // 門牌 조인 실패분(68건)은 좌표 null 로 남긴다 — 보간·중심점 대체 금지.
  lat: decimal("lat", { precision: 9, scale: 6 }),
  lng: decimal("lng", { precision: 9, scale: 6 }),
  // 設立日期(민국력)를 서기 연도로 변환해 저장.
  foundedYear: int("foundedYear"),
  // "문패" | "미매칭"
  geoAccuracy: varchar("geoAccuracy", { length: 20 }).notNull(),
  coordSource: varchar("coordSource", { length: 100 }),
  // 적재 시점에 사전 계산한 200m 내 주차장 최대 3곳. 런타임 지오 연산을 하지 않기 위함.
  parkingJson: text("parkingJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_salons_district").on(table.district),
]);

export type Salon = typeof salons.$inferSelect;
export type InsertSalon = typeof salons.$inferInsert;
