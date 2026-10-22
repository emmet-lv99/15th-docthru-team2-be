// src/middlewares/authorization-middleware.js — 인증·인가 판정
//
//   predicate factory 형태를 그대로 따른다.
//
//   그런데 이 프로젝트의 오류 규약(API-명세 공통 규칙)은
//   `{ code, message, details }` JSON 이다.
//   → 여기서는 전역 errorHandler 가 같은 형식으로 응답하도록 예외를 던진다.
//      (같은 파일의 needsRole 도 next(error) 방식으로 통일되어 있다)
//
// 규칙: 이 프로젝트에 역할 판정 요구는 어드민만 있습니다 — 선례가 따로 없어요
import { UnauthorizedException } from '#exceptions';
import { ERROR_CODE, ERROR_MESSAGE } from '#constants';

const createAuthorizationMiddleware = (predicate) => (req, res, next) =>
  predicate(req) ? next() : next(new UnauthorizedException(ERROR_MESSAGE.UNAUTHORIZED));

const hasLoginUser = (req) => Boolean(req.user);

/**
 * 로그인 필수 — API 명세에서 권한이 "로그인" 인 경로에 붙인다.
 *
 * ⚠️ **컨트롤러에서 if (!req.user) 로 판정하지 않는다.**
 */
export const needsLogin = createAuthorizationMiddleware(hasLoginUser);

/**
 * 권한(역할) 판정 팩토리 — needsLogin 과 같은 factory 형태
 *
 * ⚠️ 왜 미들웨어인가 — 서비스에서만 판정하면 안 되는 이유:
 *   라우트 체인이 `needsLogin → validate(body) → 핸들러` 순이라,
 *   권한 판정이 서비스에 있으면 **본문 검증이 먼저 실행**된다.
 *   그 결과 일반 유저가 잘못된 본문으로 POST 하면 403 대신 400 을 받아
 *   관리자 전용 API 의 스키마를 노출하게 된다.
 *   권한을 검증보다 앞에 두어 401 → 403 → 400 순으로 흐르게 한다.
 *
 * @param {(userId:number)=>Promise<unknown>} assertRole 권한을 만족하면 resolve 하고,
 *        아니면 ForbiddenException 등 을 throw 하는 함수 (보통 AdminService.assertAdmin)
 */
export const needsRole = (assertRole) => (req, res, next) => {
  // ⚠️ req.user 가 없으면 assertRole(req.user.id) 가 TypeError(500) 로 터져요.
  //    권한 판정보다 "로그인 여부"가 먼저라서 401 로 끊어 줍니다 (401 → 403 → 400 순서).
  if (!req.user) {
    return next(new UnauthorizedException(ERROR_MESSAGE.UNAUTHORIZED));
  }
  return Promise.resolve()
    .then(() => assertRole(req.user.id))
    .then(() => next())
    .catch(next);
};

export { ERROR_CODE };
