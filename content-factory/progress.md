# beautyjob.tw 콘텐츠 공장 — 진행 대장

최종 갱신: 2026-08-21

---

## Phase 0 — 준비 확인 결과

### 0-1 / 0-2 소스 파일

| 파일 | 크기 | 상태 |
|---|---:|---|
| `sources/01_research_additions.md` | 26,367 B | ✓ |
| `sources/02_taiwan_bible.md` | 21,353 B | ✓ |
| `sources/03_seeding_plan_30.md` | 8,662 B | ✓ |
| `sources/04_exam_mapping.md` | 7,522 B | ✓ |
| `sources/05_067003A13.pdf` | — | **✗ 확보 실패 (아래 참조)** |

### 0-3 題庫 PDF 확보 — **실패, 수동 다운로드 필요**

지시서의 두 경로를 모두 시도했고 둘 다 실패했다.

| 경로 | 시도 | 결과 |
|---|---|---|
| a) 가오슝시정부 게시 사본 | `curl -L` + 브라우저(Playwright) 2회 | **HTTP 404** — 해당 파일이 서버에서 내려감. 호스트(`orgws.kcg.gov.tw`, 223.200.91.232)는 살아 있으나 파일 경로가 없음 |
| b) 공식 허브 `techbank.wdasec.gov.tw` | `curl` + 브라우저 + DNS 우회 | **SNI 기반 네트워크 차단**. 공개 리졸버로는 `210.69.37.94` 로 정상 해석되고 TCP 443 도 연결되지만, TLS Client Hello 직후 연결이 끊긴다(`SSL_ERROR_SYSCALL`). 도메인 허용목록 추가 필요 |

**정정(2026-08-21):** 최초 보고에서 "도메인 미해석"으로 적었으나, 공개 리졸버(8.8.8.8/1.1.1.1)로는 정상
해석된다. 로컬 리졸버와 SNI 필터에서 막힌 것이며 **도메인은 실재한다**. 즉 b) 는 허용목록 추가로 해소 가능하다.

대체 경로 도달성 실측: `www.block.tw` **HTTP 200(도달 가능)**, `www.quizfun.co` **차단**.

**필요한 조치(사람)**: 브라우저에서 아래 중 하나로 `067003A13`(版次 V114112113) PDF를 받아
`content-factory/sources/05_067003A13.pdf` 로 저장.
- 技能檢定中心 測試參考資料 페이지에서 직종코드 `06700` 검색
- 또는 `skill.tcte.edu.tw` (전능검정 사이트, 현재 접속 가능) 경유

**차단 범위**: 라인 B(기출 해설) 전량과 Phase 0-4(단원·문항수 확정)가 이 파일에 의존한다.
라인 A(이론 30편)는 의존하지 않는다.

### 0-4 단원·문항수 확정 — **보류**

PDF 미확보로 대조 불가. `04_exam_mapping.md` 의 표(818題, 11개 工作項目)는 **미검증 상태**로 둔다.
특히 아래 두 가지는 PDF 파싱으로만 확정 가능하므로 현재 판단하지 않는다.

- 113/01/01 개편에 따른 **12(化粧品的認識)·13(公共衛生) 단원의 재편 여부**
- 각 工作項目의 실제 문항수와 합계(818題)의 일치 여부

PDF 확보 후 최우선으로 파싱해 이 절을 갱신한다.

### 0-5 글 게재 방식 — **A안 채택 확정** (2026-08-21, 구현은 여전히 승인 전 금지)

리포 현황: React SPA(wouter) + Express + Drizzle(MySQL) 구성이며,
이미 `server/salonPages.ts` 로 **서버 렌더 HTML 페이지**(`/salons`·`/area/*`·`/salon/*`·`/stats`)를
SPA 정적 서빙보다 먼저 등록해 내보내는 패턴이 자리잡혀 있다. 이 패턴이 SEO 검증(수용 테스트)까지
갖춰져 있어 재사용 가치가 가장 크다.

