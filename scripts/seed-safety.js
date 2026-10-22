// scripts/seed-safety.js — 시드 실행 전 "안전한 대상인지" 검사하는 안전장치
//
//   왜 필요한가요?
//     scripts/seed.js 는 실행될 때마다 DB 의 테이블을 전부 비우고(deleteAll)
//     시드 데이터를 다시 넣습니다. 그래서 실수로 운영·원격 DB(예: Supabase)를
//     가리킨 채 실행하면 데이터가 통째로 사라질 수 있어요.
//     이 파일은 그 사고를 막으려고, 시드를 돌리기 **전에** 대상 DB 가
//     내 컴퓨터의 개발용 DB(docthru_bp)가 맞는지 먼저 확인합니다.
//
//   검사 항목 (하나라도 어긋나면 실행을 멈춥니다)
//     ① DATABASE_URL 이 있는지
//     ② 올바른 주소인지
//     ③ 프로토콜이 postgres / postgresql 인지
//     ④ 호스트가 내 컴퓨터(localhost · 127.0.0.1 · [::1]) 또는 docker compose 내부(db)인지
//     ⑤ 데이터베이스 이름이 docthru_bp 인지
//     ⑥ 명령에 --allow-reset=docthru_bp 를 붙였는지 (실수 방지용 이중 확인)
//
//   ※ 강사님 codeit-fs-prisma8-practice 의 seed-safety.js 방식을 참고했어요.
const DATABASE_NAME = 'docthru_bp';
const RESET_CONFIRMATION = `--allow-reset=${DATABASE_NAME}`;
// 'db' 는 docker compose 의 postgres 서비스 이름이에요 — 컨테이너 안에서 시드할 때 필요해요.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'db']);

/**
 * 시드 대상이 안전한지 검사합니다. 안전하지 않으면 Error 를 던져 실행을 멈춥니다.
 * @param {{ databaseUrl?: string, args: string[] }} params
 */
export function assertSafeSeedTarget({ databaseUrl, args }) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 이 없습니다. env/.env.development 를 확인하세요.');
  }

  let target;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error('env/.env.development 의 DATABASE_URL 이 올바른 주소가 아닙니다.');
  }

  const databaseName = decodeURIComponent(target.pathname.slice(1));
  const isPostgres = ['postgresql:', 'postgres:'].includes(target.protocol);
  const isLocalHost = LOCAL_HOSTS.has(target.hostname);
  const isConfirmed = args.includes(RESET_CONFIRMATION);

  if (!isPostgres || !isLocalHost) {
    throw new Error('내 컴퓨터(localhost)의 PostgreSQL 주소에서만 시드를 실행할 수 있습니다.');
  }
  if (databaseName !== DATABASE_NAME) {
    throw new Error(
      `데이터베이스 이름이 ${DATABASE_NAME} 일 때만 시드를 실행합니다. 지금 주소의 이름은 ${databaseName} 입니다.`,
    );
  }
  if (!isConfirmed) {
    throw new Error(
      `${RESET_CONFIRMATION} 인자가 없어 시드를 중단했습니다. pnpm seed 로 실행해 주세요.`,
    );
  }
}
