// src/services/grade-service.js
//
// ══════════════════════════════════════════════════════════════
// 🧭 공용 인프라 — 등급 진행도 · 자동 승급 서비스 (grade)
// 👤 담당: 🔷 공용 인프라 (③ auth/me에서 사용)
// 📍 이 파일: src/services/grade-service.js
// 🔗 getProgress → GET /auth/me 의 gradeProgress 계약(D-90)을 채웁니다 (뼈대 제공)
//    evaluate    → 로그인 성공 직후 자동 승급. **담당 ③이 login() 에서 호출**합니다
// 🔨 상태: 구현 완료(뼈대 제공) — 등급 규칙(D-47)은 common/constants/grade.js
// ══════════════════════════════════════════════════════════════
//
// ★ 이식 출처: 완성본 prisma-7 의 services/grade-service.js → Prisma 8 보일러플레이트로 이식.
//   규칙·계약은 그대로예요.
//
// ★ 계층 규칙 — DB 는 gradeRepository 만 부릅니다. 순수 계산은 calculateGrade(상수 모듈)가 맡아요.
//   생성자는 DI(생성자 주입)로만 받습니다 — import 로 만들지 않아요.
import { calculateGrade, GRADE_THRESHOLD } from '#constants';

export class GradeService {
  #gradeRepository;

  constructor({ gradeRepository }) {
    this.#gradeRepository = gradeRepository;
  }

  /**
   * 등급 진행도 — GET /auth/me 의 gradeProgress 계약을 채웁니다 (D-90 · B-1 기본값 확정 2026-10-11)
   *
   *   participationCount  — 참여 횟수 (포기 포함 · D-10)
   *   recommendationCount — 내 작업물이 최다 추천(공동 1위 포함)인 마감 챌린지 수 (요구 2.2)
   *   thresholds          — 서버 상수 GRADE_THRESHOLD 를 그대로 노출 (FE 하드코딩 방지)
   */
  async getProgress(userId) {
    const [participationCount, recommendationCount] = await Promise.all([
      this.#gradeRepository.countParticipations(userId),
      this.#gradeRepository.getRecommendationWins(userId),
    ]);

    return {
      participationCount,
      recommendationCount,
      thresholds: GRADE_THRESHOLD,
    };
  }

  /**
   * 등급 자동 판정 · 승급 — 로그인 성공 직후 호출합니다 (담당 ③).
   *
   *   ① 진행도를 다시 세고 ② calculateGrade 로 새 등급을 구하고
   *   ③ DB 등급과 다를 때만 updateGrade 를 한 번 실행합니다 (반복 쓰기 방지)
   *
   * 왜 로그인 시점에만 다시 세나 — 참여·추천은 다른 도메인(참여·좋아요)에서 늘어나므로,
   * 등급 도메인은 "판단만" 하고 이벤트 도메인은 "값만 늘린다"는 경계를 지키기 위해서예요.
   *
   * 사용 예 (③이 login 을 구현할 때):
   *   const { grade, changed } = await this.#gradeService.evaluate(user.id);
   */
  async evaluate(userId) {
    const [progress, currentGrade] = await Promise.all([
      this.getProgress(userId),
      this.#gradeRepository.getGrade(userId),
    ]);

    const nextGrade = calculateGrade({
      participationCount: progress.participationCount,
      recommendationCount: progress.recommendationCount,
    });

    if (nextGrade === currentGrade) {
      return { grade: currentGrade, progress, changed: false };
    }

    const grade = await this.#gradeRepository.updateGrade(userId, nextGrade);
    return { grade, progress, changed: true };
  }
}
