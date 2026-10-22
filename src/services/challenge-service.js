// src/services/challenge-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①(챌린지 생명주기) — challenge service
// 📍 이 파일: src/services/challenge-service.js
// 🔗 협력: controllers/challenges/challenges-controller.js(호출) · repositories/challenge-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(400/404)와 Prisma 호출은 여기서 하지 않아요.
//   · 마감/정원/중복 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 ChallengeRepository 로만
//   · 여러 쓰기를 한 단위로 묶을 땐 트랜잭션이 필요해요 (repositories 안에서 db.transaction)
//
// ★ 만들었으면 — services/index.js 에 export 한 줄 + common/di/container.js 에 singleton(ChallengeService) 등록.
//
export class ChallengeService {
  // eslint-disable-next-line no-unused-private-class-members -- 골격 스텁이라 주입 필드를 아직 메서드에서 안 써요 (구현하면 지워도 돼요)
  #challengeRepository;

  constructor({ challengeRepository }) {
    this.#challengeRepository = challengeRepository;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // listChallenges(...) { /* TODO */ }
  // getChallengeDetail(...) { /* TODO */ }
  // listParticipants(...) { /* TODO */ }
  // joinChallenge(...) { /* TODO */ }
  // abandonChallenge(...) { /* TODO */ }
  // getMyWork(...) { /* TODO */ }
}
