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
 * 대응:
 * removeChild / insertBefore 를 감싸, 부모가 어긋난 경우 예외를 던지는 대신
 * 조용히 무시한다. 지우려던 노드는 어차피 번역기가 만든 래퍼와 함께 사라지므로
 * 화면상 잔여물이 남지 않는다. 정상 경로는 원본 동작 그대로다.
 *
 * 이 방식을 택한 이유: translate="no" 로 번역 자체를 막으면 중국어를 못 읽는
 * 방문자의 접근성을 해친다. 번역은 살리고 크래시만 막는다.
 */

let installed = false;

export function installTranslateGuard(): void {
  if (installed) return;
  if (typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // 번역기가 부모를 바꿔치기한 경우. 던지지 않고 넘긴다.
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node, newNode: T, referenceNode: Node | null
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      // 기준 노드가 다른 부모로 옮겨간 경우. 끝에 붙여 순서만 흐트러지게 두고 살린다.
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
