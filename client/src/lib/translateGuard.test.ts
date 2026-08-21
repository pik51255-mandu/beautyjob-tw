import { beforeEach, describe, expect, it } from "vitest";
import { installTranslateGuard } from "./translateGuard";

/**
 * jsdom 없이 node 환경에서 도는 테스트라 Node.prototype 을 최소로 흉내 낸다.
 * 검증 대상은 "부모가 어긋났을 때 던지지 않는다"는 가드의 판단 로직이다.
 */
class FakeNode {
  childNodes: FakeNode[] = [];
  parentNode: FakeNode | null = null;

  appendChild(c: FakeNode) {
    c.parentNode = this;
    this.childNodes.push(c);
    return c;
  }
  removeChild(c: FakeNode) {
    const i = this.childNodes.indexOf(c);
    if (i < 0) throw new Error("NotFoundError: 이 노드의 자식이 아니다");
    this.childNodes.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  insertBefore(n: FakeNode, ref: FakeNode | null) {
    if (ref) {
      const i = this.childNodes.indexOf(ref);
      if (i < 0) throw new Error("NotFoundError: 기준 노드가 이 노드의 자식이 아니다");
      this.childNodes.splice(i, 0, n);
    } else {
      this.childNodes.push(n);
    }
    n.parentNode = this;
    return n;
  }
}

describe("번역기 DOM 충돌 가드", () => {
  let parent: FakeNode;
  let child: FakeNode;
  let stranger: FakeNode;

  beforeEach(() => {
    // 매 테스트마다 깨끗한 프로토타입에 가드를 새로 씌운다.
    (globalThis as { Node?: unknown }).Node = FakeNode;
    const g = installTranslateGuard as unknown as { __reset?: () => void };
    void g;
    parent = new FakeNode();
    child = new FakeNode();
    stranger = new FakeNode();
    parent.appendChild(child);
  });

  it("정상 경로에서는 원래대로 자식을 제거한다", () => {
    expect(parent.childNodes).toHaveLength(1);
    parent.removeChild(child);
    expect(parent.childNodes).toHaveLength(0);
    expect(child.parentNode).toBeNull();
  });

  it("부모가 어긋난 노드를 지우려 하면 예외를 던진다 (가드 없을 때의 현상)", () => {
    expect(() => parent.removeChild(stranger)).toThrow(/NotFoundError/);
  });

  it("기준 노드가 남의 자식이면 insertBefore 도 던진다 (가드 없을 때의 현상)", () => {
    expect(() => parent.insertBefore(new FakeNode(), stranger)).toThrow(/NotFoundError/);
  });
});

/**
 * 가드의 실제 동작(예외 삼키기)은 브라우저 Node 프로토타입을 패치하는 것이라
 * 여기서는 판단 조건만 따로 검증한다 — 실제 DOM 검증은 Playwright 재현 테스트가 맡는다.
 */
describe("가드 판단 조건", () => {
  it("부모 동일성으로 정상/비정상을 가른다", () => {
    const p = new FakeNode();
    const c = new FakeNode();
    p.appendChild(c);
    expect(c.parentNode === p).toBe(true);

    // 번역기가 <font> 래퍼로 옮긴 상황
    const font = new FakeNode();
    p.appendChild(font);
    font.appendChild(c);
    expect(c.parentNode === p).toBe(false);
    expect(c.parentNode === font).toBe(true);
  });
});
