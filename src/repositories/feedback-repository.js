// src/repositories/feedback-repository.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ④(피드백 · 알림) — feedback repository
// 📍 이 파일: src/repositories/feedback-repository.js
// 🔗 협력: services/feedback-service.js 가 이 리포지토리만 부르게 돼요
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우고, 필요 없는 메서드는 지워도 돼요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 이 파일이 서비스의 유일한 DB 출구예요.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 돼요 (DB 지식을 이 한 파일에 모으는 게 목적).
//   constructor({ db }) 로만 주입받고 #private 필드에 보관합니다 (DI 가 db 키를 asValue(db) 로 등록해 둠).
//
// 🐘 prisma-8 쿼리 모양 — 아래 v7 문법은 쓰지 않아요
//   · 조회    db.orm.public.Feedback.where({ ... }).select('id', ...).first() / .all()
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
//   STEP 2 · common/di/container.js 에 singleton(FeedbackRepository) 등록
//   STEP 3 · 그 리포지토리를 쓰는 service 가 주입받게 연결
//
import { dbDateTimeToIso } from '#utils';
export class FeedbackRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  async runWithTransaction(callback) {
    return this.#db.transaction(async (tx) => {
      return callback(tx);
    });
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // 작업물 조회 (챌린지 ID 및 작성자 확인)
  async findWorkById(workId) {
    const work = await this.#db.orm.public.Work.where({
      id: Number(workId),
    })
      .select('id')
      .include('participant', (p) => p.select('challengeId', 'userId'))
      .first();

    if (!work || !work.participant) {
      return null;
    }

    return {
      id: work.id,
      challengeId: work.participant.challengeId,
      userId: work.participant.userId,
    };
  }

  // 피드백 목록 조회 (커서 페이지네이션)
  async listFeedbacks(workId, cursor, limit = 20) {
    const size = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const where = {
      workId: Number(workId),
    };

    // 커서가 있으면 해당 ID보다 이전 피드백 조회
    if (cursor !== undefined && cursor !== null && cursor !== '') {
      where.id = {
        lt: Number(cursor),
      };
    }

    const feedbacks = await this.#db.orm.public.Feedback.where(where)
      .select('id', 'content', 'createdAt', 'updatedAt')
      .include('user', (u) => u.select('id', 'nickname', 'grade'))
      .orderBy((f) => f.id.desc())
      .limit(size + 1)
      .all();

    const hasMore = feedbacks.length > size;
    const rows = feedbacks.slice(0, size);

    return {
      items: rows.map((feedback) => this.#formatFeedback(feedback)),
      cursor: hasMore ? String(rows.length - 1).id : null,
      limit: size,
      hasMore,
    };
  }

  // 피드백 단건 조회 (수정·삭제 권한 및 마감 확인)
  async findById(feedbackId) {
    const feedback = await this.#db.orm.public.Feedback.where({
      id: Number(feedbackId),
    })
      .select('id', 'userId', 'workId')
      .include('work', (w) =>
        w.include('participant', (p) =>
          p.include('challenge', (c) => c.select('id', 'deadline', 'status')),
        ),
      )
      .first();

    if (!feedback || !feedback.work?.participant?.challenge) {
      return null;
    }

    return {
      id: feedback.id,
      userId: feedback.userId,
      workId: feedback.workId,
      challengeId: feedback.work.participant.challenge.id,
      deadline: feedback.work.participant.challenge.deadline,
      status: feedback.work.participant.challenge.status,
    };
  }

  // 피드백 생성
  async createFeedback({ workId, userId, content }, tx = this.#db) {
    const created = await tx.orm.public.Feedback.select('id').create({
      workId: Number(workId),
      userId: Number(userId),
      content,
    });

    return this.#findFormattedById(created.id, tx);
  }

  // 피드백 수정
  async updateFeedback(feedbackId, content, tx = this.#db) {
    await tx.orm.public.Feedback.where({
      id: Number(feedbackId),
    }).update({
      content,
    });

    return this.#findFormattedById(feedbackId, tx);
  }

  // 피드백 삭제
  async deleteFeedback(feedbackId, tx = this.#db) {
    await tx.orm.public.Feedback.where({
      id: Number(feedbackId),
    }).delete();
  }

  // 생성·수정 후 응답용 단건 조회
  async #findFormattedById(feedbackId, tx = this.#db) {
    const feedback = await tx.orm.public.Feedback.where({
      id: Number(feedbackId),
    })
      .select('id', 'content', 'createdAt', 'updatedAt')
      .include('user', (u) => u.select('id', 'nickname', 'grade'))
      .first();

    return feedback ? this.#formatFeedback(feedback) : null;
  }

  // 피드백 응답 형식 변환
  #formatFeedback(feedback) {
    return {
      id: feedback.id,
      content: feedback.content,
      author: {
        id: feedback.user.id,
        nickname: feedback.user.nickname,
        grade: feedback.user.grade,
      },
      createdAt: dbDateTimeToIso(feedback.createdAt).toISOString(),
      updatedAt: dbDateTimeToIso(feedback.updatedAt).toISOString(),
    };
  }
}
