import { describe, expect, it } from "vitest";
import { anonymizeComments, anonymizeCommunityPost } from "./anonymize";
import type { Comment, CommunityPost } from "../drizzle/schema";

const now = new Date();

function makePost(authorId: number): CommunityPost {
  return {
    id: 1, authorId, category: "general", title: "t", content: "c",
    viewCount: 0, commentCount: 0, isPinned: false, createdAt: now, updatedAt: now,
  };
}

function makeComment(id: number, authorId: number): Comment {
  return { id, authorId, postType: "community", postId: 1, content: "c", createdAt: now, updatedAt: now };
}

// ─── API 응답에 작성자 정보 미포함 검증 (필수) ───────────────────────────────
describe("작성자 정보 미포함", () => {
  it("게시글 응답에 authorId 키가 존재하지 않는다", () => {
    const out = anonymizeCommunityPost(makePost(7), null);
    expect("authorId" in out).toBe(false);
    expect(Object.keys(out)).not.toContain("authorId");
    expect(out.displayName).toBe("匿名");
  });

  it("댓글 응답에 authorId 키가 존재하지 않는다", () => {
    const out = anonymizeComments([makeComment(1, 7), makeComment(2, 8)], 7, null);
    for (const c of out) {
      expect("authorId" in c).toBe(false);
    }
  });
});

// ─── 익명 표시 3분기 ─────────────────────────────────────────────────────────
describe("익명 표시 분기", () => {
  const postAuthorId = 10;
  const comments = [
    makeComment(1, 10), // 글쓴이
    makeComment(2, 20), // 첫 댓글러
    makeComment(3, 30), // 둘째 댓글러
    makeComment(4, 20), // 첫 댓글러 재등장 → 같은 번호
    makeComment(5, 10), // 글쓴이 재등장
  ];

  it("글쓴이 댓글 → 原PO", () => {
    const out = anonymizeComments(comments, postAuthorId, null);
    expect(out[0].displayName).toBe("原PO");
    expect(out[4].displayName).toBe("原PO");
  });

  it("그 외 댓글러 → 글 단위 일관 익명번호 (匿名1, 匿名2…)", () => {
    const out = anonymizeComments(comments, postAuthorId, null);
    expect(out[1].displayName).toBe("匿名1");
    expect(out[2].displayName).toBe("匿名2");
    expect(out[3].displayName).toBe("匿名1"); // 같은 사람은 같은 번호
  });

  it("본인 여부는 isMine으로만 전달 (viewer 기준)", () => {
    const out = anonymizeComments(comments, postAuthorId, 20);
    expect(out[1].isMine).toBe(true);
    expect(out[2].isMine).toBe(false);
    const post = anonymizeCommunityPost(makePost(10), 10);
    expect(post.isMine).toBe(true);
  });
});
