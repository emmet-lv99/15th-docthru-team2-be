// 인증 쿠키 관리 (D-06: httpOnly + sameSite)
// 쿠키 발급/정리 provider — 쿠키 이름은 DI 로 주입합니다.
//
// ⚠️ 만료는 JWT exp 와 같은 값을 TokenProvider 상수에서 가져온다.
//    여기서 따로 정의하면 어긋나서 쿠키만 먼저 죽는다(브라우저가 즉시 버림 → Max-Age=0).
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from './token-provider.js';

// OAuth 거래 쿠키 수명 — state TTL(10분)과 같은 값이에요.
//   둘이 어긋나면 state 는 살아 있는데 nonce/verifier 만 먼저 사라져 로그인이 실패해요.
const OAUTH_TRANSACTION_TTL_SECONDS = 10 * 60;

export class CookieProvider {
  #accessTokenName;
  #refreshTokenName;
  #isProduction;
  #oauthCallbackPath;

  constructor({ accessTokenName, refreshTokenName, isProduction, oauthCallbackPath = '/' }) {
    this.#accessTokenName = accessTokenName;
    this.#refreshTokenName = refreshTokenName;
    this.#isProduction = isProduction;
    // 거래 쿠키는 콜백 경로에만 내려보내요 — 다른 요청에 실려 나가지 않게요.
    this.#oauthCallbackPath = oauthCallbackPath;
  }

  setAuthTokens(res, tokens) {
    const { accessToken, refreshToken } = tokens ?? {};
    if (accessToken) this.#set(res, this.#accessTokenName, accessToken, ACCESS_TTL_SECONDS);
    if (refreshToken) this.#set(res, this.#refreshTokenName, refreshToken, REFRESH_TTL_SECONDS);
  }

  clearAuthTokens(res) {
    res.clearCookie(this.#accessTokenName, { path: '/' });
    res.clearCookie(this.#refreshTokenName, { path: '/' });
  }

  setOAuthState(res, name, value, ttlSeconds) {
    this.#set(res, name, value, ttlSeconds);
  }

  clearOAuthState(res, name) {
    res.clearCookie(name, { path: '/' });
  }

  // ── Google OAuth 거래 쿠키 ─────────────────────────────────
  // state 의 nonce · PKCE verifier 는 URL 에 싣지 않고 httpOnly 쿠키로만 오가요.
  //   → 콜백에서 "브라우저가 맞는지"를 대조할 수 있어요.
  setOAuthTransactionCookies(res, { transactionNonce, codeVerifier }) {
    this.#set(
      res,
      'oauthTransactionNonce',
      transactionNonce,
      OAUTH_TRANSACTION_TTL_SECONDS,
      this.#oauthCallbackPath,
    );
    this.#set(
      res,
      'oauthCodeVerifier',
      codeVerifier,
      OAUTH_TRANSACTION_TTL_SECONDS,
      this.#oauthCallbackPath,
    );
  }

  getOAuthTransactionNonce(req) {
    return req.cookies?.oauthTransactionNonce ?? null;
  }

  getOAuthCodeVerifier(req) {
    return req.cookies?.oauthCodeVerifier ?? null;
  }

  // 콜백에 들어오자마자 지워요 — 한 번 쓴 state/PKCE 는 재사용할 수 없게요.
  clearOAuthTransactionCookies(res) {
    res.clearCookie('oauthTransactionNonce', { path: this.#oauthCallbackPath });
    res.clearCookie('oauthCodeVerifier', { path: this.#oauthCallbackPath });
  }

  /**
   * @param {number} ttlSeconds — 초 단위 (JWT exp 와 동일해야 한다)
   *
   * ⚠️ maxAge 를 쓰지 않고 expires 로 준다 — 실측 결함 (express 5.2.1, cookie 직렬화 경로):
   *      maxAge: 900     → "Max-Age=0"     ← 쿠키가 즉시 만료됨
   *      maxAge: 604800  → "Max-Age=604"   ← 값이 잘림
   *    expires 는 정상 동작한다. 브라우저는 Max-Age 와 expires 중 하나만 있어도 되므로
   *    동일 시각을 expires 로 넘겨 Max-Age=0 때문에 쿠키가 즉시 죽는 일을 막는다.
   */
  #set(res, name, value, ttlSeconds, path = '/') {
    res.cookie(name, value, {
      httpOnly: true,
      // sameSite=lax: 동일 사이트 서브도메인(교차 사이트 POST 아님)에서 쿠키가 붙는다
      sameSite: 'lax',
      secure: this.#isProduction,
      expires: new Date(Date.now() + ttlSeconds * 1000),
      path,
    });
  }
}
