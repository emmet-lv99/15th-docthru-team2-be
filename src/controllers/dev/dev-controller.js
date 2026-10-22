// src/controllers/dev/dev-controller.js
//
// 👤 담당: 🔷 공용 (개발 로그인 — 운영 404)
// ╔══════════════════════════════════════════════════════════════════╗
// ║  개발 전용 — 운영 환경에서 이 라우트는 존재하지 않는다            ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// 왜 이 파일이 있는가
//   이 뼈대에는 POST /auth/signup · /auth/login 이 없다.
//   각자 맡은 화면의 담당자가 직접 구현해야 하는데,
//   그전까지 보호된 페이지(마이페이지·알림·어드민)를 아무도 검증할 수 없다.
//
//   → 시드로 넣어 둔 개발 계정으로 로그인해 바로 검증할 수 있게 한다.
//
// 안전장치 (이중으로 막는다)
//   ① 컨트롤러 등록 자체를 하지 않는다 — ENABLE_DEV_LOGIN !== 'true' 면
//      DI 에서 아예 만들지 않고, 라우트에도 붙지 않는다.
//   ② 설정을 잊어도 안전하다 — NODE_ENV 의 기본값이 'development' 이므로
//      `NODE_ENV !== 'production'` 만으로 조건을 걸면,
//      NODE_ENV 를 빼먹은 배포에서 우회 루트가 열린다.
//      그래서 명시적 플래그(ENABLE_DEV_LOGIN)를 AND 로 함께 요구한다.
//
//   ⚠️ NODE_ENV=production 으로 배포하면 ①번만으로 미등록이 되고,
//      ENABLE_DEV_LOGIN 을 명시적으로 true 로 넘겼더라도 ②번에서 막힌다.
//
// 사용법 (로컬)
//   curl -X POST http://localhost:5010/api/v1/dev/login \
//        -H 'Content-Type: application/json' \
//        -d '{"email":"dev@example.com"}' -i
//   → Set-Cookie 에 accessToken 이 실린다
import express from 'express';
import { z } from 'zod';
import { config } from '#config';
import { HTTP_STATUS } from '#constants';
import { UnauthorizedException } from '#exceptions';
import { ERROR_MESSAGE } from '#constants';
import { validate } from '#middlewares';

const loginSchema = z.object({
  email: z.string().email(),
});

export class DevController {
  #userRepository;
  #tokenProvider;
  #cookieProvider;

  constructor({ userRepository, tokenProvider, cookieProvider }) {
    this.#userRepository = userRepository;
    this.#tokenProvider = tokenProvider;
    this.#cookieProvider = cookieProvider;
  }

  /** 이 컨트롤러를 아예 생성해도 되는가 — ②번 안전장치 */
  static isEnabled() {
    return config.ENABLE_DEV_LOGIN === true && !config.IS_PRODUCTION;
  }

  /**
   * BaseController 를 쓰지 않는다.
   * BaseController 는 root Controller 가 만들어 주는 인스턴스 전용이고,
   * 여기서는 조건부로 붙이는 라우터를 자체 생성한다.
   */
  routes() {
    const router = express.Router();

    router.post('/login', validate('body', loginSchema), async (req, res, next) => {
      try {
        const { email } = req.body;
        const user = await this.#userRepository.findByEmail(email);

        if (!user) {
          throw new UnauthorizedException(ERROR_MESSAGE.UNAUTHORIZED);
        }

        // ⚠️ 비밀번호를 확인하지 않는다. 개발 계정 전용 우회 경로이므로 의도적이다.
        //    운영에서 이 코드가 도는 일은 위 isEnabled() 가 막는다.
        this.#cookieProvider.setAuthTokens(res, this.#tokenProvider.generateTokens(user));

        res.status(HTTP_STATUS.OK).json({
          message: '개발 계정 로그인 성공 (개발 환경 전용)',
          user: { id: user.id, email: user.email, nickname: user.nickname, role: user.role },
        });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}
