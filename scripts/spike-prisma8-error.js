// scripts/spike-prisma8-error.js — Prisma 8 RC 에러 실측 스파이크 (2026-10-14)
// 목적: v8 클라이언트가 unique 위반·없는 레코드 update 시 던지는 에러 객체를 그대로 기록한다.
//   (공식 문서 "Not available yet"에 P2002-style error codes 가 포함돼 있어 실젯값 확인이 필요)
// v7 클라이언트·앱 코드는 전혀 건드리지 않는 독립 스크립트야요.
// 실행 (backend 폴더에서):
//   DATABASE_URL="postgresql://<로컬DB사용자>@localhost:5432/docthru" node ./scripts/spike-prisma8-error.js
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '#prisma/contract.json' with { type: 'json' };

const url = process.env.DATABASE_URL;
const EXISTING_EMAIL = 'admin@example.com';

function dump(label, err, extra = {}) {
  const props = Object.getOwnPropertyNames(err ?? {});
  console.log(`\n===== ${label} =====`);
  console.log('name        :', err?.name);
  console.log('constructor :', err?.constructor?.name);
  console.log('message     :', err?.message);
  console.log('code        :', err?.code);
  console.log('clientVersion:', err?.clientVersion);
  console.log('meta        :', JSON.stringify(err?.meta));
  console.log('sqlState    :', err?.sqlState);
  console.log('kind        :', err?.kind);
  console.log('constraint  :', err?.constraint);
  console.log('table       :', err?.table);
  console.log('column      :', JSON.stringify(err?.column));
  console.log('detail      :', err?.detail);
  console.log('own-props   :', props.join(', '));
  if (err?.cause) {
    console.log('cause.name  :', err.cause?.name, '| constructor:', err.cause?.constructor?.name);
    console.log(
      'cause       :',
      JSON.stringify(err.cause, Object.getOwnPropertyNames(err.cause), 2).slice(0, 1200),
    );
  }
  try {
    console.log('FULL        :', JSON.stringify(err, props, 4).slice(0, 6000));
  } catch (e) {
    console.log('FULL stringify 실패:', e.message);
  }
  if (Object.keys(extra).length > 0) {
    console.log('extra       :', JSON.stringify(extra));
  }
}

const db = postgres({ url, contractJson });

// 1) 읽기 기준선 — 없는 유저 first() (null 기대)
try {
  const none = await db.orm.public.User.where({ id: 987654 }).first();
  console.log('[1] 없는 유저 first() →', none === null ? 'null (에러 없음)' : typeof none);
} catch (err) {
  dump('[1] 없는 유저 first() — 에러 발생', err);
}

// 2) 없는 id — update (P2025 대응 실측)
try {
  const updated = await db.orm.public.User.where({ id: 987654 }).update({ nickname: 'spike-noop' });
  console.log(
    '[2] 없는 id update() → 결과값:',
    JSON.stringify(updated)?.slice(0, 500) ?? typeof updated,
  );
} catch (err) {
  dump('[2] 없는 id update() — 에러 발생', err);
}

// 3) unique 위반 — 이미 존재하는 이메일로 create (P2002 대응 실측 · 핵심)
try {
  const created = await db.orm.public.User.create({
    email: EXISTING_EMAIL,
    nickname: `spike-dup-${Date.now()}`,
  });
  console.log('[3] unique 위반 create() → 성공?!');
  console.log('    반환:', JSON.stringify(created)?.slice(0, 500));
} catch (err) {
  dump('[3] unique 위반 create() — 에러 발생', err);
}

await db.close();
console.log('\nSPIKE COMPLETE — db closed');
