/**
 * sitemap.xml 생성 (생성만 — 어디에도 제출하지 않는다)
 *
 * 신규 살롱 페이지는 전부 noindex 상태라 색인되지 않는다. 이 파일은 도메인 연결
 * 블록에서 noindex 를 일괄 해제한 뒤 제출하기 위한 준비물이다.
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { DISTRICT_SLUGS } from "../shared/districts.ts";

const BASE = process.env.SITE_BASE_URL || "https://beautyjob-tw.onrender.com";
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
console.log("[sitemap] 주의: 신규 페이지는 noindex 상태이며 이 파일은 제출하지 않는다.");
