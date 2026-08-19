/**
 * 관리자 부트스트랩 (D-2b)
 *
 * 환경변수 ADMIN_EMAILS(콤마 구분 목록)에 포함된 이메일로 로그인·가입하면 role=admin 을 부여한다.
 * 이메일을 코드에 하드코딩하지 않기 위한 장치이며, 목록에서 빠지더라도 기존 admin 을 강등하지 않는다.
 *
 * 예) ADMIN_EMAILS="owner@example.com, ops@example.com"
 */

/** ADMIN_EMAILS 를 소문자 목록으로 파싱한다. 미설정이면 빈 배열. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** 해당 이메일이 관리자 목록에 있는지 판정한다 (대소문자 무시). */
export function isAdminEmail(email: string | null | undefined, raw = process.env.ADMIN_EMAILS): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).includes(email.trim().toLowerCase());
}

/**
 * upsertUser 에 넘길 role 을 결정한다.
 * - 목록에 포함 → "admin"
 * - 미포함이지만 기존이 admin → "admin" 유지 (강등 금지)
 * - 그 외 → undefined (기존 값 보존)
 */
export function resolveRoleForEmail(
  email: string | null | undefined,
  currentRole: string | null | undefined,
  raw = process.env.ADMIN_EMAILS,
): "admin" | undefined {
  if (isAdminEmail(email, raw)) return "admin";
  if (currentRole === "admin") return "admin";
  return undefined;
}
