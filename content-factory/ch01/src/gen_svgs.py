#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""챕터 #1 일러스트 3컷 — 언어별 생성. 사용: python3 gen_svgs.py ko|zh
지오메트리는 두 언어가 공유하고, 라벨만 strings.py에서 갈아 끼운다. 크레딧 0."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from strings import S, FONT

LANG = sys.argv[1] if len(sys.argv) > 1 else "ko"
T, F = S[LANG], FONT[LANG]
CH01 = os.path.dirname(HERE)
OUT = os.path.join(CH01, LANG)
STYLE = json.load(open(os.path.join(CH01, "..", "visual", "style.json")))
PAL = {k: v["hex"] for k, v in STYLE["palette"].items()}
D = STYLE["derived_tints"]
P, INK, PAPER, AQUA = PAL["primary"], PAL["ink"], PAL["paper"], PAL["aqua"]
ROSE_SOFT, ROSE_DEEP = D["primary_soft"], D["primary_deep"]
MUTED, LINE, PAPER_ALT, AQUA_SOFT = D["ink_muted"], D["line_soft"], D["paper_alt"], D["aqua_soft"]

def tx(x, y, s, size=24, fill=INK, weight=500, anchor="middle"):
    return (f"<text x='{x}' y='{y}' font-family={F!r} font-size='{size}' font-weight='{weight}' "
            f"fill='{fill}' text-anchor='{anchor}'>{s}</text>")

def svg(w, h, bg=PAPER):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' "
            f"width='{w}' height='{h}'>\n<rect width='{w}' height='{h}' fill='{bg}'/>")

def write(name, body):
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, name), "w").write(body + "\n</svg>")
    print("wrote", LANG + "/" + name)

