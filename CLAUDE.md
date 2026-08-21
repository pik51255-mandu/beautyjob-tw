# beautyjob-tw 프로젝트 규칙

> 전역 규칙은 `~/.claude/CLAUDE.md`. 이 파일은 **이 리포에서만** 추가로 지키는 것.

## 세션 소유권 규칙

이 리포는 여러 세션·에이전트가 **같은 디렉터리를 병행해서 채운다.** 서로를 못 보면
"작업이 없다"고 오판하거나 남의 산출물을 덮어쓴다. 실제로 두 번 다 일어났다.

### 1. 세션 시작 시 무조건 원격을 먼저 본다

```bash
git fetch origin
git log --oneline origin/main -20
```

`git status` 가 clean 해도 하지 않은 것으로 치지 않는다. **"그런 파일·작업은 없다"는
판정을 로컬 작업트리만 보고 내리지 않는다.** 부재를 근거로 결론을 바꾸기 전에는
`git ls-tree -r origin/main` 과 `git log --all -- <path>` 까지 확인한다.

### 2. 디렉터리 소유권 — 자기 소유 밖은 수정하지 않는다

| 경계 | 소유 |
|---|---|
| `content-factory/ch*/`, `content-factory/review-ko/`, `content-factory/artifacts/`, `content-factory/visual/` | 콘텐츠 제작 |
| `client/`, `server/`, `shared/`, `scripts/` (리포 루트) | 앱 개발 |
| `content-factory/sources/`, `content-factory/drafts/`, `content-factory/scripts/` | 題庫·이론 원고 |

### 3. 남의 소유 디렉터리가 고쳐져야 하면, 고치지 말고 적는다

보고에 **"요청 사항"** 으로만 적는다. 직접 손대지 않는다.

**예외 — 지시서가 해당 경로·파일을 명시해 작업을 지시한 경우는 위임으로 본다.**
이 경우 수정하되, 보고에 **「위임 수행」** 으로 명시한다. 명시가 없으면 다음 세션이
"누가 왜 남의 디렉터리를 건드렸나"를 되짚을 방법이 없다.

### 4. `content-factory/progress.md` 는 공용 — append-only

기존 줄을 다시 쓰지 않는다. **정정도 새 줄로 한다.** 틀린 기록을 지우면 다른 세션이
왜 바뀌었는지 알 수 없고, 같은 오판이 반복된다. 틀린 줄은 남기고 그 아래에 정정을 붙인다.

## 검증 명령

```bash
npx tsc --noEmit                                    # 타입
npx vitest run                                      # 단위·렌더 테스트
node content-factory/lint.mjs content-factory/drafts/**/*.md   # 콘텐츠 규제 lint
node content-factory/lint-ui.mjs                    # UI 문구 규제 lint
```

배포는 `main` 푸시 = Render 자동배포다. **푸시 전에 반드시 승인을 받는다.**
배포 확인은 번들 문자열 grep 이 아니라 **라이브 실동작**으로 한다 (앱이 코드 스플릿돼 있어
`index-*.js` grep 은 거짓 음성을 낸다 — 실제로 한 번 오판했다).
