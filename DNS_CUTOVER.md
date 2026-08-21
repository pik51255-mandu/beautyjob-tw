# beautyjob.tw DNS 전환 — 선후 작업 목록

> 2026-08-22 진단(v16 재실행). 사이트가 Manus 인증으로 튕기는 원인은 **코드가 아니라 DNS** 다.
> 도메인이 아직 Manus 호스팅(`manus.space`)을 가리키고 있어서 Manus 플랫폼이
> 자기 앱 인증 화면으로 리다이렉트한다. Render 원본은 정상(200, 리다이렉트 0).

## 0. 지금 무슨 일이 벌어지고 있나

```
https://beautyjob.tw        → 301  https://www.beautyjob.tw          (GoDaddy 포워딩)
https://www.beautyjob.tw    → 302  https://manus.im/app-auth?appId=…  (server: cloudflare = Manus 호스팅)
https://beautyjob-tw.onrender.com → 200, 리다이렉트 0                 (우리 앱, 정상)
```

`/manus-oauth/callback` 은 **우리 리포에 없고 git 이력 전체에도 없다.** Manus 플랫폼 자체 경로다.

## 1. 현재 DNS 레코드 (실측 원문 — 롤백용으로 보존)

```
$ dig beautyjob.tw A +short
15.197.225.128
3.33.251.168

$ dig www.beautyjob.tw CNAME +short
cname.manus.space.

$ dig beautyjob.tw NS +short
ns52.domaincontrol.com.
ns51.domaincontrol.com.
```

- 네임서버가 `domaincontrol.com` → **DNS 관리 주체는 GoDaddy**.
- apex(`beautyjob.tw`)의 A 두 개는 GoDaddy 도메인 포워딩 IP다. 실제로 `301 → www` 로 넘긴다.
- `www` 의 CNAME 이 `cname.manus.space` → 여기서 Manus 인증으로 302 가 난다.

> 🔒 **롤백**: 위 블록의 값 3종(apex A 2건 / www CNAME 1건)을 그대로 되돌려 넣으면 원상복구된다.
> 변경 전에 이 파일 또는 스크린샷으로 원 레코드를 반드시 남겨둘 것.

## 2. apex 와 www 는 처리 방법이 다르다

**핵심 제약: GoDaddy 는 apex(`@`)에 CNAME 을 넣을 수 없다.** DNS 규격상 zone apex 에는
SOA·NS 와 CNAME 이 공존할 수 없고, GoDaddy 는 이를 우회하는 ALIAS/ANAME 레코드를
제공하지 않는다. 따라서 두 도메인의 처리 방식이 갈린다.

### 2-1. apex (`beautyjob.tw`) → **A 레코드**

