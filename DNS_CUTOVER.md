# beautyjob.tw DNS 전환 — **완료 기록**

> **상태: 완료 (2026-08-22).** `www.beautyjob.tw` 가 Render 앱을 직접 서빙하고,
> apex 는 www 로 301 한다. Manus 리다이렉트 0.
>
> 이 문서는 작업 지시서가 아니라 **끝난 작업의 기록**이다. 같은 일을 다시 하거나
> 되돌려야 할 때 여기부터 읽는다.

---

## 1. 최종 레코드 (실측)

```
$ dig beautyjob.tw A +short
216.24.57.1

$ dig www.beautyjob.tw CNAME +short
beautyjob-tw.onrender.com.

$ dig www.beautyjob.tw A +short
beautyjob-tw.onrender.com.
gcp-us-west1-1.origin.onrender.com.
gcp-us-west1-1.origin.onrender.com.cdn.cloudflare.net.
216.24.57.15
216.24.57.7

$ dig beautyjob.tw NS +short
ns51.domaincontrol.com.
ns52.domaincontrol.com.
```

| 이름 | 타입 | 값 |
|---|---|---|
| `@` (apex) | **A** | `216.24.57.1` |
| `www` | **CNAME** | `beautyjob-tw.onrender.com.` |
| NS | — | `ns51/ns52.domaincontrol.com.` (GoDaddy) |

## 2. 도달 경로 (실측)

```
$ curl -sSI -L https://beautyjob.tw
hop1  https://beautyjob.tw      → 301  location: https://www.beautyjob.tw/   server: cloudflare
hop2  https://www.beautyjob.tw/ → 200                                        server: cloudflare
                                       x-render-origin-server: Render
최종: https://www.beautyjob.tw/  ·  200  ·  hop 1회
```

apex → www 301 은 **Render 가 처리한다.** GoDaddy 포워딩이 아니다.

## 3. 실제로 쓴 전환 순서 — **www 우선**

정본 순서는 다음과 같았다. 다시 할 일이 생기면 이 순서를 쓴다.

1. **Render 에 커스텀 도메인 등록** (`www.beautyjob.tw` → apex 동반 등록)
2. **`www` CNAME 을 먼저 교체** — `cname.manus.space.` → `beautyjob-tw.onrender.com.`
3. **apex A 레코드 교체** — GoDaddy 포워딩 IP 2건 삭제 → `216.24.57.1`
4. 전파 대기 → Render 인증서 발급 대기
5. 시크릿 창에서 apex → www → 200 확인

**www 를 먼저 돌리는 이유**: apex 는 어차피 www 로 넘기는 역할이라, www 가 먼저
살아 있어야 중간에 "apex 는 옮겼는데 도착지가 아직 Manus" 인 구간이 생기지 않는다.

> DNS 를 Render 등록보다 먼저 돌리면 인증서 발급이 실패한다. 1번이 항상 먼저다.

## 4. 전환 전 레코드 (롤백용)

되돌려야 하면 아래 값을 그대로 넣는다.

| 이름 | 타입 | 전환 전 값 |
|---|---|---|
| `@` (apex) | A | `15.197.225.128`<br>`3.33.251.168` |
| `www` | CNAME | `cname.manus.space.` |
| — | 포워딩 | GoDaddy 도메인 포워딩 ON |

전환 전에는 apex A 2건이 GoDaddy 포워딩 IP였고, 포워딩이 www 로 넘긴 뒤
Manus 호스팅이 `manus.im/app-auth` 로 302 를 냈다. 그게 "사이트가 안 보이던" 원인이다.
포워딩은 이번 전환에서 껐다.

## 5. 왜 apex 와 www 의 레코드 타입이 다른가

**GoDaddy 는 apex(`@`)에 CNAME 을 넣을 수 없다.** DNS 규격상 zone apex 에는 SOA·NS 와
CNAME 이 공존할 수 없고, GoDaddy 는 이를 우회하는 ALIAS/ANAME 을 제공하지 않는다.
그래서 apex 는 A 레코드(`216.24.57.1`, Render 로드밸런서),
www 는 CNAME(`beautyjob-tw.onrender.com`) 으로 갈렸다.

근거: <https://render.com/docs/configure-other-dns>

## 6. 전환 후 코드 쪽 후속 (v18 에서 완료)

