# 독스루 API 명세 (초안)

> ⚠️ **이 문서는 초안입니다.** 경로 목록(초안 기준 40건 → 계약 42건 → Google OAuth 2건 = 44건 → **인증 확장 4건을 더해 48건**)은 정본 코드와 1:1 검증돼 **그대로 씁니다.**
> 다만 필드명·상태값 일부는 결정사항 과정에서 바뀌었어요 — 아래 표만 꼭 확인해 주세요.
> 필드명·상태값의 최종 기준은 아래 표와 Swagger `/api-docs` 예요.

### 🔁 초안 대비 의도적 변경 (9건 — 그대로 따라가면 틀리는 곳)

| #   | 초안                                             | 실제 계약                                                                                                                 | 근거      |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | `field`                                          | **`category`** (5종: `NEXT_JS/MODERN_JS/API/WEB/CAREER`)                                                                  | D-11      |
| 2   | `status=OPEN\|CLOSED`                            | **`IN_PROGRESS\|CLOSED`** + 파생 `isFull`·`isClosed`                                                                      | D-13      |
| 3   | `requestedDeadline` / `requestedMaxParticipants` | **`desiredDeadline` / `maxParticipants`**                                                                                 | D-11      |
| 4   | 응답 `{user, accessToken}`                       | **`user`(평문)** — 토큰은 httpOnly 쿠키로 전달                                                                            | D-06      |
| 5   | 인증 방식 "쿠키 또는 Bearer"                     | **httpOnly 쿠키(accessToken/refreshToken) 고정**                                                                          | D-06      |
| 6   | 알림 type 11종                                   | **9종** — `FEEDBACK_DELETED` 추가 (B-9 · 아래 알림 절)                                                                    | D-17·D-99 |
| 7   | 알림 경로 3건                                    | **4건** — `GET /notifications/unread-count` 추가                                                                          | D-64      |
| 8   | 마감 후 피드백 작성 차단                         | **차단하지 않음** (수정·삭제만 차단)                                                                                      | D-18      |
| 9   | 임시저장 = LocalStorage                          | **서버 저장 (drafts 경로 3건)** — 기기 통합(어디서든 불러오기). 요구 원문과의 편차는 D-98에 기록 (2026-10-10 사용자 결정) | D-98      |

> 항목별로 여러 절에도 🎯 표시로 남겨뒀으니, 행을 읽다가 표시를 만나면 위 표를 다시 보세요.
> 사유 누락 오류는 어드민 경로는 `400 VALIDATION_ERROR`, 작업물·피드백은 `422` 로 나가요 — `REASON_REQUIRED` 라는 코드는 계약에 없어요 (통일 여부는 팀 회의 안건).

## 공통 규칙

- Base URL: `/api/v1`; JSON 요청/응답, 시간은 ISO 8601 UTC.
- 인증: 🎯 **httpOnly 쿠키(accessToken · refreshToken) 고정** — Bearer 헤더를 쓰지 않습니다. 아래 `USER`, `ADMIN`은 인증/권한 요건.
- 목록 응답은 `{ "items": [], "page": 1, "size": 20, "totalItems": 0, "totalPages": 0 }`. 무한스크롤은 `cursor` 기반으로 제공.
- 오류 형식: `{ "code": "CHALLENGE_CLOSED", "message": "마감된 챌린지입니다.", "details": {} }`.
- 공통 오류: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `422 BUSINESS_RULE_VIOLATION`.
- 상태 변경 요청은 중복 실행에 안전하도록 idempotency key 사용을 권장합니다. 사용자 입력 문구·화면 디자인 문구는 클라이언트 표시용이며 API 권한을 대신하지 않습니다.
- 실제 응답 필드 하나하나는 Swagger(`/api-docs`)에서 보는 게 정확해요 — 이 문서는 요약, 스키마가 진짜 계약입니다 (D-20).

## 인증 / 사용자

