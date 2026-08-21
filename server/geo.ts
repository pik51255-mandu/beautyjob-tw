/**
 * GEO(생성형 엔진 최적화) 공통 재료 — 전역 스키마·robots·IndexNow.
 *
 * 원칙: 실제 페이지에 존재하는 콘텐츠만 스키마로 선언한다.
 * FAQPage 처럼 실물 Q&A 가 없는 타입은 넣지 않는다.
 *
 * 색인 정책: 도메인 연결 전이므로 전 페이지 noindex 를 유지한다.
 * robots.txt 는 "크롤 허용 + 색인 차단" 조합이며, 이는 의도된 상태다 —
 * AI 검색 봇이 크롤 규칙 때문에 막히지 않도록 미리 열어두되,
 * 실제 색인은 meta robots 로 차단한다. 해제는 도메인 연결 블록에서 일괄.
 */

// M10: 원천이 둘이고 vintage 가 다르므로 따로 둔다. 월간 갱신 시 둘 다 갱신한다.
/** 門牌坐標 파일 판(kh_address_2026-08-10). */
export const COORD_AS_OF = "2026-08-10";
/** 財政部 營業(稅籍)登記 자료 추출일(BGMOPEN1.csv). */
export const REGISTRY_AS_OF = "2026-08-19";
/** 대외 표기용 기준일 — 둘 중 나중 것. */
export const DATA_AS_OF = REGISTRY_AS_OF;

export const SITE_NAME = "台灣美髮平台";
export const SITE_DESC = "高雄市美髮沙龍與美材行的公開資料整理平台";

/** 검색계·AI 봇 화이트리스트 — 전면 허용. */
export const AI_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Claude-SearchBot",
  "ClaudeBot",
  "Claude-User",
];

/** 일반 봇에도 공통 적용하는 비공개 경로. */
export const DISALLOWED_PATHS = [
  "/admin",
  "/mypage",
  "/login",
  "/register",
  "/onboarding",
  "/api/",
];

/**
 * robots.txt 를 요청 호스트 기준으로 생성한다.
 * Sitemap 절대 URL 이 호스트를 따라가므로 도메인 연결 시 자동으로 정합된다.
 */
export function buildRobotsTxt(origin: string): string {
  // RFC 9309: 크롤러는 자기에게 맞는 그룹 하나만 따르고 나머지는 무시한다.
  // 따라서 개별 봇 그룹에도 Disallow 를 반드시 되풀이해야 한다 —
  // 빠뜨리면 이름을 적어준 봇에게만 비공개 경로가 열린다.
  const disallow = DISALLOWED_PATHS.map((p) => `Disallow: ${p}`).join("\n");

  const aiBlocks = AI_BOTS.map((bot) =>
    `User-agent: ${bot}\nAllow: /\n${disallow}`
  ).join("\n\n");

  const general = ["User-agent: *", "Allow: /", disallow].join("\n");

  return `# 檢索與 AI 檢索爬蟲：全面允許
# 個別頁面的索引與否由各頁 meta robots 決定（目前為 noindex，網域接上後統一解除）
${aiBlocks}

${general}

Sitemap: ${origin}/sitemap.xml
`;
}

// ─── 전역 JSON-LD ────────────────────────────────────────────────────────────

export function organizationLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: SITE_NAME,
    url: origin,
    description: SITE_DESC,
    areaServed: { "@type": "City", name: "高雄市", addressCountry: "TW" },
  };
}

/**
 * 사이트가 제공하는 데이터셋 자체의 출처를 기계가 읽을 수 있게 선언한다.
 * creator / sourceOrganization / isBasedOn 에 원천 기관을 명시한다.
 */
