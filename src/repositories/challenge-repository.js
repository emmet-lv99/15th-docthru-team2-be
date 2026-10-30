// src/repositories/challenge-repository.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①(챌린지 생명주기) — challenge repository
// 📍 이 파일: src/repositories/challenge-repository.js
// 🔗 협력: services/challenge-service.js 가 이 리포지토리만 부르게 돼요
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우고, 필요 없는 메서드는 지워도 돼요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 이 파일이 서비스의 유일한 DB 출구예요.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 돼요 (DB 지식을 이 한 파일에 모으는 게 목적).
//   constructor({ db }) 로만 주입받고 #private 필드에 보관합니다 (DI 가 db 키를 asValue(db) 로 등록해 둠).
//
// 🐘 prisma-8 쿼리 모양 — 아래 v7 문법은 쓰지 않아요
//   · 조회    db.orm.public.Challenge.where({ ... }).select('id', ...).first() / .all()
//   · 카운트  v7 _count.select 금지 → .include('<관계>', (r) => r.count())
//             또는 .aggregate((a) => ({ total: a.count() }))
//   · 생성    .select(...).create(data) · 다건은 createAll(rows)
//             (중복 무시는 createAll(rows, { onConflict: 'skip' }))
//   · 수정    .where({ id }).update(data) · 벌크 updateAll(data)   (v7 updateMany 아님)
//   · 삭제    .where({ id }).delete() · 벌크 deleteAll()            (v7 deleteMany 아님)
//   · 업서트  .upsert({ create, update, conflictOn })   (v8 은 .where() 없이 호출 · 비-PK 유니크는 conflictOn 으로 지정)
//   · 묶음    v7 $transaction([...]) 금지 → db.transaction(async (tx) => { ... })
//   · 에러    중복키 err.sqlState === '23505' → 서비스가 409 · 없음은 null 반환 → 서비스가 404
//   · 시간    DateTime 은 문자열로 돌아와요 — #utils 의 dbDateTimeToIso 를 재사용하세요
//
// ★ 만들었으면 아래 3가지를 잊지 마세요 —
//   STEP 1 · repositories/index.js 에 export 한 줄
//   STEP 2 · common/di/container.js 에 singleton(ChallengeRepository) 등록
//   STEP 3 · 그 리포지토리를 쓰는 service 가 주입받게 연결
//
import { or } from '@prisma/orm-postgres/orm-client';

const CHALLENGE_SELECT_FIELDS = [
  'id',
  'title',
  'category',
  'documentType',
  'sourceUrl',
  'content',
  'deadline',
  'maxParticipants',
  'status',
  'createdAt',
];

