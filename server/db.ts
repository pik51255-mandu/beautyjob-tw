import {
  and, desc, eq, gte, lte, or, sql
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  comments,
  communityPosts,
  favorites,
  jobPosts,
  reports,
  resumes,
  salonTransfers,
  salons,
  supplyStores,
  usedItems,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildDbConfig } from "./dbUrl";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // 보안 감사 #12: URL 문자열 대신 ssl 명시 설정으로 접속한다.
      _db = drizzle({ connection: buildDbConfig(process.env.DATABASE_URL) });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.memberType !== undefined) {
    values.memberType = user.memberType ?? null;
    updateSet.memberType = user.memberType ?? null;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  data: {
    userType?: "salon_owner" | "job_seeker";
    memberType?: "designer" | "owner" | "other";
    phone?: string;
    city?: string;
    bio?: string;
    name?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ─── Job Posts ────────────────────────────────────────────────────────────────
export async function getJobPosts(filters: {
  city?: string;
  jobType?: string;
  workType?: string;
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(jobPosts.isActive, true)];
  if (filters.city) conditions.push(eq(jobPosts.city, filters.city));
  if (filters.jobType) conditions.push(eq(jobPosts.jobType, filters.jobType as any));
  if (filters.workType) conditions.push(eq(jobPosts.workType, filters.workType as any));
  if (filters.salaryMin) conditions.push(gte(jobPosts.salaryMin, String(filters.salaryMin)));
  if (filters.salaryMax) conditions.push(lte(jobPosts.salaryMax, String(filters.salaryMax)));

  const where = and(...conditions);
  const [posts, countResult] = await Promise.all([
    db.select().from(jobPosts).where(where).orderBy(desc(jobPosts.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(jobPosts).where(where),
  ]);

  return { posts, total: Number(countResult[0]?.count ?? 0) };
}

export async function getJobPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(jobPosts).where(eq(jobPosts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createJobPost(data: typeof jobPosts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(jobPosts).values(data);
  return result[0];
}

export async function updateJobPost(id: number, authorId: number, data: Partial<typeof jobPosts.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobPosts).set(data).where(and(eq(jobPosts.id, id), eq(jobPosts.authorId, authorId)));
}

export async function deleteJobPost(id: number, authorId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobPosts).set({ isActive: false }).where(and(eq(jobPosts.id, id), eq(jobPosts.authorId, authorId)));
}

export async function incrementJobViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobPosts).set({ viewCount: sql`${jobPosts.viewCount} + 1` }).where(eq(jobPosts.id, id));
}

export async function getJobPostsByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobPosts).where(eq(jobPosts.authorId, authorId)).orderBy(desc(jobPosts.createdAt));
}

