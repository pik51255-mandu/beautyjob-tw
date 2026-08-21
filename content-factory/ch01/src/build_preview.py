#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""챕터 #1 미리보기 빌드 — 언어별. 사용: python3 build_preview.py ko|zh [아티팩트출력경로]
본문(article-*.md)이 단일 소스이고, 비주얼은 앵커 문구로 제자리에 삽입된다.
자산은 base64 내장 → 외부 리소스 참조 0."""
import base64, html, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CH01 = os.path.dirname(HERE)
LANG = sys.argv[1] if len(sys.argv) > 1 else "ko"
DIR = os.path.join(CH01, LANG)

def b64(name):
    ext = name.rsplit('.', 1)[1]
    mime = {'png': 'image/png', 'mp4': 'video/mp4', 'webm': 'video/webm'}[ext]
    with open(os.path.join(DIR, name), 'rb') as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()

# ── 최소 마크다운 → HTML ────────────────────────────────────────────────
def inline(s):
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    return s

def md_to_html(md):
    out, i, lines = [], 0, md.split('\n')
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1; continue
        if ln.startswith('---'):
            out.append('<hr>'); i += 1; continue
        m = re.match(r'^(#{1,3})\s+(.*)', ln)
        if m:
            out.append(f'<h{len(m.group(1))}>{inline(m.group(2))}</h{len(m.group(1))}>'); i += 1; continue
        if ln.startswith('|'):
            tbl = []
            while i < len(lines) and lines[i].startswith('|'):
                tbl.append(lines[i]); i += 1
            cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]
            t = ['<div class="tw"><table><thead><tr>']
            t += [f'<th>{inline(c)}</th>' for c in cells(tbl[0])] + ['</tr></thead><tbody>']
            for r in tbl[2:]:
                t.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in cells(r)) + '</tr>')
            t.append('</tbody></table></div>')
            out.append(''.join(t)); continue
        if ln.startswith('> '):
            buf = []
            while i < len(lines) and lines[i].startswith('> '):
                buf.append(inline(lines[i][2:])); i += 1
            out.append('<blockquote>' + '<br>'.join(buf) + '</blockquote>'); continue
        if re.match(r'^\d+\.\s', ln):
            buf = []
            while i < len(lines) and re.match(r'^\d+\.\s', lines[i]):
                buf.append('<li>' + inline(re.sub(r'^\d+\.\s*', '', lines[i])) + '</li>'); i += 1
            out.append('<ol>' + ''.join(buf) + '</ol>'); continue
        if ln.startswith('- '):
            buf = []
            while i < len(lines) and lines[i].startswith('- '):
                buf.append(f'<li>{inline(lines[i][2:])}</li>'); i += 1
            out.append('<ul>' + ''.join(buf) + '</ul>'); continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||>|-\s|\d+\.\s|---)', lines[i]):
            buf.append(inline(lines[i])); i += 1
        out.append('<p>' + ' '.join(buf) + '</p>')
    return out

def fig(src, cap, tag):
    return (f'<figure class="viz"><span class="vtag">{tag}</span>'
            f'<img src="{src}" alt=""><figcaption>{cap}</figcaption></figure>')

def vid(mp4, webm, poster, cap, tag):
    # 폰은 H.264 mp4를 먼저 집는다. webm은 mp4 코덱이 없는 환경용, poster는 최후 안전장치.
    return (f'<figure class="viz"><span class="vtag">{tag}</span>'
            f'<video autoplay muted loop playsinline poster="{poster}">'
            f'<source src="{mp4}" type="video/mp4"><source src="{webm}" type="video/webm">'
            f'</video><figcaption>{cap}</figcaption></figure>')

# ── 언어별 문구·앵커 ───────────────────────────────────────────────────
CFG = {
"ko": dict(
  md="ko/article-ko.md", title="머리카락 구조 전해부",
  standalone_title="챕터 #1 미리보기 — 머리카락 구조 전해부 (ko 검수판)",
  banner="검수용 미리보기 · 발행본은 번체 — 이 파일은 게재하지 않습니다",
  font="-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','Segoe UI',Roboto,sans-serif",
  tags=("일러스트 ①", "일러스트 ②", "일러스트 ③", "루프 애니", "카드 ①", "카드 ②"),
  anchors=("의 반복입니다", "상담에서 이 질문 하나면"),
  caps=("위아래 분홍 띠가 큐티클, 가운데 넓은 면이 코르텍스, 점선 캡슐이 메둘라.",
        "가운데 칸에서만 비늘이 들리고, 그 틈으로 약제가 내려간다.",
        "막대가 오른쪽으로 갈수록 깊이 들어간다. 탈색 막대 끝 느낌표는 큐티클 손상 표시.",
        "알칼리 방울이 닿으면 비늘이 들리고 약제가 안으로 내려간다. 산성 방울에 비늘이 다시 눕는다.",
        "훅 질문과 답을 한 장에. 단면 그림은 약이 지나는 경로다.",
        "題庫 문항을 갈아 끼우는 빈 템플릿. 문제·선택지 영역만 교체한다."),
  cards_head="스레드 카드", cards_note="본문과 별개로 SNS에 단독 게시되는 이미지입니다.",
),
"zh": dict(
  md="zh/article-zh.md", title="頭髮結構全解析",
  standalone_title="第 #1 篇預覽 — 頭髮結構全解析（繁體發布版）",
  banner="上線前預覽 · 繁體發布版 — 尚未公開發布",
  font="-apple-system,BlinkMacSystemFont,'PingFang TC','Noto Sans TC','Microsoft JhengHei','Segoe UI',Roboto,sans-serif",
  tags=("圖 ①", "圖 ②", "圖 ③", "循環動畫", "卡片 ①", "卡片 ②"),
  anchors=("同一套循環", "諮詢時只要問這一句"),
  caps=("上下兩條粉色帶是毛鱗片，中間大面積是皮質層，虛線膠囊是髓質層。",
        "只有中間那格的鱗片是張開的，藥劑從縫隙往下走。",
        "長條愈往右代表做得愈深；漂髮尾端的驚嘆號標示毛鱗片同時受損。",
        "鹼性水滴落下時鱗片張開、藥劑往內走；酸性水滴落下後鱗片重新躺平。",
        "一張圖把提問跟答案講完，剖面就是藥劑經過的路線。",
        "把題庫題目換進去就能用的空白模板。"),
  cards_head="社群卡片", cards_note="與內文分開、單獨發在社群的圖片。",
),
}[LANG]

blocks = md_to_html(open(os.path.join(CH01, CFG["md"])).read())
TG, CP = CFG["tags"], CFG["caps"]
V = {
  'i1': fig(b64('illust-01-layers.png'), CP[0], TG[0]),
  'i2': fig(b64('illust-02-cuticle-ph.png'), CP[1], TG[1]),
  'i3': fig(b64('illust-03-depth.png'), CP[2], TG[2]),
  'lo': vid(b64('loop-cuticle.mp4'), b64('loop-cuticle.webm'), b64('poster-loop.png'), CP[3], TG[3]),
}
CARDS = (f'<section class="cards"><h2>{CFG["cards_head"]}</h2>'
         f'<p class="note">{CFG["cards_note"]}</p>'
         f'<figure class="viz"><span class="vtag">{TG[4]}</span><img src="{b64("card-01-concept.png")}" alt="">'
         f'<figcaption>{CP[4]}</figcaption></figure>'
         f'<figure class="viz"><span class="vtag">{TG[5]}</span><img src="{b64("card-02-quiz.png")}" alt="">'
         f'<figcaption>{CP[5]}</figcaption></figure></section>')

# 삽입: 3층 표 직후 ① / 큐티클 단락 옆 ② / 시술 표 직후 ③ / 결론 직후 루프
A_CUTICLE, A_CONCL = CFG["anchors"]
final, placed, tables = [], [], 0
for b in blocks:
    final.append(b)
    if '<table>' in b:
        tables += 1
        if tables == 1: final.append(V['i1']); placed.append('i1')
        elif tables == 2: final.append(V['i3']); placed.append('i3')
    elif A_CUTICLE in b and 'i2' not in placed:
        final.append(V['i2']); placed.append('i2')
    elif A_CONCL in b and 'lo' not in placed:
        final.append(V['lo']); placed.append('lo')
assert sorted(placed) == ['i1', 'i2', 'i3', 'lo'], f'삽입 실패: {placed}'

body = '\n'.join(final)
body = body.replace('<hr>', CARDS + '<hr>', 1) if '<hr>' in body else body + CARDS

CSS = """
/* 라이트가 기본 팔레트 — 사이트 테마(client/src/index.css)에서 파생 */
:root{--p:#b92846;--ink:#0f1216;--paper:#fbf8f5;--aqua:#00a9b3;--rose-deep:#641f29;
      --muted:#6b727e;--line:#ddd6d1;--alt:#f6e8de;--surface:#fff;
      --banner-bg:#641f29;--banner-fg:#fff;}
/* OS 다크 — 명시적으로 라이트를 고른 뷰어에게는 적용하지 않는다 */
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --p:#ee6a83;--ink:#f2ece9;--paper:#161315;--aqua:#2fc6cf;--rose-deep:#f0a8b6;
    --muted:#a79ea1;--line:#352d31;--alt:#241d20;--surface:#201b1e;
    --banner-bg:#3d1620;--banner-fg:#ffe3e8;}
}
/* 토글로 다크를 고른 경우 — OS가 라이트여도 이김 */
:root[data-theme="dark"]{
  --p:#ee6a83;--ink:#f2ece9;--paper:#161315;--aqua:#2fc6cf;--rose-deep:#f0a8b6;
  --muted:#a79ea1;--line:#352d31;--alt:#241d20;--surface:#201b1e;
  --banner-bg:#3d1620;--banner-fg:#ffe3e8;}
/* 비주얼 판은 테마 고정 — 이미지 자체가 米白 배경이라 판까지 어두워지면 그림만 떠 보인다 */
:root{--plate:#fbf8f5;--plate-line:#e4dcd6;--plate-ink:#6b727e;--plate-tag:#b92846;}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:__FONT__;
     line-height:1.75;font-size:17px;-webkit-text-size-adjust:100%}
.wrap{max-width:720px;margin:0 auto;padding:22px 20px 80px}
.banner{background:var(--banner-bg);color:var(--banner-fg);font-size:13px;font-weight:700;
        padding:10px 20px;text-align:center;position:sticky;top:0;z-index:9}
h1{font-size:28px;line-height:1.35;font-weight:800;margin:26px 0 18px;letter-spacing:-.6px;text-wrap:balance}
h2{font-size:21px;font-weight:800;margin:44px 0 14px;letter-spacing:-.4px;
   padding-left:12px;border-left:5px solid var(--p);text-wrap:balance}
p{margin:0 0 16px}
strong{font-weight:700;color:var(--rose-deep)}
em{font-style:italic;color:var(--muted)}
blockquote{background:var(--alt);border-left:4px solid var(--aqua);border-radius:0 8px 8px 0;
           padding:12px 16px;margin:0 0 20px;font-size:14.5px;color:var(--muted);line-height:1.65}
blockquote strong{color:var(--rose-deep)}
ul,ol{margin:0 0 18px;padding-left:22px}
li{margin-bottom:9px}
hr{border:0;border-top:1px solid var(--line);margin:34px 0 22px}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 20px;
    border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;background:var(--surface);width:100%;min-width:660px;font-size:14px}
