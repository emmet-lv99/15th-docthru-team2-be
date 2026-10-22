// src/config/config.js — 환경 변수 검증 (Zod)
//
// ★ 규칙: 이 파일이 서비스의 환경변수 "목록"이다.
//   변수를 추가하려면 ① 스키마에 정의 → ② 아래 config 객체에 옮기고 →
//   ③ env/.env.development 에 값을 넣는다. 세 군데 다 해야 기동한다.
//
import { flattenError, z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().min(1000).max(65535).default(5001),
    // Postgres 연결 문자열만 허용해요 (postgres:// 또는 postgresql://)
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),

    // ── 배포·보안 ─────────────────────────────────────────────
    // PG 커넥션 상한. 서버리스에서 인스턴스가 동시에 떠도
    // 최대 인스턴스 × 이 값 으로 커넥션이 계산된다. 배포 시 둘을 맞춰 잡는다.
    DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),

    // 개발 계정 로그인 스위치. **기본 차단**.
    //   true 로도 production 에서는 절대 열리지 않는다.
    //   왜 플래그가 필요한가: NODE_ENV 의 기본값이 'development' 이므로
    //   `NODE_ENV !== 'production'` 만으로 조건을 걸면
    //   NODE_ENV 를 빼먹은 배포에서 우회 루트가 열린다.
    ENABLE_DEV_LOGIN: z
      .enum(['true', 'false'])
      .optional()
      .default('false')
      .transform((v) => v === 'true'),

    // ── 프론트 연동 ───────────────────────────────────────────
    CLIENT_BASE_URL: z.string().optional().default('http://localhost:3000'),
    API_BASE_URL: z.string().optional().default(''),
    CORS_ORIGINS: z.string().optional().default(''),

    // ── Google OAuth (선택) ───────────────────────────────────
    // ⚠️ 자격 증명이 없어도 앱은 정상으로 떠야 해요.
    //    값이 비어 있으면 /auth/google 이 302 대신 400 으로 "설정을 채워 달라"고 안내합니다.
    GOOGLE_CLIENT_ID: z.string().trim().optional().default(''),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional().default(''),
    // 비우면 API_BASE_URL + /auth/google/callback 으로 자동 생성해요.
    GOOGLE_REDIRECT_URI: z.string().trim().optional().default(''),
    // state 서명 키. 비우면 JWT_ACCESS_SECRET 을 대신 써서 앱이 그대로 뜨게 해요.
    //   (값을 넣을 때는 32자 이상 — 짧으면 기동 시 검증에서 걸립니다)
    OAUTH_STATE_SECRET: z.string().min(32).optional(),
  })
  // 강사님 정본과 같은 안전장치 — access/refresh 비밀키가 같으면 토큰 위조 위험이 커져요.
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET 과 JWT_REFRESH_SECRET 은 서로 다른 값이어야 합니다.',
    path: ['JWT_REFRESH_SECRET'],
  });

const parseEnvironment = () => {
  try {
    return { ok: true, data: envSchema.parse(process.env) };
  } catch (error) {
    const issues = flattenError(error);
    throw new Error(`환경 변수 검증 실패: ${JSON.stringify(issues.fieldErrors, null, 2)}`);
  }
};

const parsed = parseEnvironment();

// API 주소가 비어 있으면 로컬 기본값으로 채워요 — OAuth redirect_uri 를 만들 때 꼭 필요해요.
const apiBaseUrl = parsed.data.API_BASE_URL || `http://localhost:${parsed.data.PORT}/api/v1`;

const googleRedirectUri = parsed.data.GOOGLE_REDIRECT_URI || `${apiBaseUrl}/auth/google/callback`;

// 거래 쿠키를 콜백 경로에만 내려주려고 pathname 만 뽑아 둬요.
// (혹시 잘못된 URL 이 들어와도 앱이 죽지 않게 기본 경로로 되돌립니다)
const googleCallbackPath = (() => {
  try {
    return new URL(googleRedirectUri).pathname;
  } catch {
    return '/api/v1/auth/google/callback';
  }
})();

export const config = {
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parsed.data.PORT,
  DATABASE_URL: parsed.data.DATABASE_URL,
  JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET,
  DB_POOL_MAX: parsed.data.DB_POOL_MAX,
  ENABLE_DEV_LOGIN: parsed.data.ENABLE_DEV_LOGIN,
  CLIENT_BASE_URL: parsed.data.CLIENT_BASE_URL,
  API_BASE_URL: apiBaseUrl,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS,
  IS_PRODUCTION: parsed.data.NODE_ENV === 'production',

  // Google OAuth — 자격 증명이 비어 있어도 기동은 그대로 됩니다.
  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: googleRedirectUri,
  GOOGLE_CALLBACK_PATH: googleCallbackPath,
  // state 서명 키가 없으면 JWT_ACCESS_SECRET 을 대신 써요.
  //   왜 괜찮나요? 둘 다 서버만 아는 32자 이상 비밀값이고,
  //   state 는 "우리 서버가 서명했다"만 확인하면 되기 때문이에요.
  //   운영에서는 목적을 분리하려고 OAUTH_STATE_SECRET 을 따로 두는 것을 권해요.
  OAUTH_STATE_SECRET: parsed.data.OAUTH_STATE_SECRET || parsed.data.JWT_ACCESS_SECRET,
};
