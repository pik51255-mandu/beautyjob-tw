import { describe, expect, it, vi } from "vitest";
import {
  AI_BOTS, DATA_AS_OF, DISALLOWED_PATHS, INDEXNOW_ENABLED, INDEXNOW_KEY,
  breadcrumbLd, buildIndexNowPayload, buildRobotsTxt, datasetLd, itemListLd, organizationLd, pingIndexNow,
} from "./geo";
import { ROBOTS_BLOCKED, ROBOTS_INDEXABLE, SITE_PUBLIC, SITE_ROBOTS_CONTENT } from "@shared/const";

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

  // v27: robots.txt 는 SITE_PUBLIC 과 무관하게 **항상 크롤을 허용한다.**
  // 여기서 막으면 봇이 각 페이지의 noindex 를 읽지 못해 오히려 색인이 남는다.
  it("비공개 상태여도 크롤은 막지 않는다 — noindex 를 읽게 해야 한다", () => {
    expect(txt).toContain("User-agent: *\nAllow: /");
    expect(txt).not.toContain("Disallow: /\n");
  });

  it("색인 여부를 robots.txt 에 하드코딩하지 않는다 — meta robots 소관이다", () => {
    expect(txt).toContain("個別頁面的索引與否由各頁 meta robots 決定");
    expect(txt).not.toContain("索引已開放");
  });
});

// v27: 재공개는 SITE_PUBLIC 한 줄 변경으로 끝나야 한다.
// 기대값을 하드코딩하면 플래그를 뒤집었을 때 테스트가 거짓으로 실패하거나,
// 더 나쁘게는 거짓으로 통과한다. 전부 플래그에서 파생시킨다.
describe("사이트 공개 스위치 (SITE_PUBLIC)", () => {
  it("meta robots 값이 플래그에서 파생된다", () => {
    expect(SITE_ROBOTS_CONTENT).toBe(SITE_PUBLIC ? "index, follow" : "noindex, follow");
  });

  it("noindex 여도 follow 는 남긴다 — 내부 링크는 계속 따라가게", () => {
    expect(SITE_ROBOTS_CONTENT).toContain("follow");
  });

  it("IndexNow 는 공개 상태일 때만 켜진다 — 색인 핑과 noindex 가 모순되면 안 된다", () => {
    expect(INDEXNOW_ENABLED).toBe(SITE_PUBLIC);
  });

  // 여기에 expect(SITE_PUBLIC).toBe(false) 를 두지 않는다.
  // 두면 재공개가 「한 줄」이 아니라 「두 줄」이 되어 v27 요구를 어긴다.
  // 임의 공개를 막는 것은 테스트가 아니라 절차다 —
  // content-factory/progress.md 의 v27 판정(선후 승인 필수)이 그 자리다.
  it("robots 값에 index/noindex 를 하드코딩한 곳이 없다", () => {
    expect(SITE_ROBOTS_CONTENT).toBe(SITE_PUBLIC ? ROBOTS_INDEXABLE : ROBOTS_BLOCKED);
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

describe("IndexNow", () => {
  it("SITE_PUBLIC 을 그대로 따른다 (v27)", () => {
    expect(INDEXNOW_ENABLED).toBe(SITE_PUBLIC);
  });

  // M11: 테스트가 실제로 IndexNow 로 POST 하는 사고를 막는다.
  // 플래그가 켜진 뒤에도 fetch 는 반드시 스텁한다 (v19 4번에서 활성화됨).
  it("URL 이 비면 네트워크 호출 없이 즉시 반환한다", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("테스트에서 실제 네트워크 호출이 발생했다")
    );
    try {
      const r = await pingIndexNow(ORIGIN, []);
      expect(spy).not.toHaveBeenCalled();
      expect(r.sent).toBe(false);
      // 비공개면 게이트에서, 공개면 빈 목록에서 멈춘다. 어느 쪽이든 호출은 0 이다.
      if (!r.sent) expect(r.reason).toContain(SITE_PUBLIC ? "URL 없음" : "SITE_PUBLIC=false");
    } finally {
      spy.mockRestore();
    }
  });

  // 페이로드 검증은 플래그와 무관하게 계속 돈다 — 비공개 기간에 형태가 썩으면
  // 재공개 때 켜자마자 잘못된 본문을 보내게 된다.
  it("페이로드에 host·key·keyLocation·urlList 가 담긴다", () => {
    const body = buildIndexNowPayload(ORIGIN, ["https://example.tw/a"]);
    expect(body.host).toBe(new URL(ORIGIN).host);
    expect(body.key).toBe(INDEXNOW_KEY);
    expect(body.keyLocation).toBe(`${ORIGIN}/${INDEXNOW_KEY}.txt`);
    expect(body.urlList).toEqual(["https://example.tw/a"]);
  });

  it("URL 은 10,000 개에서 자른다 (사양 상한)", () => {
    const many = Array.from({ length: 10_050 }, (_, i) => `https://example.tw/${i}`);
    expect(buildIndexNowPayload(ORIGIN, many).urlList).toHaveLength(10_000);
  });

  it("공개 상태일 때만 실제로 POST 한다", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 })
    );
    try {
      const r = await pingIndexNow(ORIGIN, ["https://example.tw/a"]);
      if (SITE_PUBLIC) {
        expect(spy).toHaveBeenCalledOnce();
        expect(r.sent).toBe(true);
      } else {
        expect(spy).not.toHaveBeenCalled();
        expect(r.sent).toBe(false);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("키는 파일명으로 쓸 수 있는 형식이다", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });
});
