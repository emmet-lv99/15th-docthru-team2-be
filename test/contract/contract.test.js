// test/contract/contract.test.js — 구조 계약 테스트
//
//
//   ① 라우터 미부착         → GET 을 보내면 Express 기본 404 HTML("Cannot GET") 이 나온다
//   ② 중앙 스키마 누락(D-51) → 라우트는 되는데 Swagger 문서에 경로가 안 뜬다
//   ③ DI 등록 누락          → 서버 기동 실패 (AwilixResolutionError)
//   ④ 명세와 코드가 어긋남   → 아무도 점검 못해서 나중에 FE/BE 가 서로 다른 걸 만든다
//
//   이 테스트는 앱을 임의 포트(0)로 직접 띄워서 실제 요청으로 확인합니다.
//   `pnpm test` 는 스모크만(항상 초록), 이 파일은 `pnpm test:contract` 로 따로 점검해요.
//
//   💡 팀원 여러분에게 — 지금은 도메인 구현이 안 돼서 ① 이 빨간불이 많은 게 정상입니다.
//      본인 도메인을 구현할 때마다 관련 경로 테스트가 하나씩 초록이 되므로,
//      "오늘 몇 개 남았는지" 확인 용도로 즐겁게 써 주세요.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createContainer } from '#common/di/container.js';
import { App } from '../../src/app.js';
import { generateOpenApiSpec } from '#docs/swagger.js';

let server;
let baseUrl;

before(async () => {
  const { controller, authMiddleware } = createContainer();
  const app = new App(controller, authMiddleware);
  server = app.listen(0); // 0 = 임의의 빈 포트 (동시 실행 충돌 방지)
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/** OpenAPI 문서에서 path → methods → 보안 여부 를 뽑아낸다 */
function loadSpecOps() {
  const spec = generateOpenApiSpec();
  const operations = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      if (!item[method]) continue;
      operations.push({
        method: method.toUpperCase(),
        path,
        secured: (item[method].security ?? []).length > 0,
      });
    }
  }
  return { spec, operations };
}

/** API-명세.md 표에서 `METHOD | /path` 행을 뽑아낸다 (사람이 합의한 경로 목록) */
function loadMarkdownRows() {
  // ⚠️ new URL(...).pathname 은 한글 경로를 퍼센트 인코딩해 버린다 → fileURLToPath 를 쓴다
  const markdownPath = fileURLToPath(new URL('../../API-명세.md', import.meta.url));
  const lines = readFileSync(markdownPath, 'utf8').split('\n');
  const rows = [];
  for (const line of lines) {
    const m = line.match(/^\|\s*`([A-Z]+)`\s*\|\s*`([^`]+)`\s*\|/);
    if (m) rows.push({ method: m[1], path: m[2] });
  }
  assert.ok(
    rows.length > 0,
    'API-명세.md 에서 표 행을 하나도 못 찾았다 — 문서 형식이 바뀌었을 수 있다',
  );
  return rows;
}

// ── ③ DI 컨테이너 해석 ──────────────────────────────────────────
describe('③ DI 컨테이너 해석', () => {
  test('createContainer() 가 문제 없이 해석된다', () => {
    let cradle;
    assert.doesNotThrow(() => {
      cradle = createContainer();
    }, 'DI 해석 실패 — container.js 에 등록이 빠졌을 수 있다 (사례: OOOController)');
    assert.ok(cradle.controller, 'controller 가 주입되지 않았다');
    assert.ok(cradle.authMiddleware, 'authMiddleware 가 주입되지 않았다');
  });

  test('등록된 컨트롤러·인프라 인스턴스를 실제로 만들 수 있다', () => {
    const cradle = createContainer();
    // 프록시 해석을 강제한다 — 등록만 돼 있고 쓰지 않으면 여기서 걸린다
    for (const key of ['controller', 'authMiddleware', 'authController']) {
      assert.ok(cradle[key], `${key} 해석 실패`);
    }
    assert.equal(typeof cradle.controller.routes, 'function');
  });
});

// ── ② D-51 중앙 스키마 누락 ─────────────────────────────────────
describe('② OpenAPI 문서 등록 상태 (D-51)', () => {
  test('스키마 파일이 있는 모든 도메인이 docs/openapi.js 에 import 되어 있다', () => {
    // ⚠️ new URL(...).pathname 은 한글 경로를 퍼센트 인코딩해 버린다 → fileURLToPath 를 쓴다
    const controllersDir = fileURLToPath(new URL('../../src/controllers/', import.meta.url));
    const schemasJsSource = readFileSync(
      fileURLToPath(new URL('../../src/docs/openapi.js', import.meta.url)),
      'utf8',
    );

    const domains = readdirSync(controllersDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    assert.ok(domains.length > 0, '컨트롤러 폴더가 하나도 없다');

    const missing = domains.filter((d) => {
      // 스키마 파일이 아직 없는 도메인(dev 등)은 검사에서 건너뛴다
      const hasSchema = existsSync(`${controllersDir}${d}/${d}.schema.js`);
      if (!hasSchema) return false;
      return !schemasJsSource.includes(`#controllers/${d}/${d}.schema.js`);
    });

    assert.deepEqual(
      missing,
      [],
      `Swagger 에 이 도메인 경로가 안 뜬다: ${missing.join(', ')}. ` +
        '`src/docs/openapi.js` 에 import 를 추가해 주세요.',
    );
  });

  test('문서에 경로가 제대로 등록되어 있다 (계약 46건 + Google OAuth 2건 = 48건)', () => {
    const { operations } = loadSpecOps();
    assert.ok(
      operations.length >= 48,
      `계약 스키마를 모두 담으면 오퍼레이션 48건이 나옵니다 (지금 ${operations.length}건) — ` +
        '스키마 모듈이 로드되지 않았을 수 있어요',
    );
  });
});

