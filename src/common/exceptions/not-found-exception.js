// 💡 흐린 지점 하나만 — 다른 사용자 소유 자원이면 노출 방지를 위해 404로 통일할 수 있어요.
//    403 vs 404 어느 쪽인가는 팀에서 한 번 정하고 일관되게 써 주세요 (API-명세.md 상단 표 참고)
import { HttpException } from './http-exception.js';
import { ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class NotFoundException extends HttpException {
  constructor(
    message = ERROR_MESSAGE.RESOURCE_NOT_FOUND,
    details = null,
    code = ERROR_CODE.NOT_FOUND,
  ) {
    super(HTTP_STATUS.NOT_FOUND, code, message, details);
  }
}
