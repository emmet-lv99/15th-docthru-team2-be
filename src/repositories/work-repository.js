// src/repositories/work-repository.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ②(작업물 · 임시저장) — work repository
// 📍 이 파일: src/repositories/work-repository.js
// 🔗 협력: services/work-service.js 가 이 리포지토리만 부르게 돼요
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우고, 필요 없는 메서드는 지워도 돼요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 이 파일이 서비스의 유일한 DB 출구예요.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 돼요 (DB 지식을 이 한 파일에 모으는 게 목적).
//   constructor({ db }) 로만 주입받고 #private 필드에 보관합니다 (DI 가 db 키를 asValue(db) 로 등록해 둠).
//
// 🐘 prisma-8 쿼리 모양 — 아래 v7 문법은 쓰지 않아요
//   · 조회    db.orm.public.Work.where({ ... }).select('id', ...).first() / .all()
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
import { DB_ERROR } from '#constants';
import { dbDateTimeToIso } from '#utils';

// ★ 만들었으면 아래 3가지를 잊지 마세요 —
//   STEP 1 · repositories/index.js 에 export 한 줄
//   STEP 2 · common/di/container.js 에 singleton(WorkRepository) 등록
//   STEP 3 · 그 리포지토리를 쓰는 service 가 주입받게 연결
export class WorkRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // getWorkDetail(...) { /* TODO */ }
  async findWorkDetailById({ challengeId, workId, currentUserId = null }) {
    const cId = Number(challengeId);
    const wId = Number(workId);

    // 1. 작업물 조회 (likes 카운트, feedbacks 카운트 포함)
    const work = await this.#db.orm.public.Work.where({ id: wId })
      .select('id', 'participantId', 'content', 'submittedAt', 'updatedAt')
      .include('likes', (r) => r.count())
      .include('feedbacks', (r) => r.count())
      .first();

    if (!work) return null;

    // 2. 참여 정보 조회 (해당 챌린지의 작업물이 맞는지 확인)
    const participant = await this.#db.orm.public.ChallengeParticipant.where({
      id: work.participantId,
    })
      .select('id', 'userId', 'challengeId')
      .first();

    if (!participant || participant.challengeId !== cId) {
      return null;
    }

    // 3. 작성자 및 챌린지 정보 병렬 조회
    const [author, challenge] = await Promise.all([
      this.#db.orm.public.User.where({ id: participant.userId })
        .select('id', 'nickname', 'grade')
        .first(),
      this.#db.orm.public.Challenge.where({ id: cId })
        .select('id', 'title', 'category', 'documentType', 'deadline', 'status')
        .first(),
    ]);

    if (!author || !challenge) return null;

    // 4. 내가 누른 하트(좋아요) 여부 확인
    let likedByMe = false;
    if (currentUserId) {
      const myLike = await this.#db.orm.public.WorkLike.where({
        workId: wId,
        userId: Number(currentUserId),
      })
        .select('id')
        .first();
      likedByMe = Boolean(myLike);
    }

    return {
      id: work.id,
      content: work.content,
      submittedAt: dbDateTimeToIso(work.submittedAt),
      updatedAt: dbDateTimeToIso(work.updatedAt),
      likeCount: work.likes ?? 0,
      feedbackCount: work.feedbacks ?? 0,
      likedByMe,
      author: {
        id: author.id,
        nickname: author.nickname,
        grade: author.grade,
      },
      challenge: {
        id: challenge.id,
        title: challenge.title,
        category: challenge.category,
        documentType: challenge.documentType,
        deadline: dbDateTimeToIso(challenge.deadline),
        status: challenge.status,
      },
    };
  }

  /** 참여자 및 챌린지 상태 조회 (제출 자격 및 마감 여부 판정용) */
  async findParticipantWithChallenge({ challengeId, userId }) {
    const participant = await this.#db.orm.public.ChallengeParticipant.where({
      challengeId: Number(challengeId),
      userId: Number(userId),
    })
      .select('id', 'abandonedAt')
      .first();

    if (!participant) return null;

    const challenge = await this.#db.orm.public.Challenge.where({
      id: Number(challengeId),
    })
      .select('id', 'deadline', 'status')
      .first();

    return {
      participantId: participant.id,
      abandonedAt: participant.abandonedAt,
      challenge,
    };
  }

  /** 작업물 최초 제출(create) 또는 갱신(update) */
  async upsertWork({ participantId, content }) {
    const existing = await this.#db.orm.public.Work.where({
      participantId: Number(participantId),
    })
      .select('id')
      .first();

    const isNew = !existing;

    let work;
    if (isNew) {
      work = await this.#db.orm.public.Work.select(
        'id',
        'participantId',
        'content',
        'submittedAt',
        'updatedAt',
      ).create({
        participantId: Number(participantId),
        content,
      });
    } else {
      work = await this.#db.orm.public.Work.where({ id: existing.id })
        .select('id', 'participantId', 'content', 'submittedAt', 'updatedAt')
        .update({ content, submittedAt: new Date().toISOString() });
    }

    return {
      work: {
        id: work.id,
        content: work.content,
        submittedAt: dbDateTimeToIso(work.submittedAt),
        updatedAt: dbDateTimeToIso(work.updatedAt),
        likeCount: 0,
        feedbackCount: 0,
        likedByMe: false,
      },
      isNew,
    };
  }

  /** 작업물 존재 여부 확인 */
  async existingWork(workId) {
    const row = await this.#db.orm.public.Work.where({ id: Number(workId) })
      .select('id')
      .first();
    return Boolean(row);
  }

  /** 하트(좋아요) 누르기 (중복 요청은 멱등하게 200 반환 · D-83) */
  async likeWork({ workId, userId }) {
    const wId = Number(workId);
    const uId = Number(userId);

    try {
      await this.#db.orm.public.WorkLike.select('id').create({ workId: wId, userId: uId });
    } catch (error) {
      if (error?.sqlState !== DB_ERROR.UNIQUE_VIOLATION) {
        throw error;
      }
    }

    const countRow = await this.#db.orm.public.WorkLike.where({ workId: wId }).aggregate((a) => ({
      total: a.count(),
    }));

    return {
      workId: wId,
      likedByMe: true,
      likeCount: countRow.total ?? 0,
    };
  }

  /** 하트(좋아요) 취소 */
  async unlikeWork({ workId, userId }) {
    await this.#db.orm.public.WorkLike.where({
      workId: Number(workId),
      userId: Number(userId),
    }).deleteAll();
  }

  /** 작업물 임시 저장 (신규 201 · 덮어쓰기 200) */
  async saveDraft({ challengeId, userId, content }) {
    const cId = Number(challengeId);
    const uId = Number(userId);

    // 1. 기존 참여자 행 및 이전 임시저장 여부 확인
    const participant = await this.#db.orm.public.ChallengeParticipant.where({
      challengeId: cId,
      userId: uId,
    })
      .select('id', 'draftCreatedAt')
      .first();

    if (!participant) return null;

    const isNew = !participant.draftCreatedAt;
    const now = new Date();

    const updated = await this.#db.orm.public.ChallengeParticipant.where({
      id: participant.id,
    })
      .select('draftUpdatedAt')
      .update({
        draftContent: content,
        draftUpdatedAt: now,
        ...(isNew ? { draftCreatedAt: now } : {}),
      });

    return {
      saved: true,
      updatedAt: updated.draftUpdatedAt,
      isNew,
    };
  }

  /** 임시 저장된 작업물 조회 */
  async getDraft({ challengeId, userId }) {
    const cId = Number(challengeId);
    const uId = Number(userId);

    const participant = await this.#db.orm.public.ChallengeParticipant.where({
      challengeId: cId,
      userId: uId,
    })
      .select('id', 'draftContent', 'draftUpdatedAt', 'abandonedAt')
      .first();

    return participant;
  }
  /** 임시 저장된 작업물 삭제 (204 멱등) */
  async deleteDraft({ challengeId, userId }) {
    const cId = Number(challengeId);
    const uId = Number(userId);
    await this.#db.orm.public.ChallengeParticipant.where({
      challengeId: cId,
      userId: uId,
    }).update({
      draftContent: null,
      draftUpdatedAt: null,
      draftCreatedAt: null,
    });
  }

  // getMyWorkDetail(...) { /* TODO */ }
  // submitWork(...) { /* TODO */ }
  // updateWork(...) { /* TODO */ }
  // deleteWork(...) { /* TODO */ }
}
