// src/common/utils/responses.js — 응답 전송 헬퍼
import { HTTP_STATUS } from '#constants';
import { config } from '#config';
import { ResponseContractException } from '#exceptions';

/** 개발/테스트에서만 스키마 대조를 한다 (production 은 비용·동작 모두 불필요) */
const shouldAssertContract = () => config.NODE_ENV !== 'production';

/**
 * 응답을 스키마로 검증한다.
 * @param {import('zod').ZodType} schema - OpenAPI 에 등록된 Zod 스키마
 * @param {unknown} data - 실제 응답 본문
 * @param {string} route - 에러 메시지에 남길 경로
 */
const assertMatches = (schema, data, route) => {
  if (!schema || !shouldAssertContract()) return;

  const result = schema.safeParse(data);
  if (!result.success) {
    // 이 예외는 컨트롤러의 try/catch → next(error) 로 흘러 error-handler 가 500 을 준다.
    // 즉 "개발 중 이 라우트의 응답이 계약과 다르다"는 사실이 즉시 드러난다.
    throw new ResponseContractException(result.error.issues, { route });
  }
};

/**
 * 목록 응답 — D-46: { items, page, size, totalItems, totalPages }
 * totalPages 를 여기서 계산하므로 스키마와 어긋날 여지가 없다.
 * (단, lastPage 처럼 별도 계산이 필요한 응답은 sendData 를 쓴다)
 */
export const sendPage = (res, { items, page, size, totalItems }, schema = null) => {
  const totalPages = size > 0 ? Math.ceil(totalItems / size) : 0;
  const body = { items, page, size, totalItems, totalPages };
  assertMatches(schema, body, 'sendPage');
  return res.status(HTTP_STATUS.OK).json(body);
};

/**
 * 단건 응답 — D-46: 리소스를 평문으로 그대로
 * @param {import('zod').ZodType} [schema] - 개발 환경에서 응답을 검증할 스키마
 */
export const sendData = (res, data, status = HTTP_STATUS.OK, schema = null) => {
  assertMatches(schema, data, `sendData:${status}`);
  return res.status(status).json(data);
};

export const sendNoContent = (res) => res.sendStatus(HTTP_STATUS.NO_CONTENT);

export const sendCreated = (res, data, schema = null) =>
  sendData(res, data, HTTP_STATUS.CREATED, schema);
