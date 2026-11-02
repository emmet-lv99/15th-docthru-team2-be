// src/services/feedback-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ④(피드백 · 알림) — feedback service
// 📍 이 파일: src/services/feedback-service.js
// 🔗 협력: controllers/feedbacks/feedbacks-controller.js(호출) · repositories/feedback-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 FeedbackRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(FeedbackService) 등록.

import { ERROR_CODE, ERROR_MESSAGE } from '#constants';
import { participantSchema } from '#controllers/challenges/challenges.schema.js';
import { dbDateTimeToIso } from '#utils';
import { BusinessRuleViolationException, ForbiddenException, NotFoundException } from '#exceptions';

//
export class FeedbackService {
  #feedbackRepository;
  #notificationService;

  constructor({ feedbackRepository }) {
    this.#feedbackRepository = feedbackRepository;
    this.#notificationService = notificationService;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // 피드백 목록 조회
  async listFeedbacks({ workId, cursor, limit }) {
    const work = await this.#feedbackRepository.findWorkById(workId);

    if (!work) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }
    return await this.#feedbackRepository.listFeedbacks(workId, cursor, limit);
  }

  // 피드백 생성
  async createFeedback({ workId, userId, content }) {
    const work = await this.#feedbackRepository.findWorkById(workId);

    if (!work) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }
    const feedback = await this.#feedbackRepository.findParticipants(work.challengeId);
    const notifications = participantSchema
      .filter((participant) => participant.userId !== Number(userId))
      .map((participant) => ({
        userId: participant.userId,
        type: 'FEEDBACK_ADDED',
        actorId: Number(userId),
        relatedChallengId: work.challengeId,
        relatedWorkId: Number(workId),
      }));

    if (notifications.langth > 0) {
      await this.#notificationService.createNotifications(notifications);
    }
    return feedback;
  }

  // 피드백 수정
  async updateFeedback({ feedbackId, content, reason, user }) {
    const feedback = await this.#feedbackRepository.findById(feedbackId);

    if (!feedback) {
      throw new NotFoundException(ERROR_MESSAGE.FEEDBACK_NOT_FOUND);
    }

    const isOwner = feedback.useId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }

    if (dbDateTimeToIso(feedback.deadline).getTime() <= Date.now()) {
      throw new ForbiddenException(
        ERROR_MESSAGE.CHALLENGE_CLOSED,
        null,
        ERROR_CODE.CHALLENGE_CLOSED,
      );
    }

    if (isAdmin && !isOwner && !reason?.trim()) {
      throw new BusinessRuleViolationException(ERROR_MESSAGE.INVALID_INPUT);
    }

    const updatedFeedback = await this.#feedbackRepository.updateFeedback(feedback, content);

    if (isAdmin && !isOwner) {
      await this.#notificationService.createNotifications([
        {
          userId: feedback.userId,
          type: 'FEEDBACK_UPDATED',
          actorId: user.id,
          relatedChallengId: feedback.challengeId,
          relatedWorkId: feedback.workId,
          reason,
        },
      ]);
    }
    return updatedFeedback;
  }

  // 피드백 삭제
  deleteFeedback(...) { /* TODO */ }
}
