// src/services/auth-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이) — auth service
// 📍 이 파일: src/services/auth-service.js
// 🔗 협력: controllers/auth/auth-controller.js(호출) · repositories/user-repository.js(DB)
//          · providers(토큰·쿠키·비밀번호·메일·재설정 토큰)
// 🔨 상태: 이메일 가입·로그인·로그아웃·내 정보·탈퇴·비밀번호 재설정 구현
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙: 서비스는 **비즈니스 규칙**만 해요.
//   · Prisma 를 직접 부르지 않아요 (리포지토리를 써요)
//   · bcrypt / jwt / crypto 를 직접 부르지 않아요 (Provider 를 써요)
//   · HTTP 상태코드를 만들지 않아요 (컨트롤러가 해요)
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '#exceptions';
import { DB_ERROR, ERROR_MESSAGE } from '#constants';
import { toPublicUser } from '#controllers/auth/dto/auth-dto.js';

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const normalizeNickname = (nickname) => String(nickname).trim();

export class AuthService {
  #userRepository;
  #gradeService;
  #tokenProvider;
  #passwordProvider;
  #passwordResetTokenRepository;
  #passwordResetTokenProvider;
  #mailProvider;
  #passwordResetUrl;
  #passwordResetTtlMinutes;

  constructor({
    userRepository,
    gradeService,
    tokenProvider,
    passwordProvider,
    passwordResetTokenRepository,
    passwordResetTokenProvider,
    mailProvider,
    passwordResetUrl,
    passwordResetTtlMinutes,
  }) {
    this.#userRepository = userRepository;
    this.#gradeService = gradeService;
    this.#tokenProvider = tokenProvider;
    this.#passwordProvider = passwordProvider;
    this.#passwordResetTokenRepository = passwordResetTokenRepository;
    this.#passwordResetTokenProvider = passwordResetTokenProvider;
    this.#mailProvider = mailProvider;
    this.#passwordResetUrl = passwordResetUrl;
    this.#passwordResetTtlMinutes = passwordResetTtlMinutes;
  }

  // ── 조회 ──────────────────────────────────────────────────
  /** 현재 사용자 + 활동 집계 (GET /auth/me) */
  async me(userId) {
    const user = await this.#userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND, null, 'USER_NOT_FOUND');
    }

