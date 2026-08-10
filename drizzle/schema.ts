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
  category: mysqlEnum("category", [
    "chair",        // 美髮椅
    "dryer",        // 吹風機/烘罩
    "washer",       // 洗頭台
    "scissors",     // 剪刀/工具
    "chemical",     // 藥水/材料
    "furniture",    // 家具/裝潢
    "other",
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
