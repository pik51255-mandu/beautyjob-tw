/**
 * 高雄市 미용실 3,382건 적재 (統一編號 기준 upsert — 재실행 안전)
 *
 * 입력
 *  - ~/beautyjob-data/kaohsiung_hair_geocoded.csv        (3,382행: 상호·주소·행정구·좌표)
 *  - ~/beautyjob-data-spike/kaohsiung_hair.csv            (設立日期 원본 — 統編으로 병합)
 *  - ~/beautyjob-data/parking_src/public.json             (공영 주차장 261)
 *  - ~/beautyjob-data/parking_private_geocoded.csv        (민영 좌표화분 — 매칭 620)
 *
 * 원칙
 *  - 좌표 없는 68행도 그대로 적재한다(lat/lng NULL). 보간·도로중심점 대체 금지.
 *  - 負責人(대표자) 성명은 읽지도 저장하지도 않는다.
 *  - parkingJson 은 적재 시점에 사전 계산한다 — 런타임 지오 연산을 하지 않기 위함.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mysql from "mysql2/promise";

const HOME = os.homedir();
const DATA = path.join(HOME, "beautyjob-data");
const GEO = process.env.SALON_CSV || path.join(DATA, "kaohsiung_hair_geocoded.csv");
const RAW = process.env.SALON_RAW_CSV || path.join(HOME, "beautyjob-data-spike", "kaohsiung_hair.csv");
const PUB = path.join(DATA, "parking_src", "public.json");
const PRIV = path.join(DATA, "parking_private_geocoded.csv");

const BOX = { latMin: 22.45, latMax: 23.48, lngMin: 120.10, lngMax: 121.06 };
const RADIUS_M = 200;
const MAX_LOTS = 3;

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

/** 민국력 YYYMMDD(예: 1040413) → 서기 연도(2015). 유효하지 않으면 null. */
function rocToYear(v) {
  const s = String(v || "").trim();
  if (!/^\d{6,7}$/.test(s)) return null;
  const roc = Number(s.slice(0, s.length - 4));
  if (!roc || roc < 1 || roc > 200) return null;
  const year = roc + 1911;
  if (year < 1912 || year > new Date().getFullYear() + 1) return null;
  return year;
}

const R = 6371000;
function hav(a1, o1, a2, o2) {
  const p1 = a1 * Math.PI / 180, p2 = a2 * Math.PI / 180;
  const dp = (a2 - a1) * Math.PI / 180, dl = (o2 - o1) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 요금 문자열을 카드에 실을 만큼만 줄인다. */
function feeSummary(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > 60 ? t.slice(0, 59) + "…" : t;
}

// ─── 주차장 통합 목록 ────────────────────────────────────────────────────────
const lots = [];
for (const r of JSON.parse(fs.readFileSync(PUB, "utf8")).data) {
  const la = Number(r["緯度"]), ln = Number(r["經度"]);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
  if (la < BOX.latMin || la > BOX.latMax || ln < BOX.lngMin || ln > BOX.lngMax) continue;
  lots.push({ name: r["場名"], lat: la, lng: ln, fee: feeSummary(r["收費標準"]),
              moto: String(r["機車"] ?? "").trim() || null, kind: "公有" });
}
for (const r of parseCsv(fs.readFileSync(PRIV, "utf8"))) {
  if (r["판정"] !== "매칭") continue;
  const la = Number(r.lat), ln = Number(r.lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
  lots.push({ name: r["停車場名稱"], lat: la, lng: ln, fee: feeSummary(r["收費標準"]),
              moto: String(r["機車"] ?? "").trim() || null, kind: "民營" });
}
console.log(`[load] 주차장 통합 ${lots.length}곳 (공영 ${lots.filter(l => l.kind === "公有").length} + 민영 ${lots.filter(l => l.kind === "民營").length})`);

// 근접 탐색용 격자 (0.004도 ≈ 440m > 200m 반경)
const CELL = 0.004;
const grid = new Map();
for (const l of lots) {
  const k = `${Math.floor(l.lat / CELL)},${Math.floor(l.lng / CELL)}`;
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(l);
}
function nearbyLots(lat, lng) {
  const gy = Math.floor(lat / CELL), gx = Math.floor(lng / CELL);
  const found = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    for (const l of grid.get(`${gy + dy},${gx + dx}`) || []) {
      const d = hav(lat, lng, l.lat, l.lng);
      if (d <= RADIUS_M) found.push({ ...l, d: Math.round(d) });
    }
  }
  return found.sort((a, b) => a.d - b.d).slice(0, MAX_LOTS)
    .map((l) => ({ name: l.name, kind: l.kind, distance: l.d, fee: l.fee, moto: l.moto }));
}

// ─── 살롱 ────────────────────────────────────────────────────────────────────
const geo = parseCsv(fs.readFileSync(GEO, "utf8"));
const rawRows = parseCsv(fs.readFileSync(RAW, "utf8"));
const foundedBy = new Map();
let rocParsed = 0;
for (const r of rawRows) {
  const y = rocToYear(r["設立日期"]);
  if (y) { foundedBy.set(r["統一編號"], y); rocParsed++; }
}
console.log(`[load] 設立日期 파싱 ${rocParsed}/${rawRows.length}행 → 統編 매핑 ${foundedBy.size}건`);

const oob = geo.filter((r) => {
  if (!r.lat || !r.lng) return false;
  const la = Number(r.lat), ln = Number(r.lng);
  return !(la >= BOX.latMin && la <= BOX.latMax && ln >= BOX.lngMin && ln <= BOX.lngMax);
});
if (oob.length) { console.error(`[load] 경계 박스 이탈 ${oob.length}건 — 적재 중단`); process.exit(1); }

const raw = process.env.DATABASE_URL;
if (!raw) { console.error("[load] DATABASE_URL 없음"); process.exit(1); }
const u = new URL(raw);
const ca = process.env.DATABASE_CA_CERT;
const conn = await mysql.createConnection({
  host: u.hostname, port: Number(u.port || 3306),
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ""),
  ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
});
console.log(`[load] DB 접속 (CA 고정 ${ca ? "적용" : "미적용"})`);

