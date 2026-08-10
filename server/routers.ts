import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { COOKIE_NAME, FEATURES, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ─── Shared Enums ─────────────────────────────────────────────────────────────
const jobTypeEnum = z.enum(["designer", "intern", "staff", "colorist", "barber", "manager", "other"]);
const workTypeEnum = z.enum(["full_time", "part_time", "contract"]);
const salaryTypeEnum = z.enum(["monthly", "hourly", "commission"]);
const experienceEnum = z.enum(["none", "1year", "2year", "3year", "5year", "10year"]);
const communityCategory = z.enum(["general", "technique", "education", "news", "qa"]);
const postTypeEnum = z.enum(["community", "salon_transfer", "used_item"]);
const favoriteTypeEnum = z.enum(["job_post", "resume", "salon_transfer", "used_item"]);
const usedItemCategory = z.enum(["chair", "dryer", "washer", "scissors", "chemical", "furniture", "other"]);
const usedItemCondition = z.enum(["new", "like_new", "good", "fair"]);
const reportTargetEnum = z.enum(["community", "salon_transfer", "used_item"]);
const reportReasonEnum = z.enum(["spam", "fraud", "offensive", "illegal", "other"]);

// 채용 기능 잠금 가드 (v4 커뮤니티 런칭)
function assertJobsEnabled() {
  if (!FEATURES.JOBS_ENABLED) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "徵才功能即將開放" });
  }
}

