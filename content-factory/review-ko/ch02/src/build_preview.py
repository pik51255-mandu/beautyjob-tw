#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""chapter-02-preview.html 빌드 — article-ko.md를 단일 소스로, 비주얼을 제자리에 삽입.
모든 자산은 base64 내장 → 외부 리소스 참조 0 (폰은 파일 하나만 열면 됨)."""
import base64, html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
CH02 = os.path.dirname(HERE)

def b64(name):
    ext = name.rsplit('.', 1)[1]
    mime = {'png': 'image/png', 'mp4': 'video/mp4', 'webm': 'video/webm'}[ext]
    with open(os.path.join(CH02, name), 'rb') as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()

# ── 최소 마크다운 → HTML ────────────────────────────────────────────────
def inline(s):
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    return s

def md_to_html(md):
    out, i = [], 0
    lines = md.split('\n')
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1; continue
        if ln.startswith('---'):
            out.append('<hr>'); i += 1; continue
        m = re.match(r'^(#{1,3})\s+(.*)', ln)
        if m:
            lv = len(m.group(1))
            out.append(f'<h{lv}>{inline(m.group(2))}</h{lv}>'); i += 1; continue
        if ln.startswith('|'):                                   # 표
            tbl = []
            while i < len(lines) and lines[i].startswith('|'):
                tbl.append(lines[i]); i += 1
            cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]
            head = cells(tbl[0]); body = [cells(r) for r in tbl[2:]]
            t = ['<div class="tw"><table><thead><tr>']
            t += [f'<th>{inline(c)}</th>' for c in head] + ['</tr></thead><tbody>']
            for r in body:
                t.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
            t.append('</tbody></table></div>')
            out.append(''.join(t)); continue
        if ln.startswith('> '):                                  # 인용
            buf = []
            while i < len(lines) and lines[i].startswith('> '):
                buf.append(inline(lines[i][2:])); i += 1
            out.append('<blockquote>' + '<br>'.join(buf) + '</blockquote>'); continue
        if re.match(r'^\d+\.\s', ln):                            # 순서 목록
            buf = []
            while i < len(lines) and re.match(r'^\d+\.\s', lines[i]):
                buf.append(f'<li>{inline(re.sub(chr(94)+chr(92)+"d+"+chr(92)+".s*", "", lines[i]))}</li>'); i += 1
            out.append('<ol>' + ''.join(buf) + '</ol>'); continue
        if ln.startswith('- '):                                  # 목록
            buf = []
            while i < len(lines) and lines[i].startswith('- '):
                buf.append(f'<li>{inline(lines[i][2:])}</li>'); i += 1
            out.append('<ul>' + ''.join(buf) + '</ul>'); continue
        buf = []                                                 # 문단
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||>|-\s|\d+\.\s|---)', lines[i]):
            buf.append(inline(lines[i])); i += 1
        out.append('<p>' + ' '.join(buf) + '</p>')
    return out

# ── 비주얼 블록 ─────────────────────────────────────────────────────────
def fig(src, cap, tag):
    return (f'<figure class="viz"><span class="vtag">{tag}</span>'
            f'<img src="{src}" alt=""><figcaption>{cap}</figcaption></figure>')

def vid(mp4, webm, poster, cap, tag):
    # 폰(iOS/안드로이드)은 H.264 mp4를 먼저 집는다. webm은 mp4 코덱이 없는 환경용 폴백,
    # poster는 둘 다 실패해도 첫 프레임이 보이도록 하는 안전장치.
    return (f'<figure class="viz"><span class="vtag">{tag}</span>'
            f'<video autoplay muted loop playsinline poster="{poster}">'
            f'<source src="{mp4}" type="video/mp4">'
            f'<source src="{webm}" type="video/webm">'
            f'</video><figcaption>{cap}</figcaption></figure>')

md = open(os.path.join(CH02, 'article-ko.md')).read()
blocks = md_to_html(md)

# 캡션은 본문 요약이 아니라 "장면 설명" 한 줄
V = {
  'illust1': fig(b64('illust-01-strength-ko.png'),
                 '막대 길이가 결합의 상대적 강도. 검은 막대만 주쇄, 나머지 셋은 측쇄다.', '일러스트 ①'),
  'illust2': fig(b64('illust-02-hydrogen-water-ko.png'),
                 '왼쪽부터 건조·젖음·재건조. 가운데 칸에서만 두 파트너의 손이 떨어져 있다.', '일러스트 ②'),
  'illust3': fig(b64('illust-03-perm-3steps-ko.png'),
                 'S와 S가 붙잡은 손을 끊고(X), 위치를 어긋나게 옮긴 뒤, 다시 두 줄로 잇는다.', '일러스트 ③'),
  'loop':    vid(b64('loop-hydrogen-ko.mp4'), b64('loop-hydrogen-ko.webm'), b64('poster-loop-ko.png'),
                 '물방울이 결합점에 닿는 순간 손이 풀리고 컬이 늘어진다. 드라이 바람에 역순으로 되돌아간다.', '루프 애니'),
}
CARDS = ('<section class="cards"><h2>스레드 카드</h2>'
         '<p class="note">본문과 별개로 SNS에 단독 게시되는 이미지입니다.</p>'
         f'<figure class="viz"><span class="vtag">카드 ①</span><img src="{b64("card-01-concept-ko.png")}" alt="">'
         '<figcaption>훅 질문 + 수소결합 캐릭터. 답을 카드 안에서 바로 준다.</figcaption></figure>'
         f'<figure class="viz"><span class="vtag">카드 ②</span><img src="{b64("card-02-quiz-ko.png")}" alt="">'
         '<figcaption>題庫 문항을 갈아 끼우는 빈 템플릿. 문제·선택지 영역만 교체한다.</figcaption></figure>'
         '</section>')

# ── 삽입 위치 확정 ──────────────────────────────────────────────────────
final, placed = [], []
for b in blocks:
    final.append(b)
    if '<table>' in b and not placed.count('i1'):                       # 대조표 직후
        final.append(V['illust1']); placed.append('i1')
    elif '되돌아가는 것도 똑같이 쉽다' in b and not placed.count('i2'):   # 수소결합 단락 옆
        final.append(V['illust2']); placed.append('i2')
    elif '<ol>' in b and not placed.count('i3'):                        # 펌 3단계 단락 옆
        final.append(V['illust3']); placed.append('i3')
    elif '끊는 도구가 곧 지속 시간' in b and not placed.count('lo'):      # 결론 직후
        final.append(V['loop']); placed.append('lo')
assert placed == ['i1', 'i2', 'i3', 'lo'], f'삽입 실패: {placed}'

body = '\n'.join(final)
# 문서 말미 구분선 앞에 카드 섹션
body = body.replace('<hr>', CARDS + '<hr>', 1) if '<hr>' in body else body + CARDS

CSS = """
:root{--p:#b92846;--ink:#0f1216;--paper:#fbf8f5;--aqua:#00a9b3;--rose-deep:#641f29;
      --muted:#6b727e;--line:#ddd6d1;--alt:#f6e8de;}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--paper);color:var(--ink);
     font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',
                 'Malgun Gothic','Segoe UI',Roboto,sans-serif;
     line-height:1.75;font-size:17px;-webkit-text-size-adjust:100%}
