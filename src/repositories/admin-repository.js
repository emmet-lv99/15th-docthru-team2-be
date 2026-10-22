// src/repositories/admin-repository.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ①·⑤(공동) — admin repository
// 🧭 공동 담당: ①=관리자 챌린지 관리 · ⑤=관리자 신청 관리 (경계는 admin-controller.js 🧭 절 참고)
// 📍 이 파일: src/repositories/admin-repository.js
// 🔗 협력: services/admin-service.js 가 이 리포지토리만 부르게 돼요
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우고, 필요 없는 메서드는 지워도 돼요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 이 파일이 서비스의 유일한 DB 출구예요.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 돼요 (DB 지식을 이 한 파일에 모으는 게 목적).
//   constructor({ db }) 로만 주입받고 #private 필드에 보관합니다 (DI 가 db 키를 asValue(db) 로 등록해 둠).
//
// 🐘 prisma-8 쿼리 모양 — 아래 v7 문법은 쓰지 않아요
//   · 조회    db.orm.public.ChallengeApplication / Challenge.where({ ... }).select('id', ...).first() / .all()
//   · 카운트  v7 _count.select 금지 → .include('<관계>', (r) => r.count())
//             또는 .aggregate((a) => ({ total: a.count() }))
//   · 생성    .select(...).create(data) · 다건은 createAll(rows)
//             (중복 무시는 createAll(rows, { onConflict: 'skip' }))
//   · 수정    .where({ id }).update(data) · 벌크 updateAll(data)   (v7 updateMany 아님)
//   · 삭제    .where({ id }).delete() · 벌크 deleteAll()            (v7 deleteMany 아님)
//   · 업서트  .upsert({ create, update, conflictOn })   (v8 은 .where() 없이 호출 · 비-PK 유니크는 conflictOn 으로 지정)
//   · 묶음    v7 $transaction([...]) 금지 → db.transaction(async (tx) => { ... })
//   · 에러    중복키 err.sqlState === '23505' → 서비스가 409 · 없음은 null 반환 → 서비스가 404
//   · 시간    DateTime 은 문자열로 돌아와요 — #utils 의 dbDateTimeToIso 를 재사용하세요
//
// ★ 만들었으면 3단계를 잊지 마세요 —
//   ① repositories/index.js 에 export 한 줄
//   ② common/di/container.js 에 singleton(AdminRepository) 등록
//   ③ 그 리포지토리를 쓰는 service 가 주입받게 연결
//
export class AdminRepository {
  // eslint-disable-next-line no-unused-private-class-members -- 골격 스텁이라 주입 필드를 아직 메서드에서 안 써요 (구현하면 지워도 돼요)
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // listApplications(...) { /* TODO */ }
  // getApplication(...) { /* TODO */ }
  // approveApplication(...) { /* TODO */ }
  // rejectApplication(...) { /* TODO */ }
  // listChallenges(...) { /* TODO */ }
  // createChallenge(...) { /* TODO */ }
  // updateChallenge(...) { /* TODO */ }
  // deleteChallenge(...) { /* TODO */ }
}
