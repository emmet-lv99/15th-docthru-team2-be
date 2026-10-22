// src/common/utils/datetime.js — Prisma 8 의 DATETIME 문자열을 JS Date 로 보정하는 헬퍼
//
//   v8 은 DATETIME 을 "문자열"로 돌려줘요. 세션 TimeZone 에 따라 두 모양이 나옵니다.
//     · "2025-04-10 09:00:00"            — 시간대 없음 (UTC 벽시계)
//     · "2026-10-16 09:05:50.823+09"     — 오프셋 포함 (Asia/Seoul 세션)
//   접미사가 없으면 계약(timestamptz) 기준 UTC 로 해석하고,
//   "Z"·"+09"·"+0900"·"+09:00" 처럼 이미 시간대가 있으면 그대로 신뢰합니다.
//   (JS Date 는 ISO 형식에서 오프셋의 "분"을 요구해서, "+09" 는 "+09:00" 로 보정)
//
//   리포지토리에서 DateTime 컬럼을 꺼낼 때 이 헬퍼로 Date 로 바꿔 주세요.
//   (여러 리포지토리가 같은 규칙을 쓰도록 한 곳에 모아 두었어요)
export function dbDateTimeToIso(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return value;

  let s = value.trim().replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00';

  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  return new Date(hasZone ? s : s + 'Z');
}
