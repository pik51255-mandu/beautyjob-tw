# -*- coding: utf-8 -*-
"""검수판 HTML 빌더 — 모바일 가독(단일 컬럼·큰 글자·문항별 구분선). 외부 md 라이브러리 없이 처리."""
import html, re, sys

src, dst = sys.argv[1], sys.argv[2]
md = open(src, encoding="utf-8").read()

# front-matter 분리
fm = {}
if md.startswith("---"):
    head, md = md.split("\n---\n", 1)
    for line in head.splitlines()[1:]:
        if ":" in line and not line.startswith(" ") and not line.startswith("-"):
            k, v = line.split(":", 1); fm[k.strip()] = v.strip()

def inline(t):
    t = html.escape(t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return t

out, i, h1_seen = [], 0, False
lines = md.split("\n")
while i < len(lines):
    ln = lines[i]
    if ln.startswith("<details") or ln.startswith("</details") or ln.startswith("<summary"):
        i += 1; continue
    m = re.match(r"^(#{1,4})\s+(.*)$", ln)
    if m:
        lv, txt = len(m.group(1)), m.group(2)
        qid = re.match(r"^(\d{2}-\d{3})$", txt.strip())
        if lv == 1:
            # 표지에 이미 제목이 있으므로 본문 H1 은 버린다.
            i += 1; continue
        if qid:
            out.append(f'<hr class="qsep"><h3 class="qid">{html.escape(txt)}</h3>')
        else:
            out.append(f"<h{lv}>{inline(txt)}</h{lv}>")
        i += 1; continue
    if ln.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            rows.append(lines[i]); i += 1
        cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows
                 if not re.match(r"^\|[\s:|-]+\|$", r)]
        if cells:
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in cells[0]) + "</tr></thead><tbody>")
            for r in cells[1:]:
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            out.append("</tbody></table>")
        continue
    if ln.startswith("> "):
        buf = []
        while i < len(lines) and lines[i].startswith("> "):
            buf.append(lines[i][2:]); i += 1
        body = inline(" ".join(buf))
        cls = "quote-vs" if "시험 답 vs 현장" in body else "quote-q"
        out.append(f'<blockquote class="{cls}">{body}</blockquote>')
        continue
    if ln.startswith("- "):
        buf = []
        while i < len(lines) and lines[i].startswith("- "):
            buf.append(lines[i][2:]); i += 1
        out.append("<ul>" + "".join(f"<li>{inline(b)}</li>" for b in buf) + "</ul>")
        continue
    if re.match(r"^\d+\.\s", ln):
        buf = []
        while i < len(lines) and re.match(r"^\d+\.\s", lines[i]):
            buf.append(re.sub(r"^\d+\.\s", "", lines[i])); i += 1
        out.append("<ol>" + "".join(f"<li>{inline(b)}</li>" for b in buf) + "</ol>")
        continue
    if ln.strip() == "---":
        out.append("<hr>"); i += 1; continue
    if not ln.strip():
        i += 1; continue
    buf = []
    while i < len(lines) and lines[i].strip() and not re.match(r"^(#|\||>|-\s|\d+\.\s|---$)", lines[i]):
        buf.append(lines[i]); i += 1
    para = " ".join(buf)
    cls = ""
    if para.startswith("**직역**"): cls = ' class="lit"'
    elif para.startswith("**정답"): cls = ' class="ans"'
    elif para.startswith("→ 관련 이론"): cls = ' class="rel"'
    out.append(f"<p{cls}>{inline(para)}</p>")

title = fm.get("title", "검수판")
CSS = """
@page { size: A4; margin: 14mm 12mm 16mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Noto Sans KR", "PingFang TC", "Apple SD Gothic Neo", sans-serif;
       font-size: 15pt; line-height: 1.85; color: #16181d; margin: 0; max-width: 100%;
       -webkit-font-smoothing: antialiased; word-break: keep-all; }
.cover { border-bottom: 3px solid #16181d; padding-bottom: 14px; margin-bottom: 24px; }
.cover h1 { font-size: 24pt; line-height: 1.35; margin: 0 0 10px; }
.cover .meta { font-size: 12pt; color: #5b6270; line-height: 1.7; }
.cover .badge { display:inline-block; background:#16181d; color:#fff; border-radius:5px;
                padding:3px 10px; font-size:11pt; margin-bottom:10px; }
h2 { font-size: 19pt; margin: 34px 0 12px; padding: 9px 12px; background: #f2f3f6;
     border-left: 6px solid #16181d; border-radius: 0 6px 6px 0; page-break-after: avoid; }
h3.qid { font-size: 13pt; color: #fff; background: #3a4150; display: inline-block;
         padding: 4px 12px; border-radius: 20px; margin: 0 0 10px; letter-spacing: .04em;
         page-break-after: avoid; }
h4 { font-size: 15pt; margin: 20px 0 8px; }
p { margin: 0 0 11px; }
hr.qsep { border: 0; border-top: 2px dashed #ccd0d8; margin: 30px 0 18px; }
hr { border: 0; border-top: 1px solid #d8dce3; margin: 26px 0; }
blockquote.quote-q { margin: 0 0 13px; padding: 14px 16px; background: #fbfaf5;
    border: 1.5px solid #e0dcc8; border-radius: 8px; font-size: 15.5pt; line-height: 1.95;
    font-family: "PingFang TC", "Heiti TC", serif; page-break-inside: avoid; }
blockquote.quote-vs { margin: 12px 0 13px; padding: 13px 15px; background: #fff7ed;
    border-left: 5px solid #d97706; border-radius: 0 8px 8px 0; font-size: 13.5pt; line-height: 1.8; }
p.lit { color: #4a515f; font-size: 13.5pt; margin: 0 0 8px; }
p.ans { font-size: 16pt; font-weight: 700; color: #b0122f; margin: 0 0 10px; }
p.rel { font-size: 12.5pt; color: #5b6270; margin-top: 10px; }
p.rel a { color: #5b6270; }
a { color: #16181d; text-decoration: none; border-bottom: 1px solid #c9ced8; }
table { width: 100%; border-collapse: collapse; margin: 14px 0 18px; font-size: 13pt;
        page-break-inside: avoid; }
th, td { border: 1px solid #d8dce3; padding: 8px 10px; text-align: left; }
th { background: #f2f3f6; font-weight: 600; }
ul, ol { margin: 0 0 13px; padding-left: 1.3em; }
li { margin-bottom: 6px; }
strong { font-weight: 700; }
.src { margin-top: 30px; padding: 14px 16px; background: #f2f3f6; border-radius: 8px;
       font-size: 11.5pt; line-height: 1.75; color: #4a515f; }
"""
body_html = chr(10).join(out).replace("<p>題目來源：", '<p class="src">題目來源：')

doc = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>{html.escape(title)}</title><style>{CSS}</style></head><body>
<div class="cover"><div class="badge">검수판 · 내부용</div>
<h1>{html.escape(title)}</h1>
<div class="meta">題庫 {html.escape(fm.get('exam_bank',''))}　·　slug <code>{html.escape(fm.get('slug',''))}</code><br>
문항 30 · 한국어 마스터 (번체 번역 전)　·　2026-08-22</div></div>
{body_html}
</body></html>"""
open(dst, "w", encoding="utf-8").write(doc)
print(f"HTML: {dst} ({len(doc):,} bytes)")
