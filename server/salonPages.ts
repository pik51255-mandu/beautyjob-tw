/**
 * 살롱 서버 렌더 페이지 (/salons · /area/:slug · /salon/:taxId)
 *
 * 왜 서버 렌더인가: 크롤러가 자바스크립트 없이 본문을 읽어야 한다.
 * 프레임워크 교체 없이 기존 Express 안에서 해결한다 — SPA 정적 서빙보다 먼저
 * 이 라우트들을 등록하고, HTML 을 직접 조립해 돌려준다.
 *
 * SPA 와의 공존: 이 세 경로는 직접 진입이든 링크 클릭이든 항상 서버 HTML 이다
 * (일반 <a> 링크). 나머지 사이트는 종전대로 SPA 가 담당하며, 서버 페이지에서
 * 사이트로 돌아가는 링크를 통해 SPA 로 진입한다.
 *
 * 도메인 연결 전이므로 전 페이지 noindex — 색인 개시는 별도 블록에서 일괄 해제한다.
 */
import type { Express, Request, Response } from "express";
import {
  countSalons, countSalonsByDistrict, getSalonByTaxId, getSalonStats,
  listNearbySalons, listSalonsByDistrict, type SalonRow, type SalonStats,
} from "./db";
import { ADJACENT_DISTRICTS, DISTRICT_SLUGS, districtForSlug, slugForDistrict } from "../shared/districts";
import {
  COORD_AS_OF, DATA_AS_OF, INDEXNOW_KEY, MAP_ICON_CSS, MAP_ICON_JS, REGISTRY_AS_OF,
  breadcrumbLd, buildRobotsTxt, datasetLd, itemListLd, organizationLd, safeOrigin,
} from "./geo";
import { coordsForLot } from "../shared/parkingLots";

const SITE = "台灣美髮平台";
const SOURCE_NOTE = "資料來源：財政部全國營業（稅籍）登記資料・高雄市政府民政局門牌坐標";
const CACHE = "public, max-age=3600";

export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** JSON-LD 는 </script> 이스케이프가 필요하다. */
function jsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

type LayoutOpts = {
  title: string;
  description: string;
  canonical: string;
  /** 전역 스키마(Organization·Dataset)를 붙일 때 필요한 origin */
  origin: string;
  breadcrumb: { name: string; url?: string }[];
  ld?: unknown[];
  body: string;
  leaflet?: boolean;
  /** Leaflet 로드 이후에 실행돼야 하는 스크립트 (body 끝에 붙는다) */
  script?: string;
};

