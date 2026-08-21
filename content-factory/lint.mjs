/**
 * 콘텐츠 공장 lint — R1~R7 / B1~B5 기계 검증
 *
 * 상세 결과는 content-factory/lint-report.md 에 쓰고, 표준출력에는 요약 표만 낸다.
 * 사용: node content-factory/lint.mjs [파일...]
 */
import fs from "node:fs";
import path from "node:path";

// R10: 내부링크는 progress.md 의 확정 slug 표에 있는 것만 허용한다.
function knownSlugs() {
  try {
    const md = fs.readFileSync("content-factory/progress.md", "utf8");
    return new Set([...md.matchAll(/`([a-z0-9-]{4,})`/g)].map((m) => m[1]));
  } catch { return new Set(); }
}
const SLUGS = knownSlugs();

// R2 규제 금지어 — 대만 화장품 광고규제(化粧品衛生安全管理法)
// v8 개정: 단독 刺激·醫療 는 금지가 아니다(刺激嗅覺 은 화장품 정의문에 나온다).
// 諮詢醫師·就醫 같은 의료인 안내 표현은 허용·권장이다.
const BANNED = [
  "生髮", "育髮", "活化毛囊", "刺激毛囊", "喚醒毛囊",
  "治療", "再生", "修復", "消炎", "抗過敏", "醫療級", "醫療效能",
  "促進毛髮生長", "防止落髮",
];

// 生髮 화이트리스트 — 대만 현장 표준어라 규제 표현이 아니다.
// 접두 일치이므로 新生髮根 · 學生髮型 도 함께 마스킹된다.
const GROWTH_WHITELIST = ["原生髮", "新生髮", "學生髮"];

/** 화이트리스트 어휘를 임시 치환해 生髮 부분문자열 과검출을 막는다. */
function maskGrowthTerms(s) {
  let masked = s;
  const counts = {};
  GROWTH_WHITELIST.forEach((w, i) => {
    const re = new RegExp(w, "g");
    counts[w] = (masked.match(re) || []).length;
    masked = masked.replace(re, `\u0000W${i}\u0000`);
  });
  return { masked, counts };
}

// R1 대륙 어휘·간체 — 번체 대만용어만 허용
const MAINLAND_WORDS = [
  "洗发水", "染发", "烫发", "头发", "视频", "信息", "质量", "网络",
  "护发", "发质", "发型", "毛鳞片", "皮质层", "双氧",
];

// 간체 전용 글자(번체와 형태가 다른 것만)
const SIMPLIFIED = new Set(
  // 번체와 형태가 다른 간체 전용 글자만. 동형 글자(硬·搜·食 등)를 넣으면 오탐이 난다.
  // 주의: 두 리터럴을 반드시 괄호로 묶는다. 안 그러면 .split() 이 뒤 리터럴에만 걸려
  // 배열이 문자열로 변환되면서 ASCII 콤마가 집합에 섞인다(실제로 오탐을 냈던 버그).
  ("发头产东车门开关语经线风专业联电图数据库样组删编视频质网软务询录册个这们时来国会说过对" +
   "点种问题实现将变间还进么长银钱铁马鸟鱼贝见页飞韦纟讠钅饣汤烫护养虑觉断继续压历监")
    .split("").filter((c) => c.trim())
);

// R1 대만 표준 용어 — 있어야 자연스러운 것(경고용, 실패 아님)
const TW_TERMS = ["毛鱗片", "皮質層", "髓質層", "雙硫鍵", "軟化", "雙氧乳", "結構式護髮", "縮毛矯正", "洗髮精", "染髮", "燙髮"];

function countChinese(s) {
  return (s.match(/[一-鿿]/g) || []).length;
}