// ─── Resumes ──────────────────────────────────────────────────────────────────
export async function getResumes(filters: {
  city?: string;
  jobType?: string;
  workType?: string;
  page?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { resumes: [], total: 0 };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(resumes.isPublic, true)];
  if (filters.city) conditions.push(eq(resumes.currentCity, filters.city));
  if (filters.jobType) conditions.push(eq(resumes.jobType, filters.jobType as any));
  if (filters.workType) conditions.push(eq(resumes.desiredWorkType, filters.workType as any));

  const where = and(...conditions);
  const [rows, countResult] = await Promise.all([
    db.select().from(resumes).where(where).orderBy(desc(resumes.updatedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(resumes).where(where),
  ]);

  return { resumes: rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function getResumeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(resumes).where(eq(resumes.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getResumeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function upsertResume(data: typeof resumes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getResumeByUserId(data.userId!);
  if (existing) {
    await db.update(resumes).set(data).where(eq(resumes.userId, data.userId!));
    return existing.id;
  } else {
    const result = await db.insert(resumes).values(data);
    return result[0];
  }
}

// ─── Community Posts ──────────────────────────────────────────────────────────
export async function getCommunityPosts(filters: { category?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters.category) conditions.push(eq(communityPosts.category, filters.category as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [posts, countResult] = await Promise.all([
    db.select().from(communityPosts).where(where).orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts).where(where),
  ]);

  return { posts, total: Number(countResult[0]?.count ?? 0) };
}

export async function getCommunityPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createCommunityPost(data: typeof communityPosts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(communityPosts).values(data);
}

export async function updateCommunityPost(id: number, authorId: number, data: Partial<typeof communityPosts.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(communityPosts).set(data).where(and(eq(communityPosts.id, id), eq(communityPosts.authorId, authorId)));
}

export async function deleteCommunityPost(id: number, authorId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(communityPosts).where(and(eq(communityPosts.id, id), eq(communityPosts.authorId, authorId)));
}

// 본인 글 목록 (마이페이지 — 익명화 대상 아님)
export async function getCommunityPostsByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communityPosts).where(eq(communityPosts.authorId, authorId)).orderBy(desc(communityPosts.createdAt));
}

// 관리자용: 실제 계정 정보 포함 커뮤니티 글 목록 (신고 처리용 — 익명화 예외)
export async function getAdminCommunityPosts(page: number, limit: number) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db
      .select({
        id: communityPosts.id,
        title: communityPosts.title,
        category: communityPosts.category,
        createdAt: communityPosts.createdAt,
        authorId: communityPosts.authorId,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.authorId, users.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function incrementCommunityViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(communityPosts).set({ viewCount: sql`${communityPosts.viewCount} + 1` }).where(eq(communityPosts.id, id));
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export async function getComments(postType: string, postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.postType, postType as any), eq(comments.postId, postId)))
    .orderBy(comments.createdAt);
}

export async function createComment(data: typeof comments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(comments).values(data);
  // increment comment count
  if (data.postType === "community") {
    await db.update(communityPosts).set({ commentCount: sql`${communityPosts.commentCount} + 1` }).where(eq(communityPosts.id, data.postId!));
  } else if (data.postType === "salon_transfer") {
    await db.update(salonTransfers).set({ commentCount: sql`${salonTransfers.commentCount} + 1` }).where(eq(salonTransfers.id, data.postId!));
  } else if (data.postType === "used_item") {
    await db.update(usedItems).set({ commentCount: sql`${usedItems.commentCount} + 1` }).where(eq(usedItems.id, data.postId!));
  }
}

export async function deleteComment(id: number, authorId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(and(eq(comments.id, id), eq(comments.authorId, authorId)));
}

// ─── Salon Transfers ──────────────────────────────────────────────────────────
export async function getSalonTransfers(filters: { city?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(salonTransfers.isActive, true)];
  if (filters.city) conditions.push(eq(salonTransfers.city, filters.city));

  const where = and(...conditions);
  const [posts, countResult] = await Promise.all([
    db.select().from(salonTransfers).where(where).orderBy(desc(salonTransfers.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(salonTransfers).where(where),
  ]);

  return { posts, total: Number(countResult[0]?.count ?? 0) };
}

export async function getSalonTransferById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(salonTransfers).where(eq(salonTransfers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createSalonTransfer(data: typeof salonTransfers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(salonTransfers).values(data);
}

export async function updateSalonTransfer(id: number, authorId: number, data: Partial<typeof salonTransfers.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(salonTransfers).set(data).where(and(eq(salonTransfers.id, id), eq(salonTransfers.authorId, authorId)));
}

export async function deleteSalonTransfer(id: number, authorId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(salonTransfers).set({ isActive: false }).where(and(eq(salonTransfers.id, id), eq(salonTransfers.authorId, authorId)));
}

export async function incrementSalonTransferViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(salonTransfers).set({ viewCount: sql`${salonTransfers.viewCount} + 1` }).where(eq(salonTransfers.id, id));
}

export async function getSalonTransfersByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salonTransfers).where(eq(salonTransfers.authorId, authorId)).orderBy(desc(salonTransfers.createdAt));
}

// ─── Used Items ───────────────────────────────────────────────────────────────
export async function getUsedItems(filters: { category?: string; city?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(usedItems.isSold, false)];
  if (filters.category) conditions.push(eq(usedItems.category, filters.category as any));
  if (filters.city) conditions.push(eq(usedItems.city, filters.city));

  const where = and(...conditions);
  const [items, countResult] = await Promise.all([
    db.select().from(usedItems).where(where).orderBy(desc(usedItems.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(usedItems).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getUsedItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(usedItems).where(eq(usedItems.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createUsedItem(data: typeof usedItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(usedItems).values(data);
}

export async function updateUsedItem(id: number, authorId: number, data: Partial<typeof usedItems.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(usedItems).set(data).where(and(eq(usedItems.id, id), eq(usedItems.authorId, authorId)));
}

export async function deleteUsedItem(id: number, authorId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(usedItems).set({ isSold: true }).where(and(eq(usedItems.id, id), eq(usedItems.authorId, authorId)));
}

export async function incrementUsedItemViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(usedItems).set({ viewCount: sql`${usedItems.viewCount} + 1` }).where(eq(usedItems.id, id));
}

export async function getUsedItemsByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usedItems).where(eq(usedItems.authorId, authorId)).orderBy(desc(usedItems.createdAt));
}

// ─── Favorites ────────────────────────────────────────────────────────────────
export async function getFavorites(userId: number, targetType?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(favorites.userId, userId)];
  if (targetType) conditions.push(eq(favorites.targetType, targetType as any));
  return db.select().from(favorites).where(and(...conditions)).orderBy(desc(favorites.createdAt));
}

export async function addFavorite(userId: number, targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.targetType, targetType as any), eq(favorites.targetId, targetId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(favorites).values({ userId, targetType: targetType as any, targetId });
  }
}

export async function removeFavorite(userId: number, targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.targetType, targetType as any), eq(favorites.targetId, targetId)));
}

export async function isFavorited(userId: number, targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.targetType, targetType as any), eq(favorites.targetId, targetId)))
    .limit(1);
  return result.length > 0;
}

// ─── Reports (檢舉 신고) ──────────────────────────────────────────────────────
export async function createReport(data: typeof reports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(reports).values(data);
}

export async function getAdminReports(page: number, limit: number, status?: string) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const where = status ? eq(reports.status, status as any) : undefined;
  const [items, countResult] = await Promise.all([
    db.select().from(reports).where(where).orderBy(desc(reports.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reports).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function updateReportStatus(id: number, status: "pending" | "resolved" | "dismissed") {
  const db = await getDb();
  if (!db) return;
  await db.update(reports).set({ status }).where(eq(reports.id, id));
}

// 사후 자동 플래그 (D-1): 판매 중 二手 글에서 금지 키워드 감지 시 reports 큐에 자동 신고.
// reporterId 0 = 시스템, detail의 [自動偵測] 마커로 중복 등록 방지.
export async function autoFlagBannedUsedItems(
  findKeyword: (text: string) => string | null
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const items = await db.select().from(usedItems).where(eq(usedItems.isSold, false));
  let flagged = 0;
  for (const item of items) {
    const keyword = findKeyword(`${item.title}\n${item.description}`);
    if (!keyword) continue;
    const existing = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.targetType, "used_item"), eq(reports.targetId, item.id)))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(reports).values({
      reporterId: 0,
      targetType: "used_item",
      targetId: item.id,
      reason: "illegal",
      detail: `[自動偵測] 醫療器材疑慮（關鍵字：${keyword}）`,
    });
    flagged++;
  }
  return flagged;
}

// 관리자 강제 삭제: 작성자와 무관하게 대상 게시글을 제거하고 관련 신고를 일괄 처리
export async function adminDeleteReportedPost(
  targetType: "community" | "salon_transfer" | "used_item",
  targetId: number
) {
  const db = await getDb();
  if (!db) return;
  if (targetType === "community") {
    await db.delete(communityPosts).where(eq(communityPosts.id, targetId));
  } else if (targetType === "salon_transfer") {
    await db.delete(salonTransfers).where(eq(salonTransfers.id, targetId));
  } else {
    await db.delete(usedItems).where(eq(usedItems.id, targetId));
  }
  await db.delete(comments).where(and(eq(comments.postType, targetType), eq(comments.postId, targetId)));
  await db
    .update(reports)
    .set({ status: "resolved" })
    .where(and(eq(reports.targetType, targetType), eq(reports.targetId, targetId)));
}

// ─── Platform Stats ─────────────────────────────────────────────────────────
export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { memberCount: 0, usedItemCount: 0, salonCount: 0, communityCount: 0 };

  const [memberResult, usedItemResult, salonResult, communityResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(usedItems),
    db.select({ count: sql<number>`count(*)` }).from(salonTransfers),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts),
  ]);

  return {
    memberCount: Number(memberResult[0]?.count ?? 0),
    usedItemCount: Number(usedItemResult[0]?.count ?? 0),
    salonCount: Number(salonResult[0]?.count ?? 0),
    communityCount: Number(communityResult[0]?.count ?? 0),
  };
}

