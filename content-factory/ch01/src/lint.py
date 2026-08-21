#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""번체 발행판 간체·용어 lint. 사용: python3 lint.py <chapterDir>
본문 + 비주얼 라벨(strings.py) 전부를 대상으로 한다."""
import os, sys
from opencc import OpenCC

# OpenCC s2t 단일자 변환의 오탐 — 대만에서 정상 통용되는 표기
ALLOW = {
    "台": "台灣·台北은 대만 현지 통용 표기 (정식 臺의 이체자)",
    "吃": "吃는 대만 표준 용법, 喫는 고어",
    "胜": "胜肽(peptide)는 대만 정식 학술 용어",
}
# 대륙식 표기·간체 어휘 (있으면 즉시 실패)
BANNED = ["毛鳞片", "皮质层", "髓质层", "角质层", "头发", "烫发", "染发", "漂发",
          "护发", "发型", "氢键", "盐键", "二硫键", "肽键", "卷发", "洗发"]

def collect(chapter_dir):
    texts = []
    zh_md = os.path.join(chapter_dir, "zh")
    for f in os.listdir(zh_md):
        if f.endswith(".md"):
            texts.append(open(os.path.join(zh_md, f)).read())
    sys.path.insert(0, os.path.join(chapter_dir, "src"))
    from strings import S
    def walk(v):
        if isinstance(v, str): texts.append(v)
        elif isinstance(v, (list, tuple)):
            for x in v: walk(x)
    walk(S["zh"])
    return " ".join(texts)

def main(chapter_dir):
    s2t = OpenCC("s2t")
    joined = collect(chapter_dir)
    hanzi = {c for c in joined if "一" <= c <= "鿿"}
    flagged = sorted(c for c in hanzi if s2t.convert(c) != c)
    real = [c for c in flagged if c not in ALLOW]
    allowed = [c for c in flagged if c in ALLOW]
    print(f"한자 종수 {len(hanzi)}")
    print("간체:", real if real else "PASS (0)")
    if allowed:
        print("허용 이체자:", ", ".join(f"{c}({ALLOW[c]})" for c in allowed))
    hits = [b for b in BANNED if b in joined]
    print("대륙식 표기:", hits if hits else "PASS (0)")
    return 1 if (real or hits) else 0

if __name__ == "__main__":
    sys.exit(main(os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")))
