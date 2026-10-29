// src/repositories/index.js — 리포지토리 중앙 인덱스
//
// ★ 새 리포지토리를 만들면 ① 파일을 만들고 ② 여기 export 를 추가한다.
//   DI 컨테이너(common/di/container.js) 에도 등록하는 것을 잊지 마세요.
export { GradeRepository } from './grade-repository.js';
export { MeRepository } from './me-repository.js';
export { PasswordResetTokenRepository } from './password-reset-token-repository.js';
export { UserRepository } from './user-repository.js';
export { WorkRepository } from './work-repository.js';
export { ApplicationRepository } from './application-repository.js';
export { ChallengeRepository } from './challenge-repository.js';
export { AdminRepository } from './admin-repository.js';
