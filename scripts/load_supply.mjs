/**
 * 美材行 tier1+2 적재 (統一編號 기준 upsert — 재실행 안전)
 *
 * 입력: ~/beautyjob-data/kaohsiung_beauty_supply_geocoded.csv
 * 대상: map_tier 가 1 또는 2 이고 좌표가 있는 행만. tier0 은 반입하지 않는다.
 * 좌표는 보간하지 않는다 — 좌표가 없으면 적재 대상에서 제외한다.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mysql from "mysql2/promise";

const BOX = { latMin: 22.45, latMax: 23.48, lngMin: 120.10, lngMax: 121.06 };
const SRC = process.env.SUPPLY_CSV
  || path.join(os.homedir(), "beautyjob-data", "kaohsiung_beauty_supply_geocoded.csv");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map((h) => h.replace(/^﻿/, ""));
  return rows.filter((r) => r.length === header.length)
             .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const raw = process.env.DATABASE_URL;
if (!raw) { console.error("[load] DATABASE_URL 없음"); process.exit(1); }
const u = new URL(raw);
const ca = process.env.DATABASE_CA_CERT;

const all = parseCsv(fs.readFileSync(SRC, "utf8"));
const rows = all.filter((r) => (r.map_tier === "1" || r.map_tier === "2") && r.lat && r.lng);
console.log(`[load] CSV ${all.length}행 → tier1+2 좌표보유 ${rows.length}행`);

const bad = rows.filter((r) => {
  const la = Number(r.lat), ln = Number(r.lng);
  return !(la >= BOX.latMin && la <= BOX.latMax && ln >= BOX.lngMin && ln <= BOX.lngMax);
});
if (bad.length) {
  console.error(`[load] 경계 박스 이탈 ${bad.length}건 — 적재 중단`);
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: u.hostname, port: Number(u.port || 3306),
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ""),
  ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
});

let inserted = 0, updated = 0;
for (const r of rows) {
  const [res] = await conn.execute(
    `INSERT INTO supply_stores (taxId, name, address, district, lat, lng, tier, phone, note, coordSource)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), district=VALUES(district),
       lat=VALUES(lat), lng=VALUES(lng), tier=VALUES(tier), phone=VALUES(phone),
       note=VALUES(note), coordSource=VALUES(coordSource)`,
    [r["統一編號"], r["營業人名稱"], r["營業地址"], r["行政區"], r.lat, r.lng,
     Number(r.map_tier), r["전화"] || null, r["비고"] || null, r["좌표출처"] || ""]
  );
  if (res.affectedRows === 1) inserted++; else if (res.affectedRows === 2) updated++;
}

const [[cnt]] = await conn.query("SELECT COUNT(*) AS c FROM supply_stores");
const [[dup]] = await conn.query("SELECT COUNT(*) - COUNT(DISTINCT taxId) AS d FROM supply_stores");
const [[oob]] = await conn.query(
  `SELECT COUNT(*) AS c FROM supply_stores
   WHERE lat NOT BETWEEN ? AND ? OR lng NOT BETWEEN ? AND ?`,
  [BOX.latMin, BOX.latMax, BOX.lngMin, BOX.lngMax]
);
const [tiers] = await conn.query("SELECT tier, COUNT(*) AS c FROM supply_stores GROUP BY tier ORDER BY tier");
console.log(`[load] 신규 ${inserted} / 갱신 ${updated}`);
console.log(`[load] 검증 — 총 ${cnt.c}행 | 統編 중복 ${dup.d} | 박스이탈 ${oob.c}`);
for (const t of tiers) console.log(`         tier${t.tier}: ${t.c}행`);
await conn.end();
