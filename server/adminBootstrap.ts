/**
 * 관리자 부트스트랩 (D-2b)
 *
 * 환경변수 ADMIN_EMAILS(콤마 구분 목록)에 포함된 이메일로 로그인·가입하면 role=admin 을 부여한다.
 * 이메일을 코드에 하드코딩하지 않기 위한 장치이며, 목록에서 빠지더라도 기존 admin 을 강등하지 않는다.
 *
 * 예) ADMIN_EMAILS="owner@example.com, ops@example.com"
 *
 * ⚠ 운영 규칙 (이메일 소유 인증 도입 전까지 필수)
 *   ADMIN_EMAILS 에 이메일을 추가하면 **즉시 그 이메일로 직접 가입해 계정을 선점**할 것.
 *   가입 시 메일함 확인 절차가 없으므로, 선점 전에는 주소를 아는 제3자가
 *   먼저 가입해 관리자 권한을 가져갈 수 있다. (보안 감사 #1)
 */

/**
 * 이메일 비교용 정규화 — NFKC + trim + 소문자.
 * NFKC 로 전각/호환 문자를 정준화해 "ｏwner@…" 같은 변형이 원본과 같아지도록 하되,
 * 키릴 о 처럼 정준화되지 않는 유사문자는 일치하지 않아 승격이 거부된다(fail-closed).
 */
function normalizeEmail(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

/** ADMIN_EMAILS 를 정규화된 목록으로 파싱한다. 미설정이면 빈 배열. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

/** 해당 이메일이 관리자 목록에 있는지 판정한다 (대소문자 무시). */
export function isAdminEmail(email: string | null | undefined, raw = process.env.ADMIN_EMAILS): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).includes(normalizeEmail(email));
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
  if (isAdminEmail(email, raw)) {
    if (currentRole !== "admin") {
      // 승격은 감사 추적이 가능해야 한다. 이메일 외 값은 남기지 않는다.
      console.info(`[admin] ADMIN_EMAILS 승격: ${normalizeEmail(email!)} at ${new Date().toISOString()}`);
    }
    return "admin";
  }
  if (currentRole === "admin") return "admin";
  return undefined;
}
