// 401 Unauthorized — 로그인하지 않은 요청에 던지세요
// 판정은 컨트롤러에서 직접 하지 않고 needsLogin 미들웨어가 하는 것도 가능 (D-56)
import { HttpException } from './http-exception.js';
import { ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class UnauthorizedException extends HttpException {
  constructor(
    message = ERROR_MESSAGE.UNAUTHORIZED,
    details = null,
    code = ERROR_CODE.UNAUTHORIZED,
  ) {
    super(HTTP_STATUS.UNAUTHORIZED, code, message, details);
  }
}
