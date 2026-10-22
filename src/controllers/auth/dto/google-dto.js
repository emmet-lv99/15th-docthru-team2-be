// src/controllers/auth/dto/google-dto.js — Google OAuth 요청 검증 스키마
//
//   · 시작(GET /auth/google)      : next(돌아갈 FE 경로, 선택)
//   · 콜백(GET /auth/google/callback): code · state(+ Google 이 보내는 error)
//
// next 는 state 안에 서명되어 함께 실려요 — 콜백에서 꺼내 안전하게 검사합니다.
import { z } from 'zod';

export const googleStartQuerySchema = z.object({
  next: z.string().optional().default('/'),
});

export const googleCallbackQuerySchema = z
  .object({
    code: z.string().min(1, '인가 코드가 필요합니다.').optional(),
    state: z.string().min(1, 'state가 필요합니다.'),
    error: z.string().min(1).optional(),
    error_description: z.string().optional(),
  })
  .refine(({ code, error }) => Boolean(code || error), {
    message: '인가 코드 또는 공급자 오류가 필요합니다.',
  });

// OpenAPI 문서용 — OpenAPI 변환기(zod-openapi) 는 .refine() 이 붙은 스키마를 파라미터로 읽지 못해요.
//   검증은 위 스키마가 하고, 문서에는 필드 모양만 같은 스키마를 씁니다.
export const googleCallbackQueryDocsSchema = z.object({
  code: z.string().min(1).optional().meta({ description: 'Google 이 돌려준 인가 코드' }),
  state: z.string().min(1).meta({ description: '시작 단계에서 만든 서명된 state' }),
  error: z
    .string()
    .min(1)
    .optional()
    .meta({ description: '사용자가 동의를 취소한 경우의 오류 코드' }),
  error_description: z.string().optional().meta({ description: '오류 상세 설명' }),
});
