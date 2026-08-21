# beautyjob.tw DNS 전환 — 선후 작업 목록

> 2026-08-22 진단. 사이트가 Manus 인증으로 튕기는 원인은 **코드가 아니라 DNS** 다.
> 도메인이 아직 Manus 호스팅(`manus.space`)을 가리키고 있어서 Manus 플랫폼이
> 자기 앱 인증 화면으로 리다이렉트한다. Render 원본은 정상(200, 리다이렉트 0).

## 1. 현재 DNS 레코드 (실측 원문)

```
$ dig beautyjob.tw A +short
15.197.225.128
3.33.251.168

$ dig www.beautyjob.tw CNAME +short
cname.manus.space.

$ dig www.beautyjob.tw A +short
cname.manus.space.
104.19.168.112
104.19.169.112

$ dig beautyjob.tw NS +short
ns52.domaincontrol.com.
ns51.domaincontrol.com.
```

- 네임서버가 `domaincontrol.com` → **DNS 관리 주체는 GoDaddy**.
- apex(`beautyjob.tw`)의 A 두 개는 레지스트라 포워딩 IP다. 실제로
  `301 → https://www.beautyjob.tw` 로 넘긴다.
- `www` 의 CNAME 이 `cname.manus.space` → 여기서 Manus 인증으로 302 가 난다.

## 2. Render 쪽에서 확인해야 하는 값

> ⚠️ **여기 값은 추측해서 쓰면 안 된다.** Render 대시보드에서 직접 읽어야 한다.

Render 대시보드 → 해당 Web Service → **Settings → Custom Domains** →
`beautyjob.tw` 와 `www.beautyjob.tw` 를 **둘 다** Add 하면, Render 가 도메인별로
넣어야 할 레코드를 화면에 띄운다. 거기 적힌 값을 그대로 쓴다.

| 필요한 값 | 어디서 확인 |
|---|---|
| apex(`beautyjob.tw`)용 A 레코드 IP | **Render 대시보드에서 확인 필요** |
| `www` 용 CNAME 타깃 | 서비스 호스트명 = `beautyjob-tw.onrender.com` (실측 확인됨) |
| 도메인 소유 확인용 값(요구될 경우) | **Render 대시보드에서 확인 필요** |

## 3. GoDaddy에서 바꿀 레코드 (before → after)

| 이름 | 타입 | before | after |
|---|---|---|---|
| `@` (apex) | A | `15.197.225.128`, `3.33.251.168` | **Render 대시보드가 지정하는 A IP** (기존 2건 삭제) |
| `www` | CNAME | `cname.manus.space.` | `beautyjob-tw.onrender.com.` |

- **apex 와 www 를 둘 다 처리해야 한다.** 하나만 바꾸면 나머지 한쪽으로 들어온
  방문자는 계속 Manus 로 튕긴다.
- GoDaddy 도메인 포워딩(Forwarding) 설정이 켜져 있으면 **끈다.** 켜진 채로 두면
  A 레코드를 바꿔도 포워딩이 우선해서 www 로 넘겨버린다.

## 4. 전환 순서

1. **Render 에 커스텀 도메인 먼저 등록** — `beautyjob.tw`, `www.beautyjob.tw` 둘 다.
   (등록 전에 DNS 를 돌리면 인증서 발급이 실패한다.)
2. GoDaddy 에서 위 표대로 레코드 변경 + 포워딩 해제.
3. **전파 대기** (GoDaddy TTL 기본 1시간). `dig` 로 확인:
   ```
   dig www.beautyjob.tw CNAME +short    # → beautyjob-tw.onrender.com. 이 나와야 함
   dig beautyjob.tw A +short            # → Render 가 준 IP
   ```
4. **Render 인증서 발급 대기** — Custom Domains 화면이 `Certificate Issued` 로
   바뀔 때까지. 보통 몇 분, 길면 수십 분.
5. 최종 확인:
   ```
   curl -sSI -L https://beautyjob.tw       # 200, manus.im 안 나와야 함
   curl -sSI -L https://www.beautyjob.tw   # 200
   ```

## 5. 전환이 끝난 뒤에 할 것 (코드 쪽)

- 페이지 `meta robots` 가 아직 **noindex** 다. 도메인이 붙은 뒤 해제한다
  (robots.txt 는 이미 크롤러 전면 허용).
- `client/index.html` 의 canonical / og:url, `client/public/sitemap.xml`,
  `server/geo.ts` 의 `DEFAULT_ORIGIN`·`ALLOWED_HOSTS` 가 `beautyjob-tw.onrender.com`
  으로 박혀 있다. 도메인 확정 후 `beautyjob.tw` 로 교체해야 한다.
- LINE 로그인이 `beautyjob.tw` DNS 연결 + LINE 콘솔 콜백 등록을 조건으로 잠겨 있다
  (`shared/const.ts`). 전환 후 재활성 가능.