    // gradeProgress 는 me 응답의 확정 계약(D-90) — 항상 현재 값을 다시 세어 준다.
    // 참여 수는 findById 가 이미 세어 왔으므로 그대로 넘겨 한 번만 세게 한다.
    const gradeProgress = await this.#gradeService.getProgress(userId, {
      participationCount: user._count.participations,
    });

    return {
      ...toPublicUser(user),
      stats: {
        participationCount: user._count.participations,
        applicationCount: user._count.applications,
        feedbackCount: user._count.feedbacks,
      },
      gradeProgress,
      createdAt: new Date(user.createdAt).toISOString(),
    };
  }

  // ── 가입·로그인 ───────────────────────────────────────────
  /**
   * 이메일 회원가입 — 중복을 먼저 확인하고, bcrypt 해시를 저장한 뒤 토큰을 발급해요.
   *   DB 의 UNIQUE 제약이 최종 방어선이라 23505 도 409 로 바꿉니다.
   */
  async signUp({ email, nickname, password }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedNickname = normalizeNickname(nickname);

    if (await this.#userRepository.findByEmail(normalizedEmail)) {
      throw new ConflictException(ERROR_MESSAGE.EMAIL_ALREADY_EXISTS);
    }
    if (await this.#userRepository.findByNickname(normalizedNickname)) {
      throw new ConflictException(ERROR_MESSAGE.NICKNAME_TAKEN);
    }

    const passwordHash = await this.#passwordProvider.hash(password);

    let user;
    try {
      user = await this.#userRepository.createLocal({
        email: normalizedEmail,
        nickname: normalizedNickname,
        passwordHash,
      });
    } catch (error) {
      // 동시에 같은 이메일/닉네임이 들어온 경우 — UNIQUE 위반을 409 로 안내해요.
      if (error?.sqlState === DB_ERROR.UNIQUE_VIOLATION) {
        throw new ConflictException(ERROR_MESSAGE.RESOURCE_CONFLICT);
      }
      throw error;
    }

    const tokens = this.#tokenProvider.generateTokens(user);
    return { user: toPublicUser(user), tokens };
  }

  /** 이메일 로그인 — 없는 계정과 틀린 비밀번호를 같은 401 메시지로 응답해요. */
  async login({ email, password }) {
    const user = await this.#userRepository.findByEmail(normalizeEmail(email));

    if (!user?.passwordHash) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_CREDENTIALS);
    }

    const matched = await this.#passwordProvider.compare(password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_CREDENTIALS);
    }

    // 로그인 시점에 등급을 다시 판정해요 (참여·추천은 다른 도메인에서 늘어나므로).
    const { grade } = await this.#gradeService.evaluate(user.id);
    const userWithGrade = { ...user, grade };
    const tokens = this.#tokenProvider.generateTokens(userWithGrade);

    return { user: toPublicUser(userWithGrade), tokens };
  }

  // ── 세션 ──────────────────────────────────────────────────
  /**
   * access 토큰의 사용자가 아직 활성인지 확인해요.
   *   deletedAt 이 있거나 tokenVersion 이 토큰의 ver 와 다르면 null → 401/쿠키 정리.
   */
  async resolveAccessUser(payload) {
    if (!payload?.userId) return null;

    const user = await this.#userRepository.findActiveAuthUserById(payload.userId);
    if (!user) return null;

    if (Number(user.tokenVersion ?? 0) !== Number(payload.ver ?? 0)) return null;

    return { id: user.id, role: user.role };
  }

  /**
   * refresh 토큰으로 새 토큰 한 쌍을 발급해요 — 강사님 정본(auth-service.js)의 refreshTokens 이식.
   *
   *   auth.middleware 가 "access 가 만료됐거나 곧 만료" 일 때 이 메서드를 불러요.
   *   토큰이 유효하지 않거나 그 사용자가 없으면 401(UnauthorizedException)을 던져요 —
   *   미들웨어는 이 401 만 "복구 실패(쿠키 삭제)"로 해석하고, 그 밖의 오류(DB 장애 등)는 그대로 올려보내요.
   */
  async refreshTokens(refreshToken) {
    const payload = this.#tokenProvider.verifyRefreshToken(refreshToken);
    if (!payload?.userId) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_TOKEN);
    }

    const user = await this.#userRepository.findActiveAuthUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_TOKEN);
    }

    // 비밀번호 변경·탈퇴로 tokenVersion 이 올라갔으면 기존 refresh 토큰도 거부해요.
    if (Number(user.tokenVersion ?? 0) !== Number(payload.ver ?? 0)) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_TOKEN);
    }

    const tokens = this.#tokenProvider.generateTokens(user);

    return { user, tokens };
  }

  // ── 내 정보 수정·탈퇴 ─────────────────────────────────────
  /**
   * PATCH /auth/me — 닉네임·비밀번호 중 받은 것만 수정해요.
   *   비밀번호를 바꾸면 tokenVersion 이 올라가 기존 토큰이 모두 무효가 되므로,
   *   새 토큰을 함께 발급해 현재 기기만 이어서 로그인 상태를 유지합니다.
   */
  async updateMe(userId, { nickname, password }) {
    const current = await this.#userRepository.findActiveAuthUserById(userId);
    if (!current) {
      throw new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND, null, 'USER_NOT_FOUND');
    }

    const normalizedNickname = nickname === undefined ? undefined : normalizeNickname(nickname);

    if (normalizedNickname !== undefined && normalizedNickname !== current.nickname) {
      const taken = await this.#userRepository.findByNickname(normalizedNickname);
      if (taken && taken.id !== Number(userId)) {
        throw new ConflictException(ERROR_MESSAGE.NICKNAME_TAKEN);
      }
    }

    const passwordHash =
      password === undefined ? undefined : await this.#passwordProvider.hash(password);

    const updated = await this.#userRepository.updateProfile({
      userId,
      nickname: normalizedNickname,
      passwordHash,
      bumpTokenVersion: password !== undefined,
    });

    if (!updated) {
      throw new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND, null, 'USER_NOT_FOUND');
    }

    const me = await this.me(userId);
    const tokens = password !== undefined ? this.#tokenProvider.generateTokens(updated) : null;

    return { me, tokens };
  }

  /** DELETE /auth/me — 소프트 삭제 + 익명화. 챌린지·작업물·피드백은 보존해요. */
  async validatePassword(userId, password) {
    const user = await this.#userRepository.findPasswordHashById(userId);
    if (!user?.passwordHash) {
      return null;
    }

    const matched = await this.#passwordProvider.compare(password, user.passwordHash);
    return matched ? user : null;
  }

  async deleteMe(userId) {
    const deleted = await this.#userRepository.softDeleteUser(userId);
    if (!deleted) {
      throw new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND, null, 'USER_NOT_FOUND');
    }
    return deleted;
  }

  // ── 비밀번호 재설정 ───────────────────────────────────────
  /**
   * 재설정 요청 — 계정 존재 여부를 노출하지 않도록 항상 같은 안내를 돌려줘요.
   *   계정이 있으면 기존 미사용 토큰을 닫고 새 토큰을 만들어 메일로 보냅니다.
   */
  async requestPasswordReset(email) {
    const user = await this.#userRepository.findByEmail(normalizeEmail(email));

    if (user) {
      const { token, tokenHash } = this.#passwordResetTokenProvider.create();
      const expiresAt = new Date(Date.now() + this.#passwordResetTtlMinutes * 60 * 1000);

      await this.#passwordResetTokenRepository.revokeActiveByUserId(user.id);
      await this.#passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = new URL(this.#passwordResetUrl);
      resetUrl.searchParams.set('token', token);

      try {
        await this.#mailProvider.sendPasswordReset({
          to: user.email,
          resetUrl: resetUrl.toString(),
          expiresAt,
        });
      } catch (error) {
        // 메일 실패를 그대로 올리면 "계정이 있다"는 사실이 드러날 수 있어요.
        // 서버 로그에만 남기고 사용자에게는 동일한 안내를 돌려줍니다.
        console.error('[auth] 비밀번호 재설정 메일 발송 실패:', error);
      }
    }

    return { message: ERROR_MESSAGE.PASSWORD_RESET_REQUESTED };
  }

  /** 재설정 확정 — 해시·만료·1회용을 모두 통과해야 비밀번호가 바뀌어요. */
  async confirmPasswordReset({ token, newPassword }) {
    const tokenHash = this.#passwordResetTokenProvider.hash(token);
    const record = await this.#passwordResetTokenRepository.findValidByHash(tokenHash);

    if (!record) {
      throw new BadRequestException(ERROR_MESSAGE.INVALID_RESET_TOKEN, null, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await this.#passwordProvider.hash(newPassword);
    const updated = await this.#userRepository.resetPassword({
      userId: record.userId,
      passwordHash,
      tokenId: record.id,
    });

    if (!updated) {
      throw new BadRequestException(ERROR_MESSAGE.INVALID_RESET_TOKEN, null, 'INVALID_RESET_TOKEN');
    }
  }
}
