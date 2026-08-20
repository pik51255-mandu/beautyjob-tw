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
  countSalons, countSalonsByDistrict, getSalonByTaxId,
  listNearbySalons, listSalonsByDistrict, type SalonRow,
} from "./db";
import { ADJACENT_DISTRICTS, DISTRICT_SLUGS, districtForSlug, slugForDistrict } from "../shared/districts";

const SITE = "台灣美髮平台";
const SOURCE_NOTE = "資料來源：經濟部商工行政資料開放平臺・高雄市政府民政局門牌坐標";
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

  const ldBlocks = (o.ld ?? []).map(
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
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  return `${proto}://${req.get("host")}`;
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

  const crumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "高雄市", item: `${origin(req)}/salons` },
      { "@type": "ListItem", position: 2, name: s.district, item: slug ? `${origin(req)}/area/${slug}` : undefined },
      { "@type": "ListItem", position: 3, name: s.name, item: url },
    ],
  };

  const mapBlock = hasGeo ? `
<section>
  <h2>位置</h2>
  <div class="map" id="map" data-lat="${esc(s.lat)}" data-lng="${esc(s.lng)}" data-name="${esc(s.name)}"></div>
</section>` : "";

  const parkingBlock = s.parking.length ? `
<section>
  <h2>附近停車</h2>
  <p class="meta">以下距離為地圖上的<strong>直線距離</strong>，非實際步行路線。</p>
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

  const body = `
<h1>${esc(s.name)}</h1>
<p class="meta">${esc(s.address)}</p>
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
    breadcrumb: [
      { name: "高雄市", url: "/salons" },
      { name: s.district, url: slug ? `/area/${slug}` : undefined },
      { name: s.name },
    ],
    ld: [ld, crumbLd],
    body,
    leaflet: hasGeo,
    script: hasGeo ? `
(function(){var el=document.getElementById('map');if(!el||!window.L)return;
var la=parseFloat(el.dataset.lat),ln=parseFloat(el.dataset.lng);
var m=L.map(el,{scrollWheelZoom:false}).setView([la,ln],17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);
L.marker([la,ln]).addTo(m).bindPopup(el.dataset.name);})();` : undefined,
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

  const body = `
<h1>${esc(district)}美髮沙龍</h1>
<p class="meta">共 ${list.length} 家（其中 ${pts.length} 家有座標）</p>

<div class="sticky-map">
  ${pts.length ? `<div class="map" id="map"></div>` : `<p class="meta">此區尚無可顯示的座標資料。</p>`}
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
    breadcrumb: [{ name: "高雄市", url: "/salons" }, { name: district }],
    ld: [{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${district}美髮沙龍一覽`,
      url,
      numberOfItems: list.length,
    }],
    body,
    leaflet: pts.length > 0,
    script: pts.length ? `
(function(){var el=document.getElementById('map');if(!el||!window.L)return;
var pts=${jsonLd(pts)};
var m=L.map(el,{scrollWheelZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);
var b=[];pts.forEach(function(p){
  var mk=L.marker([p.la,p.ln]).addTo(m).bindPopup(p.n);
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
  const body = `
<h1>高雄市美髮沙龍</h1>
<p class="meta">共 ${total} 家，涵蓋 ${counts.length} 個行政區。依家數排序。</p>
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
    breadcrumb: [{ name: "高雄市" }],
    ld: [{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "高雄市美髮沙龍一覽",
      url,
      numberOfItems: total,
    }],
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
    breadcrumb: [{ name: "資料更正／下架申請" }],
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
}

export const SALON_PAGE_PATHS = ["/salons", "/area/:slug", "/salon/:taxId", "/data-request"];
export { DISTRICT_SLUGS };
