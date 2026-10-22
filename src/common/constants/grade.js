// D-47: 사용자 등급 산정
//   EXPERT ⟸ (참여≥5 AND 추천≥5) OR 참여≥10 OR 추천≥10
//   NORMAL ⟸ 그 외
//
// 시드로는 이 식을 역산할 수 없다 (pro 6명 중 3명이 참여·제출 0건).
// 시드는 산정 이전 스냅샷으로 보고 값을 재작성하지 않는다.
export const GRADE = {
  NORMAL: 'NORMAL',
  EXPERT: 'EXPERT',
};

/** 등급 산정 임계값 (D-47) */
export const GRADE_THRESHOLD = {
  PARTICIPATION: 5,
  RECOMMENDATION: 5,
  PARTICIPATION_ALONE: 10,
  RECOMMENDATION_ALONE: 10,
};

/**
 * 순수 함수 — 집계 결과로 등급을 결정한다 (DB 접근 없음, 유닛 테스트 대상)
 * @param {{ participationCount: number, recommendationCount: number }} counts
 * @returns {'NORMAL' | 'EXPERT'}
 */
export const calculateGrade = ({ participationCount, recommendationCount }) => {
  const p = participationCount ?? 0;
  const r = recommendationCount ?? 0;
  const t = GRADE_THRESHOLD;

  const isExpert =
    (p >= t.PARTICIPATION && r >= t.RECOMMENDATION) ||
    p >= t.PARTICIPATION_ALONE ||
    r >= t.RECOMMENDATION_ALONE;

  return isExpert ? GRADE.EXPERT : GRADE.NORMAL;
};
