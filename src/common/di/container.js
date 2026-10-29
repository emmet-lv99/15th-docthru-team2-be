// ★ Awilix DI 컨테이너 — 새 도메인을 붙일 때 함께 손봐야 하는 파일이에요
//
// ─────────────────────────────────────────────────────────────
//  새 도메인 추가 3단계 (빈 폴더만 만들어 두면 서버가 기동 실패한다)
// ─────────────────────────────────────────────────────────────
//  ① controllers/<도메인>/<도메인>-controller.js 작성
//  ② **이 파일** 에 singleton(<도메인>Controller) 등록
//  ③ controllers/index.js 의 constructor + routes() 에 라우트 조립
//
//  왜 ②가 필수인가:
//    컨테이너가 injectionMode: PROXY + strict 로 돌아간다.
//    PROXY 모드에서 미등록 키를 만지면 해석을 시도하다가
//    `AwilixResolutionError: Could not resolve '<이름>'` 로 기동이 터진다.
//
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  · 파일 위치·설정값 — 아래 설정은 여기서 바꾸지 않는 것을 권해요
//    (InjectionMode.PROXY + strict, createContainer() 가 cradle 반환)
//  · 코끼리(private 필드) + 생성자 destructuring 주입: 동일
//  · DI 는 강의안에 없어요(강의안 37개 파일에서 awilix 0회).
//    (설정값을 바꾸면 기동 실패 같은 예상 바깥 문제가 생길 수 있어요 — 신중히)
import {
  asClass,
  asValue,
  createContainer as createAwilixContainer,
  InjectionMode,
  Lifetime,
} from 'awilix';

import { config } from '#config';
import { db } from '#prisma/db.js';
import { Controller } from '#controllers';

import { AuthController } from '#controllers/auth/auth-controller.js';
import { ApplicationsController } from '#controllers/applications/applications-controller.js';
import { GoogleAuthController } from '#controllers/auth/google-controller.js';
import { DevController } from '#controllers/dev/dev-controller.js';
import { MeController } from '#controllers/me/me-controller.js';
import { WorksController } from '#controllers/works/works-controller.js';
import { ChallengesController } from '#controllers/challenges/challenges-controller.js';

import {
  AuthService,
  GoogleAuthService,
  GradeService,
  ApplicationService,
  MeService,
  WorkService,
  ChallengeService,
} from '#services';

import {
  GradeRepository,
  PasswordResetTokenRepository,
  UserRepository,
  ApplicationRepository,
  MeRepository,
  WorkRepository,
  ChallengeRepository,
} from '#repositories';

import {
  CookieProvider,
  MailProvider,
  OAuthStateProvider,
  PasswordProvider,
  PasswordResetTokenProvider,
  TokenProvider,
} from '#providers';

import { AuthMiddleware } from '#middlewares/auth-middleware.js';

// asClass(X, { lifetime: SINGLETON }) 의 짧은 별칭
const singleton = (Klass) => asClass(Klass, { lifetime: Lifetime.SINGLETON });

