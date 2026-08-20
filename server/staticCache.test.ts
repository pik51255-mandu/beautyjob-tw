import { describe, expect, it } from "vitest";
import { IMMUTABLE_CACHE_CONTROL, REVALIDATE_CACHE_CONTROL, cacheControlFor } from "./staticCache";

describe("cacheControlFor", () => {
  it("해시 파일명이 붙은 빌드 산출물은 1년 불변 캐시", () => {
    expect(cacheControlFor("/app/dist/public/assets/index-BzHSUt-f.js")).toBe(IMMUTABLE_CACHE_CONTROL);
    expect(cacheControlFor("/app/dist/public/assets/index-8aK2qIpV.css")).toBe(IMMUTABLE_CACHE_CONTROL);
    expect(cacheControlFor("/app/dist/public/assets/SupplyMap-BuXCaLkj.js")).toBe(IMMUTABLE_CACHE_CONTROL);
  });

  it("윈도우 경로 구분자도 동일하게 판정한다", () => {
    expect(cacheControlFor("C:\\app\\dist\\public\\assets\\index-abc.js")).toBe(IMMUTABLE_CACHE_CONTROL);
  });

  it("index.html 은 배포 즉시 반영을 위해 매번 재검증", () => {
    expect(cacheControlFor("/app/dist/public/index.html")).toBe(REVALIDATE_CACHE_CONTROL);
  });

  it("assets 밖의 정적 파일은 재검증 대상", () => {
    expect(cacheControlFor("/app/dist/public/robots.txt")).toBe(REVALIDATE_CACHE_CONTROL);
    expect(cacheControlFor("/app/dist/public/sitemap.xml")).toBe(REVALIDATE_CACHE_CONTROL);
  });

  it("assets 라는 낱말이 들어간 다른 경로를 오인하지 않는다", () => {
    expect(cacheControlFor("/app/dist/public/assets-old/index.js")).toBe(REVALIDATE_CACHE_CONTROL);
    expect(cacheControlFor("/app/dist/public/my-assets.txt")).toBe(REVALIDATE_CACHE_CONTROL);
  });

  it("불변 정책은 CDN·브라우저가 재검증 없이 쓰도록 immutable 을 포함한다", () => {
    expect(IMMUTABLE_CACHE_CONTROL).toContain("immutable");
    expect(IMMUTABLE_CACHE_CONTROL).toContain("max-age=31536000");
    expect(IMMUTABLE_CACHE_CONTROL).toContain("public");
  });
});
