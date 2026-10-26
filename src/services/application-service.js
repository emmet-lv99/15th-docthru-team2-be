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
// 1 db 상대 -> api 상태 변환
function toApplicationStatus(status) {
  if (status === 'IN_PROGRESS' || status === 'CLOSED') {
    return 'APPROVED';
  }
  return status;
}

// 2. db신성처 -> api 응답 데이터 변환

function toApplicationDto(challenge) {
  // 승인된 상태인지 확인한다.
  const isApproved = challenge.status === 'IN_PROGRESS' || challenge.status === 'CLOSED';

  let approvedChallenge = null;

  // 승인된 경우에만 챌린지 정보를 만든다.
  if (isApproved) {
    approvedChallenge = {
      id: challenge.id,
      title: challenge.title,
      deadline: challenge.deadline,
      status: challenge.status,
      deletedAt: challenge.deletedAt,
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
    desiredDeadline: challenge.deadline,
    maxParticipants: challenge.maxParticipants,
    status: toApplicationStatus(challenge.status),
    rejectionReason: challenge.rejectionReason,
    decidedAt: challenge.decidedAt,
    cancelledAt: challenge.cancelledAt,
    approvedChallenge,
    createdAt: challenge.createdAt,
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
    // Repository가 DB에서 조회한 목록과 페이지 정보를 가져온다.
    const result = await this.#applicationRepository.listMyApplications(userId, query);

    // DB 데이터 한 건씩 API 응답 형식으로 변환한다.
    const items = result.items.map((challenge) => toApplicationDto(challenge));

    // 변환한 목록과 페이지 정보를 함께 반환한다.
    return {
      ...result,
      items,
    };
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // createApplication(...) { /* TODO */ }
  // listMyApplications(...) { /* TODO */ }
  // getMyApplication(...) { /* TODO */ }
  // cancelApplication(...) { /* TODO */ }
}
