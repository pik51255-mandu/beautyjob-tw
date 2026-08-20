// 정적 파일 캐시 정책.
// 실측(2026-08-20): 모든 응답이 cache-control: public, max-age=0 로 나가 CDN 엣지 캐시가
// 전혀 걸리지 않았고, 해시 파일명이 붙은 불변 자산까지 매 요청 오리진(왕복 약 118ms)을 탔다.

/** 해시 파일명 자산 — 내용이 바뀌면 파일명이 바뀌므로 재검증 없이 1년 캐시한다. */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** 진입점(index.html 등) — 배포 즉시 반영돼야 하므로 매번 재검증한다(ETag 로 304 처리). */
export const REVALIDATE_CACHE_CONTROL = "no-cache";

/** 빌드 산출물 디렉터리(/assets/) 안의 파일만 불변 취급한다. */
export function cacheControlFor(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.includes("/assets/") ? IMMUTABLE_CACHE_CONTROL : REVALIDATE_CACHE_CONTROL;
}
