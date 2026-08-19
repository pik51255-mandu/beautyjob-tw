export const COOKIE_NAME = "app_session_id";

// v4 커뮤니티 런칭: 채용(구인·이력서) 기능은 Phase 2 전까지 잠금.
// true로 바꾸면 메뉴·라우트·서버 뮤테이션이 다시 열린다.
export const FEATURES = {
  JOBS_ENABLED: false,
  // 店面頂讓 게시판 잠금 (D-1). 재오픈 조건 — 변호사 확인 + 운영 인력 확보 후 별도 지시.
  TRANSFER_ENABLED: false,
  // 開店成本試算器의 "看店面頂讓物件" CTA — TRANSFER_ENABLED 재오픈 전까지 false 유지
  TRANSFER_CTA_ENABLED: false,
  // 二手器材 게시판 잠금 (D-2). 재오픈 조건 — 거래 분쟁 대응 방침 확정 후 별도 지시.
  USED_ITEMS_ENABLED: false,
  // LINE 로그인 잠금 (D-2a). 재활성 조건 — beautyjob.tw DNS 연결 + LINE 콘솔 콜백 등록.
  LINE_LOGIN_ENABLED: false,
} as const;
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