th{background:var(--alt);color:var(--rose-deep);font-weight:700;text-align:left;
   padding:11px 12px;white-space:nowrap}
td{padding:11px 12px;border-top:1px solid var(--line);color:var(--muted)}
td:first-child{color:var(--ink);font-weight:600;white-space:nowrap}
td:nth-child(3),td:nth-child(4),th:nth-child(3),th:nth-child(4){white-space:nowrap}
.viz{margin:26px 0 30px;background:var(--plate);border:1px solid var(--plate-line);
     border-radius:14px;padding:0 0 4px;overflow:hidden}
.viz img,.viz video{width:calc(100% - 24px);margin:8px 12px 0;height:auto;display:block;border-radius:8px}
.vtag{display:inline-block;background:var(--plate-tag);color:#fff;font-size:11px;
      font-weight:700;padding:5px 12px;border-radius:0 0 10px 0;letter-spacing:.5px}
figcaption{font-size:13.5px;color:var(--plate-ink);line-height:1.6;padding:10px 16px 12px}
.cards{margin-top:46px;padding-top:8px}
.cards h2{margin-top:0}
.note{font-size:13.5px;color:var(--muted);margin-bottom:6px}
""".replace("__FONT__", CFG["font"])

INNER = f'<div class="banner">{CFG["banner"]}</div>\n<div class="wrap">\n{body}\n</div>'
lang_attr = "ko" if LANG == "ko" else "zh-Hant"
standalone = f"""<!doctype html>
<html lang="{lang_attr}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{CFG["standalone_title"]}</title>
<style>{CSS}</style></head>
<body>
{INNER}
</body></html>"""
out = os.path.join(CH01, LANG, f'chapter-01-preview-{LANG}.html')
open(out, 'w').write(standalone)
print('wrote %s  %.1f KB' % (os.path.basename(out), len(standalone.encode()) / 1024))

if len(sys.argv) > 2:   # 아티팩트용: 래퍼 없이 본문만 (발행 시 스켈레톤이 씌워진다)
    art = f"""<title>{CFG["title"]}</title>\n<style>{CSS}</style>\n{INNER}"""
    open(sys.argv[2], 'w').write(art)
    print('wrote artifact variant %.1f KB → %s' % (len(art.encode()) / 1024, sys.argv[2]))
print('삽입 검증:', placed)
