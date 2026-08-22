/**
 * 브라우저 번역기(Safari 번역·Chrome 번역)와 React 의 DOM 충돌 방지.
 *
 * 무슨 일이 벌어지나:
 * 번역기는 화면의 텍스트 노드를 <font> 같은 래퍼 안으로 옮기고 내용을 갈아끼운다.
 * 그러면 React 가 기억하고 있던 "이 텍스트 노드의 부모"와 실제 부모가 어긋난다.
 * 이후 해당 노드를 지우거나 그 앞에 삽입하려 할 때 브라우저가 예외를 던진다:
 *   NotFoundError: Failed to execute 'removeChild' on 'Node':
 *   The node to be removed is not a child of this node.
 * React 는 이 예외를 복구하지 못해 트리 전체를 언마운트하고, ErrorBoundary 폴백이 뜬다.
 *
 * 실측(2026-08-21): 모바일에서 번역을 켠 채 /tools/salary 진입 → 입력 → 뒤로가기 시
 * 위 예외로 화면이 오류 페이지로 바뀌는 것을 재현했다.
 *
 * 대응 v2(2026-08-22): 어긋난 호출을 "무시"하지 않고 "실제 위치로 되돌려" 수행한다.
 *
 * v1 은 부모가 어긋나면 조용히 넘겼는데, 그 결과 지워져야 할 노드가 화면에 남고
 * React 가 새 노드를 그 옆에 덧붙여 같은 문구가 가로로 증식했다.
 * 실측(2026-08-22, /tools/salary 投保薪資 셀렉트): 번역 켠 상태에서 드롭다운을
 * 한 번 열고 닫자 값 노드가 4개 → 8개로 늘고, 낡은 번역본(옛 급距)이 그대로 남아
 * 최신 급距와 나란히 보였다. 표시값이 계산값과 어긋나 보인 원인이 이것이다.
 *
 * v2 는 번역기 래퍼를 꿰뚫어 실제 부모에서 지우고(빈 래퍼도 함께 정리),
 * 삽입도 래퍼 위치를 기준으로 순서를 지켜 넣는다. 크래시 방지는 그대로 유지하되
 * 잔여물이 남지 않는다. 완전히 무관한 위치의 노드일 때만 v1 처럼 무시한다.
 *
 * 이 방식을 택한 이유: translate="no" 로 번역 자체를 막으면 중국어를 못 읽는
 * 방문자의 접근성을 해친다. 번역은 살리고 크래시와 잔여물만 없앤다.
 */

let installed = false;

/**
 * 번역기 래퍼를 거슬러 올라가 parent 의 직계 자식을 찾는다.
 * parent 안에 없는 노드면 null (React 가 기억하는 위치와 완전히 무관한 경우).
 */
export function findAnchorUnder(parent: Node, node: Node): Node | null {
  let cursor: Node | null = node;
  while (cursor && cursor !== parent) {
    if (cursor.parentNode === parent) return cursor;
    cursor = cursor.parentNode;
  }
  return null;
}

export function installTranslateGuard(): void {
  if (installed) return;
  if (typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode === this) return originalRemoveChild.call(this, child) as T;

    // 번역기가 child 를 래퍼 안으로 옮긴 경우 — 실제 부모에서 지운다.
    const realParent = child.parentNode;
    if (realParent && findAnchorUnder(this, child)) {
      originalRemoveChild.call(realParent, child);
      // 내용이 빠져 껍데기만 남은 번역기 래퍼는 함께 치운다.
      if (realParent !== this && !realParent.firstChild && realParent.parentNode) {
        originalRemoveChild.call(realParent.parentNode, realParent);
      }
      return child;
    }

    // this 와 무관한 곳으로 옮겨진 노드. 던지지 않고 넘긴다.
    return child;
  };

  Node.prototype.insertBefore = function <T extends Node>(
    this: Node, newNode: T, referenceNode: Node | null
  ): T {
    if (!referenceNode || referenceNode.parentNode === this) {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    }

    // 기준 노드가 번역기 래퍼 안으로 들어간 경우 — 래퍼 자리를 기준으로 넣어 순서를 지킨다.
    const anchor = findAnchorUnder(this, referenceNode);
    if (anchor) return originalInsertBefore.call(this, newNode, anchor) as T;

    // 기준 노드가 완전히 사라진 경우. 끝에 붙여 순서만 흐트러지게 두고 살린다.
    return originalInsertBefore.call(this, newNode, null) as T;
  };
}