function layout(o: LayoutOpts): string {
  const crumbs = o.breadcrumb.map((c, i) =>
    c.url && i < o.breadcrumb.length - 1
      ? `<a href="${esc(c.url)}">${esc(c.name)}</a>`
      : `<span aria-current="page">${esc(c.name)}</span>`
  ).join('<span class="sep">›</span>');

  // 전역 스키마는 모든 서버 렌더 페이지에 공통으로 싣는다.
  const allLd = [organizationLd(o.origin), datasetLd(o.origin), ...(o.ld ?? [])];
  const ldBlocks = allLd.map(
    (l) => `<script type="application/ld+json">${jsonLd(l)}</script>`).join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${esc(o.canonical)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="website">
${o.leaflet ? '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">' : ""}
${ldBlocks}
<style>
:root{--fg:#0f172a;--mut:#64748b;--line:#e2e8f0;--pri:#e11d48;--bg:#fff;--soft:#f8fafc}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,"PingFang TC","Noto Sans TC",system-ui,sans-serif;color:var(--fg);background:var(--bg);line-height:1.6}
a{color:var(--pri);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:960px;margin:0 auto;padding:16px}
header.site{border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0;z-index:500}
header.site .wrap{display:flex;align-items:center;gap:12px;padding:12px 16px}
.brand{font-weight:700;color:var(--pri);font-size:17px}
nav.crumb{font-size:13px;color:var(--mut);margin:14px 0}
nav.crumb .sep{margin:0 6px;color:var(--line)}
h1{font-size:26px;margin:6px 0 4px}
h2{font-size:19px;margin:26px 0 10px}
.meta{color:var(--mut);font-size:14px;margin:2px 0}
.lead{font-size:16px;margin:10px 0 14px;max-width:70ch}
table{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left}
th{background:var(--soft);font-weight:600}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.bar{display:inline-block;height:9px;background:var(--pri);opacity:.75;border-radius:2px;vertical-align:middle}
.card{border:1px solid var(--line);border-radius:12px;padding:14px;margin:8px 0;background:var(--bg)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.pill{display:inline-block;font-size:12px;color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:2px 9px;margin-right:6px}
.map{height:320px;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:10px 0}
.list a{display:block;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin:6px 0;color:var(--fg)}
.list a:hover{border-color:var(--pri);text-decoration:none}
.list .nm{font-weight:600;display:block}
.list .ad{font-size:13px;color:var(--mut);display:block;margin-top:2px}
footer.site{border-top:1px solid var(--line);margin-top:36px;padding:18px 0;color:var(--mut);font-size:12.5px}
.parking li{margin:8px 0}
.sticky-map{position:sticky;top:64px}
@media(max-width:760px){.sticky-map{position:static}}
.hubgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.hubgrid a{border:1px solid var(--line);border-radius:12px;padding:12px;color:var(--fg)}
.hubgrid a:hover{border-color:var(--pri);text-decoration:none}
.hubgrid .n{font-weight:600}.hubgrid .c{font-size:13px;color:var(--mut)}
${o.leaflet ? MAP_ICON_CSS : ""}
</style>
</head>
<body>
<header class="site"><div class="wrap"><a class="brand" href="/">${esc(SITE)}</a>
<a href="/salons" style="font-size:14px">美髮沙龍</a>
<a href="/supply-map" style="font-size:14px">美材行地圖</a></div></header>
<main class="wrap">
<nav class="crumb">${crumbs}</nav>
${o.body}
</main>
<footer class="site"><div class="wrap">
<p>${esc(SOURCE_NOTE)}</p>
<p>本平台僅提供資訊交流，不介入任何會員間交易。資料如有錯誤，歡迎<a href="/data-request">申請更正或下架</a>。</p>
<p>© 2026 ${esc(SITE)}</p>
</div></footer>
${o.leaflet ? '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>' : ""}
${o.script ? `<script>${o.script}</script>` : ""}
</body></html>`;
}

function origin(req: Request): string {
  // M13: Host / X-Forwarded-Proto 를 그대로 믿지 않는다 (geo.safeOrigin 참고).
  return safeOrigin(req.get("host"), (req.headers["x-forwarded-proto"] as string) || req.protocol);
}

// ─── /salon/:taxId ───────────────────────────────────────────────────────────
function salonPage(req: Request, s: SalonRow, nearby: { taxId: string; name: string; address: string }[]): string {
  const slug = slugForDistrict(s.district);
  const url = `${origin(req)}/salon/${encodeURIComponent(s.taxId)}`;
  const hasGeo = Boolean(s.lat && s.lng);

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: s.name,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: s.district,
      addressRegion: "高雄市",
      addressCountry: "TW",
    },
  };
  if (hasGeo) ld.geo = { "@type": "GeoCoordinates", latitude: Number(s.lat), longitude: Number(s.lng) };
  if (s.foundedYear) ld.foundingDate = String(s.foundedYear);

  const crumbLd = breadcrumbLd(origin(req), [
    { name: "高雄市", path: "/salons" },
    { name: s.district, path: slug ? `/area/${slug}` : undefined },
    { name: s.name, path: `/salon/${encodeURIComponent(s.taxId)}` },
  ]);

  // 표시 계층 전용: parkingJson 에 좌표가 없으므로 명칭으로 되찾는다(DB 무변경).
  const parkingPins = s.parking
    .map((p) => {
      const c = coordsForLot(p.name);
      return c ? { n: p.name, la: c[0], ln: c[1], d: p.distance, f: p.fee, mo: p.moto, k: p.kind } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const mapBlock = hasGeo ? `
<section>
  <h2>位置</h2>
  <div class="map-legend">
    <span class="k"><span class="sw" style="background:#e11d48"></span>美髮沙龍</span>
    ${parkingPins.length ? `<span class="k"><span class="sw" style="background:#7c3aed"></span>停車場（${parkingPins.length}）</span>` : ""}
  </div>
  <div class="map" id="map" data-lat="${esc(s.lat)}" data-lng="${esc(s.lng)}" data-name="${esc(s.name)}"></div>
</section>` : "";

  const parkingBlock = s.parking.length ? `
<section>
  <h2>附近停車</h2>
  <p class="meta">以下距離為地圖上的<strong>直線距離</strong>，非實際步行路線。最多列出最近的 3 處。</p>
  <ul class="parking">
    ${s.parking.map((p) => `<li>
      <span class="pill">${esc(p.kind)}</span><strong>${esc(p.name)}</strong>
      <span class="meta">直線距離約 ${esc(p.distance)} 公尺</span>
      ${p.fee ? `<div class="meta">收費：${esc(p.fee)}</div>` : ""}
      ${p.moto ? `<div class="meta">機車位：${esc(p.moto)}</div>` : ""}
    </li>`).join("")}
  </ul>
</section>` : "";

  const nearbyBlock = nearby.length ? `
<section>
  <h2>同區其他沙龍</h2>
  <div class="list">
    ${nearby.map((n) => `<a href="/salon/${encodeURIComponent(n.taxId)}">
      <span class="nm">${esc(n.name)}</span><span class="ad">${esc(n.address)}</span></a>`).join("")}
  </div>
  ${slug ? `<p><a href="/area/${slug}">查看 ${esc(s.district)} 全部沙龍 →</a></p>` : ""}
</section>` : "";

  // 인용 최적화: 첫 문단만 읽어도 답이 되는 자기완결 1문장.
  const lead = `${s.name}是位於高雄市${s.district}的美髮沙龍，地址為${s.address}` +
    (s.foundedYear ? `，於${s.foundedYear}年設立` : "") +
    (s.parking.length
      ? `，直線距離 200 公尺內有 ${s.parking.length}${s.parking.length >= 3 ? " 處以上" : " 處"}停車場`
      : "") + "。";

  const body = `
<h1>${esc(s.name)}</h1>
<p class="lead">${esc(lead)}</p>
<p class="meta">
  <span class="pill">${esc(s.district)}</span>
  ${s.foundedYear ? `<span class="pill">設立：${esc(s.foundedYear)}年</span>` : ""}
</p>
${mapBlock}
${parkingBlock}
${nearbyBlock}
<section>
  <h2>資料說明</h2>
  <p class="meta">${esc(SOURCE_NOTE)}。本頁僅呈現公開登記資訊，不含負責人姓名或聯絡電話。</p>
  <p class="meta">資料如有錯誤或需要下架，請至<a href="/data-request">資料更正／下架申請</a>。</p>
</section>
`;

  return layout({
    title: `${s.name}｜${s.district}美髮沙龍｜${SITE}`,
    description: `${s.name}（${s.district}）位於${s.address}。${s.parking.length ? "提供附近停車資訊。" : ""}資料來自政府公開資料。`,
    canonical: url,
    origin: origin(req),
    breadcrumb: [
      { name: "高雄市", url: "/salons" },
      { name: s.district, url: slug ? `/area/${slug}` : undefined },
      { name: s.name },
    ],
    ld: [ld, crumbLd],
    body,
    leaflet: hasGeo,
    script: hasGeo ? `${MAP_ICON_JS}
(function(){var el=document.getElementById('map');if(!el||!window.L)return;
var la=parseFloat(el.dataset.lat),ln=parseFloat(el.dataset.lng);
var parks=${jsonLd(parkingPins)};
var m=L.map(el,{scrollWheelZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
L.marker([la,ln],{icon:salonIcon(true,esc(el.dataset.name)),zIndexOffset:1000})
  .addTo(m).bindPopup('<strong>'+esc(el.dataset.name)+'</strong>');
var b=[[la,ln]];
parks.forEach(function(p){
  var html='<div style="min-width:170px"><strong>'+esc(p.n)+'</strong>'
    +'<div style="font-size:12px;color:#475569;margin-top:2px">'+esc(p.k)+'・直線距離約 '+esc(p.d)+' 公尺</div>'
    +(p.f?'<div style="font-size:12px;margin-top:4px">收費：'+esc(p.f)+'</div>':'')
    +(p.mo?'<div style="font-size:12px;margin-top:2px">機車位：'+esc(p.mo)+'</div>':'')+'</div>';
  L.marker([p.la,p.ln],{icon:parkingIcon()}).addTo(m).bindPopup(html);
  b.push([p.la,p.ln]);});
// 살롱 + P 마커가 모두 들어오게. P 가 없으면 살롱 중심 고정 줌.
if(b.length>1){m.fitBounds(b,{padding:[46,46],maxZoom:18});}else{m.setView([la,ln],17);}
})();` : undefined,
  });
}

// ─── /area/:slug ─────────────────────────────────────────────────────────────
function areaPage(req: Request, district: string, list: SalonRow[]): string {
  const slug = slugForDistrict(district)!;
  const url = `${origin(req)}/area/${slug}`;
  const pts = list.filter((s) => s.lat && s.lng)
    .map((s) => ({ n: s.name, la: Number(s.lat), ln: Number(s.lng), t: s.taxId }));
  const adjacent = (ADJACENT_DISTRICTS[district] ?? [])
    .map((d) => ({ d, s: slugForDistrict(d) })).filter((x) => x.s);

  const withParking = list.filter((s) => s.parking.length).length;
  const years = list.map((s) => s.foundedYear).filter((y): y is number => Boolean(y));
  const oldest = years.length ? Math.min(...years) : null;
  // 인용 최적화: 숫자를 포함한 자기완결 요약 (전부 DB 집계 — 하드코딩 없음)
  const summary =
    `高雄市${district}共有 ${list.length} 家美髮沙龍，其中 ${pts.length} 家已完成門牌坐標定位` +
    (withParking ? `，${withParking} 家在直線距離 200 公尺內有停車場` : "") +
    (oldest ? `。最早的一家設立於 ${oldest} 年` : "") + "。";

  const body = `
<h1>${esc(district)}美髮沙龍</h1>
<p class="lead">${esc(summary)}</p>
<p class="meta">共 ${list.length} 家（其中 ${pts.length} 家有座標）</p>

<div class="sticky-map">
  ${pts.length ? `<div class="map-legend"><span class="k"><span class="sw" style="background:#e11d48"></span>美髮沙龍（${pts.length}）</span></div>
  <div class="map" id="map"></div>` : `<p class="meta">此區尚無可顯示的座標資料。</p>`}
</div>

<h2>全部沙龍</h2>
<div class="list" id="list">
${list.map((s) => `<a href="/salon/${encodeURIComponent(s.taxId)}" id="s-${esc(s.taxId)}">
  <span class="nm">${esc(s.name)}</span><span class="ad">${esc(s.address)}</span></a>`).join("")}
</div>

${adjacent.length ? `<h2>鄰近行政區</h2><p>${adjacent.map((a) => `<a href="/area/${a.s}">${esc(a.d)}</a>`).join("　")}</p>` : ""}
<p><a href="/salons">← 返回全部行政區</a></p>

`;

  return layout({
    title: `${district}美髮沙龍一覽（${list.length} 家）｜${SITE}`,
    description: `高雄市${district}的美髮沙龍共 ${list.length} 家，含地址與地圖位置。資料來自政府公開資料。`,
    canonical: url,
    origin: origin(req),
    breadcrumb: [{ name: "高雄市", url: "/salons" }, { name: district }],
    ld: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${district}美髮沙龍一覽`,
        url,
      },
      // 화면의 실제 목록과 1:1 대응 (상위 100건 — 스키마 비대화 방지)
      itemListLd(origin(req), `${district}美髮沙龍`, list.slice(0, 100).map((s) => ({
        name: s.name, path: `/salon/${encodeURIComponent(s.taxId)}`,
      })), { total: list.length, order: "Ascending" }),
      breadcrumbLd(origin(req), [
        { name: "高雄市", path: "/salons" },
        { name: district, path: `/area/${slug}` },
      ]),
    ],
    body,
    leaflet: pts.length > 0,
    script: pts.length ? `${MAP_ICON_JS}
(function(){var el=document.getElementById('map');if(!el||!window.L)return;
var pts=${jsonLd(pts)};
var m=L.map(el,{scrollWheelZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);
// 허브는 마커가 수백 개라 라벨 없는 소형 가위 핀으로 통일한다(살롱 페이지와 같은 위계).
var b=[];pts.forEach(function(p){
  var mk=L.marker([p.la,p.ln],{icon:salonIcon(false,'')}).addTo(m).bindPopup(p.n);
  mk.on('click',function(){
    var card=document.getElementById('s-'+p.t);
    if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.style.borderColor='#e11d48';}
  });
  b.push([p.la,p.ln]);});
if(b.length)m.fitBounds(b,{padding:[24,24]});})();` : undefined,
  });
}

// ─── /salons ─────────────────────────────────────────────────────────────────
function indexPage(req: Request, counts: { district: string; count: number }[], total: number): string {
  const url = `${origin(req)}/salons`;
  const top = counts[0];
  const summary =
    `本站整理高雄市 ${counts.length} 個行政區、共 ${total} 家美髮沙龍的公開登記資料` +
    (top ? `，其中${top.district}最多，有 ${top.count} 家` : "") +
    `。資料來自財政部全國營業（稅籍）登記資料與高雄市政府民政局門牌坐標，基準日為 ${DATA_AS_OF}。`;

  const body = `
<h1>高雄市美髮沙龍</h1>
<p class="lead">${esc(summary)}</p>
<p class="meta">共 ${total} 家，涵蓋 ${counts.length} 個行政區。依家數排序。<a href="/stats">查看產業統計 →</a></p>
<div class="hubgrid">
${counts.map((c) => {
  const slug = slugForDistrict(c.district);
  return slug ? `<a href="/area/${slug}"><div class="n">${esc(c.district)}</div><div class="c">${c.count} 家</div></a>` : "";
}).join("")}
</div>
<section>
  <h2>資料說明</h2>
  <p class="meta">${esc(SOURCE_NOTE)}。本站僅呈現公開登記資訊，不含負責人姓名或聯絡電話。</p>
  <p class="meta">資料如有錯誤或需要下架，請至<a href="/data-request">資料更正／下架申請</a>。</p>
</section>`;

  return layout({
    title: `高雄市美髮沙龍一覽（${total} 家）｜${SITE}`,
    description: `高雄市 ${counts.length} 個行政區、共 ${total} 家美髮沙龍的地址與位置資訊。資料來自政府公開資料。`,
    canonical: url,
    origin: origin(req),
    breadcrumb: [{ name: "高雄市" }],
    ld: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "高雄市美髮沙龍一覽",
        url,
      },
      itemListLd(origin(req), "高雄市各行政區美髮沙龍", counts
        .filter((c) => slugForDistrict(c.district))
        .map((c) => ({ name: c.district, path: `/area/${slugForDistrict(c.district)}` })),
        { order: "Descending" }),
      breadcrumbLd(origin(req), [{ name: "高雄市", path: "/salons" }]),
    ],
    body,
  });
}