def scales(x0, x1, y, lift=0.0, color=P, n=None, w=46):
    """겹쳐 누운 큐티클 비늘. lift=0 닫힘, 1 최대 개방."""
    n = n or int((x1 - x0) // w)
    out = []
    for i in range(n):
        x = x0 + i * w
        a = 9 * lift                      # 들리는 각도(픽셀)
        out.append(f"<path d='M {x} {y} L {x+w*1.24} {y-a} L {x+w*1.24} {y-a-15} L {x} {y-15} Z' "
                   f"fill='{PAPER}' stroke='{color}' stroke-width='3.2' stroke-linejoin='round'/>")
    return "".join(out)

# ── ① 3층 단면도 ────────────────────────────────────────────────────────
o = [svg(1080, 720)]
o.append(tx(540, 74, T["i1_title"], 42, INK, 700))
SX, SW = 66, 566                                    # 모발 단면 위치·폭
TOP, BOT = 168, 596
o.append(f"<rect x='{SX}' y='{TOP}' width='{SW}' height='{BOT-TOP}' rx='26' fill='{ROSE_SOFT}'/>")
o.append(f"<rect x='{SX}' y='{TOP+56}' width='{SW}' height='{BOT-TOP-112}' fill='{PAPER_ALT}'/>")
o.append(f"<rect x='{SX}' y='{TOP+56}' width='{SW}' height='{BOT-TOP-112}' fill='none' stroke='{LINE}' stroke-width='2'/>")
for i in range(7):                                  # 케라틴 섬유 다발
    y = TOP + 92 + i * 34
    o.append(f"<line x1='{SX+18}' y1='{y}' x2='{SX+SW-18}' y2='{y}' stroke='{ROSE_SOFT}' stroke-width='7' stroke-linecap='round'/>")
for i, (cx, cy) in enumerate([(180,262),(300,300),(430,258),(540,312),(250,470),(400,486),(560,452),(620,300)]):
    o.append(f"<circle cx='{cx}' cy='{cy}' r='9' fill='{P}' opacity='.55'/>")   # 멜라닌
MY = (TOP + BOT) / 2
o.append(f"<rect x='{SX+16}' y='{MY-24}' width='{SW-32}' height='48' rx='24' fill='{PAPER}' stroke='{MUTED}' stroke-width='3' stroke-dasharray='11 9'/>")
o.append(scales(SX + 8, SX + SW - 8, TOP + 56, 0.0))          # 위쪽 비늘
o.append(f"<g transform='translate(0,{TOP+BOT}) scale(1,-1)'>{scales(SX+8, SX+SW-8, TOP+56, 0.0)}</g>")
o.append(tx(SX + SW / 2, TOP - 26, T["i1_out"] + " ↑", 22, MUTED, 700))
o.append(tx(SX + SW / 2, BOT + 40, "↓ " + T["i1_in"], 22, MUTED, 700))
LY = [TOP + 30, TOP + 150, MY]                                 # 라벨 연결 지점
LX = SX + SW + 78                                   # 라벨 블록 왼쪽 기준
for i, (name, sub, pct, role) in enumerate(T["i1_layers"]):
    y = 190 + i * 156
    o.append(f"<path d='M {SX+SW+8} {LY[i]} H {SX+SW+40} V {y-6} H {LX-8}' fill='none' stroke='{MUTED}' stroke-width='2.5'/>")
    o.append(f"<circle cx='{SX+SW+8}' cy='{LY[i]}' r='6' fill='{MUTED}'/>")
    o.append(tx(LX, y, name, 31, INK, 700, "start"))
    o.append(tx(LX, y + 30, sub, 20, MUTED, 500, "start"))
    o.append(f"<rect x='{LX}' y='{y+46}' width='122' height='34' rx='17' fill='{P if i==1 else ROSE_SOFT}'/>")
    o.append(tx(LX + 61, y + 70, pct, 20, PAPER if i == 1 else ROSE_DEEP, 700))
    o.append(tx(LX, y + 108, role, 20, MUTED, 500, "start"))
o.append(f"<line x1='60' y1='648' x2='1020' y2='648' stroke='{LINE}' stroke-width='2'/>")
o.append(tx(540, 690, T["i1_foot"], 24, ROSE_DEEP, 700))
write("illust-01-layers.svg", "\n".join(o))

# ── ② 큐티클 개폐 ───────────────────────────────────────────────────────
o = [svg(1080, 720)]
o.append(tx(540, 74, T["i2_title"], 40, INK, 700))
LIFT = [0.0, 1.0, 0.0]
CHIPC = [(AQUA_SOFT, AQUA), (ROSE_SOFT, P), (AQUA_SOFT, AQUA)]
for i, (head, chip, cap) in enumerate(T["i2_panels"]):
    x = 40 + i * 340
    o.append(f"<g transform='translate({x},124)'>")
    o.append(f"<rect x='0' y='0' width='320' height='452' rx='18' fill='{PAPER_ALT}' stroke='{LINE}' stroke-width='2'/>")
    o.append(tx(160, 50, head, 27, ROSE_DEEP, 700))
    bg, bd = CHIPC[i]
    o.append(f"<rect x='36' y='68' width='248' height='38' rx='19' fill='{bg}' stroke='{bd}' stroke-width='2.5'/>")
    o.append(tx(160, 94, chip, 19, INK, 600))
    o.append(f"<rect x='24' y='196' width='272' height='96' fill='{PAPER_ALT}'/>")
    o.append(f"<rect x='24' y='234' width='272' height='58' rx='10' fill='{PAPER}' stroke='{LINE}' stroke-width='2'/>")
    o.append(scales(28, 292, 234, LIFT[i], w=52))
    if i == 1:                                             # 약제 입자가 들어간다
        for dx, dy in ((78, 168), (150, 152), (222, 170)):
            o.append(f"<circle cx='{dx}' cy='{dy}' r='11' fill='{P}'/>")
            o.append(f"<path d='M {dx} {dy+16} v 30 m -7 -9 l 7 9 l 7 -9' stroke='{P}' stroke-width='3.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/>")
    o.append(tx(160, 380, cap, 21, MUTED))
    o.append("</g>")
o.append(tx(540, 646, T["i2_foot"], 28, INK, 700))
o.append(tx(540, 688, T["i2_sub"], 22, MUTED))
write("illust-02-cuticle-ph.svg", "\n".join(o))

# ── ③ 시술 깊이 ────────────────────────────────────────────────────────
o = [svg(1080, 720)]
o.append(tx(540, 70, T["i3_title"], 40, INK, 700))
BX, BW = 336, 640                                   # 막대 시작 x, 전체 폭
ZONE = [BW * 0.22, BW * 0.52, BW * 1.0]             # 표면 / 큐티클 / 코르텍스 경계
for i, z in enumerate(T["i3_zones"]):
    left = BX if i == 0 else BX + ZONE[i - 1]
    right = BX + ZONE[i]
    o.append(f"<rect x='{left}' y='108' width='{right-left}' height='34' fill='{PAPER_ALT if i%2==0 else PAPER}'/>")
    o.append(tx((left + right) / 2, 132, z, 20, MUTED, 700))
    if i:
        o.append(f"<line x1='{left}' y1='108' x2='{left}' y2='612' stroke='{LINE}' stroke-width='2' stroke-dasharray='6 7'/>")
for i, (name, depth) in enumerate(T["i3_rows"]):
    y = 168 + i * 62
    deep = depth >= 3
    o.append(tx(BX - 24, y + 28, name, 23, INK if deep else MUTED, 700 if deep else 500, "end"))
    w = ZONE[min(depth, 2)]
    if depth == 2:      # 코르텍스까지 닿지만 화학 변화는 없음 → 테두리만
        o.append(f"<rect x='{BX}' y='{y+8}' width='{w}' height='40' rx='20' fill='{PAPER}' stroke='{P}' stroke-width='3.5'/>")
    else:
        fill = {0: AQUA, 1: ROSE_SOFT, 3: P, 4: ROSE_DEEP}[depth]
        o.append(f"<rect x='{BX}' y='{y+8}' width='{w}' height='40' rx='20' fill='{fill}'/>")
    if depth == 4:                                  # 탈색은 큐티클까지 함께 손상
        o.append(f"<rect x='{BX}' y='{y+8}' width='{ZONE[1]}' height='40' rx='20' fill='{P}' opacity='.45'/>")
        o.append(tx(BX + w - 16, y + 35, "!", 24, PAPER, 900, "end"))
LG = T["i3_legend"]                                  # 채움 vs 테두리 범례
o.append(f"<rect x='{BX}' y='620' width='30' height='20' rx='10' fill='{P}'/>")
o.append(tx(BX + 40, 636, LG[0], 19, MUTED, 500, "start"))
o.append(f"<rect x='{BX+250}' y='620' width='30' height='20' rx='10' fill='{PAPER}' stroke='{P}' stroke-width='3'/>")
o.append(tx(BX + 290, 636, LG[1], 19, MUTED, 500, "start"))
o.append(f"<line x1='60' y1='664' x2='1020' y2='664' stroke='{LINE}' stroke-width='2'/>")
o.append(tx(540, 700, T["i3_foot"], 21, ROSE_DEEP, 700))
write("illust-03-depth.svg", "\n".join(o))
