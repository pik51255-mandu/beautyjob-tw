import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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

// ─── Users Router ─────────────────────────────────────────────────────────────
const usersRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  updateProfile: protectedProcedure
    .input(
      z.object({
        userType: z.enum(["salon_owner", "job_seeker"]).optional(),
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
  }),
  users: usersRouter,
  jobPosts: jobPostsRouter,
  resumes: resumesRouter,
  community: communityRouter,
  comments: commentsRouter,
  salonTransfers: salonTransfersRouter,
  usedItems: usedItemsRouter,
  favorites: favoritesRouter,
});

export type AppRouter = typeof appRouter;
