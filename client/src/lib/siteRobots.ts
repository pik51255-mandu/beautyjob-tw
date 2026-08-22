/**
 * meta robots 를 한 곳에서만 만진다.
 *
 * 전에는 도구 페이지 6곳이 각자 `?lang=ko` 면 noindex 를 붙이고, 아니면 태그를
 * **지웠다**. 사이트 전체를 noindex 로 돌리면 그 「지운다」가 전역 설정을 벗겨낸다 —
 * 색인을 닫았는데 정작 도구 페이지만 열려 있는 상태가 된다. 그래서 중앙화했다.
 *
 * 규칙:
 *  · SITE_PUBLIC=false — 페이지가 뭘 원하든 사이트 값(noindex, follow)을 유지한다
 *  · SITE_PUBLIC=true  — 페이지가 noindex 를 원할 때만 붙이고, 아니면 태그를 없앤다
 *    (기존 ?lang=ko 동작 그대로)
 */
import { SITE_PUBLIC, SITE_ROBOTS_CONTENT } from "@shared/const";

/** 이 페이지에 찍을 robots 값. null 이면 태그를 두지 않는다. */
export function robotsContentFor(pageWantsNoindex: boolean): string | null {
  if (!SITE_PUBLIC) return SITE_ROBOTS_CONTENT;
  return pageWantsNoindex ? "noindex" : null;
}

function setRobots(content: string | null): void {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (content === null) {
    existing?.remove();
    return;
  }
  const meta = existing ?? document.createElement("meta");
  if (!existing) {
    meta.name = "robots";
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/**
 * 페이지 마운트 시 호출한다. 반환값은 언마운트 정리 함수 —
 * 페이지가 덮어쓴 값을 걷고 **사이트 기본값으로 되돌린다.**
 * 비공개면 noindex 가 남고, 공개면 태그가 없어진다(= 색인 허용). 어느 쪽이든
 * 「이 페이지의 예외」만 사라지고 사이트 방침은 그대로다.
 */
export function applyRobotsMeta(pageWantsNoindex: boolean): () => void {
  setRobots(robotsContentFor(pageWantsNoindex));
  return () => setRobots(robotsContentFor(false));
}
