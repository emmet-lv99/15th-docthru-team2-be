import { BaseController } from '#controllers/base-controller.js';
import { HTTP_STATUS } from '#constants';
import { needsLogin, validate } from '#middlewares';
import { sendData } from '#utils';
import {
  myApplicationListQuerySchema,
  myApplicationListSchema,
  myChallengeListQuerySchema,
  myChallengeListSchema,
} from './me.schema.js';

export class MeController extends BaseController {
  #meService;

  constructor({ meService }) {
    super();
    this.#meService = meService;
  }

  routes() {
    this.router.get(
      '/challenges/participating',
      needsLogin,
      validate('query', myChallengeListQuerySchema),
      (req, res, next) => this.listParticipating(req, res, next),
    );

    this.router.get(
      '/challenges/completed',
      needsLogin,
      validate('query', myChallengeListQuerySchema),
      (req, res, next) => this.listCompleted(req, res, next),
    );

    this.router.get(
      '/challenges/applications',
      needsLogin,
      validate('query', myApplicationListQuerySchema),
      (req, res, next) => this.listMyApplications(req, res, next),
    );

    return this.router;
  }

  async listParticipating(req, res, next) {
    try {
      const result = await this.#meService.listParticipating(req.user.id, req.query);
      sendData(res, result, HTTP_STATUS.OK, myChallengeListSchema);
    } catch (error) {
      next(error);
    }
  }

  async listCompleted(req, res, next) {
    try {
      const result = await this.#meService.listCompleted(req.user.id, req.query);
      sendData(res, result, HTTP_STATUS.OK, myChallengeListSchema);
    } catch (error) {
      next(error);
    }
  }

  async listMyApplications(req, res, next) {
    try {
      const result = await this.#meService.listMyApplications(req.user.id, req.query);
      sendData(res, result, HTTP_STATUS.OK, myApplicationListSchema);
    } catch (error) {
      next(error);
    }
  }
}
