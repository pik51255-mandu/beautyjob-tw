/**
 * 렌더 테스트 (G2·G3)
 *
 * 「선택지에는 있는데 도달할 수 없다」가 40vol 버그의 정체였다. 순수 로직 테스트만으로는
 * 그걸 못 잡는다 — 로직은 멀쩡했고 UI 에 진입점이 없었을 뿐이다. 그래서 실제 컴포넌트를
 * 렌더해서 화면에 값이 나오는지까지 본다.
 *
 * jsdom 없이 react-dom/server 로 정적 렌더한다. useEffect 는 SSR 에서 돌지 않으므로
 * document 스텁이 필요 없고, 초기 상태는 localStorage 에서 읽으므로 그것만 스텁하면
 * "그 濃度를 고른 화면"을 그대로 만들 수 있다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import ColorMix from "./ColorMix";
import { SELECTABLE_PERCENTS } from "@/lib/colorMixCalc";

type Saved = Record<string, unknown>;

function renderWithState(state: Saved): string {
  // wouter 는 window.location 이 아니라 **전역** location·history 를 읽는다. 둘 다 깔아준다.
  const loc = { search: "", pathname: "/tools/color-mix", hash: "" };
  const hist = { state: null, pushState() {}, replaceState() {} };
  (globalThis as any).location = loc;
  (globalThis as any).history = hist;
  (globalThis as any).window = {
    location: loc,
    history: hist,
    addEventListener() {},
    removeEventListener() {},
  };
  (globalThis as any).localStorage = {
    getItem: () => JSON.stringify(state),
    setItem: () => {},
  };
  return renderToStaticMarkup(<ColorMix />);
}

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).localStorage;
  delete (globalThis as any).location;
  delete (globalThis as any).history;
});

const BASE: Saved = { base: 6, target: 8, tone: "自然", grey: "0", length: "中", volume: "中", ratio: 1, tubeG: 60 };

describe("G2: 선택 가능한 濃度 전부가 화면에 결과를 만든다", () => {
  for (const pct of [3, 6, 9, 12]) {
    it(`${pct}% 를 고르면 진단 결과가 렌더된다`, () => {
      const html = renderWithState({ ...BASE, percentOverride: pct });
      // 선택지 자체가 화면에 있다
      expect(html).toContain(`${pct}%`);
      // 진단 섹션이 값과 함께 렌더된다
      expect(html).toContain("提升度數診斷");
      expect(html).toContain("建議雙氧乳");
      // 분량 환산도 함께 나온다 — 화면이 반쪽으로 죽지 않았는지
      expect(html).toContain("分量換算");
      expect(html).toContain("調配比例是體積(ml)比，不是重量(g)比");
    });
  }
});

describe("G3: 12% 선택 시 두피 이격 경고가 실제로 렌더된다", () => {
  it("12% 를 고르면 두피 이격 경고가 화면에 나온다", () => {
    const html = renderWithState({ ...BASE, percentOverride: 12 });
    expect(html).toContain("注意事項");
    expect(html).toContain("使用 12% 時，請與頭皮保持距離塗抹。");
  });

  it("12% 미만에서는 두피 이격 경고가 화면에 없다", () => {
    for (const pct of [3, 6, 9]) {
      const html = renderWithState({ ...BASE, percentOverride: pct });
      expect(html).not.toContain("頭皮保持距離");
    }
  });

  it("依建議(기본값)에서도 경고가 없다 — 권장값은 최대 9%", () => {
    const html = renderWithState({ ...BASE, percentOverride: null });
    expect(html).not.toContain("頭皮保持距離");
  });
});

describe("G4: 선택지와 환산표가 어긋나지 않는다", () => {
  it("화면에 렌더되는 선택지가 SELECTABLE_PERCENTS 와 같다", () => {
    const html = renderWithState({ ...BASE, percentOverride: null });
    for (const pct of SELECTABLE_PERCENTS) expect(html).toContain(`${pct}%`);
    // 환산표에 없는 값은 버튼으로 나오지 않는다
    expect(html).not.toContain(">15%<");
  });
});
