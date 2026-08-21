#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""챕터 #1 루프 애니·카드 HTML 생성 (언어별). 사용: python3 gen_html.py ko|zh
루프 규격: 4.8초 / 30fps / 1080×1350 / 하드컷 없음 / ease-in-out / 캡션 페이드 0.3초."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from strings import S, FONT

LANG = sys.argv[1] if len(sys.argv) > 1 else "ko"
T, F = S[LANG], FONT[LANG]
CH01 = os.path.dirname(HERE)
BUILD = os.path.join(HERE, "build")
os.makedirs(BUILD, exist_ok=True)
ST = json.load(open(os.path.join(CH01, "..", "visual", "style.json")))
C = {k: v["hex"] for k, v in ST["palette"].items()}
D = ST["derived_tints"]
VARS = (f"--p:{C['primary']};--ink:{C['ink']};--paper:{C['paper']};--aqua:{C['aqua']};"
        f"--rose-deep:{D['primary_deep']};--rose-soft:{D['primary_soft']};--muted:{D['ink_muted']};"
        f"--line:{D['line_soft']};--alt:{D['paper_alt']};--aqua-soft:{D['aqua_soft']};")

def w(name, s):
    open(os.path.join(BUILD, name), "w").write(s)
    print("wrote build/" + name)

BASE = f"""  :root{{{VARS}}}
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{width:1080px;height:1350px;background:var(--paper);color:var(--ink);
       font-family:{F};overflow:hidden}}"""