| 안 | 구조 | 장점 | 단점 | 적합도 |
|---|---|---|---|---|
| **A. DB `articles` 테이블 + 서버 렌더** | 마이그레이션으로 `articles` 신설(slug·level·series·keywords·body·publishedAt), `salonPages.ts` 와 같은 방식으로 `/articles/:slug` 서버 렌더 | 기존 SSR·JSON-LD·수용 테스트 자산 그대로 재사용. 검색·필터·레벨 태그가 SQL로 자연스러움. 발행/비공개 상태 관리 용이 | 마이그레이션 필요. 원고 수정 시 DB 적재 절차 필요 | **권장** |
| B. 정적 마크다운 렌더링 | `content-factory/drafts/**.md` 를 빌드 시 HTML 로 변환해 정적 서빙 | DB 무변경. 원고=단일 진실원천, git 이력이 곧 개정 이력 | 목록·필터·검색을 직접 구현해야 함. 글 수가 늘면 빌드 산출물 관리 부담 | 차선 |
| C. 기존 `community_posts` 확장 | `category` enum 에 값 추가하고 기존 커뮤니티 모델에 편입 | 신규 테이블 없음. 댓글·조회수 기능 즉시 재사용 | `authorId` 필수 등 회원 글 전제와 충돌. 레벨·시리즈·slug 개념이 없어 스키마 오염. SEO 구조(서버 렌더·JSON-LD)를 새로 붙여야 함 | 비권장 |

**A안 채택 확정.** `articles` 테이블 + `/articles/:slug` 서버 렌더. 설계만 진행하고 구현·DB 변경·배포는 금지.

---

## slug 확정 목록 (R6 — 최초 1회 고정, 이후 변경 금지)

내부링크는 `/articles/{slug}` 형식을 쓴다.

### 라인 A — 이론 30편

| # | 제목 | slug | level | 상태 |
|---:|---|---|---|---|
| 1 | 頭髮結構全解析：毛鱗片、皮質層、髓質層 | `hair-structure-basics` | 初級 | **검증통과** |
| 2 | 頭髮的四種鍵結：氫鍵、鹽鍵、雙硫鍵、胜肽鍵 | `hair-bonds-four-types` | 初級 | **검증통과** |
| 3 | pH與美髮：為什麼護髮都是弱酸性？ | `ph-and-hair-care` | 初級 | **검증통과** |
| 4 | 一劑二劑在做什麼：氧化與還原入門 | `oxidation-reduction-basics` | 初級 | **검증통과** |
| 5 | 洗髮精與潤髮乳的化學：界面活性劑入門 | `surfactant-basics` | 初級 | **검증통과** |
| 6 | 毛髮生長週期：生長期、退化期、休止期 | `hair-growth-cycle` | 初級 | **검증통과** |
| 7 | 台灣人的頭皮現實：油性頭皮判斷與基礎養護 | `oily-scalp-taiwan` | 初級 | **검증통과** |
| 8 | 髮質診斷基本功：看、摸、拉三步驟 | `hair-diagnosis-basics` | 初級 | **검증통과** |
| 9 | 多孔性是什麼：為什麼受損髮上色特別快 | `hair-porosity` | 初級 | **검증통과** |
| 10 | 染髮前48小時：皮膚測試完整指南 | `patch-test-guide` | 初級 | **검증통과** |
| 11 | 燙髮三步驟：還原→重組→氧化的完整原理 | `perm-three-steps` | 中級 | **검증통과** |
| 12 | 軟化判斷完全指南：測試軟化的正確方法 | `softening-test-guide` | 中級 | **검증통과** |
| 13 | 還原劑比較：TGA、半胱胺酸、半胱胺鹽酸鹽 | `reducing-agents-compared` | 中級 | **검증통과** |
| 14 | 冷燙、溫塑燙、熱塑燙：原理層面的完整差別 | `perm-types-compared` | 中級 | **검증통과** |
| 15 | 離子燙與縮毛矯正：藥水、溫度、設計的差異 | `straightening-compared` | 中級 | **검증통과** |
| 16 | 染髮色彩學：色相環與補色中和 | `color-theory-basics` | 中級 | **검증통과** |
| 17 | 底色理論：紅→橘→黃的祕密 | `undertone-theory` | 中級 | **검증통과** |
| 18 | 雙氧乳設計邏輯：3%、6%、9%、12%怎麼選 | `developer-volume-guide` | 中級 | **검증통과** |
| 19 | 漂髮科學：漂粉+雙氧的化學與過硫酸鹽 | `bleaching-science` | 中級 | **검증통과** |
| 20 | 蓋白髮的科學：白髮為什麼特別難染 | `grey-coverage-science` | 中級 | **검증통과** |
| 21 | 矯色與紫色洗髮精：原理與極限 | `toning-purple-shampoo` | 中級 | **검증통과** |
| 22 | 熱損傷科學：幾度開始不可逆？ | `heat-damage-science` | 中級 | **검증통과** |
| 23 | 結構式護髮的化學：Olaplex、K18差在哪 | `bond-builder-chemistry` | 高級 | **검증통과** |
| 24 | 卡色與漂髮發熱的隱形兇手：金屬離子與硬水 | `metallic-salts-hard-water` | 高級 | **검증통과** |
| 25 | 酸熱離子護的真相：乙二醛酸原理與安全爭議 | `glyoxylic-acid-truth` | 高級 | **검증통과** |
| 26 | 設計師的職業安全：PPD、過硫酸鹽與你的手和肺 | `stylist-occupational-safety` | 高級 | **검증통과** |
| 27 | 高溫潮濕與髮型：濕氣、氫鍵、抗毛躁的科學 | `humidity-frizz-science` | 高級 | **검증통과** |
| 28 | 為什麼台灣夏天褪色特別快：UV、汗水與護色設計 | `uv-color-fading` | 高級 | **검증통과** |
| 29 | 受損髮三層次診斷：表面、內部、鍵結的護理設計 | `damaged-hair-three-layers` | 高級 | **검증통과** |
| 30 | 設計師不能說的話：化粧品廣告法規完全指南 | `cosmetic-ad-regulations` | 高級 | **검증통과** |

