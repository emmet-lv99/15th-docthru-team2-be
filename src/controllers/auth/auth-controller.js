// src/controllers/auth/auth-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이)
// 📍 이 파일: src/controllers/auth/auth-controller.js → 라우트 /auth
// 🔗 협력: GNB(세션 갱신·쿠키 — 이 흐름도 이 담당이에요) · ④(알림 배지)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 ①②③" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 가입    중복 이메일·닉네임은 err.sqlState === '23505' 로 409 (v7 P2002 아님)
//    · 조회    .where({ email }).select(...).first() — 없으면 null(에러 아님), 404 분기는 서비스가
//    · 생성    .select(...).create(data)
//
// 이 도메인이 하는 것 — 회원가입 · 로그인 · 로그아웃 · 내 정보 (요구 2.2)
//
// 구현 상태 — GET /auth/me 는 이미 구현돼 있어요 (가이드로 참고하면 좋습니다)
//
// 구현 대상 API (3건)
//   POST /auth/signup        비회원 · 가입 — {email, nickname, password} → {user} + httpOnly 쿠키 (D-06)
//   POST /auth/login          비회원 · 로그인 — {email, password} → {user} + 쿠키
//   POST /auth/logout         비회원(멱등) — 쿠키 만료, 204 (계약: auth.schema.js logout 설명)
//
// 작업에 참고할 힌트
//   · 제공 스키마: auth.schema.js (signUpSchema · loginSchema · meResponseSchema — 수정 불필요)
//   · 비밀번호 72바이트 규칙은 bcrypt 6 의 실제 제한이라 스키마가 이미 검증해 줘요
//   · logout 은 인증 없이도 안전한 것이 계약이에요 — 쿠키만 만료시키면 됩니다
//
// ─────────────────────────────────────────────────────────
//  Google OAuth (심화 요구사항)
// ─────────────────────────────────────────────────────────
//  Google OAuth는 이 파일이 아니라 `google-controller.js` · `google-auth-service.js`
//  뼈대에서 ③ 담당자가 구현합니다. 경로·계약은 auth.schema.js에 이미 포함되어 있어요.

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  ① 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  ② DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       authController: singleton(AuthController),
//  ③ 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #authController;                       (필드 선언)
//       constructor 인자에 authController 추가 → this.#authController = authController;
//       this.router.use('/auth', this.#authController.routes());
//
//  ⚠️ ② 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'authController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/auth/auth-controller.js   라우트 (me 는 구현됨)
//    services/auth-service.js              비즈니스 규칙 (이미 있음 — 확장)
//    repositories/user-repository.js         Prisma 호출 (이미 있음 — 확장)
//    providers/password-provider.js        bcrypt 해시·검증 (이미 있음)
//    providers/token-provider.js           JWT 발급·쿠키 세팅 (이미 있음)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (4건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(auth.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍니다. 실사용 중 구현이 계약을 어기는지 쉽게 확인할 수 있어요.
//
import { BaseController } from '#controllers/base-controller.js';
import { needsLogin } from '#middlewares';
import { HTTP_STATUS } from '#constants';
import { sendData } from '#utils';
import { meResponseSchema } from './auth.schema.js';

export class AuthController extends BaseController {
  #authService;

  constructor({ authService }) {
    super();
    this.#authService = authService;
  }

  routes() {
    // GET /auth/me — 로그인 상태 + 유저 정보
    this.router.get('/me', needsLogin, (req, res, next) => this.me(req, res, next));

    // 각자 구현 — signup·login 을 넣을 때 아래 주석을 풀고
    // 생성자에 cookieProvider 를 다시 받는다:
    //   constructor({ authService, cookieProvider }) { ... this.#cookieProvider = cookieProvider }
    //
    // this.router.post('/signup', validate('body', signUpSchema), (req, res, next) => this.signUp(req, res, next));
    // this.router.post('/login', validate('body', loginSchema), (req, res, next) => this.login(req, res, next));
    // this.router.post('/logout', (req, res) => this.logout(req, res));

    return this.router;
  }

  /**
   * GET /auth/me
   *
   * ⚠️ 비로그인 응답에 관해 — 두 패턴이 있고 이 프로젝트는 2번을 택했다:
   *   2) API 명세: 권한이 "로그인" 이므로 `401 { code, message }`
   *   여기서는 needsLogin + 전역 errorHandler 로 2번을 쓴다.
   *   (명세가 권한을 명시했으므로 401 이 요구사항에 맞는다)
   */
  async me(req, res, next) {
    try {
      const me = await this.#authService.me(req.user.id);
      sendData(res, me, HTTP_STATUS.OK, meResponseSchema);
    } catch (error) {
      next(error);
    }
  }
}