.wrap{max-width:720px;margin:0 auto;padding:22px 20px 80px}
.banner{background:var(--rose-deep);color:#fff;font-size:13px;font-weight:700;
        padding:10px 20px;text-align:center;letter-spacing:.3px;position:sticky;top:0;z-index:9}
h1{font-size:28px;line-height:1.35;font-weight:800;margin:26px 0 18px;letter-spacing:-.6px}
h2{font-size:21px;font-weight:800;margin:44px 0 14px;letter-spacing:-.4px;
   padding-left:12px;border-left:5px solid var(--p)}
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
table{border-collapse:collapse;width:100%;min-width:520px;font-size:14px}
th{background:var(--alt);color:var(--rose-deep);font-weight:700;text-align:left;
   padding:11px 12px;white-space:nowrap}
td{padding:11px 12px;border-top:1px solid var(--line);color:var(--muted)}
td:first-child{color:var(--ink);font-weight:600;white-space:nowrap}
.viz{margin:26px 0 30px;background:#fff;border:1px solid var(--line);border-radius:14px;
     padding:0 0 4px;overflow:hidden}
.viz img,.viz video{width:calc(100% - 24px);margin:8px 12px 0;height:auto;display:block;border-radius:8px}
/* 태그는 이미지 위에 겹치지 않도록 상단 별도 줄에 배치 */
.vtag{display:inline-block;background:var(--p);color:#fff;font-size:11px;
      font-weight:700;padding:5px 12px;border-radius:0 0 10px 0;letter-spacing:.5px}
figcaption{font-size:13.5px;color:var(--muted);line-height:1.6;padding:10px 16px 12px}
.cards{margin-top:46px;padding-top:8px}
.cards h2{margin-top:0}
.note{font-size:13.5px;color:var(--muted);margin-bottom:6px}
"""

out = f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>챕터 #2 미리보기 — 머리카락의 네 가지 결합 (ko 검수판)</title>
<style>{CSS}</style></head>
<body>
<div class="banner">검수용 미리보기 · 발행본은 번체 — 이 파일은 게재하지 않습니다</div>
<div class="wrap">
{body}
</div>
</body></html>"""

path = os.path.join(CH02, 'chapter-02-preview.html')
open(path, 'w').write(out)
print('wrote chapter-02-preview.html  %.1f KB' % (len(out.encode()) / 1024))
print('삽입 순서 검증:', placed)
