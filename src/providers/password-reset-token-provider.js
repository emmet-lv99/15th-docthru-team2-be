// 비밀번호 재설정 토큰 — 원문은 메일 링크에만, DB 에는 SHA-256 해시만 남겨요.
//
// 왜 해시로 저장하나요?
//   DB 가 유출돼도 링크를 그대로 재사용할 수 없게 하기 위해서예요.
//   비밀번호를 bcrypt 로 저장하는 것과 같은 이유(원문 미보관)입니다.
import { createHash, randomBytes } from 'node:crypto';

export class PasswordResetTokenProvider {
  /** 32바이트 난수 → 64자 hex 원문 토큰과 DB 저장용 해시를 함께 만들어요. */
  create() {
    const token = randomBytes(32).toString('hex');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token) {
    return createHash('sha256').update(token).digest('hex');
  }
}
