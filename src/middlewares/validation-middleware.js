// 범용 검증 미들웨어 (Zod + Express 5 대응)
import { flattenError } from 'zod';
import { config } from '#config';
import { ERROR_MESSAGE } from '#constants';
import { BadRequestException } from '#exceptions';

/**
 * @param {string} target - 검증 대상 ('body' | 'query' | 'params')
 * @param {import('zod').ZodType} schema - Zod 스키마
 *
 * ⚠️ Express 5에서 req.query 는 getter 라 Object.assign 으로 값을 바꿀 수 없다.
 *    (size 가 문자열로 남아 Prisma 를 통과하지 못하면 500 이 되므로 여기서 수집해요)
 *    그래서 파싱 결과를 req[target] 에 **정의(defineProperty)** 한다.
 */
export const validate = (target, schema) => {
  if (!['body', 'query', 'params'].includes(target)) {
    throw new Error(
      `[validate middleware] Invalid target: "${target}". Expected "body", "query", or "params".`,
    );
  }

  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[target]);

      if (!result.success) {
        const { fieldErrors } = flattenError(result.error);

        if (config.NODE_ENV === 'production') {
          throw new BadRequestException(ERROR_MESSAGE.INVALID_INPUT);
        }

        throw new BadRequestException(ERROR_MESSAGE.INVALID_INPUT, fieldErrors);
      }

      // 기본값·coerce 가 반영된 값으로 교체한다.
      // req.query/req.params 는 getter 이라서 defineProperty 로 넘겨 주세요.
      Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};
