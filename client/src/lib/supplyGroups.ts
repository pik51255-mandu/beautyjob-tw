// 美材行 목록의 행정구 그룹핑·펼침 상태 계산.
// 살롱 허브(3,000+건)로 확장할 때 그대로 재사용하기 위해 컴포넌트에서 분리해 둔다.

export type DistrictItem = { district: string };
export type DistrictGroup<T> = [district: string, items: T[]];

/** 행정구별로 묶어 건수 내림차순(동수는 행정구명 순)으로 정렬한다. 그룹 내 원본 순서는 보존. */
export function groupByDistrict<T extends DistrictItem>(items: T[]): DistrictGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.district);
    if (list) list.push(item);
    else groups.set(item.district, [item]);
  }
  return Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
  );
}

/** 최초 진입 시 펼쳐 둘 행정구 — 건수 1위 한 곳만. */
export function defaultExpandedDistricts(groups: DistrictGroup<unknown>[]): string[] {
  return groups.length ? [groups[0][0]] : [];
}

/** 해당 행정구의 펼침 상태를 뒤집은 새 집합을 낸다. 다중 펼침 허용, 입력은 변형하지 않는다. */
export function toggleDistrict(current: Iterable<string>, district: string): Set<string> {
  const next = new Set(current);
  if (!next.delete(district)) next.add(district);
  return next;
}
