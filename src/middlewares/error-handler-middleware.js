// 전역 에러 핸들러 — 오류 형식 { code, message, details }
import { DB_ERROR, ERROR_CODE, ERROR_MESSAGE, HTTP_STATUS } from '#constants';
import { HttpException } from '#exceptions';
import { config } from '#config';

export const errorHandler = (err, req, res, _next) => {
  // 우리 예외(도메인 규칙 위반 등) — 그대로 내려보내요.
  if (err instanceof HttpException) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // express.json 등 미들웨어가 붙인 4xx — JSON 문법 오류는 400, 본문 크기 초과는 413.
  // (이 분기가 없으면 잘못된 JSON 이 500 으로 새어 나가요)
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      code: ERROR_CODE.VALIDATION_ERROR,
      message: ERROR_MESSAGE.BAD_REQUEST,
    });
  }

  // Prisma 8 은 DB 오류를 P2002 같은 코드가 아니라 **Postgres 원본 SQLSTATE** 로 던져요.
  //   23505: 고유 제약 위반(이미 사용 중인 값) → 409
  if (err.sqlState === DB_ERROR.UNIQUE_VIOLATION) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      code: ERROR_CODE.CONFLICT,
      message: ERROR_MESSAGE.RESOURCE_CONFLICT,
    });
  }

  //   23503: 외래키 위반(없는 참조) → 400 (잘못된 요청)
  if (err.sqlState === DB_ERROR.FOREIGN_KEY_VIOLATION) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      code: ERROR_CODE.VALIDATION_ERROR,
      message: ERROR_MESSAGE.BAD_REQUEST,
    });
  }

  // 처리되지 않은 모든 에러 — 스택을 남기고 500
  console.error('[unhandled]', err.stack ?? err);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    code: ERROR_CODE.INTERNAL_SERVER_ERROR,
    message: ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
    ...(config.NODE_ENV !== 'production' && { details: { message: err.message } }),
  });
};