# ── 루프: 알칼리에 비늘이 열리고 약제가 들어간 뒤, 산성에 다시 닫힌다 ──────
loop = f"""<!doctype html>
<meta charset="utf-8">
<style>
{BASE}
  body{{display:flex;flex-direction:column;align-items:center;padding:76px 60px 70px}}
  .chip{{border:3px solid var(--p);color:var(--p);border-radius:999px;padding:10px 30px;
        font-size:26px;font-weight:700}}
  h1{{font-size:54px;font-weight:900;margin-top:30px;letter-spacing:-1px}}
  .scene{{flex:1;display:flex;align-items:center}}
  #stage{{overflow:hidden}}
  .caps{{position:relative;height:116px;width:100%}}
  .cap{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
       font-size:46px;font-weight:800;opacity:0;letter-spacing:-1px}}
  .cap b{{color:var(--p);margin:0 4px}}
  .cap .aq{{color:var(--aqua);margin:0 4px}}
</style>
<body>
  <div class="chip">{T['lo_chip']}</div>
  <h1>{T['lo_title']}</h1>
  <div class="scene">
    <svg id="stage" viewBox="0 40 960 502" width="960">
      <rect x="60" y="300" width="840" height="210" rx="18" fill="{D['paper_alt']}" stroke="{D['line_soft']}" stroke-width="3"/>
      <rect x="96" y="378" width="768" height="54" rx="27" fill="{C['paper']}" stroke="{D['ink_muted']}" stroke-width="3" stroke-dasharray="11 9"/>
      <g id="agents"></g>
      <g id="scales"></g>
      <g id="ph"></g>
    </svg>
  </div>
  <div class="caps">
    <div class="cap" id="cap1"><span>{T['lo_cap1'][0]}</span><b>{T['lo_cap1'][1]}</b></div>
    <div class="cap" id="cap2"><span>{T['lo_cap2'][0]}</span><span class="aq">{T['lo_cap2'][1]}</span></div>
  </div>
<script>
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const DUR = 4.8, FADE = 0.3;
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const ease = x => {{ x = clamp(x,0,1); return x*x*(3-2*x); }};      // ease-in-out
const seg = (t,a,b) => ease((t-a)/(b-a));

const N = 9, X0 = 84, SW = 84, SY = 300;
const scaleEls = [], agentEls = [];
for (let i=0;i<N;i++){{
  const p = document.createElementNS(NS,'path');
  p.setAttribute('fill','{C['paper']}'); p.setAttribute('stroke','{C['primary']}');
  p.setAttribute('stroke-width','5'); p.setAttribute('stroke-linejoin','round');
  $('scales').appendChild(p); scaleEls.push(p);
}}
for (let i=0;i<3;i++){{
  const g = document.createElementNS(NS,'g');
  g.innerHTML = `<circle r="15" fill="{C['primary']}"/>`;
  $('agents').appendChild(g); agentEls.push(g);
}}
// pH 방울: 0=알칼리(로즈), 1=산성(아쿠아)
const drops = [{{c:'{C['primary']}'}}, {{c:'{C['aqua']}'}}].map(o => {{
  const g = document.createElementNS(NS,'g');
  g.innerHTML = `<path d="M 0 -30 C 22 0 20 17 0 25 C -20 17 -22 0 0 -30 Z" fill="${{o.c}}"/>`;
  $('ph').appendChild(g); return g;
}});

function setT(t){{
  t = ((t % DUR) + DUR) % DUR;
  // k: 0=닫힘, 1=열림. 알칼리 착수(1.4)에 열리고, 산성 착수(3.4)에 닫힌다
  const k = seg(t,1.4,2.3) * (1 - seg(t,3.4,4.3));
  for (let i=0;i<N;i++){{
    const x = X0 + i*SW, lift = 17*k;
    scaleEls[i].setAttribute('d',
      `M ${{x}} ${{SY}} L ${{x+SW*1.22}} ${{SY-lift}} L ${{x+SW*1.22}} ${{SY-lift-27}} L ${{x}} ${{SY-27}} Z`);
  }}
  // 약제 입자: 비늘이 열린 뒤 위에서 내려와 안으로 들어가고, 닫히면 갇힌 채 남는다
  const enter = seg(t,1.5,2.4), leave = seg(t,4.4,4.8);
  agentEls.forEach((g,i) => {{
    g.style.opacity = clamp(enter - leave, 0, 1);
    g.setAttribute('transform', `translate(${{250+i*230}},${{(196 + 154*ease(enter)).toFixed(1)}})`);
  }});
  // 알칼리 방울 0.55→1.4 낙하, 산성 방울 2.55→3.4 낙하
  [[0,0.55],[1,2.55]].forEach(([i,t0]) => {{
    const u = (t-t0)/0.85;
    if (u>0 && u<=1){{
      const y = 20 + 264*(u*u*0.72 + u*0.28);
      drops[i].setAttribute('transform', `translate(480,${{y.toFixed(1)}}) scale(1.5)`);
      drops[i].style.opacity = u<0.92 ? 1 : (1-u)/0.08;
    }} else drops[i].style.opacity = 0;
  }});
  // 캡션: 0.3초 페이드, t=4.8에서 t=0 상태와 일치
  $('cap1').style.opacity = clamp(seg(t,1.1,1.1+FADE) - seg(t,3.1,3.1+FADE), 0, 1);
  $('cap2').style.opacity = clamp(seg(t,3.1,3.1+FADE) - seg(t,4.5,4.5+FADE), 0, 1);
}}
window.setT = setT; setT(0);
</script>
</body>
"""
w(f"loop-{LANG}.html", loop)

