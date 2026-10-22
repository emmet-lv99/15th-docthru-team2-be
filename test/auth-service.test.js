// test/auth-service.test.js — AuthService.refreshTokens 단위 테스트
//
// 강사님 정본(test/auth-service.test.js)의 의도를 독스루 뼈대의 AuthService 계약에 맞춰 옮겼어요.
//   ⚠️ 뼈대의 auth-service.js 에는 signUp/login 이 아직 없어요(스텁) — 그 부분은 완성본에서 검증하고,
//      여기서는 "세션 복구(refreshTokens)"만 다룹니다.
//
//   DB·네트워크·서버를 쓰지 않고, 리포지토리와 토큰 Provider 를 가짜(fake)로 주입해서 확인해요.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AuthService } from '../src/services/auth-service.js';
import { ERROR_MESSAGE } from '#constants';
import { UnauthorizedException } from '#exceptions';

// 리포지토리·토큰 Provider 를 가짜로 넣고, 어떤 호출이 일어났는지 기록해 둡니다.
const buildService = ({ verifyRefreshToken, findById, generateTokens }) => {
  const calls = { findById: [] };
  const service = new AuthService({
    userRepository: {
      findById: async (id) => {
        calls.findById.push(id);
        return findById(id);
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
    const user = { id: 7, email: 'aden@example.com', nickname: 'aden' };
    const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

    const { service, calls } = buildService({
      verifyRefreshToken: () => ({ userId: 7 }),
      findById: async () => user,
      generateTokens: (found) => {
        assert.equal(found, user, '찾은 사용자로 토큰을 만들어야 해요');
        return tokens;
      },
    });

    const result = await service.refreshTokens('refresh-token');

    assert.deepEqual(result, { user, tokens });
    assert.deepEqual(calls.findById, [7], 'payload 의 userId 로 사용자를 조회해야 해요');
  });

  it('토큰이 유효하지 않으면 401 을 던지고 사용자를 조회하지 않는다', async () => {
    const { service, calls } = buildService({
      verifyRefreshToken: () => null,
      findById: () => assert.fail('토큰이 무효하면 사용자를 조회하면 안 돼요'),
      generateTokens: () => assert.fail('사용자가 없으면 토큰을 만들면 안 돼요'),
    });

    await assert.rejects(
      service.refreshTokens('bad-token'),
      (error) =>
        error instanceof UnauthorizedException &&
        error.statusCode === 401 &&
        error.message === ERROR_MESSAGE.INVALID_TOKEN,
    );
    assert.deepEqual(calls.findById, [], '토큰 검증에서 끊겨 조회가 없어야 해요');
  });

  it('토큰의 사용자가 없으면 401 을 던진다', async () => {
    const { service } = buildService({
      verifyRefreshToken: () => ({ userId: 999 }),
      findById: async () => null,
      generateTokens: () => assert.fail('사용자가 없으면 토큰을 만들면 안 돼요'),
    });

    await assert.rejects(
      service.refreshTokens('refresh-token'),
      (error) => error.statusCode === 401 && error.message === ERROR_MESSAGE.INVALID_TOKEN,
    );
  });
});