// ─── Admin Stats ─────────────────────────────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsersMonth, salonOwners, jobSeekers,
    totalCommunity, newCommunityMonth, totalComments,
    totalTransfers, totalUsedItems, totalResumes,
    pendingReports, totalReports,
    recentUsers, recentPosts, recentReports,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.userType, "salon_owner")),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.userType, "job_seeker")),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts).where(gte(communityPosts.createdAt, thirtyDaysAgo)),
    db.select({ count: sql<number>`count(*)` }).from(comments),
    db.select({ count: sql<number>`count(*)` }).from(salonTransfers),
    db.select({ count: sql<number>`count(*)` }).from(usedItems),
    db.select({ count: sql<number>`count(*)` }).from(resumes),
    db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(reports),
    // 최근 가입 회원 5명
    db.select({ id: users.id, name: users.name, email: users.email, userType: users.userType, createdAt: users.createdAt })
      .from(users).orderBy(desc(users.createdAt)).limit(5),
    // 최근 커뮤니티 글 5건
    db.select({ id: communityPosts.id, title: communityPosts.title, category: communityPosts.category, createdAt: communityPosts.createdAt })
      .from(communityPosts).orderBy(desc(communityPosts.createdAt)).limit(5),
    // 최근 신고 5건
    db.select().from(reports).orderBy(desc(reports.createdAt)).limit(5),
  ]);

  return {
    users: {
      total: Number(totalUsers[0]?.count ?? 0),
      newThisMonth: Number(newUsersMonth[0]?.count ?? 0),
      salonOwners: Number(salonOwners[0]?.count ?? 0),
      jobSeekers: Number(jobSeekers[0]?.count ?? 0),
    },
    community: {
      total: Number(totalCommunity[0]?.count ?? 0),
      newThisMonth: Number(newCommunityMonth[0]?.count ?? 0),
      comments: Number(totalComments[0]?.count ?? 0),
    },
    reports: {
      pending: Number(pendingReports[0]?.count ?? 0),
      total: Number(totalReports[0]?.count ?? 0),
    },
    content: {
      resumes: Number(totalResumes[0]?.count ?? 0),
      community: Number(totalCommunity[0]?.count ?? 0),
      transfers: Number(totalTransfers[0]?.count ?? 0),
      usedItems: Number(totalUsedItems[0]?.count ?? 0),
    },
    recent: {
      users: recentUsers,
      posts: recentPosts,
      reports: recentReports,
    },
  };
}