export function datasetLd(origin: string, opts?: { size?: number }) {
  const moi = {
    "@type": "GovernmentOrganization",
    name: "高雄市政府民政局",
    url: "https://cabu.kcg.gov.tw/",
  };
  // 실제 원천은 財政部의 營業(稅籍)登記 자료다(BGMOPEN1.csv).
  // 經濟部 商工行政자료(GCIS)는 이 데이터셋에 쓰이지 않았다.
  const mof = {
    "@type": "GovernmentOrganization",
    name: "財政部財政資訊中心",
    url: "https://data.gov.tw/dataset/9400",
  };
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${origin}/#dataset`,
    name: "高雄市美髮沙龍公開資料集",
    description:
      "以財政部全國營業（稅籍）登記資料為基礎，" +
      "join 高雄市政府民政局門牌坐標後產生的高雄市美髮沙龍位置資料集。不含負責人姓名與聯絡電話。",
    url: `${origin}/stats`,
    inLanguage: "zh-Hant-TW",
    isAccessibleForFree: true,
    dateModified: DATA_AS_OF,
    spatialCoverage: { "@type": "Place", name: "高雄市, 臺灣" },
    creator: { "@id": `${origin}/#organization` },
    publisher: { "@id": `${origin}/#organization` },
    sourceOrganization: [mof, moi],
    isBasedOn: [
      {
        "@type": "Dataset",
        name: "財政部 — 全國營業（稅籍）登記資料",
        creator: mof,
        url: "https://data.gov.tw/dataset/9400",
        dateModified: REGISTRY_AS_OF,
      },
      {
        "@type": "Dataset",
        name: "高雄市政府民政局 — 門牌坐標資料",
        creator: moi,
        url: "https://cabu.kcg.gov.tw/",
        dateModified: COORD_AS_OF,
      },
    ],
    ...(opts?.size ? { size: `${opts.size} 筆` } : {}),
  };
}

/** 시각 breadcrumb 와 1:1 로 대응하는 BreadcrumbList. */
export function breadcrumbLd(
  origin: string,
  items: { name: string; path?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: `${origin}${it.path}` } : {}),
    })),
  };
}

/** 허브의 실제 목록과 대응하는 ItemList. */
export function itemListLd(
  origin: string,
  name: string,
  items: { name: string; path: string }[],
  opts?: { total?: number; order?: "Ascending" | "Descending" }
) {
  // M2: 일부만 열거할 때 numberOfItems 는 전체 개수여야 한다(schema.org 정의).
  // M3: 정렬은 실제 정렬과 다르면 거짓말이므로, 확신할 때만 선언한다.
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: opts?.total ?? items.length,
    ...(opts?.order ? { itemListOrder: `https://schema.org/ItemListOrder${opts.order}` } : {}),
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: `${origin}${it.path}`,
    })),
  };
}

// ─── IndexNow (준비만 — 발사 금지) ───────────────────────────────────────────

/**
 * IndexNow 키. 사양상 공개적으로 서빙해야 하는 값이라 비밀이 아니다
 * (`/{key}.txt` 로 누구나 조회 가능해야 검증이 통과한다).
 */
export const INDEXNOW_KEY = "9f2c4b7e8a1d40f3b6c5e2d7a8f14b03";

/**
 * 활성화 스위치. 도메인 연결 전까지 false 를 유지한다 —
 * noindex 상태에서 핑을 보내면 색인 요청과 색인 차단이 모순된다.
 */
export const INDEXNOW_ENABLED = false;

export type IndexNowResult =
  | { sent: false; reason: string }
  | { sent: true; status: number; count: number };

/**
 * 월간 갱신 배치에서 호출할 핑 함수. INDEXNOW_ENABLED 가 false 면 아무것도 보내지 않는다.
 * 도메인 연결 블록에서 플래그만 켜면 동작한다.
 */
export async function pingIndexNow(
  origin: string,
  urls: string[]
): Promise<IndexNowResult> {
  if (!INDEXNOW_ENABLED) {
    return { sent: false, reason: "INDEXNOW_ENABLED=false (도메인 연결 후 활성화)" };
  }
  if (!urls.length) return { sent: false, reason: "URL 없음" };
  const host = new URL(origin).host;
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000),
    }),
  });
  return { sent: true, status: res.status, count: Math.min(urls.length, 10000) };
}

// ─── 호스트 신뢰 경계 ────────────────────────────────────────────────────────

/**
 * M13: robots.txt·canonical 이 요청 Host 를 그대로 반영하면 공격자가 값을 조종할 수 있고,
 * 1시간 캐시에 오염이 남는다. SITE_BASE_URL 이 있으면 그것을 쓰고,
 * 없으면 호스트 형식을 검증한 뒤 프로토콜을 https 로 고정한다(로컬 개발 제외).
 */
/** 운영 기본 호스트. SITE_BASE_URL 이 없고 Host 가 미허용일 때의 안전한 귀착점. */
export const DEFAULT_ORIGIN = "https://beautyjob-tw.onrender.com";

/** 허용 호스트. 도메인 연결 시 여기(또는 SITE_BASE_URL)에 새 도메인을 추가한다. */
export const ALLOWED_HOSTS = ["beautyjob-tw.onrender.com"];

const LOCAL_RE = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i;

