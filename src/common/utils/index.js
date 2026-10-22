// #utils barrel — sendData · sendPage · sendCreated 같은 응답 헬퍼 모음이에요
// 💡 컨트롤러에서 응답을 보낼 때는 이 헬퍼를 씁니다 — 직접 res.json(...) 로 우회하지 않아요.
//    4번째 인자로 계약 스키마를 넘기면 개발 환경에서 응답이 계약과 맞는지 즉시 검증합니다 (D-57).
export * from './responses.js';
export * from './datetime.js';
