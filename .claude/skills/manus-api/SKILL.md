---
name: manus-api
description: Use this skill WHENEVER 선후 asks to delegate work to Manus (마누스에게 시켜, Manus로 크롤링/웹앱 배포/이미지·영상 생성), check a Manus task status (마누스 작업 확인), or retrieve Manus outputs into the current pipeline. Covers Manus API v2 authentication, task creation, polling via task.listMessages, structured output, file upload/retrieval, credit verification via usage.list, and 선후's mandatory cost-confirmation guardrail. Also triggers on "manus api", "마누스 연결", "마누스 자동화".
---

# Manus API 연동 스킬 v2 (공식 가이드 확정판)

Claude Code가 Manus를 API로 부리기 위한 절차. **API 호출 자체는 무료이나, 생성된 태스크가 소비하는 컴퓨팅에 따라 크레딧이 차감된다.** 힉스필드 MCP와 동일 원칙: 실행 전 비용 고지.

## 0. 사전 조건

- **API 키 발급:** Manus 웹앱 → Settings → Integrations → API → **Create API Key** (이름 예: `claude-code-dev`). 키는 **생성 시 단 한 번만 표시** — 즉시 복사. 계정당 최대 50개.
- **키 보관:** 환경변수만 사용. 코드·md·git·채팅에 붙여넣기 절대 금지.
  ```bash
  # ~/.zshrc 또는 프로젝트 .env (.gitignore 필수)
  export MANUS_API_KEY="발급받은키"
  ```
- 로그·에코에 키가 찍히지 않게 할 것 (curl -v 금지, 헤더 출력 금지).

## 1. 필수 가드레일 (선후 표준 — 위반 금지)

1. **실행 전 비용 고지 후 승인.** 규모별 실측 기준:
   | 작업 유형 | 예상 크레딧 | 예상 비용 |
   |---|---|---|
   | 데이터 분석·시각화 (~15분) | ~200 | ~$2 (약 2,800원 / ₱112) |
   | 웹사이트 수정·배포 (~25분) | ~360 | ~$3.6 (약 5,000원 / ₱202) |
   | 복잡한 앱 개발·통합 (~80분) | ~900 | ~$9 (약 1.26만 원 / ₱504) |
   고지 형식: "Manus 태스크 1건 — {유형}, 예상 {N}크레딧 ≈ ${X} (약 {원}원 / ₱{페소}). 진행할까요?"
2. **태스크 수 기본값 1.** 배치는 총 비용 먼저 고지.
3. **재시도 전 기존 태스크 상태 확인** (task.listMessages) — 중복 생성 = 중복 과금.
4. **완료 후 실비 검증:** `/v2/usage.list`로 해당 task_id의 실제 차감 크레딧을 확인해 보고에 포함.
5. 태스크 지시문에는 반드시 포함: "질문하지 말고, 불명확한 부분은 합리적 가정을 명시하고 끝까지 완료할 것." (waiting 상태 방지 — API로는 중간 응답이 어려움)

## 2. 엔드포인트 (v2 확정)

Base URL: `https://api.manus.ai` / 인증 헤더: `x-manus-api-key: $MANUS_API_KEY`

| 엔드포인트 | 메서드 | 용도 | Rate Limit |
|---|---|---|---|
| `/v2/task.create` | POST | 태스크 생성 (+구조화 출력 스키마) | 10회/분 |
| `/v2/task.listMessages` | GET | 이벤트·메시지 조회 = **폴링용** | 100회/분 |
| `/v2/file.upload` | POST | 파일 업로드용 Presigned URL 발급 | 40회/분 |
| `/v2/file.detail` | GET | 업로드 파일 상태 확인 | 100회/분 |
| `/v2/usage.list` | GET | task_id별 크레딧 차감 내역 | 600회/분 |

## 3. 호출 패턴 (확정)

