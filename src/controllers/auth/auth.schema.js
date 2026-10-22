// 인증 Zod 스키마 — 검증과 OpenAPI 문서를 한 곳에서 얻는다 (D-20)
//
// ★ 계약(약속) 파일입니다 — 보일러플레이트 작업자가 제공했어요.
//   회원가입·로그인·로그아웃·me 4의 필드·응답이 여기 정해져 있으니
//   담당자님은 이 파일을 수정할 필요 없이 컨트롤러·서비스만 구현해 주세요.
//   (응답이 이 스키마와 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 가 나옵니다)
//
// 📌 Google OAuth 2경로(/auth/google · /auth/google/callback)도 계약에 포함됐어요.
//   요청 검증은 controllers/auth/dto/google-dto.js 가 맡고, OpenAPI 등록은 이 파일 아래에서 해요.
//   자격 증명(CLIENT_ID·SECRET)이 없으면 시작 라우트가 400 으로 안내합니다 (앱은 정상 기동).
import { z } from 'zod';
import { registerCommonErrorResponses } from '#docs/common.js';
import { googleCallbackQueryDocsSchema, googleStartQuerySchema } from './dto/google-dto.js';

// ── 공통 응답 ───────────────────────────────────────────────────
export const userSchema = z
  .object({
    id: z.number().int().positive().meta({ example: 1 }),
    email: z.string().email().meta({ example: 'user@example.com' }),
    nickname: z.string().meta({ example: '체다치즈' }),
    role: z.enum(['USER', 'ADMIN']).meta({ example: 'USER' }),
    grade: z.enum(['NORMAL', 'EXPERT']).meta({
      example: 'NORMAL',
      description: 'D-47: 참여/추천 수로 산출. OAuth 계정도 NORMAL 로 시작',
    }),
  })
  .meta({ description: '인증된 사용자 공개 정보 (비밀번호 해시·토큰 미포함)' })
  .meta({ id: 'AuthUser' });

export const meResponseSchema = userSchema
  .extend({
    stats: z
      .object({
        participationCount: z.number().int().nonnegative().meta({
          example: 3,
          description: 'D-10: 포기(abandonedAt)한 참여도 포함',
        }),
        applicationCount: z.number().int().nonnegative().meta({ example: 1 }),
        feedbackCount: z.number().int().nonnegative().meta({ example: 7 }),
      })
      .meta({ description: '활동 집계' }),
    /** 등급 진행도 (D-90 · B-1 기본값 확정 2026-10-11) — 마이페이지 진행바 재료.
     *  서비스가 GRADE_THRESHOLD 상수와 함께 채워 준다.
     */
    gradeProgress: z
      .object({
        participationCount: z.number().int().nonnegative().meta({
          example: 3,
          description: '전체 참여 횟수 (포기 포함 · D-10 등급 기준)',
        }),
        recommendationCount: z.number().int().nonnegative().meta({
          example: 2,
          description:
            '추천 선정 횟수 = 내 작업물이 최다 추천(공동 1위 포함)인 마감 챌린지 수 (요구 2.2)',
        }),
        thresholds: z
          .object({
            PARTICIPATION: z.literal(5).meta({ description: '참여 ≥5 AND 추천 ≥5 조건' }),
            RECOMMENDATION: z.literal(5).meta({ description: '참여 ≥5 AND 추천 ≥5 조건' }),
            PARTICIPATION_ALONE: z.literal(10).meta({ description: '참여 ≥10 단독 조건' }),
            RECOMMENDATION_ALONE: z.literal(10).meta({ description: '추천 ≥10 단독 조건' }),
          })
          .meta({
            description:
              '전문가 등급 임계값 — 서버 상수(GRADE_THRESHOLD)를 그대로 노출 (D-90 하드코딩 방지)',
          }),
      })
      .meta({
        description:
          '등급 진행도 (D-90 · B-1 기본값 확정 2026-10-11) — 마이페이지가 하드코딩 없이 임계값을 그려 쓰게 해 줘요. ' +
          '달성 조건 3종: (참여5 AND 추천5) ∨ (참여10) ∨ (추천10)',
      }),
    createdAt: z.string().datetime().meta({ example: '2026-09-30T10:00:00.000Z' }),
  })
  .meta({ description: 'GET /auth/me 응답 — 사용자 + 활동 집계 + 등급 진행도 (D-90)' })
  .meta({ id: 'AuthMeResponse' });

// ── 요청 스키마 ─────────────────────────────────────────────────

/** bcrypt 6 가 해싱하는 길이는 '문자 수가 아니라 바이트 수' 다.
 *  한글 1글자 = 3바이트라서 .max(72) 로 걸면 72바이트 제한을 우회한다
 *  (한글 72자 = 216바이트가 그대로 통과해 bcrypt 가 72바이트 뒤를 잘라 버린다).
 *  그래서 Buffer.byteLength 로 72바이트를 직접 검사한다.
 */
const BCRYPT_MAX_BYTES = 72;

