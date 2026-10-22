// 400 Bad Request — 잘못된 형식·값의 요청에 던지세요 (validate() 미들웨어가 주로 씁니다)
// 쓰는 법: throw new BadRequestException('내가 원한 메시지') → 응답 { code: VALIDATION_ERROR, ... } (D-46)
import { HttpException } from './http-exception.js';
import { ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class BadRequestException extends HttpException {
  constructor(
    message = ERROR_MESSAGE.BAD_REQUEST,
    details = null,
    code = ERROR_CODE.VALIDATION_ERROR,
  ) {
    super(HTTP_STATUS.BAD_REQUEST, code, message, details);
  }
}
