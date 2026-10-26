// src/controllers/applications/applications-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ⑤(제안 · 승인)
// 📍 이 파일: src/controllers/applications/applications-controller.js → 라우트 /challenge-applications
// 🔗 협력: ③(제안 이력) · ④(상태 알림) · ⑤ 본인(admin 신청 관리와 한 세트)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 STEP 1~3" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 생성    .select(...).create(data)
//    · 목록    .orderBy([(a) => a.createdAt.desc(), (a) => a.id.desc()])
//              .limit(size).offset((page - 1) * size)
//    · 취소    .where({ id }).update({ status: 'CANCELLED' }) (PENDING 만 — 서비스 규칙)
//
// 이 도메인이 하는 것 — 새 챌린지 제안 (요구 2.5)
//
// 구현 대상 API (4건)
//   POST   /challenge-applications                  USER · 제안 생성 — {title, category, documentType, sourceUrl, content, desiredDeadline, maxParticipants} (D-11)
//   GET    /challenge-applications/me               USER · 내 제안 목록 (q, status, sort, page, size)
//   GET    /challenge-applications/me/{applicationId}          신청자 · 상세 + 결정 사유
//   DELETE /challenge-applications/me/{applicationId}          신청자 · PENDING 만 취소 (CANCELLED 로 보존) (M-02)

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  STEP 1 · 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  STEP 2 · DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       applicationsController: singleton(ApplicationsController),
//  STEP 3 · 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #applicationsController;                       (필드 선언)
//       constructor 인자에 applicationsController 추가 → this.#applicationsController = applicationsController;
//       this.router.use('/', this.#applicationsController.routes());
//
//  ⚠️ STEP 2 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'applicationsController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/applications/applications-controller.js   라우트·요청 파싱
//    services/application-service.js            상태 전이 규칙 (PENDING → APPROVED/CANCELLED)
//    repositories/application-repository.js                   Prisma 호출
//    controllers/applications/applications.schema.js        Zod 스키마 (제공 · 수정 불필요)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (4건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(applications.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍import { BaseController } from '#controllers/base-controller.js';

import { BaseController } from '#controllers/base-controller.js';
import { needsLogin, validate } from '#middlewares';
import { HTTP_STATUS } from '#constants';
import { sendData } from '#utils';

import { applicationListQuerySchema, applicationListSchema } from './applications.schema.js';

export class ApplicationsController extends BaseController {
  #applicationService;

  constructor({ applicationService }) {
    super();
    this.#applicationService = applicationService;
  }

  // 내가 신청한 챌린지 목록 조회 API 등록
  routes() {
    this.router.get(
      '/me',
      needsLogin,
      validate('query', applicationListQuerySchema),
      (req, res, next) => this.getMyApplications(req, res, next),
    );

    return this.router;
  }

  // 내가 신청한 챌린지 목록 조회
  async getMyApplications(req, res, next) {
    try {
      const userId = req.user.id;
      const query = req.query;

      const result = await this.#applicationService.listMyApplications(userId, query);

      sendData(res, result, HTTP_STATUS.OK, applicationListSchema);
    } catch (error) {
      next(error);
    }
  }
}
