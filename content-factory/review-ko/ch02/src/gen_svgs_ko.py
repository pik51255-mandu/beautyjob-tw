#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""챕터 #2 ko 검수판 일러스트 3컷 — 로컬 생성, 크레딧 0.
팔레트·폰트는 content-factory/visual/style.json 공유. 라벨만 한국어."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
CH02 = os.path.dirname(HERE)
STYLE = json.load(open(os.path.join(CH02, "..", "..", "visual", "style.json")))
PAL = {k: v["hex"] for k, v in STYLE["palette"].items()}
T = STYLE["derived_tints"]
P, INK, PAPER, AQUA = PAL["primary"], PAL["ink"], PAL["paper"], PAL["aqua"]
ROSE_SOFT, ROSE_DEEP = T["primary_soft"], T["primary_deep"]
MUTED, LINE, PAPER_ALT, AQUA_SOFT = T["ink_muted"], T["line_soft"], T["paper_alt"], T["aqua_soft"]
FONT = "'Noto Sans KR','Noto Sans TC','Apple SD Gothic Neo',sans-serif"

def tx(x, y, s, size=24, fill=INK, weight=500, anchor="middle"):
    return (f"<text x='{x}' y='{y}' font-family={FONT!r} font-size='{size}' "
            f"font-weight='{weight}' fill='{fill}' text-anchor='{anchor}'>{s}</text>")

def svg_open(w, h, bg=PAPER):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' "
            f"width='{w}' height='{h}'>\n<rect width='{w}' height='{h}' fill='{bg}'/>")

def face(cx, cy, s=1.0, mood="happy"):
    ex1, ex2, ey = cx - 20 * s, cx + 20 * s, cy - 6 * s
    out = (f"<circle cx='{ex1}' cy='{ey}' r='{5.5*s}' fill='{INK}'/>"
           f"<circle cx='{ex2}' cy='{ey}' r='{5.5*s}' fill='{INK}'/>")
    m = cy + 16 * s
    if mood == "happy":
        out += f"<path d='M {cx-12*s} {m} Q {cx} {m+10*s} {cx+12*s} {m}' stroke='{INK}' stroke-width='{3*s}' fill='none' stroke-linecap='round'/>"
    elif mood == "shock":
        out += f"<ellipse cx='{cx}' cy='{m}' rx='{6*s}' ry='{8*s}' fill='{INK}'/>"
    return out

def droplet(cx, cy, s=1.0, fill=AQUA):
    return (f"<path d='M {cx} {cy-16*s} C {cx+12*s} {cy} {cx+11*s} {cy+10*s} {cx} {cy+14*s} "
            f"C {cx-11*s} {cy+10*s} {cx-12*s} {cy} {cx} {cy-16*s} Z' fill='{fill}'/>")

def curl(cx, cy, s=1.0, color=P, droop=False):
    if droop:
        return f"<path d='M {cx-30*s} {cy-10*s} Q {cx} {cy+26*s} {cx+30*s} {cy+34*s}' stroke='{color}' stroke-width='{5*s}' fill='none' stroke-linecap='round'/>"
    return (f"<path d='M {cx-32*s} {cy} q {14*s} {-30*s} {30*s} {-8*s} q {12*s} {16*s} {-4*s} {22*s} "
            f"q {-14*s} {5*s} {-16*s} {-8*s} m {22*s} {14*s} q {18*s} {8*s} {32*s} {-6*s}' "
            f"stroke='{color}' stroke-width='{5*s}' fill='none' stroke-linecap='round'/>")

def sq(cx, cy, s=1.0):
    w = 104 * s
    return (f"<rect x='{cx-w/2}' y='{cy-w/2}' width='{w}' height='{w}' rx='{22*s}' "
            f"fill='{P}' stroke='{ROSE_DEEP}' stroke-width='{4*s}'/>")

def write(name, body):
    path = os.path.join(CH02, name)
    open(path, "w").write(body + "\n</svg>")
    print("wrote", name)

