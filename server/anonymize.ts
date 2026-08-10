// 커뮤니티 익명화 (D-1) — "서버 응답 단계"에서 작성자 정보를 제거한다.
// 라우터는 반드시 이 함수들을 거쳐 응답할 것 (프론트에서 가리는 방식 금지).
import type { Comment, CommunityPost } from "../drizzle/schema";

export const ANON_POST_AUTHOR = "匿名";
export const ANON_OP = "原PO";

export type AnonymizedPost = Omit<CommunityPost, "authorId"> & {
  displayName: string;
  isMine: boolean;
};

export type AnonymizedComment = Omit<Comment, "authorId"> & {
  displayName: string;
  isMine: boolean;
};

// 게시글: authorId 제거, 표시명 「匿名」, 본인 여부만 전달
export function anonymizeCommunityPost(
  post: CommunityPost,
  viewerUserId: number | null
): AnonymizedPost {
  const { authorId, ...rest } = post;
  return {
    ...rest,
    displayName: ANON_POST_AUTHOR,
    isMine: viewerUserId !== null && viewerUserId === authorId,
  };
}

// 댓글: 글쓴이 본인 댓글 → 「原PO」, 그 외는 글 단위 일관 익명번호 (첫 등장 순서로 匿名1, 匿名2…)
export function anonymizeComments(
  comments: Comment[],
  postAuthorId: number,
  viewerUserId: number | null
): AnonymizedComment[] {
  const anonIndex = new Map<number, number>();
  let nextIndex = 1;
  return comments.map((comment) => {
    const { authorId, ...rest } = comment;
    let displayName: string;
    if (authorId === postAuthorId) {
      displayName = ANON_OP;
    } else {
      if (!anonIndex.has(authorId)) {
        anonIndex.set(authorId, nextIndex++);
      }
      displayName = `${ANON_POST_AUTHOR}${anonIndex.get(authorId)}`;
    }
    return {
      ...rest,
      displayName,
      isMine: viewerUserId !== null && viewerUserId === authorId,
    };
  });
}
