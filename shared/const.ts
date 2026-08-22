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
/**
 * 사이트 공개(검색 색인) 스위치. **이 한 줄이 색인 관련 전부를 제어한다.**
 *
 * false — 검색엔진에 노출하지 않는다:
 *   · 전 페이지 meta robots 가 noindex 가 된다 (SPA 는 빌드 시 index.html 주입,
 *     서버 렌더 페이지는 salonPages 가 이 값으로 찍는다)
 *   · IndexNow 핑이 나가지 않는다 (geo.ts INDEXNOW_ENABLED)
 *   · robots.txt 는 **크롤 허용을 유지한다** — 크롤을 막으면 봇이 noindex 를 읽지 못해
 *     오히려 색인이 남는다. 여기는 건드리지 않는다
 *   · sitemap.xml 은 그대로 둔다 (재공개 시 즉시 재사용)
 *   · 사이트 접속 자체는 정상이다. 닫는 것은 검색 노출뿐이다
 *
 * 재공개는 **이 값을 true 로 바꾸는 것 하나로 끝나야 한다.** 다른 데 색인 여부를
 * 하드코딩하지 말 것 — 테스트도 이 값에서 기대치를 파생한다.
 *
 * ⚠️ 세션이 임의로 true 로 바꾸지 않는다. 선후 승인이 있을 때만 (v27 판정).
 */
export const SITE_PUBLIC = false;

/** meta robots 에 찍을 값. noindex 여도 follow 는 남긴다 — 내부 링크는 계속 따라가게. */
export const ROBOTS_INDEXABLE = "index, follow";
export const ROBOTS_BLOCKED = "noindex, follow";

/** 사이트 기본 robots 값. 페이지별 예외(?lang=ko 등)는 각 페이지가 더 좁게 덮어쓴다. */
export const SITE_ROBOTS_CONTENT = SITE_PUBLIC ? ROBOTS_INDEXABLE : ROBOTS_BLOCKED;

export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
