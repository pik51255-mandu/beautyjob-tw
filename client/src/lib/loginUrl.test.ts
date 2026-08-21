import { describe, expect, it } from "vitest";
import { getInternalLoginUrl } from "../const";

// 눈검사 G: 앱 내부 401 은 절대 사이트 밖으로 나가면 안 된다.
describe("getInternalLoginUrl", () => {
  it("항상 자체 /login 으로 간다 — 외부 도메인이 섞이지 않는다", () => {
    expect(getInternalLoginUrl("/onboarding")).toMatch(/^\/login/);
    expect(getInternalLoginUrl("/mypage")).not.toContain("http");
    expect(getInternalLoginUrl("/mypage")).not.toContain("manus");
  });

  it("돌아올 위치를 returnPath 로 보존한다", () => {
    expect(getInternalLoginUrl("/onboarding")).toBe("/login?returnPath=%2Fonboarding");
    expect(getInternalLoginUrl("/mypage?tab=favorites"))
      .toBe("/login?returnPath=%2Fmypage%3Ftab%3Dfavorites");
  });

  it("이미 로그인 페이지면 되돌이표를 만들지 않는다", () => {
    expect(getInternalLoginUrl("/login")).toBe("/login");
  });

  it("경로가 없으면 맨 /login", () => {
    expect(getInternalLoginUrl("")).toBe("/login");
  });
});
