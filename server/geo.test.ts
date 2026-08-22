import { describe, expect, it, vi } from "vitest";
import {
  AI_BOTS, DATA_AS_OF, DISALLOWED_PATHS, INDEXNOW_ENABLED, INDEXNOW_KEY,
  breadcrumbLd, buildRobotsTxt, datasetLd, itemListLd, organizationLd, pingIndexNow,
} from "./geo";

const ORIGIN = "https://example.tw";

describe("robots.txt", () => {
  const txt = buildRobotsTxt(ORIGIN);

  it("AI 검색 봇 9종을 전부 허용한다", () => {
    expect(AI_BOTS).toHaveLength(9);
    for (const bot of AI_BOTS) {
      expect(txt).toContain(`User-agent: ${bot}\nAllow: /`);
    }
  });

  it("일반 봇도 허용하되 비공개 경로는 막는다", () => {
    expect(txt).toContain("User-agent: *\nAllow: /");
    for (const p of DISALLOWED_PATHS) expect(txt).toContain(`Disallow: ${p}`);
  });

  // RFC 9309: 크롤러는 매칭된 그룹 하나만 따른다. 개별 봇 그룹에 Disallow 가 없으면
  // 이름을 적어준 봇에게만 /admin·/api/ 가 열린다.
  it("각 AI 봇 그룹이 비공개 경로를 스스로 막는다", () => {
    const groups = txt.split(/\n\s*\n/).filter((g) => g.includes("User-agent:"));
    expect(groups.length).toBe(AI_BOTS.length + 1);
    for (const g of groups) {
      for (const p of DISALLOWED_PATHS) {
        expect(g, `그룹에 Disallow ${p} 누락: ${g.split("\n")[0]}`).toContain(`Disallow: ${p}`);
      }
    }
  });

  it("Sitemap 은 요청 호스트를 따라간다", () => {
    expect(buildRobotsTxt("https://a.com")).toContain("Sitemap: https://a.com/sitemap.xml");
    expect(buildRobotsTxt("https://b.tw")).toContain("Sitemap: https://b.tw/sitemap.xml");
  });

  it("색인이 개시됐음을 문서화한다 — noindex 안내가 남아 있으면 안 된다 (v18 1-2)", () => {
    expect(txt).not.toContain("noindex");
    expect(txt).toContain("索引已開放");
  });
});

describe("Organization / Dataset 스키마", () => {
  const org = organizationLd(ORIGIN);
  const ds = datasetLd(ORIGIN);

  it("Organization 은 안정적인 @id 를 가진다", () => {
    expect(org["@id"]).toBe(`${ORIGIN}/#organization`);
    expect(org["@type"]).toBe("Organization");
  });

  it("Dataset 이 Organization 을 @id 로 참조한다", () => {
    expect((ds.publisher as { "@id": string })["@id"]).toBe(org["@id"]);
    expect((ds.creator as { "@id": string })["@id"]).toBe(org["@id"]);
  });

  // 원천은 財政部 營業(稅籍)登記 자료(BGMOPEN1.csv) + 民政局 門牌坐標다.
  // 經濟部 商工행정자료(GCIS)는 이 데이터셋에 쓰이지 않았으므로 등장하면 안 된다.
  it("원천 기관 두 곳을 sourceOrganization·isBasedOn 양쪽에 명시한다", () => {
    expect(ds.sourceOrganization).toHaveLength(2);
    expect(ds.isBasedOn).toHaveLength(2);
    const names = JSON.stringify(ds.sourceOrganization);
    expect(names).toContain("財政部");
    expect(names).toContain("民政局");
  });

  it("쓰이지 않은 기관(經濟部/GCIS)을 출처로 주장하지 않는다", () => {
    const all = JSON.stringify(ds);
    expect(all).not.toContain("經濟部");
    expect(all).not.toContain("gcis");
  });

  it("원천별 vintage 를 각각 명시한다", () => {
    const based = ds.isBasedOn as { name: string; dateModified: string }[];
    expect(based.every((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.dateModified))).toBe(true);
  });

  it("dateModified 는 데이터 기준일이며 ISO 날짜다", () => {
    expect(ds.dateModified).toBe(DATA_AS_OF);
    expect(DATA_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("size 는 넘겼을 때만 붙는다", () => {
    expect(datasetLd(ORIGIN)).not.toHaveProperty("size");
    expect(datasetLd(ORIGIN, { size: 3382 }).size).toBe("3382 筆");
  });
});

describe("BreadcrumbList", () => {
  it("position 이 1부터 연속이다", () => {
    const bc = breadcrumbLd(ORIGIN, [{ name: "A", path: "/a" }, { name: "B", path: "/b" }, { name: "C" }]);
    expect(bc.itemListElement.map((e) => e.position)).toEqual([1, 2, 3]);
  });

  it("path 가 없으면 item 을 붙이지 않는다 (현재 페이지)", () => {
    const bc = breadcrumbLd(ORIGIN, [{ name: "A", path: "/a" }, { name: "현재" }]);
    expect(bc.itemListElement[0]).toHaveProperty("item");
    expect(bc.itemListElement[1]).not.toHaveProperty("item");
  });

  it("item 은 절대 URL 이다", () => {
    const bc = breadcrumbLd(ORIGIN, [{ name: "A", path: "/a" }]);
    expect((bc.itemListElement[0] as { item: string }).item).toBe(`${ORIGIN}/a`);
  });
});

describe("ItemList", () => {
  it("numberOfItems 가 실제 항목 수와 일치한다", () => {
    const il = itemListLd(ORIGIN, "L", [
      { name: "x", path: "/x" }, { name: "y", path: "/y" }, { name: "z", path: "/z" },
    ]);
    expect(il.numberOfItems).toBe(3);
    expect(il.itemListElement).toHaveLength(3);
  });

  it("빈 목록도 모순 없이 만든다", () => {
    const il = itemListLd(ORIGIN, "L", []);
    expect(il.numberOfItems).toBe(0);
    expect(il.itemListElement).toEqual([]);
  });
});

describe("IndexNow — 준비만, 발사 금지", () => {
  it("기본 비활성이다", () => {
    expect(INDEXNOW_ENABLED).toBe(false);
  });

  // M11: 플래그를 켜는 순간 이 테스트가 실제로 IndexNow 로 POST 하는 사고를 막는다.
  // fetch 를 반드시 스텁하고, 호출 0회임을 함께 단언한다.
  it("비활성일 때 네트워크 호출 없이 즉시 반환한다", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("테스트에서 실제 네트워크 호출이 발생했다")
    );
    try {
      const r = await pingIndexNow(ORIGIN, ["https://example.tw/a"]);
      expect(spy).not.toHaveBeenCalled();
      expect(r.sent).toBe(false);
      if (!r.sent) expect(r.reason).toContain("INDEXNOW_ENABLED=false");
    } finally {
      spy.mockRestore();
    }
  });

  it("키는 파일명으로 쓸 수 있는 형식이다", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });
});
