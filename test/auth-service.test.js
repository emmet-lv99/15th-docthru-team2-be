// test/auth-service.test.js — AuthService.refreshTokens 단위 테스트
//
// 강사님 정본(test/auth-service.test.js)의 의도를 독스루 뼈대의 AuthService 계약에 맞춰 옮겼어요.
//   여기서는 "세션 복구(refreshTokens)"와 tokenVersion 무효화만 다룹니다.
//
//   DB·네트워크·서버를 쓰지 않고, 리포지토리와 토큰 Provider 를 가짜(fake)로 주입해서 확인해요.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AuthService } from '../src/services/auth-service.js';
import { ERROR_MESSAGE } from '#constants';
import { UnauthorizedException } from '#exceptions';

// 리포지토리·토큰 Provider 를 가짜로 넣고, 어떤 호출이 일어났는지 기록해 둡니다.
const buildService = ({ verifyRefreshToken, findActiveAuthUserById, generateTokens }) => {
  const calls = { findActiveAuthUserById: [] };
  const service = new AuthService({
    userRepository: {
      findActiveAuthUserById: async (id) => {
        calls.findActiveAuthUserById.push(id);
        return findActiveAuthUserById(id);
      },
    },
    // refreshTokens 는 등급 서비스를 쓰지 않아요 — 자리만 채워 둡니다.
    gradeService: {},
    tokenProvider: { verifyRefreshToken, generateTokens },
  });

  return { service, calls };
};

describe('AuthService.refreshTokens — refresh 토큰으로 세션 복구', () => {
  it('유효한 refresh 토큰이면 사용자와 새 토큰 한 쌍을 돌려준다', async () => {
    const user = {
      id: 7,
      email: 'aden@example.com',
      nickname: 'aden',
      role: 'USER',
      tokenVersion: 0,
    };
    const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

    const { service, calls } = buildService({
      verifyRefreshToken: () => ({ userId: 7, ver: 0 }),
      findActiveAuthUserById: async () => user,
      generateTokens: (found) => {
        assert.equal(found, user, '찾은 사용자로 토큰을 만들어야 해요');
        return tokens;
      },
    });

    const result = await service.refreshTokens('refresh-token');

    assert.deepEqual(result, { user, tokens });
    assert.deepEqual(
      calls.findActiveAuthUserById,
      [7],
      'payload 의 userId 로 활성 사용자를 조회해야 해요',
    );
  });

  it('토큰이 유효하지 않으면 401 을 던지고 사용자를 조회하지 않는다', async () => {
    const { service, calls } = buildService({
      verifyRefreshToken: () => null,
      findActiveAuthUserById: () => assert.fail('토큰이 무효하면 사용자를 조회하면 안 돼요'),
      generateTokens: () => assert.fail('사용자가 없으면 토큰을 만들면 안 돼요'),
    });

    await assert.rejects(
      service.refreshTokens('bad-token'),
      (error) =>
        error instanceof UnauthorizedException &&
        error.statusCode === 401 &&
        error.message === ERROR_MESSAGE.INVALID_TOKEN,
    );
    assert.deepEqual(calls.findActiveAuthUserById, [], '토큰 검증에서 끊겨 조회가 없어야 해요');
  });

  it('토큰의 사용자가 없으면 401 을 던진다', async () => {
    const { service } = buildService({
      verifyRefreshToken: () => ({ userId: 999, ver: 0 }),
      findActiveAuthUserById: async () => null,
      generateTokens: () => assert.fail('사용자가 없으면 토큰을 만들면 안 돼요'),
    });

    await assert.rejects(
      service.refreshTokens('refresh-token'),
      (error) => error.statusCode === 401 && error.message === ERROR_MESSAGE.INVALID_TOKEN,
    );
  });

  it('tokenVersion 이 토큰의 ver 와 다르면 401 로 기존 세션을 거부한다', async () => {
    const { service } = buildService({
      verifyRefreshToken: () => ({ userId: 7, ver: 0 }),
      findActiveAuthUserById: async () => ({ id: 7, role: 'USER', tokenVersion: 1 }),
      generateTokens: () => assert.fail('무효화된 토큰으로는 새 토큰을 만들면 안 돼요'),
    });

    await assert.rejects(
      service.refreshTokens('refresh-token'),
      (error) => error.statusCode === 401 && error.message === ERROR_MESSAGE.INVALID_TOKEN,
    );
  });
});
