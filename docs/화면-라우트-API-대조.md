# 화면 ↔ 라우트 ↔ API 대조표 (요구사항 추적표)

> **기본 정보 (1줄)** — 요구사항 2.1~3.4가 **화면(라우트)과 API 경로로 빠짐없이 이어지는지** 한 표로 대조한 추적표.
> 목적: 팀원이 "이 요구는 어느 화면·어느 API로 구현하는가"를 **한눈에** 확인하고, **미커버·과잉·편차**를 바로 찾기 위함.

- **정본 순서**: `docs/BE-요구사항.md`(무엇을) → `API-명세.md`(경로) → Swagger `/api-docs`(필드)
- **대조 시점**: 2026-10-23 · **35 paths / 48 ops** = OpenAPI 1:1 (계약 테스트로 검증)
- **FE 화면 중심 표**: `docthru-frontend/docs/화면-라우트-API-대조.md`

## 읽는 법

| 표시 | 뜻 |
| --- | --- |
| ✅ | 요구가 화면·API로 정상 연결됨 |
| 🕒 | 연결은 됐고 **남은 외부 작업**(자격증명 등)이 있음 |
| ⚠️ | **기록된 편차** — 아래 "기록된 편차" 절 참고 (팀원 의견 환영) |

---

## 2. 기능 요구사항

### 2.1 랜딩 페이지 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 비로그인 = 랜딩, 로그인 = 랜딩 숨김 | `/` (FE) | `GET /auth/me` (로그인 여부 판단) |

### 2.2 유저 인증 & 등급 시스템 🕒 (③ 개인 담당)

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 회원가입 | `/signup` | `POST /auth/signup` |
| 로그인 (권한별 접근) | `/login` | `POST /auth/login` |
| 로그아웃 | GNB · `/mypage` | `POST /auth/logout` |
| 내 정보 수정 | `/mypage` | `PATCH /auth/me` (닉네임·비밀번호) |
| 회원 탈퇴 | `/mypage` (확인 모달) | `DELETE /auth/me` (`{password, withdrawalConsent: true}` 필수 · 소프트 삭제·익명화) |
| 비밀번호 재설정 요청 | `/password-reset` | `POST /auth/password-reset/request` |
| 비밀번호 재설정 확정 | `/password-reset/confirm?token=` | `POST /auth/password-reset/confirm` |
| 등급(일반/전문가) | `/mypage` | `GET /auth/me` (`grade` · `gradeProgress` 임계값 5/5/10/10) |

> ✅ 2026-10-23 기준 signup·login·logout·updateMe·deleteMe·password reset 모두 ③이 구현했고, 계약 48 ops에 포함됩니다.

### 2.3 번역 챌린지 조회 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 목록(제목검색·필터·페이지네이션) | `/challenges` | `GET /challenges` |
| 상세 + **원문 보기**(새 창) | `/challenges/[challengeId]` | `GET /challenges/{challengeId}` |
| 마감 = **최다 추천 작업물** | `/challenges/[challengeId]` | `GET /challenges/{challengeId}/participants` (작업물 likeCount) |
| 참여 현황(순위·닉네임·하트·제출시간·페이지네이션) | `/challenges/[challengeId]` | `GET /challenges/{challengeId}/participants` |

### 2.4 번역 챌린지 참여 ⚠️

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 도전하기/포기 (마감 전·정원 여유) | `/challenges/[challengeId]` · `/challenges/[challengeId]/edit` | `POST`·`DELETE /challenges/{challengeId}/participation` |
| 에디터 + 임시저장 | `/challenges/[challengeId]/edit` | `PUT`·`GET`·`DELETE /challenges/{challengeId}/drafts/me` |
| 제출 | `/challenges/[challengeId]/edit` | `GET`·`PUT /challenges/{challengeId}/works/me` |
| 임시저장 불러오기 모달 | `/challenges/[challengeId]/edit` | `GET …/drafts/me` (**서버 저장** — D-98) |

> ⚠️ **기록된 편차 1건** — 아래 절 참고.

### 2.5 번역 챌린지 신청 관리 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 신규 신청(일반 유저) | `/my-applications/new` | `POST /challenge-applications` |
| 신청 목록(어드민, 검색·필터·페이지네이션) | `/admin/challenges` | `GET /admin/challenge-applications` |
| 승인·거절(원문 확인 후) | `/admin/challenges/[applicationId]` | `GET /admin/challenge-applications/{applicationId}` · `POST /admin/challenge-applications/{applicationId}/approve` · `POST /admin/challenge-applications/{applicationId}/reject` |