Render 공식 문서(<https://render.com/docs/configure-other-dns>)는 이렇게 안내한다:

> ANAME/ALIAS 를 지원하는 DNS 제공자면 그걸 써서 `<서비스>.onrender.com` 을 가리켜라.
> **지원하지 않으면 A 레코드에 `216.24.57.1`** (Render 로드밸런서)를 쓴다.

GoDaddy 는 ALIAS/ANAME 미지원 → **A 레코드 방식이 맞다.**

> ⚠️ `216.24.57.1` 은 Render **공식 문서**에 적힌 공용 로드밸런서 IP다. 추측값이 아니지만,
> Render 대시보드가 이 도메인에 대해 **다른 값을 표시하면 대시보드 값이 우선**이다.
> 등록 후 화면에 뜨는 값을 반드시 대조할 것.

**GoDaddy 도메인 포워딩(Forwarding)은 반드시 끈다.** 켜진 채로 두면 A 레코드를 바꿔도
포워딩이 우선해서 계속 www 로 넘긴다. 지금 apex 의 A 2건이 바로 그 포워딩 IP다.

### 2-2. www (`www.beautyjob.tw`) → **CNAME 레코드**

| 값 | 출처 |
|---|---|
| CNAME 타깃 = `beautyjob-tw.onrender.com` | 리포(`server/geo.ts:233`) + 라이브 200 응답으로 실측 확인됨 |

### 2-3. 바꿀 레코드 정리 (before → after)

| 이름 | 타입 | before | after |
|---|---|---|---|
| `@` (apex) | A | `15.197.225.128`<br>`3.33.251.168` | `216.24.57.1` (기존 2건 삭제, **대시보드 값과 대조 필수**) |
| `www` | CNAME | `cname.manus.space.` | `beautyjob-tw.onrender.com.` |
| — | 포워딩 | GoDaddy 도메인 포워딩 ON 추정 | **OFF** |

**apex 와 www 를 둘 다 처리해야 한다.** 하나만 바꾸면 나머지로 들어온 방문자는 계속 Manus 로 튕긴다.

> 참고: Render 는 커스텀 도메인 등록 시 apex 를 넣으면 www 를, www 를 넣으면 apex 를
> 자동으로 함께 등록하고 한쪽으로 리다이렉트한다. 그래도 **DNS 레코드는 양쪽 다 직접 넣어야 한다.**

## 3. 전환 순서

1. **Render 에 커스텀 도메인 먼저 등록.**
   대시보드 → 해당 Web Service → **Settings → Custom Domains** → `beautyjob.tw` 와
   `www.beautyjob.tw` 를 Add. 등록하면 도메인별로 넣어야 할 레코드가 화면에 뜬다.
   **DNS 를 먼저 돌리면 인증서 발급이 실패한다.**
2. **Render 화면에 뜬 값과 위 2-3 표를 대조.** 다르면 화면 값을 따른다.
3. **GoDaddy 에서 레코드 변경 + 포워딩 해제.**
4. **전파 대기** (GoDaddy TTL 기본 1시간):
   ```
   dig beautyjob.tw A +short          # → 216.24.57.1 (또는 대시보드가 지정한 값)
   dig www.beautyjob.tw CNAME +short  # → beautyjob-tw.onrender.com.
   ```
5. **인증서 발급 대기** — Custom Domains 화면이 `Certificate Issued` 로 바뀔 때까지.
   보통 몇 분, 길면 수십 분. Render 가 자동 발급·갱신한다.
6. **최종 확인:**
   ```
   curl -sSI -L https://beautyjob.tw       # 200, manus.im 이 안 나와야 함
   curl -sSI -L https://www.beautyjob.tw   # 200
   ```

## 4. 확인이 필요한 값 (추측 금지)

| 값 | 상태 |
|---|---|
| apex A 레코드 IP | Render 공식 문서 = `216.24.57.1`. **Render 대시보드에서 확인 필요**(다르면 대시보드 우선) |
| www CNAME 타깃 | `beautyjob-tw.onrender.com` — 실측 확인 완료 |
| 도메인 소유 확인용 TXT 등 | Render 가 요구할 경우에만 표시됨. **Render 대시보드에서 확인 필요** |
| GoDaddy 포워딩 현재 설정 | **GoDaddy 대시보드에서 확인 필요** (apex A 값으로 보아 ON 으로 추정) |

## 5. 전환이 끝난 뒤에 할 것 (코드 쪽 후속)

- 페이지 `meta robots` 가 아직 **noindex** 다. 도메인이 붙은 뒤 해제한다
  (`robots.txt` 는 이미 크롤러 전면 허용 상태).
- 아래 4곳에 `beautyjob-tw.onrender.com` 이 박혀 있다. 도메인 확정 후 `beautyjob.tw` 로 교체:
  - `client/index.html` — canonical, og:url
  - `client/public/sitemap.xml` — 전 항목 `<loc>`
  - `scripts/gen_sitemap.mjs:12` — `SITE_BASE_URL` 기본값
  - `server/geo.ts:233,236` — `DEFAULT_ORIGIN`, `ALLOWED_HOSTS`
- LINE 로그인이 `beautyjob.tw` DNS 연결 + LINE 콘솔 콜백 등록을 조건으로 잠겨 있다
  (`shared/const.ts:13`). 전환 후 재활성 가능.

## 6. 건드리지 않는 것

**Manus 계정·프로젝트·OAuth 앱 자체는 이 문서 범위 밖이다.** 도메인 이전이 끝난 뒤
선후가 직접 처리한다. DNS 만 돌리면 Manus 배포본은 그대로 남아 있어도 `beautyjob.tw`
방문자에게는 더 이상 보이지 않는다.
