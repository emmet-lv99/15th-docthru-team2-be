// src/prisma/db.js — Prisma 8 런타임 클라이언트
//
// 왜 이 파일이 DB 연결의 "유일한 출구"인가
//   Prisma 8 은 스키마를 미리 코드로 생성(generate)하지 않아요.
//   대신 "계약(contract) 파일"을 런타임에서 그대로 넣어요.
//   `prisma contract emit` 이 contract.prisma 를 읽어 뽑아 둔
//   ./contract.json 을 그대로 전달하면 끝이에요.
//
//   쿼리는 이렇게 씁니다:
//     db.orm.public.User.where({ id }).select('id','email').first()
//     db.orm.public.User.select('id').createAll(rows)
//
//   시간(DATETIME) 은 "2025-04-10 09:00:00" 처럼 시간대 없는 문자열로 오는데,
//   계약상 timestamptz 로 저장되어 있으므로 접미사가 없으면 UTC 로 해석해요.
//   (예전 7 에서 돌려주던 순간과 정확히 같아요)
import postgres from '@prisma/orm-postgres/runtime';
import pg from 'pg';
import { config } from '#config';
import contractJson from './contract.json' with { type: 'json' };

// 커넥션 풀을 직접 만들어 넘겨요.
//   왜 직접 만드나요? 공식 런타임 옵션(poolOptions)은 최대 연결 수(max)를
//   이름으로 노출하지 않아서, pg.Pool 을 직접 만들어 pg: 로 넘기는 방식만 가능해요.
//   (그래서 DB_POOL_MAX 를 실제로 반영하려면 이 방법이 필요합니다)
// ⚠️ 이렇게 넘긴 풀의 수명은 우리 책임이에요 — db.close() 가 닫아 주지 않습니다.
//    그래서 서버 종료(main.js)와 시드 종료(seed.js)에서 pool.end() 를 함께 불러 줍니다.
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
});

export const db = postgres({
  contractJson,
  pg: pool,
});
