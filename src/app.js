// App 클래스 — 미들웨어 → 라우트 → 에러 핸들링 순으로 조립 (D-34)
// 앱 부트 구조: 미들웨어 → 라우트 → 에러 핸들러 (이 프로젝트의 규칙이에요)
import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { cors, errorHandler } from '#middlewares';
import { generateOpenApiSpec } from '#docs/swagger.js';

export class App {
  constructor(controller, authMiddleware) {
    this.app = express();
    this.middleware(authMiddleware);
    this.routes(controller);
    this.errorHandling();
  }

  middleware(authMiddleware) {
    // CORS 를 body 파서보다 앞에 둬요 — 그래야 잘못된 JSON(400) 같은 오류 응답에도
    // CORS 헤더가 실려서 브라우저가 원인을 볼 수 있어요 (강사님 정본 순서).
    this.app.use(cors);
    this.app.use(express.json());
    this.app.use(cookieParser());
    // D-36: 인증은 전역 미들웨어 1개로 적용하고, 공개 API 판별은 라우트에서 한다.
    //       강제하지 않고 req.user 만 채운다 (비로그인 요청도 통과시킨다).
    this.app.use((req, res, next) => authMiddleware.authenticate(req, res, next));
  }

  routes(controller) {
    // Swagger 는 라우트 등록이 끝나고 문서가 생성된 뒤 연다
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiSpec()));
    this.app.use('/api/v1', controller.routes());
  }

  errorHandling() {
    this.app.use(errorHandler);
  }

  listen(port) {
    return this.app.listen(port, () => {
      console.log(`[server] http://localhost:${port}/api/v1`);
      console.log(`[server] Swagger UI: http://localhost:${port}/api-docs`);
    });
  }
}
