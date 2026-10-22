// src/services/auth-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이) — auth service
// 📍 이 파일: src/services/auth-service.js
// 🔗 협력: controllers/auth/auth-controller.js(호출) · repositories/user-repository.js(DB) · providers(토큰·쿠키·비밀번호)
// 🔨 상태: 일부 제공 — `/auth/me` 는 동작, **signup·login·logout 은 ③이 구현**
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙: 서비스는 **비즈니스 규칙**만 한다.
//   · Prisma 를 직접 부르지 않는다 (리포지토리를 쓴다)
//   · bcrypt / jwt 를 직접 부르지 않는다 (Provider 를 쓴다)
//   · HTTP 상태코드를 만들지 않는다 (컨트롤러가 한다)
//
//
// ⚠️ 이 파일에는 **로그인·회원가입 로직이 없다.**
//    signup·login·logout 은 담당(③)이 아래에 추가한다.
import { NotFoundException, UnauthorizedException } from '#exceptions';
import { ERROR_MESSAGE } from '#constants';
import { toPublicUser } from '#controllers/auth/dto/auth-dto.js';

export class AuthService {
  #userRepository;
  #gradeService;
  #tokenProvider;

  // ⚠️ signup·login 을 구현할 때 아래 하나를 생성자에 더 받는다.
  //    passwordProvider
  //    (tokenProvider 는 refresh 재발급(refreshTokens)에 쓰여서 이미 받아 두었어요)
  constructor({ userRepository, gradeService, tokenProvider }) {
    this.#userRepository = userRepository;
    this.#gradeService = gradeService;
    this.#tokenProvider = tokenProvider;
  }

  // ── 공통 ──────────────────────────────────────────────────
  // 응답·로그에 노출할 필드만 고르는 toPublicUser 는
  // controllers/auth/dto/auth-dto.js 로 옮겼어요 (passwordHash 는 절대 포함하지 않아요).

  // ── 조회 ──────────────────────────────────────────────────
  /** 현재 사용자 + 활동 집계 (GET /auth/me) */
  async me(userId) {
    const user = await this.#userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND, null, 'USER_NOT_FOUND');
    }

    // gradeProgress 는 me 응답의 확정 계약(D-90) — 항상 현재 값을 다시 세어 준다.
    const gradeProgress = await this.#gradeService.getProgress(userId);

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

  // ── 세션 복구 (refresh 재발급) ────────────────────────────
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

    const user = await this.#userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_TOKEN);
    }

    const tokens = this.#tokenProvider.generateTokens(user);

    return { user, tokens };
  }

  // ── 작성 (담당자가 구현) ──────────────────────────────────
  //   signUp({ email, nickname, password })
  //     → findByEmail / findByNickname 로 중복 확인
  //     → passwordProvider.hash(password) 로 해시 생성 후 저장
  //     → tokenProvider.generateTokens(user) 로 토큰 발급
  //
  //   login({ email, password })
  //     → findByEmail 로 조회
  //     → passwordProvider.compare(...) 로 검증
  //     → tokenProvider.generateTokens(user) 로 토큰 발급
  //
  //   ⚠️ bcrypt 는 72바이트 제한이 있다. 超長 비밀번호는 잘려서 해시된다.
  //      검증 시 Buffer.byteLength(password) 로 길이를 재고 초과하면 걸러야 한다.
  //      (bcrypt 문서 참고)
}