export class ChallengeRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // ⚠️ 목록(listChallenges) 주의 — participantCount 를 0 으로 내보내기 쉬운 지점이에요.
  //   목록·상세가 같은 "활성 참여 수"를 쓰도록, 목록 조회에도 아래 include 를 꼭 함께 실어 주세요.
  //   · 상세용   .include('participants', (p) => p.where((pp) => pp.abandonedAt.isNull()).select('id'))
  //   · 위와 같이 select('id') 로 배열을 받아야 DTO 에서 participants.length 로 셀 수 있어요.
  //   · 정렬(popular)에 쓰는 .count() 는 "정렬용"일 뿐 행에 배열을 채우지 않으니,
  //     목록 응답의 participantCount 도 같은 기준(활성 참여)으로 채우려면 include 를 별도로 붙여야 해요.
  //     (포기자 제외 기준 — D-10. 상세와 다르게 세면 목록·상세 값이 어긋나요)
  // listChallenges(...) { /* TODO */ }
  async listChallenges({
    page = 1,
    size = 20,
    q,
    category,
    documentType,
    status,
    sort = 'latest',
  } = {}) {
    const offset = (page - 1) * size;
    let challengeListQuery = this.#db.orm.public.Challenge.where((challenge) =>
      challenge.status.in(['IN_PROGRESS', 'CLOSED']),
    ).where((challenge) => challenge.deletedAt.isNull());

    if (category?.length) {
      challengeListQuery = challengeListQuery.where((challenge) => challenge.category.in(category));
    }

    if (documentType) {
      challengeListQuery = challengeListQuery.where((challenge) =>
        challenge.documentType.eq(documentType),
      );
    }

    if (status) {
      challengeListQuery = challengeListQuery.where((challenge) => challenge.status.eq(status));
    }

    const keyword = q?.trim();
    if (keyword) {
      const escapedKeyword = keyword.replace(/[%_\\]/g, (char) => `\\${char}`);
      const searchPattern = `%${escapedKeyword}%`;

      challengeListQuery = challengeListQuery.where((challenge) =>
        or(challenge.title.ilike(searchPattern), challenge.content.ilike(searchPattern)),
      );
    }

    let orderedQuery = challengeListQuery.orderBy([
      (challenge) => challenge.createdAt.desc(),
      (challenge) => challenge.id.desc(),
    ]);

    if (sort === 'deadline') {
      orderedQuery = challengeListQuery.orderBy([
        (challenge) => challenge.deadline.asc(),
        (challenge) => challenge.id.asc(),
      ]);
    } else if (sort === 'popular') {
      orderedQuery = challengeListQuery.orderBy([
        (challenge) =>
          challenge.participants.count((participant) => participant.abandonedAt.isNull()).desc(),
        (challenge) => challenge.id.desc(),
      ]);
    }

    const items = await orderedQuery
      .select(...CHALLENGE_SELECT_FIELDS)
      .include('participants', (participants) =>
        participants.where((participant) => participant.abandonedAt.isNull()).select('id'),
      )
      .include('createdBy', (user) => user.select('id', 'nickname', 'grade', 'role'))
      .limit(size)
      .offset(offset)
      .all();

    const countResult = await challengeListQuery.aggregate((a) => ({ total: a.count() }));

    return {
      items,
      page,
      size,
      totalItems: countResult.total,
    };
  }
  async findChallengeDetailById(challengeId) {
    return this.#db.orm.public.Challenge.where({ id: Number(challengeId) })
      .where((challenge) => challenge.status.in(['IN_PROGRESS', 'CLOSED']))
      .where((challenge) => challenge.deletedAt.isNull())
      .select(...CHALLENGE_SELECT_FIELDS)
      .include('participants', (participants) =>
        participants.where((participant) => participant.abandonedAt.isNull()).select('id'),
      )
      .include('createdBy', (user) => user.select('id', 'nickname', 'grade', 'role'))
      .first();
  }
  async listParticipants(challengeId) {
    const id = Number(challengeId);
    const challenge = await this.#db.orm.public.Challenge.where({ id })
      .where((c) => c.status.in(['IN_PROGRESS', 'CLOSED']))
      .where((c) => c.deletedAt.isNull())
      .select('id')
      .first();
    if (!challenge) return null;

    return this.#db.orm.public.ChallengeParticipant.where({ challengeId: id })
      .select('id', 'joinedAt', 'abandonedAt')
      .include('user', (u) => u.select('id', 'nickname', 'grade', 'role'))
      .include('work', (w) =>
        w.select('id', 'content', 'submittedAt').include('likes', (likes) => likes.count()),
      )
      .all();
  }
  // listParticipants(...) { /* TODO */ }
  async joinParticipation({ challengeId, userId, validateJoin }) {
    const id = Number(challengeId);
    const uid = Number(userId);

    // 챌린지 행 잠금을 먼저 획득해 같은 챌린지의 동시 참여 요청을 직렬화한다.
    return this.#db.transaction(async (tx) => {
      const challenge = await tx.orm.public.Challenge.where({ id })
        .select('id', 'status', 'deadline', 'deletedAt', 'maxParticipants')
        .forUpdate()
        .first();
      const activeParticipants = challenge
        ? await tx.orm.public.ChallengeParticipant.where({ challengeId: id })
            .where((participant) => participant.abandonedAt.isNull())
            .aggregate((aggregate) => ({ total: aggregate.count() }))
        : { total: 0 };
      const existing = await tx.orm.public.ChallengeParticipant.where({
        challengeId: id,
        userId: uid,
      })
        .select('id', 'joinedAt', 'abandonedAt')
        .first();

      validateJoin({ challenge, existing, activeCount: Number(activeParticipants.total) });

      if (existing) {
        const renewed = await tx.orm.public.ChallengeParticipant.where({ id: existing.id })
          .select('id', 'challengeId', 'joinedAt')
          .update({ abandonedAt: null });
        return { ...renewed, isRejoined: true };
      }

      const created = await tx.orm.public.ChallengeParticipant.select(
        'id',
        'challengeId',
        'joinedAt',
      ).create({ challengeId: id, userId: uid });
      return { ...created, isRejoined: false };
    });
  }

  async abandonParticipation({ challengeId, userId, validateAbandon }) {
    const id = Number(challengeId);
    const uid = Number(userId);

    return this.#db.transaction(async (tx) => {
      const challenge = await tx.orm.public.Challenge.where({ id })
        .select('id', 'status', 'deletedAt')
        .forUpdate()
        .first();
      const participation = await tx.orm.public.ChallengeParticipant.where({
        challengeId: id,
        userId: uid,
      })
        .select('id', 'abandonedAt')
        .include('work', (works) => works.count())
        .first();

      validateAbandon({ challenge, participation });
      await tx.orm.public.ChallengeParticipant.where({ id: participation.id }).update({
        abandonedAt: new Date(),
      });
    });
  }

  async findMyWork(challengeId, userId) {
    const id = Number(challengeId);
    const challenge = await this.#db.orm.public.Challenge.where({ id })
      .where((c) => c.status.in(['IN_PROGRESS', 'CLOSED']))
      .where((c) => c.deletedAt.isNull())
      .select('id')
      .first();
    if (!challenge) return null;

    return this.#db.orm.public.ChallengeParticipant.where({
      challengeId: id,
      userId: Number(userId),
    })
      .select('id', 'abandonedAt')
      .include('work', (works) =>
        works.combine({
          latest: works
            .select('id', 'content', 'submittedAt', 'updatedAt')
            .orderBy((work) => work.submittedAt.desc())
            .limit(1),
          total: works.count(),
        }),
      )
      .first();
  }
  // joinChallenge(...) { /* TODO */ }
  // abandonChallenge(...) { /* TODO */ }
  // getMyWork(...) { /* TODO */ }
}
