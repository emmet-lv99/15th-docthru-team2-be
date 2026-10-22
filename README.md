# backend — 독스루 서버 (BE 단독 repo)

> **기본 정보 (1줄)** — 독스루 백엔드 API 단독 repo · Express 5 + Prisma 8(adapter-pg) · 이 폴더(`docthru-backend/`)가 **repo 루트**예요.
> 읽는 순서: 이 문서 → 자기 도메인 컨트롤러 파일(상단 주석 = 그 도메인의 지침서).

## 1. 이 repo는 무엇인가요

- 독스루의 **API 서버** 만 담은 repo예요. 화면은 별도 repo(`frontend`)에 있어요.
- 도메인 8종(auth · challenges · works · feedbacks · applications · me · notifications · admin)이 **예약**되어 있어,
  새 도메인을 만들 필요 없이 자기 도메인을 채우면 됩니다.
- 응답 필드·경로는 **계약 스키마**가 정본이에요. 구현이 스키마와 다르면 개발 환경에서
  `500 RESPONSE_CONTRACT_MISMATCH` 로 바로 드러납니다.

### 1-1. 기술 스택

| 영역       | 기술                                                              | 버전·메모                                              |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| Runtime    | Node.js · pnpm                                                    | `>=24` · `12.5.1`                                      |
| Framework  | Express                                                           | `5.2`                                                  |
| Language   | JavaScript                                                        | ESM                                                    |
| DB         | PostgreSQL · Supabase                                             | 로컬 개발 / 배포 DB                                    |
| ORM        | Prisma 8                                                          | `@prisma/orm-postgres 8.0.0-rc.18` · CLI `8.0.0-rc.23` |
| Validation | Zod                                                               | `4.2`                                                  |
| API Docs   | zod-openapi · Swagger UI                                          | OpenAPI 3.1                                            |
| Auth       | JWT · bcrypt · httpOnly Cookie                                    | `jsonwebtoken 9` · `bcrypt 6`                          |
| DI         | Awilix                                                            | `13`                                                   |
| Quality    | ESLint · Prettier · node:test                                     | GitHub Actions CI                                      |
| Infra      | Docker · GitHub Actions · GCP Cloud Run · Artifact Registry · WIF | 현재 수동 배포 · 협업 시작 후 자동배포 전환 예정       |

> 버전은 `package.json` 기준이에요. 배포는 현재 수동 실행만 열려 있고, 협업 시작 후 자동배포로 전환할 예정입니다. `WIF`는 Workload Identity Federation(키 없는 GCP 인증)이에요.

### 1-2. 현재 구현 상태

| 영역                  | 상태                                                               | 담당    |
| --------------------- | ------------------------------------------------------------------ | ------- |
| API 계약              | **44 ops** · OpenAPI **33 paths / 44 ops**                         | 🔷 공용 |
| ERD                   | **10 tables / 8 ENUM**                                             | 🔷 공용 |
| Auth BE               | `/auth/me` 제공 · signup·login·logout은 **③ 개인 담당(404)**       | ③       |
| 테스트                | unit **24/24** · contract **8 pass / 43 fail**(미구현 도메인 정상) | 🔷 공용 |
| 계정 수정(`updateMe`) | 요구사항·시안에 없어 **채택하지 않음**                             | —       |

### 1-3. 문서 정본 순서와 동기화

```text
요구사항 → API-명세 → ERD → Swagger/OpenAPI → 코드·테스트 → README·주석
```

- 계약·경로를 바꾸면 **API-명세 · ERD · contract/OpenAPI · controller/route · test · README/주석**을 한 묶음으로 갱신해요.
- `src/docs/schemas.js`는 없어요. OpenAPI 조립은 **`src/docs/openapi.js`의 inline `*Paths` 병합**을 사용합니다.
- 경로 표기는 단독 repo 기준 **`src/...`**예요.

## 2. 폴더 구조 지도 — 담당자까지 한눈에

> **범례** — `①~⑤` 담당 팀원 번호 · `🔷 공용` 공용(보일러플레이트 제공 · 수정은 담당자에게 제안)

