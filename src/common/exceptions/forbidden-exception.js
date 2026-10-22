// 403 Forbidden — 로그인은 됐는데 권한이 없을 때 던지세요 (예: 어드민 화면에 USER 접근)
// 쓰는 법: throw new ForbiddenException('메시지', {reason}) → D-62 needsRole 패턴 참고
import { HttpException } from './http-exception.js';
import { ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class ForbiddenException extends HttpException {
  constructor(message = ERROR_MESSAGE.FORBIDDEN, details = null, code = ERROR_CODE.FORBIDDEN) {
    super(HTTP_STATUS.FORBIDDEN, code, message, details);
  }
}
