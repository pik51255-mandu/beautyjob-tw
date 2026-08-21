export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 독립 서버 모드: Manus OAuth 대신 자체 로그인 페이지 사용
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // 독립 서버 모드: 자체 로그인 페이지로 이동
  if (!oauthPortalUrl || !appId || oauthPortalUrl === "undefined") {
    const base = "/login";
    if (returnPath) {
      return `${base}?returnPath=${encodeURIComponent(returnPath)}`;
    }
    return base;
  }

  // Manus OAuth 모드 (기존 코드)
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};

/**
 * 앱 안에서 401 을 만났을 때 보낼 곳.
 *
 * getLoginUrl() 은 환경변수 설정에 따라 외부 OAuth 포털로 나갈 수 있는데,
 * 작업 도중 401 이 났다고 사이트 밖으로 튕기면 입력하던 내용이 통째로 날아간다
 * (눈검사 G: /onboarding 에서 실제로 그랬다).
 * 세션 만료 같은 앱 내부 사정은 항상 자체 로그인 페이지에서 처리하고,
 * returnPath 로 원래 있던 자리로 되돌린다.
 */
export const getInternalLoginUrl = (returnPath?: string) => {
  const path = returnPath ?? (typeof window !== "undefined"
    ? window.location.pathname + window.location.search
    : undefined);
  if (!path || path === "/login") return "/login";
  return `/login?returnPath=${encodeURIComponent(path)}`;
};