```text
docthru-backend/                                   # BE 단독 repo — 이 폴더가 repo 루트                        🔷 공용
├── env/                                           # 환경변수 — 복사해서 .env.development                      🔷 공용
├── prisma.config.ts                               # Prisma 8 설정 (계약 규칙·마이그레이션)                    🔷 공용
├── migrations/                                    # 마이그레이션 이력 (건드리지 않아요)                       🔷 공용
├── seed/                                          # 시드 JSON 7종 (users·challenges·works…)                   🔷 공용
├── scripts/                                       # seed.js · seed-safety.js · 스파이크 스크립트              🔷 공용
├── src/                                           # 서버 코드 전체                                            🔷 공용
│   ├── main.js · app.js                           # 시작점 · 조립 (손대지 않아요)                             🔷 공용
│   ├── config/config.js                           # 환경변수 Zod 검증                                         🔷 공용
│   ├── prisma/                                    # contract.prisma · contract.json · db.js (DB 접점 유일)    🔷 공용
│   ├── common/                                    # constants · di · exceptions · utils · lifecycle           🔷 공용
│   │   └── di/container.js                        # DI 컨테이너 — 도메인 등록 지점                            🔷 공용
│   ├── controllers/base-controller.js · index.js  # 라우트 조립 — /api/v1 에 도메인 연결                      🔷 공용
│   ├── controllers/auth/                          # 인증 — 로그인·회원가입·me·Google OAuth                    ③
│   ├── controllers/challenges/                    # 챌린지 — 목록·상세·참여·포기                              ①
│   ├── controllers/admin/                         # 관리자 — 챌린지 관리·신청 승인/거절                       ①·⑤
│   ├── controllers/works/                         # 작업물 — 제출·수정·삭제·하트                              ②
│   ├── controllers/feedbacks/                     # 피드백 — 목록·작성·수정·삭제                              ④
│   ├── controllers/applications/                  # 제안 — 내 신청·상세·취소                                  ⑤
│   ├── controllers/me/                            # 마이 — 참여중·완료·신청 목록                              ③
│   ├── controllers/notifications/                 # 알림 — 목록·읽음 처리                                     ④
│   ├── controllers/dev/                           # 개발 로그인 (운영에서는 404)                              🔷 공용
│   ├── middlewares/                               # cors · validation · auth · authorization · error-handler  🔷 공용
│   ├── providers/                                 # token(JWT) · cookie(httpOnly) · password(bcrypt)          🔷 공용·③
│   ├── repositories/                              # Prisma 접근 — 도메인별 담당이 채우는 계층                ①~⑤
│   ├── services/                                  # 비즈니스 규칙 — 도메인별 담당이 채우는 계층              ①~⑤
│   └── docs/                                      # openapi.js · swagger.js — /api-docs 자동 생성             🔷 공용
├── test/smoke.test.js                             # 서버 기동 검사 — 항상 초록                                🔷 공용
├── test/contract/                                 # 계약 테스트 — 구현 진행 척도 (🔴→🟢)                        🔷 공용
├── Dockerfile                                     # 배포 이미지                                               🔷 공용
└── .env.example                                   # 환경변수 예시 (복사해서 env/.env.development)             🔷 공용
```

### 2-1. 폴더·파일 상세 설명

| 경로                            | 하는 일                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `src/controllers/<도메인>/`     | 라우트 정의 + `*.schema.js`(읽기 전용 계약) — 도메인마다 파일 상단이 지침서 |
| `src/services/`                 | 비즈니스 규칙 — 등급 계산·정원 확인·알림 생성                               |
| `src/repositories/`             | Prisma 를 import 하는 **유일한** 계층 (service 에서 직접 import 금지)       |
| `src/common/di/container.js`    | DI 컨테이너 — 새 컨트롤러를 여기에 등록                                     |
| `src/common/utils/responses.js` | `sendData` · `sendPage` 응답 헬퍼 (응답 계약 검증 포함)                     |
| `src/prisma/`                   | `contract.prisma`(계약 원본) · `contract.json` · `db.js`(런타임 접점)       |
| `src/middlewares/`              | cors · validation · auth(`needsLogin`) · authorization · error-handler      |
| `src/docs/`                     | Swagger 자동 생성 — `/api-docs`                                             |
| `env/`                          | `.env.development` 를 두는 곳 (커밋 금지 — `.env.example` 만 공유)          |
| `test/contract/`                | 계약 테스트 — 도메인 구현이 끝날 때마다 🔴→🟢 로 바뀌어요                   |

### 2-2. 팀원별 담당표 — 도메인(어디를) · 하는 일(무엇을)

