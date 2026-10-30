// src/services/challenge-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①(챌린지 생명주기) — challenge service
// 📍 이 파일: src/services/challenge-service.js
// 🔗 협력: controllers/challenges/challenges-controller.js(호출) · repositories/challenge-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 ChallengeRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(ChallengeService) 등록.
//
import { DB_ERROR, ERROR_CODE, ERROR_MESSAGE } from '#constants';
import {
  BusinessRuleViolationException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '#exceptions';
import { dbDateTimeToIso } from '#utils';

const toChallengeResponse = (challenge, now) => {
  const participantCount = challenge.participants.length;
  const deadline = dbDateTimeToIso(challenge.deadline).toISOString();
  const isClosed = new Date(deadline).getTime() <= now;

  return {
    id: challenge.id,
    title: challenge.title,
    category: challenge.category,
    documentType: challenge.documentType,
    sourceUrl: challenge.sourceUrl,
    content: challenge.content,
    deadline,
    maxParticipants: challenge.maxParticipants,
    status: challenge.status,
    isFull:
      challenge.status === 'IN_PROGRESS' &&
      !isClosed &&
      participantCount >= challenge.maxParticipants,
    isClosed,
    participantCount,
    createdBy: {
      id: challenge.createdBy.id,
      nickname: challenge.createdBy.nickname,
      grade: challenge.createdBy.role === 'ADMIN' ? null : challenge.createdBy.grade,
    },
    createdAt: dbDateTimeToIso(challenge.createdAt).toISOString(),
  };
};

export class ChallengeService {
  #challengeRepository;

  constructor({ challengeRepository }) {
    this.#challengeRepository = challengeRepository;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // listChallenges(...) { /* TODO */ }
  async listChallenges(query) {
    const result = await this.#challengeRepository.listChallenges(query);
    const now = Date.now();

    return {
      ...result,
      items: result.items.map((challenge) => toChallengeResponse(challenge, now)),
    };
  }
  async getChallengeDetail(challengeId) {
    const challenge = await this.#challengeRepository.findChallengeDetailById(challengeId);
    if (!challenge) {
      throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
    }
    return toChallengeResponse(challenge, Date.now());
  }
  async listParticipants(challengeId, { page = 1, size = 20, sort = 'likes' } = {}) {
    const rows = await this.#challengeRepository.listParticipants(challengeId);
    if (!rows) {
      throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
    }

    const items = rows.map((row) => {
      const works = row.work
        .map((work) => ({
          id: work.id,
          content: work.content,
          submittedAt: dbDateTimeToIso(work.submittedAt).toISOString(),
          likeCount: Number(work.likes ?? 0),
        }))
        .sort(
          (a, b) =>
            b.likeCount - a.likeCount || b.submittedAt.localeCompare(a.submittedAt) || a.id - b.id,
        );

      return {
        participantId: row.id,
        user: {
          id: row.user.id,
          nickname: row.user.nickname,
          grade: row.user.role === 'ADMIN' ? null : row.user.grade,
        },
        joinedAt: dbDateTimeToIso(row.joinedAt).toISOString(),
        isAbandoned: row.abandonedAt !== null,
        works,
      };
    });

    const topLikes = (item) => item.works[0]?.likeCount ?? 0;
    const latestSubmission = (item) =>
      item.works.reduce(
        (latest, work) => (latest > work.submittedAt ? latest : work.submittedAt),
        '',
      );

    items.sort((a, b) =>
      sort === 'submittedAt'
        ? latestSubmission(b).localeCompare(latestSubmission(a)) ||
          a.participantId - b.participantId
        : topLikes(b) - topLikes(a) || a.participantId - b.participantId,
    );

    return {
      items: items.slice((page - 1) * size, page * size),
      page,
      size,
      totalItems: items.length,
    };
  }
  // listParticipants(...) { /* TODO */ }
  async joinChallenge(challengeId, user) {
    if (user.role !== 'USER') {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }
    try {
      const result = await this.#challengeRepository.joinParticipation({
        challengeId,
        userId: user.id,
        validateJoin: ({ challenge, existing, activeCount }) => {
          if (
            !challenge ||
            challenge.deletedAt !== null ||
            !['IN_PROGRESS', 'CLOSED'].includes(challenge.status)
          ) {
            throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
          }
          if (existing && existing.abandonedAt === null) {
            throw new ConflictException(
              ERROR_MESSAGE.ALREADY_PARTICIPATED,
              null,
              ERROR_CODE.ALREADY_PARTICIPATED,
            );
          }
          if (
            challenge.status === 'CLOSED' ||
            dbDateTimeToIso(challenge.deadline).getTime() <= Date.now()
          ) {
            throw new ConflictException(
              ERROR_MESSAGE.CHALLENGE_CLOSED,
              null,
              ERROR_CODE.CHALLENGE_CLOSED,
            );
          }
          if (activeCount >= challenge.maxParticipants) {
            throw new ConflictException(
              ERROR_MESSAGE.CHALLENGE_FULL,
              null,
              ERROR_CODE.CHALLENGE_FULL,
            );
          }
        },
      });
      return {
        participantId: result.id,
        challengeId: result.challengeId,
        joinedAt: dbDateTimeToIso(result.joinedAt).toISOString(),
        isRejoined: result.isRejoined,
      };
    } catch (error) {
      if (error.sqlState === DB_ERROR.UNIQUE_VIOLATION) {
        throw new ConflictException(
          ERROR_MESSAGE.ALREADY_PARTICIPATED,
          null,
          ERROR_CODE.ALREADY_PARTICIPATED,
        );
      }
      throw error;
    }
  }

  async abandonChallenge(challengeId, user) {
    if (user.role !== 'USER') {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }
    await this.#challengeRepository.abandonParticipation({
      challengeId,
      userId: user.id,
      validateAbandon: ({ challenge, participation }) => {
        if (
          !challenge ||
          challenge.deletedAt !== null ||
          !['IN_PROGRESS', 'CLOSED'].includes(challenge.status)
        ) {
          throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
        }
        if (!participation || participation.abandonedAt !== null) {
          throw new ConflictException(
            ERROR_MESSAGE.NOT_PARTICIPANT,
            null,
            ERROR_CODE.NOT_PARTICIPANT,
          );
        }
        if (Number(participation.work) > 0) {
          throw new BusinessRuleViolationException(ERROR_MESSAGE.CANNOT_ABANDON_AFTER_SUBMIT);
        }
      },
    });
  }

  async getMyWork(challengeId, user) {
    if (user.role !== 'USER') {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }
    const participant = await this.#challengeRepository.findMyWork(challengeId, user.id);
    if (!participant || participant.abandonedAt !== null) {
      throw new NotFoundException(ERROR_MESSAGE.NOT_PARTICIPANT);
    }
    const latest = participant.work.latest?.[0] ?? null;
    return {
      challengeId: Number(challengeId),
      participantId: participant.id,
      isAbandoned: false,
      totalWorks: Number(participant.work.total),
      work: latest
        ? {
            id: latest.id,
            content: latest.content,
            submittedAt: dbDateTimeToIso(latest.submittedAt).toISOString(),
            updatedAt: dbDateTimeToIso(latest.updatedAt).toISOString(),
          }
        : null,
    };
  }
  // joinChallenge(...) { /* TODO */ }
  // abandonChallenge(...) { /* TODO */ }
  // getMyWork(...) { /* TODO */ }
}
