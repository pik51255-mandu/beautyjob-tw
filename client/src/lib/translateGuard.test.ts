import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 브라우저 번역기(Chrome·Safari 번역)가 텍스트 노드를 <font> 래퍼로 옮긴 상황에서
 * React 의 removeChild / insertBefore 가 어떻게 처리되는지 검증한다.
 *
 * 실기기 증상(2026-08-22, /tools/salary 投保薪資 셀렉트): 번역을 켠 채 드롭다운을
 * 열고 닫으면 낡은 번역본이 지워지지 않고 새 값이 그 옆에 붙어 같은 문구가 증식했다.
 * 아래 "번역기 래퍼" 케이스가 그 회귀 테스트다.
 */

// ─── 최소 DOM 구현 (jsdom 없이 Node.prototype 패치를 그대로 검증) ──────────────
class FakeNode {
  childNodes: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  nodeValue: string | null = null;

  constructor(public name: string, text?: string) {
    if (text !== undefined) this.nodeValue = text;
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }

  get textContent(): string {
    return this.nodeValue ?? this.childNodes.map((c) => c.textContent).join("");
  }

  removeChild(child: FakeNode): FakeNode {
    const i = this.childNodes.indexOf(child);
    if (i === -1) throw new Error("NotFoundError: The node to be removed is not a child of this node.");
    this.childNodes.splice(i, 1);
    child.parentNode = null;
    return child;
  }

  insertBefore(newNode: FakeNode, ref: FakeNode | null): FakeNode {
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    if (ref === null) {
      this.childNodes.push(newNode);
      newNode.parentNode = this;
      return newNode;
    }
    const i = this.childNodes.indexOf(ref);
    if (i === -1) throw new Error("NotFoundError: The reference node is not a child of this node.");
    this.childNodes.splice(i, 0, newNode);
    newNode.parentNode = this;
    return newNode;
  }

  appendChild(newNode: FakeNode): FakeNode {
    return this.insertBefore(newNode, null);
  }
}

/** 번역기가 하는 일: 텍스트 노드를 <font> 안으로 옮기고 내용을 갈아끼운다. */
function translate(parent: FakeNode, translated: Record<string, string>): void {
  for (const node of [...parent.childNodes]) {
    if (node.nodeValue === null) continue;
    const font = new FakeNode("font");
    parent.insertBefore(font, node);
    font.appendChild(node);
    if (translated[node.nodeValue] !== undefined) node.nodeValue = translated[node.nodeValue];
  }
}

const originalNode = (globalThis as Record<string, unknown>).Node;

beforeEach(async () => {
  vi.resetModules();
  (globalThis as Record<string, unknown>).Node = FakeNode;
  const { installTranslateGuard } = await import("./translateGuard");
  installTranslateGuard();
});

afterEach(() => {
  (globalThis as Record<string, unknown>).Node = originalNode;
});

describe("translateGuard / removeChild", () => {
  it("정상 경로: 직계 자식은 그대로 제거된다", () => {
    const parent = new FakeNode("span");
    const child = new FakeNode("#text", "自動對應");
    parent.appendChild(child);

    parent.removeChild(child);

    expect(parent.childNodes).toHaveLength(0);
    expect(child.parentNode).toBeNull();
  });

  it("번역기 래퍼 안으로 옮겨진 노드도 실제로 제거된다 (증식 회귀)", () => {
    const valueNode = new FakeNode("span");
    const label = new FakeNode("#text", "自動對應");
    const open = new FakeNode("#text", "（");
    const amount = new FakeNode("#text", "33,300");
    const close = new FakeNode("#text", "）");
    for (const n of [label, open, amount, close]) valueNode.appendChild(n);

    translate(valueNode, { 自動對應: "자동으로 매칭", "（": " ( ", "）": " ) " });
    expect(valueNode.textContent).toBe("자동으로 매칭 ( 33,300 ) ");

    // React 가 낡은 값을 걷어내고 새 값을 그린다.
    for (const n of [label, open, amount, close]) valueNode.removeChild(n);
    const fresh = new FakeNode("#text", "自動對應（45,800）");
    valueNode.appendChild(fresh);

    // 낡은 번역본이 남아 옆에 증식하면 안 된다.
    expect(valueNode.textContent).toBe("自動對應（45,800）");
    expect(valueNode.childNodes).toHaveLength(1);
  });

  it("내용이 빠진 빈 번역기 래퍼는 함께 정리된다", () => {
    const parent = new FakeNode("span");
    const text = new FakeNode("#text", "試算結果");
    parent.appendChild(text);
    translate(parent, { 試算結果: "계산 결과" });
    expect(parent.childNodes).toHaveLength(1); // <font>

    parent.removeChild(text);

    expect(parent.childNodes).toHaveLength(0);
  });

  it("무관한 곳으로 옮겨진 노드는 예외 없이 무시된다 (크래시 회귀)", () => {
    const parent = new FakeNode("span");
    const elsewhere = new FakeNode("div");
    const stray = new FakeNode("#text", "落單");
    elsewhere.appendChild(stray);

    expect(() => parent.removeChild(stray)).not.toThrow();
    expect(stray.parentNode).toBe(elsewhere); // 남의 트리는 건드리지 않는다
  });

  it("이미 떨어져 나간 노드도 예외를 던지지 않는다", () => {
    const parent = new FakeNode("span");
    const detached = new FakeNode("#text", "孤兒");

    expect(() => parent.removeChild(detached)).not.toThrow();
  });
});

describe("translateGuard / insertBefore", () => {
  it("기준 노드가 래퍼 안에 있으면 래퍼 자리 앞에 넣어 순서를 지킨다", () => {
    const parent = new FakeNode("span");
    const first = new FakeNode("#text", "A");
    const second = new FakeNode("#text", "B");
    parent.appendChild(first);
    parent.appendChild(second);
    translate(parent, {});

    const inserted = new FakeNode("#text", "X");
    parent.insertBefore(inserted, second);

    expect(parent.textContent).toBe("AXB");
  });

  it("기준 노드가 사라졌으면 끝에 붙이고 예외를 던지지 않는다", () => {
    const parent = new FakeNode("span");
    parent.appendChild(new FakeNode("#text", "A"));
    const ghost = new FakeNode("#text", "사라진 기준");
    const inserted = new FakeNode("#text", "X");

    expect(() => parent.insertBefore(inserted, ghost)).not.toThrow();
    expect(parent.textContent).toBe("AX");
  });

  it("정상 경로: 기준 노드가 직계 자식이면 그 앞에 삽입된다", () => {
    const parent = new FakeNode("span");
    const a = new FakeNode("#text", "A");
    parent.appendChild(a);
    const x = new FakeNode("#text", "X");

    parent.insertBefore(x, a);

    expect(parent.textContent).toBe("XA");
  });
});
