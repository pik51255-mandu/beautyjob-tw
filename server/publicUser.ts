/**
 * 사용자 객체 직렬화 화이트리스트 (보안 감사 #3)
 *
 * DB 행을 그대로 응답에 실으면 passwordHash 같은 자격증명 재료가 클라이언트까지 흘러간다.
 * 응답에 실을 필드를 여기서만 정의하고, 사용자 객체를 반환하는 모든 경로가 이 함수를 거친다.
 */
export const PUBLIC_USER_FIELDS = [
  "id", "openId", "name", "email", "loginMethod", "role",
  "userType", "memberType", "phone", "city", "avatarUrl", "bio",
  "createdAt", "updatedAt", "lastSignedIn",
] as const;

export type PublicUser = Partial<Record<(typeof PUBLIC_USER_FIELDS)[number], unknown>>;

/** DB 행에서 공개 필드만 뽑아낸다. null/undefined 는 null 로 통과시킨다. */
export function toPublicUser(user: unknown): PublicUser | null {
  if (!user || typeof user !== "object") return null;
  const src = user as Record<string, unknown>;
  const out: PublicUser = {};
  for (const key of PUBLIC_USER_FIELDS) {
    if (key in src) out[key] = src[key];
  }
  return out;
}