// ── ⑤ 명세 ↔ 코드 대조 ─────────────────────────────────────────
//
// API-명세.md (사람이 합의한 경로 목록)과 generateOpenApiSpec() (코드에서 재생성한 문서)을
// 양방향으로 대조한다. 여기서 어긋나면 FE/BE 가 서로 다른 API 를 만들게 된다.
describe('⑤ 명세 ↔ 코드 대조', () => {
  const markdownRows = loadMarkdownRows();
  const { operations } = loadSpecOps();

  // Google OAuth 2경로도 이제 계약에 포함이다 — 명세·스키마 양쪽에서 함께 대조한다.
  const contractRows = markdownRows;
  const toKey = (r) => `${r.method} ${r.path}`;

  test('코드(스펙)에 있는 경로는 명세에도 있다 — 무단 추가 잡기', () => {
    const contractKeys = new Set(contractRows.map(toKey));
    const stray = operations.filter((op) => !contractKeys.has(toKey(op)));
    assert.deepEqual(
      stray,
      [],
      `${stray.map(toKey).join(', ')} 이 API-명세.md 에 없다. ` +
        '팀 합의 문서에도 경로를 반영해 주세요 (놔두면 FE 가 알 수 없어요).',
    );
  });

  test('명세에 있는 경로는 코드(스펙)에도 있다 — 스키마 누락·오타 잡기', () => {
    const specKeys = new Set(operations.map(toKey));
    const missing = contractRows.filter((r) => !specKeys.has(toKey(r)));
    assert.deepEqual(
      missing,
      [],
      `${missing.map(toKey).join(', ')} 이 스키마에 등록되어 있지 않다. ` +
        '도메인 스키마에 registerPath 를 추가했는지, 경로 오타는 없는지 점검해 주세요.',
    );
  });
});

// ── ① 라우터 미부착 + 인증 계약 ─────────────────────────────────
describe('① 라우팅 계약 — 문서의 경로가 실제로 살아 있나', () => {
  const { operations } = loadSpecOps();

  // {challengeId} 같은 템플릿을 실제 값으로 바꿔 본다 (존재 확인용)
  const concrete = (path) =>
    path
      .replace(/\{challengeId\}/g, '1')
      .replace(/\{workId\}/g, '1')
      .replace(/\{feedbackId\}/g, '1')
      .replace(/\{notificationId\}/g, '1')
      .replace(/\{applicationId\}/g, '1');

  for (const op of operations) {
    test(`${op.method} ${op.path}`, async () => {
      // 본문이 필요한 메서드는 빈 객체로 보낸다.
      // 400 이 돌아오면 Zod 검증까지 도달했다는 뜻이므로 "라우트 존재" 증거가 된다.
      const withBody = ['POST', 'PUT', 'PATCH'].includes(op.method);
      const res = await fetch(baseUrl + concrete(op.path), {
        method: op.method,
        ...(withBody && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      });
      const text = await res.text();

      // Express 기본 404 는 HTML 이고 "Cannot GET" 같은 문자열이 들어 있다
      assert.ok(
        !text.includes('Cannot '),
        `이 경로가 아직 구현되지 않았어요 (Express 기본 404 감지). ` +
          `${'컨트롤러 구현 → DI 등록 → controllers/index.js 조립'}의 3단계를 모두 했는지 확인해 보세요. ` +
          '아직 구현 전이라면 정상 — 구현할 때마다 이 테스트가 하나씩 초록이 됩니다.',
      );

      if (op.secured) {
        assert.equal(
          res.status,
          401,
          `보호 경로는 인증 없으면 401 이어야 한다 (실제 ${res.status}) — ` +
            'needsLogin 미들웨어를 빠뜨렸을 수 있어요 (D-56)',
        );
      }
      // 공개 경로가 서비스 단에서 DB 를 건드리면 500 이 나올 수 있지만,
      // 이 테스트는 "라우트가 붙어 있는가" 만 확인한다 (DB 접속 없이도 돌아가게).
      // 응답 본문이 스키마와 같은지는 dev 에서 sendData(...) 어서션이 맡는다.
    });
  }
});

// ── 진행률 요약 (정보성 — 항상 통과) ─────────────────────────────
describe('실행 요약', () => {
  test('구현 진행률 보고', async () => {
    const { operations } = loadSpecOps();
    const concreteOf = (path) =>
      path
        .replace(/\{challengeId\}/g, '1')
        .replace(/\{workId\}/g, '1')
        .replace(/\{feedbackId\}/g, '1')
        .replace(/\{notificationId\}/g, '1')
        .replace(/\{applicationId\}/g, '1');
    let ok = 0;
    const left = [];
    for (const op of operations) {
      const withBody = ['POST', 'PUT', 'PATCH'].includes(op.method);
      const res = await fetch(baseUrl + concreteOf(op.path), {
        method: op.method,
        ...(withBody && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      });
      const text = await res.text();
      if (text.includes('Cannot ')) left.push(`${op.method} ${op.path}`);
      else ok += 1;
    }
    console.log(
      `\n  📈 구현 진행률 — ${ok}/${operations.length} 경로 작동 중` +
        (left.length
          ? `\n     아직 구현 전 ${left.length}건 — 위 ① 각 항목의 실패 메시지를 참고해 주세요\n`
          : ' — 전부 작동합니다! 🎉\n'),
    );
  });
});
