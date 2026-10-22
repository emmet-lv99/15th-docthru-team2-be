import bcrypt from 'bcrypt';

// bcrypt 해시 (D-08)
const SALT_ROUNDS = 10;

export class PasswordProvider {
  async hash(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  async compare(plainPassword, passwordHash) {
    if (!passwordHash) return false;
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