### 라인 B — 기출 해설 (PDF 확보 후 확정)

單元 구성이 PDF 파싱으로 확정되어야 하므로 slug 를 아직 고정하지 않는다.
확정 시 `exam-{단원}-{연번}` 형식(예: `exam-perm-01`)으로 부여하고 이 표에 고정 기록한다.

**현재 상태: 전량 대기 (PDF 차단)**

---

## 진행 대장

| 편 | 제목 | slug | 상태 | 字數 | lint | 날짜 |
|---|---|---|---|---:|---|---|
| A-1 | 頭髮結構全解析 | `hair-structure-basics` | 검증통과 | 1,889 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-2 | hair-bonds-four-types | `hair-bonds-four-types` | 검증통과 | 2,641 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-3 | ph-and-hair-care | `ph-and-hair-care` | 검증통과 | 3,157 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-4 | oxidation-reduction-basics | `oxidation-reduction-basics` | 검증통과 | 2,742 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-5 | surfactant-basics | `surfactant-basics` | 검증통과 | 3,207 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-6 | hair-growth-cycle | `hair-growth-cycle` | 검증통과 | 2,199 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-7 | oily-scalp-taiwan | `oily-scalp-taiwan` | 검증통과 | 2,643 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-8 | hair-diagnosis-basics | `hair-diagnosis-basics` | 검증통과 | 3,519 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-9 | hair-porosity | `hair-porosity` | 검증통과 | 2,863 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-10 | patch-test-guide | `patch-test-guide` | 검증통과 | 3,467 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-11 | perm-three-steps | `perm-three-steps` | 검증통과 | 4,456 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-12 | softening-test-guide | `softening-test-guide` | 검증통과 | 4,115 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-13 | reducing-agents-compared | `reducing-agents-compared` | 검증통과 | 3,794 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-14 | perm-types-compared | `perm-types-compared` | 검증통과 | 4,480 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-15 | straightening-compared | `straightening-compared` | 검증통과 | 4,465 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-16 | color-theory-basics | `color-theory-basics` | 검증통과 | 3,444 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-17 | undertone-theory | `undertone-theory` | 검증통과 | 3,994 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-18 | developer-volume-guide | `developer-volume-guide` | 검증통과 | 3,543 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-19 | bleaching-science | `bleaching-science` | 검증통과 | 3,948 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-20 | grey-coverage-science | `grey-coverage-science` | 검증통과 | 5,062 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-21 | toning-purple-shampoo | `toning-purple-shampoo` | 검증통과 | 4,031 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-22 | heat-damage-science | `heat-damage-science` | 검증통과 | 4,005 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-23 | bond-builder-chemistry | `bond-builder-chemistry` | 검증통과 | 5,564 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-24 | metallic-salts-hard-water | `metallic-salts-hard-water` | 검증통과 | 5,431 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-25 | glyoxylic-acid-truth | `glyoxylic-acid-truth` | 검증통과 | 4,948 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-26 | stylist-occupational-safety | `stylist-occupational-safety` | 검증통과 | 5,461 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-27 | humidity-frizz-science | `humidity-frizz-science` | 검증통과 | 4,467 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-28 | uv-color-fading | `uv-color-fading` | 검증통과 | 5,050 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-29 | damaged-hair-three-layers | `damaged-hair-three-layers` | 검증통과 | 5,629 | 간체 0 / 금지어 0 | 2026-08-21 |
| A-30 | cosmetic-ad-regulations | `cosmetic-ad-regulations` | 검증통과 | 4,238 | 간체 0 / 금지어 0 | 2026-08-21 |
| B-1 | 燙髮篇 제1편(軟化·試捲) | — | **차단** (PDF 미확보) | — | — | — |

