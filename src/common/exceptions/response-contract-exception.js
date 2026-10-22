// src/common/exceptions/response-contract-exception.js
// 응답이 OpenAPI 스키마와 어긋났을 때 던지는 예외 (개발 환경 전용)
import { HttpException } from './http-exception.js';
import { ERROR_CODE, HTTP_STATUS } from '#constants';

/**
 * ⚠️ 이 예외는 **개발/테스트 환경에서만** 던진다.
 *
 * 서버가 Zod 응답 스키마로 자기 응답을 검사하고 불일치하면 즉시 터뜨리는 장치다.
 * 배경 — totalPages 결함(2026-10-01):
 *   스키마는 totalPages 를 필수로 선언했는데 응답에는 없었고,
 *   JavaScript 라 타입 에러도 없고 OpenAPI 문서만 봐도 알 수 없어 한참 놓쳤다.
 *   계약은 이미 코드에 들어 있으므로, 거기에 응답을 대조시키는 것이 가장 확실하다.
 *
 * 운영에서는 검사하지 않는다 — production 에서 이 예외가 나면 FE 가 500 을 받는 셈이다.
 */
export class ResponseContractException extends HttpException {
  constructor(issues, { route = null } = {}) {
    super(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODE.RESPONSE_CONTRACT_MISMATCH,
      '응답이 OpenAPI 스키마와 일치하지 않습니다.',
      {
        route,
        issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })),
      },
    );
  }
}
