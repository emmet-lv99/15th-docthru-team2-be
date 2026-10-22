// test/smoke.test.js — 뼈대 스모크 테스트
//
// ★ 이 파일은 **골격이 살아 있는지**만 확인한다.
//   도메인 기능 테스트는 각자 구현하면서 자기 영역에 추가한다.
//
//   node:test 를 쓴다 (프레임워크 추가 없이 기본 제공)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '#config';
import { DevController } from '#controllers/dev/dev-controller.js';
import { createContainer } from '#common/di/container.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

describe('환경 설정', () => {
  it('JWT 비밀키는 32자 이상이어야 한다', () => {
    assert.ok(config.JWT_ACCESS_SECRET.length >= 32);
    assert.ok(config.JWT_REFRESH_SECRET.length >= 32);
  });

  it('DB 커넥션 상한이 설정되어 있다 (서버리스 과연결 방지)', () => {
    assert.equal(typeof config.DB_POOL_MAX, 'number');
    assert.ok(config.DB_POOL_MAX >= 1 && config.DB_POOL_MAX <= 20);
  });
});

describe('DI 컨테이너', () => {
  // ⚠️ 빈 폴더만 만들어 두고 DI 등록을 빠뜨려도 이 테스트가 잡아준다.
  //    (기동 실패와 같은 원인의 조기 탐지)
  it('컨테이너를 만들 수 있다', () => {
    assert.doesNotThrow(() => createContainer());
  });

  it('루트 컨트롤러가 해석된다', () => {
    const { controller } = createContainer();
    assert.ok(controller, 'controller 가 DI 에 등록되어 있어야 한다');
  });

  it('인증 인프라가 모두 해석된다', () => {
    const { tokenProvider, cookieProvider, passwordProvider, userRepository, authService } =
      createContainer();
    assert.ok(tokenProvider);
    assert.ok(cookieProvider);
    assert.ok(passwordProvider);
    assert.ok(userRepository);
    assert.ok(authService);
  });

  it('authController 의 routes() 는 router 를 반환한다', () => {
    const { authController } = createContainer();
    const router = authController.routes();
    assert.equal(typeof router, 'function', 'Express router 는 함수다');
  });
});

describe('개발 로그인 안전장치', () => {
  // ★ 이 뼈대에서 가장 중요하게 막아야 하는 것.
  //   실수로 운영에 열리면 아무나 관리자 권한이 아니라 로그인 자체를 얻는다.

  it('ENABLE_DEV_LOGIN 이 "true" 문자열일 때만 켜진다', () => {
    const prev = config.ENABLE_DEV_LOGIN;
    try {
      config.ENABLE_DEV_LOGIN = false;
      assert.equal(DevController.isEnabled(), false);

      // 이런 실물 사례에서 실제로 없고 버그가 나왔어요.
      //   `if (env === true)` 로 걸면 "true" 문자열과 비교해 **항상 false** 가 된다.
      //   → 문자열로 들어오는 환경변수는 반드시 문자열과 비교해야 한다.
      config.ENABLE_DEV_LOGIN = true;
      assert.equal(DevController.isEnabled(), config.IS_PRODUCTION ? false : true);
    } finally {
      config.ENABLE_DEV_LOGIN = prev;
    }
  });

  it('production 이면 플래그와 무관하게 항상 꺼진다', () => {
    const prevEnabled = config.ENABLE_DEV_LOGIN;
    const prevProd = config.IS_PRODUCTION;
    try {
      config.ENABLE_DEV_LOGIN = true;
      config.IS_PRODUCTION = true;
      assert.equal(DevController.isEnabled(), false, 'production 은 무조건 막아야 한다');
    } finally {
      config.ENABLE_DEV_LOGIN = prevEnabled;
      config.IS_PRODUCTION = prevProd;
    }
  });
});

describe('응답 규약', () => {
  it('공통 오류 형식이 { code, message } 다', () => {
    assert.equal(typeof ERROR_MESSAGE.UNAUTHORIZED, 'string');
    assert.equal(HTTP_STATUS.UNAUTHORIZED, 401);
  });
});
