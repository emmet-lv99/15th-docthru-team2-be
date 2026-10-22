// src/controllers/admin/admin.schema.js — 어드민 8경로 (추출본 API-명세.md 73~80행)
//
//   요구 20(권한별 접근) · 56(신청 목록 테이블) · 57(승인/거절) · 60(챌린지 수정/삭제) ·
//   92~93(어드민 처리 알림)
import { z } from 'zod';
import {
  paginationQuerySchema,
  pageMetaSchema,
  errorResponseSchema,
  registerCommonErrorResponses,
} from '#docs/common.js';
import {
  challengeIdParamSchema,
  challengeListQuerySchema,
} from '#controllers/challenges/challenges.schema.js';
import { applicationIdParamSchema } from '#controllers/applications/applications.schema.js';

const secured = [{ accessTokenCookie: [] }];
const tag = 'Admin';

// ── 목록 쿼리 ────────────────────────────────────────────────
export const adminApplicationListQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().min(1).optional().meta({ example: 'React', description: '신청 제목 검색' }),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional().meta({
      example: 'PENDING',
      description: '미지정 시 CANCELLED 제외 · PENDING 우선 정렬 (추출본 73행)',
    }),
    sort: z.enum(['latest', 'oldest', 'deadline']).optional().meta({ example: 'latest' }),
  })
  .meta({ description: '어드민 신청 목록 (요구 56 — 테이블형 조회)' });

export const adminChallengeListQuerySchema = challengeListQuerySchema
  .extend({
    includeDeleted: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === 'true')
      .meta({ example: false, description: 'true 면 soft delete 항목도 표시 (복구 대상 확인)' }),
    sort: z.enum(['latest', 'deadline']).optional().meta({ example: 'latest' }),
  })
  .meta({ description: '어드민 챌린지 목록/필터 (추출본 77행)' });

// ── 본문 ─────────────────────────────────────────────────────
export const adminChallengeCreateBodySchema = z
  .object({
    title: z
      .string()
      .min(1, '챌린지 제목을 입력해주세요.')
      .max(100)
      .meta({ example: 'React 서버 컴포넌트 실전' }),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']).meta({ example: 'NEXT_JS' }),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']).meta({ example: 'OFFICIAL' }),
    sourceUrl: z.string().url('원문 URL 형식이 올바르지 않습니다.').max(500).meta({
      example: 'https://react.dev/reference/rsc/server-components',
    }),
    content: z.string().max(100_000).optional().meta({ description: '번역 원문 (선택)' }),
    deadline: z.string().datetime('마감일을 ISO 8601 로 입력해주세요.').meta({
      example: '2026-12-15T15:00:00.000Z',
      description: 'D-23 UTC 로 저장',
    }),
    maxParticipants: z.coerce.number().int().positive().max(1000).meta({ example: 20 }),
  })
  .meta({ description: '어드민 직접 챌린지 생성 (추출본 78행 · 필드는 일반 생성과 동일)' })
  .meta({ id: 'AdminChallengeCreateBody' });

export const adminChallengeUpdateBodySchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']).optional(),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']).optional(),
    sourceUrl: z.string().url().max(500).optional(),
    content: z.string().max(100_000).optional(),
    deadline: z.string().datetime().optional().meta({ description: '마감일 연장/단축' }),
    maxParticipants: z.coerce.number().int().positive().max(1000).optional(),
  })
  .meta({ description: '진행 중인 챌린지 수정 (추출본 79행 · 일부만 보낼 수 있음)' })
  .meta({ id: 'AdminChallengeUpdateBody' });

export const adminChallengeDeleteBodySchema = z
  .object({
    reason: z.string().min(1, '삭제 사유를 입력해주세요.').max(500).meta({
      example: '원문 출처가 사라져 더 이상 제공되지 않아요.',
      description: '요구 93 — 사유는 참가자 알림에 함께 실린다',
    }),
  })
  .meta({ description: '챌린지 soft delete (추출본 80행 · 사유 필수)' })
  .meta({ id: 'AdminChallengeDeleteBody' });

