/**
 * 부팅 시 필수 시크릿 검증 (보안 감사 #2)
 *
 * JWT_SECRET 이 비어 있으면 세션 토큰이 빈 문자열 키로 HS256 서명되어
 * 누구나 임의 openId 토큰을 위조할 수 있다(인증 우회). 그래서 기동을 막는다.
 * 값 자체는 절대 로그에 남기지 않는다 — 길이만 판단한다.
 */
const MIN_SECRET_LENGTH = 32;

export function assertRequiredSecrets(): void {
  const secret = process.env.JWT_SECRET ?? "";
  if (!secret) {
    console.error(
      "[보안] JWT_SECRET 이 설정되지 않았습니다. 빈 키로 세션이 서명되면 인증 우회가 가능하므로 기동을 중단합니다."
    );
    process.exit(1);
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    console.error(
      `[보안] JWT_SECRET 이 너무 짧습니다 (${secret.length}자). 최소 ${MIN_SECRET_LENGTH}자 이상의 임의 문자열이 필요합니다.`
    );
    process.exit(1);
  }
}