| 담당           | 이름           | 담당 폴더                                                                                                            | 난이도 | API 수            | 하는 일                                                                          |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ----------------- | -------------------------------------------------------------------------------- |
| 팀원 ①         | 영환           | `src/controllers/challenges/`(챌린지) · `src/controllers/admin/`(관리자 챌린지 그룹)                                 | 중상   | 6 + 4             | 챌린지 목록·상세 조회 · 참여/포기 · 관리자 생성·수정·삭제                        |
| 팀원 ②         | 다찬           | `src/controllers/works/`(작업물·임시저장)                                                                            | 최상   | 6 + 3             | 작업물 제출·수정·삭제 · 하트 토글 · 서버 임시저장                                |
| 팀원 ③         | 순창           | `src/controllers/auth/`(인증·구글 OAuth) · `src/controllers/me/`(마이)                                               | 중상   | 4 + 2 + 3 = **9** | 로그인·회원가입·로그아웃·세션 확인 · **구글 OAuth** · 참여중/완료/신청 목록 조회 |
| 팀원 ④         | 륜희           | `src/controllers/feedbacks/`(피드백) · `src/controllers/notifications/`(알림)                                        | 중하   | 4 + 4             | 피드백 작성·수정·삭제 · 알림 생성·읽음·삭제                                      |
| 팀원 ⑤         | 경래           | `src/controllers/applications/`(제안) · `src/controllers/admin/`(관리자 신청 그룹)                                   | 중     | 4 + 4             | 제안 작성·취소·상세 · 승인(챌린지 생성+알림)·거절                                |
| 🔷 공용        | 보일러플레이트 | `src/controllers/dev/`(개발 로그인) · `src/common/`(공통) · `src/middlewares/`(미들웨어) · `src/docs/`(Swagger 문서) | —      | —                 | 개발 편의 · 공통 미들웨어 · API 문서                                             |
| 🔷 공용·③ 사용 | 인증 기반      | `src/providers/`(JWT · 쿠키 · bcrypt · OAuth state/PKCE)                                                             | —      | —                 | ③이 인증 구현에 사용하는 공용 제공 부품                                          |

- `담당 폴더` = **어디를 맡는지**, `하는 일` = **무엇을 만드는지** 예요. 난이도는 설명안 v7·온보딩 담당 로드맵과 같은 기준이에요.
- `drafts`는 별도 폴더가 아니라 `src/controllers/works/` 안의 **임시저장 API 묶음**이에요.
- `google`은 별도 폴더가 아니라 `src/controllers/auth/google-controller.js`이고, `admin/challenges`·`admin/applications`는 `src/controllers/admin/`의 **경로 그룹**이에요.
- `dev`는 44개 계약에 포함되지 않는 **개발 전용 라우트(운영 404)** 이고, `providers`는 ③이 사용하는 **공용 제공 부품**이에요. ③의 개인 구현 범위는 `auth`·`google`·`me` 도메인이에요.
- 🔷 **공용 행은 이미 제공·구현 완료** — 팀원이 새로 만들지 않아요. 사용은 자유롭게, 수정은 담당자에게 제안해 주세요.
- 담당 번호는 `frontend` repo 의 화면 담당 번호와 **같은 번호**예요 — 내 도메인 번호 = 내 화면 번호.
- `services/`·`repositories/`는 **폴더 전체가 공용이 아니라 도메인별 담당 영역**이에요. `auth`·`user`는 ③, `challenge`는 ①처럼 각자 자기 도메인 파일을 채웁니다. `common`·`middlewares`·`providers`·`docs`만 공용 뼈대예요.
- 📌 담당 **정본(SoT)** 은 `docs/팀 온보딩 — 설명안 §2` 예요 — 이 표가 어긋나면 그 표를 기준으로 함께 갱신해요.
- 각 도메인 폴더의 **컨트롤러 파일 상단 주석**이 그 도메인의 작업 지침서예요
  (API 목록 · DI 등록 코드 · 계층 배분 · 완료 판정까지 담겨 있어 파일 하나로 이해할 수 있습니다).

## 3. 새 도메인(엔드포인트) 붙이는 3단계

```text
① controllers/<도메인>/<도메인>-controller.js — routes(...) 로 라우트 추가
② common/di/container.js — "<도메인>Controller: singleton(<Cls>)," 로 등록
③ controllers/index.js — field · constructor · routes() 세 부분에 조립
```

- 단, 이 repo 에서는 **도메인 8종이 이미 예약**되어 있어 새 도메인은 없어도 됩니다.
- 3단계 전부가 각 컨트롤러 상단 주석에 예시와 함께 있어요.

## 4. 실행 · 검증 (이 repo 단독)

