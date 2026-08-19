import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { BANNED_KEYWORD_MESSAGE, findBannedKeyword } from "@shared/usedItemCatalog";

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

// ─── D-1 Tests ────────────────────────────────────────────────────────────────

describe("salonTransfers lock (D-1)", () => {
  it("잠금 중 create는 PRECONDITION_FAILED (整備中)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(
      caller.salonTransfers.create({
        title: "Test transfer",
        city: "台北市",
        description: "Test description here",
      })
    ).rejects.toThrow(/整備中/);
  });

  it("잠금 중 update도 차단", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(
      caller.salonTransfers.update({ id: 1, title: "changed title" })
    ).rejects.toThrow(/整備中/);
  });
});

// D-2 로 二手 쓰기가 잠기면서 라우터 진입 시 잠금 가드가 먼저 걸린다.
// 금지 키워드 로직(D-1) 자체의 커버리지는 아래 findBannedKeyword 단위 테스트가 이어받는다.
describe("usedItems write lock (D-2)", () => {
  it("잠금 중 create 차단", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(
      caller.usedItems.create({
        title: "二手雷射除毛機",
        category: "chair",
        condition: "good",
        price: 1000,
        city: "台北市",
        description: "狀況良好的機器，歡迎詢問細節",
      })
    ).rejects.toThrow(/整備中/);
  });

  it("잠금 중 update 차단", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(
      caller.usedItems.update({ id: 1, description: "適合醫美診所使用的設備" })
    ).rejects.toThrow(/整備中/);
  });

  it("잠금 중 delete 차단", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.usedItems.delete({ id: 1 })).rejects.toThrow(/整備中/);
  });
});

describe("usedItems banned keyword (D-1) — 로직 단위", () => {
  it("제목의 금지 키워드(雷射)를 찾아낸다", () => {
    expect(findBannedKeyword("二手雷射除毛機\n狀況良好")).toBeTruthy();
  });

  it("내용의 금지 키워드(醫美)를 찾아낸다", () => {
    expect(findBannedKeyword("設備\n適合醫美診所使用的設備")).toBeTruthy();
  });

  it("일반 상품 문구는 통과", () => {
    expect(findBannedKeyword("二手美髮椅\n狀況良好，歡迎詢問")).toBeNull();
  });

  it("차단 안내 문구에 不得刊登 이 포함된다", () => {
    expect(BANNED_KEYWORD_MESSAGE).toMatch(/不得刊登/);
  });
});

// 읽기 정합성 (D-2): 플래그 false 라우터의 list/byId 는 에러가 아니라 빈 결과를 준다.
// 프론트가 잠금 상태에서도 크래시하지 않게 하기 위한 계약. 플래그를 true 로 바꾸면 원복된다.
describe("flag-off 라우터 읽기 정합성 (D-2)", () => {
  it("jobPosts.list 는 빈 목록", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.jobPosts.list({ page: 1, limit: 20 })).resolves.toEqual({ posts: [], total: 0 });
  });

  it("jobPosts.byId 는 null", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.jobPosts.byId({ id: 1 })).resolves.toBeNull();
  });

  it("salonTransfers.list 는 빈 목록", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.salonTransfers.list({ page: 1, limit: 20 })).resolves.toEqual({ posts: [], total: 0 });
  });

  it("salonTransfers.byId 는 null", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.salonTransfers.byId({ id: 1 })).resolves.toBeNull();
  });

  it("usedItems.list 는 빈 목록", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.usedItems.list({ page: 1, limit: 20 })).resolves.toEqual({ items: [], total: 0 });
  });

  it("usedItems.byId 는 null", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.usedItems.byId({ id: 1 })).resolves.toBeNull();
  });
});

describe("admin.listCommunityPosts (익명화 예외 — 관리자뷰)", () => {
  it("일반 회원은 FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.admin.listCommunityPosts({ page: 1, limit: 10 })).rejects.toThrow();
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
