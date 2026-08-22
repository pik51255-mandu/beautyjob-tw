/**
 * 급여 계산기 렌더 회귀 테스트 (v22 1-3)
 *
 * 잡으려는 것 두 가지 —
 *  ① 投保薪資 트리거에 찍히는 급距가 실제 계산 기준과 어긋나던 문제.
 *     원인은 Radix 가 선택된 SelectItem 의 텍스트를 트리거로 **포털 복제**하던 것.
 *     복제 노드는 React 가 직접 소유하지 않아 번역기가 건드리면 낡은 사본이 남는다.
 *  ② 같은 이유로 트리거 문구가 가로로 증식하던 문제.
 *
 * SelectValue 에 children 을 주면 Radix 는 복제를 하지 않고 우리가 준 텍스트를 쓴다.
 * 그래서 정적 렌더(SSR)만으로도 트리거 글자를 검사할 수 있다 — 고치기 전에는
 * SSR 마크업에 급距 숫자가 아예 없었다(포털이 DOM 없이는 안 돌기 때문). 이 테스트가
 * 통과한다는 것 자체가 복제 경로를 쓰지 않는다는 증거다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import SalaryCalculator from "./SalaryCalculator";
import { matchInsuredBracket } from "@/lib/salaryCalc";
import { makeT } from "@/lib/toolStrings";
import { INSURED_SALARY_BRACKETS } from "@/lib/rates2026";

type Saved = Record<string, unknown>;

function render(state: Saved, search = "?lang=ko"): string {
  const loc = { search, pathname: "/tools/salary", hash: "" };
  const hist = { state: null, pushState() {}, replaceState() {} };
  (globalThis as any).location = loc;
  (globalThis as any).history = hist;
  (globalThis as any).window = {
    location: loc, history: hist, addEventListener() {}, removeEventListener() {},
  };
  (globalThis as any).localStorage = {
    getItem: () => JSON.stringify(state),
    setItem: () => {},
  };
  // useEffect 는 정적 렌더에서 돌지 않지만, 컴포넌트 본문이 document 를 만지지 않는지까지
  // 확인하려고 최소 스텁만 둔다.
  (globalThis as any).document = {
    querySelector: () => null,
    createElement: () => ({}),
    head: { appendChild() {} },
  };
  return renderToStaticMarkup(<SalaryCalculator />);
}

afterEach(() => {
  for (const k of ["window", "localStorage", "location", "history", "document"]) {
    delete (globalThis as any)[k];
  }
});

/** 트리거(combobox) 안의 글자만 뽑는다. 드롭다운 항목과 섞이지 않게 하려는 것. */
function triggerText(html: string): string {
  const m = html.match(/<button[^>]*role="combobox"[\s\S]*?<\/button>/g);
  // 첫 셀렉트는 급여 구조(설계사 모드)라 助理 모드에서는 投保薪資 가 유일하다.
  const last = m?.[m.length - 1] ?? "";
  return last.replace(/<[^>]+>/g, "").trim();
}

const ASSISTANT = (salary: number): Saved => ({
  mode: "assistant",
  assistantSalary: salary,
  assistantAllowance: 0,
  insuredManual: null,
  dependents: 0,
  pensionPct: 0,
});

describe("投保薪資 표시값 = 계산 기준 (1-3)", () => {
  it.each([32_000, 45_000, 29_000, 50_000])(
    "월급 %i 일 때 트리거의 급距가 matchInsuredBracket 과 같다",
    (salary) => {
      const html = render(ASSISTANT(salary));
      const expected = matchInsuredBracket(salary).toLocaleString("zh-TW");
      expect(triggerText(html)).toContain(expected);
    }
  );

  it("월급 45,000 → 45,800 이 뜨고, 기본값 33,300 은 남아 있지 않다", () => {
    const text = triggerText(render(ASSISTANT(45_000)));
    expect(text).toContain("45,800");
    expect(text).not.toContain("33,300");
  });

  it("수동 선택 시 그 급距가 그대로 뜬다 — 자동 문구는 사라진다", () => {
    const html = render({ ...ASSISTANT(45_000), insuredManual: 33_300 });
    const text = triggerText(html);
    expect(text).toContain("33,300");
    expect(text).not.toContain("자동");
  });
});

describe("트리거 문구는 한 번만 렌더된다 (1-3)", () => {
  it("자동 매칭 문구가 트리거에 1회만 나온다", () => {
    const text = triggerText(render(ASSISTANT(45_000)));
    expect(text.match(/자동 매칭/g) ?? []).toHaveLength(1);
  });

  it("트리거 안에 급距 숫자가 하나만 있다", () => {
    const text = triggerText(render(ASSISTANT(45_000)));
    const nums = text.match(/\d{2},\d{3}/g) ?? [];
    expect(nums).toHaveLength(1);
  });

  it("자동 매칭 항목의 라벨 자체에는 숫자가 없다", () => {
    // 드롭다운은 Portal 이라 정적 렌더에 안 잡힌다. 대신 라벨 원본을 본다 —
    // 항목 텍스트가 급距를 품으면 열려 있는 동안 값이 바뀌어 같은 문제가 재발한다.
    for (const lang of ["ko", "zh"] as const) {
      expect(makeT(lang)("insuredAuto")).not.toMatch(/\d/);
    }
  });
});

describe("실제 적용 급距 줄 (눈으로 대조하는 근거)", () => {
  it("계산에 쓰인 급距를 본문에 따로 보여준다", () => {
    const html = render(ASSISTANT(45_000));
    expect(html).toContain('data-testid="insured-applied"');
    expect(html).toContain("45,800");
  });

  it("수동 선택이면 그 값을 보여준다", () => {
    const html = render({ ...ASSISTANT(45_000), insuredManual: 30_300 });
    const m = html.match(/data-testid="insured-applied"[\s\S]{0,200}/)?.[0] ?? "";
    expect(m).toContain("30,300");
  });
});

describe("zh 원판도 같은 코드 경로를 쓴다 (1-4)", () => {
  it("zh 에서도 트리거 급距가 계산 기준과 같다", () => {
    const text = triggerText(render(ASSISTANT(45_000), ""));
    expect(text).toContain("45,800");
    expect(text).toContain("自動對應");
  });

  it("zh 트리거에도 급距 숫자가 하나뿐이다", () => {
    const text = triggerText(render(ASSISTANT(45_000), ""));
    expect(text.match(/\d{2},\d{3}/g) ?? []).toHaveLength(1);
  });
});

describe("급距 집합 자체는 건드리지 않았다", () => {
  it("자동 매칭 결과는 항상 공식 급距표 안의 값이다", () => {
    for (let salary = 25_000; salary <= 60_000; salary += 500) {
      expect(INSURED_SALARY_BRACKETS).toContain(matchInsuredBracket(salary));
    }
  });
});