function analyze(file) {
  const raw = fs.readFileSync(file, "utf8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = fmMatch ? fmMatch[1] : "";
  const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

  // 「」 인용 안은 R2 예외(광고법규 글) — 인용 밖만 검사
  // 그 전에 生髮 화이트리스트를 마스킹한다(原生髮·新生髮根 등은 규제 표현이 아니다).
  const { masked: maskedBody, counts: growthExceptions } = maskGrowthTerms(body);
  const bodyOutsideQuotes = maskedBody.replace(/「[^」]*」/g, "「」");

  const bannedHits = [];
  for (const w of BANNED) {
    const inQuoteOnly = !bodyOutsideQuotes.includes(w) && maskedBody.includes(w);
    const n = (bodyOutsideQuotes.split(w).length - 1);
    if (n > 0) bannedHits.push({ word: w, count: n });
    else if (inQuoteOnly) bannedHits.push({ word: w, count: 0, note: "「」인용 내부(예외)" });
  }

  const mainlandHits = MAINLAND_WORDS.filter((w) => body.includes(w));
  const simplifiedHits = [...new Set([...body].filter((c) => SIMPLIFIED.has(c)))];

  const chineseCount = countChinese(body);
  const tables = (body.match(/^\|.*\|$/gm) || []).length > 0
    ? body.split("\n").filter((l) => /^\|[-\s|:]+\|$/.test(l.trim())).length : 0;
  const faqs = (body.match(/\*\*Q\d+\./g) || []).length;
  const internalLinks = (body.match(/\]\(\/articles\/[a-z0-9-]+\)/g) || []).length;

  // B-4: 教科書沒說的 섹션은 반드시 있어야 하고, 반드시 비어 있어야 한다.
  // 이 칸은 사이트의 유일한 차별점이라 AI 일반론으로 채우면 가치가 0이 된다.
  const secMatch = body.match(/^##\s*教科書沒說的\s*$([\s\S]*?)(?=^##\s|\Z)/m);
  const hasFieldSection = Boolean(secMatch);
  let fieldSectionFilled = false;
  let questionLines = [];
  let badQuestions = [];
  if (secMatch) {
    const inner = secMatch[1].trim();
    const isPlaceholder = /^>\s*\[.*작성 예정.*\]$/m.test(inner);
    // R8: "> 질문N: ..." 줄은 유도 질문이므로 빈칸으로 간주한다.
    //     단 서술문이 아니라 순수 질문문이어야 한다(물음표로 끝날 것).
    questionLines = [...inner.matchAll(/^>\s*질문\d*\s*[:：]\s*(.+)$/gm)].map((m) => m[1].trim());
    badQuestions = questionLines.filter((q) => !/[?？]\s*$/.test(q));
    // 인용(>) 밖에 남은 실제 서술이 있으면 AI 가 채운 것으로 본다.
    const withoutQuoted = inner.replace(/^>.*$/gm, "").trim();
    fieldSectionFilled = !isPlaceholder || countChinese(withoutQuoted) >= 20;
  }

  // 2-d: 雙氧乳 %↔vol 대응 검증. 같은 줄에 N% 와 Mvol 이 함께 나오면 M === N*10/3 이어야 한다
  //      (3%=10vol / 6%=20vol / 9%=30vol / 12%=40vol — 02 바이블 1-3 기준).
  const volErrors = [];
  for (const line of body.split("\n")) {
    // 표 행만 검사한다. 서술 문장에는 "6%를 6vol 로 잘못 듣는다" 같은 오류 예시가
    // 정상적으로 등장하므로, 대응을 단정하는 표 행에서만 판정해야 오탐이 없다.
    if (!/^\s*\|/.test(line)) continue;
    const pcts = [...line.matchAll(/(\d{1,2})\s*%/g)].map((m) => Number(m[1]));
    const vols = [...line.matchAll(/(\d{1,3})\s*(?:vol|VOL|Vol)/g)].map((m) => Number(m[1]));
    if (pcts.length === 1 && vols.length === 1) {
      const expect = (pcts[0] * 10) / 3;
      if (Math.abs(vols[0] - expect) > 0.51) {
        volErrors.push(`${pcts[0]}% ↔ ${vols[0]}vol (기대 ${Math.round(expect)}vol)`);
      }
    }
  }

  // R10: 내부링크 slug 존재 검증
  const linkedSlugs = [...body.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
  const unknownSlugs = SLUGS.size ? [...new Set(linkedSlugs.filter((s) => !SLUGS.has(s)))] : [];

  const fmKeys = ["title", "slug", "level", "series", "keywords", "description", "sources"];
  const fmMissing = fmKeys.filter((k) => !new RegExp(`^${k}:`, "m").test(fm));
  const byline = /20年資歷韓國髮型設計師\s*Jacob/.test(raw);

  const descMatch = fm.match(/^description:\s*(.+)$/m);
  const descLen = descMatch ? countChinese(descMatch[1]) : 0;

  return {
    file, chineseCount, tables, faqs, internalLinks,
    bannedHits, mainlandHits, simplifiedHits, fmMissing, byline, descLen,
    hasFieldSection, fieldSectionFilled, questionLines, badQuestions, unknownSlugs, volErrors,
    growthExceptions,
    quotedBanned: bannedHits.filter((h) => h.count === 0).map((h) => h.word),
    twTerms: TW_TERMS.filter((t) => body.includes(t)),
  };
}

function verdict(a, kind) {
  const fails = [];
  if (a.simplifiedHits.length) fails.push(`간체자 ${a.simplifiedHits.length}종`);
  if (a.mainlandHits.length) fails.push(`대륙어휘 ${a.mainlandHits.join(",")}`);
  const realBanned = a.bannedHits.filter((h) => h.count > 0);
  if (realBanned.length) fails.push(`금지어 ${realBanned.map((h) => h.word).join(",")}`);
  if (a.fmMissing.length) fails.push(`front-matter 누락 ${a.fmMissing.join(",")}`);
  if (!a.byline) fails.push("바이라인 누락");
  if (a.descLen > 80) fails.push(`description ${a.descLen}字(80 초과)`);
  if (a.unknownSlugs.length) fails.push(`미확정 slug 링크: ${a.unknownSlugs.join(",")}`);
  if (a.volErrors.length) fails.push(`雙氧乳 %↔vol 불일치: ${a.volErrors[0]}`);
  if (kind === "theory") {
    if (!a.hasFieldSection) fails.push("教科書沒說的 섹션 없음");
    else if (a.fieldSectionFilled) fails.push("教科書沒說的 을 AI 가 채움(비워둬야 함)");
    else if (!a.questionLines.length) fails.push("유도 질문 없음(R8)");
    else if (a.badQuestions.length) fails.push(`유도 질문이 질문문이 아님: ${a.badQuestions[0].slice(0, 20)}…`);
    if (a.chineseCount < 1500) fails.push(`분량 ${a.chineseCount}字(1500 미만)`);
    if (a.tables < 1) fails.push("표 없음");
    if (a.faqs < 3) fails.push(`FAQ ${a.faqs}개(3 미만)`);
    if (a.internalLinks < 2) fails.push(`내부링크 ${a.internalLinks}개(2 미만)`);
  }
  return fails;
}

const files = process.argv.slice(2);
if (!files.length) { console.error("사용: node content-factory/lint.mjs <파일...>"); process.exit(1); }

const rows = [];
const detail = [`# lint 상세 리포트\n\n생성: ${new Date().toISOString().slice(0, 10)}\n`];

for (const f of files) {
  const kind = f.includes("/exam") ? "exam" : "theory";
  const a = analyze(f);
  const fails = verdict(a, kind);
  rows.push({ f: path.basename(f), kind, a, fails });

  detail.push(`## ${path.basename(f)}\n`);
  detail.push(`- 종류: ${kind}`);
  detail.push(`- 中文 字數: ${a.chineseCount}`);
  detail.push(`- 표: ${a.tables} / FAQ: ${a.faqs} / 내부링크: ${a.internalLinks}`);
  detail.push(`- 간체자: ${a.simplifiedHits.length ? a.simplifiedHits.join(" ") : "0 (없음)"}`);
  detail.push(`- 대륙 어휘: ${a.mainlandHits.length ? a.mainlandHits.join(", ") : "0 (없음)"}`);
  detail.push(`- 금지어(인용 밖): ${a.bannedHits.filter((h) => h.count > 0).map((h) => `${h.word}×${h.count}`).join(", ") || "0 (없음)"}`);
  const exc = a.bannedHits.filter((h) => h.count === 0);
  if (exc.length) detail.push(`- 금지어(「」인용 내부, 예외 허용): ${exc.map((h) => h.word).join(", ")}`);
  detail.push(`- front-matter 누락: ${a.fmMissing.length ? a.fmMissing.join(", ") : "없음"}`);
  detail.push(`- 바이라인: ${a.byline ? "있음" : "없음"}`);
  detail.push(`- description 길이: ${a.descLen}字 (상한 80)`);
  detail.push(`- 教科書沒說的 섹션: ${a.hasFieldSection ? (a.fieldSectionFilled ? "있음 — 채워짐(실패)" : "있음 — 플레이스홀더(정상)") : "없음(실패)"}`);
  detail.push(`- 유도 질문(R8): ${a.questionLines.length}개${a.badQuestions.length ? ` — 질문문 아님 ${a.badQuestions.length}건` : ""}`);
  a.questionLines.forEach((q, i) => detail.push(`    ${i + 1}. ${q}`));
  detail.push(`- 내부링크 slug 검증(R10): ${a.unknownSlugs.length ? "미확정 " + a.unknownSlugs.join(", ") : "전부 확정 목록 내"}`);
  const gx = Object.entries(a.growthExceptions).filter(([, c]) => c > 0);
  detail.push(`- 生髮 화이트리스트 예외(1-b): ${gx.length ? gx.map(([w, c]) => `${w}×${c}`).join(", ") : "해당 없음"}`);
  detail.push(`- 雙氧乳 %↔vol 대응(2-d): ${a.volErrors.length ? "불일치 " + a.volErrors.join(" / ") : "일치 또는 해당없음"}`);
  if (a.quotedBanned.length) {
    detail.push(`- **R9 예외 적용** — 「」인용 안에서만 등장한 금지어: ${a.quotedBanned.join(", ")}`);
    const raw = fs.readFileSync(f, "utf8");
    for (const w of a.quotedBanned) {
      for (const m of raw.matchAll(new RegExp(`[^。\\n]*「[^」]*${w}[^」]*」[^。\\n]*。?`, "g"))) {
        detail.push(`    · ${m[0].trim().slice(0, 90)}`);
      }
    }
  }
  detail.push(`- 사용된 대만 표준 용어: ${a.twTerms.join(", ") || "(없음)"}`);
  detail.push(`- **판정: ${fails.length ? "실패 — " + fails.join(" / ") : "통과"}**\n`);
}

fs.writeFileSync("content-factory/lint-report.md", detail.join("\n"));

// 표준출력: 요약 표만
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad("파일", 34)}${pad("字數", 7)}${pad("표", 4)}${pad("FAQ", 5)}${pad("링크", 6)}${pad("간체", 6)}${pad("금지어", 7)}${pad("現場칸", 8)}판정`);
for (const r of rows) {
  const realBanned = r.a.bannedHits.filter((h) => h.count > 0).length;
  console.log(
    pad(r.f, 34) + pad(r.a.chineseCount, 7) + pad(r.a.tables, 4) + pad(r.a.faqs, 5) +
    pad(r.a.internalLinks, 6) + pad(r.a.simplifiedHits.length, 6) + pad(realBanned, 7) +
    pad(r.a.hasFieldSection ? (r.a.fieldSectionFilled ? "채워짐" : "빈칸") : "없음", 8) +
    (r.fails.length ? "✗ " + r.fails[0] : "✓ 통과")
  );
}
const failed = rows.filter((r) => r.fails.length);
console.log(`\n통과 ${rows.length - failed.length} / 실패 ${failed.length}  · 상세: content-factory/lint-report.md`);
process.exit(failed.length ? 1 : 0);
