// test/oauth-state-provider.test.js — OAuth state · PKCE 단위 테스트
//
// 강사님 정본(test/oauth-state-provider.test.js)의 의도를 독스루의 Google 단일 공급자
// 계약(oauth-state-provider.js)에 맞춰 옮겼어요.
//
//   ⚠️ 독스루는 Google 전용이라 state 안의 provider 는 항상 'google' 로 고정이에요
//      (강사님 정본은 google/kakao/naver 를 인자로 받았어요).
//   ⚠️ verifyState 는 공급자(google)·nonce·PKCE challenge·서명·10분 만료를 모두 확인하고,
//      하나라도 어긋나면 null 을 돌려줘요 (예외를 던지지 않아 컨트롤러가 400 판단을 쉬워요).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { OAuthStateProvider } from '../src/providers/oauth-state-provider.js';

const NOW = 1_800_000_000_000;

// 시간·난수를 고정해 결과를 예측 가능하게 만들어요 (실제 시계·난수에 의존하지 않아요).
const createProvider = ({ now = NOW } = {}) =>
  new OAuthStateProvider(
    {
      oauthStateSecret: 'test-secret-that-is-longer-than-32-characters',
      clientBaseUrl: 'http://localhost:3000',
    },
    {
      now: () => now,
      randomBytesFn: () => Buffer.alloc(32, 1),
    },
  );

describe('OAuthStateProvider — state 생성·검증', () => {
  it('우리 서버가 만든 state·nonce·PKCE 짝은 통과시킨다', () => {
    const provider = createProvider();
    const { state, transactionNonce, codeVerifier, codeChallenge } = provider.createState({
      next: '/products?sort=latest#list',
    });

    assert.equal(codeVerifier.length, 43, 'codeVerifier 는 base64url 32바이트 = 43자예요');
    assert.equal(codeChallenge.length, 43);
    assert.deepEqual(provider.verifyState({ state, transactionNonce, codeVerifier }), {
      provider: 'google',
      next: '/products?sort=latest#list',
    });
  });

  it('훼손된 state·nonce·verifier 는 모두 거부한다', () => {
    const provider = createProvider();
    const { state, transactionNonce, codeVerifier } = provider.createState({ next: '/' });

    assert.equal(
      provider.verifyState({ state: `${state}tampered`, transactionNonce, codeVerifier }),
      null,
      '서명이 어긋난 state 는 거부해야 해요',
    );
    assert.equal(
      provider.verifyState({ state, transactionNonce: 'other', codeVerifier }),
      null,
      '쿠키의 nonce 가 다르면 거부해야 해요',
    );
    assert.equal(
      provider.verifyState({ state, transactionNonce, codeVerifier: 'different-code-verifier' }),
      null,
      'PKCE verifier 가 다르면 거부해야 해요',
    );
  });

  it('필수 값이 하나라도 비면 null 을 돌려준다', () => {
    const provider = createProvider();

    assert.equal(provider.verifyState({}), null);
    assert.equal(
      provider.verifyState({ state: 'a.b', transactionNonce: null, codeVerifier: 'c' }),
      null,
    );
    assert.equal(
      provider.verifyState({ state: '', transactionNonce: 'n', codeVerifier: 'c' }),
      null,
    );
  });

  it('발급 후 10분이 지난 state 는 거부한다', () => {
    const issuing = createProvider();
    const { state, transactionNonce, codeVerifier } = issuing.createState({ next: '/' });
    const verifying = createProvider({ now: NOW + 10 * 60 * 1000 + 1 });

    assert.equal(verifying.verifyState({ state, transactionNonce, codeVerifier }), null);
  });

  it('위험한 리다이렉트 대상은 사이트 루트("/")로 되돌린다', () => {
    const provider = createProvider();

    assert.equal(provider.normalizeNextPath('https://evil.example'), '/');
    assert.equal(provider.normalizeNextPath('//evil.example'), '/');
    assert.equal(provider.normalizeNextPath('/\\evil.example'), '/');
    assert.equal(provider.normalizeNextPath('/dashboard'), '/dashboard');
  });
});
