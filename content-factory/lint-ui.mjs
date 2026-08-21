/**
 * UI 문구 규제 lint (v12 2-i)
 *
 * 계산기 UI에 노출되는 중국어 문구도 이론 글과 같은 R1/R2 기준을 지켜야 한다.
 * lint.mjs 의 용어 목록을 그대로 재사용한다 — 기준이 두 벌로 갈라지지 않게.
 *
 * 사용: node content-factory/lint-ui.mjs [파일...]  (인자 없으면 기본 대상)
 */
import fs from "node:fs";
import { BANNED, MAINLAND_WORDS, SIMPLIFIED, maskGrowthTerms } from "./lint.mjs";

const DEFAULT_TARGETS = [
  "client/src/lib/toolStrings.ts",
  "client/src/lib/colorMixCalc.ts",
  "client/src/pages/tools/ColorMix.tsx",
];

const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TARGETS;

/** 소스에서 CJK 가 든 문자열 리터럴만 뽑는다 — 식별자·경로는 검사 대상이 아니다. */
function zhLiterals(src) {
  const out = [];
  for (const m of src.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
    if (/[一-鿿]/.test(m[1])) out.push(m[1]);
  }
  return out;
}

let failed = 0;
for (const f of targets) {
  if (!fs.existsSync(f)) { console.log(`✗ ${f} — 파일 없음`); failed++; continue; }
  const lits = zhLiterals(fs.readFileSync(f, "utf8"));
  const text = lits.join("\n");
  const { masked } = maskGrowthTerms(text);

  const banned = BANNED.filter((w) => masked.includes(w));
  const mainland = MAINLAND_WORDS.filter((w) => text.includes(w));
  const simplified = [...new Set([...text].filter((c) => SIMPLIFIED.has(c)))];

  const bad = banned.length + mainland.length + simplified.length;
  if (bad) failed++;
  console.log(
    `${bad ? "✗" : "✓"} ${f}  문구 ${String(lits.length).padStart(3)}개` +
    `  금지어 ${banned.length ? banned.join(",") : 0}` +
    `  대륙어휘 ${mainland.length ? mainland.join(",") : 0}` +
    `  간체 ${simplified.length ? simplified.join("") : 0}`
  );
}
console.log(`\n통과 ${targets.length - failed} / 실패 ${failed}`);
process.exit(failed ? 1 : 0);
