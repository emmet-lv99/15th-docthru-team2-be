import { or } from '@prisma/orm-postgres/orm-client';
import { dbDateTimeToIso } from '#utils';

export class MeRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }
  async listParticipating(userId, query) {
    return this.#listMyChallenges(userId, query, 'participating');
  }
  async listCompleted(userId, query) {
    return this.#listMyChallenges(userId, query, 'completed');
  }
  async #listMyChallenges(userId, query, mode) {
    const limit = Number(query.limit ?? 10);
    const cursor = query.cursor ? Number(query.cursor) : null;
    const now = new Date();
    const challengeIds = await this.#challengeIdsByMode(mode, {
      q: query.q,
      category: query.category,
      documentType: query.documentType,
      now,
    });
    if (challengeIds.length === 0) {
      return { items: [], cursor: null, limit, hasMore: false };
    }
    let participantQuery = this.#db.orm.public.ChallengeParticipant.where({
      userId: Number(userId),
    })
      .where((p) => p.abandonedAt.isNull())
      .where((p) => p.challengeId.in(challengeIds));

    if (cursor) {
      participantQuery = participantQuery.where((p) => p.id.lt(cursor));
    }

    const rows = await participantQuery
      .select('id', 'joinedAt')
      .include('work', (w) =>
        w.combine({
          latest: w
            .select('id', 'submittedAt', 'updatedAt')
            .orderBy((ww) => ww.submittedAt.desc())
            .limit(1),
          total: w.count(),
        }),
      )
      .include('challenge', (c) =>
        c
          .select(
            'id',
            'title',
            'category',
            'documentType',
            'deadline',
            'status',
            'maxParticipants',
          )

          .include('participants', (p) => p.where((pp) => pp.abandonedAt.isNull()).select('id')),
      )
      .orderBy((p) => p.id.desc())
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => this.#toChallengeItem(row, now)),
      cursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
      limit,
      hasMore,
    };
  }

  /**
   * 내가 신청한 챌린지 목록 — challenges 행 하나가 "신청 1건"이에요.
   *   · 신청자 = createdById (승인 후에도 같은 행을 이어서 씁니다)
   *   · 응답 status 는 4종이지만 DB 는 5종이라 IN_PROGRESS/CLOSED → APPROVED 로 바꿔 줍니다.
   */
  async listMyApplications(userId, query) {
    const limit = Number(query.limit ?? 10);
    const cursor = query.cursor ? Number(query.cursor) : null;

    let challengeQuery = this.#db.orm.public.Challenge.where({
      createdById: Number(userId),
    }).where((c) => c.deletedAt.isNull());

    if (query.status === 'APPROVED') {
      // 승인된 신청은 챌린지로 전환되어 IN_PROGRESS / CLOSED 가 됩니다
      challengeQuery = challengeQuery.where((c) => c.status.in(['IN_PROGRESS', 'CLOSED']));
    } else if (query.status) {
      challengeQuery = challengeQuery.where((c) => c.status.eq(query.status));
    }

    if (query.q) {
      challengeQuery = challengeQuery.where((c) => c.title.ilike(`%${query.q}%`));
    }

    if (cursor) {
      challengeQuery = challengeQuery.where((c) => c.id.lt(cursor));
    }

    const rows = await challengeQuery
      .select(
        'id',
        'title',
        'category',
        'documentType',
        'sourceUrl',
        'deadline',
        'maxParticipants',
        'status',
        'rejectionReason',
        'decidedAt',
        'cancelledAt',
        'createdAt',
      )
      .orderBy((c) => c.id.desc())
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => this.#toApplicationItem(row)),
      cursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
      limit,
      hasMore,
    };
  }

  async #challengeIdsByMode(mode, { q, category, documentType, now }) {
    let query = this.#db.orm.public.Challenge.where((c) => c.deletedAt.isNull());

    query =
      mode === 'completed'
        ? query
            .where((c) => c.status.in(['CLOSED', 'IN_PROGRESS']))
            .where((c) => or(c.status.eq('CLOSED'), c.deadline.lte(now)))
        : query.where((c) => c.status.eq('IN_PROGRESS')).where((c) => c.deadline.gt(now));

    if (q) {
      query = query.where((c) => or(c.title.ilike(`%${q}%`), c.content.ilike(`%${q}%`)));
    }
    if (category) {
      query = query.where((c) => c.category.eq(category));
    }
    if (documentType) {
      query = query.where((c) => c.documentType.eq(documentType));
    }

    const rows = await query.select('id').all();
    return rows.map((row) => row.id);
  }

  #toApplicationItem(row) {
    const approved = row.status === 'IN_PROGRESS' || row.status === 'CLOSED';
    return {
      applicationId: row.id,
      title: row.title,
      category: row.category,
      documentType: row.documentType,
      sourceUrl: row.sourceUrl,
      desiredDeadline: dbDateTimeToIso(row.deadline).toISOString(),
      maxParticipants: row.maxParticipants,
      status: approved ? 'APPROVED' : row.status,
      rejectionReason: row.rejectionReason ?? null,
      decidedAt: row.decidedAt ? dbDateTimeToIso(row.decidedAt).toISOString() : null,
      cancelledAt: row.cancelledAt ? dbDateTimeToIso(row.cancelledAt).toISOString() : null,
      approvedChallenge: approved
        ? {
            id: row.id,
            title: row.title,
            deadline: dbDateTimeToIso(row.deadline).toISOString(),
            status: row.status,
          }
        : null,
      createdAt: dbDateTimeToIso(row.createdAt).toISOString(),
    };
  }

  #toChallengeItem(row, now) {
    const challenge = row.challenge;
    const latest = (row.work.latest ?? [])[0] ?? null;

    return {
      participationId: row.id,
      joinedAt: dbDateTimeToIso(row.joinedAt).toISOString(),
      challenge: {
        id: challenge.id,
        title: challenge.title,
        category: challenge.category,
        documentType: challenge.documentType,
        deadline: dbDateTimeToIso(challenge.deadline).toISOString(),
        status: challenge.status,
        maxParticipants: challenge.maxParticipants,
        participantCount: challenge.participants.length,
        isClosed:
          challenge.status === 'CLOSED' ||
          dbDateTimeToIso(challenge.deadline).getTime() <= now.getTime(),
      },
      totalWorks: row.work.total,
      latestWork: latest
        ? {
            id: latest.id,
            submittedAt: dbDateTimeToIso(latest.submittedAt).toISOString(),
            updatedAt: dbDateTimeToIso(latest.updatedAt).toISOString(),
          }
        : null,
    };
  }
}
