// src/controllers/works/works-controller.js
//
// ══════════════════════════════════════════════════════════════
// 👤 담당: 팀원 ②(작업물 · 임시저장) — 제출·수정·삭제·하트 + drafts 3건(D-98)
// 📍 이 파일: src/controllers/works/works-controller.js → 라우트 /works · /challenges/{challengeId}/works
// 🔗 협력: ①(도전·포기) · ④(피드백 — 작업물 상세 화면에서 경계 협력)
// 🔨 상태: 구현 진행 중 — 8/9건 완료, 다음: DELETE /works/{workId} (마지막 API)
// ══════════════════════════════════════════════════════════════
//
// 🐘 prisma-8 메모 — DB 는 repositories 에서만 부르고, 아래 v7 문법은 쓰지 않아요
//    · 업서트  v7 upsert → .select(...).upsert({ create, update, conflictOn })   (v8 은 .where() 없이)
//    · 하트    추가 = .create(...) / 취소 = .where({ ... }).deleteAll()
//              (중복 하트는 err.sqlState === '23505' → 기존 상태 반환)
//    · 카운트  likeCount·feedbackCount 는 .include('likes', (r) => r.count()) 로 조립
//    · 묶음    v7 $transaction([...]) 금지 → db.transaction(async (tx) => { ... })
//
// 이 도메인이 하는 것 — 작업물(번역 결과물) 관리 · 좋아요 (요구 2.4 · 2.7)
//
// 구현 대상 API (9건 — 진행 순서별 정렬)
//
// ── 1. 작업물 조회 및 제출 (완료) ───────────────────────────
//   [완료] GET    /challenges/{challengeId}/works/{workId}  비회원 가능 · 상세 조회
//   [완료] PUT    /challenges/{challengeId}/works/me        참여 USER · 제출/갱신 (최초 201 · 갱신 200)
//
// ── 2. 소셜 인터랙션: 좋아요 (하트) (완료) ───────────────────
//   [완료] PUT    /works/{workId}/like                        USER · 하트 추가 (200 · likeCount 반환)
//   [완료] DELETE /works/{workId}/like                        USER · 하트 취소 (204 No Content)
//
// ── 3. 에디터 임시저장 세트 (D-98) (완료) ───────────────────
//   [완료] GET    /challenges/{challengeId}/drafts/me       참여 USER · 내 임시저장 조회 (없으면 draft: null)
//   [완료] PUT    /challenges/{challengeId}/drafts/me       참여 USER · 임시초안 저장 (신규 201 · 덮어쓰기 200)
//   [완료] DELETE /challenges/{challengeId}/drafts/me       참여 USER · 임시저장 삭제/버리기 (204)
//
// ── 4. 콘텐츠 관리: 수정 및 삭제 (8/9건 완료) ─────────────────
//   [완료] PATCH  /works/{workId}                            작성자·ADMIN · 수정 (마감 후 409 CHALLENGE_CLOSED)
//   [대기] DELETE /works/{workId}                            작성자·ADMIN · 삭제 (어드민은 {reason} 필수)

// ─────────────────────────────────────────────────────────
//  연결 가이드 — 구현 시 아래 3단계를 순서대로 붙이면 돼요
// ─────────────────────────────────────────────────────────
//  STEP 1 · 컨트롤러 — 이 파일의 TODO 자리에 routes() 를 채워요
//       구현 예시는 auth-controller.js 의 /auth/me 엔드포인트가 좋아요
//  STEP 2 · DI 등록 — src/common/di/container.js 의 "Controllers" 영역에 한 줄:
//       worksController: singleton(WorksController),
//  STEP 3 · 라우트 조립 — src/controllers/index.js 에 세 곳:
//       #worksController;                       (필드 선언)
//       constructor 인자에 worksController 추가 → this.#worksController = worksController;
//       this.router.use('/', this.#worksController.routes());
//
//  ⚠️ STEP 2 를 빠뜨리면 서버 기동이 실패합니다 —
//       AwilixResolutionError: Could not resolve 'worksController'
//       (컨테이너가 InjectionMode.PROXY + strict 로 돌아가기 때문이에요)
//
// ─────────────────────────────────────────────────────────
//  계층 배분 — 한 사람이 계층 전체를 맡기보다, 계층별로 나눠도 됩니다 (팀에서 정해요)
// ─────────────────────────────────────────────────────────
//    controllers/works/works-controller.js          라우트·요청 파싱
//    services/work-service.js                 비즈니스 규칙 (마감·소유자·하트 토글)
//    repositories/work-repository.js                  Prisma 호출
//    controllers/works/works.schema.js              Zod 스키마 (제공 · 수정 불필요)
//
// ─────────────────────────────────────────────────────────
//  OpenAPI 반영 — 이미 되어 있습니다 (6건)
// ─────────────────────────────────────────────────────────
//  이 도메인의 Zod 스키마(works.schema.js)는 보일러플레이트가 제공했고,
//  각 도메인 스키마의 *Paths는 src/docs/openapi.js가 한데 모아 OpenAPI를 만듭니다.
//  스키마 파일은 수정하지 말고, 컨트롤러만 구현하면 됩니다.
//  스키마는 "계약(약속) 파일"이고 — 응답이 이것과 다르면 개발 중 500 RESPONSE_CONTRACT_MISMATCH 로
//  바로 알려줍니다. 실사용 중 구현이 계약을 어기는지 쉽게 확인할 수 있어요.
//
import { HTTP_STATUS } from '#constants';
import { BaseController } from '#controllers/base-controller.js';
import { needsLogin, validate } from '#middlewares';
import {
  challengeIdParamSchema,
  draftBodySchema,
  workIdParamSchema,
  workSubmitBodySchema,
} from './works.schema.js';

