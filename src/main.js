// src/main.js — 부트스트랩
//
//   DI → App → listen → graceful shutdown
import { config } from '#config';
import { db, pool } from '#prisma/db.js';
import { createContainer } from '#common/di/container.js';
import { setupGracefulShutdown } from '#common/lifecycle/graceful-shutdown.js';
import { EXIT_CODE } from '#constants';
import { App } from './app.js';

const bootstrap = () => {
  const { controller, authMiddleware } = createContainer();
  const app = new App(controller, authMiddleware);
  // Cloud Run 은 PORT(8080) 환경변수를 주입한다. config.PORT 가 그것을 읽는다.
  const server = app.listen(config.PORT);

  if (config.ENABLE_DEV_LOGIN && !config.IS_PRODUCTION) {
    console.log('[server] ⚠️  개발 로그인 활성화 — POST /api/v1/dev/login');
  }

  // 정상 종료 — 새 요청을 막고(server.close) → DB → 커넥션 풀 순서로 닫아요.
  // (중복 close 를 피하려고 server.on('close') 대신 이 한 곳에서만 정리합니다)
  setupGracefulShutdown(server, { db, pool });

  process.on('unhandledRejection', (reason) => {
    console.error('[server] 처리되지 않은 Promise 거부', reason);
    server.close();
  });
};

try {
  bootstrap();
} catch (error) {
  console.error('[server] 기동 실패', error);
  process.exit(EXIT_CODE.FAILURE);
}
