# -*- coding: utf-8 -*-
"""제1편 ko 풀버전 생성기 — 문항 원문은 JSON 에서만 인용한다(재타이핑 금지).

해설 원고는 같은 폴더의 commentary.py 에 있고, 이 스크립트는 그 원고에
JSON 원문을 끼워 넣기만 한다. 사람이 문항을 다시 치는 경로가 없어야
「원문과 다른 문항」이 구조적으로 불가능하다.

    ~/.venvs/beautyjob-exam/bin/python content-factory/scripts/build_tangfa01.py
    (리포 루트에서 실행)
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commentary import GROUPS, C
from glossary import OPTION_KO, FINAL

BANK = json.load(open("content-factory/sources/05_067003A13.json", encoding="utf-8"))
Q = {q["qid"]: q for s in BANK["sections"] for q in s["questions"]}
M = BANK["meta"]
MK = "①②③④"

SOURCE = ("題目來源：勞動部勞動力發展署技能檢定中心 測試參考資料（06700 女子美髮 丙級，"
          f"版次{M['version']}，最新版依官網公告為準）。解析內容為本站原創。")

qids = [q for _, _, _, lst in GROUPS for q in lst]
assert len(qids) == len(set(qids)) == 30, len(qids)
assert set(qids) == set(C), set(qids) ^ set(C)

out = []
out.append(f"""---
title: 미용 丙級 학과 해설｜燙髮篇 제1편：연화·試捲·중간 헹굼 (30문항)
slug: tangfa-01
level: 學科解析
series: 美髮丙級學科解析
keywords:
  - 대만 미용사 丙級
  - 燙髮 기출
  - 試捲
  - 연화
  - 중간 헹굼
description: 燙髮 97題 중 시술 진행 축에 놓인 30題. 원문·직역·보기 병기·해설.
author: 20年資歷韓國髮型設計師 Jacob
sources:
  - sources/05_067003A13.json
exam_bank: {M['bank_code']} / {M['version']}
---

# 미용 丙級 학과 해설｜燙髮篇 제1편：연화·試捲·중간 헹굼

> 作者：20年資歷韓國髮型設計師 Jacob

## 이 편을 읽는 법

**문항은 번체 원문 그대로 두고, 그 아래 한국어 직역과 보기 병기를 붙였습니다.** 시험지에
나오는 글자를 눈에 익히는 게 먼저라 원문은 손대지 않습니다. 해설은 전부 한국어입니다.

번체 용어는 본문·보기·해설 어디서든 **「번체(한국어)」** 로 병기합니다. 다만
**한국 현장에 대응 용어가 없는 시험 분류어는 한국어 이름을 만들지 않고 뜻만 풀어 씁니다.**
없는 말을 지어내면 그 편에서만 통하는 유령 용어가 생깁니다.
뜻은 잡혔지만 한국 현장 표준명이 아직인 것은 **[최종확인]** 으로 남겨 두었습니다.

燙髮(펌) 단원(工作項目 07)은 총 97문항입니다. 이 편이 다루는 30문항은 전부
**「약을 올리고 → 상태를 보고 → 멈추고 → 고정한다」** 라는 한 줄의 시술 진행 축에 놓여 있습니다.
와인딩·분구 기술, 모질 진단, 펌 후 관리는 다음 편들로 나눕니다.

문항 순서는 題庫(문제은행) 번호순이 아니라 **시술 순서**로 재배열했습니다. 번호순으로 읽으면
같은 이야기가 흩어져 보이는데, 순서대로 놓으면 서른 문항이 한 편의 시술 기록처럼 이어집니다.

| 묶음 | 다루는 것 | 문항수 |
|---|---|---|""")

for code, title, _, lst in GROUPS:
    out.append(f"| {code} | {title} | {len(lst)} |")
out.append(f"| **합계** | | **{len(qids)}** |\n")

for code, title, lead, lst in GROUPS:
    out.append(f"\n## {code}. {title}\n")
    out.append(lead + "\n")
    for qid in lst:
        q = Q[qid]
        lit, expl, vs, slug = C[qid]
        out.append(f"### {qid}\n")
        stem = q["stem"].strip()
        opts = "　".join(f"{MK[i]}{o}" for i, o in enumerate(q["options"]))
        tail = q.get("tail") or ""
        line = f"> {stem}　{opts}" if stem else f"> {opts}"
        if tail:
            line += f"　{tail.strip()}"
        out.append(line + "\n")
        out.append(f"**직역** — {lit}\n")
        ko = OPTION_KO.get(qid)
        if ko:
            assert len(ko) == len(q["options"]), qid
            pairs = "　".join(f"{MK[i]}{o}({ko[i]})" for i, o in enumerate(q["options"]))
            out.append(f"**보기** — {pairs}\n")
        out.append(f"**정답 {MK[q['answer']-1]}**\n")
        out.append(expl + "\n")
        if vs:
            out.append(f"> **시험 답 vs 현장** — {vs}\n")
        if slug:
            out.append(f"→ 관련 이론: [/articles/{slug}](/articles/{slug})\n")

out.append(f"""
## 이 30문항을 세 문장으로

1. **還原劑(환원제)는 자르기 전에 부풀린다.** 부푼 만큼 들어가고, 지나치게 부풀면 닫히지 않는다.
2. **멈출 때는 시계가 아니라 試捲(테스트컬)이 정한다.** 표면은 이미 말린 것처럼 보인다.
3. **第一劑(1제)와 第二劑(2제) 사이에는 이름이 붙은 공정이 하나 있다.** 中間沖水(중간 헹굼)를 건너뛰면 두 약이 서로를 상쇄한다.

## 다음 편 예고

燙髮(펌) 나머지 67문항은 세 편으로 나눕니다 — **捲法(와인딩)·分區(구역 나누기)·底盤(베이스)**, **모질 진단과 흡수성**,
**펌 후 관리와 병행 시술**. 이 편에서 「진단은 첫 단계」라고만 하고 넘어간 부분이
두 번째 편의 본론입니다.

---

{SOURCE}
""")

md = "\n".join(out)
open("content-factory/drafts/exam-ko/tangfa-01.md", "w", encoding="utf-8").write(md)
print(f"작성: content-factory/drafts/exam-ko/tangfa-01.md ({len(md):,}자)")
print(f"문항 {len(qids)}건 / 시험vs현장 {sum(1 for v in C.values() if v[2])}건 / 슬러그 참조 {sum(1 for v in C.values() if v[3])}건")
