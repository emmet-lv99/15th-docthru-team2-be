// src/services/google-auth-service.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ③(인증 · 마이) — Google OAuth service
// 📍 이 파일: src/services/google-auth-service.js
// 🔗 협력: controllers/auth/google-controller.js(호출) · repositories/user-repository.js(DB)
// 🔨 상태: 스텁(지침서) — 아래 골격의 TODO 를 채우세요
// ══════════════════════════════════════════════════════════════
//
// ★ 계층 규칙 — 서비스는 "비즈니스 규칙" 자리예요.
//   · HTTP 상태코드(302/400)와 리다이렉트는 하지 않아요 (그건 컨트롤러 몫).
//   · 구글 토큰 교환 · 프로필 조회 · 계정 연결/생성 같은 규칙 → 여기에서 판단
//   · DB 는 주입받은 UserRepository 로만 (Prisma 직접 import 금지)
//
// 이 서비스가 하는 일 — 구글 인가 코드를 우리 로그인으로 바꾸는 흐름 (요구 3.1)
//   · 코드 → 구글 토큰 교환 → 프로필(id·email·name) 조회
//   · 이메일이 같은 기존 계정이 있으면 **연결**, 없으면 **새 계정 생성 + 연결** (한 트랜잭션)
//   · 우리 토큰(access·refresh) 발급까지 마치면 컨트롤러가 쿠키로 실어 보내요
//
// 🧩 주입되는 것 (DI 컨테이너에 이미 등록돼 있어요 — 필요한 것만 꺼내 쓰세요)
//    · userRepository      — findUserByOAuthAccount · findByEmail · createWithOAuthAccount · linkOAuthAccount (구현돼 있어요)
//    · tokenProvider       — generateTokens(user)
//    · googleClientId · googleClientSecret · googleRedirectUri — 구글 앱 자격 증명
//    · fetchFn             — 테스트에서 주입 가능한 fetch
//
// ★ 만들었으면 — services/index.js 의 export 는 이미 있고, common/di/container.js 에도 이미 등록돼 있어요.
//
/* eslint-disable no-unused-private-class-members -- 골격 스텁이라 주입 필드를 아직 메서드에서 안 써요 (구현하면 지워도 돼요) */
export class GoogleAuthService {
  #userRepository;
  #tokenProvider;
  #clientId;
  #clientSecret;
  #redirectUri;
  #fetch;

  constructor({
    userRepository,
    tokenProvider,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    fetchFn,
  }) {
    this.#userRepository = userRepository;
    this.#tokenProvider = tokenProvider;
    this.#clientId = googleClientId;
    this.#clientSecret = googleClientSecret;
    this.#redirectUri = googleRedirectUri;
    this.#fetch = fetchFn;
  }

  // ── 골격 (아래는 이 도메인에서 자주 쓰는 메서드 예요 — 필요한 것만 남기고 구현하세요) ──
  // loginOrSignUp({ code, codeVerifier }) { /* TODO: 토큰 교환 → 프로필 → 계정 연결/생성 → 우리 토큰 발급 */ }
}
