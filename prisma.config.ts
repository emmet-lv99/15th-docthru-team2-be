import { definePrismaConfig } from 'prisma/config';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

// ── 왜 `import 'dotenv/config'` 가 없나요? ─────────────────────────────
//   공식 scaffold 는 보통 루트 `.env` 를 읽으려고 `import 'dotenv/config'` 를 둡니다.
//   하지만 우리는 env 파일을 `env/.env.development`(비표준 경로)에 두고,
//   값을 쓰는 명령마다 npm 스크립트에서 `dotenv -e ./env/.env.development -- prisma ...`
//   로 감싸 주입합니다 (package.json 의 db:init · db:update · migration:status · db:migrate).
//   그래서 이 파일이 스스로 `.env` 를 읽을 필요가 없어요.
//   (루트 `.env` 가 없으므로 `import 'dotenv/config'` 를 넣어도 아무 일도 하지 않습니다)
export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: process.env.DATABASE_URL,
    },
  }),
  skills: {
    check: false,
  },
});
