// src/controllers/auth/auth-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이)
// 📍 이 파일: src/controllers/auth/auth-controller.js → 라우트 /auth
// 🔗 협력: GNB(세션 갱신·쿠키) · ④(알림 배지)
// 🔨 상태: 이메일 가입·로그인·로그아웃·내 정보·탈퇴·비밀번호 재설정 구현
// ══════════════════════════════════════════════════════════════
//
// 이 도메인이 하는 것 — 회원가입 · 로그인 · 로그아웃 · 내 정보 (요구 2.2)
//
// 구현 대상 API (8건)
//   POST   /auth/signup                  비회원 · 가입 — {email, nickname, password} → {user} + httpOnly 쿠키
//   POST   /auth/login                   비회원 · 로그인 — {email, password} → {user} + 쿠키
//   POST   /auth/logout                  비회원(멱등) — 쿠키 만료, 204
//   GET    /auth/me                      로그인 — 현재 사용자 + 활동 집계
//   PATCH  /auth/me                      로그인 — 닉네임·비밀번호 수정
//   DELETE /auth/me                      로그인 — 소프트 삭제·익명화, 204
//   POST   /auth/password-reset/request  비회원 — 재설정 메일 요청
//   POST   /auth/password-reset/confirm  비회원 — 토큰으로 비밀번호 교체, 204
//
// ⚠️ 응답은 auth.schema.js 계약과 같아야 해요 — 어긋나면 개발 중 500 RESPONSE_CONTRACT_MISMATCH.
import { BaseController } from '#controllers/base-controller.js';
import { needsLogin, validate } from '#middlewares';
import { HTTP_STATUS } from '#constants';
import { sendCreated, sendData, sendNoContent } from '#utils';
import {
  deleteMeSchema,
  loginSchema,
  meResponseSchema,
  passwordResetConfirmSchema,
  passwordResetRequestResponseSchema,
  passwordResetRequestSchema,
  signUpSchema,
  updateMeSchema,
  userSchema,
} from './auth.schema.js';

export class AuthController extends BaseController {
  #authService;
  #cookieProvider;

  constructor({ authService, cookieProvider }) {
    super();
    this.#authService = authService;
    this.#cookieProvider = cookieProvider;
  }

  routes() {
    this.router.post('/signup', validate('body', signUpSchema), (req, res, next) =>
      this.signUp(req, res, next),
    );
    this.router.post('/login', validate('body', loginSchema), (req, res, next) =>
      this.login(req, res, next),
    );
    this.router.post('/logout', (req, res) => this.logout(req, res));

    this.router.get('/me', needsLogin, (req, res, next) => this.me(req, res, next));
    this.router.patch('/me', needsLogin, validate('body', updateMeSchema), (req, res, next) =>
      this.updateMe(req, res, next),
    );
    this.router.delete('/me', needsLogin, validate('body', deleteMeSchema), (req, res, next) =>
      this.deleteMe(req, res, next),
    );

    this.router.post(
      '/password-reset/request',
      validate('body', passwordResetRequestSchema),
      (req, res, next) => this.requestPasswordReset(req, res, next),
    );
    this.router.post(
      '/password-reset/confirm',
      validate('body', passwordResetConfirmSchema),
      (req, res, next) => this.confirmPasswordReset(req, res, next),
    );

    return this.router;
  }

  async signUp(req, res, next) {
    try {
      const { user, tokens } = await this.#authService.signUp(req.body);
      this.#cookieProvider.setAuthTokens(res, tokens);
      sendCreated(res, user, userSchema);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { user, tokens } = await this.#authService.login(req.body);
      this.#cookieProvider.setAuthTokens(res, tokens);
      sendData(res, user, HTTP_STATUS.OK, userSchema);
    } catch (error) {
      next(error);
    }
  }

  logout(req, res) {
    // 인증 없이도 쿠키만 지우면 되는 멱등 경로예요.
    this.#cookieProvider.clearAuthTokens(res);
    sendNoContent(res);
  }

  /**
   * GET /auth/me
   *
   * ⚠️ 비로그인 응답에 관해 — 두 패턴이 있고 이 프로젝트는 2번을 택했다:
   *   2) API 명세: 권한이 "로그인" 이므로 `401 { code, message }`
   *   여기서는 needsLogin + 전역 errorHandler 로 2번을 쓴다.
   */
  async me(req, res, next) {
    try {
      const me = await this.#authService.me(req.user.id);
      sendData(res, me, HTTP_STATUS.OK, meResponseSchema);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req, res, next) {
    try {
      const { me, tokens } = await this.#authService.updateMe(req.user.id, req.body);
      if (tokens) this.#cookieProvider.setAuthTokens(res, tokens);
      sendData(res, me, HTTP_STATUS.OK, meResponseSchema);
    } catch (error) {
      next(error);
    }
  }

  async deleteMe(req, res, next) {
    try {
      await this.#authService.deleteMe(req.user.id, req.body.password);
      this.#cookieProvider.clearAuthTokens(res);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const result = await this.#authService.requestPasswordReset(req.body.email);
      sendData(res, result, HTTP_STATUS.OK, passwordResetRequestResponseSchema);
    } catch (error) {
      next(error);
    }
  }

  async confirmPasswordReset(req, res, next) {
    try {
      await this.#authService.confirmPasswordReset(req.body);
      // 비밀번호가 바뀌었으니 현재 브라우저 쿠키도 지워요.
      this.#cookieProvider.clearAuthTokens(res);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}
