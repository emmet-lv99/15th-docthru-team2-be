// 이 파일이 뭔가요 — 모든 도메인 컨트롤러가 상속해 routes() 안에 경로를 붙이는 공통 베이스예요
// (공용 뼈대 — 수정 불필요)
import express from 'express';

/**
 * 컨트롤러 기저 클래스 — 하위 컨트롤러는 이 라우터를 조립해 루트 Controller에 전달한다.

 */
export class BaseController {
  constructor() {
    this.router = express.Router();
  }

  // @abstract 하위 컨트롤러가 구현해야 해요
  routes() {
    throw new Error('Method not implemented.');
  }
}