// ─── /stats ──────────────────────────────────────────────────────────────────
// 수치는 전부 DB 집계다. 월간 갱신 시 자동으로 반영되며 하드코딩된 숫자가 없다.
function statsPage(req: Request, st: SalonStats): string {
  const o = origin(req);
  const url = `${o}/stats`;
  const top3 = st.districts.slice(0, 3);
  const thisYear = new Date().getFullYear();
  const newestYear = st.recentYears.find((r) => r.year === thisYear);
  const decadePeak = st.decades.reduce(
    (a, b) => (b.count > a.count ? b : a), st.decades[0] ?? { decade: 0, count: 0 });

  // 상단 자기완결 요약 (40~70단어 상당)
  // M8: 주차 커버리지의 분모는 "좌표가 있어 평가 가능한" 살롱이다.
  //     좌표 없는 건은 "주차장 없음"이 아니라 "미평가"이므로 분모에서 뺀다.
  const parkingRate = st.withCoord ? (st.withParking / st.withCoord) * 100 : 0;
  // M5: 당해년은 아직 진행 중이라 완결 연도와 나란히 두면 오독된다 — 리드에서는 뺀다.
  const lastFullYear = st.recentYears.filter((r) => r.year < thisYear).slice(-1)[0];
  const summary =
    `截至 ${DATA_AS_OF}，高雄市共有 ${st.total} 家美髮沙龍分布於 ${st.districts.length} 個行政區，` +
    `其中 ${top3.map((d) => `${d.district} ${d.count} 家`).join("、")} 為前三名。` +
    `${st.withCoord} 家已完成門牌坐標定位；在這些已定位的沙龍中，` +
    `${st.withParking} 家（${parkingRate.toFixed(1)}%）於直線距離 200 公尺內有停車場。` +
    `開業高峰為 ${decadePeak.decade} 年代（${decadePeak.count} 家）` +
    `${lastFullYear ? `，最近一個完整年度 ${lastFullYear.year} 年新登記 ${lastFullYear.count} 家` : ""}。` +
    `另收錄美材行 ${st.supplyStores} 家。`;

  const maxDist = Math.max(...st.districts.map((d) => d.count), 1);
  const maxDecade = Math.max(...st.decades.map((d) => d.count), 1);
  const maxYear = Math.max(...st.recentYears.map((r) => r.count), 1);

  const body = `
<h1>高雄美髮產業統計</h1>
<p class="lead">${esc(summary)}</p>

<h2>高雄市有多少家美髮沙龍？</h2>
<table>
  <tbody>
    <tr><th>美髮沙龍總數</th><td class="num">${st.total} 家</td></tr>
    <tr><th>涵蓋行政區</th><td class="num">${st.districts.length} 區</td></tr>
    <tr><th>已完成坐標定位</th><td class="num">${st.withCoord} 家（${(st.withCoord / st.total * 100).toFixed(1)}%）</td></tr>
    <tr><th>直線距離 200 公尺內有停車場</th><td class="num">${st.withParking} 家<br><span class="meta">占已定位 ${st.withCoord} 家的 ${parkingRate.toFixed(1)}%</span></td></tr>
    <tr><th>美材行</th><td class="num">${st.supplyStores} 家</td></tr>
  </tbody>
</table>

<h2>哪一區的美髮沙龍最多？</h2>
<table>
  <thead><tr><th>行政區</th><th class="num">家數</th><th class="num">占比</th><th>分布</th></tr></thead>
  <tbody>
    ${st.districts.map((d) => {
      const slug = slugForDistrict(d.district);
      const label = slug ? `<a href="/area/${slug}">${esc(d.district)}</a>` : esc(d.district);
      return `<tr><th>${label}</th><td class="num">${d.count}</td>` +
        `<td class="num">${(d.count / st.total * 100).toFixed(1)}%</td>` +
        `<td><span class="bar" style="width:${Math.round(d.count / maxDist * 160)}px"></span></td></tr>`;
    }).join("")}
  </tbody>
</table>

<h2>美髮沙龍是什麼時候開的？</h2>
<p class="meta">依登記的設立年份分組。</p>
<table>
  <thead><tr><th>年代</th><th class="num">家數</th><th class="num">占比</th><th>分布</th></tr></thead>
  <tbody>
    ${st.decades.map((d) => `<tr><th>${d.decade} 年代</th><td class="num">${d.count}</td>` +
      `<td class="num">${(d.count / st.total * 100).toFixed(1)}%</td>` +
      `<td><span class="bar" style="width:${Math.round(d.count / maxDecade * 160)}px"></span></td></tr>`).join("")}
  </tbody>
</table>

<h2>最近幾年的新登記趨勢如何？</h2>
<p class="meta">公開資料的設立日期以年為單位彙整，因此以年度呈現最近十年。</p>
<table>
  <thead><tr><th>年份</th><th class="num">新登記家數</th><th>分布</th></tr></thead>
  <tbody>
    ${st.recentYears.map((r) => {
      const partial = r.year === thisYear;
      return `<tr><th>${r.year} 年${partial ? `<span class="meta">（截至 ${esc(DATA_AS_OF)}，未滿一年）</span>` : ""}</th>` +
        `<td class="num">${r.count}</td>` +
        `<td><span class="bar" style="width:${Math.round(r.count / maxYear * 160)}px"${partial ? ' data-partial="1"' : ""}></span></td></tr>`;
    }).join("")}
  </tbody>
</table>

<h2>這些資料從哪裡來？</h2>
<table>
  <tbody>
    <tr><th>營業（稅籍）登記資料</th><td>財政部　<span class="meta">擷取日 ${esc(REGISTRY_AS_OF)}</span></td></tr>
    <tr><th>門牌坐標</th><td>高雄市政府民政局　<span class="meta">資料版本 ${esc(COORD_AS_OF)}</span></td></tr>
    <tr><th>停車場資料</th><td>高雄市政府交通局（公有路外・民營路外停車場一覽表）</td></tr>
    <tr><th>更新頻率</th><td>每月更新一次</td></tr>
  </tbody>
</table>
<p class="meta">本站僅呈現公開登記資訊，不含負責人姓名或聯絡電話。資料如有錯誤或需要下架，請至<a href="/data-request">資料更正／下架申請</a>。</p>`;

  return layout({
    title: `高雄美髮產業統計（${st.total} 家）｜${SITE}`,
    description: `高雄市 ${st.total} 家美髮沙龍的行政區分布、開業年代與近十年新登記趨勢統計。資料基準日 ${DATA_AS_OF}。`,
    canonical: url,
    origin: o,
    breadcrumb: [{ name: "高雄市", url: "/salons" }, { name: "產業統計" }],
    // Dataset 은 layout 이 전역으로 이미 싣는다 — 같은 @id 중복을 피한다.
    ld: [
      breadcrumbLd(o, [{ name: "高雄市", path: "/salons" }, { name: "產業統計", path: "/stats" }]),
    ],
    body,
  });
}

