// src/controllers/index.js — 루트 Controller
//
// ★ 하위 컨트롤러의 router 를 만들어 `/api/v1` 아래에 붙인다.
//   하위 컨트롤러 클래스를 여기서 import 하지 않는다.
//   실제 DI 등록(Awilix)은 common/di/container.js 가 담당하고,
//   이 파일은 "주입받은 인스턴스를 라우트에 붙이는" 역할만 한다.
//
// ★ 새 도메인 추가 시 **이 파일도 손봐야 한다** (DI 등록과 한 쌍이다)
//
// ─────────────────────────────────────────────────────────────
//  새 도메인 추가 3단계
// ─────────────────────────────────────────────────────────────
//  ① controllers/<도메인>/<도메인>-controller.js 작성
//  ② common/di/container.js 에 singleton(<도메인>Controller) 등록
//  ③ **이 파일** 의 constructor + routes() 에 라우트 조립
import { HTTP_STATUS } from '#constants';
import { BaseController } from '#controllers/base-controller.js';

// 강사님 정본처럼 BaseController 를 #controllers barrel 로도 내보내요 —
// `import { BaseController } from '#controllers'` 가 동작하도록.
export { BaseController };

export class Controller extends BaseController {
  #authController;
  #googleAuthController;
  #devController;
  #applicationsController;
  #challengesController;
  #worksController;
  #meController;
  #notificationsController;

  constructor({
    authController,
    googleAuthController,
    devController,
    applicationsController,
    challengesController,
    worksController,
    meController,
    notificationsController,
  }) {
    super();
    this.#authController = authController;
    this.#googleAuthController = googleAuthController;
    this.#devController = devController;
    this.#applicationsController = applicationsController;
    this.#challengesController = challengesController;
    this.#worksController = worksController;
    this.#meController = meController;
    this.#notificationsController = notificationsController;
  }

  routes() {
    // ── 인증 ────────────────────────────────────────────────
    this.router.use('/auth', this.#authController.routes());

    // ── Google OAuth (같은 /auth 아래 /auth/google · /auth/google/callback) ──
    this.router.use('/auth', this.#googleAuthController.routes());

    // ── 개발 계정 로그인 (개발 환경 전용) ────────────────────
    // 컨트롤러가 미등록되어 있으면(프로덕션) routes() 가 빈 router 를 돌려주고
    // 최종적으로 404 가 난다. → 라우트 자체가 없으므로 우회 수단이 없다.
    if (this.#devController) {
      this.router.use('/dev', this.#devController.routes());
    }

    // ── 헬스체크 ─────────────────────────────────────────────
    // 배포 플랫폼(Cloud Run 등)의 생존 확인에 쓴다.
    // ⚠️ DB 를 조회하지 않는다. keep-alive 용으로 쓰려면 인증이 필요한
    //    엔드포인트(예: GET /challenges)를 별도로 호출해야 한다.
    this.router.get('/ping', (req, res) => this.ping(req, res));

    // ── 마이 ────────────────────────────────────────────────
    this.router.use('/me', this.#meController.routes());

    // ── 각자 구현 ────────────────────────────────────────────
    this.router.use('/challenges', this.#challengesController.routes());
    this.router.use('/', this.#worksController.routes());
    // this.router.use('/admin', this.#adminController.routes());
    this.router.use('/notifications', this.#notificationsController.routes());

    // ── 신규 챌린지 신청 관리 ─────────────────────────
    this.router.use('/challenge-applications', this.#applicationsController.routes());

    return this.router;
  }

  ping(req, res) {
    res.status(HTTP_STATUS.OK).json({ message: 'pong' });
  }
}
