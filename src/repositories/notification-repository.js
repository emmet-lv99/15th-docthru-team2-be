// src/repositories/notification-repository.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ④(피드백 · 알림) — notification repository
// 📍 이 파일: src/repositories/notification-repository.js
// 🔗 협력: services/notification-service.js 가 이 리포지토리만 부르게 돼요
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우고, 필요 없는 메서드는 지워도 돼요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 이 파일이 서비스의 유일한 DB 출구예요.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 돼요 (DB 지식을 이 한 파일에 모으는 게 목적).
//   constructor({ db }) 로만 주입받고 #private 필드에 보관합니다 (DI 가 db 키를 asValue(db) 로 등록해 둠).
//
// 🐘 prisma-8 쿼리 모양 — 아래 v7 문법은 쓰지 않아요
//   · 조회    db.orm.public.Notification.where({ ... }).select('id', ...).first() / .all()
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
//   STEP 2 · common/di/container.js 에 singleton(NotificationRepository) 등록
//   STEP 3 · 그 리포지토리를 쓰는 service 가 주입받게 연결

import { dbDateTimeToIso } from '#utils';
export class NotificationRepository {
  #db;
  #fields = ['id', 'type', 'reason', 'relatedChallengeId', 'relatedWorkId', 'readAt', 'createdAt'];

  constructor({ db }) {
    this.#db = db;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──

  // 알림 목록 listNotifications
  async listNotifications(userId, query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const size = Math.min(Math.max(Number(query.size) || 20, 1), 100);
    const unreadOnly = query.unreadOnly === true || query.unreadOnly === 'true';

    const where = unreadOnly
      ? { userId: Number(userId), readAt: null }
      : { userId: Number(userId) };

    const result = await this.#db.orm.public.Notification.where(where).aggregate((a) => ({
      total: a.count(),
    }));

    const totalItems = result.total ?? 0;
    const totalPages = Math.ceil(totalItems / size);
    const start = (page - 1) * size;

    const notifications = await this.#db.orm.public.Notification.where(where)
      .select(...this.#fields)
      .include('actor', (a) => a.select('id', 'nickname'))
      .include('relatedChallenge', (c) => c.select('title'))
      .orderBy((n) => n.createdAt.desc())
      .offset(start)
      .limit(size)
      .all();

    const items = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      reason: notification.reason,
      relatedChallengeId: notification.relatedChallengeId,
      relatedChallengeTitle: notification.relatedChallenge?.title ?? null,
      relatedWorkId: notification.relatedWorkId,
      actor: notification.actor
        ? { id: notification.actor.id, nickname: notification.actor.nickname }
        : null,
      isRead: notification.readAt !== null,
      readAt: notification.readAt ? dbDateTimeToIso(notification.readAt).toISOString() : null,
      createdAt: dbDateTimeToIso(notification.createdAt).toISOString(),
    }));

    return { items, page, size, totalItems, totalPages };
  }

  // 알림 단건 조회 findById
  findById(notificationId) {
    return this.#db.orm.public.Notification.where({
      id: Number(notificationId),
    })
      .select('id', 'userId', 'readAt')
      .first();
  }

  // 읽지 않은 알림 개수 countUnread
  async countUnread(userId) {
    const result = await this.#db.orm.public.Notification.where({
      userId: Number(userId),
      readAt: null,
    }).aggregate((a) => ({
      total: a.count(),
    }));

    return result.total ?? 0;
  }

  // 개별 알림 읽음 markRead
  async markRead(userId, notificationId) {
    return this.#db.orm.public.Notification.where({
      id: Number(notificationId),
      userId: Number(userId),
      readAt: null,
    }).updateAll({
      readAt: new Date().toISOString(),
    });
  }

  // 전체 알림 읽음 markAllRead
  async markAllRead(userId) {
    return this.#db.orm.public.Notification.where({
      userId: Number(userId),
      readAt: null,
    }).updateAll({
      readAt: new Date().toISOString(),
    });
  }

  // 알림 다중 생성 createNotifications
  createNotifications(notifications) {
    return this.#db.orm.public.Notification.createAll(notifications, { onConflict: 'skip' });
  }
}
