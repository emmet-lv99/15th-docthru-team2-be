// 전역 인증 미들웨어 — 쿠키로 req.user 를 채운다 (D-36 / D-06 / D-55)
//
//   ★ 강사님 정본(codeit-fs-layered-architecture-completed/src/middlewares/auth-middleware.js) 이식.
//   세션 유지 흐름 —
//     ① access 토큰이 유효하면 그대로 req.user 를 채워요.
//     ② access 가 없거나(a) 만료됐거나(b) 곧 만료(5분 미만)면 → refresh 로 새 토큰을 발급받아요.
//     ③ refresh 도 실패하면 그때만 두 쿠키를 지워요(로그아웃).
//   ④ 인증을 강제하지 않아요. 401 이 필요한 곳은 needsLogin 이 담당해요.
//
//   ⚠️ 예전 구현은 "access 가 있으면" 분기를 타서 **access 가 만료돼도 refresh 복구를 시도하지 않고**
//      쿠키를 지워버렸어요 → 15분마다 강제 로그아웃. 이제 강사님처럼 "유효/곧만료"를 계산한 뒤
//      refresh 로 복구합니다. (이 폴백이 없으면 그 증상이 그대로 재현됩니다)
//
//   ⚠️ 네임스페이스 차이(강사님 대비)
//     · 강사님 jwtService.decodedToken() 은 실패 시 throw → 우리 verifyAccessToken()/verifyRefreshToken()
//       은 예외를 삼키고 null 을 돌려준다. 그래서 null 여부로 판단한다.
//     · 쿠키명 access_token/refresh_token → accessToken/refreshToken
//     · JWT payload 는 평탄한 { userId, role } 이다 (강사님 { user: {...} } 와 다름)
import { UnauthorizedException } from '#exceptions';

export class AuthMiddleware {
  #tokenProvider;
  #authService;
  #cookieProvider;

  constructor({ tokenProvider, authService, cookieProvider }) {
    this.#tokenProvider = tokenProvider;
    this.#authService = authService;
    this.#cookieProvider = cookieProvider;
  }

  async authenticate(req, res, next) {
    try {
      const { accessToken, refreshToken } = req.cookies ?? {};

      // 쿠키가 아예 없으면 비로그인 통과 (전역 optional 인증 — D-36)
      if (!accessToken && !refreshToken) {
        return next();
      }

      const accessPayload = accessToken ? this.#tokenProvider.verifyAccessToken(accessToken) : null;
      const isValidAccess = Boolean(accessPayload?.userId);
      const needsRenewal =
        !isValidAccess || this.#tokenProvider.shouldRefreshAccessToken(accessPayload);

      // ② refresh 로 복구 시도 (복구 실패면 null — 강사님 #renewTokens 와 같은 방식)
      const renewed = needsRenewal && refreshToken ? await this.#renewTokens(refreshToken) : null;

      if (renewed) {
        this.#cookieProvider.setAuthTokens(res, renewed.tokens);
        req.user = { id: renewed.user.id, role: renewed.user.role };
        return next();
      }

      // ① access 가 (아직) 유효하면 복구 실패여도 로그인 유지
      if (isValidAccess) {
        req.user = { id: accessPayload.userId, role: accessPayload.role };
        return next();
      }

      // ③ 둘 다 실패 — 그때만 쿠키를 지운다
      this.#cookieProvider.clearAuthTokens(res);
      return next();
    } catch (error) {
      // 예상 밖 오류(DB 장애 등)는 삼키지 않고 errorHandler 로 올린다 (관측성)
      return next(error);
    }
  }

  /** refresh 검증·재발급을 시도해요. 인증 실패(401)면 null 을 돌려주고, 그 밖의 오류는 다시 던져요. */
  async #renewTokens(refreshToken) {
    try {
      return await this.#authService.refreshTokens(refreshToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return null;
      }
      throw error;
    }
  }
}
