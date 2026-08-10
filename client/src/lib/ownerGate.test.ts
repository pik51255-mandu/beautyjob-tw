import { describe, expect, it } from "vitest";
import { resolveOwnerGate } from "./ownerGate";

// 게이트 3분기: 비로그인 / 디자이너(비오너) / 오너
describe("resolveOwnerGate", () => {
  it("비로그인 → login", () => {
    expect(resolveOwnerGate(null, false)).toBe("login");
    expect(resolveOwnerGate(undefined, false)).toBe("login");
    // 비로그인은 세션 플래그가 있어도 login (로그아웃 후 잔존 플래그 방어)
    expect(resolveOwnerGate(null, true)).toBe("login");
  });

  it("로그인 + 身分≠owner → prompt (원클릭 전환 모달)", () => {
    expect(resolveOwnerGate({ memberType: "designer" }, false)).toBe("prompt");
    expect(resolveOwnerGate({ memberType: "other" }, false)).toBe("prompt");
    expect(resolveOwnerGate({ memberType: null }, false)).toBe("prompt");
  });

  it("owner 또는 세션 내 통과 → pass", () => {
    expect(resolveOwnerGate({ memberType: "owner" }, false)).toBe("pass");
    // 전환 직후 세션 내 유지 (memberType 캐시가 갱신 전이어도 통과)
    expect(resolveOwnerGate({ memberType: "designer" }, true)).toBe("pass");
  });
});