export const createContainer = () => {
  const container = createAwilixContainer({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    // ── 값 (asValue) — 설정값은 DI 로 주입한다 ────────────────
    // db: Prisma 8 런타임 클라이언트. 리포지토리만 이 값을 주입받아 쓴다.
    db: asValue(db),
    config: asValue(config),
    jwtAccessSecret: asValue(config.JWT_ACCESS_SECRET),
    jwtRefreshSecret: asValue(config.JWT_REFRESH_SECRET),
    // 이 두 값만 바꾸면 전 영역의 쿠키명이 함께 바뀐다.
    accessTokenName: asValue('accessToken'),
    refreshTokenName: asValue('refreshToken'),
    isProduction: asValue(config.IS_PRODUCTION),
    enableDevLogin: asValue(config.ENABLE_DEV_LOGIN),

    // ── Google OAuth 값 ──────────────────────────────────────
    // 자격 증명이 비어 있어도 앱은 뜨고, /auth/google 이 400 으로 안내해요.
    clientBaseUrl: asValue(config.CLIENT_BASE_URL),
    oauthStateSecret: asValue(config.OAUTH_STATE_SECRET),
    oauthCallbackPath: asValue(config.GOOGLE_CALLBACK_PATH),
    googleClientId: asValue(config.GOOGLE_CLIENT_ID),
    googleClientSecret: asValue(config.GOOGLE_CLIENT_SECRET),
    googleRedirectUri: asValue(config.GOOGLE_REDIRECT_URI),

    // ── 메일 / 비밀번호 재설정 값 ─────────────────────────────
    passwordResetUrl: asValue(config.PASSWORD_RESET_URL),
    passwordResetTtlMinutes: asValue(config.PASSWORD_RESET_TTL_MINUTES),

    // ── Providers ────────────────────────────────────────────
    // 외부_IO 를 감싼 것. 컨트롤러·서비스가 직접 호출하지 않는다.
    cookieProvider: singleton(CookieProvider),
    passwordProvider: singleton(PasswordProvider),
    tokenProvider: singleton(TokenProvider),
    // 메일 — 기본 console, MAIL_PROVIDER=ses 로 실제 발송 전환
    mailProvider: singleton(MailProvider),
    // 재설정 토큰 원문 생성·SHA-256 해시
    passwordResetTokenProvider: singleton(PasswordResetTokenProvider),
    // state 서명 · PKCE 생성/검증 (Google 단일 공급자)
    oauthStateProvider: singleton(OAuthStateProvider),

    // ── Repositories ─────────────────────────────────────────
    // Prisma 를 감싼 것. 서비스의 유일한 DB 출구.
    userRepository: singleton(UserRepository),
    passwordResetTokenRepository: singleton(PasswordResetTokenRepository),
    // 등급 진행도 집계 — 공용 인프라. GET /auth/me(gradeProgress) 와
    // 로그인 자동 승급(담당 ③)이 함께 쓴다.
    gradeRepository: singleton(GradeRepository),
    applicationRepository: singleton(ApplicationRepository),
    workRepository: singleton(WorkRepository),
    meRepository: singleton(MeRepository),
    challengeRepository: singleton(ChallengeRepository),

    // ── Services ─────────────────────────────────────────────
    authService: singleton(AuthService),
    // Google OAuth — 코드 교환 · 프로필 조회 · 계정 연결/생성
    googleAuthService: singleton(GoogleAuthService),
    // 등급 진행도 · 자동 승급 — 공용 인프라 (getProgress=뼈대, evaluate=③이 로그인에서 호출)
    gradeService: singleton(GradeService),
    applicationService: singleton(ApplicationService),
    workService: singleton(WorkService),
    meService: singleton(MeService),
    challengeService: singleton(ChallengeService),

    // ── Middlewares ──────────────────────────────────────────
    // 전역 1개. 인증을 "강제"하지 않고 req.user 만 채운다.
    authMiddleware: singleton(AuthMiddleware),

    // ── Controllers ──────────────────────────────────────────
    authController: singleton(AuthController),
    // Google OAuth 2경로 — /auth/google · /auth/google/callback
    googleAuthController: singleton(GoogleAuthController),
    applicationsController: singleton(ApplicationsController),
    meController: singleton(MeController),
    worksController: singleton(WorksController),
    challengesController: singleton(ChallengesController),

    // 개발 전용 로그인 컨트롤러 — 꺼져 있으면 **아예 등록하지 않는다**.
    //   asValue(null) 로 두면 루트 Controller 의 `if (this.#devController)` 가
    //   걸려 라우트가 붙지 않는다. DI 에 키가 아예 없으면 strict 모드에서 터지므로
    //   키는 항상 존재시키고 값만 바꾼다.
    devController: DevController.isEnabled() ? singleton(DevController) : asValue(null),

    // ── Root Controller ──────────────────────────────────────
    controller: singleton(Controller),
  });

  return container.cradle;
};
