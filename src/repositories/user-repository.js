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
      .where((u) => u.deletedAt.isNull())
      .select('id', 'email', 'nickname', 'role', 'grade', 'createdAt')
      .first();

    if (!row) return null;

    // v7 의 _count.select 를 v8 에서는 모델별 count 3회로 조립한다.
    const [participations, applications, feedbacks] = await Promise.all([
      this.#db.orm.public.ChallengeParticipant.where({ userId }).aggregate((a) => ({
        total: a.count(),
      })),
      // 신청은 challenges 행으로 합쳐졌어요 — 내가 만든 챌린지(신청 포함)를 셉니다.
      this.#db.orm.public.Challenge.where({ createdById: userId }).aggregate((a) => ({
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
      .where((u) => u.deletedAt.isNull())
      .select('id', 'email', 'nickname', 'passwordHash', 'role', 'grade', 'tokenVersion')
      .first();
  }

  findByNickname(nickname) {
    return this.#db.orm.public.User.where({ nickname })
      .where((u) => u.deletedAt.isNull())
      .select('id', 'nickname')
      .first();
  }

  findPasswordHashById(userId) {
    return this.#db.orm.public.User.where({ id: Number(userId) })
      .where((u) => u.deletedAt.isNull())
      .select('id', 'passwordHash')
      .first();
  }

  /**
   * 인증 미들웨어·내 정보 수정 전용 — 매 요청마다 필요한 컬럼만 읽어요.
   *   findById 는 활동 집계 3회를 더 하므로 요청마다 쓰면 비싸요.
   *   deletedAt 이 채워졌거나 tokenVersion 이 토큰과 다르면 null 이에요.
   */
  findActiveAuthUserById(userId) {
    return this.#db.orm.public.User.where({ id: Number(userId) })
      .where((u) => u.deletedAt.isNull())
      .select('id', 'nickname', 'role', 'tokenVersion')
      .first();
  }

  /** 로컬(이메일) 가입 — passwordHash 가 있는 계정을 만들어요. */
  createLocal({ email, nickname, passwordHash }) {
    return this.#db.orm.public.User.select(
      'id',
      'email',
      'nickname',
      'role',
      'grade',
      'tokenVersion',
    ).create({ email, nickname, passwordHash });
  }

  /**
   * 내 정보 수정 — 비밀번호를 바꾸면 tokenVersion 을 1 올려 기존 토큰을 무효화해요.
   *   같은 트랜잭션에서 현재 버전을 읽어 +1 하므로 동시 수정에도 값이 사라지지 않아요.
   */
  updateProfile({ userId, nickname, passwordHash, bumpTokenVersion = false }) {
    return this.#db.transaction(async (tx) => {
      const current = await tx.orm.public.User.where({ id: Number(userId) })
        .where((u) => u.deletedAt.isNull())
        .select('tokenVersion')
        .first();

      if (!current) return null;

      const data = {};
      if (nickname !== undefined) data.nickname = nickname;
      if (passwordHash !== undefined) data.passwordHash = passwordHash;
      if (bumpTokenVersion) data.tokenVersion = Number(current.tokenVersion ?? 0) + 1;

      return tx.orm.public.User.where({ id: Number(userId) })
        .select('id', 'email', 'nickname', 'role', 'grade', 'tokenVersion')
        .update(data);
    });
  }

  /**
   * 탈퇴 — 소프트 삭제 + 개인정보 익명화 + 세션·재설정 토큰 무효화.
   *   email·nickname 은 UNIQUE·NOT NULL 이라 NULL 대신 고유한 익명 값으로 바꿔요.
   *   챌린지·작업물·피드백 행은 그대로 보존됩니다.
   */
  softDeleteUser(userId) {
    return this.#db.transaction(async (tx) => {
      const id = Number(userId);
      const current = await tx.orm.public.User.where({ id })
        .where((u) => u.deletedAt.isNull())
        .select('tokenVersion')
        .first();

      if (!current) return null;

      const now = new Date();
      const deleted = await tx.orm.public.User.where({ id })
        .select('id', 'email', 'nickname', 'deletedAt', 'tokenVersion')
        .update({
          email: `deleted-${id}@deleted.invalid`,
          nickname: `탈퇴한 사용자 ${id}`,
          passwordHash: null,
          provider: null,
          providerAccountId: null,
          deletedAt: now,
          tokenVersion: Number(current.tokenVersion ?? 0) + 1,
        });

      await tx.orm.public.PasswordResetToken.where((t) => t.userId.eq(id))
        .where((t) => t.usedAt.isNull())
        .updateAll({ usedAt: now });

      return deleted;
    });
  }

  /**
   * 비밀번호 재설정 확정 — 비밀번호 교체 + 토큰 1회 사용 처리 + 나머지 토큰 폐기.
   *   한 트랜잭션이라 "비밀번호는 바뀌었는데 토큰은 안 닫힘" 같은 중간 상태가 없어요.
   */
  resetPassword({ userId, passwordHash, tokenId }) {
    return this.#db.transaction(async (tx) => {
      const id = Number(userId);
      const current = await tx.orm.public.User.where({ id })
        .where((u) => u.deletedAt.isNull())
        .select('tokenVersion')
        .first();

      if (!current) return null;

      const now = new Date();
      const updated = await tx.orm.public.User.where({ id })
        .select('id', 'email', 'nickname', 'role', 'grade', 'tokenVersion')
        .update({
          passwordHash,
          tokenVersion: Number(current.tokenVersion ?? 0) + 1,
        });

      await tx.orm.public.PasswordResetToken.where({ id: Number(tokenId) }).update({
        usedAt: now,
      });
      await tx.orm.public.PasswordResetToken.where((t) => t.userId.eq(id))
        .where((t) => t.usedAt.isNull())
        .updateAll({ usedAt: now });

      return updated;
    });
  }

  // ── OAuth 연결 (Google) ────────────────────────────────────
  /**
   * (provider, providerAccountId) 로 연결된 사용자를 찾아요.
   *   Google 계정 정보는 users 행에 함께 저장되어 있어 조인이 필요 없습니다.
   *   연결이 없으면 null 이에요 (에러 아님) — 그러면 서비스가 이메일로 이어 붙일지 판단해요.
   */
  findUserByOAuthAccount(provider, providerAccountId) {
    return this.#db.orm.public.User.where({ provider, providerAccountId })
      .where((u) => u.deletedAt.isNull())
      .select('id', 'email', 'nickname', 'role', 'grade', 'tokenVersion')
      .first();
  }

  /**
   * 새 사용자 + Google 연결을 한 번에 만들어요.
   *   · 비밀번호가 없는 소셜 전용 계정이라 passwordHash 는 비워 둡니다 (nullable).
   *   · users 한 행에 provider 정보가 함께 들어가므로 트랜잭션이 필요 없어요.
   */
  createWithOAuthAccount({ email, nickname, provider, providerAccountId }) {
    return this.#db.orm.public.User.select(
      'id',
      'email',
      'nickname',
      'role',
      'grade',
      'tokenVersion',
    ).create({
      email,
      nickname,
      provider,
      providerAccountId,
    });
  }

  /** 기존 이메일 계정에 Google 연결만 추가해요. 탈퇴 계정에는 연결하지 않습니다. */
  linkOAuthAccount({ userId, provider, providerAccountId }) {
    return this.#db.orm.public.User.where({ id: Number(userId) })
      .where((u) => u.deletedAt.isNull())
      .update({
        provider,
        providerAccountId,
      });
  }
}
