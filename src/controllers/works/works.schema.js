// src/controllers/works/works.schema.js — Zod 검증 + OpenAPI 단일 진실 공급원 (D-20)
import { z } from 'zod';
import { errorResponseSchema, registerCommonErrorResponses } from '#docs/common.js';

/** 인증 필요 경로 표시 (D-50 securitySchemes) */
const secured = [{ accessTokenCookie: [] }];

export const workIdParamSchema = z
  .object({
    workId: z.coerce.number().int().positive().meta({ example: 12 }),
  })
  .meta({ description: '작업물 식별자' })
  .meta({ id: 'WorkIdParam' });

/** 챌린지 기준 경로용 — challenges.schema.js 의 ChallengeIdParam 과 동일 규칙 */
export const challengeIdParamSchema = z
  .object({
    challengeId: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ description: '챌린지 식별자' })
  .meta({ id: 'WorkChallengeIdParam' });

export const workSubmitBodySchema = z
  .object({
    content: z
      .string()
      .min(1, '번역 본문을 입력해주세요.')
      .max(100_000, '번역 본문이 너무 깁니다. (최대 100,000자)')
      .meta({ example: '<h1>라우팅 기초</h1><p>App Router…</p>', description: 'TipTap HTML' }),
  })
  .meta({ description: '작업물 제출·수정 본문' })
  .meta({ id: 'WorkSubmitBody' });

/** 어드민 삭제 사유 — 요구 2.6 / 추출본 API-명세 36행 */
/**
 * 작업물 삭제 본문 — 전부 선택이라 본문이 아예 없어도 통과해야 한다.
 * Express 5 에서 바디 없는 요청의 req.body 는 undefined 이므로
 * undefined → {} 로 정규화해 준다.
 */
export const workDeleteBodySchema = z
  .object({
    reason: z.string().min(1, '삭제 사유를 입력해주세요.').max(500).optional().meta({
      example: '원문 출처가 없어졌습니다.',
      description: '작성자 본인이 지울 때는 없어도 되고, 어드민이 지울 때는 필수(Service 가 판정)',
    }),
  })
  .nullish()
  .transform((value) => value ?? {})
  .meta({ description: '작업물 삭제 본문 (선택 — 본문 없이 호출해도 됨)' })
  .meta({ id: 'WorkDeleteBody' });

export const workAuthorSchema = z
  .object({
    id: z.number().int().positive(),
    nickname: z.string().meta({ example: '개밥life' }),
    grade: z.enum(['NORMAL', 'EXPERT']).nullable(),
  })
  .meta({ description: '작업물 작성자' })
  .meta({ id: 'WorkAuthor' });

export const workSchema = z
  .object({
    id: z.number().int().positive().meta({ example: 12 }),
    content: z.string().meta({ example: '<p>번역 본문</p>' }),
    submittedAt: z.string().datetime().meta({ example: '2026-10-01T10:00:00.000Z' }),
    updatedAt: z.string().datetime(),
    likeCount: z.number().int().nonnegative().meta({ example: 7 }),
    feedbackCount: z.number().int().nonnegative().meta({ example: 2 }),
    likedByMe: z
      .boolean()
      .meta({ description: '로그인 시에만 의미 있음. 비로그인 요청이면 false' }),
  })
  .meta({ description: '번역 작업물 (D-46 평문)' })
  .meta({ id: 'Work' });

export const workDetailSchema = workSchema
  .extend({
    author: workAuthorSchema,
    challenge: z
      .object({
        id: z.number().int().positive(),
        title: z.string(),
        category: z.enum(['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER']).meta({
          description: '시안(작업물 페이지) 분야 칩',
        }),
        documentType: z.enum(['OFFICIAL', 'BLOG', 'BOOK', 'OTHER']).meta({
          description: '시안(작업물 페이지) 문서 타입 칩',
        }),
        deadline: z.string().datetime(),
        status: z.enum(['IN_PROGRESS', 'CLOSED']),
        isClosed: z.boolean().meta({ description: 'D-24 파생값: now >= deadline' }),
      })
      .meta({ description: '연결된 챌린지' }),
  })
  .meta({ description: '작업물 상세 — 비회원 가능' })
  .meta({ id: 'WorkDetail' });

