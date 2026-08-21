// 챕터 #1 렌더 — 언어별 SVG→PNG, 카드 PNG, 루프 프레임(30fps)
// 사용: PW_DIR=… FONT_CSS=… node render.mjs <ch01Dir> <lang> <framesDir> [--illust-only]
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(path.join(process.env.PW_DIR, 'package.json'));
const { chromium } = require('playwright-core');

const CH01 = path.resolve(process.argv[2]);
const LANG = process.argv[3];
const FRAMES = path.resolve(process.argv[4]);
const ONLY = process.argv.includes('--illust-only');
const DIR = path.join(CH01, LANG);
const SRC = path.join(CH01, 'src', 'build');
const FONT_CSS = process.env.FONT_CSS;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

async function loadFonts() {
  await page.addStyleTag({ content: readFileSync(FONT_CSS, 'utf8') });
  await page.evaluate(async () => {
    for (const w of [400, 500, 600, 700, 800, 900]) {
      document.fonts.load(`${w} 20px 'Noto Sans KR'`, '모발구조');
      document.fonts.load(`${w} 20px 'Noto Sans TC'`, '毛鱗片皮質層');
    }
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

for (const name of ['illust-01-layers', 'illust-02-cuticle-ph', 'illust-03-depth']) {
  const raw = readFileSync(path.join(DIR, name + '.svg'), 'utf8');
  const vb = raw.match(/viewBox='0 0 (\d+) (\d+)'/);
  const [w, h] = [Number(vb[1]), Number(vb[2])];
  const outH = Math.round(1080 * h / w);
  await page.setViewportSize({ width: 1080, height: outH });
  const wrap = path.join(FRAMES, 'wrap.html');
  writeFileSync(wrap, `<!doctype html><meta charset="utf-8"><body style="margin:0">${raw.replace(/width='\d+' height='\d+'/, `width='1080' height='${outH}'`)}</body>`);
  await page.goto(`file://${wrap}`);
  await loadFonts();
  await page.screenshot({ path: path.join(DIR, name + '.png'), clip: { x: 0, y: 0, width: 1080, height: outH } });
  console.log('illust', LANG, name + '.png');
}

if (!ONLY) {
  await page.setViewportSize({ width: 1080, height: 1350 });
  for (const card of ['card-01-concept', 'card-02-quiz']) {
    await page.goto(`file://${path.join(SRC, `${card}-${LANG}.html`)}`);
    await loadFonts();
    await page.screenshot({ path: path.join(DIR, card + '.png') });
    console.log('card', LANG, card + '.png');
  }
  await page.goto(`file://${path.join(SRC, `loop-${LANG}.html`)}`);
  await loadFonts();
  const FPS = 30, DUR = 4.8, N = Math.round(FPS * DUR);
  for (let i = 0; i <= N; i++) {
    await page.evaluate(t => window.setT(t), i / FPS);
    await page.screenshot({ path: path.join(FRAMES, i < N ? `f_${String(i).padStart(3, '0')}.png` : 'loopcheck_end.png') });
  }
  console.log('frames', LANG, N, '+ loopcheck');
}
await browser.close();
