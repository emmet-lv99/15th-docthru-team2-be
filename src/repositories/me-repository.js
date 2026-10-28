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

  async listMyApplications(_userId, query) {
    return {
      items: [],
      cursor: null,
      limit: Number(query.limit ?? 10),
      hasMore: false,
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
          challenge.status === 'CLOSED' || new Date(challenge.deadline).getTime() <= now.getTime(),
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
