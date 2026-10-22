// src/controllers/admin/admin-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①(관리자 챌린지 관리 4건) · 팀원 ⑤(관리자 신청 관리 4건) — 한 파일 공동 담당
// 📍 이 파일: src/controllers/admin/admin-controller.js → 라우트 /admin
// 🔗 협력: ①(직접 생성·수정·삭제 → 목록 노출) · ⑤(제안 승인/거절) · ④(알림 발송)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 ①②③" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 🧭 공동 담당 경계 — 근거: "챌린지 / 신청" 생명주기 소유자별로 묶어 작업량 균형을 맞췄어요(설명안 §2)
//    · ① 담당 — GET·POST /admin/challenges · PATCH·DELETE /admin/challenges/{challengeId}
//      (직접 생성 · 진행 중 수정 · soft delete({reason}) + 참가자 알림 · D-63)
//    · ⑤ 담당 — GET /admin/challenge-applications(목록) · GET .../{applicationId} · POST .../approve · POST .../reject
//      (승인은 "상태변경 + 챌린지 생성" 원자적 D-22 · 거절은 { reason } 필수)
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 승인    v7 $transaction([...]) 금지 → db.transaction(async (tx) => { 신청 상태변경 + 챌린지 생성 })
//    · 삭제    soft delete 는 .where({ id }).update({ deletedAt }) — 하드 delete 아님
//    · 목록    PENDING 우선 정렬은 서비스가 orderBy 조립
//
// 이 도메인이 하는 것 — 어드민: 제안 승인/거절 + 챌린지 관리 (요구 2.5 · 2.6)
//
// 구현 대상 API (8건)
//   GET    /admin/challenge-applications                       ADMIN · 전체 제안 목록 (PENDING 우선)
//   GET    /admin/challenge-applications/{applicationId}                   ADMIN · 제안·신청자 상세
//   POST   /admin/challenge-applications/{applicationId}/approve  ADMIN · 승인 + 챌린지 생성 (atomic D-22)
//   POST   /admin/challenge-applications/{applicationId}/reject   ADMIN · 거절 ({reason} 필수)
//   GET    /admin/challenges                                    ADMIN · 챌린지 목록/필터
//   POST   /admin/challenges                                    ADMIN · 직접 생성
//   PATCH  /admin/challenges/{challengeId}                      ADMIN · 진행 중 챌린지 수정
//   DELETE /admin/challenges/{challengeId}                      ADMIN · soft delete ({reason} 필수) + 신청자 알림

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  ① 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  ② DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       adminController: singleton(AdminController),
//  ③ 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #adminController;                       (필드 선언)
//       constructor 인자에 adminController 추가 → this.#adminController = adminController;
//       this.router.use('/admin', this.#adminController.routes());
//
//  ⚠️ ② 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'adminController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/admin/admin-controller.js         라우트·요청 파싱
//    services/admin-service.js               승인(원자적 승인+생성)·거절(reason 필수)
//    repositories/admin-repository.js                Prisma 호출
//    controllers/admin/admin.schema.js             Zod 스키마 (제공 · 수정 불필요)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (8건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(admin.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍니다. 실사용 중 구현이 계약을 어기는지 쉽게 확인할 수 있어요.
//
import { BaseController } from '#controllers/base-controller.js';

export class AdminController extends BaseController {
  constructor() {
    super();
  }

  routes() {
    // TODO: 라우트를 추가한다
    return this.router;
  }
}
