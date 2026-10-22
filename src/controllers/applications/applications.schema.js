// src/controllers/applications/applications.schema.js — 신규 챌린지 신청 (요구 2.5)
//
// 추출본 API-명세.md 69~72행
//
// ⚠️ 필드명 매핑 (추출본 → 실제 스키마):
//   field → category · requestedDeadline → desiredDeadline
//   requestedMaxParticipants → maxParticipants
import { z } from 'zod';
import {
  paginationQuerySchema,
  pageMetaSchema,
  errorResponseSchema,
  registerCommonErrorResponses,
} from '#docs/common.js';

const secured = [{ accessTokenCookie: [] }];

/** applicantIdParam — 경로가 /challenge-applications/me/{applicationId} 라 값 이름으로 쓴다 */
export const applicationIdParamSchema = z
  .object({
    applicationId: z.coerce.number().int().positive().meta({ example: 20 }),
  })
  .meta({ description: '신청 식별자 (내 신청이 아니면 404)' })
  .meta({ id: 'MyApplicationIdParam' });

export const applicationCreateBodySchema = z
  .object({
    title: z.string().min(1, '챌린지 제목을 입력해주세요.').max(100).meta({
      example: 'React 공식 문서 번역',
      description: '추출본 필드명이 `title` 과 동일',
    }),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']).meta({
      example: 'NEXT_JS',
      description: '추출본 표기 `field` → 스키마 명칭 `category` (D-13 스키마 우선)',
    }),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']).meta({ example: 'OFFICIAL' }),
    sourceUrl: z.string().url('원문 URL 형식이 올바르지 않습니다.').max(500).meta({
      example: 'https://react.dev/learn',
    }),
    content: z.string().max(100_000).optional().meta({
      example: '번역하고 싶은 원문 발췌',
      description: '원문 미리보기 (선택)',
    }),
    desiredDeadline: z.string().datetime('희망 마감일을 ISO 8601 로 입력해주세요.').meta({
      example: '2026-11-30T15:00:00.000Z',
      description: '추출본 `requestedDeadline` → 스키마 `desiredDeadline`. D-23 UTC 저장',
    }),
    maxParticipants: z.coerce
      .number()
      .int()
      .positive()
      .max(1000, '최대 인원은 1,000명까지 가능합니다.')
      .meta({
        example: 10,
        description: '추출본 `requestedMaxParticipants` → 스키마 `maxParticipants`',
      }),
  })
  .meta({ description: '신규 챌린지 신청 본문 (요구 2.5)' })
  .meta({ id: 'ApplicationCreateBody' });

export const applicationListQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().min(1).optional().meta({ example: 'React', description: '신청 제목 검색' }),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional().meta({
      example: 'PENDING',
    }),
    sort: z.enum(['latest', 'deadline']).optional().meta({
      example: 'latest',
      description:
        'B-3 확정 (2026-10-11) — latest=신청순 · deadline=희망 마감일 임박순. 기본 정렬은 PENDING(승인 대기) 우선이며, 어드민 목록과 같은 규칙',
    }),
  })
  .meta({ description: '내 신청 목록 쿼리 (offset 페이징 — 추출본 70행이 page,size 명시)' });

export const applicationSchema = z
  .object({
    applicationId: z.number().int().positive().meta({ example: 20 }),
    title: z.string(),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']),
    sourceUrl: z.string(),
    content: z.string().nullable().meta({ description: '원문 미리보기 (선택)' }),
    desiredDeadline: z.string().datetime().meta({ description: '신청자가 제안한 마감일' }),
    maxParticipants: z.number().int().positive(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).meta({
      example: 'PENDING',
      description: '요구 2.8 — 승인 대기 / 승인 / 거절 (+ 취소)',
    }),
    rejectionReason: z.string().nullable().meta({ description: '거절 사유 (요구 2.8)' }),
    decidedAt: z.string().datetime().nullable().meta({ description: '결정 날짜 (알림 근거)' }),
    cancelledAt: z.string().datetime().nullable().meta({ description: 'M-02 취소 시각' }),
    approvedChallenge: z
      .object({
        id: z.number().int().positive(),
        title: z.string(),
        deadline: z.string().datetime(),
        status: z.enum(['IN_PROGRESS', 'CLOSED']),
        deletedAt: z.string().datetime().nullable().meta({
          description:
            'B-4 확정 (2026-10-11) — 어드민이 승인 후 삭제하면 채움 · null이면 삭제되지 않은 것',
        }),
        deleteReason: z.string().nullable().meta({
          description:
            'B-4 확정 — 삭제 사유 · 시안 배너("삭제 사유" 상자)에 그대로 씀 · 알림(reason)과 동일 값',
        }),
      })
      .nullable()
      .meta({
        description:
          '승인 시 연결된 챌린지 (요구 2.8 "승인됨 → 상세로 이동") · 챌린지가 뒤늦게 삭제되면 deletedAt·deleteReason으로 화면 배너를 복원할 수 있어요 — 별도 enum을 만들지 않는 D-14 계약 원칙',
      }),
    createdAt: z.string().datetime(),
  })
  .meta({ description: '신규 챌린지 신청 (D-46 평문)' })
  .meta({ id: 'ChallengeApplication' });

export const applicationListSchema = z
  .object({
    items: z.array(applicationSchema),
    page: pageMetaSchema.shape.page,
    size: pageMetaSchema.shape.size,
    totalItems: pageMetaSchema.shape.totalItems,
    totalPages: pageMetaSchema.shape.totalPages,
  })
  .meta({ description: 'D-46 목록 응답' })
  .meta({ id: 'ChallengeApplicationList' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────
const tag = 'ChallengeApplications';

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const applicationsPaths = {
  '/challenge-applications': {
    post: {
      tags: [tag],
      summary: '신규 챌린지 신청',
      description:
        '로그인 필요. 요구 2.5 — 원하는 문서의 챌린지 정보 · 희망 마감일 · 최대 인원을 제안한다. ' +
        '생성 상태는 PENDING 이며 관리자 승인을 거쳐야 챌린지 목록에 노출된다.',
      security: secured,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: applicationCreateBodySchema } },
      },
      responses: {
        201: {
          description: '신청 접수',
          content: { 'application/json': { schema: applicationSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/challenge-applications/me': {
    get: {
      tags: [tag],
      summary: '내 신청 목록',
      description: '로그인 필요. 요구 2.8 — 상태별 탭 구성용. offset 페이징을 쓴다(추출본 70행).',
      security: secured,
      requestParams: { query: applicationListQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: applicationListSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/challenge-applications/me/{applicationId}': {
    get: {
      tags: [tag],
      summary: '내 신청 상세',
      description:
        '신청자 본인만. 결정 사유를 포함하고, 승인 건은 연결된 챌린지를 담는다. 남의 신청은 404.',
      security: secured,
      requestParams: { path: applicationIdParamSchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: applicationSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '신청을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    delete: {
      tags: [tag],
      summary: '내 신청 취소',
      description:
        '신청자 본인만. M-02 — soft 취소로 행은 보존하고 status=CANCELLED + cancelledAt 만 기록한다. ' +
        '관리자 대기 목록에서만 빠져 신청 이력은 남는다. PENDING 가 아니면 409.',
      security: secured,
      requestParams: { path: applicationIdParamSchema },
      responses: {
        204: { description: '취소 완료' },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '신청을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        409: {
          description: '승인 대기 상태가 아님',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
};
