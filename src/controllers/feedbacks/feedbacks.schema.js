// src/controllers/feedbacks/feedbacks.schema.js
// 추출본 API-명세.md 39~42행 · 요구사항.md 2.6 / 2.7 대응
import { z } from 'zod';
import {
  cursorQuerySchema,
  cursorPageSchema,
  errorResponseSchema,
  registerCommonErrorResponses,
} from '#docs/common.js';

const secured = [{ accessTokenCookie: [] }];

export const feedbackIdParamSchema = z
  .object({
    feedbackId: z.coerce.number().int().positive().meta({ example: 5 }),
  })
  .meta({ description: '피드백 식별자' })
  .meta({ id: 'FeedbackIdParam' });

export const feedbackBodySchema = z
  .object({
    content: z
      .string()
      .min(1, '피드백 내용을 입력해주세요.')
      .max(5_000, '피드백은 5,000자까지 입력할 수 있어요.')
      .meta({ example: '번역이 자연스럽습니다. 이 부분을 조금 더 다듬으면 좋겠어요.' }),
  })
  .meta({ description: '피드백 작성 본문' })
  .meta({ id: 'FeedbackBody' });

/**
 * 피드백 수정·삭제 본문
 * 어드민이 남의 피드백을 건드릴 때 사유가 필수지만, 그 판정은 Service 가 한다
 * (작성자 본인 수정은 사유 없이 가능해야 하므로 스키마 단계에서 강제하면 안 된다).
 */
export const feedbackUpdateBodySchema = z
  .object({
    content: z
      .string()
      .min(1, '피드백 내용을 입력해주세요.')
      .max(5_000, '피드백은 5,000자까지 입력할 수 있어요.')
      .meta({ example: '수정된 피드백 내용' }),
    reason: z.string().min(1).max(500).optional().meta({
      example: '욕설이 포함되어 있습니다.',
      description: '어드민이 남의 피드백을 수정/삭제할 때 필수 (Service 가 판정)',
    }),
  })
  .meta({ description: '피드백 수정 본문' })
  .meta({ id: 'FeedbackUpdateBody' });

export const feedbackDeleteBodySchema = z
  .object({
    reason: z.string().min(1).max(500).optional().meta({
      example: '욕설이 포함되어 있습니다.',
      description: '어드민 삭제 시 필수 (작성자 본인 삭제는 생략 가능)',
    }),
  })
  .nullish()
  .transform((value) => value ?? {})
  .meta({ description: '피드백 삭제 본문 (선택 — 본문 없이 호출해도 됨)' })
  .meta({ id: 'FeedbackDeleteBody' });

export const feedbackSchema = z
  .object({
    id: z.number().int().positive().meta({ example: 5 }),
    content: z.string().meta({ example: '번역이 자연스럽습니다.' }),
    author: z
      .object({
        id: z.number().int().positive(),
        nickname: z.string().nullable().meta({ description: '탈퇴한 회원이면 null' }),
        grade: z.enum(['NORMAL', 'EXPERT']).nullable(),
      })
      .meta({ description: '피드백 작성자' }),
    createdAt: z.string().datetime().meta({ example: '2026-10-01T10:00:00.000Z' }),
    updatedAt: z.string().datetime(),
  })
  .meta({ description: '피드백 (D-46 평문)' })
  .meta({ id: 'Feedback' });

export const feedbackListSchema = cursorPageSchema
  .extend({ items: z.array(feedbackSchema) })
  .meta({ description: 'D-54 커서 페이지네이션: { items, cursor, limit, hasMore }' })
  .meta({ id: 'FeedbackList' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────
const tag = 'Feedbacks';

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const feedbacksPaths = {
  '/works/{workId}/feedbacks': {
    get: {
      tags: [tag],
      summary: '피드백 목록 조회',
      description:
        "비회원 가능. 요구 2.7 — N개 표시 후 '더 보기' 로 추가 조회하므로 커서 페이지네이션을 씁니다(D-54). 다음 요청에 cursor 를 그대로 넘기면 됩니다.",
      requestParams: { query: cursorQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: feedbackListSchema } },
        },
        404: {
          description: '작업물을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    post: {
      tags: [tag],
      summary: '피드백 작성',
      description:
        "로그인 필요. ⚠️ D-18 (2026-10-01 정정) — 마감 후에도 **신규 작성은 허용**합니다. 요구 2.6 은 '완료된 챌린지의 피드백은 수정/삭제 불가' 라고만 했고 작성 시점은 막지 않습니다.",
      security: secured,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: feedbackBodySchema } },
      },
      responses: {
        201: {
          description: '작성 성공',
          content: { 'application/json': { schema: feedbackSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '작업물을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/feedbacks/{feedbackId}': {
    patch: {
      tags: [tag],
      summary: '피드백 수정',
      description:
        "작성자 본인 또는 ADMIN. 어드민이 남의 것을 수정할 때 reason 이 필수입니다(422). 마감 후에는 불가(409) — D-18 에서 '신규 작성' 만 허용하고 '수정·삭제' 는 막습니다.",
      security: secured,
      requestParams: { path: feedbackIdParamSchema },
      requestBody: {
        required: true,
        content: { 'application/json': { schema: feedbackUpdateBodySchema } },
      },
      responses: {
        200: {
          description: '수정 성공',
          content: { 'application/json': { schema: feedbackSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '피드백을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        409: {
          description: '마감된 챌린지',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        422: {
          description: '어드민 수정 시 사유 누락',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    delete: {
      tags: [tag],
      summary: '피드백 삭제',
      description: '작성자 본인(사유 없음) 또는 ADMIN(사유 필수). 마감 후에는 불가(409).',
      security: secured,
      requestParams: { path: feedbackIdParamSchema },
      requestBody: { content: { 'application/json': { schema: feedbackDeleteBodySchema } } },
      responses: {
        204: { description: '삭제 완료' },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '피드백을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        409: {
          description: '마감된 챌린지',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        422: {
          description: '어드민 삭제 시 사유 누락',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
};
