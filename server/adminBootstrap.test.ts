import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails, resolveRoleForEmail } from "./adminBootstrap";

describe("parseAdminEmails", () => {
  it("미설정이면 빈 목록", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
  });

  it("콤마 구분 + 공백 제거 + 소문자화", () => {
    expect(parseAdminEmails(" Owner@Example.com , ops@example.com ")).toEqual([
      "owner@example.com",
      "ops@example.com",
    ]);
  });
});

describe("isAdminEmail", () => {
  it("대소문자를 무시하고 판정한다", () => {
    expect(isAdminEmail("OWNER@example.com", "owner@example.com")).toBe(true);
  });

  it("목록에 없으면 false", () => {
    expect(isAdminEmail("someone@example.com", "owner@example.com")).toBe(false);
  });

  it("이메일이 없으면 false", () => {
    expect(isAdminEmail(null, "owner@example.com")).toBe(false);
  });
});

describe("resolveRoleForEmail — 3분기", () => {
  const LIST = "owner@example.com,ops@example.com";

  it("① 목록에 포함되면 admin 부여", () => {
    expect(resolveRoleForEmail("owner@example.com", "user", LIST)).toBe("admin");
    expect(resolveRoleForEmail("OWNER@Example.com", null, LIST)).toBe("admin");
  });

  it("② 목록에 없으면 일반 (역할 변경 없음)", () => {
    expect(resolveRoleForEmail("someone@example.com", "user", LIST)).toBeUndefined();
    expect(resolveRoleForEmail("someone@example.com", null, LIST)).toBeUndefined();
  });

  it("③ 목록에서 빠져도 기존 admin 은 유지 (강등 금지)", () => {
    expect(resolveRoleForEmail("someone@example.com", "admin", LIST)).toBe("admin");
    expect(resolveRoleForEmail("someone@example.com", "admin", undefined)).toBe("admin");
  });
});
