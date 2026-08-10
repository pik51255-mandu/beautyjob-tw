export const COOKIE_NAME = "app_session_id";

// v4 커뮤니티 런칭: 채용(구인·이력서) 기능은 Phase 2 전까지 잠금.
// true로 바꾸면 메뉴·라우트·서버 뮤테이션이 다시 열린다.
export const FEATURES = {
  JOBS_ENABLED: false,
} as const;
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
