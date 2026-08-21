# beautyjob 콘텐츠 공장 — progress

## v7 실행 기록 (2026-08-21)

### 라인 A — Manus 題庫 PDF 태스크

| 항목 | 결과 |
|---|---|
| A-1 실행 전 잔여 크레딧 | **조회 불가** — `usage.list`는 차감 내역(ledger)만 제공, 잔액 엔드포인트 없음. 대신 task_id별 실비로 소모량 산출 |
| A-2 태스크 생성 | `task_id: 55XABqrsKUDDu2P9SAmrXh` (지시 프롬프트 원문 그대로, 단발) |
| 태스크 결과 | **차단됨** — Manus가 techbank.wdasec.gov.tw 접속 차단 보고. 구조화 출력 `{blocked: true, notes: "차단됨"}` |
| A-3 PDF 저장·검증 | 미실행 (PDF 미확보) |
| A-4 소모 크레딧 | `usage.list`에 해당 task_id의 `type:"cost"` 항목 생성 확인, **credits 수치는 정산 대기** (조회 시점까지 미표시). 실행 시간 ~1.5분(생성 09:08 → stopped 09:09)으로 소액 추정. 다음 세션에서 재조회할 것 |
| A-5 단원·문항수 확정 | 미실행 (검증 불통과). 04 문서도 리포에 없음 — 차이 표 생성 불가 |
| A-6 준수 | 재시도·우회 지시 없이 종료 ✓ |

**후속 판단 필요:** 대만 정부 기능검정 사이트가 Manus 클라우드 IP를 차단하는 것으로 보임.
대안(수동 다운로드 후 파일 업로드, 대만 IP 경유 등)은 별도 승인 전 착수 금지 원칙에 따라 보류.

### 라인 B — #2 (4대 결합) 비주얼 파일럿 (전부 로컬, 크레딧 0)

| 단계 | 산출물 | 상태 |
|---|---|---|
| B-0 | `visual/style.json` — 사이트 테마(oklch)→hex 고정. 주 4색: 玫瑰金 `#b92846` / 深炭 `#0f1216` / 米白 `#fbf8f5` / 水藍 `#00a9b3` + 파생 틴트. 폰트 Noto Sans TC | ✓ |
| B-1 | `visual/char-{hydrogen,salt,disulfide,peptide}.svg` + `visual/characters.svg` (2×2 시트) — 기하 도형 기반, 생성 코드 `pilot-02/src/gen_svgs.py`로 완전 재현 가능 | ✓ |
| B-2 | `pilot-02/illust-01-strength.svg` (강도 비교) / `illust-02-hydrogen-water.svg` (물 만난 氫鍵 3패널) / `illust-03-perm-3steps.svg` (燙髮 3단계) | ✓ |
| B-3 | `pilot-02/loop-hydrogen-bond.mp4` — 1080×1350, H.264(yuv420p), 15fps, 8.0초, **179KB** (≤8MB ✓) | ✓ |
| B-4 | `pilot-02/card-01-concept.png` (훅: 吹的捲，為什麼隔天就沒了？) / `card-02-quiz-template.png` (4지선다 재사용 템플릿) — 1080×1350 | ✓ |
| B-5 | `pilot-02/previews/*.png` (SVG 8종 전부 1080px 미리보기) | ✓ |

**검증 결과**
- 루프 검증: 첫 프레임(t=0) vs 끝 프레임(t=8.0) 픽셀 diff **bbox None / max 0** — 완전 심리스 ✓
- 간체 lint: 총 한자 166종 전수 검사(OpenCC s2t 비교), 간체 **0** ✓ (초안의 元凶→元兇 교정 1건)
- 용어 lint: 氫鍵·鹽鍵·雙硫鍵·胜肽鍵·第一劑·第二劑·還原劑·氧化劑·捲·題庫·丙級 전부 존재, 대륙식 용어(氢键/烫 등) 0 ✓
- 참고: 02 바이블 문서가 리포에 없어 용어 대조는 v7 지시문의 용어 목록 기준으로 수행

**재현 파이프라인 (전부 로컬)**
`pilot-02/src/gen_svgs.py` (SVG 생성) → `src/render.mjs` (Chromium 렌더: 미리보기·카드·프레임, 요구 env: PW_DIR=playwright-core 설치 경로, FONT_CSS=Noto Sans TC @font-face) → ffmpeg(imageio-ffmpeg) 인코딩

### 미착수 (승인 대기)
- 배치 ② 진입 금지 유지
- 사이트 코드 변경·배포 없음
- Manus 추가 태스크 없음 (총 1건 생성)
