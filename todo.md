# 台灣美髮求職平台 - Project TODO

## Phase 1: DB Schema
- [x] users 테이블 확장 (role: salon_owner / job_seeker, profile fields)
- [x] job_posts 테이블 (채용공고: 직종, 급여NT$, 지역, 근무형태, 경력)
- [x] resumes 테이블 (이력서: 직종, 경력, 희망급여, 자기소개)
- [x] community_posts 테이블 (커뮤니티: 카테고리, 제목, 내용)
- [x] comments 테이블 (댓글: post_type, post_id, 내용)
- [x] salon_transfers 테이블 (양도: 매장크기, 권리금, 보증금, 월세)
- [x] used_items 테이블 (중고거래: 품목, 가격NT$, 상태, 이미지)
- [x] favorites 테이블 (즐겨찾기: user_id, target_type, target_id)

## Phase 2: Backend tRPC Routers
- [x] users router (프로필 조회/수정, 역할 설정)
- [x] jobPosts router (CRUD, 필터 검색)
- [x] resumes router (CRUD, 인재 검색)
- [x] community router (CRUD, 댓글)
- [x] salonTransfers router (CRUD)
- [x] usedItems router (CRUD)
- [x] favorites router (추가/삭제/목록)
- [x] comments router (공통 댓글 시스템)

## Phase 3: Layout & Landing Page
- [x] 공통 네비게이션 바 (반응형, 모바일 햄버거 메뉴)
- [x] 랜딩 페이지 히어로 섹션
- [x] 기능 소개 섹션
- [x] 푸터
- [x] 전체 테마 (번체 중국어, 대만 미용 브랜드 컬러)

## Phase 4: Auth & Role Pages
- [x] 역할 선택 온보딩 페이지 (살롱 원장 / 구직자)
- [x] 프로필 완성 페이지

## Phase 5: Job Posts
- [x] 채용공고 목록 페이지 (카드형, 필터)
- [x] 채용공고 상세 페이지
- [x] 채용공고 등록/수정 폼 (살롱 원장 전용)

## Phase 6: Resumes
- [x] 이력서 등록/수정 페이지 (구직자 전용)
- [x] 인재 검색 목록 페이지 (살롱 원장 전용)
- [x] 이력서 상세 페이지

## Phase 7: Community & Boards
- [x] 커뮤니티 게시판 목록/상세/작성 페이지
- [x] 미용실 양도 게시판 목록/상세/작성 페이지
- [x] 중고거래 게시판 목록/상세/작성 페이지
- [x] 댓글 컴포넌트 (공통)

## Phase 8: Favorites & MyPage
- [x] 즐겨찾기 추가/삭제 기능
- [x] 마이페이지 (내 공고, 내 이력서, 즐겨찾기)

## Phase 9: Tests & Checkpoint
- [x] vitest 단위 테스트 작성 (15/15 통과)
- [x] 최종 체크포인트 저장