# ── ① 4결합 강도 비교 ────────────────────────────────────────────────────
o = [svg_open(1080, 720)]
o.append(tx(540, 76, "머리카락 네 가지 결합 · 강도 비교", 42, INK, 700))
rows = [
    ("펩타이드결합", INK, PAPER, 690, "주쇄(세로) · 가장 강함 · 끊기면 절모", INK),
    ("이황화결합", P, PAPER, 520, "측쇄 · 화학 약제로만 · 펌의 대상", P),
    ("염결합", ROSE_SOFT, ROSE_DEEP, 330, "측쇄 · pH에 따라 열리고 닫힘", "none"),
    ("수소결합", AQUA, PAPER, 185, "측쇄 · 물·열로 끊김 · 가장 약함", AQUA),
]
y = 140
for name, chip, chiptxt, blen, note, barfill in rows:
    stroke = f" stroke='{P}' stroke-width='3'" if barfill == "none" else ""
    fill = ROSE_SOFT if barfill == "none" else barfill
    o.append(f"<rect x='40' y='{y}' width='196' height='58' rx='29' fill='{chip}'/>")
    o.append(tx(138, y + 39, name, 26, chiptxt, 700))
    o.append(f"<rect x='262' y='{y+9}' width='{blen}' height='40' rx='20' fill='{fill}'{stroke}/>")
    o.append(tx(262, y + 90, note, 22, MUTED, 500, "start"))
    y += 128
o.append(f"<line x1='40' y1='652' x2='1040' y2='652' stroke='{LINE}' stroke-width='2'/>")
o.append(tx(540, 692, "측쇄 세 가닥이 스타일을 정하고, 주쇄 한 가닥이 머리카락을 지탱한다", 24, ROSE_DEEP, 700))
write("illust-01-strength-ko.svg", "\n".join(o))

# ── ② 물 만난 수소결합 ───────────────────────────────────────────────────
def mini_pair(sep, mood, link, extra=""):
    g = []
    lx, rx, cy = 100 - sep, 220 + sep, 190
    if link == "solid":
        g.append(f"<line x1='{lx}' y1='{cy}' x2='{rx}' y2='{cy}' stroke='{AQUA}' stroke-width='4'/>")
    else:
        g.append(f"<line x1='{lx}' y1='{cy}' x2='{lx+34}' y2='{cy}' stroke='{AQUA}' stroke-width='4' stroke-dasharray='5 5'/>")
        g.append(f"<line x1='{rx-34}' y1='{cy}' x2='{rx}' y2='{cy}' stroke='{AQUA}' stroke-width='4' stroke-dasharray='5 5'/>")
    for cx in (lx, rx):
        g.append(f"<circle cx='{cx}' cy='{cy}' r='42' fill='{AQUA_SOFT}' stroke='{AQUA}' stroke-width='3.5'/>")
        g.append(face(cx, cy, 0.72, mood))
    return "\n".join(g) + extra

panels = [
    ("① 건조 · 연결", mini_pair(0, "happy", "solid", curl(160, 96, 0.9, P)), "수소결합이 손을 잡고 있다"),
    ("② 젖음 · 손 놓음", mini_pair(26, "shock", "dash",
        droplet(160, 70, 1.2) + droplet(90, 108, 0.9) + droplet(232, 104, 0.9) + curl(160, 96, 0.9, MUTED, droop=True)),
     "물이 닿자 결합이 풀린다"),
    ("③ 건조 · 재연결", mini_pair(0, "happy", "solid",
        curl(160, 96, 0.9, P) + f"<path d='M 250 60 q 16 8 0 16 m 16 -22 q 16 8 0 16' stroke='{MUTED}' stroke-width='3' fill='none' stroke-linecap='round'/>"),
     "마르면서 새 위치에서 다시 잡는다"),
]
o = [svg_open(1080, 720)]
o.append(tx(540, 76, "수소결합 : 물에 놓고, 마르면 다시 잡는다", 42, INK, 700))
for i, (head, body, cap) in enumerate(panels):
    x = 40 + i * 340
    o.append(f"<g transform='translate({x},130)'>")
    o.append(f"<rect x='0' y='0' width='320' height='440' rx='18' fill='{PAPER_ALT}' stroke='{LINE}' stroke-width='2'/>")
    o.append(tx(160, 52, head, 26, ROSE_DEEP, 700))
    o.append(f"<g transform='translate(0,80)'>{body}</g>")
    o.append(tx(160, 402, cap, 21, MUTED))
    o.append("</g>")
