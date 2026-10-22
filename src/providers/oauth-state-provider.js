// src/providers/oauth-state-provider.js — Google OAuth state · PKCE 도우미
//
// Google OAuth 는 "우리 서버가 만든 요청"인지 확인하려고 state 를 쓰고,
// 인가 코드를 탈취당해도 바로 못 쓰게 PKCE(code_verifier/challenge)를 함께 써요.
//
//   · state       = payload + HMAC 서명 (위조 불가 · 만료 10분)
//   · payload     = next(돌아갈 FE 경로) · nonce · codeChallenge · issuedAt
//   · codeVerifier는 httpOnly 쿠키에만 두고, 콜백에서 challenge 와 짝이 맞는지 검사해요.
//
// ⚠️ state 는 URL 로 브라우저를 한 바퀴 돌기 때문에 서명이 없으면 누구나 만들 수 있어요.
//    그래서 OAUTH_STATE_SECRET(없으면 JWT_ACCESS_SECRET)으로 HMAC-SHA256 서명을 붙입니다.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// state 거래 유효 시간 — 10분이면 로그인 화면에서 고민하다 돌아와도 충분해요.
const STATE_TTL_MS = 10 * 60 * 1000;

const PROVIDER = 'google';

/** 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 길이를 맞춰 비교해요. */
const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export class OAuthStateProvider {
  #secret;
  #clientBaseUrl;
  #now;
  #randomBytes;

  constructor(
    { oauthStateSecret, clientBaseUrl },
    { now = Date.now, randomBytesFn = randomBytes } = {},
  ) {
    this.#secret = oauthStateSecret;
    this.#clientBaseUrl = clientBaseUrl;
    this.#now = now;
    this.#randomBytes = randomBytesFn;
  }

  /**
   * Google 로그인을 시작할 때 부르는 함수예요.
   * 돌려준 값 중 state · codeChallenge 는 Google 로 보내고,
   * transactionNonce · codeVerifier 는 httpOnly 쿠키에 담아 콜백에서 대조합니다.
   */
  createState({ next = '/' } = {}) {
    const codeVerifier = this.#randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const payload = {
      provider: PROVIDER,
      next: this.normalizeNextPath(next),
      transactionNonce: this.#randomBytes(32).toString('base64url'),
      codeChallenge,
      issuedAt: this.#now(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    return {
      state: `${encodedPayload}.${this.#sign(encodedPayload)}`,
      transactionNonce: payload.transactionNonce,
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * 콜백에서 state 를 검증해요 — 하나라도 어긋나면 null 을 돌려줍니다.
   *   · 서명 · 공급자(google) · nonce · PKCE challenge · 10분 만료를 모두 확인해요.
   *   · 실패를 예외로 던지지 않는 이유: 컨트롤러가 "400 으로 안내"할지 판단하기 쉽게 하려고요.
   */
  verifyState({ state, transactionNonce, codeVerifier }) {
    if (!state || !transactionNonce || !codeVerifier) {
      return null;
    }

    const [encodedPayload, signature, ...extraParts] = state.split('.');
    if (!encodedPayload || !signature || extraParts.length > 0) {
      return null;
    }

    if (!safeEqual(signature, this.#sign(encodedPayload))) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      const age = this.#now() - payload.issuedAt;
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      if (
        payload.provider !== PROVIDER ||
        !safeEqual(payload.transactionNonce, transactionNonce) ||
        !safeEqual(payload.codeChallenge, codeChallenge) ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > STATE_TTL_MS
      ) {
        return null;
      }

      return {
        provider: payload.provider,
        next: this.normalizeNextPath(payload.next),
      };
    } catch {
      return null;
    }
  }

  /**
   * 로그인 후 돌아갈 FE 경로를 안전하게 다듬어요.
   *   · "/" 로 시작하는 같은 사이트 경로만 허용 (open redirect 방지)
   *   · "//evil.com" · "\\" · 제어문자가 섞이면 "/" 로 되돌려요.
   */
  normalizeNextPath(next) {
    if (typeof next !== 'string') {
      return '/';
    }

    const trimmed = next.trim();
    const hasControlCharacter = [...trimmed].some((character) => {
      const code = character.codePointAt(0);
      return code <= 0x1f || code === 0x7f;
    });
    if (
      !trimmed.startsWith('/') ||
      trimmed.startsWith('//') ||
      trimmed.includes('\\') ||
      hasControlCharacter
    ) {
      return '/';
    }

    try {
      const baseUrl = new URL(this.#clientBaseUrl);
      const targetUrl = new URL(trimmed, baseUrl);

      if (targetUrl.origin !== baseUrl.origin) {
        return '/';
      }

      return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch {
      return '/';
    }
  }

  #sign(encodedPayload) {
    return createHmac('sha256', this.#secret).update(encodedPayload).digest('base64url');
  }
}
