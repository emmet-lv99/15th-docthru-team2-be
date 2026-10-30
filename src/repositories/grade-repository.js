// src/repositories/grade-repository.js
//
// ══════════════════════════════════════════════════════════════
// 🧭 공용 인프라 — 등급 진행도 집계 리포지토리 (grade)
// 👤 담당: 🔷 공용 인프라 (③ auth/me에서 사용)
// 📍 이 파일: src/repositories/grade-repository.js
// 🔗 쓰는 곳: services/grade-service.js →
//             · GET /auth/me 의 gradeProgress (뼈대가 제공)
//             · 로그인 직후 자동 승급 (담당 ③이 evaluate 로 연결)
// 🔨 상태: 구현 완료(뼈대 제공) — 등급 규칙은 common/constants/grade.js
// ══════════════════════════════════════════════════════════════
//
// ★ 이식 출처: 완성본 prisma-7 의 repositories/grade-repository.js (v7) → Prisma 8 쿼리로 재작성.
//   등급 규칙(D-47)·진행도 계약(D-90)은 그대로예요.
//
// ★ 계층 규칙 — DB 지식은 이 파일에만 모읍니다. service 는 이 리포지토리만 부릅니다.
//   constructor({ db }) 로만 주입받고 #private 필드에 보관해요.
//
// 🐘 prisma-8 쿼리 메모 (v7 와 다른 점)
//   · 카운트  v7 model.count({ where }) → .where({ ... }).aggregate((a) => ({ n: a.count() }))
//   · 관계 카운트(_count.select) 없음 → .include('likes', (l) => l.count()) 로 스칼라로 환원
//   · to-one 관계 필터는 공식 문서에 to-many 예시만 있어, **`.some()` 으로 실측 확인** 후 사용합니다
//     (예: ChallengeParticipant.challenge.some((c) => c.status.eq('CLOSED')))
export class GradeRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // ── 등급 조회·저장 ────────────────────────────────────────

  /** 현재 등급만 조회 — 판정 결과와 비교할 때 씁니다 */
  async getGrade(userId) {
    const row = await this.#db.orm.public.User.where({ id: Number(userId) })
      .select('grade')
      .first();
    return row?.grade ?? 'NORMAL';
  }

  /** 등급 저장 — 승급(변경)이 있을 때만 호출합니다 */
  async updateGrade(userId, grade) {
    await this.#db.orm.public.User.where({ id: Number(userId) }).update({ grade });
    return this.getGrade(userId);
  }

  // ── 진행도 재료 ───────────────────────────────────────────

  /**
   * 참여 횟수 (등급 기준 — 포기 포함, D-10)
   *   ChallengeParticipant 행 하나가 참여 1회예요 (재도전은 같은 행을 갱신 · M-05).
   */
  async countParticipations(userId) {
    const row = await this.#db.orm.public.ChallengeParticipant.where({
      userId: Number(userId),
    }).aggregate((a) => ({ n: a.count() }));
    return row.n;
  }
  /**
   * 최다 추천 선정 횟수 (요구 2.2 · D-90)
   *   "내 작업물이 최다 추천(공동 1위 포함)인 마감 챌린지 수"
   *
   *   쿼리 2번으로 계산합니다 (기존 4번 → 2번).
   *     ① 내가 참여한 **마감(CLOSED) 챌린지**의 참여행   ← p.challenge.some 으로 2단계를 1단계로
   *     ② 그 챌린지들의 작업물 + 좋아요 수 + 참여행 정보 ← include 로 2단계를 1단계로
   *     ③ 챌린지별 "전체 최고 = 내 최고"면 1승 (동률 1위 포함, 전체 최고가 0보다 클 때만)
   */

  async getRecommendationWins(userId) {
    const uid = Number(userId);

    // ① 내가 참여한 마감 챌린지의 참여행 (기존 ①+② 를 한 번에)
    const myParts = await this.#db.orm.public.ChallengeParticipant.where({ userId: uid })
      .where((p) => p.challenge.some((c) => c.status.eq('CLOSED')))
      .select('id', 'challengeId')
      .all();
    if (myParts.length === 0) return 0;

    const closedIds = [...new Set(myParts.map((p) => p.challengeId))];

    // ② 마감 챌린지의 작업물 + 좋아요 수 (기존 ③+④ 를 한 번에)
    //    참여행 정보를 include 로 함께 받아 partById 지도를 따로 만들지 않아요.
    const works = await this.#db.orm.public.Work.where((w) =>
      w.participant.some((p) => p.challengeId.in(closedIds)),
    )
      .select('id', 'participantId')
      .include('participant', (p) => p.select('userId', 'challengeId'))
      .include('likes', (l) => l.count())
      .all();

    // ③ 챌린지별 전체 최고 / 내 최고 좋아요를 모아 비교
    const globalBest = new Map();
    const myBest = new Map();
    for (const work of works) {
      const part = work.participant;
      if (!part) continue;
      const { challengeId } = part;
      globalBest.set(challengeId, Math.max(globalBest.get(challengeId) ?? 0, work.likes));
      if (part.userId === uid) {
        myBest.set(challengeId, Math.max(myBest.get(challengeId) ?? 0, work.likes));
      }
    }

    let wins = 0;
    for (const challengeId of closedIds) {
      const best = globalBest.get(challengeId) ?? 0;
      if (best > 0 && (myBest.get(challengeId) ?? 0) === best) wins += 1;
    }
    return wins;
  }
}
