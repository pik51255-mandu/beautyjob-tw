// ch02 ko 렌더 파이프라인 — SVG→PNG(1080px), 카드 PNG, 루프 프레임(30fps)
// 실행: PW_DIR=<playwright-core 설치경로> FONT_CSS=<절대경로 @font-face css> node render_ko.mjs <ch02Dir> <framesDir>
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(path.join(process.env.PW_DIR, 'package.json'));
const { chromium } = require('playwright-core');

const CH02 = path.resolve(process.argv[2]);
const FRAMES = path.resolve(process.argv[3]);
const SRC = path.join(CH02, 'src');
const FONT_CSS = process.env.FONT_CSS;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

async function loadFonts() {
  await page.addStyleTag({ content: readFileSync(FONT_CSS, 'utf8') });
  await page.evaluate(async () => {
    for (const w of [400, 500, 700, 800, 900]) {
      document.fonts.load(`${w} 20px 'Noto Sans KR'`, '수소결합 테스트');
      document.fonts.load(`${w} 20px 'Noto Sans TC'`, '題庫繁體');
    }
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

// 1) 일러스트 SVG → PNG 1080px
for (const name of ['illust-01-strength-ko', 'illust-02-hydrogen-water-ko', 'illust-03-perm-3steps-ko']) {
  const raw = readFileSync(path.join(CH02, name + '.svg'), 'utf8');
  const vb = raw.match(/viewBox='0 0 (\d+) (\d+)'/);
  const [w, h] = [Number(vb[1]), Number(vb[2])];
  const outH = Math.round(1080 * h / w);
  await page.setViewportSize({ width: 1080, height: outH });
  const wrap = path.join(FRAMES, 'wrap.html');
  writeFileSync(wrap, `<!doctype html><meta charset="utf-8"><body style="margin:0">${raw.replace(/width='\d+' height='\d+'/, `width='1080' height='${outH}'`)}</body>`);
  await page.goto(`file://${wrap}`);
  await loadFonts();
  await page.screenshot({ path: path.join(CH02, name + '.png'), clip: { x: 0, y: 0, width: 1080, height: outH } });
  console.log('illust', name + '.png');
}

// 2) 카드 PNG
await page.setViewportSize({ width: 1080, height: 1350 });
for (const card of ['card-01-concept-ko', 'card-02-quiz-ko']) {
  await page.goto(`file://${path.join(SRC, card + '.html')}`);
  await loadFonts();
  await page.screenshot({ path: path.join(CH02, card + '.png') });
  console.log('card', card + '.png');
}

// 3) 루프 프레임: 30fps × 4.8s = 144장 + 루프검증용 t=4.8
await page.goto(`file://${path.join(SRC, 'loop-ko.html')}`);
await loadFonts();
const FPS = 30, DUR = 4.8, N = Math.round(FPS * DUR);
for (let i = 0; i <= N; i++) {
  await page.evaluate(t => window.setT(t), i / FPS);
  const name = i < N ? `k_${String(i).padStart(3, '0')}.png` : 'loopcheck_end.png';
  await page.screenshot({ path: path.join(FRAMES, name) });
}
console.log('frames:', N, '+ loopcheck');
await browser.close();
