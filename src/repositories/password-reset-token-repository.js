// 비밀번호 재설정 토큰 리포지토리 — Prisma 8 호출을 이 파일에 모아 둡니다.
//
//   · 원문 토큰은 절대 저장하지 않아요. 서비스가 만든 SHA-256 해시만 받습니다.
//   · 유효 조건 = usedAt IS NULL AND expiresAt > now()
//   · 새 토큰을 만들기 전에 기존 미사용 토큰을 usedAt 으로 닫아 1회용을 지켜요.
export class PasswordResetTokenRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  create({ userId, tokenHash, expiresAt }) {
    return this.#db.orm.public.PasswordResetToken.select(
      'id',
      'userId',
      'expiresAt',
      'usedAt',
      'createdAt',
    ).create({
      userId: Number(userId),
      tokenHash,
      expiresAt: new Date(expiresAt),
    });
  }

  findValidByHash(tokenHash) {
    const now = new Date();
    return this.#db.orm.public.PasswordResetToken.where((t) => t.tokenHash.eq(tokenHash))
      .where((t) => t.usedAt.isNull())
      .where((t) => t.expiresAt.gt(now))
      .select('id', 'userId', 'tokenHash', 'expiresAt', 'usedAt')
      .first();
  }

  /** 아직 쓰지 않은 토큰을 모두 닫아요 — 새 요청이 오면 이전 링크는 무효가 됩니다. */
  revokeActiveByUserId(userId) {
    return this.#db.orm.public.PasswordResetToken.where((t) => t.userId.eq(Number(userId)))
      .where((t) => t.usedAt.isNull())
      .updateAll({ usedAt: new Date() });
  }
}