o.append(tx(540, 640, "습기 = 손 놓음 → 컬 풀림 ｜ 드라이 = 다시 잡음", 26, INK, 700))
o.append(tx(540, 684, "열로 만든 스타일이 비 오는 날 무너지는 이유", 22, MUTED))
write("illust-02-hydrogen-water-ko.svg", "\n".join(o))

# ── ③ 펌 3단계 ──────────────────────────────────────────────────────────
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
    g.append(sq(lx, ly, 0.72) + tx(lx, ly - 14, "S", 22, PAPER, 700))
    g.append(sq(rx, ry, 0.72) + tx(rx, ry - 14, "S", 22, PAPER, 700))
    return "\n".join(g)

steps = [
    ("STEP 1", "1제 (환원제)", "이황화결합을 끊는다", ss_pair(0, cut=True) +
     f"<rect x='236' y='210' width='40' height='58' rx='10' fill='{PAPER_ALT}' stroke='{P}' stroke-width='3'/>"
     f"<rect x='246' y='192' width='20' height='20' rx='4' fill='{P}'/>" + tx(256, 296, "1제", 19, ROSE_DEEP, 700)),
    ("STEP 2", "로드로 모양 잡기", "짝의 위치를 바꾼다", ss_pair(54, cut=True) +
     f"<circle cx='160' cy='250' r='34' fill='none' stroke='{INK}' stroke-width='5'/>"
     f"<path d='M 126 250 a 34 34 0 0 1 68 0' stroke='{P}' stroke-width='5' fill='none'/>"),
    ("STEP 3", "2제 (산화제)", "새 위치에서 다시 잇는다", ss_pair(54, cut=False) +
     f"<rect x='238' y='224' width='36' height='30' rx='6' fill='{P}'/>"
     f"<path d='M 246 224 v-8 a 10 10 0 0 1 20 0 v8' stroke='{P}' stroke-width='5' fill='none'/>"),
]
o = [svg_open(1080, 720)]
o.append(tx(540, 76, "펌 3단계 : 이황화결합을 풀고 다시 잇는다", 42, INK, 700))
for i, (step, t1, t2, body) in enumerate(steps):
    x = 30 + i * 350
    o.append(f"<g transform='translate({x},120)'>")
    o.append(f"<rect x='0' y='0' width='320' height='440' rx='18' fill='{PAPER}' stroke='{LINE}' stroke-width='3'/>")
    o.append(f"<rect x='96' y='-20' width='128' height='44' rx='22' fill='{P}'/>")
    o.append(tx(160, 10, step, 24, PAPER, 700))
    o.append(tx(160, 66, t1, 28, INK, 700))
    o.append(tx(160, 100, t2, 23, MUTED))
    o.append(f"<g transform='translate(0,20)'>{body}</g>")
    o.append("</g>")
    if i < 2:
        ax = x + 330
        o.append(f"<path d='M {ax} 340 h 22 m -8 -10 l 10 10 l -10 10' stroke='{ROSE_DEEP}' stroke-width='5' fill='none' stroke-linecap='round' stroke-linejoin='round'/>")
o.append(tx(540, 640, "끊고 → 옮기고 → 잇는다 = 컬이 고정된다", 26, INK, 700))
o.append(tx(540, 684, "순서가 어긋나면 컬은 안 나오고 손상만 남는다", 22, MUTED))
write("illust-03-perm-3steps-ko.svg", "\n".join(o))
