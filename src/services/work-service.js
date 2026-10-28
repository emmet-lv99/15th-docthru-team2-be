// src/services/work-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ②(작업물 · 임시저장) — work service
// 📍 이 파일: src/services/work-service.js
// 🔗 협력: controllers/works/works-controller.js(호출) · repositories/work-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 WorkRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(WorkService) 등록.

import { ERROR_MESSAGE } from '#constants';
import {
  BusinessRuleViolationException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '#exceptions';

//
export class WorkService {
  #workRepository;

  constructor({ workRepository }) {
    this.#workRepository = workRepository;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  async getWorkDetail({ challengeId, workId, currentUserId = null }) {
    // 1. 레포지토리 조회
    const work = await this.#workRepository.findWorkDetailById({
      challengeId,
      workId,
      currentUserId,
    });
    // 2. 존재하지 않으면 404 처리
    if (!work) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }

    // 3. 비즈니스 파생값 계산
    const isClosed = new Date() >= new Date(work.challenge.deadline);

    return {
      ...work,
      challenge: {
        ...work.challenge,
        isClosed,
      },
    };
  }

  // getMyWorkDetail(...) { /* TODO */ }

  /** 내 번역 작업물 제출/수정 (최초 201 · 갱신 200) */
  async submitWork({ challengeId, userId, content }) {
    // 1. 참여자 및 챌린지 상태 조회
    const info = await this.#workRepository.findParticipantWithChallenge({ challengeId, userId });

    // 2. 참가자가 아니거나, 도중에 포기한 경우 404
    if (!info || info.abandonedAt) {
      throw new NotFoundException(ERROR_MESSAGE.NOT_PARTICIPANT);
    }

    const { participantId, challenge } = info;

    // 3. 챌린지가 없거나 이미 마감된 경우 409
    if (!challenge) {
      throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
    }

    const isClosed = challenge.status === 'CLOSED' || new Date() >= new Date(challenge.deadline);

    if (isClosed) {
      throw new ConflictException(ERROR_MESSAGE.CHALLENGE_CLOSED);
    }

    // 4. 모든 관문 통과 시 작업물 생성 or 갱신
    return this.#workRepository.upsertWork({
      participantId,
      content,
    });
  }

  /** 하트(좋아요) 누르기 */
  async likeWork({ workId, userId }) {
    // 1. 작업물 존재 확인 (없으면 404)
    const exists = await this.#workRepository.existingWork(workId);

    if (!exists) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }
    return this.#workRepository.likeWork({ workId, userId });
  }

  /** 하트(좋아요) 취소 */
  async unlikeWork({ workId, userId }) {
    const exists = await this.#workRepository.existingWork(workId);

    if (!exists) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }

    await this.#workRepository.unlikeWork({ workId, userId });
  }

  /** 작업물 임시 저장 */
  async saveDraft({ challengeId, userId, content }) {
    const info = await this.#workRepository.findParticipantWithChallenge({ challengeId, userId });

    if (!info || info.abandonedAt) {
      throw new NotFoundException(ERROR_MESSAGE.NOT_PARTICIPANT);
    }

    const { challenge } = info;
    if (!challenge) {
      throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
    }

    const isClosed = challenge.status === 'CLOSED' || new Date() >= new Date(challenge.deadline);
    if (isClosed) {
      throw new ConflictException(ERROR_MESSAGE.CHALLENGE_CLOSED);
    }

    const result = await this.#workRepository.saveDraft({ challengeId, userId, content });

    return result;
  }

  /** 임시 저장된 작업물 호출 */
  async getDraft({ challengeId, userId }) {
    const participant = await this.#workRepository.getDraft({ challengeId, userId });

    if (!participant || participant.abandonedAt) {
      throw new NotFoundException(ERROR_MESSAGE.NOT_PARTICIPANT);
    }

    if (!participant.draftContent) {
      return { draft: null };
    }

    return {
      draft: {
        content: participant.draftContent,
        updatedAt: participant.draftUpdatedAt,
      },
    };
  }

  /** 임시 저장된 작업물 삭제 */
  async deleteDraft({ challengeId, userId }) {
    const participant = await this.#workRepository.getDraft({ challengeId, userId });

    if (!participant || participant.abandonedAt) {
      throw new NotFoundException(ERROR_MESSAGE.NOT_PARTICIPANT);
    }

    await this.#workRepository.deleteDraft({ challengeId, userId });
  }

  async updateWork({ workId, content, user }) {
    const info = await this.#workRepository.findWorkWithChallenge({ workId });

    if (!info) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }

    const isAuthor = Number(info.userId) === Number(user.id);
    const isAdmin = user.role === 'ADMIN';
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }

    const isClosed =
      info.challenge.status === 'CLOSED' || new Date() >= new Date(info.challenge.deadline);
    if (isClosed) {
      throw new ConflictException(ERROR_MESSAGE.CHALLENGE_CLOSED);
    }

    return this.#workRepository.updateWork({
      workId,
      content,
      currentUserId: user.id,
    });
  }

  /** 작업물 삭제 */
  async deleteWork({ workId, reason, user }) {
    const info = await this.#workRepository.findWorkWithChallenge({ workId });

    if (!info) {
      throw new NotFoundException(ERROR_MESSAGE.WORK_NOT_FOUND);
    }

    const isAuthor = Number(info.userId) === Number(user.id);
    const isAdmin = user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(ERROR_MESSAGE.FORBIDDEN);
    }

    const isClosed =
      info.challenge.status === 'CLOSED' || new Date() >= new Date(info.challenge.deadline);
    if (isClosed) {
      throw new ConflictException(ERROR_MESSAGE.CHALLENGE_CLOSED);
    }

    if (isAdmin && !isAuthor) {
      if (!reason || !reason.trim()) {
        throw new BusinessRuleViolationException('삭제 사유를 입력해주세요');
      }
    }

    await this.#workRepository.deleteWork({ workId });
  }
}