const workDetailParamSchema = challengeIdParamSchema.merge(workIdParamSchema);

export class WorksController extends BaseController {
  #workService;

  constructor({ workService }) {
    super();
    this.#workService = workService;
  }

  routes() {
    this.router.get(
      '/challenges/:challengeId/works/:workId',
      validate('params', workDetailParamSchema),
      (req, res, next) => this.getWorkDetail(req, res, next),
    );

    this.router.put(
      '/challenges/:challengeId/works/me',
      needsLogin,
      validate('params', challengeIdParamSchema),
      validate('body', workSubmitBodySchema),
      (req, res, next) => this.submitMyWork(req, res, next),
    );

    this.router.put(
      '/works/:workId/like',
      needsLogin,
      validate('params', workIdParamSchema),
      (req, res, next) => this.likeWork(req, res, next),
    );

    this.router.delete(
      '/works/:workId/like',
      needsLogin,
      validate('params', workIdParamSchema),
      (req, res, next) => this.unlikeWork(req, res, next),
    );

    this.router.get(
      '/challenges/:challengeId/drafts/me',
      needsLogin,
      validate('params', challengeIdParamSchema),
      (req, res, next) => this.getMyDraft(req, res, next),
    );

    this.router.put(
      '/challenges/:challengeId/drafts/me',
      needsLogin,
      validate('params', challengeIdParamSchema),
      validate('body', draftBodySchema),
      (req, res, next) => this.saveDraft(req, res, next),
    );

    this.router.delete(
      '/challenges/:challengeId/drafts/me',
      needsLogin,
      validate('params', challengeIdParamSchema),
      (req, res, next) => this.deleteDraft(req, res, next),
    );

    this.router.patch(
      '/works/:workId',
      needsLogin,
      validate('params', workIdParamSchema),
      validate('body', workSubmitBodySchema),
      (req, res, next) => this.updateWork(req, res, next),
    );

    return this.router;
  }

  async getWorkDetail(req, res, next) {
    try {
      const { challengeId, workId } = req.params;
      const currentUserId = req.user?.id ?? null;

      const work = await this.#workService.getWorkDetail({
        challengeId,
        workId,
        currentUserId,
      });

      res.status(HTTP_STATUS.OK).json(work);
    } catch (error) {
      next(error);
    }
  }

  async submitMyWork(req, res, next) {
    try {
      const { challengeId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const { work, isNew } = await this.#workService.submitWork({
        challengeId,
        userId,
        content,
      });

      const statusCode = isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;

      res.status(statusCode).json({ work, isNew });
    } catch (error) {
      next(error);
    }
  }

  async likeWork(req, res, next) {
    try {
      const { workId } = req.params;
      const userId = req.user.id;

      const result = await this.#workService.likeWork({ workId, userId });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async unlikeWork(req, res, next) {
    try {
      const { workId } = req.params;
      const userId = req.user.id;
      await this.#workService.unlikeWork({ workId, userId });

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }

  async getMyDraft(req, res, next) {
    const { challengeId } = req.params;
    const userId = req.user.id;

    try {
      const result = await this.#workService.getDraft({ challengeId, userId });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async saveDraft(req, res, next) {
    const { challengeId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    try {
      const result = await this.#workService.saveDraft({ challengeId, userId, content });
      const statusCode = result.isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;

      res.status(statusCode).json({
        saved: result.saved,
        updatedAt: result.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDraft(req, res, next) {
    const { challengeId } = req.params;
    const userId = req.user.id;

    try {
      await this.#workService.deleteDraft({ challengeId, userId });

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }

  async updateWork(req, res, next) {
    try {
      const { workId } = req.params;
      const { content } = req.body;
      const user = req.user;

      const work = await this.#workService.updateWork({ workId, content, user });

      res.status(HTTP_STATUS.OK).json(work);
    } catch (error) {
      next(error);
    }
  }
}
