# DB Schema — 台灣美髮社群平台 (beautyjob-tw)

- 기준 파일: `drizzle/schema.ts` (Drizzle ORM, MySQL)
- v4 커뮤니티 런칭판 기준: `job_applications` 테이블 삭제, `reports` 테이블 신설 (마이그레이션 `0004`, `0005`)
- 총 **9개 테이블**. 관리자 CSV export는 아래 전 테이블을 대상으로 한다 (`users`는 `passwordHash` 제외).

## users — 회원

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | int | PK, AI | |
| openId | varchar(64) | NOT NULL, UNIQUE | 로그인 식별자 (email_xxx / LINE / Manus OAuth) |
| name | text | | 이름/닉네임 |
| email | varchar(320) | | |
| loginMethod | varchar(64) | | email / line / manus |
| role | enum(user, admin) | NOT NULL, default user | |
| userType | enum(salon_owner, job_seeker, unset) | NOT NULL, default unset | |
| phone | varchar(30) | | |
| city | varchar(50) | | 거주/사업 지역 |
| avatarUrl | text | | |
| bio | text | | |
| passwordHash | text | | bcrypt 해시 (CSV export 제외) |
| createdAt / updatedAt / lastSignedIn | timestamp | NOT NULL | |

## job_posts — 채용공고 (v4: 기능 잠금, 테이블은 Phase 2 대비 유지)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| authorId | int | NOT NULL → users.id |
| title | varchar(200) | NOT NULL |
| salonName | varchar(100) | NOT NULL |
| jobType | enum(designer, intern, staff, colorist, barber, manager, other) | NOT NULL |
| workType | enum(full_time, part_time, contract) | NOT NULL |
| city / district | varchar(50) | city NOT NULL |
| address | text | |
| salaryType | enum(monthly, hourly, commission) | NOT NULL |
| salaryMin / salaryMax | decimal(10,0) | NT$ |
| experienceRequired | enum(none, 1year, 2year, 3year, 5year, 10year) | NOT NULL, default none |
| description | text | NOT NULL |
| benefits / contactInfo | text | |
| isActive | boolean | NOT NULL, default true |
| viewCount | int | NOT NULL, default 0 |
| createdAt / updatedAt | timestamp | NOT NULL |

인덱스: `idx_job_city`, `idx_job_type`, `idx_job_active`

## resumes — 이력서 (v4: 기능 잠금, 테이블 유지)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| userId | int | NOT NULL, UNIQUE → users.id |
| fullName | varchar(100) | NOT NULL |
| jobType | enum(designer, …, other) | NOT NULL |
| experienceYears | int | NOT NULL, default 0 |
| currentCity | varchar(50) | NOT NULL |
| desiredCity | varchar(50) | |
| desiredSalaryMin / desiredSalaryMax | decimal(10,0) | |
| desiredWorkType | enum(full_time, part_time, contract, any) | default any |
| skills | text | JSON array |
| introduction | text | NOT NULL |
| portfolioUrl | text | |
| isPublic | boolean | NOT NULL, default true |
| createdAt / updatedAt | timestamp | NOT NULL |

인덱스: `idx_resume_city`, `idx_resume_jobtype`

## community_posts — 커뮤니티 게시글

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| authorId | int | NOT NULL → users.id |
| category | enum(general, technique, education, news, qa) | NOT NULL |
| title | varchar(200) | NOT NULL |
| content | text | NOT NULL |
| viewCount / commentCount | int | NOT NULL, default 0 |
| isPinned | boolean | NOT NULL, default false |
| createdAt / updatedAt | timestamp | NOT NULL |

인덱스: `idx_community_category`

## comments — 공통 댓글 (커뮤니티·頂讓·二手)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| authorId | int | NOT NULL → users.id |
| postType | enum(community, salon_transfer, used_item) | NOT NULL |
| postId | int | NOT NULL |
| content | text | NOT NULL |
| createdAt / updatedAt | timestamp | NOT NULL |

인덱스: `idx_comment_post` (postType, postId)

## salon_transfers — 店面頂讓 (매장 양도)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| authorId | int | NOT NULL → users.id |
| title | varchar(200) | NOT NULL |
| salonName | varchar(100) | |
| city / district | varchar(50) | city NOT NULL |
| address | text | |
| sizeM2 | decimal(8,2) | 坪數 |
| keyMoney / deposit | decimal(12,0) | 頂讓金 / 押金 NT$ |
| monthlyRent | decimal(10,0) | 月租 NT$ |
| description | text | NOT NULL |
| contactInfo | text | |
| imageUrls | text | JSON array |
| isActive | boolean | NOT NULL, default true |
| viewCount / commentCount | int | NOT NULL, default 0 |
| createdAt / updatedAt | timestamp | NOT NULL |

인덱스: `idx_transfer_city`

## used_items — 二手器材 (중고거래)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| authorId | int | NOT NULL → users.id |
| title | varchar(200) | NOT NULL |
| category | enum(chair, dryer, washer, scissors, chemical, furniture, other) | NOT NULL |
| condition | enum(new, like_new, good, fair) | NOT NULL |
| price | decimal(10,0) | NOT NULL, NT$ |
| city | varchar(50) | NOT NULL |
| description | text | NOT NULL |
| imageUrls | text | JSON array |
| isSold | boolean | NOT NULL, default false |
| viewCount / commentCount | int | NOT NULL, default 0 |
| createdAt / updatedAt | timestamp | NOT NULL |

인덱스: `idx_used_category`, `idx_used_city`

## favorites — 즐겨찾기

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | int | PK, AI |
| userId | int | NOT NULL → users.id |
| targetType | enum(job_post, resume, salon_transfer, used_item) | NOT NULL |
| targetId | int | NOT NULL |
| createdAt | timestamp | NOT NULL |

인덱스: `idx_fav_user` (userId, targetType)

## reports — 檢舉 신고 (v4 신설)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | int | PK, AI | |
| reporterId | int | NOT NULL → users.id | 신고자 |
| targetType | enum(community, salon_transfer, used_item) | NOT NULL | 신고 대상 게시판 |
| targetId | int | NOT NULL | 대상 게시글 id |
| reason | enum(spam, fraud, offensive, illegal, other) | NOT NULL | 신고 사유 |
| detail | text | | 보충 설명 (≤1000자) |
| status | enum(pending, resolved, dismissed) | NOT NULL, default pending | 관리자 처리 상태 |
| createdAt / updatedAt | timestamp | NOT NULL | |

인덱스: `idx_report_status`, `idx_report_target` (targetType, targetId)

---

## DB 접근 계층

- 모든 DB 접근은 `server/db.ts` 단일 모듈을 통한다. 라우터(`server/routers.ts`)는 `import * as db from "./db"`로만 접근하며, drizzle을 직접 호출하는 파일은 `server/db.ts`뿐이다.
- 연결: `getDb()` — `DATABASE_URL` 없으면 null 반환 (기능은 빈 결과로 degrade).
- CSV export 대상 테이블 레지스트리: `server/db.ts`의 `EXPORT_TABLES` (테이블 추가 시 여기에 등록).