// ─── Admin List Queries ───────────────────────────────────────────────────────
export async function getAdminUsers(page: number, limit: number) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select({
      id: users.id, name: users.name, email: users.email,
      userType: users.userType, role: users.role, createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getAdminJobs(page: number, limit: number) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select({
      id: jobPosts.id, title: jobPosts.title, salonName: jobPosts.salonName,
      city: jobPosts.city, jobType: jobPosts.jobType, isActive: jobPosts.isActive,
      createdAt: jobPosts.createdAt,
    }).from(jobPosts).orderBy(desc(jobPosts.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(jobPosts),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

// ─── CSV Export (관리자 전용, 실제 전 테이블) ─────────────────────────────────
// 스키마의 모든 테이블을 등록한다. 테이블을 추가하면 여기에도 등록할 것.
const EXPORT_TABLES = {
  users,
  job_posts: jobPosts,
  resumes,
  community_posts: communityPosts,
  comments,
  salon_transfers: salonTransfers,
  used_items: usedItems,
  favorites,
  reports,
} as const;

export type ExportTableName = keyof typeof EXPORT_TABLES;
export const EXPORT_TABLE_NAMES = Object.keys(EXPORT_TABLES) as ExportTableName[];

// 민감 컬럼은 export에서 제외
const EXPORT_EXCLUDED_COLUMNS: Record<string, string[]> = {
  users: ["passwordHash"],
};

export async function getTableRowsForExport(table: ExportTableName): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = (await db.select().from(EXPORT_TABLES[table])) as Record<string, unknown>[];
  const excluded = EXPORT_EXCLUDED_COLUMNS[table];
  if (!excluded) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const col of excluded) delete copy[col];
    return copy;
  });
}

// ─── Supply Stores (美材行 디렉토리 — 공개 읽기 전용) ─────────────────────────
// 공공 오픈데이터 기반 참조 데이터라 쓰기 프로시저 없이 조회만 제공한다.
export async function getSupplyStores() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: supplyStores.id,
      name: supplyStores.name,
      address: supplyStores.address,
      district: supplyStores.district,
      lat: supplyStores.lat,
      lng: supplyStores.lng,
      tier: supplyStores.tier,
      phone: supplyStores.phone,
      note: supplyStores.note,
      coordSource: supplyStores.coordSource,
    })
    .from(supplyStores)
    .orderBy(supplyStores.district, supplyStores.tier, supplyStores.name);
}

// ─── Salons (公開資料 기반 참조 테이블) ───────────────────────────────────────
// 負責人 성명은 스키마에 없으므로 어떤 조회에서도 나갈 수 없다.

export type SalonParking = {
  name: string;
  kind: string;
  distance: number;
  fee: string | null;
  moto: string | null;
};

export type SalonRow = {
  taxId: string;
  name: string;
  address: string;
  district: string;
  lat: string | null;
  lng: string | null;
  foundedYear: number | null;
  parking: SalonParking[];
};

