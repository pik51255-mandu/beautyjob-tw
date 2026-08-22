/**
 * sitemap.xml 생성 (생성만 — 어디에도 제출하지 않는다)
 *
 * ⚠️ 제출 시점은 shared/const.ts 의 SITE_PUBLIC 이 정한다.
 * v27 현재 SITE_PUBLIC=false — 사이트가 noindex 다. **지금 제출하지 않는다.**
 * (noindex 인 페이지의 sitemap 을 제출하면 색인 요청과 차단을 동시에 보내는 꼴이다)
 * 생성 자체는 언제든 해도 된다. 재공개 승인 후 제출한다.
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { DISTRICT_SLUGS } from "../shared/districts.ts";

const BASE = process.env.SITE_BASE_URL || "https://www.beautyjob.tw";
const OUT = path.resolve("client/public/sitemap.xml");

const raw = process.env.DATABASE_URL;
if (!raw) { console.error("[sitemap] DATABASE_URL 없음"); process.exit(1); }
const u = new URL(raw);
const ca = process.env.DATABASE_CA_CERT;
const conn = await mysql.createConnection({
  host: u.hostname, port: Number(u.port || 3306),
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ""),
  ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
});

const [salonRows] = await conn.query("SELECT taxId FROM salons ORDER BY taxId");
const [districtRows] = await conn.query("SELECT DISTINCT district FROM salons");
await conn.end();

const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: "/", pri: "1.0", freq: "weekly" },
  { loc: "/salons", pri: "0.9", freq: "monthly" },
  { loc: "/supply-map", pri: "0.7", freq: "monthly" },
];
for (const r of districtRows) {
  const slug = DISTRICT_SLUGS[r.district];
  if (slug) urls.push({ loc: `/area/${slug}`, pri: "0.8", freq: "monthly" });
}
for (const r of salonRows) urls.push({ loc: `/salon/${r.taxId}`, pri: "0.6", freq: "monthly" });

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((x) => `  <url>
    <loc>${BASE}${x.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${x.freq}</changefreq>
    <priority>${x.pri}</priority>
  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(OUT, xml);
console.log(`[sitemap] ${urls.length} URL → ${OUT}`);
console.log(`[sitemap] 내역: 고정 3 + 행정구 ${districtRows.length} + 살롱 ${salonRows.length}`);
console.log("[sitemap] 색인 개시 완료 — 이 파일은 검색엔진에 제출 가능하다.");
