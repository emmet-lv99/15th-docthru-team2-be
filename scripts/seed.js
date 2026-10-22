// scripts/seed.js — 로컬 개발용 시드
//
// ⚠️⚠️ **이 스크립트는 DB 를 전부 지운다.** ⚠️⚠️
//   deleteAll() 로 테이블을 비우고 seed/*.json 을 다시 넣는다.
//   절대 운영 DB 에 대면 안 된다. (DATABASE_URL 을 꼭 확인한 뒤 실행해 주세요)
//
// 실행:  pnpm seed
//
// 로컬 개발용 데이터이므로 매핑이 필요한 항목이 있다.
// (과거 시드의 어휘 → 현재 계약 enum)
import { db, pool } from '#prisma/db.js';
import { assertSafeSeedTarget } from './seed-safety.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '../seed');

const readJson = async (name) => JSON.parse(await fs.readFile(path.join(SEED_DIR, name), 'utf8'));

// 과거 시드의 상태 값을 현재 enum으로 매핑
const APPLICATION_STATUS = { Waiting: 'PENDING', Accepted: 'APPROVED', Rejected: 'REJECTED' };
const GRADE = { basic: 'NORMAL', pro: 'EXPERT' };
const ROLE = { admin: 'ADMIN', user: 'USER' };

/**
 * 시드의 분야 값(backend/frontend/devops/test)과 현재 스키마의 enum 값
 * (NEXT_JS/MODERN_JS/API/WEB/CAREER)의 어휘가 달라 1:1 대응이 불가능하다.
 * 화면 구현에 지장 없는 수준으로만 대응시킨다.
 */
const CATEGORY_MAP = {
  backend: 'API',
  frontend: 'WEB',
  devops: 'CAREER',
  test: 'CAREER',
};
const DOCUMENT_TYPE_MAP = { official: 'OFFICIAL', article: 'BLOG' };

/** 개발 계정 — 로그인 경로가 아직 없으므로 여기서 만든다 */
const DEV_ACCOUNT = { email: 'dev@example.com', nickname: '개발계정', role: 'USER' };

/** 시퀀스를 다시 맞출 테이블 (id 를 명시해 넣은 뒤 필요) */
const SEQ_TABLES = [
  'users',
  'oauth_accounts',
  'challenge_applications',
  'challenges',
  'challenge_participants',
  'works',
  'feedbacks',
  'work_likes',
];

// Prisma 8 에는 Prisma 7 의 $executeRawUnsafe 같은 편의 메서드가 없어요.
// 대신 계약에 묶인 raw 레인(db.raw.sql)으로 SQL 을 만들고,
// 런타임이 그 실행 계획(plan)을 대신 돌려줘요. (규칙 20: 이유를 곁들인 안내)
//
// 시드가 id 를 명시해 넣으면 Postgres 시퀀스가 뒤처져요. 그래서 각 테이블의
// 시퀀스를 max(id) 로 맞춰 둡니다 — 안 그러면 이후 회원가입이 pkey 충돌로 실패해요.
const resetSequences = async (tables) => {
  const runtime = db.runtime();
  for (const table of tables) {
    // 테이블명은 코드에 고정된 값이라 문자열로 만들어 넘겨도 안전해요.
    const statement = `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM "${table}"), 1), true)`;
    await runtime.execute(db.raw.sql([statement]).affectedCount().build());
  }
};

/** 테이블 행 수 세기 — Prisma 7 의 model.count() 대신 aggregate(count) 를 써요. */
const countRows = async (model) => (await model.where({}).aggregate((a) => ({ n: a.count() }))).n;

