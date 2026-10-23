// src/repositories/index.js — 리포지토리 중앙 인덱스
//
// ★ 새 리포지토리를 만들면 ① 파일을 만들고 ② 여기 export 를 추가한다.
//   DI 컨테이너(common/di/container.js) 에도 등록하는 것을 잊지 마세요.
export { UserRepository } from './user-repository.js';
export { GradeRepository } from './grade-repository.js';
export { PasswordResetTokenRepository } from './password-reset-token-repository.js';
