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
import { NotFoundException } from '#exceptions';

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
  // submitWork(...) { /* TODO */ }
  // updateWork(...) { /* TODO */ }
  // deleteWork(...) { /* TODO */ }
  // likeWork(...) { /* TODO */ }
  // unlikeWork(...) { /* TODO */ }
  // saveDraft(...) { /* TODO */ }
  // getDraft(...) { /* TODO */ }
  // deleteDraft(...) { /* TODO */ }
}
