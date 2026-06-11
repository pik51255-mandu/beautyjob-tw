import {
  and, desc, eq, gte, lte, or, sql
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  comments,
  communityPosts,
  favorites,
  jobApplications,
  jobPosts,
  resumes,
  salonTransfers,
  usedItems,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
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

export async function updateUserProfile(
  userId: number,
  data: { userType?: "salon_owner" | "job_seeker"; phone?: string; city?: string; bio?: string; name?: string }
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

// ─── Job Applications ───────────────────────────────────────────────────────────────────────────────────────
export async function applyToJob(jobPostId: number, applicantId: number, coverLetter?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // 중복 지원 방지
  const existing = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.jobPostId, jobPostId), eq(jobApplications.applicantId, applicantId)))
    .limit(1);
  if (existing.length > 0) throw new Error("ALREADY_APPLIED");
  await db.insert(jobApplications).values({ jobPostId, applicantId, coverLetter: coverLetter ?? null });
}

export async function cancelApplication(jobPostId: number, applicantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(jobApplications).where(
    and(eq(jobApplications.jobPostId, jobPostId), eq(jobApplications.applicantId, applicantId))
  );
}

export async function getMyApplications(applicantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.applicantId, applicantId))
    .orderBy(desc(jobApplications.createdAt));
}

export async function getJobApplications(jobPostId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  // 직접 JOIN 대신 어플리케이션 목록만 반환 (applicantId 포함)
  return db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.jobPostId, jobPostId))
    .orderBy(desc(jobApplications.createdAt));
}

export async function getApplicationStatus(jobPostId: number, applicantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.jobPostId, jobPostId), eq(jobApplications.applicantId, applicantId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateApplicationStatus(
  id: number,
  status: "pending" | "reviewed" | "accepted" | "rejected"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobApplications).set({ status }).where(eq(jobApplications.id, id));
}

// ─── Platform Stats ─────────────────────────────────────────────────────────
export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { jobCount: 0, resumeCount: 0, salonCount: 0, communityCount: 0 };

  const [jobResult, resumeResult, salonResult, communityResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(jobPosts),
    db.select({ count: sql<number>`count(*)` }).from(resumes),
    db.select({ count: sql<number>`count(*)` }).from(salonTransfers),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts),
  ]);

  return {
    jobCount: Number(jobResult[0]?.count ?? 0),
    resumeCount: Number(resumeResult[0]?.count ?? 0),
    salonCount: Number(salonResult[0]?.count ?? 0),
    communityCount: Number(communityResult[0]?.count ?? 0),
  };
}
