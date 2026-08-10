---
name: manus-api
description: Use this skill WHENEVER 선후 asks to delegate work to Manus (마누스에게 시켜, Manus로 크롤링/웹앱 배포/이미지·영상 생성), check a Manus task status (마누스 작업 확인), or retrieve Manus outputs into the current pipeline. Covers Manus API v2 authentication, task creation, polling, structured output, file retrieval, and 선후's mandatory cost-confirmation guardrail. Also triggers on "manus api", "마누스 연결", "마누스 자동화".
---

# Manus API 연동 스킬

Claude Code가 Manus를 API로 부리기 위한 절차. **모든 API 호출은 Manus 크레딧을 소모한다** — 힉스필드 MCP와 동일한 원칙: UI 무료여도 API는 과금.

## 0. 사전 조건

- **API 키 발급:** Manus 웹앱 → Settings → Integration → "Build with Manus API" → Create New
- **키 보관:** 환경변수만 사용. 코드·md·git에 하드코딩 절대 금지.
  ```bash
  # ~/.zshrc 또는 프로젝트 .env (.gitignore 필수)
  export MANUS_API_KEY="발급받은키"
  ```
- 로그·에코에 키가 찍히지 않게 할 것 (curl -v 금지, 헤더 출력 금지).

## 1. 필수 가드레일 (선후 표준 — 위반 금지)

1. **실행 전 비용 고지 후 승인:** 태스크를 만들기 전 반드시 다음 형식으로 묻는다.
   > "Manus 태스크 1건 실행 예정 — 프로파일 {profile}, 예상 {N}크레딧 ≈ ${X} (약 {원}원 / ₱{페소}). 진행할까요?"
   - 기준: 약 $0.01/크레딧, 일반 태스크 평균 ~150크레딧 ≈ $1.5 (약 2,100원 / ₱84)
2. **기본 프로파일은 저비용:** `manus-1.6-lite` 또는 `speed`. 고품질(`manus-1.6`, `manus-1.6-max`)은 명시 승인 시에만.
3. **태스크 수 기본값 1.** 배치 실행은 총 비용 먼저 고지.
4. **재시도 전 기존 태스크 상태 확인** — 중복 생성 = 중복 과금.
5. `share_visibility`는 `private` 고정.

## 2. 첫 사용 시 1회: 공식 문서로 엔드포인트 검증

Manus는 v1→v2 개편 전례가 있다. 이 스킬의 [미확인] 표시 항목은 첫 사용 때 공식 문서를 읽고 확정한 뒤, 이 파일을 직접 업데이트할 것.

```bash
# 공식 문서: https://open.manus.ai/docs/v2/introduction
```

## 3. 확인된 호출 패턴

### 3-1. 태스크 생성 [확인됨]

```bash
curl -s -X POST https://api.manus.ai/v2/task.create \
  -H "x-manus-api-key: $MANUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": { "content": "여기에 작업 지시" },
    "agent_profile": "manus-1.6-lite",
    "share_visibility": "private"
  }'
```

- 응답에는 `ok`, `request_id`와 태스크 식별자가 포함된다.
- 태스크는 **비동기** — 생성 즉시 결과가 오지 않는다.

### 3-2. 구조화 출력 (결과를 JSON으로 강제) [확인됨]

```json
"structured_output_schema": {
  "type": "object",
  "properties": {
    "결과필드1": { "type": "string" },
    "결과필드2": { "type": "string" }
  },
  "required": ["결과필드1", "결과필드2"],
  "additionalProperties": false
}
```
→ `message`와 같은 레벨에 추가. 파이프라인 연동 시 필수 사용 권장.

### 3-3. 상태 폴링 [엔드포인트명 미확인 — 문서에서 task 조회 경로 확정 후 갱신]

- 상태값: `pending` → `running` → `completed` | `failed`
- v2 응답 필드명은 `agent_status` (v1의 `status`에서 변경됨)
- 폴링 간격 15~30초, 최대 20분. 장기 태스크는 웹훅(RSA-SHA256 서명 검증) 고려.

```bash
# 패턴 (경로는 문서 확인 후 확정):
# curl -s https://api.manus.ai/v2/task.get?... -H "x-manus-api-key: $MANUS_API_KEY"
# agent_status == "completed" 이면 output 회수
```

### 3-4. 파일 업로드/회수 [엔드포인트명 미확인 — 문서 확인 후 갱신]

- 파일은 1회 업로드 → `file_id`로 태스크에 첨부하는 구조.
- 완료된 태스크의 산출물 파일도 file 조회로 회수.

## 4. 용도 가이드 (언제 Manus에 던지나)

| Claude Code가 직접 | Manus API로 위임 |
|---|---|
| 코드 수정·리뷰 (beautyjob 등) | 웹 크롤링·브라우저 조작 |
| 로컬 파일 처리, FFmpeg | Manus 호스팅 웹앱 재배포 트리거 |
| 문서·스크립트 생성 | Manus 계정 안의 기존 프로젝트 조작 |

원칙: **코드는 직접, 브라우저·배포·크롤링만 위임.** 릴레이 자동화 목적으로 "Manus한테 코드 고치라고 시키기"는 금지 (fidelity 손실 + 크레딧 낭비).

## 5. 트러블슈팅

- `401 Unauthorized` → 키 확인, 헤더명이 `x-manus-api-key`인지 확인 (Authorization 아님)
- `/v1/` 경로 사용 금지 — v2 전용
- 응답 `ok: false` → `request_id`를 로그에 남기고 에러 본문 확인
- 폴링이 `running`에서 멈춤 → 20분 초과 시 태스크 실패 간주, 재생성 전 반드시 선후에게 보고

## 6. 세션 종료 시

이 스킬로 실행한 태스크가 있으면 요약 보고: 태스크 수 / 소모 크레딧 추정 / 산출물 위치.
