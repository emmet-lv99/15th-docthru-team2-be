// Zod 스키마 — 검증과 OpenAPI 문서를 한 곳에서 얻는다 (D-20)
import { z } from 'zod';
import {
  paginationQuerySchema,
  pageMetaSchema,
  errorResponseSchema,
  registerCommonErrorResponses,
} from '#docs/common.js';

// 실제 스키마 기준 (src/prisma/contract.prisma): Category 5종 · DocumentType 4종

/** 인증 필요 경로 표시 (D-50 securitySchemes) */
const secured = [{ accessTokenCookie: [] }];
export const CATEGORY = {
  NEXT_JS: 'NEXT_JS',
  MODERN_JS: 'MODERN_JS',
  API: 'API',
  WEB: 'WEB',
  CAREER: 'CAREER',
};
export const DOCUMENT_TYPE = { OFFICIAL: 'OFFICIAL', BLOG: 'BLOG', BOOK: 'BOOK', OTHER: 'OTHER' };
export const CHALLENGE_STATUS = { IN_PROGRESS: 'IN_PROGRESS', CLOSED: 'CLOSED' };
export const CHALLENGE_SORT = { LATEST: 'latest', DEADLINE: 'deadline', POPULAR: 'popular' };

const userSummarySchema = z
  .object({
    id: z.number().int().positive().meta({ example: 1 }),
    nickname: z.string().meta({ example: '체다치즈' }),
    grade: z.enum(['NORMAL', 'EXPERT']).nullable().meta({
      example: 'EXPERT',
      description: 'D-47: Service에서 산출식으로 재계산. 어드민 계정은 null 가능',
    }),
  })
  .meta({ description: '챌린지 생성자 요약 정보' })
  .meta({ id: 'UserSummary' });

export const challengeSchema = z
  .object({
    id: z.number().int().positive().meta({ example: 1 }),
    title: z.string().meta({ example: 'Next.js App Router 마이그레이션' }),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']).meta({
      example: 'NEXT_JS',
      description: '기술 분야. 화면 근거 문서의 값과 스키마 값이 달라 스키마를 따름',
    }),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']).meta({ example: 'OFFICIAL' }),
    sourceUrl: z.string().meta({ example: 'https://nextjs.org/docs/app' }),
    content: z
      .string()
      .nullable()
      .meta({ example: '번역 원본 본문', description: '어드민이 등록. 미등록 시 null' }),
    deadline: z.string().datetime().meta({
      example: '2026-10-31T15:00:00.000Z',
      description: 'D-23: ISO 8601 UTC. 표시만 Asia/Seoul',
    }),
    maxParticipants: z.number().int().positive().meta({ example: 10 }),
    status: z.enum(['IN_PROGRESS', 'CLOSED']).meta({
      example: 'IN_PROGRESS',
      description: 'D-13: 모집 완료(isFull)는 파생값이라 enum에 넣지 않음',
    }),
    isFull: z.boolean().meta({
      example: false,
      description: 'D-13 파생값: status=IN_PROGRESS && 미마감 && 활성참여 ≥ maxParticipants',
    }),
    isClosed: z.boolean().meta({ example: false, description: 'D-13 파생값: now ≥ deadline' }),
    participantCount: z.number().int().nonnegative().meta({ example: 3 }),
    createdBy: userSummarySchema,
    createdAt: z.string().datetime().meta({ example: '2026-09-30T10:00:00.000Z' }),
  })
  .meta({ description: '챌린지 상세 (D-46 평문)' })
  .meta({ id: 'Challenge' });