| 항목 | 상태 |
|---|---|
| `meta robots` noindex 해제 | 완료 — `server/salonPages.ts:73` `index, follow` |
| robots.txt 안내 문구 | 완료 — `server/geo.ts` 「網域已接上，索引已開放」 |
| `server/geo.ts` `DEFAULT_ORIGIN` | 완료 — `https://www.beautyjob.tw` |
| `server/geo.ts` `ALLOWED_HOSTS` | 완료 — www / apex / onrender 3종 |
| `client/index.html` canonical·og:url | 완료 — `https://www.beautyjob.tw/` |
| `client/public/sitemap.xml` | 완료 — 3,422 URL 전부 신도메인 |
| `scripts/gen_sitemap.mjs` 기본 BASE | 완료 — `https://www.beautyjob.tw` |
| 애널리틱스 `%VITE_%` 리터럴 | 완료 — 런타임 가드로 이전(v18 1-6) |

**정본 도메인은 `https://www.beautyjob.tw` 다.** apex 는 Render 가 301 로 넘기므로
canonical·sitemap·origin 은 전부 www 로 통일한다. 열린 질문이 아니다.

## 7. 아직 남은 것

- ~~**IndexNow**~~ — 2026-08-22(v19) **활성화 완료.** `INDEXNOW_ENABLED = true`.
  키 검증 파일 `/{KEY}.txt` 가 라이브 200 이고 페이지가 `index, follow` 라 전제 조건 충족.
- **LINE 로그인** — `shared/const.ts` 에서 잠겨 있다. LINE 콘솔 콜백 URL 등록이 필요하다.
- **애널리틱스 엔드포인트** — 미설정. umami 인스턴스 선정·비용은 선후 결정 사항.
- **Manus 계정·프로젝트·OAuth 앱** — 손대지 않았다. 도메인이 넘어왔으므로
  `beautyjob.tw` 방문자에게는 더 이상 보이지 않는다. 정리는 선후가 직접 한다.

---

## 8. Google Search Console 등록 (v19 1번) — 절차

> 등록 자체는 **선후 + Cowork** 담당. 여기 적은 건 코드 쪽 몫이다.

### 8-1. 소유권 확인 방식 — **HTML 메타 태그**를 쓴다

| 방식 | 이 프로젝트에 맞나 |
|---|---|
| **HTML 메타 태그** | ✅ **권장.** `client/index.html` `<head>` 에 한 줄 넣고 배포하면 끝. SPA 홈이 정적 `index.html` 을 그대로 내려주므로 GSC 크롤러가 바로 읽는다 |
| HTML 파일 업로드 | △ 가능하지만 번거롭다. `client/public/` 에 파일을 넣어야 하고, 그 폴더는 지금 `sitemap.xml` 하나만 두는 규율로 관리 중이다 |
| DNS TXT | ✗ 후순위. GoDaddy 재접근이 필요하고, 도메인 전환이 막 끝난 직후라 레코드를 또 건드릴 이유가 없다 |

### 8-2. 태그를 받으면 하는 일 (Code 몫)

1. 선후가 GSC 「소유권 확인 → HTML 태그」에서 받은 한 줄을 전달한다. 형태:
   ```html
   <meta name="google-site-verification" content="…" />
   ```
2. `client/index.html` 의 `<head>` 안, `<link rel="canonical">` **바로 위**에 넣는다.
3. `npm run build` → 커밋 → `main` 푸시 (= Render 자동배포).
4. 배포 반영 확인 — **코드 grep 이 아니라 라이브 응답으로**:
   ```bash
   curl -sS https://www.beautyjob.tw/ | grep google-site-verification
   ```
5. 선후가 GSC 에서 「확인」을 누른다.
6. 확인이 끝나면 사이트맵 제출: GSC → Sitemaps → `sitemap.xml`

### 8-3. 사이트맵 제출 준비 상태 (실측)

```
$ curl -sSI https://www.beautyjob.tw/sitemap.xml
→ 200 · application/xml · 588,556 bytes

<loc> 개수: 3,422
구도메인(onrender) 잔존: 0
첫 항목: <loc>https://www.beautyjob.tw/</loc>
```

**제출 준비 완료.** 페이지는 `index, follow` 이고 robots.txt 도 전면 허용이라
사이트맵을 넣는 즉시 크롤이 걸린다.
