// test/cors-middleware.test.js — CORS 미들웨어 단위 테스트
//
// 강사님 정본(test/cors-middleware.test.js)의 "명시한 origin 에만 자격 증명을 허용한다"는
// 의도를 독스루의 cors-middleware.js 계약에 맞춰 옮겼어요.
//
//   ⚠️ 독스루 미들웨어는 res.header/res.vary 대신 res.setHeader 를 쓰고,
//      OPTIONS 프리플라이트에는 res.sendStatus(204|403) 로 답해요.
//   ⚠️ CORS_ORIGINS 가 비어 있으면 "개발 환경"에서만 모든 origin 을 허용해요 (로컬 편의).
//      운영(IS_PRODUCTION)에서는 비어 있어도 아무도 허용하지 않아요.
//
//   config 는 모듈 로드 시점에 파싱되므로, import 전에 process.env 를 먼저 채워 둡니다.
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.OAUTH_STATE_SECRET = 'test-oauth-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.API_BASE_URL = 'http://localhost:5001/api/v1';
process.env.CLIENT_BASE_URL = 'http://localhost:3000';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { cors } = await import('#middlewares/cors-middleware.js');
const { config } = await import('#config');

// 요청 하나를 흘려보내고, 미들웨어가 건드린 헤더·다음 호출 여부를 모아 돌려줍니다.
const invokeCors = (origin, method = 'GET') => {
  const headers = new Map();
  let nextCalled = false;
  let sentStatus = null;

  const req = { headers: { origin }, method };
  const res = {
    setHeader: (name, value) => headers.set(name, value),
    sendStatus: (status) => {
      sentStatus = status;
      return res;
    },
  };

  cors(req, res, () => {
    nextCalled = true;
  });

  return { headers, nextCalled, sentStatus };
};

// config 를 잠깐 바꿔서 특정 상황(개발/운영·origin 목록)을 재현하고 원래 값으로 되돌립니다.
const withConfig = (patch, run) => {
  const previous = { CORS_ORIGINS: config.CORS_ORIGINS, IS_PRODUCTION: config.IS_PRODUCTION };
  Object.assign(config, patch);
  try {
    return run();
  } finally {
    Object.assign(config, previous);
  }
};

describe('cors 미들웨어 — 자격 증명은 명시한 origin 에만', () => {
  it('CORS_ORIGINS 에 있는 origin 은 허용하고 자격 증명 헤더를 붙인다', () => {
    const { headers, nextCalled } = invokeCors('http://localhost:3000');

    assert.equal(headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
    assert.equal(headers.get('Access-Control-Allow-Credentials'), 'true');
    assert.equal(headers.get('Vary'), 'Origin');
    assert.equal(nextCalled, true, '일반 요청은 다음 핸들러로 넘어가야 해요');
  });

  it('목록에 없는 origin 은 허용 헤더 없이 통과시키되 자격 증명은 붙이지 않는다', () => {
    const { headers, nextCalled } = invokeCors('http://localhost:4000');

    assert.equal(headers.has('Access-Control-Allow-Origin'), false);
    assert.equal(headers.has('Access-Control-Allow-Credentials'), false);
    assert.equal(nextCalled, true);
  });

  it('origin 헤더가 없으면 아무 허용 헤더도 붙이지 않는다', () => {
    const { headers, nextCalled } = invokeCors(undefined);

    assert.equal(headers.has('Access-Control-Allow-Origin'), false);
    assert.equal(headers.has('Access-Control-Allow-Credentials'), false);
    assert.equal(nextCalled, true);
  });

  it('허용된 OPTIONS 프리플라이트는 204 로 끝내고 다음으로 넘기지 않는다', () => {
    const { sentStatus, nextCalled } = invokeCors('http://localhost:3000', 'OPTIONS');

    assert.equal(sentStatus, 204);
    assert.equal(nextCalled, false, '프리플라이트는 여기서 응답이 끝나야 해요');
  });

  it('허용되지 않은 OPTIONS 프리플라이트는 403 으로 끝낸다', () => {
    const { sentStatus, nextCalled } = invokeCors('http://localhost:4000', 'OPTIONS');

    assert.equal(sentStatus, 403);
    assert.equal(nextCalled, false);
  });

  it('개발 환경에서 CORS_ORIGINS 가 비어 있으면 아무 origin 이나 허용한다 (로컬 편의)', () => {
    withConfig({ CORS_ORIGINS: '', IS_PRODUCTION: false }, () => {
      const { headers } = invokeCors('http://any-device.local:5173');
      assert.equal(headers.get('Access-Control-Allow-Origin'), 'http://any-device.local:5173');
      assert.equal(headers.get('Access-Control-Allow-Credentials'), 'true');
    });
  });

  it('운영 환경에서 CORS_ORIGINS 가 비어 있으면 아무도 허용하지 않는다', () => {
    withConfig({ CORS_ORIGINS: '', IS_PRODUCTION: true }, () => {
      const { headers } = invokeCors('http://any-device.local:5173');
      assert.equal(headers.has('Access-Control-Allow-Origin'), false);
      assert.equal(headers.has('Access-Control-Allow-Credentials'), false);
    });
  });
});
