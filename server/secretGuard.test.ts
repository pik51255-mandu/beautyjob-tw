import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRequiredSecrets } from "./_core/secretGuard";

const ORIGINAL = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = ORIGINAL;
  vi.restoreAllMocks();
});

function runGuard() {
  const exit = vi.spyOn(process, "exit").mockImplementation((() => {
    throw new Error("EXIT");
  }) as never);
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  return { exit, err };
}

describe("assertRequiredSecrets (보안 감사 #2)", () => {
  it("JWT_SECRET 미설정이면 기동을 중단한다", () => {
    delete process.env.JWT_SECRET;
    const { exit } = runGuard();
    expect(() => assertRequiredSecrets()).toThrow("EXIT");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("빈 문자열이면 기동을 중단한다", () => {
    process.env.JWT_SECRET = "";
    const { exit } = runGuard();
    expect(() => assertRequiredSecrets()).toThrow("EXIT");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("32자 미만이면 기동을 중단한다", () => {
    process.env.JWT_SECRET = "a".repeat(31);
    const { exit } = runGuard();
    expect(() => assertRequiredSecrets()).toThrow("EXIT");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("에러 로그에 시크릿 값을 남기지 않는다", () => {
    process.env.JWT_SECRET = "s3cr3t-value-should-not-appear";
    const { err } = runGuard();
    expect(() => assertRequiredSecrets()).toThrow("EXIT");
    const logged = err.mock.calls.flat().join(" ");
    expect(logged).not.toContain("s3cr3t-value-should-not-appear");
  });

  it("32자 이상이면 통과한다", () => {
    process.env.JWT_SECRET = "b".repeat(32);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("EXIT");
    }) as never);
    expect(() => assertRequiredSecrets()).not.toThrow();
    expect(exit).not.toHaveBeenCalled();
  });
});
