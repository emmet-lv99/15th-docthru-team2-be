// src/controllers/challenges/challenges-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①(챌린지 생명주기) — 목록·상세·참여, 그리고 관리자 챌린지 관리(admin)도 이 사람
// 📍 이 파일: src/controllers/challenges/challenges-controller.js → 라우트 /challenges
// 🔗 협력: ②(작업 조회 works/me) · ⑤(승인 이후 노출) · ④(알림)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 STEP 1~3" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 조회    db.orm.public.Challenge.where({ ... }).select(...).first() / .all()
//    · 카운트  v7 _count.select 금지 → .include('participants', (r) => r.count())
//              또는 .aggregate((a) => ({ total: a.count() }))
//    · 정렬    관계 수 정렬은 .orderBy((c) => c.participants.count().desc())
//    · 묶음    v7 $transaction([count, items]) 금지 → db.transaction(async (tx) => { ... })
//
// 이 도메인이 하는 것 — 챌린지 조회·참여 (요구 2.3 · 2.4)
//
// 구현 대상 API (6건 — 정확한 입력·응답은 /api-docs (Swagger) · challenges.schema.js 참고)
//   GET    /challenges                              비회원 가능 · 목록(q, category, documentType, status, sort, page, size)
//   GET    /challenges/{challengeId}                비회원 가능 · 상세 (로그인 시 내 참여/작업 상태 포함)
//   GET    /challenges/{challengeId}/participants   비회원 가능 · 참여 목록/순위 (sort=likes|submittedAt)
//   POST   /challenges/{challengeId}/participation  USER · 도전하기 (중복/마감/정원이면 409)
//   DELETE /challenges/{challengeId}/participation  USER 본인 · 포기 (soft abandon, 204)
//   GET    /challenges/{challengeId}/works/me       참여 USER · 내 작업 (없으면 work: null · D-19)
//
//   참고 — works/me 의 PUT(제출)은 works 도메인이 붙입니다. 그리고 검색 필드는 'category' 만 쓰고 (D-11)
//   field 표기는 초안의 흔적이라 쓰지 않는 것을 권해요

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  STEP 1 · 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  STEP 2 · DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       challengesController: singleton(ChallengesController),
//  STEP 3 · 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #challengesController;                       (필드 선언)
//       constructor 인자에 challengesController 추가 → this.#challengesController = challengesController;
//       this.router.use('/challenges', this.#challengesController.routes());
//
//  ⚠️ STEP 2 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'challengesController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/challenges/challenges-controller.js   라우트·요청 파싱
//    services/challenge-service.js         비즈니스 규칙 (마감·정원·중복)
//    repositories/challenge-repository.js                Prisma 호출
//    controllers/challenges/challenges.schema.js       Zod 스키마 (제공 · 수정 불필요)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (6건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(challenges.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍니다. 실사용 중 구현이 계약을 어기는지 쉽게 확인할 수 있어요.
//
import { BaseController } from '#controllers/base-controller.js';

export class ChallengesController extends BaseController {
  constructor() {
    super();
  }

  routes() {
    // TODO: 라우트를 추가한다. 예)
    // this.router.get('/', validate('query', listQuerySchema), (req, res, next) =>
    //   this.list(req, res, next),
    // );
    return this.router;
  }
}