export function safeOrigin(rawHost: string | undefined, rawProto: string | undefined): string {
  const pinned = process.env.SITE_BASE_URL;
  if (pinned) return pinned.replace(/\/+$/, "");
  const host = (rawHost || "").trim().toLowerCase();
  if (LOCAL_RE.test(host)) {
    return `${rawProto === "https" ? "https" : "http"}://${host}`;
  }
  // 허용목록에 없는 Host 는 반영하지 않는다 — 캐시 오염·링크 위조 방지.
  return ALLOWED_HOSTS.includes(host.split(":")[0]) ? `https://${host}` : DEFAULT_ORIGIN;
}

// ─── 지도 마커 위계 (표시 계층) ──────────────────────────────────────────────
// 아이콘은 전부 인라인 SVG 자작이다 — 외부 아이콘 CDN·타사 에셋을 쓰지 않는다.

/** 브랜드 로즈 계열 / 주차 보라 계열. */
export const PIN_COLORS = { salon: "#e11d48", parking: "#7c3aed" };

/**
 * 지도 스크립트가 공통으로 쓰는 아이콘 팩토리.
 * Leaflet divIcon + 인라인 SVG. 브라우저에서 실행되므로 문자열로 내보낸다.
 */
export const MAP_ICON_JS = `
var PIN=${JSON.stringify(PIN_COLORS)};
function svgScissors(size,color){
  var s=size;
  return '<svg viewBox="0 0 24 24" width="'+s+'" height="'+s+'" aria-hidden="true">'
    +'<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'
    +'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>'
    +'<line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>'
    +'<line x1="8.12" y1="8.12" x2="12" y2="12"/></g>'
    +'<g fill="none" stroke="'+color+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    +'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>'
    +'<line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>'
    +'<line x1="8.12" y1="8.12" x2="12" y2="12"/></g></svg>';
}
/** 살롱 핀 — 물방울 배경 + 가위. big=개별 페이지용 큰 핀. */
function salonIcon(big,label){
  var w=big?42:26,h=big?54:34,ic=big?20:13;
  var html='<div class="pin pin-salon'+(big?' pin-big':'')+'">'
    +'<svg class="pin-drop" viewBox="0 0 42 54" width="'+w+'" height="'+h+'">'
    +'<path d="M21 53C21 53 39 32.5 39 20.5C39 10.28 30.94 2 21 2C11.06 2 3 10.28 3 20.5C3 32.5 21 53 21 53Z" '
    +'fill="'+PIN.salon+'" stroke="#fff" stroke-width="3"/></svg>'
    +'<span class="pin-ico">'+svgScissors(ic,PIN.salon)+'</span>'
    +(label?'<span class="pin-label">'+label+'</span>':'')+'</div>';
  return L.divIcon({className:'',html:html,iconSize:[w,h],iconAnchor:[w/2,h],popupAnchor:[0,-h+6]});
}
/** 주차 핀 — 소형 원형 P. */
function parkingIcon(){
  var d=22;
  var html='<div class="pin pin-park"><svg viewBox="0 0 22 22" width="'+d+'" height="'+d+'">'
    +'<circle cx="11" cy="11" r="9.2" fill="'+PIN.parking+'" stroke="#fff" stroke-width="2.4"/>'
    +'<text x="11" y="15.2" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" '
    +'font-family="-apple-system,system-ui,sans-serif">P</text></svg></div>';
  return L.divIcon({className:'',html:html,iconSize:[d,d],iconAnchor:[d/2,d/2],popupAnchor:[0,-d/2]});
}
`;

/** 마커 라벨·핀용 CSS. layout 의 <style> 에 합류한다. */
export const MAP_ICON_CSS = `
.pin{position:relative;display:block;line-height:0}
.pin-ico{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);line-height:0}
.pin-big .pin-ico{top:36%}
.pin-label{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:2px;
  white-space:nowrap;font-size:11.5px;font-weight:600;color:#0f172a;line-height:1.3;
  background:rgba(255,255,255,.88);border-radius:4px;padding:1px 5px;
  box-shadow:0 1px 2px rgba(0,0,0,.12)}
.leaflet-marker-icon .pin-park{filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.map-legend{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:6px 0 2px;font-size:13px;color:var(--mut)}
.map-legend .k{display:inline-flex;align-items:center;gap:5px}
.map-legend .sw{width:12px;height:12px;border-radius:999px;display:inline-block;border:2px solid #fff;
  box-shadow:0 0 0 1px var(--line)}
`;
