/**
 * 애널리틱스 로더 (v18 1-6).
 *
 * 왜 index.html 의 정적 <script> 를 걷어냈나:
 * Vite 의 `%VAR%` HTML 치환은 **정의된 환경변수만** 바꾼다. 미정의면 리터럴이
 * 그대로 남아 브라우저가 `%VITE_ANALYTICS_ENDPOINT%/umami` 를 상대경로로 요청하고,
 * 서버는 그런 경로를 모르니 오류로 답한다. 방문자마다 실패 요청이 한 건씩 깔렸다.
 *
 * 그래서 주입을 런타임으로 옮기고, **값이 온전할 때만** 태그를 만든다.
 * 정적 태그가 사라졌으므로 리터럴이 번들에 박히는 상태는 재현 불가다.
 */

/** 치환되지 않은 Vite 자리표시자(`%VITE_FOO%`)인가. */
const isUnsubstituted = (v: string) => /^%.*%$/.test(v);

/** 설정값이 실제로 쓸 수 있는 문자열인가. */
export function isUsableSetting(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v === "undefined" || v === "null") return false;
  return !isUnsubstituted(v);
}

export type AnalyticsConfig = { endpoint: string; websiteId: string };

/**
 * 두 값이 모두 온전할 때만 설정을 돌려준다. 하나라도 비면 null —
 * 호출부는 null 이면 **아무 요청도 만들지 않는다.**
 */
export function resolveAnalyticsConfig(
  endpoint: unknown,
  websiteId: unknown
): AnalyticsConfig | null {
  if (!isUsableSetting(endpoint) || !isUsableSetting(websiteId)) return null;
  return {
    endpoint: endpoint.trim().replace(/\/+$/, ""),
    websiteId: websiteId.trim(),
  };
}

/**
 * 설정이 온전하면 umami 스크립트를 붙이고 true, 아니면 아무것도 안 하고 false.
 * 반환값은 테스트·디버깅용이다.
 */
export function installAnalytics(
  // `import.meta.env` 를 그대로 받는다. 두 키는 ImportMetaEnv 에 선언돼 있지 않으므로
  // 인덱스 접근으로 읽는다 — 미설정이면 undefined 이고, 아래 가드가 걸러낸다.
  env: Record<string, unknown>,
  doc: Pick<Document, "createElement" | "head"> = document
): boolean {
  const config = resolveAnalyticsConfig(
    env["VITE_ANALYTICS_ENDPOINT"],
    env["VITE_ANALYTICS_WEBSITE_ID"]
  );
  if (!config) return false;

  const el = doc.createElement("script");
  el.defer = true;
  el.src = `${config.endpoint}/umami`;
  el.setAttribute("data-website-id", config.websiteId);
  doc.head.appendChild(el);
  return true;
}