function toSalonRow(r: {
  taxId: string; name: string; address: string; district: string;
  lat: string | null; lng: string | null; foundedYear: number | null; parkingJson: string | null;
}): SalonRow {
  let parking: SalonParking[] = [];
  if (r.parkingJson) {
    try {
      const parsed = JSON.parse(r.parkingJson);
      if (Array.isArray(parsed)) parking = parsed as SalonParking[];
    } catch {
      parking = [];
    }
  }
  return {
    taxId: r.taxId, name: r.name, address: r.address, district: r.district,
    lat: r.lat, lng: r.lng, foundedYear: r.foundedYear, parking,
  };
}

const SALON_COLS = {
  taxId: salons.taxId,
  name: salons.name,
  address: salons.address,
  district: salons.district,
  lat: salons.lat,
  lng: salons.lng,
  foundedYear: salons.foundedYear,
  parkingJson: salons.parkingJson,
};

export async function getSalonByTaxId(taxId: string): Promise<SalonRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select(SALON_COLS).from(salons).where(eq(salons.taxId, taxId)).limit(1);
  return rows.length ? toSalonRow(rows[0]) : null;
}

export async function listSalonsByDistrict(district: string, limit = 5000): Promise<SalonRow[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select(SALON_COLS).from(salons)
    .where(eq(salons.district, district)).orderBy(salons.name).limit(limit);
  return rows.map(toSalonRow);
}

/** 같은 구의 다른 살롱 — 내부 링크망용. 자기 자신은 제외. */
export async function listNearbySalons(district: string, excludeTaxId: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ taxId: salons.taxId, name: salons.name, address: salons.address })
    .from(salons)
    .where(and(eq(salons.district, district), sql`${salons.taxId} <> ${excludeTaxId}`))
    .limit(limit);
  return rows;
}

export async function countSalonsByDistrict(): Promise<{ district: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ district: salons.district, count: sql<number>`COUNT(*)` })
    .from(salons).groupBy(salons.district);
  return rows.map((r) => ({ district: r.district, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count || a.district.localeCompare(b.district));
}

export async function countSalons(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ c: sql<number>`COUNT(*)` }).from(salons);
  return Number(rows[0]?.c ?? 0);
}

// ─── 통계 (/stats) ────────────────────────────────────────────────────────────
// 전부 DB 집계 — 월간 갱신 시 자동 반영된다(하드코딩 없음).

export type SalonStats = {
  total: number;
  withCoord: number;
  withParking: number;
  districts: { district: string; count: number }[];
  decades: { decade: number; count: number }[];
  recentYears: { year: number; count: number }[];
  supplyStores: number;
  latestFoundedYear: number | null;
};

export async function getSalonStats(): Promise<SalonStats | null> {
  const db = await getDb();
  if (!db) return null;

  const [totals] = await db.select({
    total: sql<number>`COUNT(*)`,
    withCoord: sql<number>`SUM(CASE WHEN ${salons.lat} IS NOT NULL THEN 1 ELSE 0 END)`,
    withParking: sql<number>`SUM(CASE WHEN ${salons.parkingJson} IS NOT NULL THEN 1 ELSE 0 END)`,
    latestFoundedYear: sql<number>`MAX(${salons.foundedYear})`,
  }).from(salons);

  const districts = await countSalonsByDistrict();

  const decadeRows = await db.select({
    decade: sql<number>`FLOOR(${salons.foundedYear} / 10) * 10`,
    count: sql<number>`COUNT(*)`,
  }).from(salons).where(sql`${salons.foundedYear} IS NOT NULL`)
    .groupBy(sql`FLOOR(${salons.foundedYear} / 10) * 10`)
    .orderBy(sql`FLOOR(${salons.foundedYear} / 10) * 10`);

  const yearRows = await db.select({
    year: salons.foundedYear,
    count: sql<number>`COUNT(*)`,
  }).from(salons)
    .where(sql`${salons.foundedYear} >= YEAR(CURDATE()) - 9`)
    .groupBy(salons.foundedYear).orderBy(salons.foundedYear);

  const [supply] = await db.select({ c: sql<number>`COUNT(*)` }).from(supplyStores);

  return {
    total: Number(totals?.total ?? 0),
    withCoord: Number(totals?.withCoord ?? 0),
    withParking: Number(totals?.withParking ?? 0),
    districts,
    decades: decadeRows.map((r) => ({ decade: Number(r.decade), count: Number(r.count) })),
    recentYears: yearRows.filter((r) => r.year != null)
      .map((r) => ({ year: Number(r.year), count: Number(r.count) })),
    supplyStores: Number(supply?.c ?? 0),
    latestFoundedYear: totals?.latestFoundedYear != null ? Number(totals.latestFoundedYear) : null,
  };
}
