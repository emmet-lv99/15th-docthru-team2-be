// 409 Conflict — 상태 충돌일 때 던지세요 (예: 중복 참여 · 마감 후 수정 CHALLENGE_CLOSED · 정원 초과)
// 서버가 소유 자에 따라 다르게 분기한다는 것을 의미합니다 (D-13 파생값)
import { HttpException } from './http-exception.js';
import { ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class ConflictException extends HttpException {
  constructor(
    message = ERROR_MESSAGE.RESOURCE_CONFLICT,
    details = null,
    code = ERROR_CODE.CONFLICT,
  ) {
    super(HTTP_STATUS.CONFLICT, code, message, details);
  }
}