| Method | Path                    | 권한           | 설명 / 주요 입력                                                                                                                   |
| ------ | ----------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/auth/signup`          | 비회원         | 이메일·닉네임·비밀번호로 가입. `{email,nickname,password}` → 🎯 `user`(평문) + httpOnly 쿠키 발급                                  |
| `POST` | `/auth/login`           | 비회원         | `{email,password}` → 🎯 `user`(평문) + httpOnly 쿠키 발급                                                                          |
| `POST` | `/auth/logout`          | 인증 불필요(멱등) | 🎯 쿠키 만료, `204` (계약: `auth.schema.js` logout 설명 — access 가 이미 만료돼도 쿠키를 지울 수 있어야 해요)                    |
| `GET`  | `/auth/me`              | 로그인         | 🎯 현재 사용자 + role·grade·활동 집계(`stats`) + **등급 진행도(`gradeProgress`·임계값 5/5/10/10 포함)** (D-90·B-1 확정 2026-10-11) |
| `PATCH` | `/auth/me`             | 로그인         | 내 정보 수정 — `{nickname?, password?}` 중 보낸 값만 변경. 비밀번호 변경 시 `tokenVersion` 증가 + 새 쿠키 발급 |
| `DELETE` | `/auth/me`            | 로그인         | 회원 탈퇴 — 소프트 삭제(`deletedAt`)·개인정보 익명화·세션 무효화, `204` |
| `POST` | `/auth/password-reset/request` | 비회원 | `{email}` → 30분·1회용 재설정 링크 메일. 가입 여부와 무관하게 같은 안내(계정 존재 비노출) |
| `POST` | `/auth/password-reset/confirm` | 비회원 | `{token,newPassword}` → 비밀번호 교체·기존 세션 무효화, `204` |
| `GET`  | `/auth/google`          | 비회원         | 🎯 Google 로그인 시작 — state(서명·10분)·PKCE 생성 후 Google 인증 화면으로 302. 자격 증명 미설정 시 400 안내                          |
| `GET`  | `/auth/google/callback` | 비회원         | 🎯 Google 콜백 — state·PKCE 검증 → 토큰 교환 → 계정 연결/생성 → httpOnly 쿠키 설정 후 `CLIENT_BASE_URL`(+next) 로 302            |

## 챌린지 조회·신청·참여

| Method   | Path                                       | 권한              | 설명 / 주요 입력                                                                                                                                                                      |
| -------- | ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/challenges`                              | 비회원 가능       | 🎯 목록. `q,category(다중 가능 · 예: ?category=NEXT_JS&category=WEB · B-2 확정),documentType,status,sort=latest\|deadline\|popular,page,size`; status=`IN_PROGRESS\|CLOSED` (D-11·13) |
| `GET`    | `/challenges/{challengeId}`                | 비회원 가능       | 챌린지 설명, 원문 URL, 마감·참여 인원, 상태, 로그인 시 내 참여/작업 상태                                                                                                              |
| `GET`    | `/challenges/{challengeId}/participants`   | 비회원 가능       | 참여 작업 목록/순위. `sort=likes                                                                                                                                                      · submittedAt&page&size`; 순위·닉네임·하트 수·제출시각 포함 · ⭐ 동률 전원 포함 (B-7 확정) |
| `POST`   | `/challenges/{challengeId}/participation`  | USER              | 도전하기 즉시 참여 생성. 본문 없음. 닫힘·마감·정원·중복이면 `409`                                                                                                                     |
| `DELETE` | `/challenges/{challengeId}/participation`  | USER 본인         | 챌린지 포기. soft abandon 처리, `204`                                                                                                                                                 |
| `GET`    | `/challenges/{challengeId}/works/me`       | 참여 USER         | 내 번역 작업 불러오기. 아직 서버 작업물이 없으면 `200` + `work: null`을 반환합니다(제출 전 초안은 별도 drafts 경로 — D-98).                                                           |
| `PUT`    | `/challenges/{challengeId}/works/me`       | 참여 USER         | 작업 제출/수정. `{content}`; 마감 전만 허용, 최초 제출은 `201`, 갱신 `200`                                                                                                            |
| `GET`    | `/challenges/{challengeId}/works/{workId}` | 비회원 가능       | 번역 작업물 상세 및 좋아요 수/현재 사용자의 하트 여부                                                                                                                                 |
| `PATCH`  | `/works/{workId}`                          | 작성자 또는 ADMIN | 작업물 수정. `{content}`; 챌린지 마감 후 `409 CHALLENGE_CLOSED`                                                                                                                       |
| `DELETE` | `/works/{workId}`                          | 작성자 또는 ADMIN | 작성자 삭제는 사유 없음, 어드민 삭제는 `{reason}` 필수. 완료 챌린지는 불가                                                                                                            |
| `PUT`    | `/works/{workId}/like`                     | USER              | 하트 추가. 중복 요청은 기존 상태 반환                                                                                                                                                 |
| `DELETE` | `/works/{workId}/like`                     | USER              | 하트 취소, `204`                                                                                                                                                                      |
| `PUT`    | `/challenges/{challengeId}/drafts/me`      | 참여 USER         | 🎯 **서버 임시저장 (D-98)** — 임시초안 저장. 참여당 1개, 재호출 시 덮어쓰기(200)/신규 201. 마감 후 저장 시도는 409                                                                    |
| `GET`    | `/challenges/{challengeId}/drafts/me`      | 참여 USER         | 🎯 내 임시저장 조회 — 없으면 `{draft: null}` (에디터 첫 진입 모달용, 요구 2.4)                                                                                                        |
| `DELETE` | `/challenges/{challengeId}/drafts/me`      | 참여 USER         | 🎯 임시저장 버리기 — 이미 없어도 `204`(멱등)                                                                                                                                          |
| `GET`    | `/works/{workId}/feedbacks`                | 비회원 가능       | 피드백 페이지 조회. `cursor,limit`                                                                                                                                                    |
| `POST`   | `/works/{workId}/feedbacks`                | USER              | 피드백 작성. `{content}`. 요구사항은 완료 챌린지에서 피드백의 수정·삭제를 금지하지만 새 피드백 작성 시점을 금지하지 않으므로, 여기에 마감 차단 규칙을 임의로 추가하지 않습니다.       |
| `PATCH`  | `/feedbacks/{feedbackId}`                  | 작성자 또는 ADMIN | 피드백 수정. `{content,reason?}`; 어드민 변경은 사유 필수, 마감 후 불가                                                                                                               |
| `DELETE` | `/feedbacks/{feedbackId}`                  | 작성자 또는 ADMIN | 피드백 삭제. 어드민 요청은 `{reason}` 필수, 마감 후 불가                                                                                                                              |