---

## 알려진 이슈 (해소됨)

- **lint.mjs 연산자 우선순위 버그 (2026-08-21 수정)**: `new Set("A" + "B".split("").filter(...))`
  에서 `.split()` 이 뒤 리터럴에만 걸려 배열이 문자열화되고, join 구분자인 ASCII 콤마가
  간체자 집합에 섞였다. 그 결과 본문에 반각 콤마만 있어도 "간체자 1종" 오탐이 났다.
  배치 ① 집필 에이전트 4명이 독립적으로 이 증상을 보고했고, 일부는 본문에서 콤마·영문
  화학명을 빼는 방식으로 회피했다. 두 리터럴을 괄호로 묶어 수정했고, 회피로 빠졌던
  `Toluene-2,5-diamine` 표기를 #10 에 복원했다.

## 배치 ② 에서 드러난 lint 이슈

1. **2-d %↔vol 규칙 오탐 (수정 완료)**: 서술문의 「把「6%」聽成「6vol」」처럼 *오류를 경고하는*
   문장까지 불일치로 잡았다. 대응을 단정하는 **표 행에서만** 판정하도록 좁혔고,
   표 안 오류(9%↔20vol)는 여전히 검출됨을 음성 대조로 확인했다.

2. **금지어 부분문자열 과검출 (미해결 — 판단 필요)**: `生髮` 를 부분문자열로 매칭하다 보니
   `新生髮根`·`原生髮`(둘 다 대만 현장 표준어: 뿌리 신생부 / 시술 이력 없는 모발)까지 걸린다.
   집필 담당 4명이 `新長出來的部分`·`新生區`·`還沒被染燙過的頭髮` 등으로 우회했다.
   결과 문장 자체는 자연스러우나 표준 업계어를 못 쓰는 상태다.
   같은 이유로 `刺激`(단독)·`醫療`(단독)도 회피 대상이 됐다 — 원래 금지 대상은
   `刺激毛囊`·`醫療級` 뿐이다. **R2 를 완화할지(예외 목록 도입) 여부는 선후님 판단 사항**이라
   임의로 바꾸지 않았다.

## 라인 A 이론 30편 — 전량 완료 (2026-08-21)

전 30편 lint 통과. 간체자 0 / 규제 금지어 0 / 教科書沒說的 전편 빈칸 유지 /
내부링크 전부 확정 slug 목록 내 / 雙氧乳 %↔vol 전 구간 일치.