# ── 카드 ①: 개념 ────────────────────────────────────────────────────────
card1 = f"""<!doctype html>
<meta charset="utf-8">
<style>
{BASE}
  body{{display:flex;flex-direction:column;padding:72px 80px 56px}}
  .chip{{align-self:flex-start;border:3px solid var(--p);color:var(--p);border-radius:999px;
        padding:10px 28px;font-size:26px;font-weight:700}}
  h1{{font-size:76px;line-height:1.26;font-weight:900;margin-top:40px;letter-spacing:-2px}}
  h1 em{{font-style:normal;color:var(--p)}}
  .scene{{flex:1;display:flex;align-items:center;justify-content:center}}
  .answer{{background:var(--alt);border-left:10px solid var(--aqua);border-radius:14px;
          padding:32px 36px;font-size:31px;line-height:1.55;font-weight:500}}
  .answer b{{color:var(--rose-deep)}}
  .foot{{margin-top:34px;display:flex;justify-content:space-between;align-items:center;
        color:var(--muted);font-size:23px}}
  .foot .tag{{color:var(--p);font-weight:700}}
</style>
<body>
  <div class="chip">{T['c1_chip']}</div>
  <h1>{T['c1_head'][0]}<br><em>{T['c1_head'][1]}</em></h1>
  <div class="scene">
    <svg viewBox="0 0 560 300" width="760">
      <rect x="30" y="70" width="500" height="170" rx="22" fill="{D['primary_soft']}"/>
      <rect x="30" y="104" width="500" height="102" fill="{D['paper_alt']}"/>
      <rect x="46" y="131" width="468" height="48" rx="24" fill="{C['paper']}" stroke="{D['ink_muted']}" stroke-width="3" stroke-dasharray="11 9"/>
      <g fill="none" stroke="{C['primary']}" stroke-width="3.2" stroke-linejoin="round">
        <path d="M 44 104 L 100 96 L 100 74 L 44 82 Z" fill="{C['paper']}"/>
        <path d="M 100 104 L 156 96 L 156 74 L 100 82 Z" fill="{C['paper']}"/>
        <path d="M 156 104 L 212 96 L 212 74 L 156 82 Z" fill="{C['paper']}"/>
        <path d="M 212 104 L 268 96 L 268 74 L 212 82 Z" fill="{C['paper']}"/>
      </g>
      <g fill="{C['primary']}" opacity=".55">
        <circle cx="150" cy="128" r="9"/><circle cx="290" cy="196" r="9"/>
        <circle cx="380" cy="124" r="9"/><circle cx="450" cy="192" r="9"/>
      </g>
      <circle cx="300" cy="40" r="15" fill="{C['primary']}"/>
      <path d="M 300 60 v 34 m -8 -10 l 8 10 l 8 -10" stroke="{C['primary']}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div class="answer"><b>{T['c1_ans_b']}</b>{T['c1_ans']}</div>
  <div class="foot"><span>{T['c1_foot']}</span><span class="tag">{T['c1_tag']}</span></div>
</body>
"""
w(f"card-01-concept-{LANG}.html", card1)

# ── 카드 ②: 퀴즈 템플릿 ─────────────────────────────────────────────────
opts = "".join(f'<div class="opt"><span class="n">{i+1}</span><span class="t">{o}</span></div>'
               for i, o in enumerate(T["c2_opts"]))
card2 = f"""<!doctype html>
<meta charset="utf-8">
<style>
{BASE}
  body{{display:flex;flex-direction:column;padding:72px 80px 56px}}
  .top{{display:flex;justify-content:space-between;align-items:center}}
  .chip{{background:var(--p);color:var(--paper);border-radius:999px;padding:12px 30px;
        font-size:26px;font-weight:700}}
  .qno{{color:var(--muted);font-size:23px;font-weight:500}}
  .qbox{{margin-top:52px;background:#fff;border:3px solid var(--line);border-radius:20px;
        padding:44px 46px;min-height:300px}}
  .qbox .label{{color:var(--p);font-weight:900;font-size:29px;margin-bottom:20px}}
  .qbox .q{{font-size:38px;line-height:1.55;font-weight:500;color:var(--muted)}}
  .opts{{margin-top:44px;display:flex;flex-direction:column;gap:24px;flex:1}}
  .opt{{display:flex;align-items:center;gap:26px;background:var(--alt);border-radius:16px;padding:26px 32px}}
  .opt .n{{flex:none;width:58px;height:58px;border-radius:50%;border:4px solid var(--p);color:var(--p);
          display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900}}
  .opt .t{{font-size:31px;color:var(--muted);font-weight:500}}
  .foot{{margin-top:40px;display:flex;justify-content:space-between;align-items:center;
        font-size:23px;color:var(--muted)}}
  .foot b{{color:var(--rose-deep)}}
</style>
<body>
  <div class="top"><div class="chip">{T['c2_chip']}</div><div class="qno">{T['c2_qno']}</div></div>
  <div class="qbox"><div class="label">{T['c2_label']}</div><div class="q">{T['c2_q']}</div></div>
  <div class="opts">{opts}</div>
  <div class="foot"><span><b>{T['c2_foot_b']}</b>{T['c2_foot']}</span><span>{T['c2_tag']}</span></div>
</body>
"""
w(f"card-02-quiz-{LANG}.html", card2)
