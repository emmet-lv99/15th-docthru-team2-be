// src/services/index.js — 서비스 중앙 인덱스
//
// ★ 새 서비스를 만들면 ① 파일을 만들고 ② 여기 export 를 추가한다.
//   DI 컨테이너(common/di/container.js) 에도 등록하는 것을 잊지 마세요.
export { AuthService } from './auth-service.js';
export { GoogleAuthService } from './google-auth-service.js';
export { GradeService } from './grade-service.js';
export { MeService } from './me-service.js';
export { WorkService } from './work-service.js';
