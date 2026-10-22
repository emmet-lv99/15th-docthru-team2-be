// src/common/lifecycle/graceful-shutdown.js — 정상 종료(graceful shutdown)
//
// ★ 강사님 정본(codeit-fs-layered-architecture-completed/src/common/lifecycle/graceful-shutdown.js)
//   패턴을 그대로 따르되, 이 프로젝트는 Prisma 8 + BYO 커넥션 풀이라 풀까지 닫아 줘요.
//
// 왜 필요한가 —
//   서버를 그냥 끄면 처리 중이던 요청은 응답을 못 받고, DB 연결도 정리되지 않은 채 끊겨요.
//   정상 종료는 ① 새 요청을 더 받지 않고 ② 처리 중 요청이 끝나길 기다린 뒤
//   ③ 서버 → DB → 커넥션 풀 순서로 닫고 끝내는 방식이에요.
//
// 💡 핵심 — server.close() 는 "새 연결을 막고, 남은 요청이 끝나면 콜백"이에요.
//    그래서 반드시 close 를 "기다린 뒤"에 DB 를 닫아야 순서가 지켜져요.
import { EXIT_CODE } from '#constants';

/**
 * @param {import('node:http').Server} server app.listen() 이 돌려준 HTTP 서버
 * @param {{ db: { close: () => Promise<void> }, pool: { end: () => Promise<void> } }} resources
 *        db  = Prisma 8 런타임   ·   pool = 직접 만든 pg 커넥션 풀(db.close() 가 안 닫아 줘요)
 * @param {(() => void | Promise<void>)?} onShutdown 서버를 닫은 뒤 추가로 정리할 것(예: 스케줄러 stop)
 */
export const setupGracefulShutdown = (server, { db, pool }, onShutdown) => {
  let isShuttingDown = false;

  const shutdown = async (signal) => {
    // 신호가 두 번(SIGINT 연타 등) 와도 정리는 한 번만 하도록 막아요.
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} 신호를 받았습니다. 서버를 종료합니다...`);

    try {
      // 1) 서버를 닫아요 — 새 연결을 막고, 처리 중이던 요청이 끝나길 기다려요.
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      console.log('서버가 종료되었습니다.');

      // 1-2) 서버가 닫힌 뒤 추가 정리(스케줄러 중지 등) — 있으면 실행해요.
      if (typeof onShutdown === 'function') {
        await onShutdown();
      }

      // 2) DB 연결을 닫아요 (처리 중 요청이 DB 를 쓰고 있을 수 있어 서버를 먼저 닫아요).
      await db.close();
      // 3) BYO pool 은 db.close() 가 닫아 주지 않아요 — 직접 닫아야 프로세스가 안 붙잡혀요.
      await pool.end();
      console.log('데이터베이스 연결이 종료되었습니다.');

      process.exit(EXIT_CODE.SUCCESS);
    } catch (error) {
      console.error('서버 또는 데이터베이스 종료 중 에러:', error);
      process.exit(EXIT_CODE.FAILURE);
    }
  };

  // SIGINT: 터미널 Ctrl+C · SIGTERM: kill 명령·배포 도구가 보내는 종료 신호
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};