const main = async () => {
  // 안전장치 — DB 를 지우기 전에 대상이 로컬 개발 DB(docthru_bp)인지 먼저 확인해요.
  //   (실수로 운영·원격 DB 에 대고 실행하면 데이터가 전부 지워질 수 있어서예요)
  assertSafeSeedTarget({ databaseUrl: process.env.DATABASE_URL, args: process.argv });

  const users = await readJson('users.json');
  const challenges = await readJson('challenges.json');
  const works = await readJson('works.json');
  const likes = await readJson('likes.json');
  const participates = await readJson('participates.json');
  const feedbacks = await readJson('feedbacks.json');
  const applications = await readJson('applications.json');

  console.log(`  대상 DB: ${process.env.DATABASE_URL.replace(/:[^:@/]*@/, ':***@')}`);

  console.log('  기존 데이터 초기화 중...');
  // ⚠️ 이 블록은 "의도적 전체 비우기"예요. v8 의 deleteAll 은 원래 필터가 필수인데,
  //    여기선 자식→부모 순서로 전 테이블을 지우는 게 목적이라 필터 없이 호출합니다(JS 런타임).
  // 자식 테이블부터 지워요 — FK 가 걸려 있어 순서를 바꾸면 삭제가 막힐 수 있어요.
  await db.orm.public.Feedback.select('id').deleteAll();
  await db.orm.public.WorkLike.select('id').deleteAll();
  await db.orm.public.Notification.select('id').deleteAll();
  await db.orm.public.ChallengeParticipant.select('id').deleteAll();
  await db.orm.public.ChallengeApplication.select('id').deleteAll();
  await db.orm.public.Work.select('id').deleteAll();
  await db.orm.public.Challenge.select('id').deleteAll();
  await db.orm.public.OAuthAccount.select('id').deleteAll();
  await db.orm.public.User.select('id').deleteAll();

  // ── users ──
  const defaultHash = await bcrypt.hash('password123', 10);
  await db.orm.public.User.createAll(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickName,
      passwordHash: defaultHash,
      role: ROLE[u.role] ?? 'USER',
      // grade 는 스키마상 필수. 어드민 계정은 시드에 null 이지만 D-47 기준 NORMAL 로 채운다.
      grade: GRADE[u.grade] ?? 'NORMAL',
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.createdAt),
    })),
  );
  console.log(`  users           ${users.length}건`);

  // ── 개발 계정 ──────────────────────────────────────────
  // ⚠️ 이 계정은 **시퀀스 정렬 뒤에** 만든다.
  //    createAll 로 id 1..N 을 넣은 직후에는 아직 시퀀스가 1 이라
  //    auto-increment 가 1 을 다시 뽑아 users_pkey 와 충돌한다.
  //
  // 이 뼈대에는 POST /auth/signup·/login 이 없다(각자 구현 대상).
  // 그전까지 보호된 페이지를 검증할 수 있도록 계정을 하나 만들어 둔다.
  //   로그인: POST /api/v1/dev/login  { "email": "dev@example.com" }
  //          (ENABLE_DEV_LOGIN=true 이고 NODE_ENV 가 production 이 아닐 때만 동작)

  // ── challenges ──
  await db.orm.public.Challenge.createAll(
    challenges.map((c) => {
      const deadline = new Date(c.deadLine);
      const isClosed = deadline <= new Date();
      // ⚠️ 매핑 실패를 조용히 넘기면 유효하지 않은 enum 값이 들어가 나중에 터져요 —
      //    시드 단계에서 바로 알 수 있도록 명시적으로 멈춥니다.
      const category = CATEGORY_MAP[c.field];
      if (!category) {
        throw new Error(
          `[seed] 챌린지 ${c.id} 의 field(${c.field}) 를 Category 로 매핑하지 못했어요.`,
        );
      }
      return {
        id: c.id,
        title: c.title,
        category,
        documentType: DOCUMENT_TYPE_MAP[c.docType] ?? 'OTHER',
        sourceUrl: c.docUrl,
        content: null,
        deadline,
        maxParticipants: c.maxParticipants,
        status: isClosed ? 'CLOSED' : 'IN_PROGRESS',
        createdById: c.createdBy,
        createdAt: deadline,
        updatedAt: deadline,
      };
    }),
  );
  console.log(`  challenges      ${challenges.length}건`);

  // ── participates ── (works 보다 먼저 — Work 는 participantId 로 연결된다)
  const participantByUserChallenge = new Map();
  await db.orm.public.ChallengeParticipant.createAll(
    participates.map((p) => ({
      id: p.id,
      userId: p.userId,
      challengeId: p.challengeId,
      joinedAt: new Date(),
    })),
  );
  for (const p of participates) {
    participantByUserChallenge.set(`${p.userId}:${p.challengeId}`, p.id);
  }
  console.log(`  participants    ${participates.length}건`);

  // ── works ──
  // ⚠️ 스키마 불일치 2건을 처리한다
  //   ① Work 는 userId 가 아니라 participantId 로 연결한다 (D-49 1:N)
  //   ② 시드에 (userId, challengeId) 중복 17쌍이 있다.
  //      D-49로 1:N을 허용했으므로 전량(51건) 저장한다.
  //      근거: 시드데이터/시드 데이터.md "1~2개의 번역 작업물" + 실측 17쌍
  const worksData = [];
  const orphanWorks = [];
  let draftIncluded = 0;
  for (const w of works) {
    const participantId = participantByUserChallenge.get(`${w.userId}:${w.challengeId}`);
    if (participantId === undefined) {
      orphanWorks.push(w);
      continue;
    }
    if (!w.isSubmitted) draftIncluded += 1;
    worksData.push({
      id: w.id,
      participantId,
      content: w.description,
      submittedAt: w.submittedAt ? new Date(w.submittedAt) : new Date(),
      createdAt: w.lastModifiedAt ? new Date(w.lastModifiedAt) : new Date(),
      updatedAt: w.lastModifiedAt ? new Date(w.lastModifiedAt) : new Date(),
    });
  }
  await db.orm.public.Work.createAll(worksData);
  console.log(`  works           ${worksData.length}건 (draft ${draftIncluded}건 포함 — D-49 1:N)`);
  if (orphanWorks.length) {
    console.log(`    ⚠️ 참가 기록 없는 works 제외: ${orphanWorks.map((w) => w.id).join(', ')}`);
  }

  // ── likes ──
  // D-49로 draft 도 저장되므로 하트/피드백은 전량 저장된다.
  // (참가 기록이 없는 works 만 제외되므로 FK 가 깨지지 않는다)
  const insertedWorkIds = new Set(worksData.map((w) => w.id));
  const likesData = likes
    .filter((l) => insertedWorkIds.has(l.workId))
    .map((l) => ({ id: l.id, userId: l.userId, workId: l.workId }));
  await db.orm.public.WorkLike.createAll(likesData);
  console.log(`  work_likes      ${likesData.length}건`);

  // ── feedbacks ──
  const feedbacksData = feedbacks
    .filter((f) => insertedWorkIds.has(f.workId))
    .map((f) => ({
      id: f.id,
      userId: f.userId,
      workId: f.workId,
      content: f.content,
      createdAt: new Date(f.createdAt),
      updatedAt: new Date(f.createdAt),
    }));
  await db.orm.public.Feedback.createAll(feedbacksData);
  console.log(`  feedbacks       ${feedbacksData.length}건`);

  // ── applications ──
  // ⚠️ 스키마는 신청자가 제안하는 챌린지 정보(title·category·documentType·sourceUrl·
  //    desiredDeadline·maxParticipants)를 필수로 요구한다. 과거 시드는
  //    (userId, challengeId, status, reason) 만 갖고 있어 값이 없다.
  //    아래 값은 시드의 challengeId 로 실제 챌린지를 참조해 채운다 (A7에서 정식 보강 예정).
  const challengeById = new Map(challenges.map((c) => [c.id, c]));
  let fallbackUsed = 0;

  const applicationsData = applications.map((a) => {
    const c = challengeById.get(a.challengeId);
    if (!c) fallbackUsed += 1;
    return {
      id: a.id,
      userId: a.userId,
      title: c?.title ?? `신청 ${a.id}`,
      category: (c && CATEGORY_MAP[c.field]) || 'API',
      documentType: (c && DOCUMENT_TYPE_MAP[c.docType]) || 'OTHER',
      sourceUrl: c?.docUrl ?? 'https://example.com',
      content: null,
      desiredDeadline: c ? new Date(c.deadLine) : new Date(),
      maxParticipants: c?.maxParticipants ?? 5,
      status: APPLICATION_STATUS[a.status] ?? 'PENDING',
      rejectionReason: a.invalidationComment ?? null,
      decidedAt: a.invalidatedAt ? new Date(a.invalidatedAt) : null,
      createdAt: new Date(a.appliedAt),
      updatedAt: new Date(a.appliedAt),
    };
  });
  await db.orm.public.ChallengeApplication.createAll(applicationsData);
  console.log(`  applications    ${applicationsData.length}건`);
  if (fallbackUsed) {
    console.log(`    ⚠️ 참조 챌린지 없어 기본값 사용 ${fallbackUsed}건`);
  }

  // ── 검증 ──
  const counts = {
    users: await countRows(db.orm.public.User),
    challenges: await countRows(db.orm.public.Challenge),
    works: await countRows(db.orm.public.Work),
    likes: await countRows(db.orm.public.WorkLike),
    participants: await countRows(db.orm.public.ChallengeParticipant),
    feedbacks: await countRows(db.orm.public.Feedback),
    applications: await countRows(db.orm.public.ChallengeApplication),
  };
  console.log('\n  DB 반영 확인:', JSON.stringify(counts));

  // ── 시퀀스 정렬 ────────────────────────────────────────────
  // ⚠️ 시드가 id 를 명시하므로 Postgres 시퀀스가 뒤처져 있다.
  //    실제로 max(id)=20 이지만 시퀀스가 2 였고, 이 상태에서 새 유저를 만들면
  //    "Unique constraint failed on users_pkey" 로 실패한다 (signup 500).
  //    각 테이블의 시퀀스를 max(id) 로 맞춰 준다.
  await resetSequences(SEQ_TABLES);
  console.log('  ✅ 시퀀스 정렬 완료 (8개 테이블)');

  // ── 개발 계정 (시퀀스 정렬 후) ───────────────────────
  await db.orm.public.User.create({
    email: DEV_ACCOUNT.email,
    nickname: DEV_ACCOUNT.nickname,
    passwordHash: await bcrypt.hash('password123', 10),
    role: DEV_ACCOUNT.role,
    grade: 'NORMAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`  ✅ 개발 계정 ${DEV_ACCOUNT.email} (비밀번호: password123)`);

  console.log('  ✅ 시드 완료');
};

try {
  await main();
} catch (error) {
  console.error('  ❌ 시드 실패:', error.message);
  process.exitCode = 1;
} finally {
  // BYO pool(db.js 에서 직접 만든 커넥션 풀)은 db.close() 가 닫아 주지 않아요.
  //   그래서 프로세스가 정상 종료되도록 pool.end() 를 함께 불러 줍니다.
  await db.close();
  await pool.end();
}
