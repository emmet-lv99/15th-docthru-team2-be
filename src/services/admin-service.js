// src/services/admin-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①·⑤(공동) — admin service
// 🧭 공동 담당: ①=관리자 챌린지 관리 · ⑤=관리자 신청 관리 (경계는 admin-controller.js 🧭 절 참고)
// 📍 이 파일: src/services/admin-service.js
// 🔗 협력: controllers/admin/admin-controller.js(호출) · repositories/admin-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 AdminRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(AdminService) 등록.
//
import { ForbiddenException, NotFoundException, ConflictException } from '#exceptions';

// ⑤ 담당: DB챌린지 상태를 신청 상태로 변환
function toApplicationStatus(status) {
  if (status === 'IN_PROGRESS' || status === 'CLOSED') {
    return 'APPROVED';
  }
  return status;
}

// ⑤ 담당: 날짜 데이터를 ISO 문자열로 변환
function toIsoDate(value) {
  return value == null ? null : new Date(value).toISOString();
}

// ⑤ 담당: 관리자 챌린지 신청 응답 변환
function toAdminApplicationDto(challenge) {
  const isApproved = challenge.status === 'IN_PROGRESS' || challenge.status === 'CLOSED';
  return {
    applicationId: challenge.id,
    title: challenge.title,
    category: challenge.category,
    documentType: challenge.documentType,
    sourceUrl: challenge.sourceUrl,
    content: challenge.content,
    desiredDeadline: toIsoDate(challenge.deadline),
    maxParticipants: challenge.maxParticipants,
    status: toApplicationStatus(challenge.status),
    rejectionReason: challenge.rejectionReason,
    decidedAt: toIsoDate(challenge.decidedAt),
    cancelledAt: toIsoDate(challenge.cancelledAt),

    applicant: {
      id: challenge.createdBy.id,
      nickname: challenge.createdBy.nickname,
      email: challenge.createdBy.email,
    },

    approvedChallenge: isApproved
      ? {
          id: challenge.id,
          title: challenge.title,
          deadline: toIsoDate(challenge.deadline),
          status: challenge.status,
        }
      : null,
    createdAt: toIsoDate(challenge.createdAt),
  };
}

export class AdminService {
  #adminRepository;
  #userRepository;

  constructor({ adminRepository, userRepository }) {
    this.#adminRepository = adminRepository;
    this.#userRepository = userRepository;
  }

  // 공통: 관리자 권한 확인
  async assertAdmin(userId) {
    const user = await this.#userRepository.findActiveAuthUserById(userId);

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  // ⑤ 담당: 관리자 챌린지 신청 목록 조회
  async listApplications(query) {
    const result = await this.#adminRepository.listApplications(query);
    const items = result.items.map((challenge) => toAdminApplicationDto(challenge));
    return {
      ...result,
      items,
    };
  }

  // ⑤담당: 관리자 챌린지 신청 상세 조회
  async getApplication(applicationId) {
    // 1. Repository에서 신청서 조회
    const application = await this.#adminRepository.getApplication(applicationId);

    // 2. 신청서 없으면 404
    if (!application) {
      throw new NotFoundException('챌린지 신청서를 찾을 수 없습니다.');
    }

    // 3. 기존 DTO 변환 함수 재사용
    return toAdminApplicationDto(application);
  }

  // ⑤ 담당: 관리자 챌린지 신청 승인
  async approveApplication(applicationId, adminId, changes = {}) {
    // 1. 신청서 존재 여부 확인
    const application = await this.#adminRepository.getApplication(applicationId);

    if (!application) {
      throw new NotFoundException('챌린지 신청서를 찾을 수 없습니다.');
    }
    // 2. 승인 대기 상태인지 확인
    if (application.status !== 'PENDING') {
      throw new ConflictException('승인 대기 중인 신청만 승인할 수 있습니다.');
    }

    // 3. Repository에서 신청 승인 처리
    const updatedCount = await this.#adminRepository.approveApplication(
      applicationId,
      adminId,
      changes,
    );

    // 4. 승인 작전 다른 요청이 상태를 변경했다면 충돌 처리
    if (updatedCount === 0) {
      throw new ConflictException('승인 대기 중인 신청만 승인할 수 있습니다.');
    }

    // 5. 승인된 신청서 다시 조회
    const approved = await this.#adminRepository.getApplication(applicationId);

    // 6. API 명세에 맞춰 승인 결과 반환
    return {
      applicationId: approved.id,
      status: 'APPROVED',
      decidedAt: toIsoDate(approved.decidedAt),
      challengeId: approved.id,
      challengeTitle: approved.title,
    };
  }

  // ⑤담당: 관리자 챌린지 신청 거절
  async rejectApplication(applicationId, adminId, reason) {
    // 1. 신청서 조회
    const application = await this.#adminRepository.getApplication(applicationId);

    // 2. 존재하지않으면 404
    if (!application) {
      throw new NotFoundException('신청을 찾을 수 없습니다.');
    }

    // 3. 승인대기중인 신청만 거절 가능
    if (application.status !== 'PENDING') {
      throw new ConflictException('승인 대기 중인 신청만 거절할 수 있습니다.');
    }

    // 4. Repository에서 거절 처리
    const count = await this.#adminRepository.rejectApplication(applicationId, adminId, reason);

    // 5. 다른 관리자가 먼처 처리했을 경우
    if (count === 0) {
      throw new ConflictException('이미 처리된 신청입니다.');
    }

    // 6. 처리된 신청서 다시 조회
    const rejected = await this.#adminRepository.getApplication(applicationId);

    // 7. 응답 데이터 변환
    return {
      applicationId: rejected.id,
      status: 'REJECTED',
      rejectionReason: rejected.rejectionReason,
      decidedAt: toIsoDate(rejected.decidedAt),
    };
  }
  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // listChallenges(...) { /* TODO */ }
  // createChallenge(...) { /* TODO */ }
  // updateChallenge(...) { /* TODO */ }
  // deleteChallenge(...) { /* TODO */ }
}
