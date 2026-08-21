// 렌더 파이프라인: SVG→PNG 미리보기, 카드 PNG, 루프 애니 프레임 (Chromium 로컬 렌더)
// 실행: node render.mjs <renderRoot> <framesDir>
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
// playwright-core는 별도 렌더 환경(PW_DIR)에 설치되어 있음
const require = createRequire(path.join(process.env.PW_DIR, 'package.json'));
const { chromium } = require('playwright-core');

const VISUAL = path.resolve(process.argv[2]);          // content-factory/visual
const FRAMES = path.resolve(process.argv[3]);          // 프레임 출력(스크래치)
const PILOT = path.join(VISUAL, 'pilot-02');
const PREV = path.join(PILOT, 'previews');
const FONT_DIR = process.env.FONT_DIR;                 // @fontsource/noto-sans-tc 경로

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

const FONT_CSS = process.env.FONT_CSS;                 // 절대경로 @font-face CSS
async function loadFonts() {
  await page.addStyleTag({ content: readFileSync(FONT_CSS, 'utf8') });
  await page.evaluate(async () => {
    document.fonts.load("400 20px 'Noto Sans TC'", '氫鍵測試');
    document.fonts.load("700 20px 'Noto Sans TC'", '氫鍵測試');
    document.fonts.load("900 20px 'Noto Sans TC'", '氫鍵測試');
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

// 1) SVG → PNG 미리보기 (1080px 폭, 인라인 임베드로 웹폰트 적용)
const svgs = [
  'char-hydrogen.svg', 'char-salt.svg', 'char-disulfide.svg', 'char-peptide.svg', 'characters.svg',
  'pilot-02/illust-01-strength.svg', 'pilot-02/illust-02-hydrogen-water.svg', 'pilot-02/illust-03-perm-3steps.svg',
];
for (const rel of svgs) {
  const raw = readFileSync(path.join(VISUAL, rel), 'utf8');
  const vb = raw.match(/viewBox='0 0 (\d+) (\d+)'/) || raw.match(/viewBox="0 0 (\d+) (\d+)"/);
  const [w, h] = [Number(vb[1]), Number(vb[2])];
  const outH = Math.round(1080 * h / w);
  await page.setViewportSize({ width: 1080, height: outH });
  const wrapper = path.join(FRAMES, 'wrap.html');
  writeFileSync(wrapper, `<!doctype html><meta charset="utf-8"><body style="margin:0">${raw.replace(/width='\d+' height='\d+'/, `width='1080' height='${outH}'`)}</body>`);
  await page.goto(`file://${wrapper}`);
  await loadFonts();
  const out = path.join(PREV, path.basename(rel).replace('.svg', '.png'));
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: outH } });
  console.log('preview', path.basename(out));
}

// 2) 카드 PNG (1080×1350)
await page.setViewportSize({ width: 1080, height: 1350 });
for (const card of ['card-01-concept', 'card-02-quiz-template']) {
  await page.goto(`file://${path.join(PILOT, 'src', card + '.html')}`);
  await loadFonts();
  await page.screenshot({ path: path.join(PILOT, card + '.png') });
  console.log('card', card + '.png');
}

// 3) 루프 애니 프레임: 15fps × 8s = 120장 + 루프 검증용 t=8.0 1장
await page.goto(`file://${path.join(PILOT, 'src', 'loop-hydrogen.html')}`);
await loadFonts();
const FPS = 15, N = 120;
for (let i = 0; i <= N; i++) {                 // i=N → t=8.0 (loopcheck)
  await page.evaluate(t => window.setT(t), i / FPS);
  const name = i < N ? `frame_${String(i).padStart(3, '0')}.png` : 'loopcheck_t8.png';
  await page.screenshot({ path: path.join(FRAMES, name) });
}
console.log('frames done:', N, '+ loopcheck');
await browser.close();
