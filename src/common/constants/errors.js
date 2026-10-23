// API 오류 코드 (D-46: B API-명세.md "공통 오류" 정의 그대로)
// 응답 형식: { code, message, details } — 래퍼 없음
export const ERROR_CODE = {
  // B 문서 공통 오류 6종
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // 도메인 오류 (B 문서 예시: CHALLENGE_CLOSED)
  CHALLENGE_CLOSED: 'CHALLENGE_CLOSED',
  CHALLENGE_FULL: 'CHALLENGE_FULL',
  ALREADY_PARTICIPATED: 'ALREADY_PARTICIPATED',
  NOT_PARTICIPANT: 'NOT_PARTICIPANT',
  WORK_NOT_FOUND: 'WORK_NOT_FOUND',
  FEEDBACK_NOT_FOUND: 'FEEDBACK_NOT_FOUND',
  ALREADY_LIKED: 'ALREADY_LIKED',
  NOT_FOUND_CODE: 'RESOURCE_NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  // 개발 환경 전용: 응답이 OpenAPI 스키마와 어긋남 (responses.js 가 던진다)
  RESPONSE_CONTRACT_MISMATCH: 'RESPONSE_CONTRACT_MISMATCH',
};

// DB 오류 상수 — Prisma 8 은 DB 오류를 P2002 코드가 아니라
// Postgres 원본 SQLSTATE 로 던져요. 그래서 고유 제약 위반(23505)만 상수로 둡니다.
export const DB_ERROR = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
};

// 사용자 노출 메시지
export const ERROR_MESSAGE = {
  // 일반
  RESOURCE_NOT_FOUND: '리소스를 찾을 수 없습니다.',
  BAD_REQUEST: '잘못된 요청입니다.',
  RESOURCE_CONFLICT: '이미 존재하는 리소스입니다.',
  INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',

  // 인증·권한
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  NO_AUTH_TOKEN: '인증 토큰이 없습니다.',
  INVALID_TOKEN: '인증 토큰이 유효하지 않거나 만료되었습니다.',
  SOCIAL_AUTH_FAILED: '소셜 로그인에 실패했습니다.',
  INVALID_SOCIAL_AUTH_STATE: '유효하지 않거나 만료된 소셜 인증 상태입니다.',
  SOCIAL_ACCOUNT_LINK_REQUIRED: '기존 계정으로 로그인한 뒤 소셜 계정을 연결해주세요.',
  OAUTH_CODE_REQUIRED: 'Google 인가 코드가 필요합니다.',
  // 구글 자격 증명이 비어 있을 때 302 대신 400 으로 안내해요 (앱은 정상 기동).
  GOOGLE_OAUTH_NOT_CONFIGURED:
    '구글 로그인 설정이 아직 완료되지 않았어요. backend/env/.env.development 에 ' +
    'GOOGLE_CLIENT_ID 와 GOOGLE_CLIENT_SECRET 을 채운 뒤 다시 시도해 주세요.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  NICKNAME_TAKEN: '이미 사용 중인 닉네임입니다.',
  PASSWORD_RESET_REQUESTED:
    '비밀번호 재설정 안내를 보냈습니다. 메일함을 확인해 주세요. (가입된 이메일인 경우)',
  INVALID_RESET_TOKEN: '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.',

  // 챌린지
  CHALLENGE_NOT_FOUND: '챌린지를 찾을 수 없습니다.',
  CHALLENGE_CLOSED: '마감된 챌린지입니다.',
  CHALLENGE_FULL: '모집 인원이 가득 찬 챌린지입니다.',
  ALREADY_PARTICIPATED: '이미 참여 중인 챌린지입니다.',
  NOT_PARTICIPANT: '참여하지 않은 챌린지입니다.',
  CANNOT_ABANDON_AFTER_SUBMIT: '작업을 제출한 뒤에는 포기할 수 없습니다.',

  // 작업물
  WORK_NOT_FOUND: '작업물을 찾을 수 없습니다.',

  // 피드백
  FEEDBACK_NOT_FOUND: '피드백을 찾을 수 없습니다.',
  NOT_OWN_FEEDBACK: '본인의 피드백이 아닙니다.',
  ALREADY_LIKED: '이미 추천한 작업물입니다.',
  NOT_OWNER: '본인의 작업물이 아닙니다.',
};
