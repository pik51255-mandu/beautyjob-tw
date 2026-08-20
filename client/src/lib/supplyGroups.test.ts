import { describe, expect, it } from "vitest";
import { defaultExpandedDistricts, groupByDistrict, toggleDistrict } from "./supplyGroups";

const s = (id: number, district: string) => ({ id, district });

describe("groupByDistrict", () => {
  it("행정구별로 묶고 건수 내림차순으로 정렬한다", () => {
    const groups = groupByDistrict([
      s(1, "苓雅區"),
      s(2, "鳳山區"),
      s(3, "鳳山區"),
      s(4, "三民區"),
      s(5, "鳳山區"),
      s(6, "三民區"),
    ]);
    expect(groups.map(([d, list]) => [d, list.length])).toEqual([
      ["鳳山區", 3],
      ["三民區", 2],
      ["苓雅區", 1],
    ]);
  });

  it("건수가 같으면 행정구명 순으로 정렬한다", () => {
    const groups = groupByDistrict([s(1, "鼓山區"), s(2, "三民區")]);
    expect(groups.map(([d]) => d)).toEqual(["三民區", "鼓山區"]);
  });

  it("그룹 내 원본 순서를 보존한다", () => {
    const groups = groupByDistrict([s(3, "三民區"), s(1, "三民區"), s(2, "三民區")]);
    expect(groups[0][1].map((x) => x.id)).toEqual([3, 1, 2]);
  });

  it("빈 입력은 빈 배열을 낸다", () => {
    expect(groupByDistrict([])).toEqual([]);
  });
});

describe("defaultExpandedDistricts", () => {
  it("건수 1위 행정구만 펼친다", () => {
    const groups = groupByDistrict([s(1, "鳳山區"), s(2, "鳳山區"), s(3, "三民區")]);
    expect(defaultExpandedDistricts(groups)).toEqual(["鳳山區"]);
  });

  it("동수 1위가 여럿이어도 하나만 펼친다", () => {
    const groups = groupByDistrict([s(1, "鼓山區"), s(2, "三民區")]);
    expect(defaultExpandedDistricts(groups)).toEqual(["三民區"]);
  });

  it("그룹이 없으면 아무것도 펼치지 않는다", () => {
    expect(defaultExpandedDistricts([])).toEqual([]);
  });
});

describe("toggleDistrict", () => {
  it("접힌 구를 펼친다", () => {
    expect([...toggleDistrict(["三民區"], "鳳山區")].sort()).toEqual(["三民區", "鳳山區"]);
  });

  it("펼친 구를 다시 누르면 접는다", () => {
    expect([...toggleDistrict(["三民區", "鳳山區"], "三民區")]).toEqual(["鳳山區"]);
  });

  it("다중 펼침을 허용한다", () => {
    let open = toggleDistrict([], "三民區");
    open = toggleDistrict(open, "鳳山區");
    open = toggleDistrict(open, "苓雅區");
    expect(open.size).toBe(3);
  });

  it("원본 집합을 변형하지 않는다", () => {
    const before = new Set(["三民區"]);
    const after = toggleDistrict(before, "鳳山區");
    expect(before.size).toBe(1);
    expect(after).not.toBe(before);
  });
});
