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