```bash
pnpm install          # 의존성 설치
mkdir -p env && cp .env.example env/.env.development   # 환경변수 준비 (값 채우기)
pnpm dev              # http://localhost:5010 · Swagger http://localhost:5010/api-docs
pnpm lint             # ESLint
pnpm test             # 스모크 — 항상 초록이어야 해요
pnpm test:contract    # 계약 테스트 — 구현 진행 척도
```

- DB 가 필요하면 루트가 아닌 **이 repo 기준**으로 Prisma 8 명령을 실행하세요(`pnpm db:init` → `pnpm db:migrate` → `pnpm seed`).
- 로컬 PostgreSQL 을 직접 쓸 때 `permission denied for database`·`permission denied for schema prisma_contract` 가 나오면, `docthru_bp` DB와 `prisma_contract` 스키마의 소유자가 `docthru` 인지 확인해 주세요 (Docker compose 는 자동으로 맞춰 줘요).
- `env/.env.development` 는 **절대 커밋하지 않아요** — `.env.example` 만 공유합니다.
- CI/CD: PR·push는 `ci.yml`이 검사하고, 배포는 **수동 실행만** 열려 있어요. 수동 배포도 `ci` job을 먼저 통과한 뒤 진행됩니다(`needs: ci`). 자동배포는 아직 꺼져 있어요.

### 4-1. OpenAPI · Swagger 보는 법

Swagger UI는 **서버가 켜져 있을 때** `http://localhost:5010/api-docs` 에서 열려요. 문서는 `src/docs/openapi.js` 와 각 도메인의 `*.schema.js` 에서 자동 생성됩니다.

#### 1) 준비

```bash
pnpm install
mkdir -p env && cp .env.example env/.env.development
pnpm dev
```

- 정상 기동 시 콘솔에 `[server] Swagger UI: http://localhost:5010/api-docs` 가 찍혀요.
- API 서버 기본 주소: `http://localhost:5010/api/v1`
- 현재 계약 규모: **33 paths / 44 ops**

#### 2) 보는 순서

| 순서 | 볼 것            | 확인 포인트                                |
| ---- | ---------------- | ------------------------------------------ |
| 1    | **Tags**         | `auth`·`challenges`·`works` 등 도메인 구분 |
| 2    | **Paths**        | 실제 경로·HTTP 메서드                      |
| 3    | **Request**      | path·query·body 필수값과 enum              |
| 4    | **Response**     | 성공·오류 상태 코드와 응답 필드            |
| 5    | **자물쇠(보안)** | 로그인·쿠키가 필요한 API인지               |

> Swagger는 **계약을 직접 실행해 보는 문서**예요. 사람이 읽는 경로 목록의 정본은 `API-명세.md`, 필드의 정본은 Swagger `/api-docs` 를 봐요.

#### 3) 보호 API 확인

Swagger 화면에서 `POST /dev/login` 을 실행하면 브라우저에 인증 쿠키가 저장돼요.

```json
{ "email": "dev@example.com" }
```

그다음 `GET /auth/me` 를 실행하면 로그인 사용자를 확인할 수 있어요.

- `dev/login` 은 `ENABLE_DEV_LOGIN=true` 이고 **운영이 아닐 때만** 동작해요.
- 운영에서는 404예요.
- `src/controllers/dev/` 는 **공용 개발 도구**라 팀원 구현 대상이 아니에요.

#### 4) 문제 해결

| 증상                         | 확인                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `/api-docs` 404              | `/api/v1/api-docs` 가 아니라 **`/api-docs`** 인지 확인 |
| 서버 기동 실패               | `env/.env.development` 존재·필수값 확인                |
| 포트 충돌                    | 5010 포트를 쓰는 다른 서버 종료                        |
| 보호 API 401                 | Swagger에서 `POST /dev/login` 먼저 실행                |
| `RESPONSE_CONTRACT_MISMATCH` | 계약 스키마를 고치지 말고 **구현을 스키마에 맞춤**     |

> `env/.env.development` 는 커밋하지 않아요. `.env.example` 만 공유합니다.

## 5. 계약 · 응답 규칙 (요약)

- 계층: `route → controller → service → repositories → Prisma` · Prisma 는 `repositories/` 에서만 import.
- 쓰기 경로: `needsLogin` → `validate` → 핸들러 (401 → 403 → 400).
- 응답: 단건은 리소스 그대로 · 목록은 `{items, page, size, totalItems, totalPages}` · 오류는 `{code, message, details}`.
- 응답은 `sendData(res, data, status, 스키마)` 로 계약과 함께 전송 — 개발 환경에서 불일치를 즉시 잡아 줍니다.

