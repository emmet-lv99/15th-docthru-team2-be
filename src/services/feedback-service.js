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

import {
  BusinessRuleViolationException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '#exceptions';
import { ERROR_CODE, ERROR_MESSAGE } from '#constants';
import { dbDateTimeToIso } from '#utils';

export class FeedbackService {
  #feedbackRepository;
  #notificationService;

  constructor({ feedbackRepository, notificationService }) {
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
    return this.#feedbackRepository.listFeedbacks(workId, cursor, limit);
  }

  // 피드백 생성
  async createFeedback({ workId, userId, content }) {
    const work = await this.#feedbackRepository.findWorkById(workId);

    if (!work) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }

    const feedback = await this.#feedbackRepository.createFeedback({
      workId: Number(workId),
      userId: Number(userId),
      content,
    });

    // 내 작업물에 새 피드백이 등록되면 작업물 작성자에게 알림
    if (work.userId !== Number(userId)) {
      await this.#notificationService.createNotifications([
        {
          userId: work.userId,
          type: 'FEEDBACK_ADDED',
          actorId: Number(userId),
          relatedChallengeId: work.challengeId,
          relatedWorkId: Number(workId),
        },
      ]);
    }

    return feedback;
  }

  // 수정, 삭제 공통
  async #validateFeedbackAction(feedbackId, user, reason) {
    const feedback = await this.#feedbackRepository.findById(feedbackId);

    if (!feedback) {
      throw new NotFoundException(ERROR_MESSAGE.FEEDBACK_NOT_FOUND);
    }

    const isOwner = feedback.userId === user.id;
    const isAdmin = user.role === 'ADMIN';

    // 작성자나 관리자만 수정, 삭제 가능
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }

    // 완료된 챌린지 - 피드백 수정, 삭제 불가
    if (
      feedback.status === 'CLOSED' ||
      dbDateTimeToIso(feedback.deadline).getTime() <= Date.now()
    ) {
      throw new ConflictException(
        ERROR_MESSAGE.CHALLENGE_CLOSED,
        null,
        ERROR_CODE.CHALLENGE_CLOSED,
      );
    }

    // 어드민이 다른 사람의 피드백을 변경하면 사유 필수
    if (isAdmin && !isOwner && !reason?.trim()) {
      throw new BusinessRuleViolationException(ERROR_MESSAGE.INVALID_INPUT);
    }

    return {
      feedback,
      shouldNotify: isAdmin && !isOwner,
    };
  }

  // 피드백 수정
  async updateFeedback({ feedbackId, content, user, reason }) {
    const { feedback, shouldNotify } = await this.#validateFeedbackAction(feedbackId, user, reason);

    const updatedFeedback = await this.#feedbackRepository.updateFeedback(feedbackId, content);

    // 관리자가 다른 사람의 피드백을 수정한 경우 작성자에게 알림
    if (shouldNotify) {
      await this.#notificationService.createNotifications([
        {
          userId: feedback.userId,
          type: 'FEEDBACK_UPDATED',
          actorId: user.id,
          relatedChallengeId: feedback.challengeId,
          relatedWorkId: feedback.workId,
          reason,
        },
      ]);
    }

    return updatedFeedback;
  }

  // 피드백 삭제
  async deleteFeedback({ feedbackId, user, reason }) {
    const { feedback, shouldNotify } = await this.#validateFeedbackAction(feedbackId, user, reason);

    await this.#feedbackRepository.deleteFeedback(feedbackId);

    // 관리자가 다른 사람의 피드백을 삭제한 경우 작성자에게 알림
    if (shouldNotify) {
      await this.#notificationService.createNotifications([
        {
          userId: feedback.userId,
          type: 'FEEDBACK_DELETED',
          actorId: user.id,
          relatedChallengeId: feedback.challengeId,
          relatedWorkId: feedback.workId,
          reason,
        },
      ]);
    }
  }
}
