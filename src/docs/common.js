// src/docs/common.js — OpenAPI 공통 스키마 (zod-openapi · 강사님 정본 계열)
//
// ★ 규칙: **Zod 가 API 문서의 단일 진실 공급원**이다.
//   스키마에 `.meta({ … })` 로 설명·예시를 달고, createDocument 가 문서를 만든다.
//   (강사님 정본 `zod-openapi` 와 같은 방식 — 전역 확장(monkey patch) 없이 zod 4 의 `.meta()` 를 그대로 씁니다.)
//
// 응답 규약 (API-명세 "공통 규칙")
//   · 단건  → 리소스 평문
//   · 목록  → { items, page, size, totalItems, totalPages }
//   · 무한스크롤 → { items, cursor, limit, hasMore }
//   · 오류  → { code, message, details }
import { z } from 'zod';

// ── 보안 스키마 ──────────────────────────────────────────────
// 쿠키 기반 access token — 문서 components.securitySchemes 로 실립니다.
export const securitySchemes = {
  accessTokenCookie: {
    type: 'apiKey',
    in: 'cookie',
    name: 'accessToken',
    description:
      'JWT를 httpOnly 쿠키로 전달합니다. 서버 컴포넌트의 fetch 에서는 브라우저 쿠키가 자동으로 붙지 않으므로 next/headers 의 cookies() 로 헤더를 전달해야 합니다.',
  },
};

// ── 공통 스키마 (Zod .meta() 표기) ───────────────────────────
/** 공통 오류 응답 */
export const errorResponseSchema = z
  .object({
    code: z.string().meta({ example: 'NOT_FOUND' }),
    message: z.string().meta({ example: '리소스를 찾을 수 없습니다.' }),
    details: z.record(z.string(), z.array(z.string())).optional(),
  })
  .meta({ id: 'ErrorResponse', description: '공통 오류 응답' });

/** 페이지네이션 메타 */
export const pageMetaSchema = z
  .object({
    page: z.number().int().positive().meta({ example: 1 }),
    size: z.number().int().positive().meta({ example: 20 }),
    totalItems: z.number().int().nonnegative().meta({ example: 137 }),
    totalPages: z.number().int().nonnegative().meta({ example: 7 }),
  })
  .meta({ description: '페이지네이션 메타' });

/** 목록 쿼리 파라미터 (page/size) */
export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).meta({ example: 1 }),
    size: z.coerce.number().int().min(1).max(100).default(20).meta({ example: 20 }),
  })
  .meta({ id: 'PaginationQuery' });

/** 무한스크롤 응답 */
export const cursorPageSchema = z
  .object({
    items: z.array(z.unknown()).meta({ description: '현재 페이지 항목' }),
    cursor: z.number().int().positive().nullable().meta({
      description: '다음 요청에 그대로 넘길 커서. hasMore=false 면 null',
    }),
    limit: z.number().int().positive().meta({ example: 10 }),
    hasMore: z.boolean().meta({ example: true }),
  })
  .meta({ description: '커서 페이지네이션 응답' });

/** 무한스크롤 쿼리 파라미터 */
export const cursorQuerySchema = z
  .object({
    cursor: z.coerce.number().int().positive().optional().meta({
      description: '이전 응답의 cursor 값. 첫 요청은 생략',
    }),
    limit: z.coerce.number().int().min(1).max(50).default(10).meta({ example: 10 }),
  })
  .meta({ id: 'CursorQuery' });

/** 공통 오류 응답을 HTTP 상태 코드 세트에 붙인다 */
export const registerCommonErrorResponses = (extra = {}) => ({
  400: {
    description: '입력값 검증 실패',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  401: {
    description: '로그인 필요',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  403: {
    description: '접근 권한 없음',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  404: {
    description: '리소스를 찾을 수 없음',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  409: {
    description: '상태 충돌',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  422: {
    description: '비즈니스 규칙 위반',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  500: {
    description: '서버 내부 오류',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  ...extra,
});
