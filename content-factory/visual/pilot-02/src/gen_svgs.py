#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""#2 四大鍵結 비주얼 파일럿 — SVG 생성기 (전부 로컬, 크레딧 0)
palette/font: content-factory/visual/style.json 기준. 재실행하면 동일 산출물 재현."""
import json, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # content-factory/visual
STYLE = json.load(open(os.path.join(ROOT, "style.json")))
PAL = {k: v["hex"] for k, v in STYLE["palette"].items()}
T = STYLE["derived_tints"]
P, INK, PAPER, AQUA = PAL["primary"], PAL["ink"], PAL["paper"], PAL["aqua"]
ROSE_SOFT, ROSE_DEEP = T["primary_soft"], T["primary_deep"]
MUTED, LINE, PAPER_ALT = T["ink_muted"], T["line_soft"], T["paper_alt"]
AQUA_SOFT = T.get("aqua_soft", "#d6eef0")
FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif"

TEXTS = []  # 간체 lint용 전체 문자열 수집
def tx(x, y, s, size=24, fill=INK, weight=500, anchor="middle", spacing=None):
    TEXTS.append(s)
    ls = f" letter-spacing='{spacing}'" if spacing else ""
    return (f"<text x='{x}' y='{y}' font-family={FONT!r} font-size='{size}' "
            f"font-weight='{weight}' fill='{fill}' text-anchor='{anchor}'{ls}>{s}</text>")

def svg_open(w, h, bg=PAPER):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' "
            f"width='{w}' height='{h}'>\n<rect width='{w}' height='{h}' fill='{bg}'/>")

def face(cx, cy, s=1.0, mood="happy", look=(0, 0)):
    """단순 얼굴: 눈 2 + 입. look=(dx,dy) 시선 오프셋."""
    lx, ly = look
    ex1, ex2, ey = cx - 20 * s, cx + 20 * s, cy - 6 * s
    out = f"<circle cx='{ex1+lx}' cy='{ey+ly}' r='{5.5*s}' fill='{INK}'/>"
    out += f"<circle cx='{ex2+lx}' cy='{ey+ly}' r='{5.5*s}' fill='{INK}'/>"
    m = cy + 16 * s
    if mood == "happy":
        out += f"<path d='M {cx-12*s} {m} Q {cx} {m+10*s} {cx+12*s} {m}' stroke='{INK}' stroke-width='{3*s}' fill='none' stroke-linecap='round'/>"
    elif mood == "worried":
        out += f"<path d='M {cx-12*s} {m+6*s} Q {cx} {m-4*s} {cx+12*s} {m+6*s}' stroke='{INK}' stroke-width='{3*s}' fill='none' stroke-linecap='round'/>"
    elif mood == "stern":
        out += f"<line x1='{cx-12*s}' y1='{m}' x2='{cx+12*s}' y2='{m}' stroke='{PAPER}' stroke-width='{3.5*s}' stroke-linecap='round'/>"
        out = out.replace(f"fill='{INK}'/>", f"fill='{PAPER}'/>")  # 대들보 위 얼굴은 밝게
    elif mood == "shock":
        out += f"<ellipse cx='{cx}' cy='{m}' rx='{6*s}' ry='{8*s}' fill='{INK}'/>"
    return out

def droplet(cx, cy, s=1.0, fill=AQUA):
    return (f"<path d='M {cx} {cy-16*s} C {cx+12*s} {cy} {cx+11*s} {cy+10*s} {cx} {cy+14*s} "
            f"C {cx-11*s} {cy+10*s} {cx-12*s} {cy} {cx} {cy-16*s} Z' fill='{fill}'/>")

def curl(cx, cy, s=1.0, color=P, droop=0.0):
    """곱슬 스월. droop=1이면 축 처진 곡선."""
    if droop >= 0.99:
        return f"<path d='M {cx-30*s} {cy-10*s} Q {cx} {cy+26*s} {cx+30*s} {cy+34*s}' stroke='{color}' stroke-width='{5*s}' fill='none' stroke-linecap='round'/>"
    return (f"<path d='M {cx-32*s} {cy} q {14*s} {-30*s} {30*s} {-8*s} q {12*s} {16*s} {-4*s} {22*s} "
            f"q {-14*s} {5*s} {-16*s} {-8*s} m {22*s} {14*s} q {18*s} {8*s} {32*s} {-6*s}' "
            f"stroke='{color}' stroke-width='{5*s}' fill='none' stroke-linecap='round'/>")

# ── 캐릭터 4종 (각 480×520) ──────────────────────────────────────────────
def char_hydrogen(sep=0, mood="worried", show_drop=True, label=True):
    o = []
    lx, rx, cy = 168 - sep, 312 + sep, 218
    o.append(f"<line x1='{lx}' y1='{cy}' x2='{rx}' y2='{cy}' stroke='{AQUA}' stroke-width='4' stroke-dasharray='7 6'/>")
    for cx, look in ((lx, (4, -3)), (rx, (2, -4))):
        o.append(f"<circle cx='{cx}' cy='{cy}' r='60' fill='{AQUA_SOFT}' stroke='{AQUA}' stroke-width='4'/>")
        o.append(face(cx, cy, 1.0, mood, look if show_drop else (0, 0)))
    hx = (lx + rx) / 2
    o.append(f"<path d='M {lx+40} {cy+22} Q {hx-12} {cy+44} {hx-6} {cy+34}' stroke='{AQUA}' stroke-width='6' fill='none' stroke-linecap='round'/>")
    o.append(f"<path d='M {rx-40} {cy+22} Q {hx+12} {cy+44} {hx+6} {cy+34}' stroke='{AQUA}' stroke-width='6' fill='none' stroke-linecap='round'/>")
    o.append(f"<circle cx='{hx}' cy='{cy+34}' r='11' fill='{AQUA}'/>")
    if show_drop:
        o.append(droplet(366, 92, 1.5))
        o.append(f"<path d='M 342 118 Q 330 128 320 132' stroke='{AQUA}' stroke-width='3' fill='none' stroke-dasharray='4 5'/>")
    o.append(curl(240, 118, 1.1, P))
    if label:
        o.append(tx(240, 432, "氫鍵", 46, INK, 700))
        o.append(tx(240, 480, "遇水就放手", 26, MUTED, 500))
    return "\n".join(o)

def char_salt(label=True):
    o = []
    lx, rx, cy = 168, 312, 218
    o.append(f"<line x1='{lx}' y1='{cy}' x2='{rx}' y2='{cy}' stroke='{P}' stroke-width='4' stroke-dasharray='3 7'/>")
    o.append(f"<circle cx='{lx}' cy='{cy}' r='60' fill='{ROSE_SOFT}' stroke='{P}' stroke-width='4'/>")
    o.append(f"<circle cx='{rx}' cy='{cy}' r='60' fill='{AQUA_SOFT}' stroke='{AQUA}' stroke-width='4'/>")
    o.append(face(lx, cy, 1.0, "happy", (7, 2)))
    o.append(face(rx, cy, 1.0, "worried", (7, 2)))
    o.append(f"<circle cx='{lx}' cy='{cy-78}' r='17' fill='{P}'/>" + tx(lx, cy - 71, "＋", 22, PAPER, 700))
    o.append(f"<circle cx='{rx}' cy='{cy-78}' r='17' fill='{AQUA}'/>" + tx(rx, cy - 71, "－", 22, PAPER, 700))
    sx, sy = 408, 150
    o.append(f"<rect x='{sx}' y='{sy}' width='44' height='132' rx='8' fill='{PAPER}' stroke='{LINE}' stroke-width='3'/>")
    for i, c in enumerate((P, PAPER_ALT, AQUA)):
        o.append(f"<rect x='{sx+8}' y='{sy+10+i*40}' width='28' height='32' rx='4' fill='{c}'/>")
    o.append(tx(sx + 22, sy + 172, "pH", 22, MUTED, 700))
    if label:
        o.append(tx(240, 432, "鹽鍵", 46, INK, 700))
        o.append(tx(240, 480, "看pH臉色", 26, MUTED, 500))
    return "\n".join(o)

def sq(cx, cy, s=1.0, fill=None, stroke=None):
    w = 104 * s
    return (f"<rect x='{cx-w/2}' y='{cy-w/2}' width='{w}' height='{w}' rx='{22*s}' "
            f"fill='{fill or P}' stroke='{stroke or ROSE_DEEP}' stroke-width='{4*s}'/>")

def char_disulfide(label=True):
    o = []
    lx, rx, cy = 162, 318, 210
    for y in (-14, 14):
        o.append(f"<line x1='{lx+40}' y1='{cy+y}' x2='{rx-40}' y2='{cy+y}' stroke='{ROSE_DEEP}' stroke-width='9' stroke-linecap='round'/>")
    o.append(sq(lx, cy)); o.append(sq(rx, cy))
    o.append(tx(lx, cy - 24, "S", 30, PAPER, 700)); o.append(tx(rx, cy - 24, "S", 30, PAPER, 700))
    o.append(face(lx, cy + 14, 0.9, "happy").replace(INK, PAPER))
    o.append(face(rx, cy + 14, 0.9, "happy").replace(INK, PAPER))
    hx = (lx + rx) / 2
    o.append(f"<rect x='{hx-26}' y='{cy-13}' width='52' height='26' rx='12' fill='{ROSE_DEEP}'/>")
    o.append(tx(hx, cy + 7, "✦", 20, ROSE_SOFT, 700))
    bx, by = 402, 300
    o.append(f"<rect x='{bx-24}' y='{by-14}' width='48' height='74' rx='12' fill='{PAPER_ALT}' stroke='{P}' stroke-width='4'/>")
    o.append(f"<rect x='{bx-12}' y='{by-38}' width='24' height='26' rx='5' fill='{P}'/>")
    o.append(tx(bx, by + 34, "一劑", 20, ROSE_DEEP, 700))
    if label:
        o.append(tx(240, 432, "雙硫鍵", 46, INK, 700))
        o.append(tx(240, 480, "握手最緊，只有一劑能鬆開", 26, MUTED, 500))
    return "\n".join(o)

def char_peptide(label=True):
    o = []
    for x in (118, 302):
        o.append(f"<rect x='{x}' y='252' width='60' height='96' fill='{LINE}' stroke='{INK}' stroke-width='4'/>")
    o.append(f"<rect x='58' y='168' width='364' height='84' rx='10' fill='{INK}'/>")
    for x in (84, 396):
        for y in (188, 232):
            o.append(f"<circle cx='{x}' cy='{y}' r='6' fill='{PAPER}'/>")
    o.append(face(240, 204, 1.05, "stern"))
    o.append(f"<path d='M 402 96 L 434 148 L 370 148 Z' fill='{ROSE_SOFT}' stroke='{P}' stroke-width='4' stroke-linejoin='round'/>")
    o.append(tx(402, 140, "！", 26, P, 700))
    if label:
        o.append(tx(240, 432, "胜肽鍵", 46, INK, 700))
        o.append(tx(240, 480, "主鏈大樑，動了就崩", 26, MUTED, 500))
    return "\n".join(o)

CHARS = {
    "char-hydrogen": char_hydrogen, "char-salt": char_salt,
    "char-disulfide": char_disulfide, "char-peptide": char_peptide,
}

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print("wrote", os.path.relpath(path, ROOT))

for name, fn in CHARS.items():
    body = svg_open(480, 520) + "\n" + fn() + "\n</svg>"
    write(os.path.join(ROOT, f"{name}.svg"), body)

# ── 캐릭터 시트 characters.svg (1000×1240) ───────────────────────────────
sheet = [svg_open(1000, 1240)]
sheet.append(tx(500, 78, "頭髮四大鍵結・角色表", 46, INK, 700))
sheet.append(tx(500, 120, "#2 四大鍵結｜美髮丙級 學科", 24, MUTED))
positions = [("char-hydrogen", 20, 150), ("char-salt", 500, 150), ("char-disulfide", 20, 690), ("char-peptide", 500, 690)]
for name, x, y in positions:
    sheet.append(f"<g transform='translate({x},{y})'>")
    sheet.append(f"<rect x='0' y='0' width='480' height='520' rx='18' fill='{PAPER}' stroke='{LINE}' stroke-width='3'/>")
    sheet.append(CHARS[name]())
    sheet.append("</g>")
write(os.path.join(ROOT, "characters.svg"), "\n".join(sheet) + "\n</svg>")

PILOT = os.path.join(ROOT, "pilot-02")

# ── 일러 ①: 강도 비교 (1080×720) ─────────────────────────────────────────
o = [svg_open(1080, 720)]
o.append(tx(540, 76, "頭髮四大鍵結・強度比較", 42, INK, 700))
rows = [
    ("胜肽鍵", INK, PAPER, 690, "主鏈骨架・最強", INK),
    ("雙硫鍵", P, PAPER, 520, "側鏈化學鍵・燙髮的對象", P),
    ("鹽鍵", ROSE_SOFT, ROSE_DEEP, 330, "側鏈・受pH影響", "none"),
    ("氫鍵", AQUA, PAPER, 185, "側鏈・遇水就斷・最弱", AQUA),
]
y = 140
for name, chip, chiptxt, blen, note, barfill in rows:
    stroke = f" stroke='{P}' stroke-width='3'" if barfill == "none" else ""
    fill = ROSE_SOFT if barfill == "none" else barfill
    o.append(f"<rect x='60' y='{y}' width='160' height='58' rx='29' fill='{chip}'/>")
    o.append(tx(140, y + 39, name, 28, chiptxt, 700))
    o.append(f"<rect x='250' y='{y+9}' width='{blen}' height='40' rx='20' fill='{fill}'{stroke}/>")
    o.append(tx(250, y + 90, note, 22, MUTED, 500, "start"))
    y += 128
o.append(f"<line x1='60' y1='652' x2='1020' y2='652' stroke='{LINE}' stroke-width='2'/>")
o.append(tx(540, 692, "側鏈三鍵決定造型；主鏈一斷，頭髮就斷。", 24, ROSE_DEEP, 700))
write(os.path.join(PILOT, "illust-01-strength.svg"), "\n".join(o) + "\n</svg>")

# ── 일러 ②: 물 만난 氫鍵 (1080×720) ──────────────────────────────────────
def mini_pair(sep, mood, link, extra=""):
    g = []
    lx, rx, cy = 100 - sep, 220 + sep, 190
    if link == "solid":
        g.append(f"<line x1='{lx}' y1='{cy}' x2='{rx}' y2='{cy}' stroke='{AQUA}' stroke-width='4'/>")
    elif link == "dash":
        g.append(f"<line x1='{lx}' y1='{cy}' x2='{lx+34}' y2='{cy}' stroke='{AQUA}' stroke-width='4' stroke-dasharray='5 5'/>")
        g.append(f"<line x1='{rx-34}' y1='{cy}' x2='{rx}' y2='{cy}' stroke='{AQUA}' stroke-width='4' stroke-dasharray='5 5'/>")
    for cx in (lx, rx):
        g.append(f"<circle cx='{cx}' cy='{cy}' r='42' fill='{AQUA_SOFT}' stroke='{AQUA}' stroke-width='3.5'/>")
        g.append(face(cx, cy, 0.72, mood))
    return "\n".join(g) + extra

panels = [
    ("① 乾燥・相連", mini_pair(0, "happy", "solid", curl(160, 96, 0.9, P)), "氫鍵手拉手，捲度在"),
    ("② 遇水・放手", mini_pair(26, "shock", "dash",
        droplet(160, 70, 1.2) + droplet(90, 108, 0.9) + droplet(232, 104, 0.9) + curl(160, 96, 0.9, MUTED, droop=1)),
    "濕氣一來，鍵結斷開"),
    ("③ 吹乾・重新連結", mini_pair(0, "happy", "solid",
        curl(160, 96, 0.9, P) + f"<path d='M 250 60 q 16 8 0 16 m 16 -22 q 16 8 0 16' stroke='{MUTED}' stroke-width='3' fill='none' stroke-linecap='round'/>"),
    "定型完成，捲度回來"),
]
o = [svg_open(1080, 720)]
o.append(tx(540, 76, "氫鍵：遇水就放手，吹乾再牽手", 42, INK, 700))
for i, (head, body, cap) in enumerate(panels):
    x = 40 + i * 340
    o.append(f"<g transform='translate({x},130)'>")
    o.append(f"<rect x='0' y='0' width='320' height='440' rx='18' fill='{PAPER_ALT}' stroke='{LINE}' stroke-width='2'/>")
    o.append(tx(160, 52, head, 26, ROSE_DEEP, 700))
    o.append(f"<g transform='translate(0,80)'>{body}</g>")
    o.append(tx(160, 402, cap, 22, MUTED))
    o.append("</g>")
o.append(tx(540, 640, "濕氣＝放手 → 捲度消失｜吹乾定型＝再牽手", 26, INK, 700))
o.append(tx(540, 684, "這就是「吹的捲」撐不過下雨天的原因", 22, MUTED))
write(os.path.join(PILOT, "illust-02-hydrogen-water.svg"), "\n".join(o) + "\n</svg>")

# ── 일러 ③: 燙髮 3단계 (1080×720) ────────────────────────────────────────
def ss_pair(cy_off, cut, cx=160):
    g = []
    lx, rx = cx - 62, cx + 62
    ly, ry = 150, 150 + cy_off
    if cut:
        g.append(f"<line x1='{lx+34}' y1='{ly}' x2='{cx-12}' y2='{ly}' stroke='{ROSE_DEEP}' stroke-width='7' stroke-linecap='round'/>")
        g.append(f"<line x1='{cx+12}' y1='{ry}' x2='{rx-34}' y2='{ry}' stroke='{ROSE_DEEP}' stroke-width='7' stroke-linecap='round'/>")
        g.append(f"<path d='M {cx-6} {ly-16} L {cx+6} {ly+16} M {cx+6} {ly-16} L {cx-6} {ly+16}' stroke='{P}' stroke-width='4' stroke-linecap='round'/>")
    else:
        g.append(f"<line x1='{lx+30}' y1='{(ly+ry)/2-8}' x2='{rx-30}' y2='{(ly+ry)/2-8}' stroke='{ROSE_DEEP}' stroke-width='7' stroke-linecap='round'/>")
        g.append(f"<line x1='{lx+30}' y1='{(ly+ry)/2+8}' x2='{rx-30}' y2='{(ly+ry)/2+8}' stroke='{ROSE_DEEP}' stroke-width='7' stroke-linecap='round'/>")
    g.append(sq(lx, ly, 0.72)); g.append(tx(lx, ly - 14, "S", 22, PAPER, 700))
    g.append(sq(rx, ry, 0.72)); g.append(tx(rx, ry - 14, "S", 22, PAPER, 700))
    return "\n".join(g)

steps = [
    ("STEP 1", "第一劑（還原劑）", "打開雙硫鍵", ss_pair(0, cut=True) +
        f"<rect x='236' y='210' width='40' height='58' rx='10' fill='{PAPER_ALT}' stroke='{P}' stroke-width='3'/>"
        f"<rect x='246' y='192' width='20' height='20' rx='4' fill='{P}'/>" + tx(256, 296, "一劑", 18, ROSE_DEEP, 700)),
    ("STEP 2", "捲棒塑形", "位置重新排列", ss_pair(54, cut=True) +
        f"<circle cx='160' cy='250' r='34' fill='none' stroke='{INK}' stroke-width='5'/>"
        f"<path d='M 126 250 a 34 34 0 0 1 68 0' stroke='{P}' stroke-width='5' fill='none'/>"),
    ("STEP 3", "第二劑（氧化劑）", "新位置重新結合", ss_pair(54, cut=False) +
        f"<rect x='238' y='224' width='36' height='30' rx='6' fill='{P}'/>"
        f"<path d='M 246 224 v-8 a 10 10 0 0 1 20 0 v8' stroke='{P}' stroke-width='5' fill='none'/>"),
]
o = [svg_open(1080, 720)]
o.append(tx(540, 76, "燙髮三部曲：雙硫鍵的拆與接", 42, INK, 700))
for i, (step, t1, t2, body) in enumerate(steps):
    x = 30 + i * 350
    o.append(f"<g transform='translate({x},120)'>")
    o.append(f"<rect x='0' y='0' width='320' height='440' rx='18' fill='{PAPER}' stroke='{LINE}' stroke-width='3'/>")
    o.append(f"<rect x='96' y='-20' width='128' height='44' rx='22' fill='{P}'/>")
    o.append(tx(160, 10, step, 24, PAPER, 700))
    o.append(tx(160, 66, t1, 28, INK, 700))
    o.append(tx(160, 100, t2, 24, MUTED))
    o.append(f"<g transform='translate(0,20)'>{body}</g>")
    o.append("</g>")
    if i < 2:
        ax = x + 330
        o.append(f"<path d='M {ax} 340 h 22 m -8 -10 l 10 10 l -10 10' stroke='{ROSE_DEEP}' stroke-width='5' fill='none' stroke-linecap='round' stroke-linejoin='round'/>")
o.append(tx(540, 640, "拆（還原）→ 排（塑形）→ 接（氧化）＝新捲度定住", 26, INK, 700))
o.append(tx(540, 684, "一劑拆鍵、二劑接鍵——順序錯了，燙不出也留不住", 22, MUTED))
write(os.path.join(PILOT, "illust-03-perm-3steps.svg"), "\n".join(o) + "\n</svg>")

json.dump(TEXTS, open(os.path.join(PILOT, "src", "texts_svg.json"), "w"), ensure_ascii=False, indent=1)
print("done. text strings:", len(TEXTS))
