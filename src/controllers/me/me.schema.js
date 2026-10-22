// src/controllers/me/me.schema.js — "나의 챌린지" Zod 검증 + OpenAPI (D-20)
//
// 추출본 API-명세.md 86~88행 · 요구사항.md 2.8 대응
//
// ⚠️ 쿼리 파라미터 명칭: 추출본은 `q,field,documentType,cursor,limit` 라고 적었으나
//    `field` 는 화면 용어이고 스키마 enum 은 Category 다.
//    challenges 목록과 **같은 이름(`category`)** 으로 통일했다 (D-13 결정).
import { z } from 'zod';
import {
  cursorQuerySchema,
  cursorPageSchema,
  errorResponseSchema,
  registerCommonErrorResponses,
} from '#docs/common.js';

const secured = [{ accessTokenCookie: [] }];

/** 진행중/완료 목록 공통 쿼리 */
export const myChallengeListQuerySchema = cursorQuerySchema
  .extend({
    q: z.string().min(1).optional().meta({ example: 'Next.js', description: '제목·원문본문 검색' }),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']).optional().meta({
      description: '기술 분야 필터 (추출본 표기 `field` 와 동일한 값)',
    }),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']).optional().meta({
      description: '문서 타입 필터',
    }),
  })
  .meta({ description: '나의 챌린지 목록 쿼리 (커서 기반 무한스크롤)' });

/** 내 신청 목록 쿼리 */
export const myApplicationListQuerySchema = cursorQuerySchema
  .extend({
    q: z.string().min(1).optional().meta({ example: 'React', description: '신청 제목 검색' }),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional().meta({
      example: 'PENDING',
      description: '신청 상태 필터 (요구 2.8 의 승인 대기·승인·거절)',
    }),
  })
  .meta({ description: '내 신청 목록 쿼리' });

export const myChallengeBriefSchema = z
  .object({
    id: z.number().int().positive().meta({ example: 1 }),
    title: z.string().meta({ example: '파이썬 초급' }),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']),
    deadline: z.string().datetime().meta({ example: '2026-10-31T15:00:00.000Z' }),
    status: z.enum(['IN_PROGRESS', 'CLOSED']),
    maxParticipants: z.number().int().positive(),
    participantCount: z.number().int().nonnegative(),
    isClosed: z.boolean().meta({ description: 'D-24 파생값: now >= deadline' }),
  })
  .meta({ description: '챌린지 요약' })
  .meta({ id: 'MyChallengeBrief' });

export const myChallengeItemSchema = z
  .object({
    participationId: z.number().int().positive(),
    joinedAt: z.string().datetime(),
    challenge: myChallengeBriefSchema,
    totalWorks: z.number().int().nonnegative().meta({
      example: 1,
      description: 'D-49: 참여 1:N — 제출한 번역문 개수',
    }),
    latestWork: z
      .object({
        id: z.number().int().positive(),
        submittedAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
      .nullable()
      .meta({ description: "'계속 도전하기' 판단용. 제출 전이면 null" }),
  })
  .meta({ description: '내 챌린지 1건 + 내 작업물 요약' })
  .meta({ id: 'MyChallengeItem' });

export const myChallengeListSchema = cursorPageSchema
  .extend({ items: z.array(myChallengeItemSchema) })
  .meta({ description: 'D-54 커서 응답: { items, cursor, limit, hasMore }' })
  .meta({ id: 'MyChallengeList' });

export const myApplicationItemSchema = z
  .object({
    applicationId: z.number().int().positive(),
    title: z.string().meta({ example: 'React 공식 문서 번역' }),
    category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']),
    documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']),
    sourceUrl: z.string(),
    desiredDeadline: z.string().datetime().meta({
      description: '신청자가 희망한 마감일 (스키마 컬럼명 desiredDeadline)',
    }),
    maxParticipants: z.number().int().positive(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).meta({
      example: 'PENDING',
      description: '요구 2.8 — 승인 대기 / 승인 / 거절',
    }),
    rejectionReason: z.string().nullable().meta({
      example: '참여 인원 초과',
      description: '요구 2.8 — 신청 거절 사유 조회',
    }),
    decidedAt: z.string().datetime().nullable().meta({ description: '상태 변경 날짜 (알림 근거)' }),
    cancelledAt: z.string().datetime().nullable(),
    approvedChallenge: z
      .object({
        id: z.number().int().positive(),
        title: z.string(),
        deadline: z.string().datetime(),
        status: z.enum(['IN_PROGRESS', 'CLOSED']),
      })
      .nullable()
      .meta({ description: '요구 2.8 — 승인됨이면 상세 페이지로 이동' }),
    createdAt: z.string().datetime(),
  })
  .meta({ description: '내 신규 챌린지 신청 1건' })
  .meta({ id: 'MyApplicationItem' });

export const myApplicationListSchema = cursorPageSchema
  .extend({ items: z.array(myApplicationItemSchema) })
  .meta({ description: 'D-54 커서 응답' })
  .meta({ id: 'MyApplicationList' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────
const tag = 'Me';

const listResponses = (itemSchema, listSchema) => ({
  200: { description: '조회 성공', content: { 'application/json': { schema: listSchema } } },
  401: {
    description: '로그인 필요',
    content: { 'application/json': { schema: errorResponseSchema } },
  },
  ...registerCommonErrorResponses(),
});

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const mePaths = {
  '/me/challenges/participating': {
    get: {
      tags: [tag],
      summary: '참여 중인 내 챌린지 목록',
      description:
        '로그인 필요. 요구 2.8 — 무한스크롤. 포기하지 않은 참여 + 미마감 챌린지. ' +
        "'계속 도전하기' 판단용 totalWorks·latestWork 를 함께 준다.",
      security: secured,
      requestParams: { query: myChallengeListQuerySchema },
      responses: listResponses(myChallengeItemSchema, myChallengeListSchema),
    },
  },
  '/me/challenges/completed': {
    get: {
      tags: [tag],
      summary: '완료한 내 챌린지 목록',
      description: '로그인 필요. 요구 2.8 — 마감되었거나 CLOSED 인 참여 + 제출물 요약. 무한스크롤.',
      security: secured,
      requestParams: { query: myChallengeListQuerySchema },
      responses: listResponses(myChallengeItemSchema, myChallengeListSchema),
    },
  },
  '/me/challenges/applications': {
    get: {
      tags: [tag],
      summary: '내가 신청한 챌린지 목록',
      description:
        '로그인 필요. 요구 2.8 — 상태(승인 대기·승인·거절)와 거절 사유를 돌려준다. ' +
        '승인 건은 연결된 챌린지를 담아 상세 페이지로 이동할 수 있게 한다. ' +
        '무한스크롤.',
      security: secured,
      requestParams: { query: myApplicationListQuerySchema },
      responses: listResponses(myApplicationItemSchema, myApplicationListSchema),
    },
  },
};