### 2.6 챌린지 및 콘텐츠 관리 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 챌린지 수정/삭제 (어드민) | `/admin/challenges/list` · `/admin/challenges/list/[challengeId]/edit` | `GET`·`POST /admin/challenges` · `PATCH`·`DELETE /admin/challenges/{challengeId}` |
| 작업물 수정/삭제 (어드민·작성자, 완료 챌린지 불가) | `/challenges/[challengeId]/works/[workId]` · `…/edit` | `PATCH`·`DELETE /works/{workId}` |
| 피드백 수정/삭제 (어드민·작성자, 완료 챌린지 불가) | `/challenges/[challengeId]/works/[workId]` | `PATCH`·`DELETE /feedbacks/{feedbackId}` |

### 2.7 작업물 관리 및 피드백 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 작업물 상세 + 피드백 조회·작성 | `/challenges/[challengeId]/works/[workId]` | `GET /challenges/{challengeId}/works/{workId}` · `GET`·`POST /works/{workId}/feedbacks` |
| 피드백 '더 보기'(페이지네이션) | `/challenges/[challengeId]/works/[workId]` | `GET /works/{workId}/feedbacks` (**커서** 페이징) |
| 하트(좋아요) | `/challenges/[challengeId]/works/[workId]` | `PUT`·`DELETE /works/{workId}/like` (백엔드 토글) |

### 2.8 나의 챌린지 관리 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 참여 중 (검색·필터·**무한스크롤**) | `/my-challenges/participating` | `GET /me/challenges/participating` (**커서**) |
| 완료한 챌린지 | `/my-challenges/completed` | `GET /me/challenges/completed` (**커서**) |
| 내가 신청한 챌린지(상태·취소·사유) | `/my-applications` · `/my-applications/[applicationId]` | `GET /challenge-applications/me` · `GET /me/challenges/applications`(별칭) · `GET`·`DELETE /challenge-applications/me/{applicationId}` |

---

## 3. 심화 요구사항

### 3.1 OAuth 인증 🕒

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 구글 회원가입·로그인 | `/login` (구글 버튼) | `GET /auth/google` · `GET /auth/google/callback` |

> 🕒 남은 일: **③ 개인 작업으로 BE OAuth 구현**(`google-controller.js`·`google-auth-service.js` 참고 뼈대 → 직접 채움) + 구글 콘솔 CLIENT_ID/SECRET 발급 + FE 구글 버튼 연결. (경로·계약은 이미 확정)

### 3.2 알림 안내 ✅

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| 변경·상태·새 작업물·새 피드백·마감·어드민 처리 알림 | GNB 드롭다운 · `/notifications` | `GET /notifications` (타입별 문구·날짜 포함) |
| 알림 읽음 처리 | GNB 드롭다운 · `/notifications` | `PATCH /notifications/{notificationId}/read` · `POST /notifications/read-all` |
| 미읽음 배지 | GNB | `GET /notifications/unread-count` |

### 3.3 랜딩 페이지 최적화 ✅ (프론트 전용)

| 요구 | 화면(라우트) | API |
| --- | --- | --- |
| Lighthouse 최적화 · 메타/폰트/이미지 최적화 | `/` | (해당 없음 — 프론트 작업) |

### 3.4 코드 레벨 아키텍처 적용 ✅ (코드 레벨)

| 요구 | 적용 위치 |
| --- | --- |
| Layered Architecture · Router→Controller→Service→Repository | `src/controllers` → `src/services` → `src/repositories` (+ `src/common/di`) |

---

## 4. 대조 결론

| 점검 | 결과 |
| --- | --- |
| **미커버**(요구에 있는데 화면·API 없음) | **0건** — 요구 12개 절 전부 연결됨 |
| **과잉**(API 있는데 요구에 없음) | **0건** — 48 ops가 전부 위 요구에 귀속 |
| **기록된 편차** | **1건** (2.4 임시저장 — 아래) |

---

## 5. 기록된 편차 (팀원 의견 환영)

| # | 요구 원문 | 실제 계약 | 근거 · 처리 |
| --- | --- | --- | --- |
| 1 | 2.4 **"모달에서 목록(제목/제목 없음) 선택"** → *여러* 초안에서 고르는 뉘앙스 | **참여 1개당 초안 1개(단일)** — 서버 `drafts` (D-98) | 요구는 LocalStorage(여러 개) 전제였으나, **서버 저장으로 통일**하며 참여당 1개로 확정 (D-98 · 2026-10-10). 다중 초안이 필요하면 팀 회의 안건으로 — **의견 환영** |

---

## 6. 갱신 규칙

- 요구사항·경로·화면이 바뀌면 이 표를 **같이 갱신**한다 (계약 변경 시 `API-명세.md` 와 한 묶음으로).
- 계약 경로 검증은 `pnpm test:contract`(문서 48 ops ↔ 코드)가 자동으로 잡는다.
