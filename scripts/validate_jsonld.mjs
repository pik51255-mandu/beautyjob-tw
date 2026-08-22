/**
 * 서버 렌더 페이지의 JSON-LD 구조 유효성 검증 (조사·게이트 전용)
 *
 * 검사 항목
 *  - 각 <script type="application/ld+json"> 블록이 파싱되는가
 *  - @context / @type 이 있는가
 *  - 페이지 유형별로 기대하는 타입이 전부 있는가
 *  - 시각 breadcrumb 와 BreadcrumbList 가 일치하는가
 *  - ItemList 의 numberOfItems 가 실제 항목 수와 맞는가
 *  - Dataset 의 출처 필드(creator/sourceOrganization/isBasedOn/dateModified)가 채워졌는가
 *  - 전 페이지 색인 개시(noindex 아님)
 *  - 실콘텐츠 없는 스키마(FAQPage 등)가 섞이지 않았는가
 */
const BASE = process.env.BASE || "http://localhost:5288";

const PAGES = [
  { path: "/salons", expect: ["Organization", "Dataset", "CollectionPage", "ItemList", "BreadcrumbList"] },
  { path: "/area/kh-005", expect: ["Organization", "Dataset", "CollectionPage", "ItemList", "BreadcrumbList"] },
  { path: "/salon/20440821", expect: ["Organization", "Dataset", "HairSalon", "BreadcrumbList"] },
  { path: "/salon/21355512", expect: ["Organization", "Dataset", "HairSalon", "BreadcrumbList"] },
  { path: "/stats", expect: ["Organization", "Dataset", "BreadcrumbList"] },
  { path: "/data-request", expect: ["Organization", "Dataset", "BreadcrumbList"] },
];

const BANNED_TYPES = ["FAQPage", "Question", "Review", "AggregateRating", "Offer"];

let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗"} ${n}${d ? " — " + d : ""}`); };

function extractLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function visibleCrumbs(html) {
  const nav = html.match(/<nav class="crumb">([\s\S]*?)<\/nav>/);
  if (!nav) return [];
  return [...nav[1].matchAll(/>([^<>]+)<\/(?:a|span)>/g)]
    .map((m) => m[1].trim()).filter((s) => s && s !== "›");
}

for (const page of PAGES) {
  console.log(`\n[${page.path}]`);
  const res = await fetch(`${BASE}${page.path}`);
  const html = await res.text();
  ok("HTTP 200", res.status === 200, String(res.status));

  const raw = extractLd(html);
  ok("JSON-LD 블록 존재", raw.length > 0, `${raw.length}개`);

  const parsed = [];
  let parseFail = 0;
  for (const r of raw) {
    try { parsed.push(JSON.parse(r)); } catch (e) { parseFail++; console.log(`      파싱실패: ${String(e).slice(0, 80)}`); }
  }
  ok("전 블록 JSON 파싱", parseFail === 0, `${parsed.length}/${raw.length}`);
  ok("@context 전부 보유", parsed.every((o) => o["@context"] === "https://schema.org"));

  const types = parsed.map((o) => o["@type"]);
  for (const want of page.expect) {
    ok(`${want} 존재`, types.includes(want), types.join(","));
  }
  const banned = types.filter((t) => BANNED_TYPES.includes(t));
  ok("실콘텐츠 없는 스키마 미포함", banned.length === 0, banned.join(","));

  // BreadcrumbList ↔ 시각 breadcrumb 일치
  const bc = parsed.find((o) => o["@type"] === "BreadcrumbList");
  if (bc) {
    const ldNames = bc.itemListElement.map((e) => e.name);
    const vis = visibleCrumbs(html);
    ok("breadcrumb 시각/스키마 일치", JSON.stringify(ldNames) === JSON.stringify(vis),
      `LD=${ldNames.join("›")} / 화면=${vis.join("›")}`);
    ok("position 연속", bc.itemListElement.every((e, i) => e.position === i + 1));
  }

  // ItemList 정합
  const il = parsed.find((o) => o["@type"] === "ItemList");
  if (il) {
    // schema.org: 일부만 열거할 때 numberOfItems 는 전체 개수여야 한다.
    ok("ItemList numberOfItems >= 열거 수", il.numberOfItems >= il.itemListElement.length,
      `${il.numberOfItems} vs ${il.itemListElement.length}`);
    const cp = parsed.find((o) => o["@type"] === "CollectionPage");
    if (cp) ok("CollectionPage 에 numberOfItems 없음(도메인 밖)", !("numberOfItems" in cp));
    ok("ItemList 항목 URL 보유", il.itemListElement.every((e) => typeof e.url === "string" && e.url.startsWith("http")));
  }

  // Dataset 출처
  const dsAll = parsed.filter((o) => o["@type"] === "Dataset");
  ok("Dataset 중복 없음", dsAll.length === 1, `${dsAll.length}개`);
  const ds = dsAll[0];
  if (ds) {
    ok("Dataset creator", Boolean(ds.creator));
    ok("Dataset sourceOrganization", Array.isArray(ds.sourceOrganization) && ds.sourceOrganization.length >= 2);
    ok("Dataset isBasedOn", Array.isArray(ds.isBasedOn) && ds.isBasedOn.length >= 2);
    ok("Dataset dateModified", /^\d{4}-\d{2}-\d{2}$/.test(ds.dateModified || ""), ds.dateModified);
  }

  // Organization @id 참조 무결성
  const org = parsed.find((o) => o["@type"] === "Organization");
  if (org && ds) {
    ok("Dataset→Organization 참조 유효", ds.publisher?.["@id"] === org["@id"], `${ds.publisher?.["@id"]} vs ${org["@id"]}`);
  }

  ok("색인 개시(noindex 아님)", !/name="robots" content="noindex/.test(html));
}

// robots.txt
console.log(`\n[/robots.txt]`);
const rres = await fetch(`${BASE}/robots.txt`);
const robots = await rres.text();
ok("HTTP 200", rres.status === 200);
for (const bot of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "Perplexity-User",
                   "Google-Extended", "Claude-SearchBot", "ClaudeBot", "Claude-User"]) {
  ok(`${bot} 허용`, new RegExp(`User-agent: ${bot}\\nAllow: /`).test(robots));
}
ok("일반 봇 허용", /User-agent: \*\nAllow: \//.test(robots));
ok("비공개 경로 차단", ["/admin", "/mypage", "/api/"].every((p) => robots.includes(`Disallow: ${p}`)));
const host = new URL(BASE).origin;
ok("Sitemap 호스트 동적 정합", robots.includes(`Sitemap: ${host}/sitemap.xml`),
  (robots.match(/Sitemap: .*/) || [""])[0]);

console.log(`\n=== JSON-LD 검증: 통과 ${pass} / 실패 ${fail} ===`);
process.exit(fail ? 1 : 0);
