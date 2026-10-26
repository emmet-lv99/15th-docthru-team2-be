// src/repositories/application-repository.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ⑤(제안 · 승인) — application repository
// 📍 이 파일: src/repositories/application-repository.js
// 🔗 협력: services/application-service.js 가 이 리포지토리만 부르게 돼요
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우고, 필요 없는 메서드는 지워도 돼요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 이 파일이 서비스의 유일한 DB 출구예요.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 돼요 (DB 지식을 이 한 파일에 모으는 게 목적).
//   constructor({ db }) 로만 주입받고 #private 필드에 보관합니다 (DI 가 db 키를 asValue(db) 로 등록해 둠).
//
// 🐘 prisma-8 쿼리 모양 — 아래 v7 문법은 쓰지 않아요
//   · 조회    db.orm.public.Challenge.where({ status: 'PENDING', ... }).select('id', ...).first() / .all()
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
//   ② common/di/container.js 에 singleton(ApplicationRepository) 등록
//   ③ 그 리포지토리를 쓰는 service 가 주입받게 연결
//
export class ApplicationRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // 로그인한 사용자가 신청한 챌린지 목록을 DB에서 조회한다.
  async listMyApplications(userId, query) {
    const { q, status, sort, page = 1, size = 10 } = query ?? {};

    // 기본 조건: 본인이 신청했고 삭제되지 않은 데이터
    const conditions = {
      createdById: userId,
      deletedAt: null,
    };

    let applicationQuery = this.#db.orm.public.Challenge.where(conditions);

    // 사용자가 선택한 상태에 따라 조건을 추가한다.
    if (status === 'APPROVED') {
      applicationQuery = applicationQuery.where((c) => c.status.in(['IN_PROGRESS', 'CLOSED']));
    } else if (status) {
      applicationQuery = applicationQuery.where({ status });
    }

    // 검색어가 있을 때만 제목 검색 조건을 추가한다.
    if (q?.trim()) {
      applicationQuery = applicationQuery.where((c) => c.title.ilike(`%${q.trim()}%`));
    }

    // 1.검색 상태 조건에 맞는 전체 신청서 개수를 계산한다
    const { total: totalItems } = await applicationQuery.aggregate((a) => ({
      total: a.count(),
    }));

    // 2.현재 페이지에 표시할 신청서 목록만 가져온다
    const applications = await applicationQuery

      .orderBy(
        sort === 'deadline'
          ? [(c) => c.deadline.asc(), (c) => c.id.desc()]
          : [(c) => c.createdAt.desc(), (c) => c.id.desc()],
      )
      .limit(Number(size))
      .offset((Number(page) - 1) * Number(size))
      .select(
        'id',
        'title',
        'category',
        'documentType',
        'sourceUrl',
        'content',
        'deadline',
        'maxParticipants',
        'status',
        'rejectionReason',
        'decidedAt',
        'cancelledAt',
        'createdAt',
        'deletedAt',
        'deleteReason',
      )
      .all();

    // 3.목록 데이터와 페이지 정보를 함께 반환한다
    return {
      items: applications,
      page: Number(page),
      size: Number(size),
      totalItems,
      totalPages: Math.ceil(totalItems / Number(size)),
    };
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // createApplication(...) { /* TODO */ }
  // getMyApplication(...) { /* TODO */ }
  // cancelApplication(...) { /* TODO */ }
}
