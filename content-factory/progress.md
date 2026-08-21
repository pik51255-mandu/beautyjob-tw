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
| 11 | 燙髮三步驟：還原→重組→氧化的完整原理 | `perm-three-steps` | 中級 | 대기 |
| 12 | 軟化判斷完全指南：測試軟化的正確方法 | `softening-test-guide` | 中級 | 대기 |
| 13 | 還原劑比較：TGA、半胱胺酸、半胱胺鹽酸鹽 | `reducing-agents-compared` | 中級 | 대기 |
| 14 | 冷燙、溫塑燙、熱塑燙：原理層面的完整差別 | `perm-types-compared` | 中級 | 대기 |
| 15 | 離子燙與縮毛矯正：藥水、溫度、設計的差異 | `straightening-compared` | 中級 | 대기 |
| 16 | 染髮色彩學：色相環與補色中和 | `color-theory-basics` | 中級 | 대기 |
| 17 | 底色理論：紅→橘→黃的祕密 | `undertone-theory` | 中級 | 대기 |
| 18 | 雙氧乳設計邏輯：3%、6%、9%、12%怎麼選 | `developer-volume-guide` | 中級 | 대기 |
| 19 | 漂髮科學：漂粉+雙氧的化學與過硫酸鹽 | `bleaching-science` | 中級 | 대기 |
| 20 | 蓋白髮的科學：白髮為什麼特別難染 | `grey-coverage-science` | 中級 | 대기 |
| 21 | 矯色與紫色洗髮精：原理與極限 | `toning-purple-shampoo` | 中級 | 대기 |
| 22 | 熱損傷科學：幾度開始不可逆？ | `heat-damage-science` | 中級 | 대기 |
| 23 | 結構式護髮的化學：Olaplex、K18差在哪 | `bond-builder-chemistry` | 高級 | 대기 |
| 24 | 卡色與漂髮發熱的隱形兇手：金屬離子與硬水 | `metallic-salts-hard-water` | 高級 | 대기 |
| 25 | 酸熱離子護的真相：乙二醛酸原理與安全爭議 | `glyoxylic-acid-truth` | 高級 | 대기 |
| 26 | 設計師的職業安全：PPD、過硫酸鹽與你的手和肺 | `stylist-occupational-safety` | 高級 | 대기 |
| 27 | 高溫潮濕與髮型：濕氣、氫鍵、抗毛躁的科學 | `humidity-frizz-science` | 高級 | 대기 |
| 28 | 為什麼台灣夏天褪色特別快：UV、汗水與護色設計 | `uv-color-fading` | 高級 | 대기 |
| 29 | 受損髮三層次診斷：表面、內部、鍵結的護理設計 | `damaged-hair-three-layers` | 高級 | 대기 |
| 30 | 設計師不能說的話：化粧品廣告法規完全指南 | `cosmetic-ad-regulations` | 高級 | 대기 |

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
| B-1 | 燙髮篇 제1편(軟化·試捲) | — | **차단** (PDF 미확보) | — | — | — |

---

## 알려진 이슈 (해소됨)

- **lint.mjs 연산자 우선순위 버그 (2026-08-21 수정)**: `new Set("A" + "B".split("").filter(...))`
  에서 `.split()` 이 뒤 리터럴에만 걸려 배열이 문자열화되고, join 구분자인 ASCII 콤마가
  간체자 집합에 섞였다. 그 결과 본문에 반각 콤마만 있어도 "간체자 1종" 오탐이 났다.
  배치 ① 집필 에이전트 4명이 독립적으로 이 증상을 보고했고, 일부는 본문에서 콤마·영문
  화학명을 빼는 방식으로 회피했다. 두 리터럴을 괄호로 묶어 수정했고, 회피로 빠졌던
  `Toluene-2,5-diamine` 표기를 #10 에 복원했다.

## 미결·후속

1. **05 PDF 수동 확보** — 라인 B 전량과 0-4 단원 확정이 여기에 걸려 있다. 최우선.
2. 게재 방식 승인 (A/B/C 중) — 승인 전 구현 착수 금지.
3. 라인 B slug 확정 — PDF 파싱 후.
