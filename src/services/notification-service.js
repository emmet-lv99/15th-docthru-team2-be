// src/services/notification-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ④(피드백 · 알림) — notification service
// 📍 이 파일: src/services/notification-service.js
// 🔗 협력: controllers/notifications/notifications-controller.js(호출) · repositories/notification-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 NotificationRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(NotificationService) 등록.

import { ForbiddenException, NotFoundException } from '#exceptions';
import { ERROR_MESSAGE } from '#constants';
export class NotificationService {
  #notificationRepository;

  constructor({ notificationRepository }) {
    this.#notificationRepository = notificationRepository;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // 알림 목록 조회 listNotifications
  async listNotifications(userId, query) {
    await this.#notificationRepository.createDeadlineAlerts(userId);

    const [result, unreadCount] = await Promise.all([
      this.#notificationRepository.listNotifications(userId, query),
      this.#notificationRepository.countUnread(userId),
    ]);

    return { ...result, unreadCount };
  }
  // 읽지 않은 알림 개수 조회 countUnread
  async countUnread(userId) {
    const unreadCount = await this.#notificationRepository.countUnread(userId);
    return { unreadCount };
  }
  // 개별 알림 읽음 markRead
  async markRead(userId, notificationId) {
    const notification = await this.#notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }

    if (notification.readAt !== null) {
      return;
    }

    await this.#notificationRepository.markRead(userId, notificationId);
  }

  // 알림 전체 읽음 처리 markAllRead
  async markAllRead(userId) {
    await this.#notificationRepository.markAllRead(userId);
  }

  // 알림 생성
  async createNotifications(notifications) {
    await this.#notificationRepository.createNotifications(notifications);
  }
}
