import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeAuthCtx(id = 1): TrpcContext {
  return makeCtx({
    user: {
      id,
      openId: `user-${id}`,
      email: `user${id}@test.com`,
      name: `Test User ${id}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  });
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx = makeAuthCtx();
    ctx.res.clearCookie = (name: string) => { cleared.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared.length).toBeGreaterThan(0);
  });

  it("returns me as null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

// ─── Job Posts Tests ──────────────────────────────────────────────────────────

describe("jobPosts.list", () => {
  it("returns paginated list without auth", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobPosts.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty("posts");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.posts)).toBe(true);
  });

  it("accepts city filter", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobPosts.list({ city: "台北市", page: 1, limit: 10 });
    expect(result).toHaveProperty("posts");
  });
});

describe("jobPosts.create", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.jobPosts.create({
        title: "Test Job",
        salonName: "Test Salon",
        jobType: "designer",
        workType: "full_time",
        city: "台北市",
        salaryType: "monthly",
        description: "Test description for job posting",
      })
    ).rejects.toThrow();
  });
});

// ─── Resumes Tests ────────────────────────────────────────────────────────────

describe("resumes.list", () => {
  it("returns paginated resume list without auth", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.resumes.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty("resumes");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.resumes)).toBe(true);
  });
});

describe("resumes.mine", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.resumes.mine()).rejects.toThrow();
  });
});

// ─── Community Tests ──────────────────────────────────────────────────────────

describe("community.list", () => {
  it("returns paginated community posts without auth", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.community.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty("posts");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.posts)).toBe(true);
  });

  it("accepts category filter", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.community.list({ category: "general", page: 1, limit: 10 });
    expect(result).toHaveProperty("posts");
  });
});

// ─── Salon Transfers Tests ────────────────────────────────────────────────────

describe("salonTransfers.list", () => {
  it("returns paginated transfer list without auth", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.salonTransfers.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty("posts");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.posts)).toBe(true);
  });
});

// ─── Used Items Tests ─────────────────────────────────────────────────────────

describe("usedItems.list", () => {
  it("returns paginated used items without auth", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.usedItems.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("accepts category filter", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.usedItems.list({ category: "chair", page: 1, limit: 10 });
    expect(result).toHaveProperty("items");
  });
});

// ─── Favorites Tests ──────────────────────────────────────────────────────────

describe("favorites.list", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.favorites.list({})).rejects.toThrow();
  });
});

describe("favorites.toggle", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.favorites.toggle({ targetType: "job_post", targetId: 1 })
    ).rejects.toThrow();
  });
});

// ─── Reports (檢舉) Tests ─────────────────────────────────────────────────────

describe("reports.create", () => {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.reports.create({ targetType: "community", targetId: 1, reason: "spam" })
    ).rejects.toThrow();
  });
});

describe("admin.listReports", () => {
  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.admin.listReports({ page: 1, limit: 10 })).rejects.toThrow();
  });
});

describe("admin.exportCsv", () => {
  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.admin.exportCsv({ table: "users" })).rejects.toThrow();
  });
});

// ─── Jobs Lock (v4) Tests ─────────────────────────────────────────────────────

describe("jobPosts.create with jobs locked", () => {
  it("throws PRECONDITION_FAILED for authenticated user while JOBS_ENABLED is false", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(
      caller.jobPosts.create({
        title: "Test Job",
        salonName: "Test Salon",
        jobType: "designer",
        workType: "full_time",
        city: "台北市",
        salaryType: "monthly",
        description: "Test description for job posting",
      })
    ).rejects.toThrow(/即將開放/);
  });
});
