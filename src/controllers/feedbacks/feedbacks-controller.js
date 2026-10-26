// src/controllers/feedbacks/feedbacks-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ④(피드백 · 알림) — ⚠ 피드백 API 는 ④, 화면은 ② 작업물 상세 안(경계 협력)
// 📍 이 파일: src/controllers/feedbacks/feedbacks-controller.js → 라우트 /works/{workId}/feedbacks
// 🔗 협력: ②(작업물 상세 화면에 피드백 컴포넌트) · ④ 본인(알림 type 9종 공유)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 STEP 1~3" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 목록    .orderBy((f) => f.createdAt.desc()).limit(limit) · 커서는 .cursor({ createdAt })
//    · 수정    .where({ id }).update({ content }) / 삭제 .where({ id }).delete()
//              (마감 후 차단은 서비스 규칙 — DB 가 아니라 서비스에서 막아요)
//    · 카운트  피드백 수는 .include('feedbacks', (r) => r.count()) 로 조립
//
// 이 도메인이 하는 것 — 피드백 조회·작성·수정·삭제 (요구 2.6 · 2.7)
//
// 구현 대상 API (4건 — 귀속 위치는 각 줄의 경로를 잘 봐 주세요)
//   GET    /works/{workId}/feedbacks      비회원 가능 · 피드백 목록 (커서 페이징 D-54)
//   POST   /works/{workId}/feedbacks      USER · 피드백 작성 ({content}) — 마감 후에도 작성은 허용 (D-18)
//   PATCH  /feedbacks/{feedbackId}         작성자·ADMIN · 수정 — 마감 후 불가 (409 CHALLENGE_CLOSED)
//   DELETE /feedbacks/{feedbackId}         작성자·ADMIN · 삭제 (어드민은 {reason} 필수) — 마감 후 불가

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  STEP 1 · 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  STEP 2 · DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       feedbacksController: singleton(FeedbackController),
//  STEP 3 · 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #feedbacksController;                       (필드 선언)
//       constructor 인자에 feedbacksController 추가 → this.#feedbacksController = feedbacksController;
//       this.router.use('/', this.#feedbacksController.routes());
//
//  ⚠️ STEP 2 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'feedbacksController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/feedbacks/feedbacks-controller.js   라우트·요청 파싱
//    services/feedback-service.js           정렬·작성·수정 삭제 규칙
//    repositories/feedback-repository.js               Prisma 호출
//    controllers/feedbacks/feedbacks.schema.js       Zod 스키마 (제공 · 수정 불필요)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (4건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(feedbacks.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍니다. 실사용 중 구현이 계약을 어기는지 쉽게 확인할 수 있어요.
//
import { BaseController } from '#controllers/base-controller.js';

export class FeedbacksController extends BaseController {
  constructor() {
    super();
  }

  routes() {
    // TODO: 라우트를 추가한다
    return this.router;
  }
}
