// CORS — D-06 httpOnly 쿠키 전제의 필수 조건:
// credentials: true + 명시적 origin (와일드카드 금지)
import { config } from '#config';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization'];
const EXPOSED_HEADERS = ['Content-Length'];

const parseOrigins = () =>
  config.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * 이 origin 을 허용할지 판정해요.
 *   · 운영: CORS_ORIGINS 목록에 있을 때만 허용 (와일드카드 금지)
 *   · 개발인데 CORS_ORIGINS 가 비어 있으면: 요청 origin 을 그대로 허용
 *     — 강사님 정본처럼 로컬 개발 편의용이에요. 목록을 넣으면 그 목록만 허용해요.
 */
const isAllowedOrigin = (origin, allowed) => {
  if (!origin) return false;
  if (allowed.includes(origin)) return true;
  return !config.IS_PRODUCTION && allowed.length === 0;
};

export const cors = (req, res, next) => {
  const allowed = parseOrigins();
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin, allowed)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS.join(', '));
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(isAllowedOrigin(origin, allowed) ? 204 : 403);
    return;
  }

  next();
};
