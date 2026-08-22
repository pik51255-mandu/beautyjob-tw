import { describe, expect, it } from "vitest";
import { installAnalytics, isUsableSetting, resolveAnalyticsConfig } from "./analytics";

/** document 대역 — createElement/head 만 흉내낸다. */
function fakeDoc() {
  const appended: Array<Record<string, unknown>> = [];
  return {
    appended,
    createElement: () => {
      const attrs: Record<string, string> = {};
      return {
        attrs,
        setAttribute(k: string, v: string) {
          attrs[k] = v;
        },
      } as unknown as HTMLScriptElement;
    },
    head: {
      appendChild: (el: unknown) => {
        appended.push(el as Record<string, unknown>);
      },
    },
  } as unknown as Pick<Document, "createElement" | "head"> & {
    appended: Array<Record<string, unknown>>;
  };
}

describe("치환되지 않은 Vite 자리표시자 판별 (v18 1-6)", () => {
  it("%VITE_ANALYTICS_ENDPOINT% 같은 리터럴을 거부한다", () => {
    expect(isUsableSetting("%VITE_ANALYTICS_ENDPOINT%")).toBe(false);
    expect(isUsableSetting("%VITE_ANALYTICS_WEBSITE_ID%")).toBe(false);
  });

  it("빈 값·undefined·null 문자열도 거부한다", () => {
    for (const v of ["", "   ", "undefined", "null", undefined, null, 0]) {
      expect(isUsableSetting(v)).toBe(false);
    }
  });

  it("정상 값은 통과한다", () => {
    expect(isUsableSetting("https://analytics.example.com")).toBe(true);
  });
});

describe("설정 해석", () => {
  it("둘 다 온전해야 설정이 나온다", () => {
    expect(resolveAnalyticsConfig("https://a.example", "abc")).toEqual({
      endpoint: "https://a.example",
      websiteId: "abc",
    });
  });

  it("하나만 비어도 null", () => {
    expect(resolveAnalyticsConfig("https://a.example", undefined)).toBeNull();
    expect(resolveAnalyticsConfig(undefined, "abc")).toBeNull();
    expect(resolveAnalyticsConfig("%VITE_ANALYTICS_ENDPOINT%", "abc")).toBeNull();
  });

  it("끝의 슬래시를 지워 //umami 가 되지 않게 한다", () => {
    expect(resolveAnalyticsConfig("https://a.example/", "abc")?.endpoint).toBe(
      "https://a.example"
    );
  });
});

describe("주입 — 미설정이면 요청 자체를 만들지 않는다 (1-6a 회귀 방지)", () => {
  it("환경변수가 아예 없으면 script 를 붙이지 않는다", () => {
    const doc = fakeDoc();
    expect(installAnalytics({}, doc)).toBe(false);
    expect(doc.appended).toHaveLength(0);
  });

  it("치환 안 된 리터럴이 들어와도 script 를 붙이지 않는다", () => {
    const doc = fakeDoc();
    const installed = installAnalytics(
      {
        VITE_ANALYTICS_ENDPOINT: "%VITE_ANALYTICS_ENDPOINT%",
        VITE_ANALYTICS_WEBSITE_ID: "%VITE_ANALYTICS_WEBSITE_ID%",
      },
      doc
    );
    expect(installed).toBe(false);
    expect(doc.appended).toHaveLength(0);
  });

  it("값이 온전하면 붙이고, src 에 자리표시자가 남지 않는다", () => {
    const doc = fakeDoc();
    const installed = installAnalytics(
      {
        VITE_ANALYTICS_ENDPOINT: "https://analytics.example.com",
        VITE_ANALYTICS_WEBSITE_ID: "site-1",
      },
      doc
    );
    expect(installed).toBe(true);
    expect(doc.appended).toHaveLength(1);
    const el = doc.appended[0] as unknown as {
      src: string;
      defer: boolean;
      attrs: Record<string, string>;
    };
    expect(el.src).toBe("https://analytics.example.com/umami");
    expect(el.src).not.toMatch(/%/);
    expect(el.defer).toBe(true);
    expect(el.attrs["data-website-id"]).toBe("site-1");
  });
});