### 3-1. 태스크 생성
```bash
curl -s -X POST https://api.manus.ai/v2/task.create \
  -H "Content-Type: application/json" \
  -H "x-manus-api-key: $MANUS_API_KEY" \
  -d '{
    "message": { "content": "작업 지시. 질문하지 말고 가정을 명시하고 완료할 것." },
    "structured_output_schema": {
      "type": "object",
      "properties": { "result": { "type": "string" } },
      "required": ["result"],
      "additionalProperties": false
    }
  }'
# 응답에서 task_id 확보
```

### 3-2. 폴링 (완료 판정)
```bash
curl -s "https://api.manus.ai/v2/task.listMessages?task_id=$TASK_ID&order=desc&limit=10" \
  -H "x-manus-api-key: $MANUS_API_KEY"
```
- 이벤트 타입 3종:
  - `status_update` → `agent_status`: `running` | `waiting` | `stopped` | `error`
  - `structured_output_result` → `stopped` 이후 등장, `value` 필드에 요청한 JSON
  - `assistant_message` → 생성 파일이 있으면 `attachments[]` 안에 다운로드 `url`
- **완료 판정 = `agent_status == "stopped"` 확인 후 `structured_output_result` 회수.**
- `waiting` = 에이전트가 입력 대기 중 → 웹UI에서 응답하거나 태스크 재설계 (가드레일 5번으로 예방).
- `error` → 즉시 폴링 중단, usage.list로 소모 크레딧 확인 후 선후에게 보고.
- 폴링 간격 20~30초 (rate limit 100회/분 여유), 최대 30분.

### 3-3. 파일 업로드 (태스크 첨부용)
```bash
# 1) Presigned URL 발급
curl -s -X POST https://api.manus.ai/v2/file.upload \
  -H "Content-Type: application/json" \
  -H "x-manus-api-key: $MANUS_API_KEY" \
  -d '{"filename": "data.csv"}'
# 응답: {"ok": true, "file": {"id": "file_123", ...}, "upload_url": "https://s3..."}

# 2) 실제 업로드 (PUT)
curl -s -X PUT "$UPLOAD_URL" --data-binary @data.csv

# 3) file.detail로 상태 확인 후 태스크에서 file id 참조
```

### 3-4. 실비 확인 (완료 후 필수)
```bash
curl -s "https://api.manus.ai/v2/usage.list" \
  -H "x-manus-api-key: $MANUS_API_KEY"
# task_id별 type:"cost" 항목의 credits 값 = 실제 차감량
```

## 4. 용도 가이드

| Claude Code가 직접 | Manus API로 위임 |
|---|---|
| 코드 수정·리뷰 (beautyjob 등) | 웹 크롤링·브라우저 조작 |
| 로컬 파일 처리, FFmpeg | Manus 호스팅 웹앱 재배포 트리거 |
| 문서·스크립트 생성 | Manus 계정 안의 기존 프로젝트 조작 |

원칙: **코드는 직접, 브라우저·배포·크롤링만 위임.** "Manus한테 코드 고치라고 시키기"는 금지 (fidelity 손실 + 크레딧 낭비).

## 5. 트러블슈팅

- `401 Unauthorized` → 키 확인. 헤더명은 `x-manus-api-key` (Authorization 아님)
- `429` → rate limit 초과. task.create는 10회/분임에 주의
- 폴링에 `structured_output_result` 안 보임 → `stopped` 확인 후 limit 늘려서 재조회
- `waiting`에서 멈춤 → 태스크 지시문에 "질문 금지·가정 명시" 누락 여부 확인, 웹UI에서 수동 응답
- 30분 초과 running → 중단하고 선후에게 보고 (재생성 전 usage.list로 기소모량 확인)

## 6. 세션 종료 시 보고

이 스킬로 실행한 태스크가 있으면: 태스크 수 / usage.list 기준 실제 소모 크레딧 합계 (≈ 달러·원·페소 환산) / 산출물 위치.