const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES, {
    message: `비밀번호는 ${BCRYPT_MAX_BYTES}바이트 이하여야 합니다. (한글·한자 등은 1자당 3바이트로 계산됩니다)`,
  })
  .meta({
    example: 'password1234',
    description: `8자 이상. bcrypt 72바이트 제한을 UTF-8 바이트 기준으로 검증합니다 (최대 ${BCRYPT_MAX_BYTES} bytes).`,
  });

export const signUpSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.').meta({ example: 'user@example.com' }),
    nickname: z
      .string()
      .min(2, '닉네임은 2자 이상이어야 합니다.')
      .max(20, '닉네임은 20자 이하여야 합니다.')
      .meta({ example: '체다치즈' }),
    password: passwordSchema,
  })
  .meta({ description: '이메일 회원가입 요청' })
  .meta({ id: 'SignUpRequest' });

export const loginSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.').meta({ example: 'user@example.com' }),
    password: z.string().min(1, '비밀번호를 입력해주세요.').meta({ example: 'password1234' }),
  })
  .meta({ description: '이메일 로그인 요청' })
  .meta({ id: 'LoginRequest' });

// ── OpenAPI 경로 등록 ──────────────────────────────────────────
const authTag = 'Auth';
const secured = [{ accessTokenCookie: [] }];

// ── Google OAuth 2경로 ─────────────────────────────────────────
// 302 리다이렉트가 본체예요 — 성공하면 Google 화면 또는 CLIENT_BASE_URL 로 이동합니다.

// ── OpenAPI 경로 (강사님 정본 — 인라인 paths) ──
export const authPaths = {
  '/auth/signup': {
    post: {
      tags: [authTag],
      summary: '이메일 회원가입',
      description: '비회원. 가입 성공 시 access/refresh 토큰을 httpOnly 쿠키로 설정합니다 (D-06).',
      requestBody: { required: true, content: { 'application/json': { schema: signUpSchema } } },
      responses: {
        201: {
          description: '가입 성공 (user 본문 + 쿠키)',
          content: { 'application/json': { schema: userSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: [authTag],
      summary: '이메일 로그인',
      description: '비회원. 로그인 성공 시 토큰을 httpOnly 쿠키로 설정합니다 (D-06).',
      requestBody: { required: true, content: { 'application/json': { schema: loginSchema } } },
      responses: {
        200: {
          description: '로그인 성공',
          content: { 'application/json': { schema: userSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: [authTag],
      summary: '로그아웃',
      description:
        '인증 불필요(멱등). 쿠키를 만료시키고 204 를 반환합니다.\n\n' +
        '⚠️ 토큰 유효성을 강제하지 **않는** 이유: access token 이 이미 만료된 상태에서 로그아웃을 호출하는 경우가 흔합니다. ' +
        '이때 401 로 막으면 쿠키가 지워지지 않아 사용자가 계속 로그인된 상태로 남습니다. ' +
        'clearAuthTokens 는 쿠키만 지우므로 인증 없이 호출해도 안전합니다.',
      // security 를 붙이지 않는다 — 위 설명 참고. 이전에는 'secured' 로 선언되어
      // 계약(인증 필요)과 실제 동작(인증 없이 204) 이 어긋나 있었다.
      responses: {
        204: { description: '로그아웃 성공' },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: [authTag],
      summary: '현재 사용자 조회',
      description: '로그인 필요. 사용자 정보와 활동 집계를 함께 반환합니다.',
      security: secured,
      responses: {
        200: {
          description: '조회 성공',
          content: { 'application/json': { schema: meResponseSchema } },
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/auth/google': {
    get: {
      tags: [authTag],
      summary: 'Google 로그인 시작',
      description:
        '비회원. state(서명·10분 만료)와 PKCE(code_challenge)를 만들어 Google 인증 화면으로 302 이동합니다. ' +
        'state nonce·code_verifier 는 httpOnly 거래 쿠키로 내려가요.\n\n' +
        '⚠️ GOOGLE_CLIENT_ID·GOOGLE_CLIENT_SECRET 이 비어 있으면 302 대신 400 으로 안내합니다.',
      requestParams: { query: googleStartQuerySchema },
      responses: {
        302: {
          description: 'Google 인증 화면으로 이동 (Set-Cookie: OAuth 거래 쿠키)',
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
  '/auth/google/callback': {
    get: {
      tags: [authTag],
      summary: 'Google 로그인 콜백',
      description:
        'Google 이 돌려준 code·state 를 검증하고(PKCE 포함) 토큰을 교환합니다. ' +
        '연결된 OAuthAccount → 같은 이메일 계정 연결 → 새 계정+연결 순으로 사용자를 정한 뒤 ' +
        '독스루 access/refresh 토큰을 httpOnly 쿠키로 설정하고 CLIENT_BASE_URL(+next)로 302 이동합니다.',
      requestParams: { query: googleCallbackQueryDocsSchema },
      responses: {
        302: {
          description: '로그인 완료 — accessToken·refreshToken 쿠키 설정 후 FE 로 이동',
        },
        ...registerCommonErrorResponses(),
      },
    },
  },
};
