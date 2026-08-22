import { describe, expect, it, vi } from "vitest";
import { ROBOTS_BLOCKED, SITE_PUBLIC } from "@shared/const";

/**
 * v27 이 고친 함정의 회귀 테스트.
 *
 * 도구 페이지 6곳은 `?lang=ko` 가 아니면 robots 메타를 **지웠다**. 사이트 전체를
 * noindex 로 돌려도 그 「지운다」가 전역 설정을 벗겨내, 색인을 닫았는데 도구 페이지만
 * 열려 있는 상태가 됐을 것이다. 감사에서 「이 표면에 테스트가 0개」로 지적돼 추가한다.
 *
 * jsdom 없이 도는 환경이라 document 를 최소로 흉내 낸다 — 검증 대상은
 * 「어떤 값을 언제 쓰는가」이지 브라우저 DOM 구현이 아니다.
 */
type FakeMeta = { name: string; content: string; remove: () => void };

function installFakeDom() {
  let meta: FakeMeta | null = null;
  const doc = {
    querySelector: (sel: string) => (sel.includes("robots") ? meta : null),
    createElement: () => {
      const m: FakeMeta = { name: "", content: "", remove: () => { meta = null; } };
      return m;
    },
    head: { appendChild: (m: FakeMeta) => { meta = m; } },
  };
  vi.stubGlobal("document", doc);
  return {
    current: () => (meta ? meta.content : null),
    reset: () => { meta = null; },
  };
}

describe("robotsContentFor 진리표", () => {
  it("SITE_PUBLIC 과 페이지 요구의 4조합", async () => {
    const { robotsContentFor } = await import("./siteRobots");
    if (SITE_PUBLIC) {
      // 공개: 페이지가 원할 때만 noindex, 아니면 태그 없음 (기존 ?lang=ko 동작)
      expect(robotsContentFor(true)).toBe("noindex");
      expect(robotsContentFor(false)).toBeNull();
    } else {
      // 비공개: 페이지가 뭘 원하든 사이트 값을 유지한다 — 이게 함정을 막는 지점
      expect(robotsContentFor(true)).toBe(ROBOTS_BLOCKED);
      expect(robotsContentFor(false)).toBe(ROBOTS_BLOCKED);
    }
  });

  it("비공개면 어떤 페이지도 태그를 없앨 수 없다", async () => {
    const { robotsContentFor } = await import("./siteRobots");
    if (!SITE_PUBLIC) {
      for (const wants of [true, false]) expect(robotsContentFor(wants)).not.toBeNull();
    }
  });
});

describe("applyRobotsMeta — 마운트/언마운트", () => {
  it("마운트 시 값을 세우고, 언마운트 시 사이트 기본값으로 되돌린다", async () => {
    const dom = installFakeDom();
    try {
      const { applyRobotsMeta, robotsContentFor } = await import("./siteRobots");
      const cleanup = applyRobotsMeta(true);
      expect(dom.current()).toBe(robotsContentFor(true));
      cleanup();
      // 핵심: 「지우기」가 아니라 「사이트 기본값 복귀」다.
      expect(dom.current()).toBe(robotsContentFor(false));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("도구 페이지를 떠나도 비공개 상태에서는 noindex 가 남는다 (함정 회귀)", async () => {
    const dom = installFakeDom();
    try {
      const { applyRobotsMeta } = await import("./siteRobots");
      applyRobotsMeta(false)(); // 마운트 후 즉시 언마운트
      if (!SITE_PUBLIC) expect(dom.current()).toBe(ROBOTS_BLOCKED);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