export const workSubmitResultSchema = z
  .object({
    work: workSchema,
    isNew: z.boolean().meta({
      example: true,
      description:
        'true=최초 제출(201) · false=기존 작업물 갱신(200). D-49: 제출마다 새 행이 아니라 최근 행을 갱신한다',
    }),
  })
  .meta({ description: 'PUT /challenges/{challengeId}/works/me 응답' })
  .meta({ id: 'WorkSubmitResult' });

export const likeResultSchema = z
  .object({
    workId: z.number().int().positive(),
    likedByMe: z.boolean().meta({ example: true }),
    likeCount: z.number().int().nonnegative().meta({ example: 8 }),
  })
  .meta({
    description: 'PUT /works/{workId}/like 응답 — 중복 요청도 같은 형태를 돌려준다(멱등)',
  })
  .meta({ id: 'WorkLikeResult' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────
const tag = 'Works';

/* ─────────── 서버 임시저장 (D-98 — 2026-10-10 채택) ───────────
 * 임시저장과 제출(works)는 완전히 분리된 별도 서랍이다.
 * 요구 2.4의 "첫 진입 시 모달" 불러오기를 서버 저장으로 재현하며,
 * 브라우저 저장(D-19)과의 차이는 기기 통합(어디서든 불러오기)이다.
 * ⚠️ 요구 원문(LocalStorage)과 다른 서버 저장 방식 — 형식은 이 스키마와 API-명세의 drafts 3건을 따릅니다.
 */

export const draftBodySchema = z
  .object({
    content: z.string().max(100_000, '임시저장 본문이 너무 깁니다. (최대 100,000자)').meta({
      example: '<h1>임시 저장 중인 번역…</h1>',
      description: 'TipTap HTML — 빈 값도 저장 가능',
    }),
  })
  .meta({ description: '임시저장 본문 ( 선택 — 내용 비우고 저장해도 됨 )' })
  .meta({ id: 'DraftBody' });

export const draftSchema = z
  .object({
    content: z.string().meta({ example: '<p>임시 번역…</p>' }),
    updatedAt: z.string().datetime(),
  })
  .meta({ description: '임시저장 (제출 전 초안 — 기기 통합을 위해 서버에 보관)' })
  .meta({ id: 'Draft' });

export const draftSaveResultSchema = z
  .object({
    saved: z.literal(true).meta({ description: '저장 완료 표식 — 화면에서 "자동 저장됨" 표시용' }),
    updatedAt: z.string().datetime().meta({ example: '2026-10-11T09:00:00.000Z' }),
  })
  .meta({ description: '임시저장 결과' })
  .meta({ id: 'DraftSaveResult' });

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const worksPaths = {
  '/challenges/{challengeId}/works/me': {
    put: {
      tags: [tag],
      summary: '내 번역 작업물 제출/수정',
      description:
        '참여자 필요. 마감 전(now < deadline)만 허용합니다(D-24). 최초 제출은 201, 이미 작업물이 있으면 200 으로 갱신합니다.',
      security: secured,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: workSubmitBodySchema } },
      },
      responses: {
        200: {
          description: '기존 작업물 갱신',
          content: { 'application/json': { schema: workSubmitResultSchema } },
        },
        201: {
          description: '최초 제출',
          content: { 'application/json': { schema: workSubmitResultSchema } },
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
  '/challenges/{challengeId}/works/{workId}': {
    get: {
      tags: [tag],
      summary: '번역 작업물 상세 조회',
      description: '비회원 가능. 로그인하면 likedByMe 에 하트 여부가 채워집니다.',
      requestParams: { path: workIdParamSchema },
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: workDetailSchema } },
        },
        404: {
          description: '작업물을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/works/{workId}': {
    patch: {
      tags: [tag],
      summary: '작업물 수정',
      description:
        '작성자 본인 또는 ADMIN. 요구 2.6 — 완료된(마감된) 챌린지의 작업물은 수정할 수 없습니다(409).',
      security: secured,
      requestParams: { path: workIdParamSchema },
      requestBody: {
        required: true,
        content: { 'application/json': { schema: workSubmitBodySchema } },
      },
      responses: {
        200: { description: '수정 성공', content: { 'application/json': { schema: workSchema } } },
        401: {
          description: '로그인 필요',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        403: {
          description: '권한 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        404: {
          description: '작업물을 찾을 수 없음',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        409: {
          description: '마감된 챌린지',
          content: { 'application/json': { schema: errorResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
    delete: {
      tags: [tag],
      summary: '작업물 삭제',
      description:
        '작성자 본인(사유 없음) 또는 ADMIN. 어드민이 다른 사람의 것을 지울 때는 reason 이 필수입니다. 완료된 챌린지는 불가(409).',
      security: secured,
      requestParams: { path: workIdParamSchema },
      requestBody: { content: { 'application/json': { schema: workDeleteBodySchema } } },
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
          description: '작업물을 찾을 수 없음',
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
  '/works/{workId}/like': {
    put: {
      tags: [tag],
      summary: '하트(추천) 누르기',
      description: '로그인 필요. 중복 요청은 멱등하게 현재 상태를 그대로 돌려줍니다.',
      security: secured,
      requestParams: { path: workIdParamSchema },
      responses: {
        200: {
          description: '하트 반영됨',
          content: { 'application/json': { schema: likeResultSchema } },
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
    delete: {
      tags: [tag],
      summary: '하트 취소',
      description: '로그인 필요. 이미 취소된 상태면 204 를 그대로 반환합니다(멱등).',
      security: secured,
      requestParams: { path: workIdParamSchema },
      responses: {
        204: { description: '하트 취소됨' },
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
  '/challenges/{challengeId}/drafts/me': {
    put: {
      tags: [tag],
      summary: '내 임시저장 저장 (신규/덮어쓰기)',
      description:
        '참여자 필요(D-98). 참여당 임시저장 1개 — 이미 있으면 덮어쓴다(200), 없으면 만든다(201). ' +
        '제출(works)와 무관한 별도 서랍이므로 마감 후에도 남은 초안을 저장할 수 없으면 409(CLOSED). ' +
        '재도전(M-05)은 참여 행 UPDATE로 되살리므로 임시저장도 participantId 하나로 추적된다.',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      requestBody: { content: { 'application/json': { schema: draftBodySchema } } },
      responses: {
        200: {
          description: '기존 임시저장 덮어쓰기',
          content: { 'application/json': { schema: draftSaveResultSchema } },
        },
        201: {
          description: '임시저장 새로 생성',
          content: { 'application/json': { schema: draftSaveResultSchema } },
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
    get: {
      tags: [tag],
      summary: '내 임시저장 조회',
      description:
        '참여자 필요(D-98). 에디터 첫 진입 시 불러오기 모달용. ' +
        '요구 2.4 — 임시 저장이 있으면 화면 진입 시 모달을 띄워야 한다. 임시저장이 없으면 draft 가 null 로 온다(404 아님).',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      responses: {
        200: {
          description: '조회 성공 (임시저장 없으면 draft: null)',
          content: {
            'application/json': {
              schema: z
                .object({
                  draft: draftSchema.nullable(),
                })
                .meta({ description: '내 임시저장 — 없으면 null' })
                .meta({ id: 'MyDraft' }),
            },
          },
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
    delete: {
      tags: [tag],
      summary: '내 임시저장 삭제 (버리기)',
      description:
        '참여자 필요(D-98). 제출하고 임시저장을 비우거나, 초안을 버리고 싶을 때. ' +
        '이미 없어도 204 를 그대로 돌려준다(멱등).',
      security: secured,
      requestParams: { path: challengeIdParamSchema },
      responses: {
        204: { description: '삭제 완료 (이미 없어도 204 — 멱등)' },
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