> 📌 **피드백 개수** — 한 사용자가 같은 작업물에 **여러 피드백**을 작성할 수 있어요. `Feedback`에는 `@@unique([workId, userId])`가 없고, **하트(`WorkLike`)만** `@@unique([workId, userId])`로 1개예요.

### 대표 응답 예시: 챌린지 목록

```json
{
  "items": [
    {
      "id": 42,
      "title": "Routing Fundamentals",
      "category": "NEXT_JS",
      "documentType": "OFFICIAL",
      "deadline": "2026-10-20T14:59:59Z",
      "status": "IN_PROGRESS",
      "isFull": false,
      "isClosed": false,
      "participantCount": 3,
      "maxParticipants": 10
      // createdBy, createdAt, sourceUrl, content 등도 함께 옵니다
      // 정확한 필드는 /api-docs 의 Challenge 스키마를 보세요
    }
  ],
  "page": 1,
  "size": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

## 신규 챌린지 제안 및 관리자 관리

| Method   | Path                                                    | 권한   | 설명 / 주요 입력                                                                                               |
| -------- | ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/challenge-applications`                               | USER   | 제안 생성. 🎯 `{title,category,documentType,sourceUrl,content,desiredDeadline,maxParticipants}` → `201` (D-11) |
| `GET`    | `/challenge-applications/me`                            | USER   | 내 제안 목록. `q,status,sort,page,size`                                                                        |
| `GET`    | `/challenge-applications/me/{applicationId}`            | 신청자 | 내 신청 상세 및 결정 사유; 승인 건은 연결된 챌린지 id 포함                                                     |
| `DELETE` | `/challenge-applications/me/{applicationId}`            | 신청자 | PENDING만 취소, 상태 `CANCELLED`; 관리자 대기 목록에서 제외                                                    |
| `GET`    | `/admin/challenge-applications`                         | ADMIN  | 전체 제안 목록. `q,status,sort,page,size`; 기본 정렬 PENDING 우선                                              |
| `GET`    | `/admin/challenge-applications/{applicationId}`         | ADMIN  | 제안·신청자 상세                                                                                               |
| `POST`   | `/admin/challenge-applications/{applicationId}/approve` | ADMIN  | 승인 및 챌린지 생성. `{deadline?,maxParticipants?}` 선택 수정값; atomic                                        |
| `POST`   | `/admin/challenge-applications/{applicationId}/reject`  | ADMIN  | 거절. `{reason}` 필수                                                                                          |
| `GET`    | `/admin/challenges`                                     | ADMIN  | 관리자 챌린지 목록/필터                                                                                        |
| `POST`   | `/admin/challenges`                                     | ADMIN  | 직접 챌린지 생성. 필드 동일                                                                                    |
| `PATCH`  | `/admin/challenges/{challengeId}`                       | ADMIN  | 진행 중인 챌린지 수정                                                                                          |
| `DELETE` | `/admin/challenges/{challengeId}`                       | ADMIN  | `{reason}` 필수; soft delete 및 **참가자 알림** 생성 (포기자 제외 · D-63)                                      |

## 나의 챌린지

