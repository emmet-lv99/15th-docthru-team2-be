// src/controllers/auth/google-controller.js
// Google OAuth — 로그인 시작 · 콜백 (심화 3.1)
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이) — Google OAuth 2경로
// 📍 이 파일: src/controllers/auth/google-controller.js → 라우트 /auth/google · /auth/google/callback
// 🔗 협력: services/google-auth-service.js(토큰 교환·계정 연결) · providers/oauth-state-provider.js(state·PKCE)
//          · controllers/auth/auth-controller.js(같은 /auth 접두사) · dto/google-dto.js(요청 검증 계약)
// 🔨 상태: 뼈대(지침서) — routes() 를 이 파일 안 "연결 가이드 STEP 1~4" 순서대로 채워 주세요
// ══════════════════════════════════════════════════════════════
//
// 이 도메인이 하는 것 — 구글 계정으로 회원가입·로그인 (요구 3.1 · 심화)
//
// 구현 대상 API (2건 — 요청·응답 필드는 /api-docs (Swagger) · dto/google-dto.js 참고)
//   GET /auth/google            시작 — 서명된 state(+PKCE verifier)를 만들고 구글 인증 화면으로 302
//   GET /auth/google/callback   콜백 — state·PKCE 검증 → 토큰 교환 → 우리 httpOnly 쿠키 발급 → FE 로 302
//
// 🧩 쓸 부품 (모두 DI 컨테이너에 이미 등록돼 있어요 — 주입받아 쓰면 됩니다)
//    · providers/oauth-state-provider.js — state 서명·검증 · PKCE 생성/검증
//    · providers/cookie-provider.js — 거래 쿠키 set/get/clear · 로그인 토큰 쿠키 set
//    · services/google-auth-service.js — 토큰 교환·프로필 조회·계정 연결 (이 repo 에서 함께 만드는 스텁)
//    · controllers/auth/dto/google-dto.js — 요청 검증 스키마 (제공 · 이 파일이 import 해 씁니다)
//
// 💡 구현 메모
//    · 자격 증명(GOOGLE_CLIENT_ID·SECRET)이 비어 있으면 시작 라우트는 302 대신 **400** 으로 안내해요
//      (앱 자체는 정상 기동 — config 의 optional 처리 · .env.example 참고)
//    · next(로그인 후 돌아갈 FE 경로)는 state 안에 서명해 실어 보내고, 콜백에서 꺼내 **같은 사이트 경로**인지 검사해요
//      (open redirect 방지)
//    · 인증은 httpOnly 쿠키 고정이에요 (D-06) — Bearer 헤더를 쓰지 않아요
//    · 계약 경로 2건은 auth.schema.js 에 이미 등록돼 있어요 — 경로·Swagger 문서는 그대로예요 (수정 불필요)
//
// ─────────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 4단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────────
//  STEP 1 · 컨트롤러 — routes() 의 TODO 자리에 아래 두 라우트를 붙여요
//       this.router.get('/google', validate('query', googleStartQuerySchema), (req, res, next) =>
//         this.start(req, res, next),
//       );
//       this.router.get('/google/callback', (req, res, next) => {
//         this.#cookieProvider.clearOAuthTransactionCookies(res); // 재사용 방지 — 진입하자마자 거래 쿠키 정리
//         next();
//       }, validate('query', googleCallbackQuerySchema), (req, res, next) => this.callback(req, res, next));
//  STEP 2 · 콜백 본문 — 서비스의 두 창구를 차례로 불러요 (공급자 통신과 계정 규칙을 나눠 둔 구조)
//       const profile = await this.#googleAuthService.getGoogleProfile({ code, codeVerifier });
//       const { tokens } = await this.#googleAuthService.loginOrSignUp({ provider: 'google', profile });
//       // → tokens.accessToken · refreshToken 을 쿠키에 싣고 transaction.next 로 302
//       // · codeVerifier 는 providers/cookie-provider.js 에서 꺼내요 (PKCE 짝 확인)
//       // · 검증·교환 실패는 예외로 던지면 error-handler 가 공통 형식으로 응답해요
//  STEP 3 · DI 등록 — 이미 돼 있어요 (common/di/container.js: googleAuthController: singleton(GoogleAuthController))
//  STEP 4 · 라우트 조립 — 이미 돼 있어요 (controllers/index.js: this.router.use('/auth', this.#googleAuthController.routes()))
//
// 🏁 완료 판정 —
//    ① 이 화면이 쓰는 API 경로가 pnpm test:contract 에서 초록인지
//    ② 자격 증명 미설정 시 /auth/google 이 400(안내), 설정 시 302(구글) 로 동작하는지
//    ③ 본인 화면의 디자인 근거(PNG · 토큰)를 충실히 따랐는지
//
// 아래 골격은 구현 전 안내예요 — routes() 를 채우면 돼요
import { BaseController } from '#controllers/base-controller.js';

export class GoogleAuthController extends BaseController {
  constructor() {
    super();
  }

  routes() {
    // TODO: 위 ① 대로 /google · /google/callback 라우트를 붙여요
    return this.router;
  }
}
