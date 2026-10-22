// ms(밀리초) 기준 상수 — '분(S)로 쓰면 밀리초... 이런 식의 실수를 방지하기 위한 모음
// 주의: SECOND_IN_MS = 1000 (밀리초) · MINUTE_IN_SECONDS = 60 (초) 단위를 섞지 않게 라벨이 접미어로 정리돼 있습니다
export const SECOND_IN_MS = 1000;
export const MINUTE_IN_MS = 60 * SECOND_IN_MS;
export const HOUR_IN_MS = 60 * MINUTE_IN_MS;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

export const MINUTE_IN_SECONDS = 60;
export const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
export const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
