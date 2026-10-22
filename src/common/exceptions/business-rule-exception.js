// 422 Business Rule Violation — 형식은 맞지만 비즈니스 규칙을 어겼을 때 던지세요
// 예: deadline 이 과거, maxParticipants < 1 같은 '유효하지 않은 값 조합'
import { HttpException } from './http-exception.js';
import { ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class BusinessRuleViolationException extends HttpException {
  constructor(message, details = null, code = ERROR_CODE.BUSINESS_RULE_VIOLATION) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, code, message, details);
  }
}

export { ERROR_MESSAGE, ERROR_CODE, HTTP_STATUS };
