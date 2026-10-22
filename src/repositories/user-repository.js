// src/repositories/user-repository.js
//
// 👤 담당: 팀원 ③(인증 · 마이) — user repository
// ★ 계층 규칙: **서비스의 유일한 DB 출구**가 리포지토리다.
//   컨트롤러·서비스에서 db 를 직접 부르면 안 된다.
//   (DB 를 다루는 지식이 이 한 파일에 몰려 있어야 교체·테스트가 쉽다)
//
//   constructor({ db }) 로만 주입받고, #private 필드로 보관한다.
//   (DI 컨테이너가 db 키를 asValue(db) 로 등록해 두었어요)
//
// ── Prisma 8 쿼리 모양 ──────────────────────────────────────────
//   v7: prisma.user.findUnique({ where, select })
//   v8: db.orm.public.User.where({ ... }).select('id', 'email').first()
//   · 관계 카운트(_count.select)는 지원하지 않아, 카운트가 필요하면
//     그 모델을 aggregate(count) 로 따로 세어 조립해요.
//   · 없는 레코드는 "에러 없이 null" 이라 404 분기는 서비스가 그대로 한다.
//
import { dbDateTimeToIso } from '#utils';

// ── 시간(DateTime) 보정 ────────────────────────────────────────
//   v8 은 DATETIME 을 "문자열"로 돌려줘요. 그래서 꺼낼 때 Date 로 보정합니다.
//   보정 규칙은 #utils 의 dbDateTimeToIso 한 곳에 모아 두었어요 (다른 리포지토리도 재사용).
//     · "2025-04-10 09:00:00"         — 시간대 없음 → UTC 로 해석
//     · "2026-10-16 09:05:50.823+09"  — 오프셋 포함 → 그대로 신뢰

export class UserRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // ── 조회 ──────────────────────────────────────────────────
  // select 로 필요한 필드만 고른다. * 로 전체를 당겨 오면
  // passwordHash 가 실수로 컨트롤러까지 올라갈 여지가 생긴다.

  async findById(userId) {
    const row = await this.#db.orm.public.User.where({ id: Number(userId) })
      .select('id', 'email', 'nickname', 'role', 'grade', 'createdAt')
      .first();

    if (!row) return null;

    // v7 의 _count.select 를 v8 에서는 모델별 count 3회로 조립한다.
    const [participations, applications, feedbacks] = await Promise.all([
      this.#db.orm.public.ChallengeParticipant.where({ userId }).aggregate((a) => ({
        total: a.count(),
      })),
      this.#db.orm.public.ChallengeApplication.where({ userId }).aggregate((a) => ({
        total: a.count(),
      })),
      this.#db.orm.public.Feedback.where({ userId }).aggregate((a) => ({ total: a.count() })),
    ]);

    // v7 select 답 모양과 동일한 모양으로 조립 — 서비스(stats·createdAt) 변경 없음
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      role: row.role,
      grade: row.grade,
      createdAt: dbDateTimeToIso(row.createdAt),
      _count: {
        participations: participations.total,
        applications: applications.total,
        feedbacks: feedbacks.total,
      },
    };
  }

  findByEmail(email) {
    return this.#db.orm.public.User.where({ email })
      .select('id', 'email', 'nickname', 'passwordHash', 'role', 'grade')
      .first();
  }

  findByNickname(nickname) {
    return this.#db.orm.public.User.where({ nickname }).select('id', 'nickname').first();
  }

  // ── OAuth 연결 (Google) ────────────────────────────────────
  /**
   * (provider, providerAccountId) 로 연결된 계정을 찾아요.
   *   OAuthAccount → User 를 include 로 한 번에 당겨 옵니다.
   *   연결이 없으면 null 이에요 (에러 아님) — 그러면 서비스가 이메일로 이어 붙일지 판단해요.
   */
  findUserByOAuthAccount(provider, providerAccountId) {
    return this.#db.orm.public.OAuthAccount.where({ provider, providerAccountId })
      .select('id', 'userId')
      .include('user', (user) => user.select('id', 'email', 'nickname', 'role', 'grade'))
      .first();
  }

  /**
   * 새 사용자 + OAuth 연결을 **한 트랜잭션**으로 만들어요.
   *   · 비밀번호가 없는 소셜 전용 계정이라 passwordHash 는 비워 둡니다 (nullable).
   *   · 사용자만 만들어지고 연결이 빠지는 반쪽 상태를 막으려고 트랜잭션을 써요.
   */
  createWithOAuthAccount({ email, nickname, provider, providerAccountId }) {
    return this.#db.transaction(async (tx) => {
      const user = await tx.orm.public.User.select(
        'id',
        'email',
        'nickname',
        'role',
        'grade',
      ).create({ email, nickname });

      await tx.orm.public.OAuthAccount.create({
        userId: user.id,
        provider,
        providerAccountId,
      });

      return user;
    });
  }

  /** 기존 이메일 계정에 Google 연결만 추가해요. */
  linkOAuthAccount({ userId, provider, providerAccountId }) {
    return this.#db.orm.public.OAuthAccount.create({ userId, provider, providerAccountId });
  }
}