// ─── /data-request ───────────────────────────────────────────────────────────
function dataRequestPage(req: Request): string {
  const body = `
<h1>資料更正／下架申請</h1>
<p>本站的沙龍資料來自政府公開資料，若您發現以下情形，歡迎來信告知，我們會儘速處理：</p>
<ul>
  <li>店名、地址或行政區有誤</li>
  <li>店家已歇業或遷址</li>
  <li>希望將該筆資料自本站下架</li>
</ul>
<div class="card">
  <p><strong>聯絡信箱</strong>：<a href="mailto:pik51255@gmail.com">pik51255@gmail.com</a></p>
  <p class="meta">來信請附上店名與統一編號（可從該店頁面網址取得），以利比對。</p>
</div>
<p class="meta">${esc(SOURCE_NOTE)}</p>`;
  // TODO: 도메인 연결 후 전용 도메인 메일로 교체 예정
  return layout({
    title: `資料更正／下架申請｜${SITE}`,
    description: "沙龍資料更正或下架的申請方式。",
    canonical: `${origin(req)}/data-request`,
    origin: origin(req),
    breadcrumb: [{ name: "資料更正／下架申請" }],
    ld: [breadcrumbLd(origin(req), [{ name: "資料更正／下架申請", path: "/data-request" }])],
    body,
  });
}