// 원격 DB 왕복이 비싸므로 배치 upsert 로 넣는다 (1건씩이면 3,382 × RTT).
const BATCH = 200;
let affected = 0, withParking = 0, withCoord = 0, withYear = 0;
const payload = geo.map((r) => {
  const hasCoord = Boolean(r.lat && r.lng);
  const parking = hasCoord ? nearbyLots(Number(r.lat), Number(r.lng)) : [];
  const parkingJson = parking.length ? JSON.stringify(parking) : null;
  const foundedYear = foundedBy.get(r["統一編號"]) ?? null;
  if (hasCoord) withCoord++;
  if (parkingJson) withParking++;
  if (foundedYear) withYear++;
  return [r["統一編號"], r["營業人名稱"], r["營業地址"], r["行政區"],
          hasCoord ? r.lat : null, hasCoord ? r.lng : null, foundedYear,
          r["정확도등급"], r["좌표출처"] || null, parkingJson];
});
for (let i = 0; i < payload.length; i += BATCH) {
  const chunk = payload.slice(i, i + BATCH);
  const [res] = await conn.query(
    `INSERT INTO salons (taxId, name, address, district, lat, lng, foundedYear, geoAccuracy, coordSource, parkingJson)
     VALUES ?
     ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), district=VALUES(district),
       lat=VALUES(lat), lng=VALUES(lng), foundedYear=VALUES(foundedYear),
       geoAccuracy=VALUES(geoAccuracy), coordSource=VALUES(coordSource), parkingJson=VALUES(parkingJson)`,
    [chunk]
  );
  affected += res.affectedRows;
  process.stdout.write(`\r[load] ${Math.min(i + BATCH, payload.length)}/${payload.length}`);
}
console.log("");

const [[cnt]] = await conn.query("SELECT COUNT(*) AS c FROM salons");
const [[dup]] = await conn.query("SELECT COUNT(*) - COUNT(DISTINCT taxId) AS d FROM salons");
const [[coord]] = await conn.query("SELECT COUNT(*) AS c FROM salons WHERE lat IS NOT NULL AND lng IS NOT NULL");
const [[park]] = await conn.query("SELECT COUNT(*) AS c FROM salons WHERE parkingJson IS NOT NULL");
const [[yr]] = await conn.query("SELECT COUNT(*) AS c FROM salons WHERE foundedYear IS NOT NULL");
const [[box]] = await conn.query(
  `SELECT COUNT(*) AS c FROM salons
   WHERE lat IS NOT NULL AND (lat NOT BETWEEN ? AND ? OR lng NOT BETWEEN ? AND ?)`,
  [BOX.latMin, BOX.latMax, BOX.lngMin, BOX.lngMax]
);
const [[dist]] = await conn.query("SELECT COUNT(DISTINCT district) AS c FROM salons");
console.log(`\n[load] upsert 영향행 ${affected} (CSV ${geo.length}행 — 신규는 1, 갱신은 2로 계산됨)`);
console.log(`[load] 검증 — 총 ${cnt.c}행 | 統編 중복 ${dup.d} | 박스이탈 ${box.c}`);
console.log(`         좌표 보유 ${coord.c} | parkingJson 보유 ${park.c} | 설립연도 보유 ${yr.c} | 행정구 ${dist.c}개`);
await conn.end();
