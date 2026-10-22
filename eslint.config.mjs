// eslint.config.mjs — ESLint 9 flat config
//
// client/eslint.config.mjs 와 같은 구조다 (그쪽은 0건 통과).
// 서버에는 eslint-config-next 가 필요 없으므로 js.configs.recommended 만 쓴다.
import js from '@eslint/js';
import globals from 'globals';

const config = [
  {
    ignores: ['node_modules/**', 'src/generated/**', 'coverage/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      // 2025 로 올려야 import attributes(`import pkg from './x.json' with { type: 'json' }`)
      // 를 파싱할 수 있다 — docs/swagger.js 가 이 문법을 쓴다. Node 26 이 지원한다.
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      // 서버는 실행 환경이 이미 확인된 경로다.
      // 사용하지 않는 값은 남아 있으면 실수로 읽힐 수 있으므로 경고로 유지한다.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // await 안에서 쓰는 프라미스 규칙 (node:test 는 await 미사용)
      'no-console': 'off',
    },
  },

  // 테스트는 describe/it 없이도 쓸 수 있게 leniency
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];

export default config;
