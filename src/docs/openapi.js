// src/docs/openapi.js — OpenAPI 문서 조립 (zod-openapi · 강사님 정본)
//
// 각 도메인 스키마가 **인라인 paths** 를 export 하고, 여기서 하나로 모아
// createDocument 로 문서를 만든다. (강사님 정본과 같은 방식)
import { createDocument } from 'zod-openapi';
import { config } from '#config';
import pkg from '../../package.json' with { type: 'json' };
import { securitySchemes } from './common.js';

// ── 도메인별 인라인 paths ─────────────────────────────────────
import { authPaths } from '#controllers/auth/auth.schema.js';
import { challengesPaths } from '#controllers/challenges/challenges.schema.js';
import { applicationsPaths } from '#controllers/applications/applications.schema.js';
import { worksPaths } from '#controllers/works/works.schema.js';
import { feedbacksPaths } from '#controllers/feedbacks/feedbacks.schema.js';
import { mePaths } from '#controllers/me/me.schema.js';
import { notificationsPaths } from '#controllers/notifications/notifications.schema.js';
import { adminPaths } from '#controllers/admin/admin.schema.js';

const paths = {};
// 같은 경로를 여러 도메인이 나눠 등록할 수 있어(예: /challenges/{challengeId}/works/me GET·PUT)
// 경로별로 메서드를 병합한다 (단순 spread 는 뒤 도메인이 앞 도메인을 덮어씀).
for (const fragment of [
  authPaths,
  challengesPaths,
  applicationsPaths,
  worksPaths,
  feedbacksPaths,
  mePaths,
  notificationsPaths,
  adminPaths,
]) {
  for (const [path, item] of Object.entries(fragment)) {
    paths[path] = { ...(paths[path] ?? {}), ...item };
  }
}

// ── 문서 생성 ────────────────────────────────────────────────
export const generateOpenApiSpec = () =>
  createDocument({
    openapi: '3.1.0',
    info: {
      title: '독스루(Docthru) API',
      version: pkg.version,
      description: [
        '번역 챌린지 서비스 백엔드 API.',
        '',
        '- Base URL: `/api/v1`',
        '- 응답 형식: 목록 `{ items, page, size, totalItems, totalPages }` · 단건 리소스 그대로 · 오류 `{ code, message, details }`',
        '- 인증: httpOnly 쿠키 `accessToken`',
        '- 시간: ISO 8601 UTC 저장/전달',
        '',
        '이 문서는 Zod 스키마에서 자동 생성됩니다. 손으로 고치면 다음 생성 때 덮어써져요.',
      ].join('\n'),
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/api/v1`,
        description: '개발 서버',
      },
    ],
    components: { securitySchemes },
    paths,
  });
