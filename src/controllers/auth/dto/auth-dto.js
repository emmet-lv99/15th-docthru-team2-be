// src/controllers/auth/dto/auth-dto.js — 인증 응답 DTO
//
// 📍 계층: 컨트롤러 아래 dto/ 자리예요 — 응답 "모양"만 모아 둡니다.
//   · 응답·로그에 노출할 필드만 골라 반환해요 — passwordHash 는 **절대 포함하지 않습니다.**
//   · 계약 auth.schema.js 의 userSchema 형태와 같은 필드만 담아요.
export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    grade: user.grade,
  };
}
