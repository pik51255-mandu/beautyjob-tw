import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { headers: {}, protocol: "https", hostname: "test" } as never,
    res: { cookie: () => {}, clearCookie: () => {} } as never,
  } as TrpcContext;
}

// 공개 필드 화이트리스트 — 여기에 없는 컬럼이 응답에 새면 실패한다.
const ALLOWED = ["id", "name", "address", "district", "lat", "lng", "tier", "phone", "note", "coordSource"];

describe("supplyStores.list (美材行 지도)", () => {
  it("비로그인도 조회할 수 있다", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.supplyStores.list()).resolves.toBeDefined();
  });

  it("stores 배열과 total 을 반환한다", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const res = await caller.supplyStores.list();
    expect(Array.isArray(res.stores)).toBe(true);
    expect(res.total).toBe(res.stores.length);
  });

  it("응답 필드가 화이트리스트를 벗어나지 않는다", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const res = await caller.supplyStores.list();
    for (const s of res.stores) {
      for (const k of Object.keys(s)) expect(ALLOWED).toContain(k);
    }
  });

  it("taxId(統一編號) 는 노출하지 않는다", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const res = await caller.supplyStores.list();
    expect(JSON.stringify(res)).not.toContain("taxId");
  });

  it("tier 는 1 또는 2 만 존재한다 (tier0 미반입)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const res = await caller.supplyStores.list();
    for (const s of res.stores) expect([1, 2]).toContain(s.tier);
  });
});
