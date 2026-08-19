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

describe("승격 우회 시도 — 변형 이메일 (보안 감사 #1)", () => {
  const LIST = "owner@example.com";

  it("대문자 변형은 정규화되어 승격된다 (동일 주소)", () => {
    expect(isAdminEmail("OWNER@EXAMPLE.COM", LIST)).toBe(true);
  });

  it("앞뒤 공백은 정규화되어 승격된다 (동일 주소)", () => {
    expect(isAdminEmail("  owner@example.com  ", LIST)).toBe(true);
  });

  it("전각 문자는 NFKC 로 정준화되어 동일 주소로 취급된다", () => {
    // ｏｗｎｅｒ＠ｅｘａｍｐｌｅ．ｃｏｍ (전각)
    expect(isAdminEmail("ｏｗｎｅｒ＠ｅｘａｍｐｌｅ．ｃｏｍ", LIST)).toBe(true);
  });

  it("키릴 유사문자(о)는 승격되지 않는다", () => {
    expect(isAdminEmail("\u043Ewner@example.com", LIST)).toBe(false);
  });

  it("그리스 유사문자(ο)는 승격되지 않는다", () => {
    expect(isAdminEmail("\u03BFwner@example.com", LIST)).toBe(false);
  });

  it("플러스 별칭은 다른 주소이므로 승격되지 않는다", () => {
    expect(isAdminEmail("owner+admin@example.com", LIST)).toBe(false);
  });

  it("점 삽입 변형은 다른 주소이므로 승격되지 않는다", () => {
    expect(isAdminEmail("own.er@example.com", LIST)).toBe(false);
  });

  it("부분 일치는 승격되지 않는다", () => {
    expect(isAdminEmail("notowner@example.com", LIST)).toBe(false);
    expect(isAdminEmail("owner@example.com.evil.com", LIST)).toBe(false);
  });
});
