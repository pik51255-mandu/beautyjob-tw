import { describe, expect, it } from "vitest";
import { PUBLIC_USER_FIELDS, toPublicUser } from "./publicUser";

const DB_ROW = {
  id: 1,
  openId: "email_abc",
  name: "테스터",
  email: "t@example.com",
  loginMethod: "email",
  role: "admin",
  userType: "unset",
  memberType: "other",
  phone: null,
  city: null,
  avatarUrl: null,
  bio: null,
  passwordHash: "$2a$10$fakehashvaluefortesting",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignedIn: new Date(0),
};

describe("toPublicUser (보안 감사 #3)", () => {
  it("passwordHash 를 제거한다", () => {
    const out = toPublicUser(DB_ROW) as Record<string, unknown>;
    expect("passwordHash" in out).toBe(false);
    expect(JSON.stringify(out)).not.toContain("fakehash");
  });

  it("화이트리스트에 없는 신규 컬럼은 자동으로 새지 않는다", () => {
    const out = toPublicUser({ ...DB_ROW, secretToken: "leak-me" }) as Record<string, unknown>;
    expect("secretToken" in out).toBe(false);
  });

  it("공개 필드는 그대로 보존한다", () => {
    const out = toPublicUser(DB_ROW) as Record<string, unknown>;
    for (const f of ["id", "openId", "email", "role", "memberType"]) {
      expect(out[f]).toEqual((DB_ROW as Record<string, unknown>)[f]);
    }
  });

  it("null/undefined 는 null 로 반환한다", () => {
    expect(toPublicUser(null)).toBeNull();
    expect(toPublicUser(undefined)).toBeNull();
  });

  it("화이트리스트에 passwordHash 가 들어있지 않다", () => {
    expect(PUBLIC_USER_FIELDS).not.toContain("passwordHash" as never);
  });
});