// ─── Users Router ─────────────────────────────────────────────────────────────
const usersRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  updateProfile: protectedProcedure
    .input(
      z.object({
        userType: z.enum(["salon_owner", "job_seeker"]).optional(),
        // 회원 身分 (자율 신고) — Phase 2에서 사업자번호(統一編號) 인증 추가 예정
        memberType: z.enum(["designer", "owner", "other"]).optional(),
        phone: z.string().max(30).optional(),
        city: z.string().max(50).optional(),
        bio: z.string().optional(),
        name: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

// ─── Job Posts Router ─────────────────────────────────────────────────────────
const jobPostsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        jobType: jobTypeEnum.optional(),
        workType: workTypeEnum.optional(),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return db.getJobPosts(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await db.incrementJobViewCount(input.id);
      const post = await db.getJobPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "職缺不存在" });
      return post;
    }),

  myPosts: protectedProcedure.query(async ({ ctx }) => {
    return db.getJobPostsByAuthor(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(200),
        salonName: z.string().min(1).max(100),
        jobType: jobTypeEnum,
        workType: workTypeEnum,
        city: z.string().min(1).max(50),
        district: z.string().max(50).optional(),
        address: z.string().optional(),
        salaryType: salaryTypeEnum,
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        experienceRequired: experienceEnum.default("none"),
        description: z.string().min(10),
        benefits: z.string().optional(),
        contactInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertJobsEnabled();
      await db.createJobPost({
        ...input,
        authorId: ctx.user.id,
        salaryMin: input.salaryMin ? String(input.salaryMin) : null,
        salaryMax: input.salaryMax ? String(input.salaryMax) : null,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(2).max(200).optional(),
        salonName: z.string().min(1).max(100).optional(),
        jobType: jobTypeEnum.optional(),
        workType: workTypeEnum.optional(),
        city: z.string().min(1).max(50).optional(),
        district: z.string().max(50).optional(),
        address: z.string().optional(),
        salaryType: salaryTypeEnum.optional(),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        experienceRequired: experienceEnum.optional(),
        description: z.string().min(10).optional(),
        benefits: z.string().optional(),
        contactInfo: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertJobsEnabled();
      const { id, salaryMin, salaryMax, ...rest } = input;
      await db.updateJobPost(id, ctx.user.id, {
        ...rest,
        ...(salaryMin !== undefined && { salaryMin: String(salaryMin) }),
        ...(salaryMax !== undefined && { salaryMax: String(salaryMax) }),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteJobPost(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Resumes Router ───────────────────────────────────────────────────────────
const resumesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        jobType: jobTypeEnum.optional(),
        workType: z.enum(["full_time", "part_time", "contract", "any"]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return db.getResumes(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const resume = await db.getResumeById(input.id);
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "履歷不存在" });
      return resume;
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    return db.getResumeByUserId(ctx.user.id);
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1).max(100),
        jobType: jobTypeEnum,
        experienceYears: z.number().min(0).max(50).default(0),
        currentCity: z.string().min(1).max(50),
        desiredCity: z.string().max(50).optional(),
        desiredSalaryMin: z.number().optional(),
        desiredSalaryMax: z.number().optional(),
        desiredWorkType: z.enum(["full_time", "part_time", "contract", "any"]).default("any"),
        skills: z.string().optional(),
        introduction: z.string().min(10),
        portfolioUrl: z.string().optional().refine(
          (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
          { message: "請輸入有效的網址 (https://...)" }
        ),
        isPublic: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertJobsEnabled();
      await db.upsertResume({
        ...input,
        userId: ctx.user.id,
        desiredSalaryMin: input.desiredSalaryMin ? String(input.desiredSalaryMin) : null,
        desiredSalaryMax: input.desiredSalaryMax ? String(input.desiredSalaryMax) : null,
      });
      return { success: true };
    }),
});

// ─── Community Router ─────────────────────────────────────────────────────────
const communityRouter = router({
  list: publicProcedure
    .input(
      z.object({
        category: communityCategory.optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return db.getCommunityPosts(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await db.incrementCommunityViewCount(input.id);
      const post = await db.getCommunityPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "文章不存在" });
      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        category: communityCategory,
        title: z.string().min(2).max(200),
        content: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createCommunityPost({ ...input, authorId: ctx.user.id });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(2).max(200).optional(),
        content: z.string().min(10).optional(),
        category: communityCategory.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateCommunityPost(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCommunityPost(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Comments Router ──────────────────────────────────────────────────────────
const commentsRouter = router({
  list: publicProcedure
    .input(z.object({ postType: postTypeEnum, postId: z.number() }))
    .query(async ({ input }) => {
      return db.getComments(input.postType, input.postId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        postType: postTypeEnum,
        postId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createComment({ ...input, authorId: ctx.user.id });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteComment(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Salon Transfers Router ───────────────────────────────────────────────────
const salonTransfersRouter = router({
  list: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return db.getSalonTransfers(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await db.incrementSalonTransferViewCount(input.id);
      const post = await db.getSalonTransferById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "頂讓資訊不存在" });
      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(200),
        salonName: z.string().max(100).optional(),
        city: z.string().min(1).max(50),
        district: z.string().max(50).optional(),
        address: z.string().optional(),
        sizeM2: z.number().optional(),
        keyMoney: z.number().optional(),
        deposit: z.number().optional(),
        monthlyRent: z.number().optional(),
        description: z.string().min(10),
        contactInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createSalonTransfer({
        ...input,
        authorId: ctx.user.id,
        sizeM2: input.sizeM2 ? String(input.sizeM2) : null,
        keyMoney: input.keyMoney ? String(input.keyMoney) : null,
        deposit: input.deposit ? String(input.deposit) : null,
        monthlyRent: input.monthlyRent ? String(input.monthlyRent) : null,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(2).max(200).optional(),
        description: z.string().min(10).optional(),
        isActive: z.boolean().optional(),
        keyMoney: z.number().optional(),
        deposit: z.number().optional(),
        monthlyRent: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, keyMoney, deposit, monthlyRent, ...rest } = input;
      await db.updateSalonTransfer(id, ctx.user.id, {
        ...rest,
        ...(keyMoney !== undefined && { keyMoney: String(keyMoney) }),
        ...(deposit !== undefined && { deposit: String(deposit) }),
        ...(monthlyRent !== undefined && { monthlyRent: String(monthlyRent) }),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteSalonTransfer(input.id, ctx.user.id);
      return { success: true };
    }),

  myPosts: protectedProcedure.query(async ({ ctx }) => {
    return db.getSalonTransfersByAuthor(ctx.user.id);
  }),
});

// ─── Used Items Router ────────────────────────────────────────────────────────
const usedItemsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        category: usedItemCategory.optional(),
        city: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return db.getUsedItems(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await db.incrementUsedItemViewCount(input.id);
      const item = await db.getUsedItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "商品不存在" });
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(200),
        category: usedItemCategory,
        condition: usedItemCondition,
        price: z.number().min(0),
        city: z.string().min(1).max(50),
        description: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createUsedItem({
        ...input,
        authorId: ctx.user.id,
        price: String(input.price),
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(2).max(200).optional(),
        price: z.number().min(0).optional(),
        description: z.string().min(10).optional(),
        isSold: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, price, ...rest } = input;
      await db.updateUsedItem(id, ctx.user.id, {
        ...rest,
        ...(price !== undefined && { price: String(price) }),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteUsedItem(input.id, ctx.user.id);
      return { success: true };
    }),

  myPosts: protectedProcedure.query(async ({ ctx }) => {
    return db.getUsedItemsByAuthor(ctx.user.id);
  }),
});

// ─── Favorites Router ─────────────────────────────────────────────────────────
const favoritesRouter = router({
  list: protectedProcedure
    .input(z.object({ targetType: favoriteTypeEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return db.getFavorites(ctx.user.id, input.targetType);
    }),

  toggle: protectedProcedure
    .input(z.object({ targetType: favoriteTypeEnum, targetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const already = await db.isFavorited(ctx.user.id, input.targetType, input.targetId);
      if (already) {
        await db.removeFavorite(ctx.user.id, input.targetType, input.targetId);
        return { favorited: false };
      } else {
        await db.addFavorite(ctx.user.id, input.targetType, input.targetId);
        return { favorited: true };
      }
    }),

  check: protectedProcedure
    .input(z.object({ targetType: favoriteTypeEnum, targetId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.isFavorited(ctx.user.id, input.targetType, input.targetId);
    }),
});

// ─── Reports Router (檢舉 신고) ──────────────────────────────────────────────
const reportsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        targetType: reportTargetEnum,
        targetId: z.number(),
        reason: reportReasonEnum,
        detail: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createReport({
        ...input,
        reporterId: ctx.user.id,
        detail: input.detail ?? null,
      });
      return { success: true };
    }),
});

// ─── Admin Router ──────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 전용 기능입니다" });
  }
  return next({ ctx });
});

const adminRouter = router({
  stats: adminProcedure.query(async () => {
    return db.getAdminStats();
  }),
  listUsers: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return db.getAdminUsers(input.page, input.limit);
    }),
  listJobs: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return db.getAdminJobs(input.page, input.limit);
    }),
  listReports: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      status: z.enum(["pending", "resolved", "dismissed"]).optional(),
    }))
    .query(async ({ input }) => {
      return db.getAdminReports(input.page, input.limit, input.status);
    }),
  updateReportStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "resolved", "dismissed"]) }))
    .mutation(async ({ input }) => {
      await db.updateReportStatus(input.id, input.status);
      return { success: true };
    }),
  deleteReportedPost: adminProcedure
    .input(z.object({ targetType: reportTargetEnum, targetId: z.number() }))
    .mutation(async ({ input }) => {
      await db.adminDeleteReportedPost(input.targetType, input.targetId);
      return { success: true };
    }),
  exportCsv: adminProcedure
    .input(z.object({ table: z.enum(db.EXPORT_TABLE_NAMES as [db.ExportTableName, ...db.ExportTableName[]]) }))
    .query(async ({ input }) => {
      const rows = await db.getTableRowsForExport(input.table);
      return { table: input.table, csv: toCsv(rows), rowCount: rows.length };
    }),
  exportTableNames: adminProcedure.query(() => db.EXPORT_TABLE_NAMES),
});

// CSV 직렬화: 셀 이스케이프 + 수식 인젝션 방어, Excel 호환 BOM 포함
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "﻿";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    let s = value instanceof Date ? value.toISOString() : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  return "﻿" + lines.join("\n");
}

// ─── Stats Router ───────────────────────────────────────────────────────────
const statsRouter = router({
  platform: publicProcedure.query(async () => {
    return db.getPlatformStats();
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // 이메일 로그인
    emailLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤" });
        }
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user };
      }),

    // 이메일 회원가입
    emailRegister: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).max(100),
        memberType: z.enum(["designer", "owner", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "此電子郵件已經註冊" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const openId = `email_${nanoid(16)}`;
        await db.upsertUser({
          openId,
          email: input.email,
          name: input.name,
          loginMethod: "email",
          lastSignedIn: new Date(),
          passwordHash,
          memberType: input.memberType ?? null,
        });
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "註冊失敗" });
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user };
      }),
  }),
  users: usersRouter,
  jobPosts: jobPostsRouter,
  resumes: resumesRouter,
  community: communityRouter,
  comments: commentsRouter,
  salonTransfers: salonTransfersRouter,
  usedItems: usedItemsRouter,
  favorites: favoritesRouter,
  reports: reportsRouter,
  stats: statsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
