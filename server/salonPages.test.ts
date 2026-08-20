import { describe, expect, it } from "vitest";
import { ADJACENT_DISTRICTS, DISTRICT_SLUGS, districtForSlug, slugForDistrict } from "../shared/districts";
import { esc } from "./salonPages";

describe("행정구 슬러그 매핑", () => {
  it("38개 행정구 전부 슬러그를 가진다", () => {
    expect(Object.keys(DISTRICT_SLUGS)).toHaveLength(38);
  });

  it("슬러그는 民政局 코드 기반이라 안정적이다", () => {
    expect(slugForDistrict("鹽埕區")).toBe("kh-001");
    expect(slugForDistrict("三民區")).toBe("kh-005");
    expect(slugForDistrict("鳳山區")).toBe("kh-012");
  });

  it("슬러그가 중복되지 않는다", () => {
    const slugs = Object.values(DISTRICT_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("왕복 변환이 항등이다", () => {
    for (const d of Object.keys(DISTRICT_SLUGS)) {
      expect(districtForSlug(slugForDistrict(d)!)).toBe(d);
    }
  });

  it("모르는 구·슬러그는 null 을 낸다", () => {
    expect(slugForDistrict("台北市中正區")).toBeNull();
    expect(districtForSlug("kh-999")).toBeNull();
    expect(districtForSlug("../etc/passwd")).toBeNull();
  });

  it("인접 구는 실재하는 행정구만 가리킨다", () => {
    for (const [d, adj] of Object.entries(ADJACENT_DISTRICTS)) {
      expect(DISTRICT_SLUGS[d], `${d} 자신이 매핑에 없음`).toBeTruthy();
      for (const a of adj) expect(DISTRICT_SLUGS[a], `${d} → ${a} 미등록`).toBeTruthy();
    }
  });

  it("인접 관계에 자기 자신이 들어가지 않는다", () => {
    for (const [d, adj] of Object.entries(ADJACENT_DISTRICTS)) {
      expect(adj).not.toContain(d);
    }
  });
});

describe("HTML 이스케이프", () => {
  it("스크립트 주입 문자를 무력화한다", () => {
    expect(esc('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("따옴표와 앰퍼샌드를 처리한다", () => {
    expect(esc(`A&B "C" 'D'`)).toBe("A&amp;B &quot;C&quot; &#39;D&#39;");
  });

  it("null·undefined 는 빈 문자열", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });

  it("정상 중국어 상호는 그대로 보존한다", () => {
    expect(esc("言穠髮色造形")).toBe("言穠髮色造形");
  });
});