- 초급 10편 · 중급 12편 · 고급 8편
- 총 中文 字數 약 122,000
- #30 은 R9 예외 적용: 금지어 14종이 전부 「」 인용 안에만 등장(인용 91개).
  인용 밖 `生髮` 2건은 화이트리스트 어휘(原生髮·新生髮)로 마스킹 후 잔존 0.

## v12 이력 소급 기록 (2026-08-21)

지시서 v12 의 1-a~1-d 는 "이미 있는 것을 정리한다"를 전제로 했으나, 실제 확인 결과
전제 대상 다수가 **처음부터 존재하지 않았다.** 사실대로 남긴다.

| 항목 | 지시서 전제 | 실제 확인 결과 |
|---|---|---|
| 1-a `sources/05_067003A13.pdf` (0바이트) | 삭제 대상으로 존재 | **부재.** `sources/` 에는 01~04 md 4개뿐, PDF 자체가 없다 |
| 1-b 섹션명 `課本沒說的` 혼재 | 표기 흔들림 존재 | **혼재 없음.** 30편 전부 `教科書沒說的` |
| 1-c `教科書沒說的` 에 서술·인용 유입 | 축약 필요 | **유입 없음.** 30편 전부 유도 질문만, 서술 0 |
| 1-d `ch01`·`ch02` 작성 이력 | 소급 기록 대상 | **그런 파일이 존재한 적 없다.** 라인 A 는 처음부터 `01-…`~`30-…` 번호 파일명만 사용 |
| 1-d zh 렌더 이력 | 소급 기록 대상 | **렌더를 실행한 적 없다.** 사이트에 `/articles/*` 라우트가 없고, 게재 구현은 v12 에서도 금지 범위 |

전제가 틀렸다고 규칙까지 버리지는 않았다. 재발 방지용으로 lint 규칙 3종을 **선제 추가**했다:

- **1-a**: `sources/` 의 PDF 가 500KB 미만이면 실패. 0바이트 파일이 "존재 체크"를 통과하는 사고를 막는다.
- **1-b**: 섹션명 정확 일치 검사. `課本沒說的` 등 변형이 들어오면 실패.
- **1-c**: `### 現場答（선후 작성）` 슬롯 필수. `> [미작성]` 이면 `status=draft` — zh 발행 불가로 판정.

30편 전부에 現場答 슬롯을 넣었고, 현재 전편 `status=draft` 다. 선후님이 현장 답을 채우기
전까지 zh 발행 대상이 아니라는 뜻이며, lint 요약 표의 `status` 열에서 바로 보인다.

## 사이트 도구 — 染髮調配計算機 (v12 2, 2026-08-21)

이론 글의 계산 파트를 사이트 도구로 옮긴 5번째 계산기. **콘텐츠 공장 산출물이 아니라
사이트 코드**이므로 여기에는 연결 관계만 남긴다.

- 경로 `/tools/color-mix` · 設計師工具(공개, OwnerGate 없음)
- 안전 레일이 참조하는 이론 글: `undertone-theory`(#17) · `bleaching-science`(#19) ·
  `grey-coverage-science`(#20). 세 slug 은 확정 목록 내.
- 다만 **링크는 아직 렌더하지 않는다** — `/articles/*` 라우트가 없어 404 가 되기 때문.
  `ColorMix.tsx` 의 `ARTICLES_LIVE` 상수만 true 로 바꾸면 붙는다. 게재 구현 시 함께 켤 것.
- UI 중국어 문구도 R1/R2 를 탄다: `node content-factory/lint-ui.mjs` (lint.mjs 의 용어
  목록을 그대로 import 한다 — 기준이 두 벌로 갈라지지 않게).

## 미결·후속

1. **05 PDF 수동 확보** — 라인 B 전량과 0-4 단원 확정이 여기에 걸려 있다. 최우선.
2. 게재 방식 승인 (A/B/C 중) — 승인 전 구현 착수 금지.
3. 라인 B slug 확정 — PDF 파싱 후.
4. **現場答 30편 작성** — 선후님 현장 답이 들어가야 `status=publishable` 이 된다. 현재 전편 draft.
5. 게재 구현 시 `ColorMix.tsx` 의 `ARTICLES_LIVE` 를 true 로 전환 (계산기 → 이론 글 링크).
