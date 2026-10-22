// src/controllers/notifications/notifications-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ④(피드백 · 알림)
// 📍 이 파일: src/controllers/notifications/notifications-controller.js → 라우트 /notifications
// 🔗 협력: ①③⑤(각 도메인 이벤트가 알림을 만들어요) — 마감 알림은 지연 생성(D-17)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 ①②③" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 다중발행  v7 createMany({ skipDuplicates }) 금지 → createAll(rows, { onConflict: 'skip' })
//    · 읽음      v7 updateMany 금지 → .where({ ... }).updateAll({ readAt: new Date() })
//    · 안읽음수  .where({ readAt: null }).aggregate((a) => ({ total: a.count() }))
//    · 묶음      v7 $transaction([unread, items]) 금지 → db.transaction(async (tx) => { ... })
//
// 이 도메인이 하는 것 — 알림 목록 · 읽음 처리 (요구 3.2)
//
// 구현 대상 API (4건)
//   GET   /notifications                          USER · 목록 (unreadOnly, page, size — 최신순)
//   GET   /notifications/unread-count             USER · 안 읽은 알림 수 (GNB 배지 · D-64)
//   PATCH /notifications/{notificationId}/read     소유 USER · 단건 읽음 (204)
//   POST  /notifications/read-all                 USER · 전체 읽음 (204)

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  ① 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  ② DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       notificationsController: singleton(NotificationsController),
//  ③ 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #notificationsController;                       (필드 선언)
//       constructor 인자에 notificationsController 추가 → this.#notificationsController = notificationsController;
//       this.router.use('/', this.#notificationsController.routes());
//
//  ⚠️ ② 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'notificationsController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/notifications/notifications-controller.js   라우트
//    services/notification-service.js           읽음 처리
//    repositories/notification-repository.js                   Prisma 호출
//    //   ⚠️ type 값은 9종으로 통일 (notifications.schema.js · B-9 확정)
//    //   ⚠️ 마감 알림(CHALLENGE_DEADLINE)은 조회 시점에 지연 생성 (D-17)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (4건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(notifications.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍니다. 실사용 중 구현이 계약을 어기는지 쉽게 확인할 수 있어요.
//
import { BaseController } from '#controllers/base-controller.js';

export class NotificationsController extends BaseController {
  constructor() {
    super();
  }

  routes() {
    // TODO: 라우트를 추가한다
    return this.router;
  }
}
