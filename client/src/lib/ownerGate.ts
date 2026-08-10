// 老闆專區 게이트 판정 로직 — UI와 분리해 단위테스트 대상으로 유지.
export type GateDecision = "login" | "prompt" | "pass";

export type GateUser = { memberType?: string | null } | null | undefined;

// 비로그인 → login / 로그인 + 身分≠owner → prompt(원클릭 전환 모달) / owner 또는 세션 내 통과 → pass
export function resolveOwnerGate(user: GateUser, sessionPassed: boolean): GateDecision {
  if (!user) return "login";
  if (user.memberType === "owner" || sessionPassed) return "pass";
  return "prompt";
}

const SESSION_KEY = "ownerGate.passed";

export function readSessionPassed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSessionPassed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage 불가 환경은 서버 memberType으로만 판정
  }
}
