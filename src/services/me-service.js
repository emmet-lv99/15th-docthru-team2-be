// src/services/me-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이) — me service
// 📍 이 파일: src/services/me-service.js
// 🔗 협력: controllers/me/me-controller.js(호출) · repositories/me-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 MeRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(MeService) 등록.
//
export class MeService {
  // eslint-disable-next-line no-unused-private-class-members -- 골격 스텁이라 주입 필드를 아직 메서드에서 안 써요 (구현하면 지워도 돼요)
  #meRepository;

  constructor({ meRepository }) {
    this.#meRepository = meRepository;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // listParticipating(...) { /* TODO */ }
  // listCompleted(...) { /* TODO */ }
  // listMyApplications(...) { /* TODO */ }
}
