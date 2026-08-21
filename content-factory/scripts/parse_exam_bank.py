#!/usr/bin/env python3
"""
題庫 PDF → 구조화 JSON 파서 (라인 B 데이터층)

대상: content-factory/sources/05_067003A13.pdf
      技術士技能檢定 女子美髮 丙級 學科測試參考資料 (06700 / V114112113)
산출: content-factory/sources/05_067003A13.json

版次가 갱신되면 새 PDF 로 교체하고 이 스크립트를 그대로 재실행한다.
확정치(EXPECTED)는 版次마다 달라지므로 실패하면 게이트가 먼저 잡는다.

환경:
    python3 -m venv ~/.venvs/beautyjob-exam
    ~/.venvs/beautyjob-exam/bin/pip install pdfplumber
    ~/.venvs/beautyjob-exam/bin/python content-factory/scripts/parse_exam_bank.py

핵심 처리
  · y_tolerance=9 로 추출한다. 아래첨자(size 6.96)가 본문(size 12.0)과 같은 줄로
    합쳐져 H2O2 / HO4 / CO2 가 자동으로 재결합된다. 기본값(3)이면 `2 2` 가 다음 줄로
    떨어져 나간다. 이 한 줄이 지시서 c항(첨자 분리)의 해법이다.
  · 줄바꿈 재조립은 "다음 줄 첫 글자" 로 판정한다. CJK 로 시작하면 단어 중간에서
    끊긴 것이므로 공백 없이, 마커(①②③④)나 영숫자로 시작하면 공백이 있던 자리이므로
    공백을 넣어 잇는다.
  · 문항 경계는 라인 필터가 아니라 `^숫자. (정답)` 앵커로 잡는다. 표지·푸터·워터마크
    파편은 앵커 밖으로 밀려나므로 자연히 배제된다.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "content-factory/sources/05_067003A13.pdf"
OUT = ROOT / "content-factory/sources/05_067003A13.json"

META = {
    "bank_code": "067003A13",
    "version": "V114112113",
    "announced": "2025-11-21",
    "effective_from": "2026-01-01",
    "job_code": "06700",
    "occupation": "女子美髮",
    "grade": "丙級",
    "total": 608,
}

# 지시서 확정치 — G1 이 이것과 대조한다.
EXPECTED = [
    ("01", "人體生理", 69), ("02", "頭髮生理", 89), ("03", "美髮器材", 50),
    ("04", "頭髮洗護", 88), ("05", "識圖", 10), ("06", "剪髮", 73),
    ("07", "燙髮", 97), ("08", "染髮", 80), ("09", "整髮", 52),
]

# G4 스팟체크
SPOT = {
    "01-009": {"answer": 4},
    "02-077": {"answer": 2},
    "05-010": {"answer": 4},
    "07-097": {"answer": 1},
    "09-052": {"answer": 3},
    "08-037": {"options": ["H2O2", "HO4", "H2O", "CO2"]},
}

MARKERS = "①②③④"
SECTION_RE = re.compile(r"^06700\s+女子美髮\s+丙級\s+工作項目\s+(\d{2})：(\S+)\s*$")
FOOTER_RE = re.compile(r"^Page\s+\d+\s+of\s+\d+\s*$")
QUESTION_RE = re.compile(r"(?m)^(\d{1,3})\.\s*\((\d)\)\s*")


def is_cjk(ch: str) -> bool:
    """한자·전각 구두점 등 '공백 없이 이어져도 되는' 글자인지."""
    if not ch:
        return False
    if "一" <= ch <= "鿿":
        return True
    return unicodedata.east_asian_width(ch) in ("W", "F") and ch not in MARKERS


def join_wrapped(lines):
    """PDF 줄바꿈을 원문 한 줄로 되돌린다.

    문항 앵커(`12. (3) …`)로 시작하는 줄에서만 새 논리행을 연다. 그 외는 앞줄이
    감긴 것이므로 이어 붙인다 — 다음 줄 첫 글자가 CJK 면 공백 없이, 아니면 공백을 넣어.
    """
    out = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if QUESTION_RE.match(line) or not out:
            out.append(line)
        else:
            out[-1] += ("" if is_cjk(line[0]) else " ") + line
    return "\n".join(out)


def split_question(body: str):
    """문항 본문 → (stem, options[4], tail). 실패하면 None."""
    pos = [body.find(m) for m in MARKERS]
    if any(p < 0 for p in pos) or pos != sorted(pos):
        return None

    stem = body[: pos[0]].strip()
    opts = [body[pos[i] + 1 : pos[i + 1]].strip() for i in range(3)]

    after4 = body[pos[3] + 1 :].strip()
    # 「… 。」로 끝나면 tail 없음. 마지막 공백+。 를 종결부호로 본다.
    m = re.match(r"^(.*?)\s+。\s*$", after4)
    if m:
        opts.append(m.group(1).strip())
        tail = None
    elif " " in after4:
        # 보기④ 뒤에 문장이 이어지는 유형 (01-13, 01-45 …)
        head, rest = after4.split(" ", 1)
        opts.append(head.strip())
        tail = rest.strip() or None
    else:
        opts.append(after4.rstrip("。").strip())
        tail = None
    return stem, opts, tail


def parse():
    warnings = []
    with pdfplumber.open(PDF) as pdf:
        pages = [(p.extract_text(y_tolerance=9) or "") for p in pdf.pages]

    lines = []
    for txt in pages:
        for line in txt.split("\n"):
            if FOOTER_RE.match(line.strip()):
                continue
            lines.append(line)

    # 섹션 분할
    sections, cur = [], None
    for line in lines:
        m = SECTION_RE.match(line.strip())
        if m:
            cur = {"code": m.group(1), "title": m.group(2), "lines": []}
            sections.append(cur)
        elif cur is not None:
            cur["lines"].append(line)

    subscript_fixed = []
    result_sections = []
    for sec in sections:
        body = join_wrapped(sec["lines"])
        marks = list(QUESTION_RE.finditer(body))
        questions = []
        for i, m in enumerate(marks):
            no, ans = int(m.group(1)), int(m.group(2))
            end = marks[i + 1].start() if i + 1 < len(marks) else len(body)
            raw = body[m.end() : end].strip()
            qid = f"{sec['code']}-{no:03d}"

            parsed = split_question(raw)
            if parsed is None:
                warnings.append(f"{qid}: 보기 마커 파싱 실패 — {raw[:60]}")
                continue
            stem, opts, tail = parsed
            if re.search(r"[A-Za-z]\d", "".join(opts) + stem):
                subscript_fixed.append(qid)
            questions.append({
                "qid": qid, "no": no, "answer": ans,
                "stem": stem, "options": opts, "tail": tail,
            })
        result_sections.append({
            "code": sec["code"], "title": sec["title"],
            "count": len(questions), "questions": questions,
        })

    return result_sections, warnings, subscript_fixed


def gates(sections):
    """검증 게이트. (통과여부, 리포트줄들) 반환 — 실패해도 저장하지 않는다."""
    rep, ok = [], True

    # G1 섹션 구성·문항수·합계
    got = [(s["code"], s["title"], s["count"]) for s in sections]
    total = sum(s["count"] for s in sections)
    g1 = got == EXPECTED and total == META["total"]
    ok &= g1
    rep.append(f"G1 섹션 9개·코드·제목·문항수·합계 608 : {'PASS' if g1 else 'FAIL'}")
    for (ec, et, en), (gc, gt, gn) in zip(EXPECTED, got + [("", "", 0)] * 9):
        flag = "" if (ec, et, en) == (gc, gt, gn) else "   ← 불일치"
        rep.append(f"   {ec} {et:<6} 확정 {en:>3} / 실측 {gn:>3}{flag}")
    rep.append(f"   합계 확정 {META['total']} / 실측 {total}")

    # G2 번호 연속
    g2 = True
    for s in sections:
        nos = [q["no"] for q in s["questions"]]
        if nos != list(range(1, len(nos) + 1)):
            g2 = False
            missing = sorted(set(range(1, (max(nos) if nos else 0) + 1)) - set(nos))
            dup = sorted({n for n in nos if nos.count(n) > 1})
            rep.append(f"   {s['code']}: 결번 {missing} 중복 {dup}")
    ok &= g2
    rep.append(f"G2 섹션 내 문항번호 연속(결번·중복 0) : {'PASS' if g2 else 'FAIL'}")

    # G3 답·보기 무결성
    bad = []
    for s in sections:
        for q in s["questions"]:
            if q["answer"] not in (1, 2, 3, 4):
                bad.append(f"{q['qid']} answer={q['answer']}")
            if len(q["options"]) != 4:
                bad.append(f"{q['qid']} options={len(q['options'])}")
            if any(not o.strip() for o in q["options"]):
                bad.append(f"{q['qid']} 빈 보기")
    g3 = not bad
    ok &= g3
    rep.append(f"G3 answer∈1~4 · 보기 4개 · 빈 문자열 0 : {'PASS' if g3 else 'FAIL'}")
    for b in bad[:10]:
        rep.append(f"   {b}")

    # G4 스팟체크
    idx = {q["qid"]: q for s in sections for q in s["questions"]}
    g4 = True
    for qid, want in SPOT.items():
        q = idx.get(qid)
        if q is None:
            g4 = False
            rep.append(f"   {qid}: 문항 없음")
            continue
        for k, v in want.items():
            if q[k] != v:
                g4 = False
                rep.append(f"   {qid}.{k}: 기대 {v} / 실측 {q[k]}")
    ok &= g4
    rep.append(f"G4 스팟체크 6건 : {'PASS' if g4 else 'FAIL'}")
    return ok, rep


def main():
    sections, warnings, subscript = parse()
    ok, rep = gates(sections)

    print("=== 검증 게이트 ===")
    print("\n".join(rep))

    empty_stem = [q["qid"] for s in sections for q in s["questions"] if not q["stem"]]
    tails = [q["qid"] for s in sections for q in s["questions"] if q["tail"]]
    print(f"\ntail 보존 문항: {len(tails)}건")
    print(f"stem 없는 문항(보기 선행형): {len(empty_stem)}건")
    print(f"영숫자+숫자 결합 포함 문항(첨자 재결합 후보): {len(subscript)}건 {subscript}")
    if warnings:
        print("\n경고:")
        for w in warnings:
            print("  " + w)

    if not ok:
        print("\n게이트 실패 — JSON 을 쓰지 않고 중단한다.", file=sys.stderr)
        return 1

    OUT.write_text(json.dumps(
        {"meta": META, "sections": sections}, ensure_ascii=False, indent=2
    ) + "\n", encoding="utf-8")
    print(f"\n저장: {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