export const approveBodySchema = z
  .object({
    deadline: z.string().datetime().optional().meta({
      example: '2026-12-20T15:00:00.000Z',
      description: '생략 시 신청자가 제안한 희망 마감일 사용',
    }),
    maxParticipants: z.coerce.number().int().positive().max(1000).optional().meta({
      example: 30,
      description: '생략 시 신청자가 제안한 인원 사용',
    }),
  })
  .meta({ description: '승인 (추출본 75행 · 선택 수정값 · atomic)' })
  .meta({ id: 'AdminApplicationApproveBody' });

export const rejectBodySchema = z
  .object({
    reason: z.string().min(1, '거절 사유를 입력해주세요.').max(500).meta({
      example: '출처가 blog 이라 공식 문서보다 신뢰도가 낮습니다.',
      description: '요구 92 — 사유와 함께 신청자에게 알림',
    }),
  })
  .meta({ description: '거절 (추출본 76행 · 사유 필수)' })
  .meta({ id: 'AdminApplicationRejectBody' });

// ── 응답 ─────────────────────────────────────────────────────
export const adminApplicationSchema = z
  .object({
    applicationId: z.number().int().positive(),
    title: z.string(),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']),
    sourceUrl: z.string(),
    content: z.string().nullable(),
    desiredDeadline: z.string().datetime(),
    maxParticipants: z.number().int().positive(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
    rejectionReason: z.string().nullable(),
    decidedAt: z.string().datetime().nullable(),
    cancelledAt: z.string().datetime().nullable(),
    applicant: z.object({ id: z.number().int(), nickname: z.string(), email: z.string() }),
    approvedChallenge: z
      .object({
        id: z.number().int(),
        title: z.string(),
        deadline: z.string().datetime(),
        status: z.enum(['IN_PROGRESS', 'CLOSED']),
      })
      .nullable(),
    createdAt: z.string().datetime(),
  })
  .meta({ description: '어드민 신청 목록/상세 (신청자 정보 포함)' })
  .meta({ id: 'AdminChallengeApplication' });

export const adminApplicationListSchema = z
  .object({
    items: z.array(adminApplicationSchema),
    page: pageMetaSchema.shape.page,
    size: pageMetaSchema.shape.size,
    totalItems: pageMetaSchema.shape.totalItems,
    totalPages: pageMetaSchema.shape.totalPages,
  })
  .meta({ description: 'D-46 목록 응답' })
  .meta({ id: 'AdminChallengeApplicationList' });

export const adminChallengeSchema = z
  .object({
    challengeId: z.number().int().positive(),
    title: z.string(),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']),
    sourceUrl: z.string(),
    content: z.string().nullable(),
    deadline: z.string().datetime(),
    maxParticipants: z.number().int().positive(),
    status: z.enum(['IN_PROGRESS', 'CLOSED']),
    deletedAt: z
      .string()
      .datetime()
      .nullable()
      .meta({ description: 'soft delete 시각 (복구 가능)' }),
    deleteReason: z.string().nullable().meta({ description: '삭제 사유 (참가자 알림에 전달)' }),
    createdBy: z.object({ id: z.number().int(), nickname: z.string() }).nullable(),
    participantCount: z.number().int().meta({ description: '관리자 목록용 집계' }),
    workCount: z.number().int(),
    createdAt: z.string().datetime(),
  })
  .meta({ description: '어드민 챌린지' })
  .meta({ id: 'AdminChallenge' });

export const adminChallengeListSchema = z
  .object({
    items: z.array(adminChallengeSchema),
    page: pageMetaSchema.shape.page,
    size: pageMetaSchema.shape.size,
    totalItems: pageMetaSchema.shape.totalItems,
    totalPages: pageMetaSchema.shape.totalPages,
  })
  .meta({ description: 'D-46 목록 응답' })
  .meta({ id: 'AdminChallengeList' });

export const approveResultSchema = z
  .object({
    applicationId: z.number().int().positive(),
    status: z.literal('APPROVED'),
    decidedAt: z.string().datetime(),
    challengeId: z.number().int().positive().meta({ description: '생성된 챌린지 id' }),
    challengeTitle: z.string(),
  })
  .meta({ description: '승인 결과 (챌린지 생성이 atomic)' })
  .meta({ id: 'AdminApplicationApproveResult' });

export const rejectResultSchema = z
  .object({
    applicationId: z.number().int().positive(),
    status: z.literal('REJECTED'),
    rejectionReason: z.string(),
    decidedAt: z.string().datetime(),
  })
  .meta({ description: '거절 결과' })
  .meta({ id: 'AdminApplicationRejectResult' });

// ── 경로 등록 ────────────────────────────────────────────────

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const adminPaths = {
  '/admin/challenge-applications': {
    get: {
      tags: [tag],
      summary: '전체 제안 목록 (어드민)',
      description:
        'ADMIN 전용. 요구 56 — 테이블 형태 조회(검색·필터·페이지네이션). 기본 정렬 PENDING 우선, CANCELLED 는 제외.',
      security: secured,
      requestParams: { query: adminApplicationListQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: adminApplicationListSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/admin/challenge-applications/{applicationId}': {
    get: {
      tags: [tag],
      summary: '제안·신청자 상세 (어드민)',
      description:
        'ADMIN 전용. 요구 57 — 승인/거절 전에 원문과 신청 내용, 신청자 정보를 함께 확인한다.',
      security: secured,
      requestParams: { path: applicationIdParamSchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: adminApplicationSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '신청을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/admin/challenge-applications/{applicationId}/approve': {
    post: {
      tags: [tag],
      summary: '신청 승인 및 챌린지 생성 (어드민)',
      description:
        'ADMIN 전용. 추출본 75행 — `{deadline?,maxParticipants?}` 로 선택 수정 가능. ' +
        '챌린지 생성과 상태 변경이 하나의 트랜잭션(atomic)으로 처리된다. ' +
        '승인 시 신청자에게 알림이 발송되고 등급이 재계산된다.',
      security: secured,
      requestParams: { path: applicationIdParamSchema },
      requestBody: {
        required: false,
        content: { 'application/json': { schema: approveBodySchema } },
      },
      responses: {
        200: {
          description: '승인 완료',
          content: { 'application/json': { schema: approveResultSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
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
  '/admin/challenge-applications/{applicationId}/reject': {
    post: {
      tags: [tag],
      summary: '신청 거절 (어드민)',
      description: 'ADMIN 전용. `{reason}` 필수 — 사유가 신청자 알림에 함께 실린다 (요구 92).',
      security: secured,
      requestParams: { path: applicationIdParamSchema },
      requestBody: {
        required: true,
        content: { 'application/json': { schema: rejectBodySchema } },
      },
      responses: {
        200: {
          description: '거절 완료',
          content: { 'application/json': { schema: rejectResultSchema } },
        },
        400: {
          description: '사유 누락',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
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
  '/admin/challenges': {
    get: {
      tags: [tag],
      summary: '챌린지 목록/필터 (어드민)',
      description:
        'ADMIN 전용. 추출본 77행. `includeDeleted=true` 로 soft delete 항목도 확인 가능.',
      security: secured,
      requestParams: { query: adminChallengeListQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: adminChallengeListSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    post: {
      tags: [tag],
      summary: '챌린지 직접 생성 (어드민)',
      description: 'ADMIN 전용. 추출본 78행 — 신청 경유 없이 직접 등록한다.',
      security: secured,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: adminChallengeCreateBodySchema } },
      },
      responses: {
        201: {
          description: '생성 완료',
          content: { 'application/json': { schema: adminChallengeSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/admin/challenges/{challengeId}': {
    patch: {
      tags: [tag],
      summary: '챌린지 수정 (어드민)',
      description:
        'ADMIN 전용. 요구 60 — 일반 유저 불가. 수정 시 진행 중인 참가자에게 알림이 발송된다.',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      requestBody: {
        required: true,
        content: { 'application/json': { schema: adminChallengeUpdateBodySchema } },
      },
      responses: {
        200: {
          description: '수정 완료',
          content: { 'application/json': { schema: adminChallengeSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '챌린지를 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    delete: {
      tags: [tag],
      summary: '챌린지 삭제 (어드민)',
      description:
        'ADMIN 전용. 요구 60 · 93 — `{reason}` 필수, soft delete 로 처리하며 ' +
        '삭제 사유와 함께 진행 중인 참가자에게 알림을 보낸다.',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      requestBody: {
        required: true,
        content: { 'application/json': { schema: adminChallengeDeleteBodySchema } },
      },
      responses: {
        204: { description: '삭제 완료' },
        400: {
          description: '사유 누락',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '어드민 권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '챌린지를 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
};
