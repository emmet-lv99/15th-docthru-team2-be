// src/services/application-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ⑤(제안 · 승인) — application service
// 📍 이 파일: src/services/application-service.js
// 🔗 협력: controllers/applications/applications-controller.js(호출) · repositories/application-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 ApplicationRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(ApplicationService) 등록.
//
import { NotFoundException } from '#exceptions';
import { ERROR_MESSAGE } from '#constants';

function toIsoDate(value) {
  if (value == null) {
    return null;
  }
  return new Date(value).toISOString();
}

// 1. DB상태를 API상태로 변환
function toApplicationStatus(status) {
  if (status === 'IN_PROGRESS' || status === 'CLOSED') {
    return 'APPROVED';
  }
  return status;
}

// 2. DB에서 조회한 챌린지를 신청서 API 응답 형식으로 변환
function toApplicationDto(challenge) {
  // 승인된 상태인지 확인한다.
  const isApproved = challenge.status === 'IN_PROGRESS' || challenge.status === 'CLOSED';

  let approvedChallenge = null;

  // 승인된 경우에만 챌린지 정보를 만든다.
  if (isApproved) {
    approvedChallenge = {
      id: challenge.id,
      title: challenge.title,
      deadline: toIsoDate(challenge.deadline),
      status: challenge.status,
      deletedAt: toIsoDate(challenge.deletedAt),
      deleteReason: challenge.deleteReason,
    };
  }

  // DB 데이터를 신청서 API 응답 형식으로 변환한다.
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
    approvedChallenge,
    createdAt: toIsoDate(challenge.createdAt),
  };
}

// 3. 기존 서비스 클래스는 그대로 유지
export class ApplicationService {
  #applicationRepository;

  constructor({ applicationRepository }) {
    this.#applicationRepository = applicationRepository;
  }

  // 로그인한 사용자가 신청한 챌린지 목록을 가져와 API 형식으로 변환한다.
  async listMyApplications(userId, query) {
    const result = await this.#applicationRepository.listMyApplications(userId, query);

    const items = result.items.map((challenge) => toApplicationDto(challenge));

    return {
      ...result,
      items,
    };
  }

  // 내가 제출한 신규 챌린지 제안서 상세 조회
  async getMyApplication(userId, applicationId) {
    const application = await this.#applicationRepository.getMyApplication(userId, applicationId);

    // 신청서가 없거나 다른사람 신청서면 404
    if (!application) {
      throw new NotFoundException(ERROR_MESSAGE.CHALLENGE_NOT_FOUND);
    }

    return toApplicationDto(application);
  }

  // 신규 챌린지 제안 생성
  async createApplication(userId, body) {
    const data = {
      title: body.title,
      category: body.category,
      documentType: body.documentType,
      sourceUrl: body.sourceUrl,
      content: body.content ?? null,
      deadline: body.desiredDeadline,
      maxParticipants: body.maxParticipants,
      createdById: userId,
      status: 'PENDING',
    };

    const application = await this.#applicationRepository.createApplication(data);

    return toApplicationDto(application);
  }
}
// ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
// createApplication(...) { /* TODO */ }
// listMyApplications(...) { /* TODO */ }
// getMyApplication(...) { /* TODO */ }
// cancelApplication(...) { /* TODO */ }
