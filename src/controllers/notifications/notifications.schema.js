// src/controllers/notifications/notifications.schema.js
// 추출본 API-명세.md 94~96행 · 요구사항.md 3.2 대응
import { z } from 'zod';
import {
  paginationQuerySchema,
  pageMetaSchema,
  errorResponseSchema,
  registerCommonErrorResponses,
} from '#docs/common.js';

const secured = [{ accessTokenCookie: [] }];

/** 스키마의 NotificationType 9종과 1:1 (src/prisma/contract.prisma enum — B-9 확정 2026-10-11) */
export const NOTIFICATION_TYPES = [
  'CHALLENGE_APPROVED',
  'CHALLENGE_REJECTED',
  'CHALLENGE_UPDATED',
  'CHALLENGE_DELETED',
  'WORK_ADDED',
  'FEEDBACK_ADDED',
  'FEEDBACK_UPDATED',
  'FEEDBACK_DELETED',
  'CHALLENGE_DEADLINE',
];

export const notificationListQuerySchema = paginationQuerySchema
  .extend({
    unreadOnly: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => v === 'true')
      .meta({ example: 'false', description: 'true 면 안 읽은 알림만' }),
  })
  .meta({ description: '알림 목록 쿼리' });

export const notificationIdParamSchema = z
  .object({
    notificationId: z.coerce.number().int().positive().meta({ example: 12 }),
  })
  .meta({ description: '알림 식별자' })
  .meta({ id: 'NotificationIdParam' });

export const notificationSchema = z
  .object({
    id: z.number().int().positive().meta({ example: 12 }),
    type: z.enum(NOTIFICATION_TYPES).meta({
      example: 'FEEDBACK_ADDED',
      description:
        '스키마 NotificationType 9종 (B-9 — 삭제 알림 분리). 문구는 FE 가 type + related 조합으로 조립한다',
    }),
    reason: z.string().nullable().meta({
      example: null,
      description: 'D-48: 어드민 거절·삭제 사유. 그 외에는 null',
    }),
    relatedChallengeId: z.number().int().positive().nullable(),
    relatedChallengeTitle: z.string().nullable().meta({ description: 'FE 문구 조립용' }),
    relatedWorkId: z.number().int().positive().nullable(),
    actor: z
      .object({ id: z.number().int().positive(), nickname: z.string().nullable() })
      .nullable()
      .meta({ description: '누가 했는지 (예: 어드민). 없으면 null' }),
    isRead: z.boolean().meta({ example: false }),
    readAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime().meta({ example: '2026-10-01T10:00:00.000Z' }),
  })
  .meta({ description: '알림 (D-46 평문 — 문구 없이 원시 값만)' })
  .meta({ id: 'Notification' });

export const notificationListSchema = z
  .object({
    items: z.array(notificationSchema),
    page: pageMetaSchema.shape.page,
    size: pageMetaSchema.shape.size,
    totalItems: pageMetaSchema.shape.totalItems,
    totalPages: pageMetaSchema.shape.totalPages,
    unreadCount: z.number().int().nonnegative().meta({
      example: 3,
      description: 'GNB 배지용 미읽음 수. 전체 개수와 무관하게 항상 채워진다',
    }),
  })
  .meta({ description: 'D-46 목록 응답 + unreadCount' })
  .meta({ id: 'NotificationList' });

export const unreadCountSchema = z
  .object({
    unreadCount: z.number().int().nonnegative().meta({ example: 3 }),
  })
  .meta({ description: 'GNB 배지 전용' })
  .meta({ id: 'NotificationUnreadCount' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────
const tag = 'Notifications';

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const notificationsPaths = {
  '/notifications': {
    get: {
      tags: [tag],
      summary: '알림 목록 조회',
      description:
        "로그인 필요. 요구 3.2 — '새로고침 시 fetch' 방식. D-17 에 따라 조회 시 마감 임박(24시간 이내) 알림을 먼저 지연 생성합니다. M-03 으로 dedupeKey 중복을 막습니다.",
      security: secured,
      requestParams: { query: notificationListQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: notificationListSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/notifications/unread-count': {
    get: {
      tags: [tag],
      summary: '미읽음 알림 수',
      description:
        '로그인 필요. GNB 배지용. 목록 조회와 달리 마감 알림을 생성하지 않는다(사이드 이펙트 없음).',
      security: secured,
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: unreadCountSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/notifications/{notificationId}/read': {
    patch: {
      tags: [tag],
      summary: '알림 읽음 처리',
      description: '로그인 필요 + 소유자만. 남의 알림은 403. 이미 읽었으면 그대로 204(멱등).',
      security: secured,
      requestParams: { path: notificationIdParamSchema },
      responses: {
        204: { description: '읽음 처리 완료' },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '본인의 알림이 아님',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '알림을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/notifications/read-all': {
    post: {
      tags: [tag],
      summary: '전체 읽음 처리',
      description: '로그인 필요. 안 읽은 알림만 갱신하고 204 를 반환합니다.',
      security: secured,
      responses: {
        204: { description: '전체 읽음 처리 완료' },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
};