export const challengeListQuerySchema = paginationQuerySchema
  .extend({
    q: z
      .string()
      .min(1)
      .optional()
      .meta({ example: 'Next.js', description: '제목·원문본문(content) 검색' }),
    category: z
      .preprocess(
        // 화면의 분야 필터는 체크박스 다중이라 한 요청에 여러 값을 받는다 —
        // `?category=NEXT_JS&category=WEB` 형태(Express가 배열로 파싱)와 단일 값 둘 다 지원 (M-08 · B-2 확정 2026-10-11)
        (value) => (Array.isArray(value) ? value : [value]),
        z.array(z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER'])).max(5),
      )
      .optional()
      .meta({
        description: '기술 분야 필터 — 다중 선택 가능 (예: ?category=NEXT_JS&category=WEB)',
        example: ['NEXT_JS', 'WEB'],
      }),
    documentType: z
      .enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER'])
      .optional()
      .meta({ description: '문서 타입' }),
    status: z
      .enum(['IN_PROGRESS', 'CLOSED'])
      .optional()
      .meta({ description: 'D-13: 모집 완료는 파생값이라 미포함' }),
    sort: z.enum(['latest', 'deadline', 'popular']).optional().meta({ example: 'latest' }),
  })
  .meta({ description: '챌린지 목록 쿼리 (B 공통 규칙)' });

export const challengeIdParamSchema = z
  .object({
    challengeId: z.coerce.number().int().positive().max(2147483647).meta({ example: 1 }),
  })
  .meta({ description: '챌린지 식별자' })
  .meta({ id: 'ChallengeIdParam' });

export const challengeListSchema = z
  .object({
    items: z.array(challengeSchema),
    page: pageMetaSchema.shape.page,
    size: pageMetaSchema.shape.size,
    totalItems: pageMetaSchema.shape.totalItems,
    totalPages: pageMetaSchema.shape.totalPages,
  })
  .meta({ description: 'D-46 목록 응답: { items, page, size, totalItems, totalPages }' })
  .meta({ id: 'ChallengeListResponse' });

// ── 참여 현황 (추출본: GET /challenges/{challengeId}/participants) ──
export const participantListQuerySchema = paginationQuerySchema
  .extend({
    sort: z.enum(['likes', 'submittedAt']).optional().meta({
      example: 'likes',
      description: 'likes=호감수순 · submittedAt=제출순',
    }),
  })
  .meta({ description: '챌린지 참여 현황 쿼리' });

export const workSummarySchema = z
  .object({
    id: z.number().int().positive().meta({ example: 12 }),
    content: z.string().meta({ example: '<p>번역 본문</p>', description: 'TipTap HTML' }),
    submittedAt: z.string().datetime().meta({ example: '2026-10-01T10:00:00.000Z' }),
    likeCount: z.number().int().nonnegative().meta({ example: 7 }),
  })
  .meta({ description: '참여자의 번역 작업물 요약 (D-49: 1:N)' })
  .meta({ id: 'ParticipantWorkSummary' });

export const participantSchema = z
  .object({
    participantId: z.number().int().positive().meta({ example: 3 }),
    user: z.object({
      id: z.number().int().positive(),
      nickname: z.string().meta({ example: '개밥life' }),
      grade: z.enum(['NORMAL', 'EXPERT']).nullable(),
    }),
    joinedAt: z.string().datetime(),
    isAbandoned: z.boolean().meta({ description: '포기한 참여. D-10: 정원 집계에서만 제외' }),
    works: z.array(workSummarySchema),
  })
  .meta({ description: '챌린지 참여자 1명 + 작업물 목록' })
  .meta({ id: 'ChallengeParticipant' });

export const participantListSchema = z
  .object({
    items: z.array(participantSchema),
    page: pageMetaSchema.shape.page,
    size: pageMetaSchema.shape.size,
    totalItems: pageMetaSchema.shape.totalItems,
    totalPages: pageMetaSchema.shape.totalPages,
  })
  .meta({ description: 'D-46 목록 응답' })
  .meta({ id: 'ChallengeParticipantList' });

// ── 도전하기 / 포기 ──────────────────────────────────────────
export const participationResultSchema = z
  .object({
    participantId: z.number().int().positive().meta({ example: 3 }),
    challengeId: z.number().int().positive().meta({ example: 1 }),
    joinedAt: z.string().datetime(),
    isRejoined: z.boolean().meta({
      example: false,
      description: '포기했던 챌린지에 재도전이면 true (M-05: 같은 행을 되살림)',
    }),
  })
  .meta({ description: 'POST /challenges/{challengeId}/participation 응답 (201)' })
  .meta({ id: 'ParticipationResult' });

// ── 내 작업물 (추출본: GET /challenges/{challengeId}/works/me) ──
export const myWorkSchema = z
  .object({
    challengeId: z.number().int().positive(),
    participantId: z.number().int().positive(),
    isAbandoned: z.boolean(),
    totalWorks: z.number().int().nonnegative().meta({ example: 2 }),
    work: z
      .object({
        id: z.number().int().positive(),
        content: z.string(),
        submittedAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
      .nullable()
      .meta({
        example: null,
        description: '아직 서버 작업물이 없으면 null (D-19: 임시저장은 FE LocalStorage)',
      }),
  })
  .meta({ description: 'GET /challenges/{challengeId}/works/me 응답' })
  .meta({ id: 'MyWork' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────

// ── OpenAPI 경로 등록: 참여 현황 ───────────────────────────────

// ── OpenAPI 경로 등록: 도전하기 ───────────────────────────────

// ── OpenAPI 경로 등록: 포기 ───────────────────────────────────

// ── OpenAPI 경로 등록: 내 작업물 ─────────────────────────────

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const challengesPaths = {
  '/challenges': {
    get: {
      tags: ['Challenges'],
      summary: '챌린지 목록 조회',
      description:
        '비회원 가능. D-46 목록 형식({ items, page, size, totalItems, totalPages })으로 반환합니다.',
      requestParams: { query: challengeListQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: challengeListSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/challenges/{challengeId}': {
    get: {
      tags: ['Challenges'],
      summary: '챌린지 상세 조회',
      description: '비회원 가능. 마감·모집 완료 여부는 파생값(isClosed·isFull)으로 포함됩니다.',
      requestParams: { path: challengeIdParamSchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: challengeSchema } },
        },
        404: {
          description: '챌린지를 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/challenges/{challengeId}/participants': {
    get: {
      tags: ['Challenges'],
      summary: '챌린지 참여 현황 조회',
      description:
        '비회원 가능. 참여자별 작업물 목록과 호감수를 돌려줍니다. 정렬 sort=likes(호감수순) | submittedAt(제출순). ' +
        '⭐ 동률 보장(B-7 확정 2026-10-11): 최다 추천이 여러 개면 동률 전원이 응답에 포함돼요 — 화면 동점 캐러셀은 이 응답만으로 그려요.',
      requestParams: { path: challengeIdParamSchema, query: participantListQuerySchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: participantListSchema } },
        },
        404: {
          description: '챌린지를 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/challenges/{challengeId}/participation': {
    post: {
      tags: ['Challenges'],
      summary: '챌린지 도전하기',
      description:
        '로그인 필요. 본문 없음. 마감(D-24 now >= deadline) · 정원 초과(D-22) · 이미 참여 중이면 409 를 반환합니다. 포기했던 챌린지는 같은 참여 행을 되살립니다(M-05).',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      responses: {
        201: {
          description: '참여 생성(또는 재도전)',
          content: { 'application/json': { schema: participationResultSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '챌린지를 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        409: {
          description: '마감 · 정원 초과 · 이미 참여 중',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    delete: {
      tags: ['Challenges'],
      summary: '챌린지 포기하기',
      description:
        '로그인 필요. soft abandon 처리로 행은 보존하고 정원 집계에서만 제외합니다(D-10). 작업물을 이미 제출했다면 422 로 막습니다. 204 반환.',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      responses: {
        204: { description: '포기 완료' },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        409: {
          description: '참여하지 않은 챌린지',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        422: {
          description: '작업을 제출한 뒤에는 포기 불가',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/challenges/{challengeId}/works/me': {
    get: {
      tags: ['Challenges'],
      summary: '내 번역 작업물 불러오기',
      description:
        '참여자 필요. 아직 서버 작업물이 없으면 work: null 을 반환합니다 (D-19: 임시저장은 FE LocalStorage 이므로 구분해야 함).',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: myWorkSchema } },
        },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '참여하지 않은 챌린지',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
};