| Method | Path                           | 권한 | 설명 / 주요 입력                                                                           |
| ------ | ------------------------------ | ---- | ------------------------------------------------------------------------------------------ |
| `GET`  | `/me/challenges/participating` | USER | 진행 중인 내 챌린지. `q,category,documentType,cursor,limit` (🎯 field→category)            |
| `GET`  | `/me/challenges/completed`     | USER | 마감된 내 챌린지와 제출물 요약. `q,category,documentType,cursor,limit` (🎯 field→category) |
| `GET`  | `/me/challenges/applications`  | USER | `/challenge-applications/me` 별칭 대신 탭 구성에 필요한 신청 목록 제공                     |

## 알림

| Method   | Path                                   | 권한      | 설명 / 주요 입력                                                                                  |
| -------- | -------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `GET`    | `/notifications`                       | USER      | 새로고침 시 조회. `unreadOnly,page,size`; 최신순                                                  |
| `GET`    | `/notifications/unread-count`          | USER      | 🎯 안 읽은 알림 수 (GNB 배지). API-명세 초안에 없던 추가 경로 (D-64)                              |
| `PATCH`  | `/notifications/{notificationId}/read` | 소유 USER | 단건 읽음 처리, `204`                                                                             |
| `POST`   | `/notifications/read-all`              | USER      | 전체 읽음 처리, `204`                                                                             |

> 💡 **확장(팀 선택)** — 참조판(`완성본 자체화`)은 여기에 `DELETE /notifications/{notificationId}` (소유 USER · 멱등 `204`) 1건을 더 구현했어요 (D-100). 계약 정본 48건에는 **미포함** — 팀이 알림 삭제 버튼을 원하면 D-100 근거로 추가하는 선택 경로예요.

🎯 알림 `type` 실제 값 (9종 — B-9 확정 2026-10-11): `CHALLENGE_APPROVED`, `CHALLENGE_REJECTED`, `CHALLENGE_UPDATED`, `CHALLENGE_DELETED`, `WORK_ADDED`, `FEEDBACK_ADDED`, `FEEDBACK_UPDATED`, `FEEDBACK_DELETED`, `CHALLENGE_DEADLINE`.

알림은 이벤트 발생 시점에 수신자를 정해 생성하고, 사유(`reason`)를 본문에 보존해요. 시각은 알림 생성 시각(`createdAt`) 기준이며, 이벤트 시각을 담는 별도 필드는 계약에 없어요. 단순 새로고침 fetch 방식이므로 WebSocket은 포함하지 않습니다.

> 🎯 초안의 11종과 이름이 많이 달라요 — 스키마(`notifications.schema.js`)의 9종이 진짜예요 (D-17·D-99 B-9 — 피드백 삭제 알림을 요구 3.2 원문대로 분리).
> 마감 알림(`CHALLENGE_DEADLINE`)은 등록하고 내지 않고, 마감 24시간 전 조회 시점에 지연 생성합니다 (D-17).

## 주요 상태 코드 및 검증

| 상황                                                | HTTP / code                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 정원 도달, 중복 참여, 이미 처리된 신청              | `409 CONFLICT`                                                                                                                       |
| 마감된 챌린지 작업 제출·작업/피드백 수정 삭제       | `409 CHALLENGE_CLOSED`                                                                                                               |
| deadline이 현재 시각 이하, maxParticipants가 1 미만 | `400 VALIDATION_ERROR`                                                                                                               |
| 다른 사용자 리소스 접근                             | 정보 노출 정책에 따라 `404` 또는 `403`; 일관되게 적용                                                                                |
| 관리자 사유 누락                                    | 어드민 경로는 `400 VALIDATION_ERROR`, 작업물·피드백 경로는 `422` — `REASON_REQUIRED` 코드는 계약에 없어요 (통일 여부는 팀 회의 안건) |
| 로그인 후 랜딩 페이지 요청                          | 프론트 라우팅에서 앱으로 이동; API는 인증 상태 조회 제공                                                                             |

## 구현 메모

- 목록 API는 모든 검색·필터를 서버에서 적용하고, 공개 목록의 상태는 deadline 기준으로 계산합니다.
- 참여 신청 직후 participant를 생성하므로 참가 인원 수는 참여 버튼 성공 응답부터 증가합니다.
- 챌린지 상세의 최다 추천 작업은 `status=SUBMITTED`인 작업만 대상으로 합니다.
- Layered Architecture 권장: `Router → Controller → Service → Repository`; 인증·권한, 상태 전이, 알림 발행은 Service에서 트랜잭션으로 처리합니다.
- 랜딩 최적화/Lighthouse 점수 비교는 정적 페이지 빌드 및 배포 품질 과제로, 도메인 API 명세 범위에는 포함하지 않습니다.
