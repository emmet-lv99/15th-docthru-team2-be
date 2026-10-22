// JWT 발급/검증 (D-06)
import jwt from 'jsonwebtoken';
import { MINUTE_IN_SECONDS } from '#constants';

// ⚠️ 쿠키 maxAge 와 JWT exp 는 반드시 같은 값이어야 한다.
//    어긋나면 브라우저는 토큰이 유효한데 쿠키만 먼저 죽거나(AccessAuthError),
//    반대로 만료된 토큰이 쿠키에 남아 401 의 원인이 흐려진다.
export const ACCESS_TTL_SECONDS = 15 * 60; // 15분
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7일

export class TokenProvider {
  #accessSecret;
  #refreshSecret;

  constructor({ jwtAccessSecret, jwtRefreshSecret }) {
    this.#accessSecret = jwtAccessSecret;
    this.#refreshSecret = jwtRefreshSecret;
  }

  generateAccessToken(user) {
    return jwt.sign({ userId: user.id, role: user.role }, this.#accessSecret, {
      expiresIn: ACCESS_TTL_SECONDS,
    });
  }

  generateRefreshToken(user) {
    return jwt.sign({ userId: user.id }, this.#refreshSecret, { expiresIn: REFRESH_TTL_SECONDS });
  }

  generateTokens(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /** @returns {object|null} 서명 유효하면 payload, 아니면 null (예외를 밖으로 던지지 않는다) */
  verifyAccessToken(token) {
    return this.#verify(token, this.#accessSecret);
  }

  verifyRefreshToken(token) {
    return this.#verify(token, this.#refreshSecret);
  }

  /**
   * access 토큰이 "곧 만료"인지 판정해요 — 남은 시간이 5분 미만이고 아직 유효하면 true.
   * (이미 만료된 토큰은 verifyAccessToken 이 null 을 돌려주니 여기서는 다루지 않아요)
   *
   * 강사님 정본(token-provider.js)과 같은 규칙이에요 — 만료 직전에 미리 갱신해
   * "화면은 로그인인데 15분마다 로그아웃되는" 현상을 막아요.
   */
  shouldRefreshAccessToken(payload) {
    if (!payload?.exp) return false;
    const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
    return expiresIn > 0 && expiresIn < MINUTE_IN_SECONDS * 5;
  }

  #verify(token, secret) {
    if (!token) return null;
    try {
      return jwt.verify(token, secret);
    } catch {
      return null;
    }
  }
}