// ─── 라우트 등록 ─────────────────────────────────────────────────────────────
export function registerSalonPages(app: Express) {
  app.get("/salons", async (req: Request, res: Response) => {
    const [counts, total] = await Promise.all([countSalonsByDistrict(), countSalons()]);
    res.setHeader("Cache-Control", CACHE);
    res.type("html").send(indexPage(req, counts, total));
  });

  app.get("/area/:slug", async (req: Request, res: Response, next) => {
    const district = districtForSlug(req.params.slug);
    if (!district) return next();
    const list = await listSalonsByDistrict(district);
    if (!list.length) return next();
    res.setHeader("Cache-Control", CACHE);
    res.type("html").send(areaPage(req, district, list));
  });

  app.get("/salon/:taxId", async (req: Request, res: Response, next) => {
    if (!/^\d{8}$/.test(req.params.taxId)) return next();
    const s = await getSalonByTaxId(req.params.taxId);
    if (!s) return next();
    const nearby = await listNearbySalons(s.district, s.taxId, 5);
    res.setHeader("Cache-Control", CACHE);
    res.type("html").send(salonPage(req, s, nearby));
  });

  app.get("/data-request", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", CACHE);
    res.type("html").send(dataRequestPage(req));
  });

  app.get("/stats", async (req: Request, res: Response, next) => {
    const st = await getSalonStats();
    if (!st || !st.total) return next();
    res.setHeader("Cache-Control", CACHE);
    res.type("html").send(statsPage(req, st));
  });

  // robots.txt 는 요청 호스트 기준으로 만든다 — Sitemap 절대 URL 이 도메인을 따라간다.
  app.get("/robots.txt", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", CACHE);
    res.type("text/plain").send(buildRobotsTxt(origin(req)));
  });

  // IndexNow 키 검증 파일. 사양상 공개 서빙이 필수다(발사는 별도 플래그로 잠겨 있음).
  app.get(`/${INDEXNOW_KEY}.txt`, (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", CACHE);
    res.type("text/plain").send(INDEXNOW_KEY);
  });
}

export const SALON_PAGE_PATHS = [
  "/salons", "/area/:slug", "/salon/:taxId", "/data-request", "/stats",
  "/robots.txt", `/${INDEXNOW_KEY}.txt`,
];
export { DISTRICT_SLUGS };
