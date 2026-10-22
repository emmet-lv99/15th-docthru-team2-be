// HTTP 예외 기저 계층 (+ D-46 code 추가)
// D-46: 응답은 { code, message, details } — 래퍼 없음
export class HttpException extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