## 6. 팀 결정·확인 사안

> **읽는 법** — `현재 상태`는 “지금 코드·계약이 어떻게 동작하는가”만 적었어요. FE 작업 순서는 `docthru-frontend/README.md` §3-4~§3-6을 봐 주세요.

| ID              | 사안                      | 현재 상태                                                        | 요구사항                                                       | 다음 행동                                     |
| --------------- | ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| **B-8**         | 사유 누락 오류 코드       | **팀 회의 안건** — 어드민 `400`, 작업물·피드백 `422`             | 2.5·2.6·2.7 — 사유 필드는 요구하지만 **오류 코드는 명시 없음** | `400/422` 유지 또는 `400` 통일                |
| **D-100**       | 알림 삭제 API             | **미채택** — 44건 계약 밖, 선택 경로                             | 3.2 — 읽음 처리만 요구, **삭제는 요구 없음**                   | 팀이 원하면 `DELETE /notifications/{id}` 추가 |
| **D-18**        | 마감 후 피드백 작성       | **현재 적용** — 신규 작성 허용, 수정·삭제만 금지                 | 2.6 — 완료 챌린지 피드백 수정·삭제 불가 / 2.7 — 작성 요구      | 현재 동작 유지                                |
| **D-98**        | 임시저장 위치             | **현재 적용 · 요구와 다름** — 서버 저장                          | 2.4 — 원문은 LocalStorage                                      | 편차 유지 여부를 팀이 확인                    |
| **D-97**        | 피드백 5,000자·사유 500자 | **팀 의견 수렴 중**                                              | 2.5·2.6·2.7 — 글자수 명시 없음                                 | 의견 있으면 계약·스키마 갱신                  |
| **D-94**        | 본인 작업물 하트          | **현재 적용** — 허용                                             | 2.7 — 하트 기능, 본인 제한 없음                                | 현재 동작 유지                                |
| **M-01~M-11**   | UI·검색·필터 기본값       | **기본값 적용 중**                                               | 2.3·2.4·2.5·2.8                                                | 공식 승인 또는 변경                           |
| **updateMe**    | 계정 수정 API             | **미채택**                                                       | 요구사항에 없음                                                | 필요하면 팀이 새로 결정                       |
| **피드백 개수** | 댓글 1개 제한 여부        | **현재 여러 개 허용** — `Feedback` unique 없음, `WorkLike`만 1개 | 2.7 — N개 + 더 보기, 1개 제한 없음                             | 1개 제한을 원하면 계약·DB 변경                |

## 7. 배포 · 브랜치 규칙

```text
develop 에서 개발 → push → CI 자동 검사 → PR → main 머지 → 자동 배포 🚀
```

| 항목         | 값                                                                      |
| ------------ | ----------------------------------------------------------------------- |
| 배포 주소    | `https://docthru-be-xwfe2o3yfa-du.a.run.app`                            |
| 헬스 체크    | `/api/v1/ping` → `{"message":"pong"}`                                   |
| 자동 배포    | Cloud Build + [`cloudbuild.yaml`](./cloudbuild.yaml) (`main` push 감시) |
| CI           | GitHub Actions `ci.yml` (PR·push) — postgres 자동 준비, 비밀값 0개      |
| 환경변수 8종 | Cloud Run **서비스에 등록** (이미지 교체가 아니라 서비스에 머무름)      |

> ⚠️ `contract`(스키마)를 바꿨다면 main 머지 후 `pnpm exec prisma db init` 을 **1회** 실행해야 합니다.
> ⚠️ `--set-env-vars` 는 env 목록 **전체 교체**입니다. 일부만 넣으면 다른 변수가 사라져요.

자세한 절차·시드 안전장치·문제 해결은 **[`docs/배포-런북.md`](./docs/배포-런북.md)** 에 있습니다.

## 8. 관련 문서

- **요구사항 추적표** — [`docs/화면-라우트-API-대조.md`](./docs/화면-라우트-API-대조.md): **요구 ↔ 화면 ↔ API** 한 표 (미커버·과잉·편차 점검)
- **배포 · 브랜치 런북** — [`docs/배포-런북.md`](./docs/배포-런북.md): 브랜치 규칙 · CI/배포 흐름 · 환경변수 8종 · 스키마 규칙 · 시드 안전장치 · 자주 나는 문제
- [`docs/BE-요구사항.md`](./docs/BE-요구사항.md) · [`docs/API-명세.md`](./docs/API-명세.md) · [`docs/ERD.md`](./docs/ERD.md)
