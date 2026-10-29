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
//   · 조회    db.orm.public.Challenge.where({ ... }).select('id', ...).first() / .all()
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
// ★ 만들었으면 아래 3가지를 잊지 마세요 —
//   STEP 1 · repositories/index.js 에 export 한 줄
//   STEP 2 · common/di/container.js 에 singleton(AdminRepository) 등록
//   STEP 3 · 그 리포지토리를 쓰는 service 가 주입받게 연결
//
export class AdminRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // 관리자가 전체 신규 챌린지 제안 목록을 조회
  async listApplications(query) {
    const { q, status, sort = 'latest', page = 1, size = 10 } = query ?? {};

    const pageNumber = Number(page);
    const pageSize = Number(size);
    const offset = (pageNumber - 1) * pageSize;

    // 1.소프트 삭제되지 않은 신청서를 대상으로 검색 조건 구성
    let applicationQuery = this.#db.orm.public.Challenge.where((c) => c.deletedAt.isNull());

    if (status === 'APPROVED') {
      applicationQuery = applicationQuery.where((c) => c.status.in(['IN_PROGRESS', 'CLOSED']));
    } else if (status) {
      applicationQuery = applicationQuery.where({ status });
    } else {
      applicationQuery = applicationQuery.where((c) => c.status.neq('CANCELLED'));
    }

    if (q?.trim()) {
      const escapedQ = q.trim().replace(/[\\%_]/g, '\\$&');

      applicationQuery = applicationQuery.where((c) => c.title.ilike(`%${escapedQ}%`));
    }

    // 2.전체 신청서 개수 조회
    const { total: totalItems } = await applicationQuery.aggregate((a) => ({
      total: a.count(),
    }));

    // 3. 정렬 및 신청자 정보까지 함께 조회하는 공통 함수
    const fetchRows = (baseQuery, limit, skip) => {
      const order =
        sort === 'deadline'
          ? [(c) => c.deadline.asc(), (c) => c.id.desc()]
          : sort === 'oldest'
            ? [(c) => c.createdAt.asc(), (c) => c.id.asc()]
            : [(c) => c.createdAt.desc(), (c) => c.id.desc()];

      return baseQuery
        .orderBy(order)
        .limit(limit)
        .offset(skip)
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
        )
        .include('createdBy', (u) => u.select('id', 'nickname', 'email'))
        .all();
    };

    let applications;

    if (status) {
      applications = await fetchRows(applicationQuery, pageSize, offset);
    } else {
      // 4.기본 목록은 PENDING을 먼저 조회
      const pendingQuery = applicationQuery.where({
        status: 'PENDING',
      });
      const { total: pendingCount } = await pendingQuery.aggregate((a) => ({
        total: a.count(),
      }));

      const pendingLimit = Math.min(pageSize, Math.max(0, pendingCount - offset));

      const pendingRows =
        pendingLimit > 0 ? await fetchRows(pendingQuery, pendingLimit, offset) : [];

      const remaining = pageSize - pendingRows.length;
      const otherQuery = applicationQuery.where((c) => c.status.neq('PENDING'));

      const otherRows =
        remaining > 0
          ? await fetchRows(otherQuery, remaining, Math.max(0, offset - pendingCount))
          : [];
      applications = [...pendingRows, ...otherRows];
    }

    // 5.목록과 페이지 정보 반환
    return {
      items: applications,
      page: pageNumber,
      size: pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  // 관리자가 특정 챌린지 신청서 상세 조회
  async getApplication(applicationId) {
    return this.#db.orm.public.Challenge.where({
      id: Number(applicationId),
    })
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
        'createdAt',
      )
      .include('createdBy', (u) => u.select('id', 'nickname', 'email'))
      .first();
  }

  
  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // approveApplication(...) { /* TODO */ }
  // rejectApplication(...) { /* TODO */ }
  // listChallenges(...) { /* TODO */ }
  // createChallenge(...) { /* TODO */ }
  // updateChallenge(...) { /* TODO */ }
  // deleteChallenge(...) { /* TODO */ }
}
